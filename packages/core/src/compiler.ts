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

function estimateTextLines(words: string[], charsPerLine: number): number {
  if (words.length === 0) return 0;
  let lines = 1;
  let curLen = 0;
  for (const w of words) {
    if (curLen === 0) {
      curLen = w.length;
    } else if (curLen + 1 + w.length <= charsPerLine) {
      curLen += 1 + w.length;
    } else {
      lines++;
      curLen = w.length;
    }
  }
  return lines;
}

function measureLabelLines(rawLabel: string, words: string[], charsPerLine: number): number {
  if (words.length === 0) return 0;
  if (!rawLabel.includes("\n")) {
    return Math.max(1, estimateTextLines(words, charsPerLine));
  }
  const explicitLines = rawLabel.split("\n");
  let total = 0;
  for (const line of explicitLines) {
    const lineWords = line.trim().split(/\s+/).filter(Boolean);
    total += Math.max(1, estimateTextLines(lineWords, charsPerLine));
  }
  return Math.max(explicitLines.length, total);
}

export function computeNodeDimensions(
  decl: NodeDecl,
  baseW = 180,
  baseH = 76,
): { width: number; height: number } {
  if (decl.kind === "dot") return { width: 64, height: 64 };
  if (decl.kind === "matrix") return { width: 220, height: 96 };

  const rawLabel = (decl.label || "").trim();
  const labelLen = rawLabel.length;
  const words = rawLabel.split(/\s+/).filter(Boolean);
  const longestWord = Math.max(...words.map((w) => w.length), 0);

  const tech = decl.props?.tech ?? decl.props?.sub;
  const techStr = tech ? String(tech).trim() : "";
  const techLen = techStr.length;

  const val = decl.props?.value ?? decl.props?.metric;
  const valStr = val ? String(val).trim() : "";
  const valLen = valStr.length;

  // Left space: icon (28px) + left padding (16px) + gap (12px) = 56px
  const leftSpace = 56;
  // Right value: metric length * 9.5 + right padding (16px)
  const valueW = valLen > 0 ? Math.max(50, valLen * 9.5 + 16) : 0;
  const rightSpace = valueW > 0 ? valueW + 14 : 18;

  const isDiamond = decl.props?.shape === "diamond" || decl.kind === "decision" || decl.kind === "condition";
  const isCircle = decl.props?.shape === "circle";
  const isPill = decl.props?.shape === "pill";

  const effectiveBaseW = isDiamond ? Math.max(baseW, 208) : isCircle ? Math.max(baseW, 140) : baseW;
  const effectiveBaseH = isDiamond ? Math.max(baseH, 88) : isCircle ? Math.max(baseH, 140) : baseH;

  // Tech badge width needed (font 10px mono ~6.6px per char + 16px badge padding)
  const neededTechW = techLen > 0 ? Math.ceil(techLen * 6.6 + 16) : 0;
  // Width needed for longest single word so unbroken words never clip or overflow
  const longestWordW = Math.ceil(longestWord * 8.4 + 4);
  const minColW = Math.max(96, longestWordW, neededTechW);

  if (isCircle) {
    // Circle shape: diameter must fit icon, all lines of label, and tech badge within inscribed circular region
    const targetTextW = Math.max(minColW, Math.min(220, Math.ceil(labelLen * 7.5)));
    const charsPerLine = Math.max(longestWord, Math.floor(targetTextW / 8.0));
    const numLines = Math.max(words.length > 0 ? 1 : 0, measureLabelLines(rawLabel, words, charsPerLine));
    const labelH = numLines * 16;
    const techH = techLen > 0 ? 20 : 0;
    const circleContentH = 28 + labelH + techH;
    const circleContentW = Math.max(targetTextW, 60);
    const radiusNeeded = Math.sqrt((circleContentW / 2) ** 2 + (circleContentH / 2) ** 2) + 20;
    const diameter = Math.max(effectiveBaseW, effectiveBaseH, Math.ceil((radiusNeeded * 2) / 8) * 8);
    return {
      width: typeof decl.props?.width === "number" ? Math.max(decl.props.width, diameter) : diameter,
      height: typeof decl.props?.height === "number" ? Math.max(decl.props.height, diameter) : diameter,
    };
  }

  if (isDiamond) {
    // Diamond shape: diamond vertices slope at 45 degrees, center is widest
    let targetTextW: number;
    if (labelLen <= 12) {
      targetTextW = Math.max(minColW, Math.ceil(labelLen * 8.0));
    } else if (labelLen <= 28) {
      targetTextW = Math.max(minColW, Math.min(180, Math.ceil((labelLen / 2) * 8.2 + 8)));
    } else {
      targetTextW = Math.max(minColW, Math.min(260, Math.ceil((labelLen / 3) * 8.2 + 12)));
    }
    const charsPerLine = Math.max(longestWord, Math.floor(targetTextW / 8.0));
    const numLines = Math.max(words.length > 0 ? 1 : 0, measureLabelLines(rawLabel, words, charsPerLine));
    const labelH = numLines * 16;
    const techH = techLen > 0 ? 20 : 0;
    const diamondContentH = 24 + labelH + techH;

    const neededH = Math.max(effectiveBaseH, Math.ceil((diamondContentH / 0.58) / 8) * 8);
    const neededW = Math.max(effectiveBaseW, Math.ceil(((targetTextW + 32) / 0.52) / 8) * 8);
    return {
      width: typeof decl.props?.width === "number" ? Math.max(decl.props.width, neededW) : neededW,
      height: typeof decl.props?.height === "number" ? Math.max(decl.props.height, neededH) : neededH,
    };
  }

  // Standard Card, Rounded, Terminal, Pill, Container
  let targetTextW: number;
  if (labelLen <= 14) {
    targetTextW = Math.max(minColW, Math.ceil(labelLen * 8.4));
  } else if (labelLen <= 30) {
    targetTextW = Math.max(minColW, Math.min(220, Math.ceil(labelLen * 8.4)));
  } else if (labelLen <= 54) {
    targetTextW = Math.max(minColW, Math.min(260, Math.max(180, Math.ceil((labelLen / 2) * 8.4 + 8))));
  } else if (labelLen <= 84) {
    targetTextW = Math.max(minColW, Math.min(300, Math.max(220, Math.ceil((labelLen / 3) * 8.4 + 12))));
  } else {
    targetTextW = Math.max(minColW, Math.min(360, Math.max(250, Math.ceil((labelLen / 4) * 8.4 + 16))));
  }

  const charsPerLine = Math.max(longestWord, Math.floor((targetTextW - 4) / 8.2));
  const numLines = Math.max(words.length > 0 ? 1 : 0, measureLabelLines(rawLabel, words, charsPerLine));

  const labelLineH = 18;
  const labelH = numLines * labelLineH;
  const techH = techLen > 0 ? 22 : 0;
  const padV = 28;
  const neededContentH = Math.max(28, labelH + techH);
  const neededH = neededContentH + padV;
  const height = Math.max(effectiveBaseH, Math.ceil(neededH / 8) * 8);

  const pillPad = isPill ? 24 : 0;
  const calculatedW = leftSpace + targetTextW + rightSpace + pillPad;
  const width = Math.max(effectiveBaseW, Math.ceil(calculatedW / 8) * 8);

  return {
    width: typeof decl.props?.width === "number" ? Math.max(decl.props.width, width) : width,
    height: typeof decl.props?.height === "number" ? Math.max(decl.props.height, height) : height,
  };
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
  if (!ast.meta.title || ast.meta.title.trim().length === 0) return 16;
  const title = ast.meta.title.trim();
  const isVertical = ast.meta.direction === "TB" || ast.meta.direction === "BT";
  if (isVertical && title.length > 26) {
    return TITLE_BAND + 52;
  }
  return TITLE_BAND;
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

  const nodeDims = new Map<string, { width: number; height: number }>();
  for (const id of nodeIds) {
    nodeDims.set(id, computeNodeDimensions(ast.nodes[id]));
  }
  const maxNodeH = Math.max(...nodeIds.map((id) => nodeDims.get(id)!.height), NODE_H);

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

  const isVertical = ast.meta.direction === "TB" || ast.meta.direction === "BT";
  const contentW = ast.meta.width - SAFE * 2;
  const contentH = ast.meta.height - SAFE - TITLE_BAND - SAFE;
  const nodePositions = new Map<string, { x: number; y: number }>();

  if (isVertical) {
    // "Căn dọc" — Vertical Portrait Tree Layout
    const allDirectKids = roots.flatMap((r) => children.get(r) ?? []);
    const allGrandKids = allDirectKids.flatMap((k) => children.get(k) ?? []);

    if (allGrandKids.length > 0) {
      // Multi-tier hierarchy (Root Coordinator -> Partition Branches -> Virtual Node Leaves)
      const branchColW = Math.max(...allDirectKids.map((id) => nodeDims.get(id)!.width), 220);
      const leafColW = Math.max(...allGrandKids.map((id) => nodeDims.get(id)!.width), 200);
      const colGap = 44;
      const totalColsW = branchColW + colGap + leafColW;
      const leftColX = SAFE + Math.max(0, (contentW - totalColsW) / 2);
      const rightColX = leftColX + branchColW + colGap;

      let curY = TITLE_BAND + 16;
      for (const r of roots) {
        const rDims = nodeDims.get(r)!;
        nodePositions.set(r, {
          x: SAFE + (contentW - rDims.width) / 2,
          y: curY,
        });
        curY += rDims.height + 40;
      }

      for (const bId of allDirectKids) {
        const bDims = nodeDims.get(bId)!;
        const gKids = children.get(bId) ?? [];

        if (gKids.length === 0) {
          nodePositions.set(bId, {
            x: leftColX + (branchColW - bDims.width) / 2,
            y: curY,
          });
          curY += bDims.height + 28;
        } else {
          const kidGap = 16;
          const totalKidsH = gKids.reduce((acc, kId) => acc + nodeDims.get(kId)!.height, 0) + (gKids.length - 1) * kidGap;
          const tierH = Math.max(bDims.height, totalKidsH);

          const bY = curY + (tierH - bDims.height) / 2;
          nodePositions.set(bId, {
            x: leftColX + (branchColW - bDims.width) / 2,
            y: bY,
          });

          let kidY = curY + (tierH - totalKidsH) / 2;
          for (const kId of gKids) {
            const kDims = nodeDims.get(kId)!;
            nodePositions.set(kId, {
              x: rightColX + (leafColW - kDims.width) / 2,
              y: kidY,
            });
            kidY += kDims.height + kidGap;
          }

          curY += tierH + 28;
        }
      }
    } else {
      // 2-tier tree (Root -> direct children only)
      let curY = TITLE_BAND + 16;
      for (const r of roots) {
        const rDims = nodeDims.get(r)!;
        nodePositions.set(r, {
          x: SAFE + (contentW - rDims.width) / 2,
          y: curY,
        });
        curY += rDims.height + 36;
      }
      for (const cId of allDirectKids) {
        const cDims = nodeDims.get(cId)!;
        nodePositions.set(cId, {
          x: SAFE + (contentW - cDims.width) / 2,
          y: curY,
        });
        curY += cDims.height + 24;
      }
    }

    // Ensure any orphan nodes are positioned
    for (const id of nodeIds) {
      if (!nodePositions.has(id)) {
        const dims = nodeDims.get(id)!;
        nodePositions.set(id, {
          x: SAFE + (contentW - dims.width) / 2,
          y: TITLE_BAND + 16,
        });
      }
    }
  } else {
    // Landscape tree layout (horizontal spread across leaves)
    const subtreeSpan = new Map<string, number>();
    function leafSpan(id: string): number {
      const w = nodeDims.get(id)?.width ?? NODE_W;
      return w + 36;
    }

    function measureSubtree(id: string): number {
      const kids = children.get(id) ?? [];
      const minSpan = leafSpan(id);
      if (kids.length === 0) {
        subtreeSpan.set(id, minSpan);
        return minSpan;
      }
      let total = 0;
      for (const kid of kids) {
        total += measureSubtree(kid);
      }
      const span = Math.max(minSpan, total);
      subtreeSpan.set(id, span);
      return span;
    }

    let totalRootsWidth = 0;
    for (const r of roots) {
      totalRootsWidth += measureSubtree(r);
    }

    const treeStartX = SAFE + Math.max(0, (contentW - totalRootsWidth) / 2);
    const levelHeight = Math.max(maxNodeH + 40, Math.min(220, contentH / Math.max(maxDepth + 1, 1)));
    const totalTreeHeight = maxDepth * levelHeight + maxNodeH;
    const treeStartY = TITLE_BAND + Math.max(16, (contentH - totalTreeHeight) / 2);

    function positionSubtree(id: string, leftX: number): void {
      const d = depth.get(id) ?? 0;
      const y = treeStartY + d * levelHeight;
      const kids = children.get(id) ?? [];
      const span = subtreeSpan.get(id) ?? leafSpan(id);
      const dims = nodeDims.get(id) ?? { width: NODE_W, height: NODE_H };

      if (kids.length === 0) {
        const centerX = leftX + span / 2;
        nodePositions.set(id, { x: centerX - dims.width / 2, y });
        return;
      }

      let curX = leftX;
      for (const kid of kids) {
        const kidSpan = subtreeSpan.get(kid) ?? leafSpan(kid);
        positionSubtree(kid, curX);
        curX += kidSpan;
      }

      // Parent centered over first and last child
      const firstChild = nodePositions.get(kids[0])!;
      const lastChild = nodePositions.get(kids[kids.length - 1])!;
      const firstDims = nodeDims.get(kids[0]) ?? { width: NODE_W, height: NODE_H };
      const lastDims = nodeDims.get(kids[kids.length - 1]) ?? { width: NODE_W, height: NODE_H };
      const parentCenterX = (firstChild.x + firstDims.width / 2 + lastChild.x + lastDims.width / 2) / 2;
      nodePositions.set(id, { x: parentCenterX - dims.width / 2, y });
    }

    let currentRootLeft = treeStartX;
    for (const r of roots) {
      const span = subtreeSpan.get(r) ?? leafSpan(r);
      positionSubtree(r, currentRootLeft);
      currentRootLeft += span;
    }
  }

  const nodes: PositionedNode[] = [];
  for (const id of nodeIds) {
    const decl = ast.nodes[id];
    const pos = nodePositions.get(id) ?? { x: SAFE, y: TITLE_BAND };
    const dims = nodeDims.get(id) ?? { width: NODE_W, height: NODE_H };
    nodes.push({
      id,
      kind: decl.kind,
      role: nodeRole(decl.kind),
      label: decl.label,
      x: snapGrid(pos.x),
      y: snapGrid(pos.y),
      width: dims.width,
      height: dims.height,
      style: resolveNodeStyle(decl, ast),
      props: decl.props,
      opacity: 0,
      shape: nodeShape(decl.kind, "tree", decl.props),
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

  const nodeDims = new Map<string, { width: number; height: number }>();
  for (const id of nodeIds) {
    nodeDims.set(id, computeNodeDimensions(ast.nodes[id]));
  }
  const maxNodeW = Math.max(...nodeIds.map((id) => nodeDims.get(id)!.width), NODE_W);
  const maxNodeH = Math.max(...nodeIds.map((id) => nodeDims.get(id)!.height), NODE_H);

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
  const orbitIds = nodeIds.filter((id) => id !== focalId);
  const radiusX = Math.max(140, contentW / 2 - maxNodeW / 2 - SAFE);
  const radiusY = Math.max(120, contentH / 2 - maxNodeH / 2 - SAFE);
  const nodes: PositionedNode[] = [];

  for (const id of nodeIds) {
    const decl = ast.nodes[id];
    const dims = nodeDims.get(id) ?? { width: NODE_W, height: NODE_H };
    const isFocal = id === focalId;
    const index = orbitIds.indexOf(id);
    const angle = orbitIds.length > 0 ? -Math.PI / 2 + (index * Math.PI * 2) / orbitIds.length : 0;
    const x = isFocal ? SAFE + contentW / 2 - dims.width / 2 : SAFE + contentW / 2 + Math.cos(angle) * radiusX - dims.width / 2;
    const y = isFocal ? TITLE_BAND + contentH / 2 - dims.height / 2 : TITLE_BAND + contentH / 2 + Math.sin(angle) * radiusY - dims.height / 2;
    nodes.push({
      id,
      kind: decl.kind,
      role: nodeRole(decl.kind),
      label: decl.label,
      x: snapGrid(x),
      y: snapGrid(y),
      width: dims.width,
      height: dims.height,
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

  const nodeDims = new Map<string, { width: number; height: number }>();
  for (const id of nodeIds) {
    nodeDims.set(id, computeNodeDimensions(ast.nodes[id]));
  }
  const maxNodeW = Math.max(...nodeIds.map((id) => nodeDims.get(id)!.width), NODE_W);
  const maxNodeH = Math.max(...nodeIds.map((id) => nodeDims.get(id)!.height), NODE_H);

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
  const radiusX = Math.min(contentW * 0.40, Math.max(220, (contentW - maxNodeW) / 2 - 32));
  const radiusY = Math.min(contentH * 0.38, Math.max(150, (contentH - maxNodeH) / 2 - 32));

  const nodes: PositionedNode[] = [];

  for (const id of nodeIds) {
    const decl = ast.nodes[id];
    const isHub = id === hubId;
    const dims = nodeDims.get(id) ?? { width: NODE_W, height: NODE_H };
    const w = isHub ? Math.max(dims.width, snapGrid(NODE_W * 1.25)) : dims.width;
    const h = isHub ? Math.max(dims.height, snapGrid(NODE_H * 1.15)) : dims.height;
    let x: number;
    let y: number;

    if (isHub) {
      x = centerX - w / 2;
      y = centerY - h / 2;
    } else {
      const idx = stationIds.indexOf(id);
      const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / Math.max(stationIds.length, 1);
      x = centerX + Math.cos(angle) * radiusX - w / 2;
      y = centerY + Math.sin(angle) * radiusY - h / 2;
    }

    const focal = isHub || decl.props.focal === true || decl.props.accent === true;
    nodes.push({
      id,
      kind: decl.kind,
      role: nodeRole(decl.kind),
      label: decl.label,
      x: snapGrid(x),
      y: snapGrid(y),
      width: w,
      height: h,
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

  const nodeDims = new Map<string, { width: number; height: number }>();
  for (const id of nodeIds) {
    nodeDims.set(id, computeNodeDimensions(ast.nodes[id]));
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

  const isVertical = ast.meta.direction === "TB" || ast.meta.direction === "BT";
  const contentW = ast.meta.width - SAFE * 2;
  const contentH = ast.meta.height - SAFE - TITLE_BAND - SAFE;
  const maxNodeW = Math.max(...nodeIds.map((id) => nodeDims.get(id)!.width));
  const maxNodeH = Math.max(...nodeIds.map((id) => nodeDims.get(id)!.height));
  const nodes: PositionedNode[] = [];

  if (isVertical) {
    // "Căn dọc" — Vertical Portrait Medallion (4 tiers stacked as rows)
    const availableRowGap = tierCount > 1 ? (contentH - maxNodeH * tierCount) / (tierCount - 1) : 32;
    const rowGap = Math.max(32, Math.min(80, availableRowGap));
    const totalH = tierCount * maxNodeH + (tierCount - 1) * rowGap;
    const startY = TITLE_BAND + Math.max(16, (contentH - totalH) / 2);

    activeTiers.forEach(([_, ids], rowIdx) => {
      const rowCount = ids.length;
      const tierMaxH = Math.max(...ids.map((id) => nodeDims.get(id)!.height));
      const rowY = startY + rowIdx * (maxNodeH + rowGap);
      const colSpacing = 28;
      const totalRowNodesW = ids.reduce((acc, id) => acc + nodeDims.get(id)!.width, 0);
      const totalRowW = totalRowNodesW + Math.max(0, rowCount - 1) * colSpacing;
      let curX = SAFE + Math.max(0, (contentW - totalRowW) / 2);

      ids.forEach((id) => {
        const decl = ast.nodes[id];
        const dims = nodeDims.get(id)!;
        const nodeY = rowY + (tierMaxH - dims.height) / 2;
        const focal = decl.props.focal === true || decl.props.accent === true;
        nodes.push({
          id,
          kind: decl.kind,
          role: nodeRole(decl.kind),
          label: decl.label,
          x: snapGrid(curX),
          y: snapGrid(nodeY),
          width: dims.width,
          height: dims.height,
          style: resolveNodeStyle(decl, ast),
          props: decl.props,
          opacity: 0,
          shape: "card",
          focal,
        });
        curX += dims.width + colSpacing;
      });
    });
  } else {
    // Landscape: 4 columns side by side
    const availableColGap = tierCount > 1 ? (contentW - maxNodeW) / (tierCount - 1) : 0;
    const colGap = Math.max(maxNodeW + 36, Math.min(360, availableColGap));
    const totalW = (tierCount - 1) * colGap + maxNodeW;
    const startX = SAFE + Math.max(0, (contentW - totalW) / 2);

    activeTiers.forEach(([_, ids], colIdx) => {
      const colCount = ids.length;
      const colTierMaxW = Math.max(...ids.map((id) => nodeDims.get(id)!.width));
      const colTierMaxH = Math.max(...ids.map((id) => nodeDims.get(id)!.height));
      const colX = startX + colIdx * colGap;
      const rowSpacing = Math.max(colTierMaxH + 32, contentH / (colCount + 1));
      const colH = (colCount - 1) * rowSpacing + colTierMaxH;
      const startY = TITLE_BAND + Math.max(0, (contentH - colH) / 2);

      ids.forEach((id, rowIdx) => {
        const decl = ast.nodes[id];
        const dims = nodeDims.get(id)!;
        const rowY = startY + rowIdx * rowSpacing + (colTierMaxH - dims.height) / 2;
        const nodeX = colX + (colTierMaxW - dims.width) / 2;
        const focal = decl.props.focal === true || decl.props.accent === true;
        nodes.push({
          id,
          kind: decl.kind,
          role: nodeRole(decl.kind),
          label: decl.label,
          x: snapGrid(nodeX),
          y: snapGrid(rowY),
          width: dims.width,
          height: dims.height,
          style: resolveNodeStyle(decl, ast),
          props: decl.props,
          opacity: 0,
          shape: "card",
          focal,
        });
      });
    });
  }

  return nodes;
}

function layoutQuadrant(ast: DiagramAST): PositionedNode[] {
  const nodeIds = Object.keys(ast.nodes);
  if (nodeIds.length === 0) return [];

  const nodeDims = new Map<string, { width: number; height: number }>();
  for (const id of nodeIds) {
    nodeDims.set(id, computeNodeDimensions(ast.nodes[id]));
  }

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
    const offsetCount = ids.length;
    const maxQHeight = ids.length > 0 ? Math.max(...ids.map(id => nodeDims.get(id)!.height)) : NODE_H;
    const rowStep = maxQHeight + 20;

    ids.forEach((id, idx) => {
      const decl = ast.nodes[id];
      const dims = nodeDims.get(id)!;
      const rowOffset = (idx - (offsetCount - 1) / 2) * rowStep;
      const x = center.x - dims.width / 2;
      const y = center.y + rowOffset - dims.height / 2;
      const focal = decl.props.focal === true || decl.props.accent === true;
      nodes.push({
        id,
        kind: decl.kind,
        role: nodeRole(decl.kind),
        label: decl.label,
        x: snapGrid(x),
        y: snapGrid(y),
        width: dims.width,
        height: dims.height,
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

  const nodeDims = new Map<string, { width: number; height: number }>();
  for (const id of nodeIds) {
    nodeDims.set(id, computeNodeDimensions(ast.nodes[id]));
  }

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
    const count = ids.length;
    const maxLaneW = count > 0 ? Math.max(...ids.map(id => nodeDims.get(id)!.width)) : NODE_W;
    const colSpacing = Math.max(maxLaneW + 40, Math.min(320, contentW / Math.max(count + 1, 2)));
    const totalW = (count - 1) * colSpacing + maxLaneW;
    const startX = SAFE + Math.max(0, (contentW - totalW) / 2);

    ids.forEach((id, colIdx) => {
      const decl = ast.nodes[id];
      const dims = nodeDims.get(id)!;
      const colX = startX + colIdx * colSpacing + (maxLaneW - dims.width) / 2;
      const laneY = TITLE_BAND + laneIdx * laneHeight + (laneHeight - dims.height) / 2;
      const focal = decl.props.focal === true || decl.props.accent === true;
      nodes.push({
        id,
        kind: decl.kind,
        role: nodeRole(decl.kind),
        label: decl.label,
        x: snapGrid(colX),
        y: snapGrid(laneY),
        width: dims.width,
        height: dims.height,
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

  const nodeDims = new Map<string, { width: number; height: number }>();
  for (const id of nodeIds) {
    nodeDims.set(id, computeNodeDimensions(ast.nodes[id]));
  }

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
  const maxNodeH = Math.max(...nodeIds.map(id => nodeDims.get(id)!.height));
  const tierH = Math.max(NODE_H, maxNodeH);
  const totalH = tierCount * tierH + (tierCount - 1) * 24;
  const startY = TITLE_BAND + Math.max(16, (contentH - totalH) / 2);
  const nodes: PositionedNode[] = [];

  sortedTiers.forEach(([_, ids], tierIdx) => {
    const tierY = startY + tierIdx * (tierH + 24);
    const baseFraction = 0.32 + (0.44 * tierIdx) / Math.max(tierCount - 1, 1);
    const tierWidth = contentW * baseFraction;
    const count = ids.length;
    const maxTierW = Math.max(...ids.map(id => nodeDims.get(id)!.width));
    const nodeW = Math.max(maxTierW, Math.min(tierWidth / count - 12, 480));
    const totalTierW = count * nodeW + (count - 1) * 16;
    const tierStartX = centerX - totalTierW / 2;

    ids.forEach((id, idx) => {
      const decl = ast.nodes[id];
      const dims = nodeDims.get(id)!;
      const finalW = Math.max(nodeW, dims.width);
      const x = tierStartX + idx * (finalW + 16);
      const y = tierY + (tierH - dims.height) / 2;
      const focal = decl.props.focal === true || decl.props.accent === true;
      nodes.push({
        id,
        kind: decl.kind,
        role: nodeRole(decl.kind),
        label: decl.label,
        x: snapGrid(x),
        y: snapGrid(tierY),
        width: snapGrid(finalW),
        height: dims.height,
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

  const nodeDims = new Map<string, { width: number; height: number }>();
  for (const id of nodeIds) {
    nodeDims.set(id, computeNodeDimensions(ast.nodes[id]));
  }

  const contentW = ast.meta.width - SAFE * 2;
  const contentH = ast.meta.height - SAFE - TITLE_BAND - SAFE;
  const baselineY = TITLE_BAND + contentH / 2;
  const spacing = contentW / Math.max(nodeIds.length, 1);
  const nodes: PositionedNode[] = [];

  nodeIds.forEach((id, idx) => {
    const decl = ast.nodes[id];
    const dims = nodeDims.get(id)!;
    const x = SAFE + spacing * idx + (spacing - dims.width) / 2;
    const above = idx % 2 === 0;
    const y = above ? baselineY - dims.height - 24 : baselineY + 24;
    const focal = decl.props.focal === true || decl.props.accent === true;
    nodes.push({
      id, kind: decl.kind, role: nodeRole(decl.kind), label: decl.label,
      x: snapGrid(x), y: snapGrid(y), width: dims.width, height: dims.height,
      style: resolveNodeStyle(decl, ast),
      props: decl.props, opacity: 0, shape: "pill", focal,
    });
  });
  return nodes;
}

function layoutGantt(ast: DiagramAST): PositionedNode[] {
  const nodeIds = Object.keys(ast.nodes);
  if (nodeIds.length === 0) return [];

  const nodeDims = new Map<string, { width: number; height: number }>();
  for (const id of nodeIds) {
    nodeDims.set(id, computeNodeDimensions(ast.nodes[id]));
  }

  const topBand = effectiveTitleBand(ast);
  const contentW = ast.meta.width - SAFE * 2;
  const contentH = ast.meta.height - SAFE - topBand - SAFE;
  const N = nodeIds.length;
  const maxNodeH = Math.max(...nodeIds.map(id => nodeDims.get(id)!.height));
  const baseBarH = Math.max(44, maxNodeH);
  const rowH = Math.max(baseBarH + 16, Math.min(100, (contentH - 24) / Math.max(N, 1)));
  const totalH = N * rowH;
  const startY = topBand + Math.max(16, (contentH - totalH) / 2);
  const nodes: PositionedNode[] = [];

  nodeIds.forEach((id, idx) => {
    const decl = ast.nodes[id];
    const dims = nodeDims.get(id)!;
    const phase = typeof decl.props.phase === "number" ? decl.props.phase : 0;
    const span = typeof decl.props.span === "number" ? decl.props.span : 1;
    const totalPhases = Math.max(...nodeIds.map(nid => {
      const p = ast.nodes[nid].props.phase;
      const s = ast.nodes[nid].props.span;
      return (typeof p === "number" ? p : 0) + (typeof s === "number" ? s : 1);
    }), 1);
    const unitW = contentW / totalPhases;
    const x = SAFE + phase * unitW;
    const w = Math.max(span * unitW - 8, dims.width);
    const barH = dims.height;
    const y = startY + idx * rowH + (rowH - barH) / 2;
    const focal = decl.props.focal === true || decl.props.accent === true;
    nodes.push({
      id, kind: decl.kind, role: nodeRole(decl.kind), label: decl.label,
      x: snapGrid(x), y: snapGrid(y), width: snapGrid(w), height: snapGrid(barH),
      style: resolveNodeStyle(decl, ast),
      props: decl.props, opacity: 0, shape: "pill", focal,
    });
  });
  return nodes;
}

function layoutVenn(ast: DiagramAST): PositionedNode[] {
  const nodeIds = Object.keys(ast.nodes);
  if (nodeIds.length === 0) return [];

  const nodeDims = new Map<string, { width: number; height: number }>();
  for (const id of nodeIds) {
    nodeDims.set(id, computeNodeDimensions(ast.nodes[id]));
  }

  const contentW = ast.meta.width - SAFE * 2;
  const contentH = ast.meta.height - SAFE - TITLE_BAND - SAFE;
  const centerX = SAFE + contentW / 2;
  const centerY = TITLE_BAND + contentH / 2;
  const N = nodeIds.length;
  const maxNodeDim = Math.max(...nodeIds.map(id => Math.max(nodeDims.get(id)!.width, nodeDims.get(id)!.height)));
  const vennSize = Math.max(VENN_NODE_SIZE, maxNodeDim);
  const radius = Math.max(vennSize * 0.7, Math.min(contentW, contentH) * 0.24);
  const nodes: PositionedNode[] = [];

  nodeIds.forEach((id, idx) => {
    const decl = ast.nodes[id];
    const dims = nodeDims.get(id)!;
    const circleSize = Math.max(vennSize, dims.width, dims.height);
    let x: number, y: number;
    if (N === 2) {
      x = centerX + (idx === 0 ? -radius * 0.7 : radius * 0.7) - circleSize / 2;
      y = centerY - circleSize / 2;
    } else {
      const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / N;
      x = centerX + radius * 0.85 * Math.cos(angle) - circleSize / 2;
      y = centerY + radius * 0.85 * Math.sin(angle) - circleSize / 2;
    }
    const focal = decl.props.focal === true || decl.props.accent === true;
    nodes.push({
      id, kind: decl.kind, role: nodeRole(decl.kind), label: decl.label,
      x: snapGrid(x), y: snapGrid(y), width: circleSize, height: circleSize,
      style: resolveNodeStyle(decl, ast),
      props: decl.props, opacity: 0, shape: "circle", focal,
    });
  });
  return nodes;
}

function layoutLayers(ast: DiagramAST): PositionedNode[] {
  const nodeIds = Object.keys(ast.nodes);
  if (nodeIds.length === 0) return [];

  const nodeDims = new Map<string, { width: number; height: number }>();
  for (const id of nodeIds) {
    nodeDims.set(id, computeNodeDimensions(ast.nodes[id]));
  }

  const contentW = ast.meta.width - SAFE * 2;
  const contentH = ast.meta.height - SAFE - TITLE_BAND - SAFE;
  const N = nodeIds.length;
  const maxNodeH = Math.max(...nodeIds.map(id => nodeDims.get(id)!.height));
  const layerH = Math.max(maxNodeH, Math.min(Math.max((contentH - (N - 1) * 14) / N, 52), 96));
  const totalH = N * layerH + (N - 1) * 14;
  const startY = TITLE_BAND + Math.max(16, (contentH - totalH) / 2);
  const maxNodeW = Math.max(...nodeIds.map(id => nodeDims.get(id)!.width));
  const layerW = Math.max(maxNodeW, Math.min(contentW, 880));
  const startX = SAFE + (contentW - layerW) / 2;
  const nodes: PositionedNode[] = [];

  nodeIds.forEach((id, idx) => {
    const decl = ast.nodes[id];
    const dims = nodeDims.get(id)!;
    const y = startY + idx * (layerH + 14);
    const nodeH = Math.max(layerH, dims.height);
    const focal = decl.props.focal === true || decl.props.accent === true;
    nodes.push({
      id,
      kind: decl.kind,
      role: nodeRole(decl.kind),
      label: decl.label,
      x: snapGrid(startX),
      y: snapGrid(y),
      width: snapGrid(layerW),
      height: snapGrid(nodeH),
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

  const nodeDims = new Map<string, { width: number; height: number }>();
  for (const id of nodeIds) {
    nodeDims.set(id, computeNodeDimensions(ast.nodes[id]));
  }

  const isVertical = ast.meta.direction === "TB" || ast.meta.direction === "BT";
  const topBand = effectiveTitleBand(ast);
  const topHeadroom = 16;
  const startY = topBand + topHeadroom;
  const contentW = ast.meta.width - SAFE * 2;
  const contentH = ast.meta.height - startY - SAFE;
  const N = nodeIds.length;
  const nodes: PositionedNode[] = [];

  if (isVertical) {
    // "Khung dọc" — Vertical concentric containment with dedicated top header clearance
    const stepX = Math.min(40, Math.max(24, (contentW * 0.32) / Math.max(N - 1, 1)));
    const stepY = Math.min(60, Math.max(46, (contentH * 0.40) / Math.max(N - 1, 1)));
    const bottomStepY = Math.min(36, Math.max(22, (contentH * 0.22) / Math.max(N - 1, 1)));

    nodeIds.forEach((id, idx) => {
      const decl = ast.nodes[id];
      const dims = nodeDims.get(id)!;
      const isCore = idx === N - 1;
      let x: number, y: number, w: number, h: number;

      if (isCore) {
        const availLeft = SAFE + idx * stepX;
        const availWidth = Math.max(dims.width, contentW - idx * stepX * 2);
        const availTop = startY + idx * stepY;
        const availBottom = startY + contentH - idx * bottomStepY;
        const availHeight = Math.max(80, availBottom - availTop);

        w = Math.min(availWidth - 24, Math.max(dims.width, 240));
        h = Math.max(dims.height, 80);
        x = availLeft + (availWidth - w) / 2;
        y = availTop + (availHeight - h) / 2;
      } else {
        x = SAFE + idx * stepX;
        y = startY + idx * stepY;
        w = contentW - idx * stepX * 2;
        h = contentH - idx * (stepY + bottomStepY);
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
  } else {
    // "Khung ngang" — Landscape concentric containment
    const padX = Math.min(54, (contentW * 0.38) / Math.max(N, 1));
    const padY = Math.min(48, (contentH * 0.38) / Math.max(N, 1));

    nodeIds.forEach((id, idx) => {
      const decl = ast.nodes[id];
      const dims = nodeDims.get(id)!;
      const isCore = idx === N - 1;
      let x: number, y: number, w: number, h: number;

      if (isCore) {
        const availLeft = SAFE + idx * padX;
        const availWidth = Math.max(dims.width, contentW - idx * padX * 2);
        const availTop = startY + idx * padY;
        const availHeight = Math.max(80, contentH - idx * padY * 2);

        w = Math.min(availWidth - 24, Math.max(dims.width, 240));
        h = Math.max(dims.height, 80);
        x = availLeft + (availWidth - w) / 2;
        y = availTop + (availHeight - h) / 2;
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
  }
  return nodes;
}

function layoutRadar(ast: DiagramAST): PositionedNode[] {
  const nodeIds = Object.keys(ast.nodes);
  if (nodeIds.length === 0) return [];

  const nodeDims = new Map<string, { width: number; height: number }>();
  for (const id of nodeIds) {
    nodeDims.set(id, computeNodeDimensions(ast.nodes[id]));
  }

  const contentW = ast.meta.width - SAFE * 2;
  const contentH = ast.meta.height - SAFE - TITLE_BAND - SAFE;
  const centerX = SAFE + contentW / 2;
  const centerY = TITLE_BAND + contentH / 2;
  const radius = Math.min(contentW, contentH) * 0.38;
  const N = Math.max(nodeIds.length, 3);

  const nodes: PositionedNode[] = [];

  nodeIds.forEach((id, idx) => {
    const decl = ast.nodes[id];
    const dims = nodeDims.get(id)!;
    const angle = -Math.PI / 2 + (idx * 2 * Math.PI) / N;
    const x = centerX + radius * Math.cos(angle) - dims.width / 2;
    const y = centerY + radius * Math.sin(angle) - dims.height / 2;
    const focal = decl.props.focal === true || decl.props.accent === true;

    nodes.push({
      id,
      kind: decl.kind,
      role: nodeRole(decl.kind),
      label: decl.label,
      x: snapGrid(x),
      y: snapGrid(y),
      width: dims.width,
      height: dims.height,
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
      return layoutRanked(ast, cycleSafeEdges(Object.keys(ast.nodes), edges), { forceVertical: ast.meta.direction === "TB" || ast.meta.direction === "BT" });
    default:
      return layoutRanked(ast, edges, { forceVertical: ast.meta.direction === "TB" || ast.meta.direction === "BT" });
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
      childYs: childNodes.map((node) => snapGrid(node.y)),
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

  const hasShowCue = ast.beats.some((b) =>
    b.cues.some((c) => c.kind === "show" || (c.kind === "parallel" && c.cues.some((pc) => pc.kind === "show")))
  );
  const flowNodeIds = new Set<string>();
  for (const b of ast.beats) {
    for (const c of b.cues) {
      if (c.kind === "flow") {
        for (const seg of c.segments) {
          flowNodeIds.add(seg.from);
          flowNodeIds.add(seg.to);
        }
      } else if (c.kind === "parallel") {
        for (const pc of c.cues) {
          if (pc.kind === "flow") {
            for (const seg of pc.segments) {
              flowNodeIds.add(seg.from);
              flowNodeIds.add(seg.to);
            }
          }
        }
      }
    }
  }

  const explicitlyShownNodes = new Set<string>();
  for (const b of ast.beats) {
    for (const c of b.cues) {
      if (c.kind === "show") {
        resolveTargets(c.targets, ast, groupMap, edgeIds).forEach((id) => explicitlyShownNodes.add(id));
      } else if (c.kind === "parallel") {
        for (const pc of c.cues) {
          if (pc.kind === "show") {
            resolveTargets(pc.targets, ast, groupMap, edgeIds).forEach((id) => explicitlyShownNodes.add(id));
          }
        }
      }
    }
  }

  const isSequence = ast.meta.type === "sequence";

  // Auto-inject __intro for nodes that will not be dynamically revealed by flow cues or explicit show cues
  const nodesToReveal = (!isSequence && flowNodeIds.size > 0)
    ? Object.keys(ast.nodes).filter((id) => !flowNodeIds.has(id) && !explicitlyShownNodes.has(id))
    : (!hasShowCue ? Object.keys(ast.nodes) : []);
  if (nodesToReveal.length > 0) {
    cues.push({
      start: 0,
      duration: DEFAULTS.show,
      kind: "show",
      targets: nodesToReveal,
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

  const nodeDims = Object.values(ast.nodes).map((n) => computeNodeDimensions(n));
  const maxNodeH = nodeDims.length > 0 ? Math.max(...nodeDims.map((d) => d.height)) : NODE_H;
  const flowCues = cues.filter((cue) => cue.kind === "flow" && cue.segments?.[0]);
  const firstY = TITLE_BAND + maxNodeH + 56;
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

  const nodeDims = nodeIds.map((id) => computeNodeDimensions(ast.nodes[id]));
  const maxNodeW = nodeDims.length > 0 ? Math.max(...nodeDims.map((d) => d.width)) : NODE_W;
  const maxNodeH = nodeDims.length > 0 ? Math.max(...nodeDims.map((d) => d.height)) : NODE_H;

  const hasTitle = Boolean(ast.meta.title && ast.meta.title.trim().length > 0);
  const titleBand = effectiveTitleBand(ast);
  const hasBeatCaptions = ast.beats.some((b) => b.label && b.label.trim().length > 0);
  const bottomBand = hasBeatCaptions ? 44 : 0;
  const titleW = hasTitle ? Math.max(320, ast.meta.title!.trim().length * 11 + SAFE * 2) : 0;

  let autoW = 1024;
  let autoH = 640;

  if (nodeCount === 0) {
    autoW = 960;
    autoH = 540;
  } else if (dtype === "sequence") {
    const flowCues = ast.beats.flatMap((b) => b.cues).filter((c) => c.kind === "flow");
    const count = Math.max(nodeCount, 1);
    const flowCount = flowCues.length;
    const colW = Math.max(200, maxNodeW + 36);
    const requiredW = SAFE * 2 + Math.max(count * colW, titleW);
    const requiredH = titleBand + maxNodeH + 48 + Math.max(flowCount * 68, 160) + SAFE + bottomBand;
    autoW = Math.max(480, Math.min(2560, requiredW));
    autoH = Math.max(320, Math.min(1800, requiredH));
  } else if (dtype === "medallion") {
    const tierSet = new Set<number>();
    const tierCounts = new Map<number, number>();
    for (const id of nodeIds) {
      const combined = `${id} ${ast.nodes[id].kind}`.toLowerCase();
      let t = 0;
      if (combined.includes("bronze") || combined.includes("raw") || combined.includes("landing")) t = 1;
      else if (combined.includes("silver") || combined.includes("clean") || combined.includes("curated") || combined.includes("conformed")) t = 2;
      else if (combined.includes("gold") || combined.includes("agg") || combined.includes("mart") || combined.includes("analytics")) t = 3;
      else if (combined.includes("bi") || combined.includes("dash") || combined.includes("model") || combined.includes("app") || combined.includes("consumer") || combined.includes("user") || combined.includes("client")) t = 4;
      tierSet.add(t);
      tierCounts.set(t, (tierCounts.get(t) ?? 0) + 1);
    }
    const tierCount = Math.max(tierSet.size, 4);
    const maxInTier = Math.max(...tierCounts.values(), 2);

    if (isVertical) {
      // "Căn dọc" — Portrait Medallion (4 tiers stacked vertically as rows)
      const nodeColSpacing = 28;
      const tierSpacing = 36;
      const tierH = Math.max(76, maxNodeH + 16);
      const requiredW = Math.max(SAFE * 2 + maxInTier * maxNodeW + (maxInTier - 1) * nodeColSpacing, titleW);
      const requiredH = titleBand + SAFE * 2 + tierCount * tierH + (tierCount - 1) * tierSpacing + bottomBand;
      autoW = Math.max(540, Math.min(1600, snapGrid(requiredW, 16)));
      autoH = Math.max(680, Math.min(2000, snapGrid(requiredH, 16)));
    } else {
      // Landscape: 4 columns side by side
      const tierW = Math.max(260, maxNodeW + 48);
      const requiredW = Math.max(SAFE * 2 + tierCount * tierW, titleW);
      const requiredH = titleBand + SAFE * 2 + Math.max(440, maxNodeH * 3 + 120) + bottomBand;
      autoW = Math.max(640, Math.min(2800, requiredW));
      autoH = Math.max(400, Math.min(1600, requiredH));
    }
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
    const activeRoots = roots.length > 0 ? roots : nodeIds;

    if (isVertical) {
      // "Căn dọc" — Portrait / Vertical Tree
      const allDirectKids = activeRoots.flatMap((r) => children.get(r) ?? []);
      const allGrandKids = allDirectKids.flatMap((k) => children.get(k) ?? []);

      if (allGrandKids.length > 0) {
        // Multi-tier hierarchy (Root Coordinator -> Partition Branches -> Virtual Node Leaves)
        const branchColW = Math.max(...allDirectKids.map((id) => computeNodeDimensions(ast.nodes[id]).width), 220);
        const leafColW = Math.max(...allGrandKids.map((id) => computeNodeDimensions(ast.nodes[id]).width), 200);
        const colGap = 44;
        const requiredW = Math.max(SAFE * 2 + branchColW + colGap + leafColW, titleW);

        let totalTiersH = 0;
        for (const bId of allDirectKids) {
          const bH = computeNodeDimensions(ast.nodes[bId]).height;
          const gKids = children.get(bId) ?? [];
          const gKidsH = gKids.length > 0
            ? gKids.reduce((acc, kId) => acc + computeNodeDimensions(ast.nodes[kId]).height, 0) + (gKids.length - 1) * 16
            : bH;
          totalTiersH += Math.max(bH, gKidsH) + 28;
        }

        const rootH = activeRoots.reduce((acc, rId) => acc + computeNodeDimensions(ast.nodes[rId]).height + 36, 0);
        const requiredH = titleBand + SAFE * 2 + rootH + totalTiersH + bottomBand;
        autoW = Math.max(540, Math.min(1600, snapGrid(requiredW, 16)));
        autoH = Math.max(680, Math.min(2200, snapGrid(requiredH, 16)));
      } else {
        // 2-tier tree: Single centered vertical column stack
        const maxChildW = allDirectKids.length > 0
          ? Math.max(...allDirectKids.map((id) => computeNodeDimensions(ast.nodes[id]).width))
          : maxNodeW;
        const requiredW = Math.max(SAFE * 2 + Math.max(maxNodeW, maxChildW), titleW);
        const totalNodesH = nodeIds.reduce((acc, id) => acc + computeNodeDimensions(ast.nodes[id]).height + 24, 0);
        const requiredH = titleBand + SAFE * 2 + totalNodesH + bottomBand;
        autoW = Math.max(480, Math.min(1400, snapGrid(requiredW, 16)));
        autoH = Math.max(560, Math.min(2000, snapGrid(requiredH, 16)));
      }
    } else {
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

      const minLeafWidth = Math.max(NODE_W + 36, maxNodeW + 36);
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
      for (const r of activeRoots) totalRootsWidth += measureSubtree(r);

      const levelH = Math.max(130, maxNodeH + 54);
      const requiredW = Math.max(SAFE * 2 + totalRootsWidth, titleW);
      const requiredH = titleBand + SAFE * 2 + (maxDepth + 1) * levelH + bottomBand;
      autoW = Math.max(480, Math.min(2560, requiredW));
      autoH = Math.max(320, Math.min(1800, requiredH));
    }
  } else if (dtype === "swimlane") {
    const laneCount = Math.max(groupCount, 1);
    const maxInLane = Math.max(
      ...Object.values(ast.groups).map((g) => g.members.length),
      Math.ceil(nodeCount / laneCount),
      1,
    );
    const stepX = Math.max(200, maxNodeW + 36);
    const laneH = Math.max(130, maxNodeH + 54);
    const requiredW = Math.max(SAFE * 2 + 140 + maxInLane * stepX, titleW);
    const requiredH = titleBand + SAFE * 2 + laneCount * laneH + bottomBand;
    autoW = Math.max(480, Math.min(2560, requiredW));
    autoH = Math.max(320, Math.min(1800, requiredH));
  } else if (dtype === "pyramid") {
    const tierCount = Math.max(nodeCount, 1);
    const tierH = Math.max(100, maxNodeH + 28);
    autoW = Math.max(480, Math.min(2000, Math.max(SAFE * 2 + maxNodeW * 2 + 100, titleW)));
    const requiredH = titleBand + SAFE * 2 + tierCount * tierH + bottomBand;
    autoH = Math.max(320, Math.min(1440, requiredH));
  } else if (dtype === "layers") {
    const layerCount = Math.max(nodeCount, 1);
    const layerH = Math.max(90, maxNodeH + 18);
    autoW = Math.max(480, Math.min(2000, Math.max(SAFE * 2 + maxNodeW + 160, titleW)));
    const requiredH = titleBand + SAFE * 2 + layerCount * layerH + bottomBand;
    autoH = Math.max(320, Math.min(1440, requiredH));
  } else if (dtype === "timeline" || dtype === "gantt") {
    const milestones = Math.max(nodeCount, 1);
    let totalPhases = milestones;
    if (dtype === "gantt") {
      totalPhases = Math.max(...nodeIds.map(nid => {
        const p = ast.nodes[nid].props.phase;
        const s = ast.nodes[nid].props.span;
        return (typeof p === "number" ? p : 0) + (typeof s === "number" ? s : 1);
      }), milestones);
    }
    const milestoneW = Math.max(220, maxNodeW + 36);
    const requiredW = Math.max(
      SAFE * 2 + (dtype === "gantt" ? totalPhases * Math.max(160, maxNodeW + 16) : milestones * milestoneW),
      titleW,
    );
    const requiredH = dtype === "gantt"
      ? titleBand + SAFE * 2 + milestones * Math.max(76, maxNodeH + 16) + 40 + bottomBand
      : titleBand + SAFE * 2 + Math.max(260, maxNodeH * 2 + 80) + bottomBand;
    autoW = Math.max(480, Math.min(2560, requiredW));
    autoH = Math.max(320, Math.min(1600, requiredH));
  } else if (dtype === "loop" || dtype === "flywheel" || dtype === "radar" || dtype === "venn" || dtype === "constellation") {
    const N = Math.max(nodeCount, 3);
    const minRadius = Math.max(160, maxNodeW * 0.75);
    const nodeFootprint = Math.max(160, maxNodeW + 16);
    const radiusNeeded = Math.max(minRadius, (N * nodeFootprint) / (2 * Math.PI));
    const requiredW = Math.max(SAFE * 2 + radiusNeeded * 2 + maxNodeW + 40, titleW);
    const requiredH = titleBand + SAFE * 2 + radiusNeeded * 2 + maxNodeH + 40 + bottomBand;
    autoW = Math.max(480, Math.min(2400, requiredW));
    autoH = Math.max(360, Math.min(1800, requiredH));
  } else if (dtype === "quadrant") {
    const requiredW = Math.max(480, SAFE * 2 + maxNodeW * 2.5, titleW);
    const requiredH = titleBand + SAFE * 2 + maxNodeH * 3 + bottomBand;
    autoW = Math.min(2400, requiredW);
    autoH = Math.min(1600, requiredH);
  } else if (dtype === "nested") {
    const N = Math.max(nodeCount, 1);
    const isVertical = ast.meta.direction === "TB" || ast.meta.direction === "BT";
    if (isVertical) {
      // "Khung dọc" (Portrait / Vertical aspect ratio)
      const coreW = Math.max(280, maxNodeW + 48);
      const coreH = Math.max(76, maxNodeH + 16);
      const stepX = 36;
      const stepY = 56;
      const bottomStepY = 28;
      const requiredW = Math.max(SAFE * 2 + coreW + (N - 1) * stepX * 2, titleW);
      const contentH = (N - 1) * stepY + coreH + (N - 1) * bottomStepY + 48;
      const requiredH = titleBand + SAFE * 2 + contentH + bottomBand;
      autoW = Math.max(540, Math.min(1600, snapGrid(requiredW, 16)));
      autoH = Math.max(680, Math.min(2000, snapGrid(requiredH, 16)));
    } else {
      // "Khung ngang" (Landscape aspect ratio)
      const coreW = Math.max(300, maxNodeW + 48);
      const coreH = Math.max(84, maxNodeH + 24);
      const stepX = 48;
      const stepY = 40;
      const requiredW = Math.max(SAFE * 2 + coreW + (N - 1) * stepX * 2 + 100, titleW);
      const contentH = coreH + (N - 1) * stepY * 2 + 40;
      const requiredH = titleBand + SAFE * 2 + contentH + bottomBand;
      autoW = Math.max(720, Math.min(2400, snapGrid(requiredW, 16)));
      autoH = Math.max(460, Math.min(1400, snapGrid(requiredH, 16)));
    }
  } else {
    // Ranked Architecture, Flowchart, State
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
    const maxRankW = maxNodeW;
    const maxRankH = maxNodeH;

    if (forceVertical) {
      const colSpacing = 44;
      const rowGap = 56;
      const contentNeededW = maxInRank * maxRankW + Math.max(0, maxInRank - 1) * colSpacing + groupPaddingBonus;
      const requiredW = SAFE * 2 + contentNeededW;
      autoW = Math.max(480, Math.min(2400, Math.max(requiredW, titleW)));

      const contentNeededH = rankCount * maxRankH + Math.max(0, rankCount - 1) * rowGap + groupPaddingBonus;
      const requiredH = SAFE * 2 + titleBand + bottomBand + contentNeededH;
      autoH = Math.max(360, Math.min(3200, requiredH));
    } else {
      const colGap = 56;
      const rowGap = 44;
      const contentNeededW = rankCount * maxRankW + Math.max(0, rankCount - 1) * colGap + groupPaddingBonus;
      const requiredW = SAFE * 2 + contentNeededW;
      const contentNeededH = maxInRank * maxRankH + Math.max(0, maxInRank - 1) * rowGap + groupPaddingBonus;
      const requiredH = SAFE * 2 + titleBand + bottomBand + contentNeededH;

      autoW = Math.max(480, Math.min(2560, Math.max(requiredW, titleW)));
      autoH = Math.max(240, Math.min(1800, requiredH));
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
