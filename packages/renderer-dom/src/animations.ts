/**
 * Timeline → WAAPI animation compiler.
 *
 * Walks the parsed scene's events in time order and dispatches each one to
 * its handler in `./actions/registry.ts`. The handlers do the actual
 * animating; this module owns only the concerns that are genuinely global:
 * event ordering, per-event timing/easing defaults, actor state threading,
 * and camera routing.
 *
 * Every animation is created with `fill: "forwards"` and no backward fill,
 * so an actor's pre-event appearance falls through to the inline styles
 * `preInitInlineStyles` set. The player then drives `currentTime` on all of
 * them manually from a rAF loop, which is what makes seeking reliable.
 */
import type { SceneAST } from "@markdy/core";
import type { ActorState, FaceSwap } from "./types.js";
import { stateFrom, toEasing, tx, txCaption } from "./types.js";
import { buildCameraAction, freshCameraState } from "./camera.js";
import { preInitInlineStyles } from "./stage.js";
import type { ActionContext } from "./actions/context.js";
import { handlerFor } from "./actions/registry.js";

/** Fallback duration, in seconds, when an event omits `dur`. */
const DEFAULT_DURATION_S = 0.5;

/**
 * Easing applied to entrance/exit actions when the author omits `ease`.
 *
 * Arrivals that decelerate into place and departures that accelerate away
 * read as natural; the engine-wide `linear` fallback is what made unstyled
 * scenes look mechanical. An explicit `ease=` always wins over these.
 */
const DEFAULT_EASE_BY_ACTION: Record<string, string> = {
  enter: "out",
  fade_in: "out",
  exit: "in",
  fade_out: "in",
};

export function buildAnimations(
  ast: SceneAST,
  actorEls: Map<string, HTMLElement>,
  actorLayer: HTMLElement,
  cameraLayer: HTMLElement,
  assetOverrides: Record<string, string>,
  faceSwaps: FaceSwap[],
): Animation[] {
  const anims: Animation[] = [];

  const states = new Map<string, ActorState>();
  for (const [name, def] of Object.entries(ast.actors)) {
    states.set(name, stateFrom(def));
  }

  // Captions anchor their (x, y) on their center so they stay centered
  // regardless of text width; everything else anchors top-left. Bind the
  // right serializer per actor once, rather than branching at every call.
  const captionActors = new Set(
    Object.entries(ast.actors)
      .filter(([, def]) => def.type === "caption")
      .map(([name]) => name),
  );
  const txFor = (actorName: string) => (captionActors.has(actorName) ? txCaption : tx);

  const events = [...ast.events].sort((a, b) => a.time - b.time);
  preInitInlineStyles(ast, actorEls, states, events, txFor);

  const cameraState = freshCameraState();

  for (const ev of events) {
    const delayMs = ev.time * 1000;
    const durMs = Math.max(
      1,
      (typeof ev.params.dur === "number" ? ev.params.dur : DEFAULT_DURATION_S) * 1000,
    );
    const baseOpts: KeyframeAnimationOptions = {
      delay: delayMs,
      duration: durMs,
      fill: "forwards",
      easing: toEasing(ev.params.ease ?? DEFAULT_EASE_BY_ACTION[ev.action]),
    };

    // The camera is a reserved actor with no element of its own — it
    // transforms the whole content layer, so it routes separately.
    if (ev.actor === "camera") {
      buildCameraAction(ev, cameraLayer, ast, baseOpts, anims, cameraState);
      continue;
    }

    const el = actorEls.get(ev.actor);
    const state = states.get(ev.actor);
    const handler = handlerFor(ev.action);
    if (!el || !state || !handler) continue;

    const ctx: ActionContext = {
      ev,
      el,
      state,
      baseOpts,
      delayMs,
      durMs,
      ast,
      states,
      actorEls,
      scene: actorLayer,
      assetOverrides,
      faceSwaps,
      anims,
      tx: txFor(ev.actor),
    };
    handler(ctx);
  }

  return anims;
}
