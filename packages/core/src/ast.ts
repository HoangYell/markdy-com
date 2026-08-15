/**
 * Diagram-native AST and RenderPlan types for MarkdyScript 0.8+.
 * Zero runtime dependencies.
 */

export type LayoutDirection = "LR" | "RL" | "TB" | "BT";

export type EdgeKind = "request" | "response" | "event" | "dependency";

export type DiagramType = "architecture" | "flowchart" | "tree" | "state" | "sequence" | "constellation";

export type NodeShape = "card" | "rounded" | "diamond" | "circle" | "pill" | "terminal";

export type SceneMeta = {
  title?: string;
  width: number;
  height: number;
  fps: number;
  theme: string;
  direction: LayoutDirection;
  duration?: number;
  /** Opt-in diagram mode; defaults to architecture. */
  type?: DiagramType;
  /** Optional custom progress bar color or gradient. Defaults to rainbow. */
  progressColor?: string;
  /** Enable playback and view reset controls toolbar. */
  controls?: boolean;
  /** Enable wheel zoom and drag pan. */
  interactiveViewport?: boolean;
  /** Autoplay timeline on load. */
  autoplay?: boolean;
  /** Loop playback when reaching the end. */
  loop?: boolean;
  /** Show copyright badge. */
  copyright?: boolean;
  /** Default playback speed multiplier. */
  playbackRate?: number;
};

export type NodeDecl = {
  kind: string;
  id: string;
  label: string;
  style?: string;
  props: Record<string, unknown>;
  line: number;
};

export type EdgeDecl = {
  id: string;
  kind: EdgeKind;
  from: string;
  to: string;
  label?: string;
  props: Record<string, unknown>;
  line: number;
};

export type GroupDecl = {
  id: string;
  label?: string;
  members: string[];
  props: Record<string, unknown>;
  line: number;
};

export type AnnotationDecl = {
  id: string;
  text: string;
  target?: string;
  position?: string;
  props: Record<string, unknown>;
  line: number;
};

export type StyleDecl = {
  name: string;
  props: Record<string, unknown>;
  line: number;
};

export type FlowSegment = {
  from: string;
  op: EdgeKind;
  to: string;
  label?: string;
};

export type Cue =
  | { kind: "flow"; segments: FlowSegment[]; dur?: number; line: number }
  | { kind: "show"; targets: string[]; stagger?: number; dur?: number; line: number }
  | { kind: "hide"; targets: string[]; dur?: number; line: number }
  | { kind: "glow"; targets: string[]; color?: string; strength?: number; dur?: number; line: number }
  | { kind: "focus"; targets: string[]; zoom?: number; dur?: number; line: number }
  | { kind: "frame"; targets: string[]; zoom?: number; dur?: number; line: number }
  | { kind: "use"; pattern: string; args: Record<string, string>; line: number }
  | { kind: "parallel"; cues: Cue[]; line: number };

export type BeatDecl = {
  name: string;
  label?: string;
  cues: Cue[];
  dur?: number;
  line: number;
};

export type PatternDecl = {
  name: string;
  params: string[];
  body: Cue[];
  line: number;
};

export type Diagnostic = {
  severity: "error" | "warning";
  message: string;
  line: number;
  column?: number;
};

export type DiagramAST = {
  meta: SceneMeta;
  styles: Record<string, StyleDecl>;
  nodes: Record<string, NodeDecl>;
  edges: EdgeDecl[];
  groups: Record<string, GroupDecl>;
  annotations: AnnotationDecl[];
  patterns: Record<string, PatternDecl>;
  beats: BeatDecl[];
  diagnostics: Diagnostic[];
};

export type ThemeTokens = {
  name: string;
  canvas: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  text: string;
  textMuted: string;
  gridMinor: string;
  gridMajor: string;
  vignette: string;
  accent: string;
  /** HTTP / external link accent (editorial skin). */
  link?: string;
  /** Semantic editorial aliases for canvas/text/muted/border roles. */
  paper?: string;
  ink?: string;
  muted?: string;
  rule?: string;
  /** Tertiary caption color. */
  soft?: string;
  /** Focal node fill tint. */
  accentTint?: string;
  /** Node card fill (falls back to surface derivations when omitted). */
  nodeSurface?: string;
  nodeSurfaceRaised?: string;
  /** Node hairline / inset ring color. */
  hairline?: string;
  /** Ambient drop-shadow color (rgba). */
  shadow?: string;
  /** Edge label pill fill. */
  labelPlate?: string;
  /** Editorial: flat cards without drop shadows. */
  flatCards?: boolean;
  roles: Record<string, string>;
  edges: Record<EdgeKind, string>;
  fonts?: {
    title?: string;
    nodeName?: string;
    mono?: string;
  };
  radiusMd?: number;
  spacing?: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
};

export type PositionedNode = {
  id: string;
  kind: string;
  role: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style?: Record<string, unknown>;
  props?: Record<string, unknown>;
  opacity: number;
  shape?: NodeShape;
  focal?: boolean;
  /** Sequence mode column index. */
  column?: number;
};

export type RoutedEdge = {
  id: string;
  kind: EdgeKind;
  from: string;
  to: string;
  label?: string;
  /** Declared via top-level `edge` (not only flow cues). */
  structural?: boolean;
  selfLoop?: boolean;
};

export type GroupBoundary = {
  id: string;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  memberIds: string[];
  props?: Record<string, unknown>;
};

export type SequenceMessage = {
  id: string;
  from: string;
  to: string;
  kind: EdgeKind;
  label?: string;
  y: number;
  start: number;
  duration: number;
  beat: string;
};

export type SequenceActivation = {
  id: string;
  participant: string;
  y: number;
  height: number;
  start: number;
  duration: number;
};

export type TreeBus = {
  id: string;
  parentId: string;
  childIds: string[];
  parentX: number;
  parentY: number;
  branchY: number;
  childXs: number[];
  childY: number;
};

export type TimedCue = {
  start: number;
  duration: number;
  kind: "show" | "hide" | "flow" | "glow" | "focus" | "frame";
  targets: string[];
  edgeId?: string;
  segments?: FlowSegment[];
  params: Record<string, unknown>;
  beat: string;
};

export type BeatRange = {
  name: string;
  label?: string;
  start: number;
  end: number;
};

export type RenderPlan = {
  meta: SceneMeta;
  theme: ThemeTokens;
  title: string;
  diagramType: DiagramType;
  nodes: PositionedNode[];
  edges: RoutedEdge[];
  groupBoundaries: GroupBoundary[];
  annotations: AnnotationDecl[];
  cues: TimedCue[];
  beats: BeatRange[];
  groups: Record<string, string[]>;
  treeBuses: TreeBus[];
  sequenceMessages: SequenceMessage[];
  sequenceActivations: SequenceActivation[];
  duration: number;
};
