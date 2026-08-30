import type {
  DiagramAST,
  DiagramType,
  FlowSegment,
  GroupBoundary,
  PositionedNode,
  NodeDecl,
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

const SAFE = 48;
const TITLE_BAND = 84;
const NODE_W = 180;
const NODE_H = 76;
const VENN_NODE_SIZE = 220;
const GROUP_PAD = 28;

export function computeNodeDimensions(
  decl: NodeDecl,
  baseW = 180,
  baseH = 76,
): { width: number; height: number } {
  if (typeof decl.props?.width === "number") {
    return {
      width: decl.props.width,
      height: typeof decl.props.height === "number" ? decl.props.height : baseH,
    };
  }

  const labelLen = (decl.label || "").length;
  const tech = decl.props?.tech ?? decl.props?.sub;
  const techLen = tech ? String(tech).length : 0;
  const val = decl.props?.value ?? decl.props?.metric;
  const valLen = val ? String(val).length : 0;

  if (decl.kind === "dot") return { width: 64, height: 64 };
  if (decl.kind === "matrix") return { width: 220, height: 96 };

  // Left space: icon (28px) + left padding (16px) + gap (12px) = 56px
  // Right value: metric length * 9.5 + right padding (16px)
  const valueW = valLen > 0 ? Math.max(50, valLen * 9.5 + 16) : 0;

  // Content width needed for label & tech badge
  const neededLabelChars = labelLen > 18 ? Math.ceil(labelLen / 2) : labelLen;
  const maxChars = Math.max(neededLabelChars, techLen);
  const neededTextW = Math.max(88, maxChars * 7.8);

  const calculatedW = 56 + neededTextW + (valueW > 0 ? valueW + 14 : 0) + 16;
  const minW = Math.max(baseW, Math.min(360, calculatedW));

  let width = Math.ceil(minW / 8) * 8;
  let height = baseH;
  if (labelLen > 24 && techLen > 0) {
    height = Math.max(height, 84);
  }

  return { width, height };
}

function resolveNodeStyle(decl: NodeDecl, ast: DiagramAST): Record<string, unknown> | undefined {
  if (!decl.style) return undefined;
  if (typeof decl.style === "string") return ast.styles[decl.style]?.props;
  return decl.style;
}

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

function effectiveTitleBand(ast: DiagramAST): number {
  return ast.meta.title && ast.meta.title.trim().length > 0 ? TITLE_BAND : 16;
}

function nodeShape(kind: string, dtype: DiagramType, props?: Record<string, unknown>): PositionedNode["shape"] {
  if (typeof props?.shape === "string") {
    const s = props.shape.toLowerCase();
    if (s === "diamond" || s === "circle" || s === "pill" || s === "terminal" || s === "rounded" || s === "card" || s === "container") {
      return s as PositionedNode["shape"];
    }
  }
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

function snapGrid(n: number, step = 4): number {
  return Math.round(n / step) * step;
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

  // Group membership index for group-aware clustering within ranks
  const nodeGroupIndex = new Map<string, number>();
  const groupIds = Object.keys(ast.groups);
  groupIds.forEach((gId, gIdx) => {
    for (const memberId of ast.groups[gId].members) {
      nodeGroupIndex.set(memberId, gIdx);
    }
  });

  // Maintain a rank order that minimizes crossings while respecting declaration order
  const nodeDeclOrder = new Map(nodeIds.map((id, idx) => [id, idx]));
  const incomingParents = new Map<string, string[]>();
  for (const id of nodeIds) incomingParents.set(id, []);
  for (const e of edges) {
    if (e.kind !== "response" && !e.selfLoop && ast.nodes[e.from] && ast.nodes[e.to]) {
      incomingParents.get(e.to)?.push(e.from);
    }
  }

  const rankOrder = new Map<string, number>();
  const sortedRanks = [...byRank.keys()].sort((a, b) => a - b);
  for (const r of sortedRanks) {
    const ids = byRank.get(r)!;
    ids.sort((a, b) => {
      const ga = nodeGroupIndex.has(a) ? nodeGroupIndex.get(a)! : 9999;
      const gb = nodeGroupIndex.has(b) ? nodeGroupIndex.get(b)! : 9999;
      if (ga !== gb) return ga - gb;

      // Barycenter heuristic: align child nodes under the average position of their parents in previous ranks
      const parentsA = (incomingParents.get(a) ?? []).filter((p) => rankOrder.has(p));
      const parentsB = (incomingParents.get(b) ?? []).filter((p) => rankOrder.has(p));
      if (parentsA.length > 0 && parentsB.length > 0) {
        const avgA = parentsA.reduce((sum, p) => sum + (rankOrder.get(p) ?? 0), 0) / parentsA.length;
        const avgB = parentsB.reduce((sum, p) => sum + (rankOrder.get(p) ?? 0), 0) / parentsB.length;
        if (Math.abs(avgA - avgB) > 0.001) return avgA - avgB;
      }

      // Preserve author declaration order
      return (nodeDeclOrder.get(a) ?? 0) - (nodeDeclOrder.get(b) ?? 0);
    });

    ids.forEach((id, idx) => {
      rankOrder.set(id, idx);
    });
  }

  const isVertical = direction === "TB" || direction === "BT";
  const hasTitle = Boolean(ast.meta.title && ast.meta.title.trim().length > 0);
  const hasBeatCaptions = ast.beats.some((b) => b.label && b.label.trim().length > 0);
  const titleBand = hasTitle ? TITLE_BAND : 0;
  const bottomBand = hasBeatCaptions ? 44 : 0;
  const contentW = ast.meta.width - SAFE * 2;
  const maxRank = Math.max(...byRank.keys(), 0);
  const rankCount = maxRank + 1;
  const maxInRank = Math.max(...[...byRank.values()].map((v) => v.length), 1);

  const nodes: PositionedNode[] = [];
  const nodeDims = new Map<string, { width: number; height: number }>();
  for (const id of nodeIds) {
    nodeDims.set(id, computeNodeDimensions(ast.nodes[id]));
  }

  if (opts.columnLayout) {
    // Sequence participant column layout
    const count = nodeIds.length;
    const maxNodeW = Math.max(...nodeIds.map((id) => nodeDims.get(id)?.width ?? NODE_W));
    const colSpacing = Math.max(maxNodeW + 32, contentW / Math.max(count, 1));
    const totalW = (count - 1) * colSpacing + maxNodeW;
    const startX = SAFE + Math.max(0, (contentW - totalW) / 2);
    nodeIds.forEach((id, idx) => {
      const decl = ast.nodes[id];
      const role = nodeRole(decl.kind);
      const dims = nodeDims.get(id) ?? { width: NODE_W, height: NODE_H };
      const x = startX + idx * colSpacing + (maxNodeW - dims.width) / 2;
      const y = (hasTitle ? titleBand : 20) + 32;
      nodes.push({
        id,
        kind: decl.kind,
        role,
        label: decl.label,
        x: snapGrid(x),
        y: snapGrid(y),
        width: dims.width,
        height: dims.height,
        style: resolveNodeStyle(decl, ast),
        props: decl.props,
        opacity: 0,
        shape: nodeShape(decl.kind, dtype, decl.props),
        focal: decl.props.focal === true || decl.props.accent === true,
        column: idx,
      });
    });
    return nodes;
  }

  if (isVertical) {
    // Vertical top-to-bottom flowchart/rank
    const contentH = ast.meta.height - SAFE - TITLE_BAND - SAFE;
    const maxNodeH = Math.max(...nodeIds.map((id) => nodeDims.get(id)?.height ?? NODE_H));
    const rowGap = Math.max(maxNodeH + 40, Math.min(200, contentH / Math.max(rankCount, 1)));
    const totalH = (rankCount - 1) * rowGap + maxNodeH;
    const startY = TITLE_BAND + Math.max(0, (contentH - totalH) / 2);

    for (const [rank, ids] of [...byRank.entries()].sort((a, b) => a[0] - b[0])) {
      const rowCount = ids.length;
      const maxRowW = Math.max(...ids.map((id) => nodeDims.get(id)?.width ?? NODE_W));
      const colSpacing = Math.max(maxRowW + 36, Math.min(320, contentW / Math.max(rowCount, 1)));
      const rankW = (rowCount - 1) * colSpacing + maxRowW;
      const rankStartX = SAFE + Math.max(0, (contentW - rankW) / 2);
      const y = startY + rank * rowGap;

      ids.forEach((id, idx) => {
        const decl = ast.nodes[id];
        const role = nodeRole(decl.kind);
        const dims = nodeDims.get(id) ?? { width: NODE_W, height: NODE_H };
        const x = rankStartX + idx * colSpacing;
        const focal = decl.props.focal === true || decl.props.accent === true;
        nodes.push({
          id,
          kind: decl.kind,
          role,
          label: decl.label,
          x: snapGrid(x),
          y: snapGrid(y),
          width: dims.width,
          height: dims.height,
          style: resolveNodeStyle(decl, ast),
          props: decl.props,
          opacity: 0,
          shape: nodeShape(decl.kind, dtype, decl.props),
          focal,
        });
      });
    }
    return nodes;
  }

  // Horizontal left-to-right architecture layout
  const rankWidths = new Map<number, number>();
  for (const [rank, ids] of byRank.entries()) {
    const maxW = Math.max(...ids.map((id) => nodeDims.get(id)?.width ?? NODE_W));
    rankWidths.set(rank, maxW);
  }

  const totalRankWidths = [...rankWidths.values()].reduce((a, b) => a + b, 0);
  const minColGap = 56;
  const availableGapW = Math.max(0, contentW - totalRankWidths);
  const colGap = rankCount > 1 ? Math.max(minColGap, Math.min(160, availableGapW / (rankCount - 1))) : 0;
  const totalW = totalRankWidths + (rankCount - 1) * colGap;
  const startX = SAFE + Math.max(0, (contentW - totalW) / 2);

  const availableH = Math.max(NODE_H, ast.meta.height - titleBand - bottomBand);

  let currentRankX = startX;
  for (let rank = 0; rank < rankCount; rank++) {
    const ids = byRank.get(rank) ?? [];
    const rankW = rankWidths.get(rank) ?? NODE_W;
    const rowCount = ids.length;
    const maxH = Math.max(...ids.map((id) => nodeDims.get(id)?.height ?? NODE_H), NODE_H);
    const maxPossibleRowStep = rowCount > 1 ? (availableH - maxH) / (rowCount - 1) : 0;
    const rowSpacing = rowCount > 1 ? Math.min(180, Math.max(maxH + 28, maxPossibleRowStep)) : 0;
    const colH = (rowCount - 1) * rowSpacing + maxH;
    const colStartY = titleBand + Math.max(0, (availableH - colH) / 2);

    ids.forEach((id, idx) => {
      const decl = ast.nodes[id];
      const role = nodeRole(decl.kind);
      const dims = nodeDims.get(id) ?? { width: NODE_W, height: NODE_H };
      const y = colStartY + idx * rowSpacing;
      const focal = decl.props.focal === true || decl.props.accent === true;
      nodes.push({
        id,
        kind: decl.kind,
        role,
        label: decl.label,
        x: snapGrid(currentRankX),
        y: snapGrid(y),
        width: dims.width,
        height: dims.height,
        style: resolveNodeStyle(decl, ast),
        props: decl.props,
        opacity: 0,
        shape: nodeShape(decl.kind, dtype, decl.props),
        focal,
      });
    });

    currentRankX += rankW + colGap;
  }
  return nodes;
}

function layoutTree(ast: DiagramAST, edges: RoutedEdge[]): PositionedNode[] {
  const nodeIds = Object.keys(ast.nodes);
  if (nodeIds.length === 0) return [];

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

  // Find root(s)
  const roots = nodeIds.filter((id) => !parent.has(id));
  if (roots.length === 0) roots.push(nodeIds[0]);

  // Compute depth and max depth
  const depth = new Map<string, number>();
  const queue = [...roots];
  for (const r of roots) depth.set(r, 0);
  while (queue.length) {
    const id = queue.shift()!;
    const d = depth.get(id)!;
    for (const child of children.get(id) ?? []) {
      if (!depth.has(child)) {
        depth.set(child, d + 1);
        queue.push(child);
      }
    }
  }
  for (const id of nodeIds) if (!depth.has(id)) depth.set(id, 0);
  const maxDepth = Math.max(...depth.values(), 0);

  // Subtree width calculation (recursive)
  const subtreeSpan = new Map<string, number>();
  const minLeafWidth = NODE_W + 48;

  function measureSubtree(id: string): number {
    const kids = children.get(id) ?? [];
    if (kids.length === 0) {
      subtreeSpan.set(id, minLeafWidth);
      return minLeafWidth;
    }
    let total = 0;
    for (const kid of kids) {
      total += measureSubtree(kid);
    }
    const span = Math.max(minLeafWidth, total);
    subtreeSpan.set(id, span);
    return span;
  }

  let totalRootsWidth = 0;
  for (const r of roots) {
    totalRootsWidth += measureSubtree(r);
  }

  const contentW = ast.meta.width - SAFE * 2;
  const contentH = ast.meta.height - SAFE - TITLE_BAND - SAFE;
  const treeStartX = SAFE + Math.max(0, (contentW - totalRootsWidth) / 2);
  const levelHeight = Math.max(NODE_H + 48, Math.min(160, contentH / Math.max(maxDepth + 1, 1)));
  const totalTreeHeight = maxDepth * levelHeight + NODE_H;
  const treeStartY = TITLE_BAND + Math.max(16, (contentH - totalTreeHeight) / 2);

  const nodePositions = new Map<string, { x: number; y: number }>();

  function positionSubtree(id: string, leftX: number): void {
    const d = depth.get(id) ?? 0;
    const y = treeStartY + d * levelHeight;
    const kids = children.get(id) ?? [];
    const span = subtreeSpan.get(id) ?? minLeafWidth;

    if (kids.length === 0) {
      const centerX = leftX + span / 2;
      nodePositions.set(id, { x: centerX - NODE_W / 2, y });
      return;
    }

    let curX = leftX;
    for (const kid of kids) {
      const kidSpan = subtreeSpan.get(kid) ?? minLeafWidth;
      positionSubtree(kid, curX);
      curX += kidSpan;
    }

    // Parent centered over first and last child
    const firstChild = nodePositions.get(kids[0])!;
    const lastChild = nodePositions.get(kids[kids.length - 1])!;
    const parentCenterX = (firstChild.x + NODE_W / 2 + lastChild.x + NODE_W / 2) / 2;
    nodePositions.set(id, { x: parentCenterX - NODE_W / 2, y });
  }

  let currentRootLeft = treeStartX;
  for (const r of roots) {
    const span = subtreeSpan.get(r) ?? minLeafWidth;
    positionSubtree(r, currentRootLeft);
    currentRootLeft += span;
  }

  const nodes: PositionedNode[] = [];
  for (const id of nodeIds) {
    const decl = ast.nodes[id];
    const pos = nodePositions.get(id) ?? { x: SAFE, y: TITLE_BAND };
    nodes.push({
      id,
      kind: decl.kind,
      role: nodeRole(decl.kind),
      label: decl.label,
      x: snapGrid(pos.x),
      y: snapGrid(pos.y),
      width: NODE_W,
      height: NODE_H,
      style: resolveNodeStyle(decl, ast),
      props: decl.props,
      opacity: 0,
      shape: "card",
      focal: decl.props.focal === true || decl.props.accent === true,
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
      style: resolveNodeStyle(decl, ast),
      props: decl.props,
      opacity: 0,
      shape: nodeShape(decl.kind, "constellation", decl.props),
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
  const radiusX = Math.min(contentW * 0.40, Math.max(220, (contentW - NODE_W) / 2 - 32));
  const radiusY = Math.min(contentH * 0.38, Math.max(150, (contentH - NODE_H) / 2 - 32));

  const nodes: PositionedNode[] = [];

  for (const id of nodeIds) {
    const decl = ast.nodes[id];
    const isHub = id === hubId;
    let x: number;
    let y: number;

    if (isHub) {
      x = centerX - (NODE_W * 1.25) / 2;
      y = centerY - (NODE_H * 1.15) / 2;
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
      width: isHub ? snapGrid(NODE_W * 1.25) : NODE_W,
      height: isHub ? snapGrid(NODE_H * 1.15) : NODE_H,
      style: resolveNodeStyle(decl, ast),
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
  const colGap = Math.max(NODE_W + 48, contentW / (tierCount + 1));
  const totalW = (tierCount - 1) * colGap + NODE_W;
  const startX = SAFE + Math.max(0, (contentW - totalW) / 2);
  const nodes: PositionedNode[] = [];

  activeTiers.forEach(([_, ids], colIdx) => {
    const colCount = ids.length;
    const colX = startX + colIdx * colGap;
    const rowSpacing = Math.max(NODE_H + 32, contentH / (colCount + 1));
    const colH = (colCount - 1) * rowSpacing + NODE_H;
    const startY = TITLE_BAND + Math.max(0, (contentH - colH) / 2);

    ids.forEach((id, rowIdx) => {
      const decl = ast.nodes[id];
      const rowY = startY + rowIdx * rowSpacing;
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
        style: resolveNodeStyle(decl, ast),
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
      const rowOffset = (idx - (offsetCount - 1) / 2) * (NODE_H + 20);
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
        style: resolveNodeStyle(decl, ast),
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
    const colSpacing = Math.max(NODE_W + 48, Math.min(260, contentW / Math.max(count + 1, 2)));
    const totalW = (count - 1) * colSpacing + NODE_W;
    const startX = SAFE + Math.max(0, (contentW - totalW) / 2);

    ids.forEach((id, colIdx) => {
      const decl = ast.nodes[id];
      const colX = startX + colIdx * colSpacing;
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
        style: resolveNodeStyle(decl, ast),
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
  const centerX = SAFE + contentW / 2;
  const totalH = tierCount * NODE_H + (tierCount - 1) * 24;
  const startY = TITLE_BAND + Math.max(16, (contentH - totalH) / 2);
  const nodes: PositionedNode[] = [];

  sortedTiers.forEach(([_, ids], tierIdx) => {
    const tierY = startY + tierIdx * (NODE_H + 24);
    const baseFraction = 0.32 + (0.44 * tierIdx) / Math.max(tierCount - 1, 1);
    const tierWidth = contentW * baseFraction;
    const count = ids.length;
    const nodeW = Math.max(NODE_W, Math.min(tierWidth / count - 12, 480));
    const totalTierW = count * nodeW + (count - 1) * 16;
    const tierStartX = centerX - totalTierW / 2;

    ids.forEach((id, idx) => {
      const decl = ast.nodes[id];
      const x = tierStartX + idx * (nodeW + 16);
      const focal = decl.props.focal === true || decl.props.accent === true;
      nodes.push({
        id,
        kind: decl.kind,
        role: nodeRole(decl.kind),
        label: decl.label,
        x: snapGrid(x),
        y: snapGrid(tierY),
        width: snapGrid(nodeW),
        height: NODE_H,
        style: resolveNodeStyle(decl, ast),
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
      style: resolveNodeStyle(decl, ast),
      props: decl.props, opacity: 0, shape: "pill", focal,
    });
  });
  return nodes;
}

function layoutGantt(ast: DiagramAST): PositionedNode[] {
  const nodeIds = Object.keys(ast.nodes);
  if (nodeIds.length === 0) return [];

  const contentW = ast.meta.width - SAFE * 2;
  const contentH = ast.meta.height - SAFE - TITLE_BAND - SAFE;
  const N = nodeIds.length;
  const rowH = Math.min(68, Math.max(52, (contentH - 24) / Math.max(N, 1)));
  const barH = Math.min(44, rowH - 16);
  const totalH = N * rowH;
  const startY = TITLE_BAND + Math.max(16, (contentH - totalH) / 2);
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
    const y = startY + idx * rowH + (rowH - barH) / 2;
    const focal = decl.props.focal === true || decl.props.accent === true;
    nodes.push({
      id, kind: decl.kind, role: nodeRole(decl.kind), label: decl.label,
      x: snapGrid(x), y: snapGrid(y), width: snapGrid(w), height: barH,
      style: resolveNodeStyle(decl, ast),
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
  const radius = Math.min(contentW, contentH) * 0.24;
  const nodes: PositionedNode[] = [];

  nodeIds.forEach((id, idx) => {
    const decl = ast.nodes[id];
    let x: number, y: number;
    if (N === 2) {
      x = centerX + (idx === 0 ? -radius * 0.7 : radius * 0.7) - VENN_NODE_SIZE / 2;
      y = centerY - VENN_NODE_SIZE / 2;
    } else {
      const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / N;
      x = centerX + radius * 0.85 * Math.cos(angle) - VENN_NODE_SIZE / 2;
      y = centerY + radius * 0.85 * Math.sin(angle) - VENN_NODE_SIZE / 2;
    }
    const focal = decl.props.focal === true || decl.props.accent === true;
    nodes.push({
      id, kind: decl.kind, role: nodeRole(decl.kind), label: decl.label,
      x: snapGrid(x), y: snapGrid(y), width: VENN_NODE_SIZE, height: VENN_NODE_SIZE,
      style: resolveNodeStyle(decl, ast),
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
  const layerH = Math.min(Math.max((contentH - (N - 1) * 14) / N, 52), 68);
  const totalH = N * layerH + (N - 1) * 14;
  const startY = TITLE_BAND + (contentH - totalH) / 2;
  const layerW = Math.min(contentW, 880);
  const startX = SAFE + (contentW - layerW) / 2;
  const nodes: PositionedNode[] = [];

  nodeIds.forEach((id, idx) => {
    const decl = ast.nodes[id];
    const y = startY + idx * (layerH + 14);
    const focal = decl.props.focal === true || decl.props.accent === true;
    nodes.push({
      id,
      kind: decl.kind,
      role: nodeRole(decl.kind),
      label: decl.label,
      x: snapGrid(startX),
      y: snapGrid(y),
      width: snapGrid(layerW),
      height: snapGrid(layerH),
      style: resolveNodeStyle(decl, ast),
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

  const topHeadroom = 20;
  const startY = TITLE_BAND + topHeadroom;
  const contentW = ast.meta.width - SAFE * 2;
  const contentH = ast.meta.height - startY - SAFE;
  const centerX = SAFE + contentW / 2;
  const centerY = startY + contentH / 2;
  const N = nodeIds.length;
  const padX = Math.min(54, (contentW * 0.42) / Math.max(N, 1));
  const padY = Math.min(48, (contentH * 0.42) / Math.max(N, 1));
  const nodes: PositionedNode[] = [];

  nodeIds.forEach((id, idx) => {
    const decl = ast.nodes[id];
    const isCore = idx === N - 1;
    let x: number, y: number, w: number, h: number;
    if (isCore) {
      w = Math.min(320, contentW - idx * padX * 2);
      h = 84;
      x = centerX - w / 2;
      y = centerY - h / 2 + (N > 1 ? 16 : 0);
    } else {
      x = SAFE + idx * padX;
      y = startY + idx * padY;
      w = contentW - idx * padX * 2;
      h = contentH - idx * padY * 2;
    }
    const focal = decl.props.focal === true || decl.props.accent === true || isCore;
    nodes.push({
      id,
      kind: decl.kind,
      role: nodeRole(decl.kind),
      label: decl.label,
      x: snapGrid(x),
      y: snapGrid(y),
      width: snapGrid(w),
      height: snapGrid(h),
      style: resolveNodeStyle(decl, ast),
      props: decl.props,
      opacity: 0,
      shape: isCore ? "card" : "container",
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
      style: resolveNodeStyle(decl, ast),
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
      return layoutRanked(ast, edges, { forceVertical: ast.meta.direction === "TB" || ast.meta.direction === "BT" });
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
  const firstY = TITLE_BAND + NODE_H + 56;
  const lastY = ast.meta.height - SAFE - 48;
  const availH = Math.max(120, lastY - firstY);
  const step = flowCues.length > 1
    ? Math.max(52, Math.min(90, availH / flowCues.length))
    : 0;
  const totalSeqH = (flowCues.length - 1) * step;
  const startY = flowCues.length > 1
    ? firstY + Math.max(0, (availH - totalSeqH) / 2)
    : firstY + 40;

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
      y: snapGrid(startY + step * index),
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

/**
 * Computes optimal, content-adaptive canvas width and height for a diagram AST
 * when dimensions are omitted or partially specified in the script.
 */
export function computeAdaptiveDimensions(
  ast: DiagramAST,
  edges?: RoutedEdge[],
): { width: number; height: number } {
  const explicitW = ast.meta.explicitWidth === true;
  const explicitH = ast.meta.explicitHeight === true;

  if (explicitW && explicitH) {
    return { width: ast.meta.width, height: ast.meta.height };
  }

  const effectiveEdges = edges ?? collectStructuralEdges(ast);
  const nodeIds = Object.keys(ast.nodes);
  const nodeCount = nodeIds.length;
  const dtype = diagramType(ast);
  const direction = ast.meta.direction ?? "LR";
  const isVertical = direction === "TB" || direction === "BT";
  const groupCount = Object.keys(ast.groups).length;

  let autoW = 1280;
  let autoH = 720;

  if (nodeCount === 0) {
    autoW = 1280;
    autoH = 720;
  } else if (dtype === "sequence") {
    const flowCues = ast.beats.flatMap((b) => b.cues).filter((c) => c.kind === "flow");
    const count = Math.max(nodeCount, 1);
    const flowCount = flowCues.length;
    const requiredW = SAFE * 2 + Math.max(count * 220, 800);
    const requiredH = TITLE_BAND + NODE_H + 56 + Math.max(flowCount * 76, 280) + SAFE + 48;
    autoW = Math.max(1088, Math.min(2560, requiredW));
    autoH = Math.max(640, Math.min(1800, requiredH));
  } else if (dtype === "tree") {
    const children = new Map<string, string[]>();
    const hasParent = new Set<string>();
    for (const id of nodeIds) children.set(id, []);
    const treeEdges = effectiveEdges.some((e) => e.structural)
      ? effectiveEdges.filter((e) => e.structural)
      : effectiveEdges;
    for (const e of treeEdges) {
      if (ast.nodes[e.from] && ast.nodes[e.to] && e.from !== e.to) {
        children.get(e.from)?.push(e.to);
        hasParent.add(e.to);
      }
    }
    const roots = nodeIds.filter((id) => !hasParent.has(id));
    const depth = new Map<string, number>();
    const queue = [...roots];
    for (const r of roots) depth.set(r, 0);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const d = depth.get(cur) ?? 0;
      for (const child of children.get(cur) ?? []) {
        if (!depth.has(child)) {
          depth.set(child, d + 1);
          queue.push(child);
        }
      }
    }
    for (const id of nodeIds) if (!depth.has(id)) depth.set(id, 0);
    const maxDepth = Math.max(...depth.values(), 0);

    const minLeafWidth = NODE_W + 48;
    const subtreeSpan = new Map<string, number>();
    function measureSubtree(id: string): number {
      const kids = children.get(id) ?? [];
      if (kids.length === 0) {
        subtreeSpan.set(id, minLeafWidth);
        return minLeafWidth;
      }
      let total = 0;
      for (const kid of kids) total += measureSubtree(kid);
      const span = Math.max(minLeafWidth, total);
      subtreeSpan.set(id, span);
      return span;
    }
    let totalRootsWidth = 0;
    const activeRoots = roots.length > 0 ? roots : nodeIds;
    for (const r of activeRoots) totalRootsWidth += measureSubtree(r);

    const requiredW = SAFE * 2 + totalRootsWidth;
    const requiredH = TITLE_BAND + SAFE * 2 + (maxDepth + 1) * 140;
    autoW = Math.max(1120, Math.min(2560, requiredW));
    autoH = Math.max(640, Math.min(1600, requiredH));
  } else if (dtype === "swimlane") {
    const laneCount = Math.max(groupCount, 1);
    const maxInLane = Math.max(
      ...Object.values(ast.groups).map((g) => g.members.length),
      Math.ceil(nodeCount / laneCount),
      1,
    );
    const requiredW = SAFE * 2 + 140 + maxInLane * 220;
    const requiredH = TITLE_BAND + SAFE * 2 + laneCount * 140;
    autoW = Math.max(1152, Math.min(2560, requiredW));
    autoH = Math.max(640, Math.min(1600, requiredH));
  } else if (dtype === "pyramid") {
    const tierCount = Math.max(nodeCount, 1);
    autoW = 1280;
    const requiredH = TITLE_BAND + SAFE * 2 + tierCount * 110;
    autoH = Math.max(640, Math.min(1440, requiredH));
  } else if (dtype === "layers") {
    const layerCount = Math.max(nodeCount, 1);
    autoW = 1280;
    const requiredH = TITLE_BAND + SAFE * 2 + layerCount * 96;
    autoH = Math.max(640, Math.min(1440, requiredH));
  } else if (dtype === "timeline" || dtype === "gantt") {
    const milestones = Math.max(nodeCount, 1);
    const requiredW = SAFE * 2 + milestones * 240;
    const requiredH = TITLE_BAND + SAFE * 2 + 380;
    autoW = Math.max(1200, Math.min(2560, requiredW));
    autoH = Math.max(640, Math.min(1200, requiredH));
  } else if (dtype === "loop" || dtype === "flywheel" || dtype === "radar" || dtype === "venn" || dtype === "constellation") {
    const N = Math.max(nodeCount, 3);
    const minRadius = 200;
    const radiusNeeded = Math.max(minRadius, (N * 180) / (2 * Math.PI));
    const requiredW = SAFE * 2 + radiusNeeded * 2 + 240;
    const requiredH = TITLE_BAND + SAFE * 2 + radiusNeeded * 2 + 140;
    autoW = Math.max(1088, Math.min(2200, requiredW));
    autoH = Math.max(720, Math.min(1600, requiredH));
  } else if (dtype === "quadrant") {
    autoW = 1200;
    autoH = 800;
  } else {
    // Ranked Architecture, Flowchart, State, Nested
    const forceVertical = (dtype === "flowchart" && isVertical) || isVertical;
    const ranks = assignRanks(nodeIds, effectiveEdges, forceVertical ? "TB" : "LR");
    const byRank = new Map<number, string[]>();
    for (const id of nodeIds) {
      const r = ranks.get(id) ?? 0;
      if (!byRank.has(r)) byRank.set(r, []);
      byRank.get(r)!.push(id);
    }
    const rankCount = Math.max(...byRank.keys(), 0) + 1;
    const maxInRank = Math.max(...[...byRank.values()].map((v) => v.length), 1);
    const groupPaddingBonus = groupCount > 0 ? GROUP_PAD * 2 : 0;

    if (forceVertical) {
      const requiredW = SAFE * 2 + maxInRank * NODE_W + (maxInRank - 1) * 44 + groupPaddingBonus;
      const requiredH = SAFE * 2 + TITLE_BAND + rankCount * NODE_H + (rankCount - 1) * 56 + groupPaddingBonus;

      if (nodeCount <= 2) {
        autoW = 960;
        autoH = 640;
      } else if (nodeCount <= 4 && rankCount <= 3) {
        autoW = 1024;
        autoH = 720;
      } else {
        autoW = Math.max(960, Math.min(2400, requiredW));
        autoH = Math.max(720, Math.min(2000, requiredH));
      }
    } else {
      const hasTitle = Boolean(ast.meta.title && ast.meta.title.trim().length > 0);
      const hasBeatCaptions = ast.beats.some((b) => b.label && b.label.trim().length > 0);
      const titleBand = hasTitle ? TITLE_BAND : 0;
      const bottomBand = hasBeatCaptions ? 44 : 0;
      const maxRankW = Math.max(...nodeIds.map((id) => computeNodeDimensions(ast.nodes[id]).width));
      const maxRankH = Math.max(...nodeIds.map((id) => computeNodeDimensions(ast.nodes[id]).height));
      const requiredW = SAFE * 2 + rankCount * maxRankW + (rankCount - 1) * 56 + groupPaddingBonus;
      const requiredH = SAFE * 2 + titleBand + bottomBand + maxInRank * maxRankH + (maxInRank - 1) * 44 + groupPaddingBonus;

      if (maxInRank === 1 && !hasTitle) {
        // Horizontal single-row chain without title: snug ribbon height
        autoW = Math.max(1024, Math.min(2560, requiredW));
        autoH = Math.max(hasBeatCaptions ? 240 : 208, Math.min(360, requiredH + 24));
      } else if (maxInRank === 2 && !hasTitle) {
        // 2-row horizontal layout: compact dual-tier height
        autoW = Math.max(1024, Math.min(2560, requiredW));
        autoH = Math.max(hasBeatCaptions ? 368 : 336, Math.min(480, requiredH + 24));
      } else if (maxInRank === 3 && !hasTitle) {
        // 3-row horizontal layout: compact tri-tier height
        autoW = Math.max(1152, Math.min(2560, requiredW));
        autoH = Math.max(hasBeatCaptions ? 480 : 448, Math.min(640, requiredH + 24));
      } else if (nodeCount <= 2 && rankCount <= 2) {
        autoW = 1024;
        autoH = hasTitle ? 576 : 384;
      } else if (nodeCount <= 4 && rankCount <= 3 && maxInRank <= 2) {
        autoW = 1152;
        autoH = hasTitle ? 648 : 448;
      } else {
        autoW = Math.max(1152, Math.min(2560, requiredW));
        autoH = Math.max(hasTitle ? 648 : (maxInRank <= 2 ? 448 : 576), Math.min(1600, requiredH));
      }
    }
  }

  return {
    width: explicitW ? ast.meta.width : snapGrid(autoW, 16),
    height: explicitH ? ast.meta.height : snapGrid(autoH, 16),
  };
}

export function compilePlan(ast: DiagramAST, theme: ThemeTokens): RenderPlan {
  const structuralEdges = collectStructuralEdges(ast);
  if (!ast.meta.explicitWidth || !ast.meta.explicitHeight) {
    const dims = computeAdaptiveDimensions(ast, structuralEdges);
    if (!ast.meta.explicitWidth) ast.meta.width = dims.width;
    if (!ast.meta.explicitHeight) ast.meta.height = dims.height;
  }
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

  const title = ast.meta.title ?? "";

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
