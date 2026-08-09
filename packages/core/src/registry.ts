import { TECHNICAL_NODE_KINDS, TECHNICAL_NODE_TYPES } from "./system-vocabulary.js";

export const NODE_KINDS = new Set<string>(TECHNICAL_NODE_TYPES);

export const EDGE_OPERATORS: Record<string, "request" | "response" | "event" | "dependency"> = {
  "->": "request",
  "<-": "response",
  "~>": "event",
  "--": "dependency",
};

export const RESERVED_SELECTORS = new Set(["$title", "$nodes", "$edges"]);

/** Natural-language cue synonyms that AIs reach for, mapped to real cues. */
export const CUE_ALIASES: Record<string, string> = {
  pulse: "focus",
  highlight: "glow",
  emphasize: "glow",
};

export const BEAT_CUE_KEYWORDS = new Set([
  "show",
  "hide",
  "glow",
  "focus",
  "frame",
  "use",
  ...Object.keys(CUE_ALIASES),
]);

export const SCENE_KEYS = new Set(["width", "height", "fps", "theme", "duration", "direction", "layout"]);

export function nodeRole(kind: string): string {
  return (TECHNICAL_NODE_KINDS as Record<string, string>)[kind] ?? "compute";
}

export function humanizeId(id: string): string {
  const acronyms = new Set(["api", "cdn", "db", "dns", "http", "https", "id", "jwt", "oidc", "sdk", "tls", "ui", "url"]);
  const exactCase = new Map([
    ["etcd", "etcd"],
    ["kubectl", "kubectl"],
  ]);
  return id
    .replace(/[_-]+/g, " ")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const lower = word.toLowerCase();
      const exact = exactCase.get(lower);
      if (exact) return exact;
      if (acronyms.has(lower)) return lower.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
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
