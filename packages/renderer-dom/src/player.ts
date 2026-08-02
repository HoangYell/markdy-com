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
import type { Chapter, ParseWarning, SceneAST } from "@markdy/core";
import type { FaceSwap } from "./types.js";
import { stateFrom } from "./types.js";
import { createActorEl } from "./actors.js";
import { buildAnimations } from "./animations.js";
import { actorRect, type Rect } from "./geometry/rect.js";

const SCENE_STYLE_ID = "markdy-scene-ambience-styles";
const SAFE_FRAME_PADDING = 28;

function ensureSceneStyles(doc: Document): void {
  if (doc.getElementById(SCENE_STYLE_ID)) return;

  const style = doc.createElement("style");
  style.id = SCENE_STYLE_ID;
  style.textContent = `
.markdy-scene-root {
  --markdy-scene-grid: rgba(148, 163, 184, 0.13);
  --markdy-scene-grid-strong: rgba(148, 163, 184, 0.2);
  --markdy-scene-vignette: rgba(2, 6, 23, 0.72);
  --markdy-scene-accent: rgba(56, 189, 248, 0.16);
  isolation: isolate;
}
.markdy-scene-root::before,
.markdy-scene-root::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.markdy-scene-root::before {
  z-index: 0;
  background:
    linear-gradient(var(--markdy-scene-grid) 1px, transparent 1px) 0 0 / 32px 32px,
    linear-gradient(90deg, var(--markdy-scene-grid) 1px, transparent 1px) 0 0 / 32px 32px,
    linear-gradient(var(--markdy-scene-grid-strong) 1px, transparent 1px) 0 0 / 160px 160px,
    linear-gradient(90deg, var(--markdy-scene-grid-strong) 1px, transparent 1px) 0 0 / 160px 160px;
  mask-image: linear-gradient(to bottom, transparent, #000 10%, #000 90%, transparent);
  opacity: 0.82;
}
.markdy-scene-root::after {
  z-index: 1;
  background:
    radial-gradient(ellipse at 50% 0%, var(--markdy-scene-accent), transparent 42%),
    linear-gradient(180deg, transparent 0%, rgba(2, 6, 23, 0.08) 58%, var(--markdy-scene-vignette) 100%),
    linear-gradient(90deg, rgba(255, 255, 255, 0.035), transparent 18%, transparent 82%, rgba(255, 255, 255, 0.035));
  mix-blend-mode: screen;
  opacity: 0.8;
}
.markdy-scene-root[data-markdy-scene-tone="light"] {
  --markdy-scene-grid: rgba(15, 23, 42, 0.09);
  --markdy-scene-grid-strong: rgba(15, 23, 42, 0.14);
  --markdy-scene-vignette: rgba(241, 245, 249, 0.74);
  --markdy-scene-accent: rgba(14, 165, 233, 0.12);
}
.markdy-scene-content {
  z-index: 2;
}
.markdy-scene-actor-layer {
  position: absolute;
  inset: 0;
  overflow: visible;
  transform-origin: 0 0;
  will-change: transform;
}
`;
  doc.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PlayerOptions {
  container: HTMLElement;
  code: string;
  assets?: Record<string, string>;
  /**
   * Host-resolved ASTs for `import "<path>" as <ns>` statements. When
   * provided, the namespaces' `vars`, `defs`, and `seqs` merge into the
   * parsed scene under `ns.<name>`. Unresolved namespaces emit a soft
   * `import-unresolved` warning.
   */
  imports?: Record<string, SceneAST>;
  autoplay?: boolean;
  /** Loop the animation when it reaches the end. Defaults to true. */
  loop?: boolean;
  /** Show a small "Powered by Markdy" badge below the animation. Defaults to true. */
  copyright?: boolean;
  /** Show a rainbow progress bar around the viewport border. Defaults to true. */
  progressBar?: boolean;
  /**
   * Invoked once per soft `ParseWarning` emitted by the parser — e.g. unknown
   * actions, unknown modifier keys, unresolved imports. Defaults to `console.warn`.
   * Pass a no-op to silence; pass a custom collector to surface warnings in a UI.
   */
  onWarning?: (warning: ParseWarning) => void;
  /** Invoked whenever playback or seek changes the current timeline time. */
  onTimeUpdate?: (seconds: number, durationSeconds: number) => void;
  /** Invoked when playback starts or pauses. */
  onPlayStateChange?: (playing: boolean) => void;
}

export interface Player {
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  currentTime(): number;
  duration(): number;
  isPlaying(): boolean;
  /** Named `scene "..." { ... }` chapter blocks, in author order. Empty when the scene has none. */
  chapters(): Chapter[];
  /** Seeks to the start of the named chapter. No-op if the name doesn't match a chapter. */
  seekToChapter(name: string): void;
  destroy(): void;
}

interface SafeFrame {
  x: number;
  y: number;
  scale: number;
}

function unionRect(a: Rect | null, b: Rect): Rect {
  if (!a) return b;
  return {
    x1: Math.min(a.x1, b.x1),
    y1: Math.min(a.y1, b.y1),
    x2: Math.max(a.x2, b.x2),
    y2: Math.max(a.y2, b.y2),
  };
}

function numericPair(value: unknown): [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  const [x, y] = value;
  return typeof x === "number" && typeof y === "number" ? [x, y] : null;
}

function computeContentBounds(ast: SceneAST): Rect | null {
  let bounds: Rect | null = null;
  const maxScaleByActor = new Map<string, number>();
  const positionsByActor = new Map<string, Array<[number, number]>>();

  for (const [name, def] of Object.entries(ast.actors)) {
    maxScaleByActor.set(name, Math.max(0.001, def.scale ?? 1));
    positionsByActor.set(name, [[def.x, def.y]]);
  }

  for (const ev of ast.events) {
    if (ev.actor === "camera") continue;
    if (ev.action === "scale" && typeof ev.params.to === "number") {
      maxScaleByActor.set(ev.actor, Math.max(maxScaleByActor.get(ev.actor) ?? 1, ev.params.to));
    }
    if (ev.action === "move" || ev.action === "spring") {
      const to = numericPair(ev.params.to);
      if (to) positionsByActor.get(ev.actor)?.push(to);
    }
  }

  for (const [name, def] of Object.entries(ast.actors)) {
    const positions = positionsByActor.get(name) ?? [[def.x, def.y]];
    const scale = maxScaleByActor.get(name) ?? def.scale ?? 1;
    for (const [x, y] of positions) {
      bounds = unionRect(bounds, actorRect({ ...stateFrom(def), x, y, scale }, def.type));
    }
  }

  return bounds;
}

function computeSafeFrame(ast: SceneAST): SafeFrame {
  const bounds = computeContentBounds(ast);
  if (!bounds) return { x: 0, y: 0, scale: 1 };

  const boundsWidth = Math.max(1, bounds.x2 - bounds.x1);
  const boundsHeight = Math.max(1, bounds.y2 - bounds.y1);
  const availableWidth = Math.max(1, ast.meta.width - SAFE_FRAME_PADDING * 2);
  const availableHeight = Math.max(1, ast.meta.height - SAFE_FRAME_PADDING * 2);
  const scale = Math.min(1, availableWidth / boundsWidth, availableHeight / boundsHeight);
  const scaledWidth = boundsWidth * scale;
  const scaledHeight = boundsHeight * scale;

  function axisOffset(min: number, max: number, sceneSize: number, scaledSize: number): number {
    const paddedMin = SAFE_FRAME_PADDING;
    const paddedMax = sceneSize - SAFE_FRAME_PADDING;
    const scaledMin = min * scale;
    const scaledMax = max * scale;

    if (scaledSize > paddedMax - paddedMin) return (sceneSize - scaledSize) / 2 - scaledMin;
    if (scaledMin < paddedMin) return paddedMin - scaledMin;
    if (scaledMax > paddedMax) return paddedMax - scaledMax;
    return 0;
  }

  const x = axisOffset(bounds.x1, bounds.x2, ast.meta.width, scaledWidth);
  const y = axisOffset(bounds.y1, bounds.y2, ast.meta.height, scaledHeight);
  return {
    x: Math.round(x * 1000) / 1000,
    y: Math.round(y * 1000) / 1000,
    scale: Math.round(scale * 1000) / 1000,
  };
}

/**
 * Given a CSS background color (hex #rrggbb / #rgb, or common named colors),
 * return an appropriate contrasting text color.
 */
function bgToTextColor(bg: string): string {
  let hex = bg.trim().replace(/^#/, "");
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    // Perceived luminance (ITU-R BT.601)
    return (0.299 * r + 0.587 * g + 0.114 * b) > 140 ? "#1a1a1a" : "#f0f0f0";
  }
  // Named color fallback
  const named: Record<string, string> = {
    white: "#1a1a1a", black: "#f0f0f0", transparent: "#1a1a1a",
  };
  return named[bg.toLowerCase()] ?? "#1a1a1a";
}

export function createPlayer(opts: PlayerOptions): Player {
  const {
    container,
    code,
    assets: assetOverrides = {},
    imports,
    autoplay = true,
    loop = true,
    copyright = true,
    progressBar = true,
    onWarning = (w) => console.warn(`[markdy] line ${w.line}: ${w.message} (${w.kind})`),
    onTimeUpdate,
    onPlayStateChange,
  } = opts;

  const ast = parse(code, imports ? { imports } : undefined);
  const totalDurationMs = (ast.meta.duration ?? 0) * 1000;
  const durationSeconds = totalDurationMs / 1000;

  // Surface soft parse warnings so hosts can collect them. We never throw on
  // warnings — the renderer silently no-ops unknown actions, modifiers, and
  // scene keys.
  for (const w of ast.warnings) onWarning(w);

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

  // Compute the CSS conic-gradient angle from center to the top-left corner.
  // For a square this is 315°; for wider rectangles it shifts toward 270°.
  const tlAngle = (Math.atan2(-ast.meta.width / 2, ast.meta.height / 2) * 180 / Math.PI + 360) % 360;

  function updateProgressBar(pct: number): void {
    if (!progressEl) return;
    const deg = pct * 360;
    const rainbow = "hsl(0,90%,60%), hsl(45,90%,55%), hsl(90,80%,50%), hsl(180,80%,50%), hsl(270,80%,55%), hsl(330,90%,60%)";
    progressEl.style.background =
      `conic-gradient(from ${tlAngle}deg, ${rainbow} ${deg}deg, transparent ${deg}deg)`;
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
      maxWidth: container.style.maxWidth || "100%",
      width: "100%",
    });
    badge.addEventListener("mouseenter", () => { badge!.style.opacity = "1"; });
    badge.addEventListener("mouseleave", () => { badge!.style.opacity = "0.7"; });
    // Insert after (not inside) the container so it's not clipped by overflow:hidden
    if (container.parentNode) {
      container.parentNode.insertBefore(badge, container.nextSibling);
    } else {
      container.appendChild(badge);
    }
  }

  // ── Scene root + camera layer ──────────────────────────────────────────────
  //
  // Layering:
  //   viewport (100% width, responsive aspect-ratio)
  //     └── scene (fixed AST px dimensions, CSS scale for responsive fit)
  //           └── sceneContent (camera transforms: pan/zoom/shake)
  //                 └── actors live here
  //
  // This keeps camera transforms (which need to animate translate/scale) on
  // an inner layer so they don't clobber the outer responsive scale.
  const scene = document.createElement("div");
  ensureSceneStyles(document);
  scene.className = "markdy-scene-root";
  scene.dataset.markdySceneTone = bgToTextColor(ast.meta.bg) === "#1a1a1a" ? "light" : "dark";
  Object.assign(scene.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: `${ast.meta.width}px`,
    height: `${ast.meta.height}px`,
    background: ast.meta.bg,
    color: bgToTextColor(ast.meta.bg),
    overflow: "hidden",
    userSelect: "none",
    transformOrigin: "0 0",
  });
  viewport.appendChild(scene);

  const sceneContent = document.createElement("div");
  sceneContent.className = "markdy-scene-content";
  Object.assign(sceneContent.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    transformOrigin: "50% 50%",
    willChange: "transform",
  });
  scene.appendChild(sceneContent);

  const actorLayer = document.createElement("div");
  actorLayer.className = "markdy-scene-actor-layer";
  const safeFrame = computeSafeFrame(ast);
  actorLayer.dataset.markdySafeFrame = `${safeFrame.x},${safeFrame.y},${safeFrame.scale}`;
  actorLayer.style.transform = `translate(${safeFrame.x}px, ${safeFrame.y}px) scale(${safeFrame.scale})`;
  sceneContent.appendChild(actorLayer);

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
    actorLayer.appendChild(el);
    actorEls.set(name, el);
  }

  // ── Build all animations, keep them permanently paused ────────────────────
  const faceSwaps: FaceSwap[] = [];
  const allAnims = buildAnimations(ast, actorEls, actorLayer, sceneContent, assetOverrides, faceSwaps);
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
    onTimeUpdate?.(sceneMs / 1000, durationSeconds);
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

    if (totalDurationMs > 0 && sceneMs >= totalDurationMs) {
      if (loop) {
        sceneMs = sceneMs % totalDurationMs;
      } else {
        sceneMs = totalDurationMs;
        applyCurrentTime();
        isPlaying = false;
        onPlayStateChange?.(false);
        lastRafTs = null;
        rafId = null;
        return;
      }
    }

    applyCurrentTime();

    // Update progress bar
    if (totalDurationMs > 0) updateProgressBar(sceneMs / totalDurationMs);

    rafId = requestAnimationFrame(rafTick);
  }

  const player: Player = {
    play() {
      if (isPlaying) return;
      isPlaying = true;
      onPlayStateChange?.(true);
      lastRafTs = null;
      rafId = requestAnimationFrame(rafTick);
    },

    pause() {
      if (!isPlaying) return;
      isPlaying = false;
      onPlayStateChange?.(false);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      lastRafTs = null;
    },

    seek(seconds: number) {
      const nextMs = seconds * 1000;
      sceneMs = totalDurationMs > 0 ? Math.min(Math.max(nextMs, 0), totalDurationMs) : Math.max(nextMs, 0);
      applyCurrentTime();
      if (totalDurationMs > 0) updateProgressBar(sceneMs / totalDurationMs);
    },

    currentTime() {
      return sceneMs / 1000;
    },

    duration() {
      return durationSeconds;
    },

    isPlaying() {
      return isPlaying;
    },

    chapters() {
      return ast.chapters;
    },

    seekToChapter(name: string) {
      const chapter = ast.chapters.find((c) => c.name === name);
      if (!chapter) return;
      player.seek(chapter.startTime);
    },

    destroy() {
      player.pause();
      for (const anim of allAnims) anim.cancel();
      resizeObserver.disconnect();
      if (progressEl?.parentNode === viewport) viewport.removeChild(progressEl);
      if (badge?.parentNode) badge.parentNode.removeChild(badge);
      if (viewport.parentNode === container) container.removeChild(viewport);
    },
  };

  viewport.style.cursor = "pointer";
  viewport.addEventListener("click", () => {
    if (isPlaying) {
      player.pause();
    } else {
      if (!loop && sceneMs >= totalDurationMs) {
        sceneMs = 0;
      }
      player.play();
    }
  });

  if (autoplay) player.play();

  return player;
}
