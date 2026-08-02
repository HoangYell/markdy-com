import type { ActorPack } from "@markdy/core";
import { TECHNICAL_NODE_TYPES, VISUAL_PRIMITIVE_TYPES } from "../../core/src/system-vocabulary.js";

export const SYSTEM_ACTOR_TYPES = [
  ...TECHNICAL_NODE_TYPES,
  ...VISUAL_PRIMITIVE_TYPES,
] as const;

const LEGACY_VISUAL_ACTOR_TYPES = [
  "parking_map",
  "ascii_map",
  "game_scene",
  "byte_viz",
] as const;

const REGISTERED_SYSTEM_ACTOR_TYPES = [
  ...SYSTEM_ACTOR_TYPES,
  ...LEGACY_VISUAL_ACTOR_TYPES,
] as const;
export const SYSTEM_FLOW_ACTIONS = ["request", "response", "emit"] as const;

const FLOW_ACTIONS = [...SYSTEM_FLOW_ACTIONS];

const SYSTEM_ACTIONS: Record<string, readonly string[]> = Object.fromEntries(
  REGISTERED_SYSTEM_ACTOR_TYPES.map((actorType) => [actorType, FLOW_ACTIONS]),
);

export const systemsPack: ActorPack = {
  name: "systems",
  actors: REGISTERED_SYSTEM_ACTOR_TYPES,
  actions: SYSTEM_ACTIONS,
};
