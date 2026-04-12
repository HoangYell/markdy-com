/**
 * @markdy/renderer-dom — Player
 *
 * Translates a MarkdyScript program into DOM elements and drives the
 * timeline via the Web Animations API (WAAPI).
 *
 * Playback architecture: all WAAPI animations stay permanently paused.
 * A requestAnimationFrame loop advances `sceneMs` each frame and sets
 * `anim.currentTime = sceneMs` on every animation.  This avoids two
 * known pitfalls with WAAPI's startTime-based resumption:
 *
 *   1. Setting `startTime` on a paused animation does not reliably change
 *      the play state to "running" across all browsers.
 *   2. `fill:"both"` causes later-created animations to win the cascade
 *      during their before-phase, overriding earlier animations' off-screen
 *      backward fill.
 *
 * By using `fill:"forwards"` only and pre-initialising actor inline styles,
 * each actor's before-phase state falls through to the inline style we set,
 * which gives correct initial positions and opacity values.
 */

import { parse } from "@markdy/core";
import type { FaceSwap } from "./types.js";
import { createActorEl } from "./actors.js";
import { buildAnimations } from "./animations.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PlayerOptions {
  container: HTMLElement;
  code: string;
  assets?: Record<string, string>;
  autoplay?: boolean;
  /** Loop the animation when it reaches the end. Defaults to true. */
  loop?: boolean;
  /** Show a small "Powered by Markdy" badge below the animation. Defaults to true. */
  copyright?: boolean;
  /** Show a rainbow progress bar around the viewport border. Defaults to true. */
  progressBar?: boolean;
}

export interface Player {
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  destroy(): void;
}

export function createPlayer(opts: PlayerOptions): Player {
  const { container, code, assets: assetOverrides = {}, autoplay = true, loop = true, copyright = true, progressBar = true } =
    opts;

  const ast = parse(code);

  // ── Responsive viewport wrapper ────────────────────────────────────────────
  // The scene uses fixed pixel dimensions from the AST.  We place it inside a
  // 100%-wide viewport div and scale it with CSS transform so the animation
  // always fits its container without breaking actor pixel-positions.
  const viewport = document.createElement("div");
  Object.assign(viewport.style, {
    position: "relative",
    width: "100%",
    aspectRatio: `${ast.meta.width} / ${ast.meta.height}`,
    overflow: "hidden",
  });
  container.appendChild(viewport);

  // ── Rainbow progress bar ───────────────────────────────────────────────────
  // A conic-gradient overlay that traces top→right→bottom→left as playback
  // progresses.  Two layers: the rainbow gradient masked to a 2px border,
  // and an inner transparent fill so the scene shows through.
  let progressEl: HTMLElement | null = null;
  if (progressBar) {
    progressEl = document.createElement("div");
    Object.assign(progressEl.style, {
      position: "absolute",
      inset: "0",
      zIndex: "9999",
      pointerEvents: "none",
      borderRadius: "inherit",
    });
    viewport.appendChild(progressEl);
  }

  function updateProgressBar(pct: number): void {
    if (!progressEl) return;
    // pct is 0..1; map to 360 degrees starting from top-left (315deg)
    const deg = pct * 360;
    const rainbow = "hsl(0,90%,60%), hsl(45,90%,55%), hsl(90,80%,50%), hsl(180,80%,50%), hsl(270,80%,55%), hsl(330,90%,60%)";
    progressEl.style.background =
      `conic-gradient(from 225deg, ${rainbow} ${deg}deg, transparent ${deg}deg)`;
    progressEl.style.mask =
      `linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)`;
    progressEl.style.webkitMask = progressEl.style.mask;
    progressEl.style.maskComposite = "exclude";
    (progressEl.style as any).webkitMaskComposite = "xor";
    progressEl.style.padding = "2px";
  }

  // ── Copyright badge ────────────────────────────────────────────────────────
  let badge: HTMLAnchorElement | null = null;
  if (copyright) {
    badge = document.createElement("a");
    badge.href = "https://markdy.com";
    badge.target = "_blank";
    badge.rel = "noopener noreferrer";
    badge.textContent = "Powered by Markdy";
    Object.assign(badge.style, {
      display: "block",
      textAlign: "right",
      fontSize: "10px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      color: "#999",
      textDecoration: "none",
      padding: "3px 6px 0",
      opacity: "0.7",
      transition: "opacity 0.2s",
    });
    badge.addEventListener("mouseenter", () => { badge!.style.opacity = "1"; });
    badge.addEventListener("mouseleave", () => { badge!.style.opacity = "0.7"; });
    container.appendChild(badge);
  }

  // ── Scene root ─────────────────────────────────────────────────────────────
  const scene = document.createElement("div");
  Object.assign(scene.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: `${ast.meta.width}px`,
    height: `${ast.meta.height}px`,
    background: ast.meta.bg,
    overflow: "hidden",
    userSelect: "none",
    transformOrigin: "0 0",
  });
  viewport.appendChild(scene);

  // Scale scene to fill viewport width, maintaining pixel-perfect actor positions.
  function scaleScene(): void {
    const s = viewport.clientWidth / ast.meta.width;
    scene.style.transform = `scale(${s})`;
  }
  scaleScene();
  const resizeObserver = new ResizeObserver(scaleScene);
  resizeObserver.observe(viewport);

  // ── Actor elements ─────────────────────────────────────────────────────────
  const actorEls = new Map<string, HTMLElement>();
  for (const [name, def] of Object.entries(ast.actors)) {
    const el = createActorEl(name, def, ast.assets, assetOverrides);
    scene.appendChild(el);
    actorEls.set(name, el);
  }

  // ── Build all animations, keep them permanently paused ────────────────────
  const faceSwaps: FaceSwap[] = [];
  const allAnims = buildAnimations(ast, actorEls, scene, assetOverrides, faceSwaps);
  faceSwaps.sort((a, b) => a.timeMs - b.timeMs);

  for (const anim of allAnims) {
    anim.pause();
    anim.currentTime = 0;
  }

  // ── Playback state ─────────────────────────────────────────────────────────

  let sceneMs = 0;
  let lastRafTs: number | null = null;
  let isPlaying = false;
  let rafId: number | null = null;

  // Store initial face text on each swappable element so seek-back works.
  for (const { el } of faceSwaps) {
    if (!(el.dataset as Record<string, string>)["figFaceInitial"]) {
      (el.dataset as Record<string, string>)["figFaceInitial"] = el.textContent ?? "";
    }
  }

  function applyCurrentTime(): void {
    for (const anim of allAnims) {
      anim.currentTime = sceneMs;
    }
    applyFaceSwaps();
  }

  function applyFaceSwaps(): void {
    if (faceSwaps.length === 0) return;

    // Group by element; last swap at or before sceneMs wins.
    const elEmoji = new Map<HTMLElement, string>();
    for (const { timeMs, el, emoji } of faceSwaps) {
      if (timeMs <= sceneMs) elEmoji.set(el, emoji);
    }
    for (const [el, emoji] of elEmoji) {
      if (el.textContent !== emoji) el.textContent = emoji;
    }

    // Restore initial face for elements whose first swap hasn't fired yet.
    const elFirst = new Map<HTMLElement, string>();
    for (const { el, emoji } of faceSwaps) {
      if (!elFirst.has(el)) elFirst.set(el, emoji);
    }
    for (const [el, firstEmoji] of elFirst) {
      if (!elEmoji.has(el)) {
        const initial = (el.dataset as Record<string, string>)["figFaceInitial"] ?? firstEmoji;
        if (el.textContent !== initial) el.textContent = initial;
      }
    }
  }

  function rafTick(timestamp: number): void {
    if (lastRafTs !== null) {
      sceneMs += timestamp - lastRafTs;
    }
    lastRafTs = timestamp;

    const totalMs = (ast.meta.duration ?? 0) * 1000;
    if (totalMs > 0 && sceneMs >= totalMs) {
      if (loop) {
        sceneMs = sceneMs % totalMs;
      } else {
        sceneMs = totalMs;
        applyCurrentTime();
        isPlaying = false;
        lastRafTs = null;
        rafId = null;
        return;
      }
    }

    applyCurrentTime();

    // Update progress bar
    const totalMsP = (ast.meta.duration ?? 0) * 1000;
    if (totalMsP > 0) updateProgressBar(sceneMs / totalMsP);

    rafId = requestAnimationFrame(rafTick);
  }

  const player: Player = {
    play() {
      if (isPlaying) return;
      isPlaying = true;
      lastRafTs = null;
      rafId = requestAnimationFrame(rafTick);
    },

    pause() {
      if (!isPlaying) return;
      isPlaying = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      lastRafTs = null;
    },

    seek(seconds: number) {
      sceneMs = seconds * 1000;
      applyCurrentTime();
      const totalMsS = (ast.meta.duration ?? 0) * 1000;
      if (totalMsS > 0) updateProgressBar(sceneMs / totalMsS);
    },

    destroy() {
      player.pause();
      for (const anim of allAnims) anim.cancel();
      resizeObserver.disconnect();
      if (progressEl?.parentNode === viewport) viewport.removeChild(progressEl);
      if (badge?.parentNode === container) container.removeChild(badge);
      if (viewport.parentNode === container) container.removeChild(viewport);
    },
  };

  if (autoplay) player.play();

  return player;
}
