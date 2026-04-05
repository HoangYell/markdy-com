/**
 * @markdy/renderer-dom
 *
 * Translates a MarkdyScript program into DOM elements and drives the
 * timeline via the Web Animations API (WAAPI).
 * No React, GSAP, or Rough.js dependencies.
 *
 * Playback architecture: all WAAPI animations stay permanently paused.
 * A requestAnimationFrame loop advances `sceneMs` each frame and sets
 * `anim.currentTime = sceneMs` on every animation.  This avoids two
 * known pitfalls with WAAPI's startTime-based resumption:
 *   1. Setting `startTime` on a paused animation does not reliably change
 *      the play state to "running" across all browsers.
 *   2. `fill:"both"` causes later-created animations (move, shake …) to
 *      win the cascade during their before-phase, overriding earlier
 *      animations' (enter's) off-screen backward fill, so actors appeared
 *      at their declared positions immediately.
 * By using `fill:"forwards"` only and pre-initialising actor inline styles,
 * each actor's before-phase state falls through to the inline style we set,
 * which gives correct initial positions and opacity values.
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
// Stick-figure DOM factory
// ---------------------------------------------------------------------------
//
// Each limb element carries a data-fig-* attribute so the renderer can
// query it for per-part animations.  Named parts:
//
//   data-fig-head     — circle head
//   data-fig-face     — emoji face span (inside head)
//   data-fig-body     — torso bar
//   data-fig-arm-l    — left arm  (pivot: shoulder / right end)
//   data-fig-arm-r    — right arm (pivot: shoulder / left end)
//   data-fig-leg-l    — left leg  (pivot: hip / top end)
//   data-fig-leg-r    — right leg (pivot: hip / top end)
//
// DSL syntax:
//   actor a = figure(#c68642)           at (x,y)   — male, default face 😶
//   actor b = figure(#fad4c0, f)        at (x,y)   — female (skirt + bun), default face 🙂
//   actor c = figure(#c68642, m, 😎)   at (x,y)   — custom starting face
//
// Actions:
//   face("😡")              — instantly swap the emoji face expression
//   punch(side=left|right)  — swing arm out & back
//   kick(side=left|right)   — swing leg out & back
//   rotate_part(part=..., to=deg, dur=sec)

function createFigureEl(def: ActorDef): HTMLElement {
  const _skin    = def.args[0] || "#ffdbac"; // kept for DSL compat
  const isFemale = def.args[1] === "f";
  const startFace = def.args[2] || (isFemale ? "🙂" : "😶");
  const ink = "#2a2a2a";

  const wrap = document.createElement("div");
  Object.assign(wrap.style, {
    position: "relative",
    width:  "80px",
    height: "160px",
    overflow: "visible",
  });

  // ── Face — floating emoji, NO background circle ───────────────────────────
  const faceEl = document.createElement("span");
  // both selectors resolve to this single element
  (faceEl.dataset as Record<string, string>).figFace = "";
  (faceEl.dataset as Record<string, string>).figHead = "";
  faceEl.textContent = startFace;
  Object.assign(faceEl.style, {
    position: "absolute",
    fontSize: "44px",
    lineHeight: "1",
    left: "50%",
    top: "0",
    transform: "translateX(-50%)",
    userSelect: "none",
    pointerEvents: "none",
    zIndex: "3",
  });

  // ── Clothes — emoji torso (👕 / 👗) ──────────────────────────────────────
  const clothesEl = document.createElement("span");
  (clothesEl.dataset as Record<string, string>).figBody = "";
  clothesEl.textContent = isFemale ? "👗" : "👕";
  Object.assign(clothesEl.style, {
    position: "absolute",
    fontSize: "34px",
    lineHeight: "1",
    left: "50%",
    top: "42px",
    transform: "translateX(-50%)",
    userSelect: "none",
    pointerEvents: "none",
    zIndex: "2",
  });

  // ── Left arm (extends left; pivot = right / shoulder end) ─────────────────
  const armL = document.createElement("div");
  (armL.dataset as Record<string, string>).figArmL = "";
  Object.assign(armL.style, {
    position: "absolute",
    width: "38px", height: "20px",
    right: "40px", top: "56px",
    transformOrigin: "right center",
    transform: "rotate(25deg)",
    zIndex: "2",
    overflow: "visible",
    boxSizing: "border-box",
  });
  const armLStick = document.createElement("div");
  Object.assign(armLStick.style, {
    position: "absolute",
    width: "24px", height: "3px",
    background: ink, borderRadius: "2px",
    right: "12px", top: "8px",
  });
  const armLHand = document.createElement("span");
  armLHand.textContent = "🤜";
  Object.assign(armLHand.style, {
    position: "absolute",
    fontSize: "15px", lineHeight: "1",
    left: "0", top: "2px",
    transform: "scaleX(-1)",
    userSelect: "none", pointerEvents: "none",
  });
  armL.append(armLStick, armLHand);

  // ── Right arm (extends right; pivot = left / shoulder end) ────────────────
  const armR = document.createElement("div");
  (armR.dataset as Record<string, string>).figArmR = "";
  Object.assign(armR.style, {
    position: "absolute",
    width: "38px", height: "20px",
    left: "40px", top: "56px",
    transformOrigin: "left center",
    transform: "rotate(-25deg)",
    zIndex: "2",
    overflow: "visible",
    boxSizing: "border-box",
  });
  const armRStick = document.createElement("div");
  Object.assign(armRStick.style, {
    position: "absolute",
    width: "24px", height: "3px",
    background: ink, borderRadius: "2px",
    left: "12px", top: "8px",
  });
  const armRHand = document.createElement("span");
  armRHand.textContent = "🤛";
  Object.assign(armRHand.style, {
    position: "absolute",
    fontSize: "15px", lineHeight: "1",
    right: "0", top: "2px",
    userSelect: "none", pointerEvents: "none",
  });
  armR.append(armRStick, armRHand);

  // ── Left leg — vertical (0°), sneaker at bottom ───────────────────────────
  const legL = document.createElement("div");
  (legL.dataset as Record<string, string>).figLegL = "";
  Object.assign(legL.style, {
    position: "absolute",
    width: "22px", height: "52px",
    left: "23px", top: "76px",
    transformOrigin: "top center",
    transform: "rotate(0deg)",
    zIndex: "1",
    overflow: "visible",
    boxSizing: "border-box",
  });
  const legLStick = document.createElement("div");
  Object.assign(legLStick.style, {
    position: "absolute",
    width: "3px", height: "34px",
    background: ink, borderRadius: "1px",
    left: "9px", top: "0",
  });
  const legLShoe = document.createElement("span");
  legLShoe.textContent = isFemale ? "👠" : "👟";
  Object.assign(legLShoe.style, {
    position: "absolute",
    fontSize: "15px", lineHeight: "1",
    bottom: "0", left: "0",
    transform: "scaleX(-1)",
    userSelect: "none", pointerEvents: "none",
  });
  legL.append(legLStick, legLShoe);

  // ── Right leg — vertical (0°), sneaker at bottom ──────────────────────────
  const legR = document.createElement("div");
  (legR.dataset as Record<string, string>).figLegR = "";
  Object.assign(legR.style, {
    position: "absolute",
    width: "22px", height: "52px",
    right: "19px", top: "76px",
    transformOrigin: "top center",
    transform: "rotate(0deg)",
    zIndex: "1",
    overflow: "visible",
    boxSizing: "border-box",
  });
  const legRStick = document.createElement("div");
  Object.assign(legRStick.style, {
    position: "absolute",
    width: "3px", height: "34px",
    background: ink, borderRadius: "1px",
    left: "9px", top: "0",
  });
  const legRShoe = document.createElement("span");
  legRShoe.textContent = isFemale ? "👠" : "👟";
  Object.assign(legRShoe.style, {
    position: "absolute",
    fontSize: "15px", lineHeight: "1",
    bottom: "0", right: "0",
    userSelect: "none", pointerEvents: "none",
  });
  legR.append(legRStick, legRShoe);

  wrap.append(faceEl, clothesEl, armL, armR, legL, legR);

  return wrap;
}

// ---------------------------------------------------------------------------
// Part selector map (for rotate_part / scale_part)
// ---------------------------------------------------------------------------

const PART_SEL: Record<string, string> = {
  head:      "[data-fig-head]",
  face:      "[data-fig-face]",
  body:      "[data-fig-body]",
  arm_left:  "[data-fig-arm-l]",
  arm_right: "[data-fig-arm-r]",
  leg_left:  "[data-fig-leg-l]",
  leg_right: "[data-fig-leg-r]",
};

/** Read the current rotate(Xdeg) value from an element's inline transform. */
function readRotation(el: HTMLElement): number {
  const m = /rotate\((-?[\d.]+)deg\)/.exec(el.style.transform ?? "");
  return m ? Number(m[1]) : 0;
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

    case "figure": {
      el = createFigureEl(def);
      break;
    }

    default: {
      // box
      const div = document.createElement("div");
      div.style.width  = "100px";
      div.style.height = "100px";
      div.style.background = "#999";
      div.style.boxSizing  = "border-box";
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
 * them all. Every animation is created with fill:"forwards" only (no
 * backward fill) so that later-created animations do not override earlier
 * ones' intended before-phase state.  Initial inline styles are
 * pre-computed here; the rAF loop then drives currentTime manually.
 */

interface FaceSwap { timeMs: number; el: HTMLElement; emoji: string; }

function buildAnimations(
  ast: SceneAST,
  actorEls: Map<string, HTMLElement>,
  scene: HTMLElement,
  assetOverrides: Record<string, string>,
  faceSwaps: FaceSwap[],
): Animation[] {
  const anims: Animation[] = [];

  // Initialize tracked state from actor definitions.
  const states = new Map<string, ActorState>();
  for (const [name, def] of Object.entries(ast.actors)) {
    states.set(name, stateFrom(def));
  }

  // Sort events by time for correct sequential state tracking.
  const events = [...ast.events].sort((a, b) => a.time - b.time);

  // ── Pre-process initial inline styles ─────────────────────────────────────
  //
  // With fill:"forwards" (no backward fill), each actor's before-phase
  // shows its inline style.  We need that inline style to match what the
  // scene should look like at t=0:
  //
  //   • Actors whose first action is `enter` must start off-screen.
  //   • Actors whose first action is `fade_in` and declared opacity > 0
  //     must start invisible.
  //
  const firstEventByActor = new Map<string, typeof events[number]>();
  for (const ev of events) {
    if (!firstEventByActor.has(ev.actor)) firstEventByActor.set(ev.actor, ev);
  }

  for (const [name, def] of Object.entries(ast.actors)) {
    const el = actorEls.get(name);
    const s = states.get(name);
    if (!el || !s) continue;

    const firstEv = firstEventByActor.get(name);

    if (firstEv?.action === "enter") {
      const from = String(firstEv.params.from ?? "left");
      const offscreen: ActorState = { ...s };
      switch (from) {
        case "left":   offscreen.x = -ast.meta.width * 1.1; break;
        case "right":  offscreen.x =  ast.meta.width * 2.1; break;
        case "top":    offscreen.y = -ast.meta.height * 1.1; break;
        case "bottom": offscreen.y =  ast.meta.height * 2.1; break;
      }
      el.style.transform = tx(offscreen);
    }

    if (firstEv?.action === "fade_in" && (def.opacity === undefined || def.opacity > 0)) {
      el.style.opacity = "0";
    }
  }

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

    // fill:"forwards" only — no backward fill so before-phase falls through
    // to the inline style we set above.
    const baseOpts: KeyframeAnimationOptions = {
      delay: delayMs,
      duration: durMs,
      fill: "forwards",
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

      // ── punch ─────────────────────────────────────────────────────────────
      // Swings one arm out and snaps it back. Works on figure actors only.
      //   side = "left" | "right"  (default "right")
      case "punch": {
        const pSide = String(ev.params.side ?? "right");
        const pArmEl = el.querySelector<HTMLElement>(
          pSide === "left" ? "[data-fig-arm-l]" : "[data-fig-arm-r]",
        );
        if (!pArmEl) break;
        const pRest = readRotation(pArmEl);
        const pExtend = pSide === "left" ? -75 : 75;
        anims.push(
          pArmEl.animate(
            [
              { transform: `rotate(${pRest}deg)` },
              { transform: `rotate(${pExtend}deg)`, offset: 0.35 },
              { transform: `rotate(${pRest}deg)` },
            ],
            { ...baseOpts, easing: "ease-in-out", fill: "forwards" },
          ),
        );
        break;
      }

      // ── kick ──────────────────────────────────────────────────────────────
      // Swings one leg out and snaps it back. Works on figure actors only.
      //   side = "left" | "right"  (default "right")
      case "kick": {
        const kSide = String(ev.params.side ?? "right");
        const kLegEl = el.querySelector<HTMLElement>(
          kSide === "left" ? "[data-fig-leg-l]" : "[data-fig-leg-r]",
        );
        if (!kLegEl) break;
        const kRest = readRotation(kLegEl);
        const kExtend = kSide === "left" ? -100 : 100;
        anims.push(
          kLegEl.animate(
            [
              { transform: `rotate(${kRest}deg)` },
              { transform: `rotate(${kExtend}deg)`, offset: 0.38 },
              { transform: `rotate(${kRest}deg)` },
            ],
            { ...baseOpts, easing: "ease-in-out", fill: "forwards" },
          ),
        );
        break;
      }

      // ── rotate_part ───────────────────────────────────────────────────────
      // Rotates any named body part of a figure actor to a target angle.
      // Named parts: head, body, arm_left, arm_right, leg_left, leg_right
      //
      //   @1.0: guy.rotate_part(part=arm_right, to=90, dur=0.4)
      //   @2.0: guy.rotate_part(part=leg_left,  to=-60, dur=0.35)
      //   @3.0: guy.rotate_part(part=head,      to=20,  dur=0.3)
      case "rotate_part": {
        const rpName = String(ev.params.part ?? "");
        const rpSel  = PART_SEL[rpName];
        if (!rpSel) break;
        const rpEl = el.querySelector<HTMLElement>(rpSel);
        if (!rpEl) break;

        const rpFrom = readRotation(rpEl);
        const rpTo   = typeof ev.params.to === "number" ? ev.params.to : rpFrom;

        anims.push(
          rpEl.animate(
            [
              { transform: `rotate(${rpFrom}deg)` },
              { transform: `rotate(${rpTo}deg)` },
            ],
            { ...baseOpts, fill: "forwards" },
          ),
        );
        // Update inline style so the next rotate_part on the same part reads
        // the correct rest angle.
        rpEl.style.transform = rpEl.style.transform.replace(
          /rotate\([^)]*\)/,
          `rotate(${rpTo}deg)`,
        );
        break;
      }

      // ── face ──────────────────────────────────────────────────────────────
      // Instantly swaps the emoji face of a figure actor.
      // Seek-safe: recorded in faceSwaps[]; the rAF loop applies the latest
      // swap whose timeMs <= sceneMs every frame, so it works correctly for
      // both forward playback and seek-backwards.
      //
      //   @5.0: bruno.face("😡")
      //   @9.5: alex.face("😵")
      case "face": {
        const fEl = el.querySelector<HTMLElement>("[data-fig-face]");
        if (!fEl) break;
        const emoji = String(ev.params.text ?? ev.params._0 ?? "");
        if (emoji) faceSwaps.push({ timeMs: ev.time * 1000, el: fEl, emoji });
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
        // Start invisible — fill:"forwards" has no backward fill, so the
        // bubble's inline opacity:0 shows until the fade-in animation fires.
        bubble.style.opacity = "0";
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
            fill: "forwards",
          }),
          bubble.animate([{ opacity: 1 }, { opacity: 0 }], {
            delay: delayMs + durMs - fadeDur,
            duration: fadeDur,
            fill: "forwards",
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
          // Hidden until throw animation activates (no backward fill).
          opacity: "0",
        });

        scene.appendChild(projectile);

        const throwAnim = projectile.animate(
          [
            { transform: tx(s), opacity: 1 },
            { transform: tx(targetState), opacity: 0 },
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

  // ── Build all animations, keep them permanently paused ────────────────────
  //
  // We never call anim.play().  Instead, the rAF loop sets
  // anim.currentTime = sceneMs every frame, which makes WAAPI compute the
  // correct interpolated value (including fill:"forwards" after each
  // animation ends).  This is reliable across all browsers and avoids the
  // quirk where setting startTime on a paused animation does not resume it.
  const faceSwaps: FaceSwap[] = [];
  const allAnims = buildAnimations(ast, actorEls, scene, assetOverrides, faceSwaps);
  // faceSwaps is sorted by timeMs ascending for efficient scanning.
  faceSwaps.sort((a, b) => a.timeMs - b.timeMs);

  for (const anim of allAnims) {
    anim.pause();
    anim.currentTime = 0;
  }

  // ── Playback state ─────────────────────────────────────────────────────────

  let sceneMs = 0;        // current playhead in milliseconds
  let lastRafTs: number | null = null; // previous rAF timestamp
  let isPlaying = false;
  let rafId: number | null = null;

  function applyCurrentTime(): void {
    for (const anim of allAnims) {
      anim.currentTime = sceneMs;
    }
    // Apply face swaps: for each face element, find the last swap at or before
    // sceneMs and set its emoji.  This is O(swaps) per frame but swap counts
    // are tiny (< 20 in any realistic scene).
    if (faceSwaps.length > 0) {
      // Group by element; last-wins within each group.
      const elEmoji = new Map<HTMLElement, string>();
      for (const { timeMs, el, emoji } of faceSwaps) {
        if (timeMs <= sceneMs) elEmoji.set(el, emoji);
      }
      for (const [el, emoji] of elEmoji) {
        if (el.textContent !== emoji) el.textContent = emoji;
      }
      // Restore initial face for elements whose first swap hasn't fired yet.
      // Track which elements we need to reset.
      const elFirst = new Map<HTMLElement, string>();
      for (const { el, emoji } of faceSwaps) {
        if (!elFirst.has(el)) elFirst.set(el, emoji);
      }
      for (const [el, firstEmoji] of elFirst) {
        if (!elEmoji.has(el)) {
          // No swap has fired yet — restore to the initial face stored in
          // data-fig-face-initial (set below at build time).
          const initial = (el.dataset as Record<string, string>)["figFaceInitial"] ?? firstEmoji;
          if (el.textContent !== initial) el.textContent = initial;
        }
      }
    }
  }

  // Store initial face text on each swappable element so seek-back works.
  for (const { el } of faceSwaps) {
    if (!(el.dataset as Record<string, string>)["figFaceInitial"]) {
      (el.dataset as Record<string, string>)["figFaceInitial"] = el.textContent ?? "";
    }
  }

  function rafTick(timestamp: number): void {
    if (lastRafTs !== null) {
      sceneMs += timestamp - lastRafTs;
    }
    lastRafTs = timestamp;

    const totalMs = (ast.meta.duration ?? 0) * 1000;
    if (totalMs > 0 && sceneMs >= totalMs) {
      sceneMs = totalMs;
      applyCurrentTime();
      isPlaying = false;
      lastRafTs = null;
      rafId = null;
      return;
    }

    applyCurrentTime();
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
