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
const VENN_NODE_SIZE = 136;
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

function layoutLoop(ast: DiagramAST): PositionedNode[] {
  const nodeIds = Object.keys(ast.nodes);
  if (nodeIds.length === 0) return [];

  const hubId =
    nodeIds.find((id) => {
      const decl = ast.nodes[id];
      return (
        decl.kind === "hub" ||
        decl.props.hub === true ||
        /^(hub|state|memory|shared_memory|core)$/i.test(id)
      );
    }) ?? nodeIds[0];

  const stationIds = nodeIds.filter((id) => id !== hubId);
  const contentW = ast.meta.width - SAFE * 2;
  const contentH = ast.meta.height - SAFE - TITLE_BAND - SAFE;
  const centerX = SAFE + contentW / 2;
  const centerY = TITLE_BAND + contentH / 2;
  const radiusX = Math.max(140, contentW / 2 - NODE_W / 2 - SAFE);
  const radiusY = Math.max(120, contentH / 2 - NODE_H / 2 - SAFE);

  const nodes: PositionedNode[] = [];

  for (const id of nodeIds) {
    const decl = ast.nodes[id];
    const isHub = id === hubId;
    let x: number;
    let y: number;

    if (isHub) {
      x = centerX - (NODE_W * 1.2) / 2;
      y = centerY - (NODE_H * 1.1) / 2;
    } else {
      const idx = stationIds.indexOf(id);
      const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / Math.max(stationIds.length, 1);
      x = centerX + Math.cos(angle) * radiusX - NODE_W / 2;
      y = centerY + Math.sin(angle) * radiusY - NODE_H / 2;
    }

    const focal = isHub || decl.props.focal === true || decl.props.accent === true;
    nodes.push({
      id,
      kind: decl.kind,
      role: nodeRole(decl.kind),
      label: decl.label,
      x: snapGrid(x),
      y: snapGrid(y),
      width: isHub ? snapGrid(NODE_W * 1.2) : NODE_W,
      height: isHub ? snapGrid(NODE_H * 1.1) : NODE_H,
      style: decl.style ? ast.styles[decl.style]?.props : undefined,
      props: decl.props,
      opacity: 0,
      shape: isHub ? "pill" : "card",
      focal,
    });
  }

  return nodes;
}

function layoutMedallion(ast: DiagramAST, edges: RoutedEdge[]): PositionedNode[] {
  const nodeIds = Object.keys(ast.nodes);
  if (nodeIds.length === 0) return [];

  function getMedallionTier(id: string, kind: string): number {
    const combined = `${id} ${kind}`.toLowerCase();
    if (kind === "bronze" || combined.includes("bronze") || combined.includes("raw") || combined.includes("landing")) return 1;
    if (kind === "silver" || combined.includes("silver") || combined.includes("clean") || combined.includes("curated") || combined.includes("conformed")) return 2;
    if (kind === "gold" || combined.includes("gold") || combined.includes("agg") || combined.includes("mart") || combined.includes("analytics")) return 3;
    if (combined.includes("bi") || combined.includes("dash") || combined.includes("model") || combined.includes("app") || combined.includes("consumer") || combined.includes("user") || combined.includes("client")) return 4;
    return 0;
  }

  const tiers = new Map<number, string[]>();
  for (let i = 0; i <= 4; i++) tiers.set(i, []);

  for (const id of nodeIds) {
    const decl = ast.nodes[id];
    const tier = getMedallionTier(id, decl.kind);
    tiers.get(tier)!.push(id);
  }

  const activeTiers = [...tiers.entries()].filter(([_, ids]) => ids.length > 0);
  const tierCount = activeTiers.length || 1;

  const contentW = ast.meta.width - SAFE * 2;
  const contentH = ast.meta.height - SAFE - TITLE_BAND - SAFE;
  const nodes: PositionedNode[] = [];

  activeTiers.forEach(([_, ids], colIdx) => {
    const colCount = ids.length;
    const colX = SAFE + (contentW / (tierCount + 1)) * (colIdx + 1) - NODE_W / 2;

    ids.forEach((id, rowIdx) => {
      const decl = ast.nodes[id];
      const rowY = TITLE_BAND + (contentH / (colCount + 1)) * (rowIdx + 1) - NODE_H / 2;
      const focal = decl.props.focal === true || decl.props.accent === true;
      nodes.push({
        id,
        kind: decl.kind,
        role: nodeRole(decl.kind),
        label: decl.label,
        x: snapGrid(colX),
        y: snapGrid(rowY),
        width: NODE_W,
        height: NODE_H,
        style: decl.style ? ast.styles[decl.style]?.props : undefined,
        props: decl.props,
        opacity: 0,
        shape: "card",
        focal,
      });
    });
  });

  return nodes;
}

function layoutQuadrant(ast: DiagramAST): PositionedNode[] {
  const nodeIds = Object.keys(ast.nodes);
  if (nodeIds.length === 0) return [];

  const contentW = ast.meta.width - SAFE * 2;
  const contentH = ast.meta.height - SAFE - TITLE_BAND - SAFE;
  const centerX = SAFE + contentW / 2;
  const centerY = TITLE_BAND + contentH / 2;

  const quadNodes = new Map<number, string[]>([
    [1, []],
    [2, []],
    [3, []],
    [4, []],
  ]);

  nodeIds.forEach((id, idx) => {
    const decl = ast.nodes[id];
    let q = 1;
    if (decl.props.quadrant) {
      const qVal = String(decl.props.quadrant).toUpperCase();
      if (qVal === "Q1" || qVal === "1" || qVal === "TOP_RIGHT") q = 1;
      else if (qVal === "Q2" || qVal === "2" || qVal === "TOP_LEFT") q = 2;
      else if (qVal === "Q3" || qVal === "3" || qVal === "BOTTOM_LEFT") q = 3;
      else if (qVal === "Q4" || qVal === "4" || qVal === "BOTTOM_RIGHT") q = 4;
    } else {
      q = (idx % 4) + 1;
    }
    quadNodes.get(q)!.push(id);
  });

  const nodes: PositionedNode[] = [];
  const quadCenters = {
    1: { x: centerX + contentW / 4, y: centerY - contentH / 4 },
    2: { x: centerX - contentW / 4, y: centerY - contentH / 4 },
    3: { x: centerX - contentW / 4, y: centerY + contentH / 4 },
    4: { x: centerX + contentW / 4, y: centerY + contentH / 4 },
  };

  for (const [qNum, ids] of quadNodes) {
    const center = quadCenters[qNum as 1 | 2 | 3 | 4];
    ids.forEach((id, idx) => {
      const decl = ast.nodes[id];
      const offsetCount = ids.length;
      const rowOffset = (idx - (offsetCount - 1) / 2) * (NODE_H + 16);
      const x = center.x - NODE_W / 2;
      const y = center.y + rowOffset - NODE_H / 2;
      const focal = decl.props.focal === true || decl.props.accent === true;
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
        focal,
      });
    });
  }

  return nodes;
}

function layoutSwimlane(ast: DiagramAST, edges: RoutedEdge[]): PositionedNode[] {
  const nodeIds = Object.keys(ast.nodes);
  if (nodeIds.length === 0) return [];

  const lanes = new Map<string, string[]>();
  const groupKeys = Object.keys(ast.groups);

  if (groupKeys.length > 0) {
    for (const gId of groupKeys) {
      const members = ast.groups[gId].members.filter((id) => ast.nodes[id]);
      if (members.length > 0) lanes.set(gId, members);
    }
  } else {
    for (const id of nodeIds) {
      const decl = ast.nodes[id];
      const role = nodeRole(decl.kind);
      if (!lanes.has(role)) lanes.set(role, []);
      lanes.get(role)!.push(id);
    }
  }

  const activeLanes = [...lanes.entries()].filter(([_, ids]) => ids.length > 0);
  const laneCount = activeLanes.length || 1;

  const contentW = ast.meta.width - SAFE * 2;
  const contentH = ast.meta.height - SAFE - TITLE_BAND - SAFE;
  const laneHeight = contentH / laneCount;
  const nodes: PositionedNode[] = [];

  activeLanes.forEach(([_, ids], laneIdx) => {
    const laneY = TITLE_BAND + laneIdx * laneHeight + (laneHeight - NODE_H) / 2;
    const count = ids.length;

    ids.forEach((id, colIdx) => {
      const decl = ast.nodes[id];
      const colX = SAFE + (contentW / (count + 1)) * (colIdx + 1) - NODE_W / 2;
      const focal = decl.props.focal === true || decl.props.accent === true;
      nodes.push({
        id,
        kind: decl.kind,
        role: nodeRole(decl.kind),
        label: decl.label,
        x: snapGrid(colX),
        y: snapGrid(laneY),
        width: NODE_W,
        height: NODE_H,
        style: decl.style ? ast.styles[decl.style]?.props : undefined,
        props: decl.props,
        opacity: 0,
        shape: "card",
        focal,
      });
    });
  });

  return nodes;
}

function layoutPyramid(ast: DiagramAST): PositionedNode[] {
  const nodeIds = Object.keys(ast.nodes);
  if (nodeIds.length === 0) return [];

  const ranks = new Map<number, string[]>();
  nodeIds.forEach((id, idx) => {
    const decl = ast.nodes[id];
    const tier = typeof decl.props.tier === "number" ? decl.props.tier : typeof decl.props.level === "number" ? decl.props.level : idx;
    if (!ranks.has(tier)) ranks.set(tier, []);
    ranks.get(tier)!.push(id);
  });

  const sortedTiers = [...ranks.entries()].sort((a, b) => a[0] - b[0]);
  const tierCount = sortedTiers.length || 1;

  const contentW = ast.meta.width - SAFE * 2;
  const contentH = ast.meta.height - SAFE - TITLE_BAND - SAFE;
  const nodes: PositionedNode[] = [];

  sortedTiers.forEach(([_, ids], tierIdx) => {
    const tierY = TITLE_BAND + (contentH / (tierCount + 1)) * (tierIdx + 1) - NODE_H / 2;
    const spreadFraction = 0.4 + (0.6 * tierIdx) / Math.max(tierCount - 1, 1);
    const tierWidth = contentW * spreadFraction;
    const tierStartX = SAFE + (contentW - tierWidth) / 2;
    const count = ids.length;

    ids.forEach((id, idx) => {
      const decl = ast.nodes[id];
      const x = tierStartX + (tierWidth / (count + 1)) * (idx + 1) - NODE_W / 2;
      const focal = decl.props.focal === true || decl.props.accent === true;
      nodes.push({
        id,
        kind: decl.kind,
        role: nodeRole(decl.kind),
        label: decl.label,
        x: snapGrid(x),
        y: snapGrid(tierY),
        width: NODE_W,
        height: NODE_H,
        style: decl.style ? ast.styles[decl.style]?.props : undefined,
        props: decl.props,
        opacity: 0,
        shape: "card",
        focal,
      });
    });
  });

  return nodes;
}

function layoutTimeline(ast: DiagramAST): PositionedNode[] {
  const nodeIds = Object.keys(ast.nodes);
  if (nodeIds.length === 0) return [];

  const contentW = ast.meta.width - SAFE * 2;
  const contentH = ast.meta.height - SAFE - TITLE_BAND - SAFE;
  const baselineY = TITLE_BAND + contentH / 2;
  const spacing = contentW / Math.max(nodeIds.length, 1);
  const nodes: PositionedNode[] = [];

  nodeIds.forEach((id, idx) => {
    const decl = ast.nodes[id];
    const x = SAFE + spacing * idx + (spacing - NODE_W) / 2;
    const above = idx % 2 === 0;
    const y = above ? baselineY - NODE_H - 24 : baselineY + 24;
    const focal = decl.props.focal === true || decl.props.accent === true;
    nodes.push({
      id, kind: decl.kind, role: nodeRole(decl.kind), label: decl.label,
      x: snapGrid(x), y: snapGrid(y), width: NODE_W, height: NODE_H,
      style: decl.style ? ast.styles[decl.style]?.props : undefined,
      props: decl.props, opacity: 0, shape: "pill", focal,
    });
  });
  return nodes;
}

function layoutGantt(ast: DiagramAST): PositionedNode[] {
  const nodeIds = Object.keys(ast.nodes);
  if (nodeIds.length === 0) return [];

  const contentW = ast.meta.width - SAFE * 2;
  const rowH = 56;
  const barH = 40;
  const nodes: PositionedNode[] = [];

  nodeIds.forEach((id, idx) => {
    const decl = ast.nodes[id];
    const phase = typeof decl.props.phase === "number" ? decl.props.phase : 0;
    const span = typeof decl.props.span === "number" ? decl.props.span : 1;
    const totalPhases = Math.max(...nodeIds.map(nid => {
      const p = ast.nodes[nid].props.phase;
      const s = ast.nodes[nid].props.span;
      return (typeof p === "number" ? p : 0) + (typeof s === "number" ? s : 1);
    }), 1);
    const unitW = contentW / totalPhases;
    const x = SAFE + phase * unitW;
    const w = Math.max(span * unitW - 8, NODE_W);
    const y = TITLE_BAND + idx * rowH + (rowH - barH) / 2;
    const focal = decl.props.focal === true || decl.props.accent === true;
    nodes.push({
      id, kind: decl.kind, role: nodeRole(decl.kind), label: decl.label,
      x: snapGrid(x), y: snapGrid(y), width: snapGrid(w), height: barH,
      style: decl.style ? ast.styles[decl.style]?.props : undefined,
      props: decl.props, opacity: 0, shape: "pill", focal,
    });
  });
  return nodes;
}

function layoutVenn(ast: DiagramAST): PositionedNode[] {
  const nodeIds = Object.keys(ast.nodes);
  if (nodeIds.length === 0) return [];

  const contentW = ast.meta.width - SAFE * 2;
  const contentH = ast.meta.height - SAFE - TITLE_BAND - SAFE;
  const centerX = SAFE + contentW / 2;
  const centerY = TITLE_BAND + contentH / 2;
  const N = nodeIds.length;
  const radius = Math.min(contentW, contentH) * 0.22;
  const nodes: PositionedNode[] = [];

  nodeIds.forEach((id, idx) => {
    const decl = ast.nodes[id];
    let x: number, y: number;
    if (N === 2) {
      x = centerX + (idx === 0 ? -radius * 0.55 : radius * 0.55) - VENN_NODE_SIZE / 2;
      y = centerY - VENN_NODE_SIZE / 2;
    } else {
      const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / N;
      x = centerX + radius * 0.6 * Math.cos(angle) - VENN_NODE_SIZE / 2;
      y = centerY + radius * 0.6 * Math.sin(angle) - VENN_NODE_SIZE / 2;
    }
    const focal = decl.props.focal === true || decl.props.accent === true;
    nodes.push({
      id, kind: decl.kind, role: nodeRole(decl.kind), label: decl.label,
      x: snapGrid(x), y: snapGrid(y), width: VENN_NODE_SIZE, height: VENN_NODE_SIZE,
      style: decl.style ? ast.styles[decl.style]?.props : undefined,
      props: decl.props, opacity: 0, shape: "circle", focal,
    });
  });
  return nodes;
}

function layoutLayers(ast: DiagramAST): PositionedNode[] {
  const nodeIds = Object.keys(ast.nodes);
  if (nodeIds.length === 0) return [];

  const contentW = ast.meta.width - SAFE * 2;
  const contentH = ast.meta.height - SAFE - TITLE_BAND - SAFE;
  const N = nodeIds.length;
  const layerH = Math.min(Math.max((contentH - (N - 1) * 12) / N, 52), 76);
  const totalH = N * layerH + (N - 1) * 12;
  const startY = TITLE_BAND + (contentH - totalH) / 2;
  const nodes: PositionedNode[] = [];

  nodeIds.forEach((id, idx) => {
    const decl = ast.nodes[id];
    const y = startY + idx * (layerH + 12);
    const focal = decl.props.focal === true || decl.props.accent === true;
    nodes.push({
      id,
      kind: decl.kind,
      role: nodeRole(decl.kind),
      label: decl.label,
      x: snapGrid(SAFE),
      y: snapGrid(y),
      width: snapGrid(contentW),
      height: snapGrid(layerH),
      style: decl.style ? ast.styles[decl.style]?.props : undefined,
      props: decl.props,
      opacity: 0,
      shape: "rounded",
      focal,
    });
  });
  return nodes;
}

function layoutNested(ast: DiagramAST): PositionedNode[] {
  const nodeIds = Object.keys(ast.nodes);
  if (nodeIds.length === 0) return [];

  const contentW = ast.meta.width - SAFE * 2;
  const contentH = ast.meta.height - SAFE - TITLE_BAND - SAFE;
  const N = nodeIds.length;
  const padX = Math.min(36, (contentW * 0.4) / N);
  const padY = Math.min(32, (contentH * 0.4) / N);
  const nodes: PositionedNode[] = [];

  nodeIds.forEach((id, idx) => {
    const decl = ast.nodes[id];
    const x = SAFE + idx * padX;
    const y = TITLE_BAND + idx * padY;
    const w = contentW - idx * padX * 2;
    const h = contentH - idx * padY * 2;
    const focal = decl.props.focal === true || decl.props.accent === true || idx === N - 1;
    nodes.push({
      id,
      kind: decl.kind,
      role: nodeRole(decl.kind),
      label: decl.label,
      x: snapGrid(x),
      y: snapGrid(y),
      width: snapGrid(w),
      height: snapGrid(h),
      style: decl.style ? ast.styles[decl.style]?.props : undefined,
      props: decl.props,
      opacity: 0,
      shape: "rounded",
      focal,
    });
  });
  return nodes;
}

function layoutRadar(ast: DiagramAST): PositionedNode[] {
  const nodeIds = Object.keys(ast.nodes);
  if (nodeIds.length === 0) return [];

  const contentW = ast.meta.width - SAFE * 2;
  const contentH = ast.meta.height - SAFE - TITLE_BAND - SAFE;
  const centerX = SAFE + contentW / 2;
  const centerY = TITLE_BAND + contentH / 2;
  const radius = Math.min(contentW, contentH) * 0.38;
  const N = Math.max(nodeIds.length, 3);

  const nodes: PositionedNode[] = [];

  nodeIds.forEach((id, idx) => {
    const decl = ast.nodes[id];
    const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / N;
    const x = centerX + radius * Math.cos(angle) - NODE_W / 2;
    const y = centerY + radius * Math.sin(angle) - NODE_H / 2;
    const focal = decl.props.focal === true || decl.props.accent === true;

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
      shape: "rounded",
      focal,
    });
  });

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
    case "loop":
    case "flywheel":
      return layoutLoop(ast);
    case "medallion":
      return layoutMedallion(ast, edges);
    case "quadrant":
      return layoutQuadrant(ast);
    case "swimlane":
      return layoutSwimlane(ast, edges);
    case "pyramid":
      return layoutPyramid(ast);
    case "radar":
      return layoutRadar(ast);
    case "timeline":
      return layoutTimeline(ast);
    case "gantt":
      return layoutGantt(ast);
    case "venn":
      return layoutVenn(ast);
    case "layers":
      return layoutLayers(ast);
    case "nested":
      return layoutNested(ast);
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
