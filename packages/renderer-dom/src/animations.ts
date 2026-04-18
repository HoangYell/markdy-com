import type { SceneAST } from "@markdy/core";
import type { ActorState, FaceSwap } from "./types.js";
import { stateFrom, tx, toEasing } from "./types.js";
import { PART_SEL, readRotation } from "./figure.js";

// ---------------------------------------------------------------------------
// Scene luminance detection (for adaptive bubble/overlay colors)
// ---------------------------------------------------------------------------

/** Returns true if the scene background is dark (luminance < 140). */
function isSceneDark(scene: HTMLElement): boolean {
  const bg = scene.style.background || "white";
  let hex = bg.trim().replace(/^#/, "");
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) <= 140;
  }
  const dark: Record<string, boolean> = { black: true, "#000": true, "#000000": true };
  return dark[bg.toLowerCase()] ?? false;
}

// ---------------------------------------------------------------------------
// Animation builder — processes the timeline into WAAPI Animation objects
// ---------------------------------------------------------------------------
//
// Every animation is created with fill:"forwards" only (no backward fill)
// so that later-created animations do not override earlier ones' intended
// before-phase state.  Initial inline styles are pre-computed here; the
// rAF loop in player.ts then drives currentTime manually.

export function buildAnimations(
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

  preInitInlineStyles(ast, actorEls, states, events);

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
      fill: "forwards",
      easing,
    };

    buildAction(ev, el, s, baseOpts, delayMs, durMs, ast, states, scene, assetOverrides, faceSwaps, anims);
  }

  return anims;
}

// ---------------------------------------------------------------------------
// Pre-process initial inline styles
// ---------------------------------------------------------------------------
//
// With fill:"forwards" (no backward fill), each actor's before-phase
// shows its inline style.  We need that inline style to match what the
// scene should look like at t=0:
//
//   • Actors whose first action is `enter` must start off-screen.
//   • Actors whose first action is `fade_in` and declared opacity > 0
//     must start invisible.

function preInitInlineStyles(
  ast: SceneAST,
  actorEls: Map<string, HTMLElement>,
  states: Map<string, ActorState>,
  events: SceneAST["events"],
): void {
  const firstEventByActor = new Map<string, (typeof events)[number]>();
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
}

// ---------------------------------------------------------------------------
// Action handler (switch-dispatched per event)
// ---------------------------------------------------------------------------

import type { TimelineEvent } from "@markdy/core";

function buildAction(
  ev: TimelineEvent,
  el: HTMLElement,
  s: ActorState,
  baseOpts: KeyframeAnimationOptions,
  delayMs: number,
  durMs: number,
  ast: SceneAST,
  states: Map<string, ActorState>,
  scene: HTMLElement,
  assetOverrides: Record<string, string>,
  faceSwaps: FaceSwap[],
  anims: Animation[],
): void {
  switch (ev.action) {
    // ── move ────────────────────────────────────────────────────────────────
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

    // ── enter ───────────────────────────────────────────────────────────────
    case "enter": {
      const from = String(ev.params.from ?? "left");
      const fromState: ActorState = { ...s };

      switch (from) {
        case "left":   fromState.x = -ast.meta.width;     break;
        case "right":  fromState.x = ast.meta.width * 2;  break;
        case "top":    fromState.y = -ast.meta.height;     break;
        case "bottom": fromState.y = ast.meta.height * 2;  break;
      }

      anims.push(
        el.animate(
          [{ transform: tx(fromState) }, { transform: tx(s) }],
          baseOpts,
        ),
      );
      break;
    }

    // ── fade_in ─────────────────────────────────────────────────────────────
    case "fade_in": {
      anims.push(el.animate([{ opacity: 0 }, { opacity: 1 }], baseOpts));
      s.opacity = 1;
      break;
    }

    // ── fade_out ────────────────────────────────────────────────────────────
    case "fade_out": {
      anims.push(
        el.animate([{ opacity: s.opacity }, { opacity: 0 }], baseOpts),
      );
      s.opacity = 0;
      break;
    }

    // ── scale ───────────────────────────────────────────────────────────────
    case "scale": {
      const toScale = typeof ev.params.to === "number" ? ev.params.to : s.scale;
      anims.push(
        el.animate(
          [{ transform: tx(s) }, { transform: tx({ ...s, scale: toScale }) }],
          baseOpts,
        ),
      );
      s.scale = toScale;
      break;
    }

    // ── rotate ──────────────────────────────────────────────────────────────
    case "rotate": {
      const toDeg = typeof ev.params.to === "number" ? ev.params.to : s.rotate;
      anims.push(
        el.animate(
          [{ transform: tx(s) }, { transform: tx({ ...s, rotate: toDeg }) }],
          baseOpts,
        ),
      );
      s.rotate = toDeg;
      break;
    }

    // ── shake ───────────────────────────────────────────────────────────────
    case "shake": {
      const mag = typeof ev.params.intensity === "number" ? ev.params.intensity : 5;

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
      break;
    }

    // ── punch ───────────────────────────────────────────────────────────────
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

    // ── kick ────────────────────────────────────────────────────────────────
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

    // ── rotate_part ─────────────────────────────────────────────────────────
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
      // Update inline style so the next rotate_part reads the correct rest angle.
      rpEl.style.transform = rpEl.style.transform.replace(
        /rotate\([^)]*\)/,
        `rotate(${rpTo}deg)`,
      );
      break;
    }

    // ── face ────────────────────────────────────────────────────────────────
    case "face": {
      const fEl = el.querySelector<HTMLElement>("[data-fig-face]");
      if (!fEl) break;
      const emoji = String(ev.params.text ?? ev.params._0 ?? "");
      if (emoji) faceSwaps.push({ timeMs: ev.time * 1000, el: fEl, emoji });
      break;
    }

    // ── say ─────────────────────────────────────────────────────────────────
    case "say": {
      const text = String(ev.params.text ?? "");
      const inverseScale = 1 / (s.scale || 1);

      // Detect scene background luminance to adapt bubble colors
      const sceneDark = isSceneDark(scene);
      const bubbleBg     = sceneDark ? "#1e2530" : "white";
      const bubbleBorder = sceneDark ? "#475569" : "#222";
      const bubbleText   = sceneDark ? "#e2e8f0" : "#222";
      const bubbleShadow = sceneDark ? "0 2px 8px rgba(0,0,0,0.35)" : "0 2px 8px rgba(0,0,0,0.12)";

      const bubble = document.createElement("div");
      bubble.textContent = text;
      bubble.style.opacity = "0";
      Object.assign(bubble.style, {
        position: "absolute",
        bottom: "calc(100% + 10px)",
        left: "50%",
        transform: `translateX(-50%) scale(${inverseScale})`,
        transformOrigin: "center bottom",
        background: bubbleBg,
        border: `2px solid ${bubbleBorder}`,
        color: bubbleText,
        borderRadius: "12px",
        padding: "6px 14px",
        fontFamily: "system-ui, sans-serif",
        fontSize: "15px",
        lineHeight: "1.3",
        whiteSpace: "nowrap",
        maxWidth: "220px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        pointerEvents: "none",
        zIndex: "10",
        boxShadow: bubbleShadow,
      });

      const tail = document.createElement("span");
      Object.assign(tail.style, {
        position: "absolute",
        bottom: "-10px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "0",
        height: "0",
        borderLeft: "7px solid transparent",
        borderRight: "7px solid transparent",
        borderTop: `10px solid ${bubbleBorder}`,
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

    // ── pose ────────────────────────────────────────────────────────────────
    // Sets multiple body parts to target angles simultaneously.
    // Usage: @1.0: hero.pose(arm_left=45, arm_right=-45, leg_left=10, dur=0.4)
    case "pose": {
      const poseParts = ["arm_left", "arm_right", "leg_left", "leg_right", "head", "body"];
      for (const partName of poseParts) {
        if (typeof ev.params[partName] !== "number") continue;
        const pSel = PART_SEL[partName];
        if (!pSel) continue;
        const pEl = el.querySelector<HTMLElement>(pSel);
        if (!pEl) continue;

        const fromDeg = readRotation(pEl);
        const toDeg = ev.params[partName] as number;

        anims.push(
          pEl.animate(
            [
              { transform: `rotate(${fromDeg}deg)` },
              { transform: `rotate(${toDeg}deg)` },
            ],
            { ...baseOpts, fill: "forwards" },
          ),
        );
        pEl.style.transform = pEl.style.transform.replace(
          /rotate\([^)]*\)/,
          `rotate(${toDeg}deg)`,
        );
      }
      break;
    }

    // ── wave ────────────────────────────────────────────────────────────────
    // Built-in wave gesture: raises arm, oscillates, returns.
    // Usage: @2.0: hero.wave(side=right, dur=0.8)
    case "wave": {
      const wSide = String(ev.params.side ?? "right");
      const wArmEl = el.querySelector<HTMLElement>(
        wSide === "left" ? "[data-fig-arm-l]" : "[data-fig-arm-r]",
      );
      if (!wArmEl) break;
      const wRest = readRotation(wArmEl);
      const wUp = wSide === "left" ? 70 : -70;
      const wMid1 = wSide === "left" ? 50 : -50;
      const wMid2 = wSide === "left" ? 70 : -70;

      anims.push(
        wArmEl.animate(
          [
            { transform: `rotate(${wRest}deg)`, offset: 0 },
            { transform: `rotate(${wUp}deg)`, offset: 0.2 },
            { transform: `rotate(${wMid1}deg)`, offset: 0.4 },
            { transform: `rotate(${wMid2}deg)`, offset: 0.55 },
            { transform: `rotate(${wMid1}deg)`, offset: 0.7 },
            { transform: `rotate(${wMid2}deg)`, offset: 0.85 },
            { transform: `rotate(${wRest}deg)`, offset: 1 },
          ],
          { ...baseOpts, easing: "ease-in-out", fill: "forwards" },
        ),
      );
      break;
    }

    // ── jump ────────────────────────────────────────────────────────────────
    // Jumps the actor up with squash/stretch effect.
    // Usage: @3.0: hero.jump(height=30, dur=0.5)
    case "jump": {
      const jHeight = typeof ev.params.height === "number" ? ev.params.height : 30;

      // Squash before jump, stretch during, squash on land, return
      anims.push(
        el.animate(
          [
            { transform: tx(s), offset: 0 },
            { transform: tx({ ...s, scale: s.scale * 0.9 }), offset: 0.1 },
            { transform: tx({ ...s, y: s.y - jHeight, scale: s.scale * 1.1 }), offset: 0.45 },
            { transform: tx({ ...s, y: s.y - jHeight * 0.3, scale: s.scale * 1.05 }), offset: 0.7 },
            { transform: tx({ ...s, scale: s.scale * 0.92 }), offset: 0.88 },
            { transform: tx(s), offset: 1 },
          ],
          { ...baseOpts, easing: "ease-in-out" },
        ),
      );
      break;
    }

    // ── nod ─────────────────────────────────────────────────────────────────
    // Nods the head down and back up. Figure actors only.
    // Usage: @2.0: hero.nod(dur=0.4)
    case "nod": {
      const nHeadEl = el.querySelector<HTMLElement>("[data-fig-head]");
      if (!nHeadEl) break;
      const nRest = readRotation(nHeadEl);
      const nDown = 15;

      anims.push(
        nHeadEl.animate(
          [
            { transform: `rotate(${nRest}deg)`, offset: 0 },
            { transform: `rotate(${nDown}deg)`, offset: 0.35 },
            { transform: `rotate(${nRest}deg)`, offset: 0.65 },
            { transform: `rotate(${nDown}deg)`, offset: 0.8 },
            { transform: `rotate(${nRest}deg)`, offset: 1 },
          ],
          { ...baseOpts, easing: "ease-in-out", fill: "forwards" },
        ),
      );
      break;
    }

    // ── bounce ──────────────────────────────────────────────────────────────
    // Bounces the actor vertically with diminishing amplitude.
    // Usage: @1.0: hero.bounce(intensity=15, count=3, dur=0.6)
    case "bounce": {
      const bIntensity = typeof ev.params.intensity === "number" ? ev.params.intensity : 15;
      const bCount = typeof ev.params.count === "number" ? ev.params.count : 3;
      const keyframes: Keyframe[] = [{ transform: tx(s), offset: 0 }];

      for (let bi = 0; bi < bCount; bi++) {
        const amp = bIntensity * Math.pow(0.55, bi);
        const baseOffset = (bi + 0.5) / (bCount + 0.5);
        const peakOffset = Math.min(baseOffset, 0.98);
        const valleyOffset = Math.min(baseOffset + 0.25 / (bCount + 0.5), 0.99);

        keyframes.push({
          transform: tx({ ...s, y: s.y - amp }),
          offset: peakOffset,
        });
        if (bi < bCount - 1) {
          keyframes.push({
            transform: tx(s),
            offset: valleyOffset,
          });
        }
      }
      keyframes.push({ transform: tx(s), offset: 1 });

      anims.push(
        el.animate(keyframes, { ...baseOpts, easing: "ease-out" }),
      );
      break;
    }

    // ── throw ───────────────────────────────────────────────────────────────
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
        span.className = "iconify";
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
