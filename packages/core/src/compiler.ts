import type {
  DiagramAST,
  DiagramType,
  FlowSegment,
  GroupBoundary,
  PositionedNode,
  RenderPlan,
  RoutedEdge,
  SequenceActivation,
  SequenceMessage,
  ThemeTokens,
  TimedCue,
  BeatRange,
  TreeBus,
} from "./ast.js";
import { nodeRole } from "./registry.js";

const SAFE = 44;
const TITLE_BAND = 76;
const NODE_W = 168;
const NODE_H = 72;
const GROUP_PAD = 24;

const DEFAULTS = {
  show: 0.35,
  hide: 0.35,
  flow: 0.55,
  glow: 0.45,
  focus: 0.6,
  frame: 0.7,
  beatGap: 0.14,
  cueGap: 0.08,
  stagger: 0.06,
};

function diagramType(ast: DiagramAST): DiagramType {
  return ast.meta.type ?? "architecture";
}

function nodeShape(kind: string, dtype: DiagramType): PositionedNode["shape"] {
  if (kind === "terminal") return "terminal";
  if (kind === "dot" || kind === "marker") return "circle";
  if (kind === "token_strip" || kind === "chips") return "pill";
  if (kind === "surface" || kind === "stat" || kind === "matrix" || kind === "track" || kind === "glyph_card") return "rounded";
  if (dtype === "constellation") return "rounded";
  if (dtype === "flowchart") {
    if (kind === "start" || kind === "end") return "pill";
    if (kind === "decision" || kind === "condition") return "diamond";
  }
  if (dtype === "state" && kind === "state") return "rounded";
  if (kind === "user" || kind === "client") return "rounded";
  return "card";
}

function collectStructuralEdges(ast: DiagramAST): RoutedEdge[] {
  const edges: RoutedEdge[] = ast.edges.map((e) => ({
    id: e.id,
    kind: e.kind,
    from: e.from,
    to: e.to,
    label: e.label,
    structural: true,
    selfLoop: e.from === e.to,
  }));

  let counter = edges.length;
  for (const beat of ast.beats) {
    for (const cue of beat.cues) {
      collectFlowSegments(cue, (seg) => {
        const id = `flow_${++counter}`;
        edges.push({
          id,
          kind: seg.op,
          from: seg.from,
          to: seg.to,
          label: seg.label,
          structural: false,
          selfLoop: seg.from === seg.to,
        });
      });
    }
  }
  return dedupeEdges(edges);
}

function collectFlowSegments(
  cue: DiagramAST["beats"][number]["cues"][number],
  emit: (seg: FlowSegment) => void,
): void {
  if (cue.kind === "parallel") {
    for (const child of cue.cues) collectFlowSegments(child, emit);
    return;
  }
  if (cue.kind === "flow") {
    for (const seg of cue.segments) emit(seg);
  }
}

function dedupeEdges(edges: RoutedEdge[]): RoutedEdge[] {
  const seen = new Set<string>();
  const out: RoutedEdge[] = [];
  for (const e of edges) {
    const k = `${e.from}|${e.kind}|${e.to}|${e.label ?? ""}|${e.structural ? "s" : "f"}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
}

function assignRanks(
  nodeIds: string[],
  edges: RoutedEdge[],
  direction: "LR" | "RL" | "TB" | "BT",
): Map<string, number> {
  const ranks = new Map<string, number>();
  for (const id of nodeIds) ranks.set(id, 0);

  const forward = edges.filter((e) => e.kind !== "response" && !e.selfLoop);
  for (let sweep = 0; sweep < nodeIds.length; sweep++) {
    let changed = false;
    for (const e of forward) {
      const next = (ranks.get(e.from) ?? 0) + 1;
      if (next > (ranks.get(e.to) ?? 0)) {
        ranks.set(e.to, next);
        changed = true;
      }
    }
    if (!changed) break;
  }

  if (direction === "RL" || direction === "BT") {
    const max = Math.max(...ranks.values(), 0);
    for (const [id, r] of ranks) ranks.set(id, max - r);
  }
  return ranks;
}

function snapGrid(n: number): number {
  return Math.round(n / 8) * 8;
}

function layoutRanked(
  ast: DiagramAST,
  edges: RoutedEdge[],
  opts: { forceVertical?: boolean; columnLayout?: boolean },
): PositionedNode[] {
  const nodeIds = Object.keys(ast.nodes);
  const dtype = diagramType(ast);
  const direction = opts.forceVertical ? "TB" : ast.meta.direction;
  const ranks = assignRanks(nodeIds, edges, direction);
  const byRank = new Map<number, string[]>();
  for (const id of nodeIds) {
    const r = ranks.get(id) ?? 0;
    if (!byRank.has(r)) byRank.set(r, []);
    byRank.get(r)!.push(id);
  }
  for (const ids of byRank.values()) ids.sort();

  const isVertical = direction === "TB" || direction === "BT";
  const contentW = ast.meta.width - SAFE * 2;
  const contentH = ast.meta.height - SAFE - TITLE_BAND - SAFE;
  const maxRank = Math.max(...byRank.keys(), 0);
  const rankCount = maxRank + 1;

  const nodes: PositionedNode[] = [];
  for (const [rank, ids] of [...byRank.entries()].sort((a, b) => a[0] - b[0])) {
    const rowCount = ids.length;
    const orderedIds = opts.columnLayout
      ? nodeIds.filter((id) => ids.includes(id))
      : [...ids].sort();
    orderedIds.forEach((id, idx) => {
      const decl = ast.nodes[id];
      const role = nodeRole(decl.kind);
      let x: number;
      let y: number;
      if (opts.columnLayout) {
        x = SAFE + (contentW / (rowCount + 1)) * (idx + 1) - NODE_W / 2;
        y = TITLE_BAND + 48;
      } else if (isVertical) {
        x = SAFE + (contentW / (rowCount + 1)) * (idx + 1) - NODE_W / 2;
        y = TITLE_BAND + (contentH / Math.max(rankCount, 1)) * rank + (contentH / Math.max(rankCount, 1) - NODE_H) / 2;
      } else {
        x = SAFE + (contentW / Math.max(rankCount, 1)) * rank + (contentW / Math.max(rankCount, 1) - NODE_W) / 2;
        y = TITLE_BAND + (contentH / (rowCount + 1)) * (idx + 1) - NODE_H / 2;
      }
      const focal = decl.props.focal === true || decl.props.accent === true;
      nodes.push({
        id,
        kind: decl.kind,
        role,
        label: decl.label,
        x: snapGrid(x),
        y: snapGrid(y),
        width: NODE_W,
        height: NODE_H,
        style: decl.style ? ast.styles[decl.style]?.props : undefined,
        props: decl.props,
        opacity: 0,
        shape: nodeShape(decl.kind, dtype),
        focal,
        column: opts.columnLayout ? idx : undefined,
      });
    });
  }
  return nodes;
}

function layoutTree(ast: DiagramAST, edges: RoutedEdge[]): PositionedNode[] {
  const nodeIds = Object.keys(ast.nodes);
  const children = new Map<string, string[]>();
  const parent = new Map<string, string>();
  for (const id of nodeIds) children.set(id, []);
  for (const e of edges) {
    if (e.kind === "response" || e.selfLoop) continue;
    if (!ast.nodes[e.from] || !ast.nodes[e.to]) continue;
    if (parent.has(e.to)) continue;
    parent.set(e.to, e.from);
    children.get(e.from)!.push(e.to);
  }
  const root = nodeIds.find((id) => !parent.has(id)) ?? nodeIds[0];
  const depth = new Map<string, number>();
  const queue = [root];
  depth.set(root, 0);
  while (queue.length) {
    const id = queue.shift()!;
    for (const child of children.get(id) ?? []) {
      if (depth.has(child)) continue;
      depth.set(child, (depth.get(id) ?? 0) + 1);
      queue.push(child);
    }
  }
  for (const id of nodeIds) if (!depth.has(id)) depth.set(id, 0);

  const byDepth = new Map<number, string[]>();
  for (const id of nodeIds) {
    const d = depth.get(id) ?? 0;
    if (!byDepth.has(d)) byDepth.set(d, []);
    byDepth.get(d)!.push(id);
  }
  for (const ids of byDepth.values()) ids.sort();

  const contentW = ast.meta.width - SAFE * 2;
  const contentH = ast.meta.height - SAFE - TITLE_BAND - SAFE;
  const maxDepth = Math.max(...byDepth.keys(), 0);
  const nodes: PositionedNode[] = [];

  for (const [d, ids] of [...byDepth.entries()].sort((a, b) => a[0] - b[0])) {
    ids.forEach((id, idx) => {
      const decl = ast.nodes[id];
      const x = SAFE + (contentW / (ids.length + 1)) * (idx + 1) - NODE_W / 2;
      const y = TITLE_BAND + (contentH / Math.max(maxDepth + 1, 1)) * d + 24;
      nodes.push({
        id,
        kind: decl.kind,
        role: nodeRole(decl.kind),
        label: decl.label,
        x: snapGrid(x),
        y: snapGrid(y),
        width: NODE_W,
        height: NODE_H,
        style: decl.style ? ast.styles[decl.style]?.props : undefined,
        props: decl.props,
        opacity: 0,
        shape: "card",
      });
    });
  }
  return nodes;
}

function cycleSafeEdges(nodeIds: string[], edges: RoutedEdge[]): RoutedEdge[] {
  const outgoing = new Map<string, RoutedEdge[]>();
  const incoming = new Set<string>();
  for (const id of nodeIds) outgoing.set(id, []);
  for (const edge of edges) {
    if (edge.kind === "response" || edge.selfLoop) continue;
    if (!outgoing.has(edge.from) || !outgoing.has(edge.to)) continue;
    outgoing.get(edge.from)!.push(edge);
    incoming.add(edge.to);
  }

  const visited = new Set<string>();
  const safe: RoutedEdge[] = [];
  const visit = (id: string) => {
    if (visited.has(id)) return;
    visited.add(id);
    for (const edge of outgoing.get(id) ?? []) {
      if (visited.has(edge.to)) continue;
      safe.push(edge);
      visit(edge.to);
    }
  };

  for (const id of nodeIds) {
    if (!incoming.has(id)) visit(id);
  }
  for (const id of nodeIds) visit(id);
  return safe;
}

function layoutConstellation(ast: DiagramAST): PositionedNode[] {
  const nodeIds = Object.keys(ast.nodes);
  if (nodeIds.length === 0) return [];

  const incoming = new Set<string>();
  for (const edge of ast.edges) {
    if (edge.kind !== "response" && edge.from !== edge.to && ast.nodes[edge.to]) incoming.add(edge.to);
  }
  const focalId =
    nodeIds.find((id) => ast.nodes[id].props.focal === true || ast.nodes[id].props.accent === true) ??
    nodeIds.find((id) => !incoming.has(id)) ??
    nodeIds[0];
  const contentW = ast.meta.width - SAFE * 2;
  const contentH = ast.meta.height - SAFE - TITLE_BAND - SAFE;
  const centerX = SAFE + contentW / 2 - NODE_W / 2;
  const centerY = TITLE_BAND + contentH / 2 - NODE_H / 2;
  const orbitIds = nodeIds.filter((id) => id !== focalId);
  const radiusX = Math.max(140, contentW / 2 - NODE_W / 2 - SAFE);
  const radiusY = Math.max(120, contentH / 2 - NODE_H / 2 - SAFE);
  const nodes: PositionedNode[] = [];

  for (const id of nodeIds) {
    const decl = ast.nodes[id];
    const isFocal = id === focalId;
    const index = orbitIds.indexOf(id);
    const angle = orbitIds.length > 0 ? -Math.PI / 2 + (index * Math.PI * 2) / orbitIds.length : 0;
    const x = isFocal ? centerX : SAFE + contentW / 2 + Math.cos(angle) * radiusX - NODE_W / 2;
    const y = isFocal ? centerY : TITLE_BAND + contentH / 2 + Math.sin(angle) * radiusY - NODE_H / 2;
    nodes.push({
      id,
      kind: decl.kind,
      role: nodeRole(decl.kind),
      label: decl.label,
      x: snapGrid(x),
      y: snapGrid(y),
      width: NODE_W,
      height: NODE_H,
      style: decl.style ? ast.styles[decl.style]?.props : undefined,
      props: decl.props,
      opacity: 0,
      shape: nodeShape(decl.kind, "constellation"),
      focal: isFocal || decl.props.focal === true || decl.props.accent === true,
    });
  }
  return nodes;
}

function layoutNodes(ast: DiagramAST, edges: RoutedEdge[]): PositionedNode[] {
  const dtype = diagramType(ast);
  switch (dtype) {
    case "flowchart":
      return layoutRanked(ast, edges, { forceVertical: true });
    case "tree":
      return layoutTree(ast, edges.some((edge) => edge.structural) ? edges.filter((edge) => edge.structural) : edges);
    case "sequence":
      return layoutRanked(ast, [], { columnLayout: true });
    case "constellation":
      return layoutConstellation(ast);
    case "state":
      return layoutRanked(ast, cycleSafeEdges(Object.keys(ast.nodes), edges), { forceVertical: false });
    default:
      return layoutRanked(ast, edges, { forceVertical: false });
  }
}

function computeGroupBoundaries(ast: DiagramAST, nodes: PositionedNode[]): GroupBoundary[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const boundaries: GroupBoundary[] = [];
  for (const group of Object.values(ast.groups)) {
    const members = group.members.filter((id) => byId.has(id));
    if (members.length === 0) continue;
    const rects = members.map((id) => byId.get(id)!);
    const minX = Math.min(...rects.map((n) => n.x)) - GROUP_PAD;
    const minY = Math.min(...rects.map((n) => n.y)) - GROUP_PAD - 12;
    const maxX = Math.max(...rects.map((n) => n.x + n.width)) + GROUP_PAD;
    const maxY = Math.max(...rects.map((n) => n.y + n.height)) + GROUP_PAD;
    boundaries.push({
      id: group.id,
      label: group.label,
      x: snapGrid(minX),
      y: snapGrid(minY),
      width: snapGrid(maxX - minX),
      height: snapGrid(maxY - minY),
      memberIds: members,
      props: group.props,
    });
  }
  return boundaries;
}

function computeTreeBuses(ast: DiagramAST, nodes: PositionedNode[], edges: RoutedEdge[]): TreeBus[] {
  if (diagramType(ast) !== "tree") return [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const children = new Map<string, string[]>();
  const parent = new Set<string>();
  for (const edge of edges) {
    if (edge.kind === "response" || edge.selfLoop) continue;
    if (!byId.has(edge.from) || !byId.has(edge.to) || parent.has(edge.to)) continue;
    if (!children.has(edge.from)) children.set(edge.from, []);
    children.get(edge.from)!.push(edge.to);
    parent.add(edge.to);
  }

  const buses: TreeBus[] = [];
  for (const [parentId, childIds] of children) {
    const parentNode = byId.get(parentId);
    const childNodes = childIds.map((id) => byId.get(id)).filter(Boolean) as PositionedNode[];
    if (!parentNode || childNodes.length === 0) continue;
    const parentX = parentNode.x + parentNode.width / 2;
    const parentY = parentNode.y + parentNode.height;
    const childY = Math.min(...childNodes.map((node) => node.y));
    buses.push({
      id: `tree_bus_${parentId}`,
      parentId,
      childIds,
      parentX: snapGrid(parentX),
      parentY: snapGrid(parentY),
      branchY: snapGrid((parentY + childY) / 2),
      childXs: childNodes.map((node) => snapGrid(node.x + node.width / 2)),
      childY: snapGrid(childY),
    });
  }
  return buses;
}

function resolveTargets(
  targets: string[],
  ast: DiagramAST,
  groups: Record<string, string[]>,
  edgeIds: string[],
): string[] {
  const out: string[] = [];
  for (const t of targets) {
    if (t === "$nodes") {
      out.push(...Object.keys(ast.nodes));
    } else if (t === "$edges") {
      out.push(...edgeIds);
    } else if (t.startsWith("$")) {
      const g = t.slice(1);
      if (groups[g]) out.push(...groups[g]);
    } else if (groups[t]) {
      out.push(...groups[t]);
    } else {
      out.push(t);
    }
  }
  return [...new Set(out)];
}

function scheduleBeats(ast: DiagramAST, edges: RoutedEdge[]): { cues: TimedCue[]; beats: BeatRange[] } {
  const cues: TimedCue[] = [];
  const beatRanges: BeatRange[] = [];
  let t = 0;
  let edgeCounter = edges.length;
  const edgeIds = edges.map((e) => e.id);
  const groupMap = Object.fromEntries(Object.entries(ast.groups).map(([k, g]) => [k, g.members]));

  const hasIntro = ast.beats.some((b) => b.cues.some((c) => c.kind === "show"));
  if (!hasIntro && Object.keys(ast.nodes).length > 0) {
    cues.push({
      start: 0,
      duration: DEFAULTS.show,
      kind: "show",
      targets: Object.keys(ast.nodes),
      params: { stagger: DEFAULTS.stagger },
      beat: "__intro",
    });
    t += DEFAULTS.show + DEFAULTS.cueGap;
  }

  for (const beat of ast.beats) {
    const beatStart = t;
    const scheduled: TimedCue[] = [];

    const processCue = (cue: DiagramAST["beats"][number]["cues"][number], parallel = false) => {
      if (cue.kind === "parallel") {
        const start = t;
        let maxDur = 0;
        for (const child of cue.cues) {
          const before = t;
          processCue(child, true);
          maxDur = Math.max(maxDur, t - before);
          if (!parallel) t = before;
        }
        if (!parallel) t = start + maxDur;
        return;
      }

      if (cue.kind === "use") return;

      const dur =
        "dur" in cue && cue.dur !== undefined
          ? cue.dur
          : DEFAULTS[cue.kind as keyof typeof DEFAULTS] ?? 0.5;

      if (cue.kind === "flow") {
        for (const seg of cue.segments) {
          const existing = edges.find(
            (e) =>
              !e.structural &&
              e.from === seg.from &&
              e.to === seg.to &&
              e.kind === seg.op &&
              e.label === seg.label,
          );
          const edgeId = existing?.id ?? `flow_${++edgeCounter}`;
          scheduled.push({
            start: t,
            duration: dur / cue.segments.length,
            kind: "flow",
            targets: [seg.from, seg.to],
            edgeId,
            segments: [seg],
            params: {},
            beat: beat.name,
          });
          t += dur / cue.segments.length + DEFAULTS.cueGap / cue.segments.length;
        }
        return;
      }

      if (cue.kind !== "show" && cue.kind !== "hide" && cue.kind !== "glow" && cue.kind !== "focus" && cue.kind !== "frame") return;

      const targets = resolveTargets(cue.targets, ast, groupMap, edgeIds);

      scheduled.push({
        start: t,
        duration: dur,
        kind: cue.kind,
        targets,
        params: {
          stagger: cue.kind === "show" ? (cue.stagger ?? DEFAULTS.stagger) : undefined,
          color: cue.kind === "glow" ? cue.color : undefined,
          strength: cue.kind === "glow" ? cue.strength : undefined,
          zoom: cue.kind === "focus" || cue.kind === "frame" ? cue.zoom : undefined,
        },
        beat: beat.name,
      });
      t += dur + DEFAULTS.cueGap;
    };

    for (const cue of beat.cues) processCue(cue);
    cues.push(...scheduled);
    beatRanges.push({
      name: beat.name,
      label: beat.label,
      start: beatStart,
      end: Math.max(t, beatStart + (beat.dur ?? 0)),
    });
    t += DEFAULTS.beatGap;
  }

  return { cues, beats: beatRanges };
}

function buildSequencePlan(
  ast: DiagramAST,
  cues: TimedCue[],
): { messages: SequenceMessage[]; activations: SequenceActivation[] } {
  if (diagramType(ast) !== "sequence") return { messages: [], activations: [] };

  const flowCues = cues.filter((cue) => cue.kind === "flow" && cue.segments?.[0]);
  const firstY = TITLE_BAND + NODE_H + 64;
  const lastY = ast.meta.height - SAFE - 40;
  const step = flowCues.length > 1
    ? Math.max(36, Math.min(64, (lastY - firstY) / (flowCues.length - 1)))
    : 0;
  const messages: SequenceMessage[] = [];
  const activations: SequenceActivation[] = [];

  flowCues.forEach((cue, index) => {
    const segment = cue.segments![0];
    if (!ast.nodes[segment.from] || !ast.nodes[segment.to]) return;
    const message: SequenceMessage = {
      id: `sequence_${index + 1}`,
      from: segment.from,
      to: segment.to,
      kind: segment.op,
      label: segment.label,
      y: snapGrid(firstY + step * index),
      start: cue.start,
      duration: cue.duration,
      beat: cue.beat,
    };
    messages.push(message);

    for (const participant of new Set([message.from, message.to])) {
      activations.push({
        id: `${message.id}_${participant}`,
        participant,
        y: message.y - 18,
        height: 36,
        start: message.start,
        duration: message.duration,
      });
    }
  });

  return { messages, activations };
}

export function compilePlan(ast: DiagramAST, theme: ThemeTokens): RenderPlan {
  const structuralEdges = collectStructuralEdges(ast);
  const nodes = layoutNodes(ast, structuralEdges);
  const groupBoundaries = computeGroupBoundaries(ast, nodes);
  const treeBuses = computeTreeBuses(ast, nodes, structuralEdges.filter((edge) => edge.structural));
  const { cues, beats } = scheduleBeats(ast, structuralEdges);
  const sequence = buildSequencePlan(ast, cues);

  const shown = new Set<string>();
  for (const cue of cues) {
    if (cue.kind === "show") cue.targets.forEach((id) => shown.add(id));
  }
  if (shown.size === 0) nodes.forEach((n) => { n.opacity = 1; });
  else nodes.forEach((n) => { n.opacity = shown.has(n.id) ? 1 : 0; });

  const duration = ast.meta.duration ?? Math.max(
    ...cues.map((c) => c.start + c.duration),
    ...beats.map((b) => b.end),
    1,
  );

  const title = ast.meta.title ?? "Architecture Diagram";

  return {
    meta: ast.meta,
    theme,
    title,
    diagramType: diagramType(ast),
    nodes,
    edges: structuralEdges,
    groupBoundaries,
    annotations: ast.annotations.slice(0, 2),
    cues,
    beats,
    groups: Object.fromEntries(Object.entries(ast.groups).map(([k, g]) => [k, g.members])),
    treeBuses,
    sequenceMessages: sequence.messages,
    sequenceActivations: sequence.activations,
    duration,
  };
}
