/**
 * Polyline construction, measurement, and obstacle-aware routing for
 * flow edges (`request` / `response` / `emit`).
 *
 * Like `rect.ts` this is DOM-free: `routeFlowPath` returns plain points and
 * the caller turns them into SVG. Keeping the routing pure means the
 * "does this edge dodge the other nodes?" logic can be tested directly.
 */
import type { SceneAST } from "@markdy/core";
import type { ActorState } from "../types.js";
import type { Point, Rect } from "./rect.js";
import { actorCenter, actorRect, countPathIntersections, inflateRect } from "./rect.js";

/** Rounds to one decimal so generated SVG path data stays compact. */
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function toPathD(points: Point[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${round1(p.x)} ${round1(p.y)}`).join(" ");
}

export function polylineLength(points: Point[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
  }
  return Math.max(1, total);
}

/**
 * Walks `dist` pixels along the polyline and returns the point landed on.
 *
 * Distances outside the path are clamped to its endpoints rather than
 * extrapolated along the first/last segment's direction.
 */
export function pointAtDistance(points: Point[], dist: number): Point {
  let remain = Math.max(0, dist);
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (remain <= seg || i === points.length - 2) {
      const t = seg <= 0 ? 0 : Math.min(1, remain / seg);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }

    remain -= seg;
  }
  return points[0];
}

function segmentLength(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function labelPointForPath(points: Point[], lane: number): Point {
  if (points.length < 2) return points[0] ?? { x: 0, y: 0 };

  let bestIndex = 0;
  let bestLength = -1;
  for (let i = 0; i < points.length - 1; i++) {
    const len = segmentLength(points[i], points[i + 1]);
    if (len > bestLength) {
      bestIndex = i;
      bestLength = len;
    }
  }

  const a = points[bestIndex];
  const b = points[bestIndex + 1];
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const offset = lane * 8;
  if (Math.abs(a.x - b.x) >= Math.abs(a.y - b.y)) {
    return { x: mid.x, y: mid.y - 10 - offset };
  }
  return { x: mid.x + 10 + offset, y: mid.y };
}

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
}

function overlapCount(rect: Rect, obstacles: Rect[]): number {
  let hits = 0;
  for (const o of obstacles) if (rectsOverlap(rect, o)) hits++;
  return hits;
}

export interface LabelPlacement {
  x: number;
  y: number;
  rect: Rect;
}

const LABEL_BOX_HEIGHT = 18;

/**
 * Chooses a readable anchor for an edge label.
 *
 * The label starts centered on the edge's longest segment, then steps
 * perpendicular to that segment — preferring above (horizontal edges) or to
 * the right (vertical edges) — until it clears every obstacle it's given
 * (node boxes plus already-placed labels). The whole box is kept inside the
 * scene, and the least-crowded candidate wins if nothing is fully clear.
 */
export function placeFlowLabel(
  points: Point[],
  textWidth: number,
  obstacles: Rect[],
  ast: SceneAST,
): LabelPlacement {
  let bestIndex = 0;
  let bestLength = -1;
  for (let i = 0; i < points.length - 1; i++) {
    const len = segmentLength(points[i], points[i + 1]);
    if (len > bestLength) {
      bestLength = len;
      bestIndex = i;
    }
  }

  const a = points[bestIndex] ?? { x: 0, y: 0 };
  const b = points[bestIndex + 1] ?? a;
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const horizontal = Math.abs(a.x - b.x) >= Math.abs(a.y - b.y);

  const half = textWidth / 2;
  const halfH = LABEL_BOX_HEIGHT / 2;
  const pad = 8;

  const base = horizontal ? 15 : half + 12;
  const step = horizontal ? LABEL_BOX_HEIGHT + 3 : textWidth + 12;
  const order = horizontal ? [-1, 1] : [1, -1];
  const offsets: number[] = [];
  for (let k = 0; k < 7; k++) {
    for (const sign of order) offsets.push(sign * (base + k * step));
  }

  let fallback: LabelPlacement | null = null;
  let fallbackHits = Number.POSITIVE_INFINITY;

  for (const off of offsets) {
    let cx = horizontal ? mid.x : mid.x + off;
    let cy = horizontal ? mid.y + off : mid.y;
    cx = clamp(cx, pad + half, ast.meta.width - pad - half);
    cy = clamp(cy, pad + halfH, ast.meta.height - pad - halfH);
    const rect: Rect = { x1: cx - half, y1: cy - halfH, x2: cx + half, y2: cy + halfH };
    const hits = overlapCount(rect, obstacles);
    if (hits === 0) return { x: round1(cx), y: round1(cy), rect };
    if (hits < fallbackHits) {
      fallbackHits = hits;
      fallback = { x: round1(cx), y: round1(cy), rect };
    }
  }

  return (
    fallback ?? {
      x: round1(mid.x),
      y: round1(mid.y),
      rect: { x1: mid.x - half, y1: mid.y - halfH, x2: mid.x + half, y2: mid.y + halfH },
    }
  );
}

function clamp(n: number, min: number, max: number): number {
  if (max < min) return n;
  return Math.min(max, Math.max(min, n));
}

function clampPointToScene(point: Point, ast: SceneAST): Point {
  const pad = 14;
  return {
    x: round1(clamp(point.x, pad, ast.meta.width - pad)),
    y: round1(clamp(point.y, pad, ast.meta.height - pad)),
  };
}

function routeLength(points: Point[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) total += segmentLength(points[i], points[i + 1]);
  return total;
}

function routeBends(points: Point[]): number {
  let bends = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const next = points[i + 1];
    const dx1 = Math.sign(cur.x - prev.x);
    const dy1 = Math.sign(cur.y - prev.y);
    const dx2 = Math.sign(next.x - cur.x);
    const dy2 = Math.sign(next.y - cur.y);
    if (dx1 !== dx2 || dy1 !== dy2) bends++;
  }
  return bends;
}

/**
 * Picks an orthogonal route between two actors that crosses as few other
 * actors as possible.
 *
 * Strategy: generate a handful of candidate polylines (direct, mid-x dogleg,
 * mid-y dogleg, and detours above/below every obstacle), score each by how
 * many obstacle rectangles it clips, and keep the best. `lane` offsets the
 * dogleg so several concurrent edges between the same pair don't overlap.
 */
export function routeFlowPath(
  sourceName: string,
  targetName: string,
  sourceState: ActorState,
  targetState: ActorState,
  states: Map<string, ActorState>,
  ast: SceneAST,
  lane: number,
): Point[] {
  const sourceType = ast.actors[sourceName]?.type ?? "box";
  const targetType = ast.actors[targetName]?.type ?? "box";
  const sourceRect = actorRect(sourceState, sourceType);
  const targetRect = actorRect(targetState, targetType);
  const laneShift = lane * 18;

  const sourceCenter = actorCenter(sourceState, sourceType);
  const targetCenter = actorCenter(targetState, targetType);

  // Leave from whichever face points at the target: side faces when the
  // actors are mostly side-by-side, top/bottom faces when mostly stacked.
  const horizontalPrimary =
    Math.abs(targetCenter.x - sourceCenter.x) >= Math.abs(targetCenter.y - sourceCenter.y);

  const source: Point = horizontalPrimary
    ? { x: targetCenter.x >= sourceCenter.x ? sourceRect.x2 : sourceRect.x1, y: sourceCenter.y }
    : { x: sourceCenter.x, y: targetCenter.y >= sourceCenter.y ? sourceRect.y2 : sourceRect.y1 };

  const target: Point = horizontalPrimary
    ? { x: targetCenter.x >= sourceCenter.x ? targetRect.x1 : targetRect.x2, y: targetCenter.y }
    : { x: targetCenter.x, y: targetCenter.y >= sourceCenter.y ? targetRect.y1 : targetRect.y2 };

  const obstacles: Rect[] = [];
  for (const [name, state] of states.entries()) {
    if (name === sourceName || name === targetName) continue;
    const type = ast.actors[name]?.type ?? "box";
    obstacles.push(inflateRect(actorRect(state, type), 8));
  }

  const candidates: Point[][] = [];

  // A straight shot is only valid when the endpoints already share an axis.
  if (Math.abs(source.y - target.y) < 0.001 || Math.abs(source.x - target.x) < 0.001) {
    candidates.push([source, target]);
  }

  const midX = round1((source.x + target.x) / 2 + laneShift);
  const midY = round1((source.y + target.y) / 2 + laneShift);
  candidates.push(
    [source, { x: midX, y: source.y }, { x: midX, y: target.y }, target],
    [source, { x: source.x, y: midY }, { x: target.x, y: midY }, target],
  );

  const minObstacleY = obstacles.length
    ? Math.min(...obstacles.map((o) => o.y1))
    : Math.min(source.y, target.y);
  const maxObstacleY = obstacles.length
    ? Math.max(...obstacles.map((o) => o.y2))
    : Math.max(source.y, target.y);
  const topLane = Math.max(16, minObstacleY - 24 - lane * 12);
  const bottomLane = Math.min(ast.meta.height - 16, maxObstacleY + 24 + lane * 12);
  candidates.push(
    [source, { x: source.x, y: topLane }, { x: target.x, y: topLane }, target],
    [source, { x: source.x, y: bottomLane }, { x: target.x, y: bottomLane }, target],
  );

  const minObstacleX = obstacles.length
    ? Math.min(...obstacles.map((o) => o.x1))
    : Math.min(source.x, target.x);
  const maxObstacleX = obstacles.length
    ? Math.max(...obstacles.map((o) => o.x2))
    : Math.max(source.x, target.x);
  const leftLane = Math.max(16, minObstacleX - 24 - lane * 12);
  const rightLane = Math.min(ast.meta.width - 16, maxObstacleX + 24 + lane * 12);
  candidates.push(
    [source, { x: leftLane, y: source.y }, { x: leftLane, y: target.y }, target],
    [source, { x: rightLane, y: source.y }, { x: rightLane, y: target.y }, target],
  );

  let best = candidates[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const hits = countPathIntersections(candidate, obstacles);
    const score = hits * 100000 + routeBends(candidate) * 800 + routeLength(candidate);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best.map((point) => clampPointToScene(point, ast));
}
