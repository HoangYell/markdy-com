export type {
  BeatDecl,
  BeatRange,
  AnnotationDecl,
  Cue,
  DiagramAST,
  DiagramType,
  Diagnostic,
  EdgeDecl,
  EdgeKind,
  FlowSegment,
  GroupBoundary,
  GroupDecl,
  LayoutDirection,
  NodeDecl,
  NodeShape,
  PatternDecl,
  PositionedNode,
  RenderPlan,
  RoutedEdge,
  SceneMeta,
  SequenceActivation,
  SequenceMessage,
  StyleDecl,
  ThemeTokens,
  TimedCue,
  TreeBus,
} from "./ast.js";

export { parse, compile, parseAndCompile, ParseError, compilePlan } from "./parser.js";
export type { ParseOptions, ParseResult } from "./parser.js";

export { resolveTheme, THEMES } from "./themes.js";

export {
  NODE_KINDS,
  EDGE_OPERATORS,
  NODE_ALIASES,
  CUE_ALIASES,
  BEAT_CUE_KEYWORDS,
  SCENE_KEYS,
  DIAGRAM_TYPES,
  canonicalNodeKind,
  humanizeId,
  nodeRole,
} from "./registry.js";

export {
  TECHNICAL_NODE_TYPES,
  TECHNICAL_NODE_KINDS,
  VISUAL_PRIMITIVE_TYPES,
} from "./system-vocabulary.js";
