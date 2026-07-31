import type { BuiltinActorType } from "./ast.js";

/**
 * The canonical vocabulary of the language.
 *
 * These arrays are the single source of truth for every tool that needs to
 * know what Markdy understands — the parser, the language server, the
 * playground's syntax highlighter, and the renderer's handler-coverage test.
 * Anything that hard-codes its own copy will silently drift out of date, so
 * import from here instead.
 */
export const BUILTIN_ACTOR_TYPES: readonly BuiltinActorType[] = [
  "sprite",
  "text",
  "box",
  "figure",
  "caption",
] as const;

/** Actions valid on every actor type. */
export const UNIVERSAL_ACTION_NAMES = [
  "enter",
  "exit",
  "move",
  "fade_in",
  "fade_out",
  "scale",
  "rotate",
  "shake",
  "say",
  "throw",
  "play",
] as const;

/**
 * Actions that require a `figure` actor. Applying one to any other actor
 * type is a hard `ParseError`, not a soft warning — it's always a mistake.
 */
export const FIGURE_ONLY_ACTION_NAMES = [
  "punch",
  "kick",
  "wave",
  "nod",
  "jump",
  "bounce",
  "face",
  "rotate_part",
  "pose",
] as const;

/** Actions valid on the reserved `camera` actor. */
export const CAMERA_ACTION_NAMES = ["pan", "zoom", "shake"] as const;

const UNIVERSAL_ACTIONS = new Set<string>(UNIVERSAL_ACTION_NAMES);
const FIGURE_ONLY_ACTIONS = new Set<string>(FIGURE_ONLY_ACTION_NAMES);
const CAMERA_ACTIONS = new Set<string>(CAMERA_ACTION_NAMES);

const actorTypes = new Set<string>(BUILTIN_ACTOR_TYPES);
const actorActions = new Map<string, Set<string>>();

export type ActorPack = {
  name: string;
  actors: readonly string[];
  actions?: Record<string, readonly string[]>;
};

export function registerActorPack(pack: ActorPack): void {
  for (const actor of pack.actors) {
    actorTypes.add(actor);
    if (!actorActions.has(actor)) actorActions.set(actor, new Set<string>());
  }

  if (!pack.actions) return;
  for (const [actorType, actions] of Object.entries(pack.actions)) {
    actorTypes.add(actorType);
    const known = actorActions.get(actorType) ?? new Set<string>();
    for (const action of actions) known.add(action);
    actorActions.set(actorType, known);
  }
}

export function isKnownActorType(type: string): boolean {
  return actorTypes.has(type);
}

export function isFigureOnlyAction(action: string): boolean {
  return FIGURE_ONLY_ACTIONS.has(action);
}

export function isCameraAction(action: string): boolean {
  return CAMERA_ACTIONS.has(action);
}

export function isKnownAction(actorType: string, action: string): boolean {
  if (UNIVERSAL_ACTIONS.has(action)) return true;
  if (actorType === "figure" && FIGURE_ONLY_ACTIONS.has(action)) return true;
  return actorActions.get(actorType)?.has(action) ?? false;
}
