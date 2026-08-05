import type { DiagramAST, FlowSegment, PositionedNode, RenderPlan, RoutedEdge, ThemeTokens, TimedCue, BeatRange } from "./ast.js";
import { nodeRole } from "./registry.js";

const SAFE = 64;
const TITLE_BAND = 96;
const NODE_W = 168;
const NODE_H = 72;
const RANK_GAP = 96;
const ROW_GAP = 40;

const DEFAULTS = {
  show: 0.35,
  hide: 0.35,
  flow: 0.55,
  glow: 0.45,
  focus: 0.6,
  beatGap: 0.14,
  cueGap: 0.08,
  stagger: 0.06,
};

function collectStructuralEdges(ast: DiagramAST): RoutedEdge[] {
  const edges: RoutedEdge[] = [...ast.edges.map((e) => ({
    id: e.id,
    kind: e.kind,
    from: e.from,
    to: e.to,
    label: e.label,
  }))];

  let counter = edges.length;
  for (const beat of ast.beats) {
    for (const cue of beat.cues) {
      collectFlowSegments(cue, (seg) => {
        const id = `flow_${++counter}`;
        edges.push({ id, kind: seg.op, from: seg.from, to: seg.to, label: seg.label });
      });
    }
  }
  return dedupeEdges(edges);
}

function collectFlowSegments(cue: DiagramAST["beats"][number]["cues"][number], emit: (seg: FlowSegment) => void): void {
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
    const k = `${e.from}|${e.kind}|${e.to}|${e.label ?? ""}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out;
}

function buildGraph(ast: DiagramAST, edges: RoutedEdge[]): Map<string, Set<string>> {
  const g = new Map<string, Set<string>>();
  const ensure = (id: string) => {
    if (!g.has(id)) g.set(id, new Set());
  };
  for (const id of Object.keys(ast.nodes)) ensure(id);
  for (const e of edges) {
    if (e.kind === "response") continue;
    ensure(e.from);
    ensure(e.to);
    g.get(e.from)!.add(e.to);
  }
  return g;
}

function assignRanks(nodeIds: string[], edges: RoutedEdge[], direction: "LR" | "RL" | "TB" | "BT"): Map<string, number> {
  const ranks = new Map<string, number>();
  for (const id of nodeIds) ranks.set(id, 0);

  const forward = edges.filter((e) => e.kind !== "response");
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

function layoutNodes(ast: DiagramAST, edges: RoutedEdge[]): PositionedNode[] {
  const nodeIds = Object.keys(ast.nodes);
  const ranks = assignRanks(nodeIds, edges, ast.meta.direction);
  const byRank = new Map<number, string[]>();
  for (const id of nodeIds) {
    const r = ranks.get(id) ?? 0;
    if (!byRank.has(r)) byRank.set(r, []);
    byRank.get(r)!.push(id);
  }
  for (const ids of byRank.values()) ids.sort();

  const isVertical = ast.meta.direction === "TB" || ast.meta.direction === "BT";
  const contentW = ast.meta.width - SAFE * 2;
  const contentH = ast.meta.height - SAFE - TITLE_BAND - SAFE;
  const maxRank = Math.max(...byRank.keys(), 0);
  const rankCount = maxRank + 1;

  const nodes: PositionedNode[] = [];
  for (const [rank, ids] of [...byRank.entries()].sort((a, b) => a[0] - b[0])) {
    const rowCount = ids.length;
    ids.forEach((id, idx) => {
      const decl = ast.nodes[id];
      const role = nodeRole(decl.kind);
      let x: number;
      let y: number;
      if (isVertical) {
        x = SAFE + (contentW / (rowCount + 1)) * (idx + 1) - NODE_W / 2;
        y = TITLE_BAND + (contentH / Math.max(rankCount, 1)) * rank + (contentH / Math.max(rankCount, 1) - NODE_H) / 2;
      } else {
        x = SAFE + (contentW / Math.max(rankCount, 1)) * rank + (contentW / Math.max(rankCount, 1) - NODE_W) / 2;
        y = TITLE_BAND + (contentH / (rowCount + 1)) * (idx + 1) - NODE_H / 2;
      }
      x = Math.round(x / 8) * 8;
      y = Math.round(y / 8) * 8;
      const style = decl.style ? ast.styles[decl.style]?.props : undefined;
      nodes.push({
        id,
        kind: decl.kind,
        role,
        label: decl.label,
        x,
        y,
        width: NODE_W,
        height: NODE_H,
        style,
        props: decl.props,
        opacity: 0,
      });
    });
  }
  return nodes;
}

function resolveTargets(targets: string[], ast: DiagramAST, groups: Record<string, string[]>): string[] {
  const out: string[] = [];
  for (const t of targets) {
    if (t === "$nodes") {
      out.push(...Object.keys(ast.nodes));
    } else if (t === "$edges") {
      continue;
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
          const edgeId = `flow_${++edgeCounter}`;
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

      if (cue.kind !== "show" && cue.kind !== "hide" && cue.kind !== "glow" && cue.kind !== "focus") return;

      const targets = resolveTargets(cue.targets, ast, Object.fromEntries(Object.entries(ast.groups).map(([k, g]) => [k, g.members])));

      scheduled.push({
        start: t,
        duration: dur,
        kind: cue.kind,
        targets,
        params: {
          stagger: cue.kind === "show" ? (cue.stagger ?? DEFAULTS.stagger) : undefined,
          color: cue.kind === "glow" ? cue.color : undefined,
          strength: cue.kind === "glow" ? cue.strength : undefined,
          zoom: cue.kind === "focus" ? cue.zoom : undefined,
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

export function compilePlan(ast: DiagramAST, theme: ThemeTokens): RenderPlan {
  const structuralEdges = collectStructuralEdges(ast);
  const nodes = layoutNodes(ast, structuralEdges);
  const { cues, beats } = scheduleBeats(ast, structuralEdges);

  // Mark nodes visible after first show cue
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
    nodes,
    edges: structuralEdges,
    cues,
    beats,
    groups: Object.fromEntries(Object.entries(ast.groups).map(([k, g]) => [k, g.members])),
    duration,
  };
}
