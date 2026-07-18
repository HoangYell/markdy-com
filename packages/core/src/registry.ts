import type { BuiltinActorType } from "./ast.js";

const BUILTIN_ACTOR_TYPES: readonly BuiltinActorType[] = [
  "sprite",
  "text",
  "box",
  "figure",
  "caption",
];

const UNIVERSAL_ACTIONS = new Set<string>([
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
]);

const FIGURE_ONLY_ACTIONS = new Set<string>([
  "punch",
  "kick",
  "wave",
  "nod",
  "jump",
  "bounce",
  "face",
  "rotate_part",
  "pose",
]);

const CAMERA_ACTIONS = new Set<string>(["pan", "zoom", "shake"]);

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
