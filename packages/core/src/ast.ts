/**
 * Diagram-native AST and RenderPlan types for MarkdyScript 0.8+.
 * Zero runtime dependencies.
 */

export type LayoutDirection = "LR" | "RL" | "TB" | "BT";

export type EdgeKind = "request" | "response" | "event" | "dependency";

export type DiagramType =
  | "architecture"
  | "flowchart"
  | "tree"
  | "state"
  | "sequence"
  | "constellation"
  | "loop"
  | "flywheel"
  | "medallion"
  | "quadrant"
  | "swimlane"
  | "pyramid"
  | "radar"
  | "timeline"
  | "gantt"
  | "venn"
  | "layers"
  | "nested";

export type NodeShape = "card" | "rounded" | "diamond" | "circle" | "pill" | "terminal" | "container";

export type PlayerProgress = "none" | "bar" | "boundary";

/** When and how fast the timeline runs. */
export type PlayerPlaybackConfig = {
  autoplay?: boolean;
  loop?: boolean;
  rate?: number;
};

/** Which toolbar affordances are mounted. Declaring the group opts in. */
export type PlayerControlsConfig = {
  play?: boolean;
  restart?: boolean;
  prevBeat?: boolean;
  nextBeat?: boolean;
  seek?: boolean;
  speed?: boolean;
  fit?: boolean;
  resetView?: boolean;
  fullscreen?: boolean;
  svg?: boolean;
  gif?: boolean;
  share?: boolean;
  /** Show the MarkdyScript source code when clicked. */
  code?: boolean;
  /** Theme switcher toggle (dark / light palettes). */
  theme?: boolean;
  /** Speed multipliers offered by the speed buttons. */
  speeds?: number[];
};

/** What pointer and key input do. Declaring the group opts in. */
export type PlayerInteractionConfig = {
  zoom?: boolean;
  pan?: boolean;
  clickToPlay?: boolean;
  doubleClickToReset?: boolean;
  /** Window-level shortcuts; opt-in because they capture space and arrows. */
  keyboard?: boolean;
};

/** Non-interactive decoration drawn around the scene. */
export type PlayerChromeConfig = {
  badge?: boolean;
  progress?: PlayerProgress;
  progressColor?: string;
};

export type PlayerConfig = {
  playback?: PlayerPlaybackConfig;
  controls?: PlayerControlsConfig;
  interaction?: PlayerInteractionConfig;
  chrome?: PlayerChromeConfig;
};

/** Fully defaulted player behavior produced by `resolvePlayer`. `enabled` is
 * derived: a group is on when at least one of its affordances is on. */
export type ResolvedPlayer = {
  playback: Required<PlayerPlaybackConfig>;
  controls: Required<PlayerControlsConfig> & { enabled: boolean };
  interaction: Required<PlayerInteractionConfig> & { enabled: boolean };
  chrome: { badge: boolean; progress: PlayerProgress; progressColor?: string };
};

export type SceneMeta = {
  title?: string;
  width: number;
  height: number;
  fps: number;
  theme: string;
  direction: LayoutDirection;
  duration?: number;
  /** Whether width was explicitly specified by the author in the script. */
  explicitWidth?: boolean;
  /** Whether height was explicitly specified by the author in the script. */
  explicitHeight?: boolean;
  /** Whether theme was explicitly specified by the author in the script. */
  explicitTheme?: boolean;
  /** Opt-in diagram mode; defaults to architecture. */
  type?: DiagramType;
  /** Playback, controls, interaction, and chrome behavior. Source of truth. */
  player?: PlayerConfig;
  /** @deprecated Mirror of `player.chrome.progressColor`. */
  progressColor?: string;
  /** @deprecated Mirror of `player.controls.enabled`. */
  controls?: boolean;
  /** @deprecated Mirror of `player.interaction.enabled`. */
  interactiveViewport?: boolean;
  /** @deprecated Mirror of `player.playback.autoplay`. */
  autoplay?: boolean;
  /** @deprecated Mirror of `player.playback.loop`. */
  loop?: boolean;
  /** @deprecated Mirror of `player.chrome.badge`. */
  copyright?: boolean;
  /** @deprecated Mirror of `player.playback.rate`. */
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
  /** Callout color intent: neutral (default), accent, or muted. */
  intent?: string;
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
  /** Multi-series palette for chart types (radar, line, bar). */
  series?: string[];
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
