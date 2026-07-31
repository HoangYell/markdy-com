/**
 * Action name → handler lookup.
 *
 * This table *is* the renderer's action surface. To add an action: write a
 * handler in one of the sibling modules, register it here, and teach the
 * parser about it in `@markdy/core`'s registry. No switch statement to
 * extend, no argument threading.
 *
 * Names not present here are silently ignored at render time. That's
 * deliberate and matches the parser's Law of Must-Ignore: an unknown action
 * soft-warns and no-ops rather than breaking the whole scene, so a file
 * authored against a newer grammar still renders everything it can.
 */
import type { ActionHandler } from "./context.js";
import * as figure from "./figure.js";
import * as transform from "./transform.js";
import { flowEdge } from "./flow.js";
import { say } from "./speech.js";
import { throwAsset } from "./projectile.js";

export const ACTION_HANDLERS: Readonly<Record<string, ActionHandler>> = Object.freeze({
  // Universal — every actor type
  move: transform.move,
  enter: transform.enter,
  exit: transform.exit,
  fade_in: transform.fadeIn,
  fade_out: transform.fadeOut,
  scale: transform.scale,
  rotate: transform.rotate,
  shake: transform.shake,
  jump: transform.jump,
  bounce: transform.bounce,
  say,
  throw: throwAsset,

  // Figure-only — the parser rejects these on other actor types
  punch: figure.punch,
  kick: figure.kick,
  wave: figure.wave,
  nod: figure.nod,
  rotate_part: figure.rotatePart,
  pose: figure.pose,
  face: figure.face,

  // System-diagram flow edges (@markdy/stdlib-systems)
  request: flowEdge,
  response: flowEdge,
  emit: flowEdge,
});

export function handlerFor(action: string): ActionHandler | undefined {
  return ACTION_HANDLERS[action];
}
