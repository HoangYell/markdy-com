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

export function toPathD(points: Point[], cornerRadius = 14): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    const [a, b] = points;
    return `M ${round1(a.x)} ${round1(a.y)} L ${round1(b.x)} ${round1(b.y)}`;
  }
  if (cornerRadius <= 0) {
    return points.map((p, i) => (i === 0 ? `M ${round1(p.x)} ${round1(p.y)}` : `L ${round1(p.x)} ${round1(p.y)}`)).join(" ");
  }

  const parts: string[] = [`M ${round1(points[0].x)} ${round1(points[0].y)}`];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const next = points[i + 1];
    if (!next) {
      parts.push(`L ${round1(cur.x)} ${round1(cur.y)}`);
      continue;
    }
    const dx1 = cur.x - prev.x;
    const dy1 = cur.y - prev.y;
    const dx2 = next.x - cur.x;
    const dy2 = next.y - cur.y;
    const len1 = Math.hypot(dx1, dy1);
    const len2 = Math.hypot(dx2, dy2);
    if (len1 < 0.5 || len2 < 0.5) {
      parts.push(`L ${round1(cur.x)} ${round1(cur.y)}`);
      continue;
    }
    const r = Math.min(cornerRadius, len1 / 2, len2 / 2);
    const bx = cur.x - (dx1 / len1) * r;
    const by = cur.y - (dy1 / len1) * r;
    const ax = cur.x + (dx2 / len2) * r;
    const ay = cur.y + (dy2 / len2) * r;
    parts.push(`L ${round1(bx)} ${round1(by)}`);
    parts.push(`Q ${round1(cur.x)} ${round1(cur.y)} ${round1(ax)} ${round1(ay)}`);
  }
  return parts.join(" ");
}

/** Self-loop arc above a node card. */
export function selfLoopPath(rect: { x: number; y: number; width: number; height: number }): Point[] {
  const top = rect.y;
  const left = rect.x + rect.width * 0.3;
  const right = rect.x + rect.width * 0.7;
  const apex = top - 40;
  return [
    { x: round1(left), y: round1(top) },
    { x: round1(left), y: round1(apex) },
    { x: round1(right), y: round1(apex) },
    { x: round1(right), y: round1(top) },
  ];
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
  const offset = lane * 10;
  if (Math.abs(a.x - b.x) >= Math.abs(a.y - b.y)) {
    return { x: round1(mid.x), y: round1(mid.y - 12 - offset) };
  }
  return { x: round1(mid.x + 12 + offset), y: round1(mid.y) };
}

export interface LabelPlacement {
  x: number;
  y: number;
  rect: Rect;
}

const LABEL_BOX_HEIGHT = 20;

function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
}

function overlapCount(rect: Rect, obstacles: Rect[]): number {
  let hits = 0;
  for (const o of obstacles) if (rectsOverlap(rect, o)) hits++;
  return hits;
}

/**
 * Chooses a readable anchor for an edge label: it steps perpendicular to the
 * edge's longest segment until the label box clears every obstacle (node boxes
 * and already-placed labels), staying inside the scene. The least-crowded
 * candidate wins if nothing is fully clear.
 */
export function placeFlowLabel(
  points: Point[],
  textWidth: number,
  obstacles: Rect[],
  bounds: { width: number; height: number },
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
  const pad = 10;

  const base = horizontal ? 16 : half + 14;
  const step = horizontal ? LABEL_BOX_HEIGHT + 6 : textWidth + 14;
  const order = horizontal ? [-1, 1] : [1, -1];
  const offsets: number[] = [];
  for (let k = 0; k < 8; k++) {
    for (const sign of order) offsets.push(sign * (base + k * step));
  }

  let fallback: LabelPlacement | null = null;
  let fallbackHits = Number.POSITIVE_INFINITY;

  for (const off of offsets) {
    const cx = clamp(horizontal ? mid.x : mid.x + off, pad + half, bounds.width - pad - half);
    const cy = clamp(horizontal ? mid.y + off : mid.y, pad + halfH, bounds.height - pad - halfH);
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

function clampPointToScene(point: Point, bounds: { width: number; height: number }): Point {
  const pad = 16;
  return {
    x: round1(clamp(point.x, pad, bounds.width - pad)),
    y: round1(clamp(point.y, pad, bounds.height - pad)),
  };
}

function laneOffset(lane: number): number {
  if (lane <= 0) return 0;
  const step = Math.ceil(lane / 2);
  return (lane % 2 === 1 ? 1 : -1) * step * 16;
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

export function cleanCollinearPoints(points: Point[]): Point[] {
  if (points.length <= 2) return points;
  const result: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1];
    const cur = points[i];
    const next = points[i + 1];

    const isCollinearX = Math.abs(prev.x - cur.x) < 0.01 && Math.abs(cur.x - next.x) < 0.01;
    const isCollinearY = Math.abs(prev.y - cur.y) < 0.01 && Math.abs(cur.y - next.y) < 0.01;
    const isDuplicate = Math.abs(prev.x - cur.x) < 0.01 && Math.abs(prev.y - cur.y) < 0.01;

    if (!isCollinearX && !isCollinearY && !isDuplicate) {
      result.push(cur);
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

/**
 * Picks an orthogonal route between two node rectangles that crosses as few
 * other nodes as possible.
 *
 * Strategy: generate candidate polylines (direct, mid-x dogleg, mid-y dogleg,
 * and clear channel bypasses around obstacles), score each by obstacle hits,
 * bends, and length. `lane` offsets concurrent edges to avoid overlapping.
 */
export function routeOrthogonal(
  sourceRect: Rect,
  targetRect: Rect,
  obstacles: Rect[],
  bounds: { width: number; height: number },
  lane = 0,
): Point[] {
  const laneShift = laneOffset(lane);
  const sourceCenter = rectCenter(sourceRect);
  const targetCenter = rectCenter(targetRect);

  const horizontalPrimary =
    Math.abs(targetCenter.x - sourceCenter.x) >= Math.abs(targetCenter.y - sourceCenter.y);

  const sourceRight = targetCenter.x >= sourceCenter.x;
  const targetLeft = targetCenter.x >= sourceCenter.x;
  const sourceDown = targetCenter.y >= sourceCenter.y;
  const targetUp = targetCenter.y >= sourceCenter.y;

  const source: Point = horizontalPrimary
    ? {
        x: sourceRight ? sourceRect.x2 : sourceRect.x1,
        y: clamp(sourceCenter.y + laneShift, sourceRect.y1 + 16, sourceRect.y2 - 16),
      }
    : {
        x: clamp(sourceCenter.x + laneShift, sourceRect.x1 + 20, sourceRect.x2 - 20),
        y: sourceDown ? sourceRect.y2 : sourceRect.y1,
      };

  const target: Point = horizontalPrimary
    ? {
        x: targetLeft ? targetRect.x1 : targetRect.x2,
        y: clamp(targetCenter.y + laneShift, targetRect.y1 + 16, targetRect.y2 - 16),
      }
    : {
        x: clamp(targetCenter.x + laneShift, targetRect.x1 + 20, targetRect.x2 - 20),
        y: targetUp ? targetRect.y1 : targetRect.y2,
      };

  // Exit/entry stubs to ensure initial trajectory is perpendicular to node boundary
  const stubLen = 18;
  const sStub: Point = horizontalPrimary
    ? { x: source.x + (sourceRight ? stubLen : -stubLen), y: source.y }
    : { x: source.x, y: source.y + (sourceDown ? stubLen : -stubLen) };

  const tStub: Point = horizontalPrimary
    ? { x: target.x + (targetLeft ? -stubLen : stubLen), y: target.y }
    : { x: target.x, y: target.y + (targetUp ? -stubLen : stubLen) };

  const infl = obstacles.map((o) => inflateRect(o, 10));
  const candidates: Point[][] = [];

  // 1. Direct shot if endpoints share an axis
  if (Math.abs(source.y - target.y) < 0.001 || Math.abs(source.x - target.x) < 0.001) {
    candidates.push([source, target]);
  }

  // 2. Mid-X and Mid-Y doglegs with perpendicular stubs
  const midX = round1((source.x + target.x) / 2 + laneShift);
  const midY = round1((source.y + target.y) / 2 + laneShift);

  candidates.push(
    [source, sStub, { x: midX, y: source.y }, { x: midX, y: target.y }, tStub, target],
    [source, sStub, { x: source.x, y: midY }, { x: target.x, y: midY }, tStub, target],
    [source, { x: midX, y: source.y }, { x: midX, y: target.y }, target],
    [source, { x: source.x, y: midY }, { x: target.x, y: midY }, target],
  );

  // 3. Detour lanes around all obstacle boundaries
  const minObstacleY = infl.length ? Math.min(...infl.map((o) => o.y1)) : Math.min(source.y, target.y);
  const maxObstacleY = infl.length ? Math.max(...infl.map((o) => o.y2)) : Math.max(source.y, target.y);
  const topLane = Math.max(20, minObstacleY - 28 - lane * 14);
  const bottomLane = Math.min(bounds.height - 20, maxObstacleY + 28 + lane * 14);
  candidates.push(
    [source, sStub, { x: sStub.x, y: topLane }, { x: tStub.x, y: topLane }, tStub, target],
    [source, sStub, { x: sStub.x, y: bottomLane }, { x: tStub.x, y: bottomLane }, tStub, target],
  );

  const minObstacleX = infl.length ? Math.min(...infl.map((o) => o.x1)) : Math.min(source.x, target.x);
  const maxObstacleX = infl.length ? Math.max(...infl.map((o) => o.x2)) : Math.max(source.x, target.x);
  const leftLane = Math.max(20, minObstacleX - 28 - lane * 14);
  const rightLane = Math.min(bounds.width - 20, maxObstacleX + 28 + lane * 14);
  candidates.push(
    [source, sStub, { x: leftLane, y: sStub.y }, { x: leftLane, y: tStub.y }, tStub, target],
    [source, sStub, { x: rightLane, y: sStub.y }, { x: rightLane, y: tStub.y }, tStub, target],
  );

  let best = candidates[0];
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const cleaned = cleanCollinearPoints(candidate);
    const hits = countPathIntersections(cleaned, infl);
    const score = hits * 100000 + routeBends(cleaned) * 800 + routeLength(cleaned);
    if (score < bestScore) {
      best = cleaned;
      bestScore = score;
    }
  }
  return cleanCollinearPoints(best.map((point) => clampPointToScene(point, bounds)));
}
