/**
 * The single argument every action handler receives.
 *
 * Before this existed, each action was a `case` in one ~520-line switch and
 * the switch function took fourteen positional parameters — adding an action
 * meant editing the switch *and* re-threading arguments through it. Bundling
 * the render environment into one object means a handler is now an ordinary
 * function you can write, move, and test on its own.
 *
 * Handlers are expected to:
 *   • push every `Animation` they create onto `anims` (the player pauses and
 *     scrubs them all as a group), and
 *   • mutate `state` to reflect the actor's *end* state, because subsequent
 *     events on the same actor animate from wherever the previous one left it.
 */
import type { SceneAST, TimelineEvent } from "@markdy/core";
import type { ActorState, FaceSwap } from "../types.js";

export interface ActionContext {
  /** The timeline event being rendered. */
  ev: TimelineEvent;
  /** Root DOM element of the acting actor. */
  el: HTMLElement;
  /** Mutable running state for the acting actor. Handlers update it in place. */
  state: ActorState;
  /** Shared WAAPI options (delay, duration, fill, easing) derived from the event. */
  baseOpts: KeyframeAnimationOptions;
  /** Event start time in milliseconds — for handlers that schedule sub-animations. */
  delayMs: number;
  /** Event duration in milliseconds. */
  durMs: number;
  /** The parsed scene, for dimensions, actor types, and asset lookups. */
  ast: SceneAST;
  /** Running state for every actor, for actions that target a second actor. */
  states: Map<string, ActorState>;
  /** Root elements for every actor, keyed by actor name. */
  actorEls: Map<string, HTMLElement>;
  /** The camera/content layer actors are mounted into. */
  scene: HTMLElement;
  /** Host-supplied asset URL overrides, keyed by asset name. */
  assetOverrides: Record<string, string>;
  /**
   * Seek-safe emoji face changes. `face` is instantaneous, so it can't be a
   * WAAPI animation — the player replays these against the current time.
   */
  faceSwaps: FaceSwap[];
  /** Collector for every animation produced while building the scene. */
  anims: Animation[];
  /**
   * Serializes an `ActorState` into a CSS transform for *this* actor.
   * Captions anchor on their center, everything else on its top-left, so the
   * correct serializer is bound per actor rather than chosen per call site.
   */
  tx: (s: ActorState) => string;
}

/**
 * Renders one timeline event. Registered by action name in `./registry.ts`.
 */
export type ActionHandler = (ctx: ActionContext) => void;
