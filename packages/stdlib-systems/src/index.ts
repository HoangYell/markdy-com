import type { ActorPack } from "@markdy/core";

export const SYSTEM_ACTOR_TYPES = [
  "service",
  "api",
  "microservice",
  "db",
  "database",
  "queue",
  "cache",
  "client",
  "user",
  "cloud",
  "region",
  "container",
  "cluster",
] as const;
export const SYSTEM_FLOW_ACTIONS = ["request", "response", "emit"] as const;

const FLOW_ACTIONS = [...SYSTEM_FLOW_ACTIONS];

const SYSTEM_ACTIONS: Record<string, readonly string[]> = Object.fromEntries(
  SYSTEM_ACTOR_TYPES.map((actorType) => [actorType, FLOW_ACTIONS]),
);

export const systemsPack: ActorPack = {
  name: "systems",
  actors: SYSTEM_ACTOR_TYPES,
  actions: SYSTEM_ACTIONS,
};
