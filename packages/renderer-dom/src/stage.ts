/**
 * Scene staging: where actors sit before the timeline starts running.
 *
 * Every animation is built with `fill: "forwards"` and no backward fill, so
 * an actor's appearance *before* its first event falls through to whatever
 * inline style we set here. Getting that right is what makes t=0 look
 * correct — and what makes scrubbing backwards to t=0 look correct too.
 */
import type { SceneAST } from "@markdy/core";
import type { ActorState } from "./types.js";

/**
 * Returns a copy of `s` displaced off the given edge of the stage.
 *
 * Shared by `preInitInlineStyles` (so an actor whose first event is `enter`
 * starts off-screen) and by the `enter`/`exit` handlers themselves. Keeping
 * one implementation prevents the two paths from drifting to different
 * multipliers, which would make an actor visibly jump on its first frame.
 */
export function offscreenState(
  s: ActorState,
  direction: string,
  sceneWidth: number,
  sceneHeight: number,
): ActorState {
  const out: ActorState = { ...s };
  switch (direction) {
    case "left":
      out.x = -sceneWidth * 1.1;
      break;
    case "right":
      out.x = sceneWidth * 2.1;
      break;
    case "top":
      out.y = -sceneHeight * 1.1;
      break;
    case "bottom":
      out.y = sceneHeight * 2.1;
      break;
  }
  return out;
}

/**
 * Pre-computes each actor's t=0 inline style.
 *
 * Two cases need fixing up before playback:
 *   • an actor whose first event is `enter` must start off-screen, and
 *   • an actor whose first event is `fade_in` must start invisible, even
 *     though its declared opacity is > 0.
 */
export function preInitInlineStyles(
  ast: SceneAST,
  actorEls: Map<string, HTMLElement>,
  states: Map<string, ActorState>,
  events: SceneAST["events"],
  txFor: (actorName: string) => (s: ActorState) => string,
): void {
  const firstEventByActor = new Map<string, SceneAST["events"][number]>();
  for (const ev of events) {
    if (ev.actor === "camera") continue;
    if (!firstEventByActor.has(ev.actor)) firstEventByActor.set(ev.actor, ev);
  }

  for (const [name, def] of Object.entries(ast.actors)) {
    const el = actorEls.get(name);
    const s = states.get(name);
    if (!el || !s) continue;

    const firstEv = firstEventByActor.get(name);
    if (!firstEv) continue;

    if (firstEv.action === "enter") {
      const from = String(firstEv.params.from ?? "left");
      el.style.transform = txFor(name)(offscreenState(s, from, ast.meta.width, ast.meta.height));
    }

    if (firstEv.action === "fade_in" && (def.opacity === undefined || def.opacity > 0)) {
      el.style.opacity = "0";
    }
  }
}
