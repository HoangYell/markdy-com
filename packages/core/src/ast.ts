/**
 * Diagram-native AST and RenderPlan types for MarkdyScript 0.8+.
 * Zero runtime dependencies.
 */

export type LayoutDirection = "LR" | "RL" | "TB" | "BT";

export type EdgeKind = "request" | "response" | "event" | "dependency";

export type SceneMeta = {
  title?: string;
  width: number;
  height: number;
  fps: number;
  theme: string;
  direction: LayoutDirection;
  duration?: number;
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
  /** Node card fill (falls back to surface derivations when omitted). */
  nodeSurface?: string;
  nodeSurfaceRaised?: string;
  /** Node hairline / inset ring color. */
  hairline?: string;
  /** Ambient drop-shadow color (rgba). */
  shadow?: string;
  /** Edge label pill fill. */
  labelPlate?: string;
  roles: Record<string, string>;
  edges: Record<EdgeKind, string>;
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
};

export type RoutedEdge = {
  id: string;
  kind: EdgeKind;
  from: string;
  to: string;
  label?: string;
};

export type TimedCue = {
  start: number;
  duration: number;
  kind: "show" | "hide" | "flow" | "glow" | "focus";
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
  nodes: PositionedNode[];
  edges: RoutedEdge[];
  cues: TimedCue[];
  beats: BeatRange[];
  groups: Record<string, string[]>;
  duration: number;
};
