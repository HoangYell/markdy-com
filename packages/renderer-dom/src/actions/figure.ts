/**
 * Figure-only actions: limb articulation, gestures, and face swaps.
 *
 * These target the sub-elements of a `figure` actor (arms, legs, head, face)
 * rather than the actor root. The parser rejects them on non-figure actors,
 * so handlers here can assume the markup exists — but they still bail out
 * quietly if a selector misses, since a soft-warned scene should never throw.
 */
import type { ActionContext, ActionHandler } from "./context.js";
import { PART_SEL, readRotation } from "../figure.js";

type Side = "left" | "right";

function sideOf(ctx: ActionContext): Side {
  return String(ctx.ev.params.side ?? "right") === "left" ? "left" : "right";
}

function partEl(ctx: ActionContext, part: string): HTMLElement | null {
  const selector = PART_SEL[part];
  return selector ? ctx.el.querySelector<HTMLElement>(selector) : null;
}

function rotateKeyframe(deg: number, offset?: number): Keyframe {
  return offset === undefined
    ? { transform: `rotate(${deg}deg)` }
    : { transform: `rotate(${deg}deg)`, offset };
}

/**
 * Swings a limb out to `extend` degrees and snaps it back to rest.
 *
 * `punch` and `kick` are the same motion on different limbs, differing only
 * in throw angle and how far through the duration the extension peaks.
 */
function swingLimb(ctx: ActionContext, part: string, extendDeg: number, peakOffset: number): void {
  const el = partEl(ctx, part);
  if (!el) return;

  const rest = readRotation(el);
  ctx.anims.push(
    el.animate([rotateKeyframe(rest), rotateKeyframe(extendDeg, peakOffset), rotateKeyframe(rest)], {
      ...ctx.baseOpts,
      easing: "ease-in-out",
      fill: "forwards",
    }),
  );
}

/** Legacy combat gesture. Supported for compatibility; prefer `wave`/`nod` in new scenes. */
export const punch: ActionHandler = (ctx) => {
  const side = sideOf(ctx);
  swingLimb(ctx, side === "left" ? "arm_left" : "arm_right", side === "left" ? -75 : 75, 0.35);
};

/** Legacy combat gesture. Supported for compatibility; prefer `wave`/`nod` in new scenes. */
export const kick: ActionHandler = (ctx) => {
  const side = sideOf(ctx);
  swingLimb(ctx, side === "left" ? "leg_left" : "leg_right", side === "left" ? -100 : 100, 0.38);
};

/** Raises an arm, oscillates it twice, and lowers it back to rest. */
export const wave: ActionHandler = (ctx) => {
  const side = sideOf(ctx);
  const el = partEl(ctx, side === "left" ? "arm_left" : "arm_right");
  if (!el) return;

  const rest = readRotation(el);
  const up = side === "left" ? 70 : -70;
  const inward = side === "left" ? 50 : -50;

  ctx.anims.push(
    el.animate(
      [
        rotateKeyframe(rest, 0),
        rotateKeyframe(up, 0.2),
        rotateKeyframe(inward, 0.4),
        rotateKeyframe(up, 0.55),
        rotateKeyframe(inward, 0.7),
        rotateKeyframe(up, 0.85),
        rotateKeyframe(rest, 1),
      ],
      { ...ctx.baseOpts, easing: "ease-in-out", fill: "forwards" },
    ),
  );
};

/** Tips the head down and back up, twice. */
export const nod: ActionHandler = (ctx) => {
  const el = partEl(ctx, "head");
  if (!el) return;

  const rest = readRotation(el);
  const down = 15;

  ctx.anims.push(
    el.animate(
      [
        rotateKeyframe(rest, 0),
        rotateKeyframe(down, 0.35),
        rotateKeyframe(rest, 0.65),
        rotateKeyframe(down, 0.8),
        rotateKeyframe(rest, 1),
      ],
      { ...ctx.baseOpts, easing: "ease-in-out", fill: "forwards" },
    ),
  );
};

/**
 * Commits a part's final angle to its inline style.
 *
 * WAAPI's `fill: "forwards"` holds the visual result but doesn't update the
 * inline transform, and `readRotation` reads *from* the inline transform —
 * so without this, two consecutive rotations of the same part would both
 * animate from the original rest angle and the second would visibly snap.
 */
function commitRotation(el: HTMLElement, deg: number): void {
  el.style.transform = el.style.transform.replace(/rotate\([^)]*\)/, `rotate(${deg}deg)`);
}

export const rotatePart: ActionHandler = (ctx) => {
  const el = partEl(ctx, String(ctx.ev.params.part ?? ""));
  if (!el) return;

  const from = readRotation(el);
  const to = typeof ctx.ev.params.to === "number" ? ctx.ev.params.to : from;

  ctx.anims.push(
    el.animate([rotateKeyframe(from), rotateKeyframe(to)], { ...ctx.baseOpts, fill: "forwards" }),
  );
  commitRotation(el, to);
};

/** Body parts `pose` can set in a single call. */
const POSEABLE_PARTS = ["arm_left", "arm_right", "leg_left", "leg_right", "head", "body"] as const;

/** Sets several part angles at once; parts left unspecified stay put. */
export const pose: ActionHandler = (ctx) => {
  for (const part of POSEABLE_PARTS) {
    const to = ctx.ev.params[part];
    if (typeof to !== "number") continue;

    const el = partEl(ctx, part);
    if (!el) continue;

    ctx.anims.push(
      el.animate([rotateKeyframe(readRotation(el)), rotateKeyframe(to)], {
        ...ctx.baseOpts,
        fill: "forwards",
      }),
    );
    commitRotation(el, to);
  }
};

/**
 * Instantaneous emoji swap.
 *
 * Recorded rather than animated: a zero-duration WAAPI animation can't be
 * scrubbed backwards correctly, so the player replays the recorded swaps
 * against the current time on every frame instead.
 */
export const face: ActionHandler = (ctx) => {
  const el = ctx.el.querySelector<HTMLElement>("[data-fig-face]");
  if (!el) return;

  const emoji = String(ctx.ev.params.text ?? ctx.ev.params._0 ?? "");
  if (emoji) ctx.faceSwaps.push({ timeMs: ctx.ev.time * 1000, el, emoji });
};
