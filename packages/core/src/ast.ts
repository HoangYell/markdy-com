/**
 * AST types for MarkdyScript — the complete output of the parser.
 * Zero runtime dependencies.
 */

export type AssetDef = {
  type: "image" | "icon";
  value: string;
};

export type ActorDef = {
  type: "sprite" | "text" | "box" | "figure";
  /** Constructor arguments: asset name for sprite, display text for text actors. */
  args: string[];
  x: number;
  y: number;
  scale?: number;
  rotate?: number;
  opacity?: number;
  /** Font size in pixels; applies to text actors (via the `size` modifier). */
  size?: number;
};

export type TimelineEvent = {
  time: number;
  actor: string;
  action: string;
  params: Record<string, unknown>;
  line: number;
};

export type SceneMeta = {
  width: number;
  height: number;
  fps: number;
  bg: string;
  /** Auto-computed from the last event + its dur param when not explicitly set. */
  duration?: number;
};

export type SceneAST = {
  meta: SceneMeta;
  assets: Record<string, AssetDef>;
  actors: Record<string, ActorDef>;
  events: TimelineEvent[];
};
