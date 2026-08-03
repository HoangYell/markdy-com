import { TECHNICAL_NODE_KINDS, TECHNICAL_NODE_TYPES } from "./system-vocabulary.js";

export const NODE_KINDS = new Set<string>(TECHNICAL_NODE_TYPES);

export const EDGE_OPERATORS: Record<string, "request" | "response" | "event" | "dependency"> = {
  "->": "request",
  "<-": "response",
  "~>": "event",
  "--": "dependency",
};

export const RESERVED_SELECTORS = new Set(["$title", "$nodes", "$edges"]);

export const BEAT_CUE_KEYWORDS = new Set(["show", "hide", "glow", "focus", "use"]);

export const SCENE_KEYS = new Set(["width", "height", "fps", "theme", "duration", "direction"]);

export function nodeRole(kind: string): string {
  return (TECHNICAL_NODE_KINDS as Record<string, string>)[kind] ?? "compute";
}

export function humanizeId(id: string): string {
  return id
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Node kind aliases for concise authoring. */
export const NODE_ALIASES: Record<string, string> = {
  db: "database",
  api: "service",
  gateway: "api_gateway",
  mq: "queue",
  k8s: "cluster",
  lb: "load_balancer",
};

export function canonicalNodeKind(kind: string): string {
  return NODE_ALIASES[kind] ?? kind;
}
