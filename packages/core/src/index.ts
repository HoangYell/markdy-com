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
  PlayerConfig,
  PlayerChromeConfig,
  PlayerControlsConfig,
  PlayerInteractionConfig,
  PlayerPlaybackConfig,
  PlayerProgress,
  ResolvedPlayer,
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
export { computeAdaptiveDimensions } from "./compiler.js";
export type { ParseOptions, ParseResult } from "./parser.js";

export { resolvePlayer, applyPlayerSetting, PLAYER_GROUPS, PLAYER_FLAT_KEYS } from "./player.js";
export type { PlayerOverrides, PlayerScope } from "./player.js";

export { resolveTheme, THEMES } from "./themes.js";
export { generateThemeFromBrand } from "./theme-generator.js";
export type { ThemeGeneratorOptions } from "./theme-generator.js";

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

export {
  validateArchitecture,
  resolveArchitectureConfig,
  ARCH_RULE_PRESETS,
} from "./arch-lint.js";
export type {
  ArchitectureRule,
  ArchitectureViolation,
  ArchitecturePreset,
  MarkdyConfig,
  RuleSeverity,
  ArchRuleType,
  NodeSelector,
  EdgeSelector,
} from "./arch-lint.js";

export { classifyTechnology } from "./classifier.js";
export type { SemanticProfile } from "./classifier.js";

export { diffDiagramASTs } from "./diff.js";
export type {
  DiagramDiffResult,
  NodeDiff,
  EdgeDiff,
  GroupDiff,
  DiffChangeType,
} from "./diff.js";

export {
  compressMarkdyToUrlHash,
  decompressMarkdyFromUrlHash,
} from "./url-codec.js";

export {
  getBoxPortPosition,
  selectOptimalPorts,
  routeOrthogonalEdge,
  allocatePortLanes,
  buildSmoothSvgPath,
} from "./router.js";
export type {
  Point,
  Box,
  CardinalPort,
  PortLane,
  RouteOptions,
  RoutedPath,
} from "./router.js";

export {
  VECTOR_SYMBOLS,
  resolveVectorSymbol,
  renderSymbolSvg,
  listAvailableSymbols,
} from "./symbols.js";
export type { VectorSymbol } from "./symbols.js";

export {
  parseCodeAnchor,
  extractDiagramCodeAnchors,
  verifyCodeAnchorsWithReader,
} from "./provenance.js";
export type {
  CodeProvenanceAnchor,
  CodeProvenanceDiagnostic,
  CodeProvenanceVerificationReport,
} from "./provenance.js";

export { analyzeAndBuildRepairPrompt } from "./ai-healing.js";
export type { RepairPromptBundle } from "./ai-healing.js";

export {
  diagnoseMarkdyCode,
  repairMarkdyCode,
  damerauLevenshteinDistance,
  findClosestMatch,
} from "./syntax-diagnostics.js";
export type {
  DiagnosticIssue,
  SyntaxDiagnosticReport,
  AutoRepairResult,
} from "./syntax-diagnostics.js";

export { resolveOutputPreset, listOutputPresets, OUTPUT_PRESETS } from "./output-presets.js";
export type { OutputPreset } from "./output-presets.js";

export {
  getIntelliCodeCompletions,
  predictNextLineSuggestion,
  getArchitectureSuggestions,
  extractDiagramContext,
  POPULAR_TECHS,
} from "./intellicode.js";
export type {
  IntelliCodeItem,
  IntelliCodeItemKind,
  ExtractedNode,
  ExtractedGroup,
  ExtractedBeat,
  DiagramContext,
  GhostTextSuggestion,
  ArchitectureRecommendation,
  TechPreset,
} from "./intellicode.js";

export { formatScene } from "./format.js";
