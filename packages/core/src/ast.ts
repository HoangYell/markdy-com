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

/**
 * A user-defined actor template (`def`).
 * Expands to an actor type + args at parse time — the renderer never sees it.
 */
export type TemplateDef = {
  /** Parameter names declared on the def line. */
  params: string[];
  /** The actor type this def expands to (e.g. "figure", "sprite"). */
  actorType: ActorDef["type"];
  /** Raw constructor arg tokens (may contain `${param}` references). */
  bodyArgs: string[];
};

/**
 * A user-defined reusable animation sequence (`seq`).
 * Expanded inline wherever `actor.play(seqName)` appears.
 */
export type SequenceDef = {
  /** Parameter names (excluding the implicit `$` target actor). */
  params: string[];
  /** Raw event lines with `@+offset` and `$` actor placeholder. */
  events: Array<{
    offset: number;
    action: string;
    paramsRaw: string;
  }>;
};

export type SceneAST = {
  meta: SceneMeta;
  assets: Record<string, AssetDef>;
  actors: Record<string, ActorDef>;
  events: TimelineEvent[];
  /** User-defined actor templates — kept in AST for tooling/inspection. */
  defs: Record<string, TemplateDef>;
  /** User-defined sequences — kept in AST for tooling/inspection. */
  seqs: Record<string, SequenceDef>;
  /** User-defined variables — kept in AST for tooling/inspection. */
  vars: Record<string, string>;
};
