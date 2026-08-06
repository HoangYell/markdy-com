/**
 * @markdy/stdlib-systems — the system-diagram vocabulary for MarkdyScript.
 *
 * As of MarkdyScript 0.8 the node vocabulary ships inside `@markdy/core`, so
 * there is no runtime registration step anymore. This package re-exports that
 * vocabulary and a descriptive `systemsPack` manifest for tooling that wants a
 * single import listing every supported node type and flow action.
 */
import { TECHNICAL_NODE_TYPES, VISUAL_PRIMITIVE_TYPES } from "@markdy/core";

export const SYSTEM_NODE_TYPES = [
  ...TECHNICAL_NODE_TYPES,
  ...VISUAL_PRIMITIVE_TYPES,
] as const;

export const SYSTEM_FLOW_ACTIONS = ["request", "response", "event", "dependency"] as const;

export interface SystemsPack {
  name: string;
  nodes: readonly string[];
  actions: readonly string[];
}

export const systemsPack: SystemsPack = {
  name: "systems",
  nodes: SYSTEM_NODE_TYPES,
  actions: SYSTEM_FLOW_ACTIONS,
};

export { TECHNICAL_NODE_TYPES, VISUAL_PRIMITIVE_TYPES } from "@markdy/core";
