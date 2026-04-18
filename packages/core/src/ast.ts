/**
 * AST types for MarkdyScript — the complete output of the parser.
 * Zero runtime dependencies.
 */

export type AssetDef = {
  type: "image" | "icon";
  value: string;
};

export type ActorDef = {
  type: "sprite" | "text" | "box" | "figure" | "caption";
  /** Constructor arguments: asset name for sprite, display text for text/caption actors. */
  args: string[];
  x: number;
  y: number;
  scale?: number;
  rotate?: number;
  opacity?: number;
  /** Font size in pixels; applies to text actors (via the `size` modifier). */
  size?: number;
  /** Z-index for layering control (via the `z` modifier). */
  z?: number;
  /**
   * Semantic anchor for captions (`top`, `bottom`, `center`). Absent for
   * non-caption actors. The parser also fills `x` and `y` from the anchor
   * so renderers that don't understand the field still place the caption.
   */
  anchor?: "top" | "bottom" | "center";
};

export type TimelineEvent = {
  time: number;
  actor: string;
  action: string;
  params: Record<string, unknown>;
  line: number;
  /**
   * The `scene "title" { ... }` block this event belongs to, if any.
   * Undefined for events in the top-level scope.
   */
  chapter?: string;
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

/**
 * A `scene "title" { ... }` block — a named grouping of timeline events.
 * Start/end times are inclusive wall-clock seconds so renderers and
 * tooling can highlight the active chapter without re-walking events.
 */
export type Chapter = {
  name: string;
  startTime: number;
  endTime: number;
  startLine: number;
};

/**
 * A non-fatal parse issue. Renderers should surface these via
 * `onWarning` so the author can fix the underlying cause; the
 * renderer otherwise no-ops the offending statement.
 */
export type ParseWarning = {
  kind:
    | "unknown-action"
    | "unknown-modifier"
    | "unknown-scene-key"
    | "unknown-camera-action"
    | "import-unresolved"
    | "preset-mixed";
  message: string;
  line: number;
};

/**
 * An `import "path.markdy" as ns` declaration. Parsing records the
 * intent; the host (CLI, bundler) resolves the path and may supply
 * pre-parsed ASTs via the `parse(..., { imports })` option.
 */
export type ImportDecl = {
  path: string;
  namespace: string;
  line: number;
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
  /** Named chapter blocks in author order. Empty when no chapters were used. */
  chapters: Chapter[];
  /** Soft parse issues. Always present; empty in the happy path. */
  warnings: ParseWarning[];
  /** `import` declarations in author order. Always present; empty when none were used. */
  imports: ImportDecl[];
};
