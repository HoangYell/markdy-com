import type { ActorPack } from "@markdy/core";

export const SYSTEM_ACTOR_TYPES = ["service", "db", "queue", "client"] as const;
export const SYSTEM_FLOW_ACTIONS = ["request", "response", "emit"] as const;

const FLOW_ACTIONS = [...SYSTEM_FLOW_ACTIONS];

export const systemsPack: ActorPack = {
  name: "systems",
  actors: SYSTEM_ACTOR_TYPES,
  actions: {
    service: FLOW_ACTIONS,
    db: FLOW_ACTIONS,
    queue: FLOW_ACTIONS,
    client: FLOW_ACTIONS,
  },
};
