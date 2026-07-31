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

  let best = candidates[0];
  let bestHits = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const hits = countPathIntersections(candidate, obstacles);
    if (hits < bestHits) {
      best = candidate;
      bestHits = hits;
      if (hits === 0) break;
    }
  }
  return best;
}
