import type { ActorDef } from "@markdy/core";

// ---------------------------------------------------------------------------
// Per-actor mutable runtime state
// ---------------------------------------------------------------------------

export interface ActorState {
  x: number;
  y: number;
  scale: number;
  rotate: number;
  opacity: number;
}

export function stateFrom(def: ActorDef): ActorState {
  return {
    x: def.x,
    y: def.y,
    scale: def.scale ?? 1,
    rotate: def.rotate ?? 0,
    opacity: def.opacity ?? 1,
  };
}

/** Full CSS transform string encoding all composited actor properties. */
export function tx(s: ActorState): string {
  return `translate(${s.x}px, ${s.y}px) scale(${s.scale}) rotate(${s.rotate}deg)`;
}

/**
 * Caption variant of `tx`: the (x, y) point is interpreted as the caption's
 * *center*, so we apply a `-50%, -50%` self-translate via a CSS `calc()`.
 * The parser places captions at `(sceneWidth / 2, anchor-fraction * height)`
 * and this transform keeps the element centered on that point regardless
 * of its text width.
 */
export function txCaption(s: ActorState): string {
  return `translate(calc(${s.x}px - 50%), calc(${s.y}px - 50%)) scale(${s.scale}) rotate(${s.rotate}deg)`;
}

// ---------------------------------------------------------------------------
// Face-swap record (seek-safe emoji face changes)
// ---------------------------------------------------------------------------

export interface FaceSwap {
  timeMs: number;
  el: HTMLElement;
  emoji: string;
}

// ---------------------------------------------------------------------------
// Easing utilities
// ---------------------------------------------------------------------------

const EASE_MAP: Record<string, string> = {
  linear: "linear",
  in: "ease-in",
  out: "ease-out",
  inout: "ease-in-out",
};

export function toEasing(val: unknown): string {
  return EASE_MAP[String(val ?? "")] ?? "linear";
}
