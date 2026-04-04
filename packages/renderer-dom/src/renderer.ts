/**
 * @markdy/renderer-dom
 *
 * Translates a MarkdyScript program into DOM elements and drives the
 * timeline via the Web Animations API (WAAPI).
 * No React, GSAP, or Rough.js dependencies.
 */

import { parse } from "@markdy/core";
import type { SceneAST, ActorDef } from "@markdy/core";

// ---------------------------------------------------------------------------
// Easing map
// ---------------------------------------------------------------------------

const EASE_MAP: Record<string, string> = {
  linear: "linear",
  in: "ease-in",
  out: "ease-out",
  inout: "ease-in-out",
};

function toEasing(val: unknown): string {
  return EASE_MAP[String(val ?? "")] ?? "linear";
}

// ---------------------------------------------------------------------------
// Document timeline helper
// ---------------------------------------------------------------------------

function docNow(): number {
  return (document.timeline.currentTime as number | null) ?? performance.now();
}

// ---------------------------------------------------------------------------
// Per-actor mutable runtime state
// ---------------------------------------------------------------------------

interface ActorState {
  x: number;
  y: number;
  scale: number;
  rotate: number;
  opacity: number;
}

function stateFrom(def: ActorDef): ActorState {
  return {
    x: def.x,
    y: def.y,
    scale: def.scale ?? 1,
    rotate: def.rotate ?? 0,
    opacity: def.opacity ?? 1,
  };
}

/** Full CSS transform string encoding all composited actor properties. */
function tx(s: ActorState): string {
  return `translate(${s.x}px, ${s.y}px) scale(${s.scale}) rotate(${s.rotate}deg)`;
}

// ---------------------------------------------------------------------------
// Actor element factory
// ---------------------------------------------------------------------------

function createActorEl(
  name: string,
  def: ActorDef,
  assetDefs: SceneAST["assets"],
  assetOverrides: Record<string, string>,
): HTMLElement {
  let el: HTMLElement;

  switch (def.type) {
    case "sprite": {
      const assetName = def.args[0] ?? "";
      const assetDef = assetDefs[assetName];

      if (assetDef?.type === "icon") {
        const span = document.createElement("span");
        span.style.display = "inline-block";
        span.style.fontSize = `${def.size ?? 32}px`;
        span.style.lineHeight = "1";
        // Store the icon identifier for consumers (e.g. Iconify web component).
        span.dataset.icon = assetDef.value;
        span.setAttribute("aria-label", assetDef.value.split(":").pop() ?? "icon");
        el = span;
      } else {
        const img = document.createElement("img");
        img.src = assetOverrides[assetName] ?? assetDef?.value ?? "";
        img.alt = assetName;
        img.style.display = "block";
        img.setAttribute("draggable", "false");
        el = img;
      }
      break;
    }

    case "text": {
      const div = document.createElement("div");
      div.textContent = def.args[0] ?? "";
      div.style.fontSize = `${def.size ?? 24}px`;
      div.style.fontFamily = "sans-serif";
      div.style.whiteSpace = "nowrap";
      div.style.userSelect = "none";
      div.style.pointerEvents = "none";
      el = div;
      break;
    }

    default: {
      // box
      const div = document.createElement("div");
      div.style.width = "100px";
      div.style.height = "100px";
      div.style.background = "#999";
      div.style.boxSizing = "border-box";
      el = div;
      break;
    }
  }

  el.dataset.markdyActor = name;
  el.style.position = "absolute";
  el.style.left = "0";
  el.style.top = "0";
  el.style.transformOrigin = "center center";
  el.style.transform = tx(stateFrom(def));
  el.style.opacity = String(def.opacity ?? 1);

  return el;
}

// ---------------------------------------------------------------------------
// Animation builder — processes the timeline into WAAPI Animation objects
// ---------------------------------------------------------------------------

/**
 * Creates one or more Web Animations for each timeline event and returns
 * them all. Every animation is created paused; the caller drives playback.
 *
 * Design notes:
 * - All animations use `fill: "both"` so WAAPI fills the "before" phase with
 *   the first keyframe (no manual opacity=0 setup needed for fade_in actors).
 * - Transform keyframes always encode the full transform string so that
 *   animated and non-animated components stay stable.
 * - Animations are appended in time order so later animations win cascade
 *   priority (WAAPI younger-sort rule), allowing seamless chaining without
 *   explicit cancel-and-restart.
 */
function buildAnimations(
  ast: SceneAST,
  actorEls: Map<string, HTMLElement>,
  scene: HTMLElement,
  assetOverrides: Record<string, string>,
): Animation[] {
  const anims: Animation[] = [];

  // Initialize tracked state from actor definitions.
  const states = new Map<string, ActorState>();
  for (const [name, def] of Object.entries(ast.actors)) {
    states.set(name, stateFrom(def));
  }

  // Sort events by time for correct sequential state tracking.
  const events = [...ast.events].sort((a, b) => a.time - b.time);

  for (const ev of events) {
    const el = actorEls.get(ev.actor);
    const s = states.get(ev.actor);
    if (!el || !s) continue;

    const delayMs = ev.time * 1000;
    const durMs = Math.max(
      1,
      (typeof ev.params.dur === "number" ? ev.params.dur : 0.5) * 1000,
    );
    const easing = toEasing(ev.params.ease);

    const baseOpts: KeyframeAnimationOptions = {
      delay: delayMs,
      duration: durMs,
      fill: "both",
      easing,
    };

    switch (ev.action) {
      // ── move ──────────────────────────────────────────────────────────────
      case "move": {
        const toArr = ev.params.to as [number, number] | undefined;
        const toX = toArr?.[0] ?? s.x;
        const toY = toArr?.[1] ?? s.y;

        anims.push(
          el.animate(
            [{ transform: tx(s) }, { transform: tx({ ...s, x: toX, y: toY }) }],
            baseOpts,
          ),
        );

        s.x = toX;
        s.y = toY;
        break;
      }

      // ── enter ─────────────────────────────────────────────────────────────
      case "enter": {
        const from = String(ev.params.from ?? "left");
        const fromState: ActorState = { ...s };

        switch (from) {
          case "left":
            fromState.x = -ast.meta.width;
            break;
          case "right":
            fromState.x = ast.meta.width * 2;
            break;
          case "top":
            fromState.y = -ast.meta.height;
            break;
          case "bottom":
            fromState.y = ast.meta.height * 2;
            break;
        }

        anims.push(
          el.animate(
            [{ transform: tx(fromState) }, { transform: tx(s) }],
            baseOpts,
          ),
        );
        // s.x / s.y unchanged — actor was always declared at its final position.
        break;
      }

      // ── fade_in ───────────────────────────────────────────────────────────
      case "fade_in": {
        anims.push(el.animate([{ opacity: 0 }, { opacity: 1 }], baseOpts));
        s.opacity = 1;
        break;
      }

      // ── fade_out ──────────────────────────────────────────────────────────
      case "fade_out": {
        anims.push(
          el.animate([{ opacity: s.opacity }, { opacity: 0 }], baseOpts),
        );
        s.opacity = 0;
        break;
      }

      // ── scale ─────────────────────────────────────────────────────────────
      case "scale": {
        const toScale =
          typeof ev.params.to === "number" ? ev.params.to : s.scale;
        anims.push(
          el.animate(
            [
              { transform: tx(s) },
              { transform: tx({ ...s, scale: toScale }) },
            ],
            baseOpts,
          ),
        );
        s.scale = toScale;
        break;
      }

      // ── rotate ────────────────────────────────────────────────────────────
      case "rotate": {
        const toDeg =
          typeof ev.params.to === "number" ? ev.params.to : s.rotate;
        anims.push(
          el.animate(
            [
              { transform: tx(s) },
              { transform: tx({ ...s, rotate: toDeg }) },
            ],
            baseOpts,
          ),
        );
        s.rotate = toDeg;
        break;
      }

      // ── shake ─────────────────────────────────────────────────────────────
      case "shake": {
        const mag =
          typeof ev.params.intensity === "number" ? ev.params.intensity : 5;

        anims.push(
          el.animate(
            [
              { transform: tx(s), offset: 0 },
              { transform: tx({ ...s, x: s.x + mag }), offset: 0.2 },
              { transform: tx({ ...s, x: s.x - mag }), offset: 0.4 },
              { transform: tx({ ...s, x: s.x + mag }), offset: 0.6 },
              { transform: tx({ ...s, x: s.x - mag }), offset: 0.8 },
              { transform: tx(s), offset: 1 },
            ],
            { ...baseOpts, easing: "linear" },
          ),
        );
        // State unchanged — shake oscillates and returns to origin.
        break;
      }

      // ── say ───────────────────────────────────────────────────────────────
      case "say": {
        const text = String(ev.params.text ?? "");

        // Inverse-scale the bubble so it renders at a natural size regardless
        // of the actor's scale transform.
        const inverseScale = 1 / (s.scale || 1);

        const bubble = document.createElement("div");
        bubble.textContent = text;
        Object.assign(bubble.style, {
          position: "absolute",
          bottom: "calc(100% + 8px)",
          left: "50%",
          transform: `translateX(-50%) scale(${inverseScale})`,
          transformOrigin: "center bottom",
          background: "white",
          border: "2px solid #222",
          borderRadius: "10px",
          padding: "4px 10px",
          fontFamily: "sans-serif",
          fontSize: "14px",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          zIndex: "10",
          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
        });

        // Downward speech tail.
        const tail = document.createElement("span");
        Object.assign(tail.style, {
          position: "absolute",
          bottom: "-10px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "0",
          height: "0",
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: "10px solid #222",
        });
        bubble.appendChild(tail);

        el.style.overflow = "visible";
        el.appendChild(bubble);

        const fadeDur = Math.min(200, durMs * 0.15);

        anims.push(
          bubble.animate([{ opacity: 0 }, { opacity: 1 }], {
            delay: delayMs,
            duration: fadeDur,
            fill: "both",
          }),
          bubble.animate([{ opacity: 1 }, { opacity: 0 }], {
            delay: delayMs + durMs - fadeDur,
            duration: fadeDur,
            fill: "both",
          }),
        );
        break;
      }

      // ── throw ─────────────────────────────────────────────────────────────
      case "throw": {
        const assetName = String(ev.params.asset ?? "");
        const targetActorName = String(ev.params.to ?? "");
        const targetState = states.get(targetActorName);
        const assetDef = ast.assets[assetName];

        if (!assetDef || !targetState) break;

        let projectile: HTMLElement;

        if (assetDef.type === "image") {
          const img = document.createElement("img");
          img.src = assetOverrides[assetName] ?? assetDef.value;
          img.alt = assetName;
          img.setAttribute("draggable", "false");
          img.style.width = "32px";
          img.style.height = "32px";
          projectile = img;
        } else {
          const span = document.createElement("span");
          span.dataset.icon = assetDef.value;
          span.style.fontSize = "32px";
          span.style.lineHeight = "1";
          span.style.display = "inline-block";
          projectile = span;
        }

        Object.assign(projectile.style, {
          position: "absolute",
          left: "0",
          top: "0",
          pointerEvents: "none",
          zIndex: "9",
        });

        scene.appendChild(projectile);

        const throwAnim = projectile.animate(
          [
            { transform: tx(s), opacity: 1 },
            { transform: tx(targetState), opacity: 0.2 },
          ],
          { ...baseOpts, easing: "ease-in" },
        );

        throwAnim.addEventListener("finish", () => {
          if (projectile.parentNode === scene) scene.removeChild(projectile);
        });

        anims.push(throwAnim);
        break;
      }

      default:
        break;
    }
  }

  return anims;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PlayerOptions {
  container: HTMLElement;
  code: string;
  assets?: Record<string, string>;
  autoplay?: boolean;
}

export interface Player {
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  destroy(): void;
}

export function createPlayer(opts: PlayerOptions): Player {
  const { container, code, assets: assetOverrides = {}, autoplay = false } =
    opts;

  const ast = parse(code);

  // ── Scene root ─────────────────────────────────────────────────────────────
  const scene = document.createElement("div");
  Object.assign(scene.style, {
    position: "relative",
    width: `${ast.meta.width}px`,
    height: `${ast.meta.height}px`,
    background: ast.meta.bg,
    overflow: "hidden",
    userSelect: "none",
  });
  container.appendChild(scene);

  // ── Actor elements ─────────────────────────────────────────────────────────
  const actorEls = new Map<string, HTMLElement>();
  for (const [name, def] of Object.entries(ast.actors)) {
    const el = createActorEl(name, def, ast.assets, assetOverrides);
    scene.appendChild(el);
    actorEls.set(name, el);
  }

  // ── Build all animations, initially paused at scene time 0 ────────────────
  const allAnims = buildAnimations(ast, actorEls, scene, assetOverrides);
  for (const anim of allAnims) {
    anim.pause();
    anim.currentTime = 0;
  }

  // ── Playback state ─────────────────────────────────────────────────────────
  //
  // All animations share a single `docStart` anchor:
  //   animation.startTime = docStart
  //   ⟹ animation.currentTime = docNow() - docStart = sceneMs
  //
  // This keeps every animation perfectly in sync.

  let sceneMs = 0; // current playhead position (milliseconds)
  let docStart = 0; // document-timeline anchor corresponding to sceneMs=0
  let isPlaying = false;
  let rafId: number | null = null;

  function syncAnimations(): void {
    docStart = docNow() - sceneMs;
    for (const anim of allAnims) {
      anim.startTime = docStart;
    }
  }

  function rafTick(): void {
    sceneMs = docNow() - docStart;

    const totalMs = (ast.meta.duration ?? 0) * 1000;
    if (totalMs > 0 && sceneMs >= totalMs) {
      // Auto-stop at the declared/computed scene duration.
      sceneMs = totalMs;
      isPlaying = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      for (const anim of allAnims) anim.pause();
      return;
    }

    rafId = requestAnimationFrame(rafTick);
  }

  const player: Player = {
    play() {
      if (isPlaying) return;
      isPlaying = true;
      syncAnimations();
      rafId = requestAnimationFrame(rafTick);
    },

    pause() {
      if (!isPlaying) return;
      isPlaying = false;
      // Capture exact playhead position before stopping animations.
      sceneMs = docNow() - docStart;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      for (const anim of allAnims) anim.pause();
    },

    seek(seconds: number) {
      sceneMs = seconds * 1000;
      if (isPlaying) {
        // Resync running animations to the new playhead.
        syncAnimations();
      } else {
        // Move the paused playhead without resuming.
        for (const anim of allAnims) {
          anim.currentTime = sceneMs;
        }
      }
    },

    destroy() {
      player.pause();
      for (const anim of allAnims) anim.cancel();
      if (scene.parentNode === container) container.removeChild(scene);
    },
  };

  if (autoplay) player.play();

  return player;
}
