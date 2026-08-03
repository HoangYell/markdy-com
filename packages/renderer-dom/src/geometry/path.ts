/**
 * Polyline construction, measurement, and obstacle-aware routing for flow
 * edges. Like `rect.ts` this is DOM-free: the router returns plain points and
 * the caller turns them into SVG. Keeping routing pure means the "does this
 * edge dodge the other nodes?" logic can be tested directly.
 */
import type { Point, Rect } from "./rect.js";
import { countPathIntersections, inflateRect, rectCenter } from "./rect.js";

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
  return points[0] ?? { x: 0, y: 0 };
}

function segmentLength(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** Anchors an edge label near the midpoint of the polyline's longest segment. */
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
    return { x: round1(mid.x), y: round1(mid.y - 10 - offset) };
  }
  return { x: round1(mid.x + 10 + offset), y: round1(mid.y) };
}

function clamp(n: number, min: number, max: number): number {
  if (max < min) return n;
  return Math.min(max, Math.max(min, n));
}

function clampPointToScene(point: Point, bounds: { width: number; height: number }): Point {
  const pad = 14;
  return {
    x: round1(clamp(point.x, pad, bounds.width - pad)),
    y: round1(clamp(point.y, pad, bounds.height - pad)),
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
 * Picks an orthogonal route between two node rectangles that crosses as few
 * other nodes as possible.
 *
 * Strategy: generate a handful of candidate polylines (direct, mid-x dogleg,
 * mid-y dogleg, and detours above/below/around every obstacle), score each by
 * how many obstacle rectangles it clips, and keep the best. `lane` offsets the
 * dogleg so several concurrent edges between the same pair don't overlap.
 */
export function routeOrthogonal(
  sourceRect: Rect,
  targetRect: Rect,
  obstacles: Rect[],
  bounds: { width: number; height: number },
  lane = 0,
): Point[] {
  const laneShift = lane * 18;
  const sourceCenter = rectCenter(sourceRect);
  const targetCenter = rectCenter(targetRect);

  // Leave from whichever face points at the target: side faces when the nodes
  // are mostly side-by-side, top/bottom faces when mostly stacked.
  const horizontalPrimary =
    Math.abs(targetCenter.x - sourceCenter.x) >= Math.abs(targetCenter.y - sourceCenter.y);

  const source: Point = horizontalPrimary
    ? { x: targetCenter.x >= sourceCenter.x ? sourceRect.x2 : sourceRect.x1, y: sourceCenter.y }
    : { x: sourceCenter.x, y: targetCenter.y >= sourceCenter.y ? sourceRect.y2 : sourceRect.y1 };

  const target: Point = horizontalPrimary
    ? { x: targetCenter.x >= sourceCenter.x ? targetRect.x1 : targetRect.x2, y: targetCenter.y }
    : { x: targetCenter.x, y: targetCenter.y >= sourceCenter.y ? targetRect.y1 : targetRect.y2 };

  const infl = obstacles.map((o) => inflateRect(o, 8));
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

  const minObstacleY = infl.length ? Math.min(...infl.map((o) => o.y1)) : Math.min(source.y, target.y);
  const maxObstacleY = infl.length ? Math.max(...infl.map((o) => o.y2)) : Math.max(source.y, target.y);
  const topLane = Math.max(16, minObstacleY - 24 - lane * 12);
  const bottomLane = Math.min(bounds.height - 16, maxObstacleY + 24 + lane * 12);
  candidates.push(
    [source, { x: source.x, y: topLane }, { x: target.x, y: topLane }, target],
    [source, { x: source.x, y: bottomLane }, { x: target.x, y: bottomLane }, target],
  );

  const minObstacleX = infl.length ? Math.min(...infl.map((o) => o.x1)) : Math.min(source.x, target.x);
  const maxObstacleX = infl.length ? Math.max(...infl.map((o) => o.x2)) : Math.max(source.x, target.x);
  const leftLane = Math.max(16, minObstacleX - 24 - lane * 12);
  const rightLane = Math.min(bounds.width - 16, maxObstacleX + 24 + lane * 12);
  candidates.push(
    [source, { x: leftLane, y: source.y }, { x: leftLane, y: target.y }, target],
    [source, { x: rightLane, y: source.y }, { x: rightLane, y: target.y }, target],
  );

  let best = candidates[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const hits = countPathIntersections(candidate, infl);
    const score = hits * 100000 + routeBends(candidate) * 800 + routeLength(candidate);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best.map((point) => clampPointToScene(point, bounds));
}
