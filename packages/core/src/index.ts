export type {
  BeatDecl,
  BeatRange,
  Cue,
  DiagramAST,
  Diagnostic,
  EdgeDecl,
  EdgeKind,
  FlowSegment,
  GroupDecl,
  LayoutDirection,
  NodeDecl,
  PatternDecl,
  PositionedNode,
  RenderPlan,
  RoutedEdge,
  SceneMeta,
  StyleDecl,
  ThemeTokens,
  TimedCue,
} from "./ast.js";

export { parse, compile, parseAndCompile, ParseError, compilePlan } from "./parser.js";
export type { ParseOptions, ParseResult } from "./parser.js";

export { resolveTheme, THEMES } from "./themes.js";

export {
  NODE_KINDS,
  EDGE_OPERATORS,
  NODE_ALIASES,
  BEAT_CUE_KEYWORDS,
  SCENE_KEYS,
  canonicalNodeKind,
  humanizeId,
  nodeRole,
} from "./registry.js";

export {
  TECHNICAL_NODE_TYPES,
  TECHNICAL_NODE_KINDS,
  VISUAL_PRIMITIVE_TYPES,
} from "./system-vocabulary.js";
