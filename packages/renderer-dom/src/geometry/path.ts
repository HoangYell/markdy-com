/**
 * Polyline construction, measurement, and obstacle-aware routing for flow
 * edges. DOM-free pure 2D geometry functions.
 */
import type { Point, Rect } from "./rect.js";
import { countPathIntersections, inflateRect, rectCenter, rectsOverlap } from "./rect.js";

/** Rounds to one decimal so generated SVG path data stays compact. */
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export interface HopCrossing {
  x: number;
  y: number;
}

/**
 * Finds perpendicular crossings of a straight segment with other polylines,
 * ignoring grazing endpoints or corners.
 */
export function findSegmentHops(
  p1: Point,
  p2: Point,
  existingPaths: Point[][] = [],
  hopRadius = 5,
  minDistFromVertex = 10,
): Point[] {
  const isHoriz = Math.abs(p1.y - p2.y) < 0.01;
  const isVert = Math.abs(p1.x - p2.x) < 0.01;
  if ((!isHoriz && !isVert) || existingPaths.length === 0) return [];

  const crossings: Point[] = [];
  const minX = Math.min(p1.x, p2.x);
  const maxX = Math.max(p1.x, p2.x);
  const minY = Math.min(p1.y, p2.y);
  const maxY = Math.max(p1.y, p2.y);

  for (const path of existingPaths) {
    for (let j = 0; j < path.length - 1; j++) {
      const q1 = path[j];
      const q2 = path[j + 1];
      const qHoriz = Math.abs(q1.y - q2.y) < 0.01;
      const qVert = Math.abs(q1.x - q2.x) < 0.01;

      if (isHoriz && qVert) {
        const crossX = q1.x;
        const crossY = p1.y;
        const qMinY = Math.min(q1.y, q2.y);
        const qMaxY = Math.max(q1.y, q2.y);

        if (
          crossX > minX + minDistFromVertex &&
          crossX < maxX - minDistFromVertex &&
          crossY > qMinY + 6 &&
          crossY < qMaxY - 6
        ) {
          crossings.push({ x: crossX, y: crossY });
        }
      } else if (isVert && qHoriz) {
        const crossX = p1.x;
        const crossY = q1.y;
        const qMinX = Math.min(q1.x, q2.x);
        const qMaxX = Math.max(q1.x, q2.x);

        if (
          crossX > qMinX + 6 &&
          crossX < qMaxX - 6 &&
          crossY > minY + minDistFromVertex &&
          crossY < maxY - minDistFromVertex
        ) {
          crossings.push({ x: crossX, y: crossY });
        }
      }
    }
  }

  // Sort crossings along the direction of travel from p1 to p2
  crossings.sort((a, b) => {
    const da = Math.hypot(a.x - p1.x, a.y - p1.y);
    const db = Math.hypot(b.x - p1.x, b.y - p1.y);
    return da - db;
  });

  return crossings;
}

function appendSegmentWithHops(
  parts: string[],
  start: Point,
  end: Point,
  existingPaths: Point[][] = [],
  hopRadius = 5,
): void {
  const isHoriz = Math.abs(start.y - end.y) < 0.01;
  const isVert = Math.abs(start.x - end.x) < 0.01;
  if ((!isHoriz && !isVert) || existingPaths.length === 0) {
    parts.push(`L ${round1(end.x)} ${round1(end.y)}`);
    return;
  }

  const hops = findSegmentHops(start, end, existingPaths, hopRadius);
  if (hops.length === 0) {
    parts.push(`L ${round1(end.x)} ${round1(end.y)}`);
    return;
  }

  const R = hopRadius;
  if (isHoriz) {
    const dx = end.x - start.x;
    for (const h of hops) {
      if (dx > 0) {
        parts.push(`L ${round1(h.x - R)} ${round1(start.y)}`);
        parts.push(`A ${R} ${R} 0 0 0 ${round1(h.x + R)} ${round1(start.y)}`);
      } else {
        parts.push(`L ${round1(h.x + R)} ${round1(start.y)}`);
        parts.push(`A ${R} ${R} 0 0 1 ${round1(h.x - R)} ${round1(start.y)}`);
      }
    }
    parts.push(`L ${round1(end.x)} ${round1(end.y)}`);
  } else if (isVert) {
    const dy = end.y - start.y;
    for (const h of hops) {
      if (dy > 0) {
        parts.push(`L ${round1(start.x)} ${round1(h.y - R)}`);
        parts.push(`A ${R} ${R} 0 0 1 ${round1(start.x)} ${round1(h.y + R)}`);
      } else {
        parts.push(`L ${round1(start.x)} ${round1(h.y + R)}`);
        parts.push(`A ${R} ${R} 0 0 0 ${round1(start.x)} ${round1(h.y - R)}`);
      }
    }
    parts.push(`L ${round1(end.x)} ${round1(end.y)}`);
  }
}

/**
 * Builds SVG path data with smooth rounded corners at 90-degree elbows
 * and semicircular arc bridge hops over intersecting perpendicular paths.
 */
export function toPathD(points: Point[], cornerRadius = 14, existingPaths: Point[][] = []): string {
  if (points.length < 2) return "";
  if (points.length === 2) {
    const parts = [`M ${round1(points[0].x)} ${round1(points[0].y)}`];
    appendSegmentWithHops(parts, points[0], points[1], existingPaths);
    return parts.join(" ");
  }
  if (cornerRadius <= 0) {
    const parts = [`M ${round1(points[0].x)} ${round1(points[0].y)}`];
    for (let i = 1; i < points.length; i++) {
      appendSegmentWithHops(parts, points[i - 1], points[i], existingPaths);
    }
    return parts.join(" ");
  }

  const parts: string[] = [`M ${round1(points[0].x)} ${round1(points[0].y)}`];
  let prevCornerEnd = points[0];

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const next = points[i + 1];
    if (!next) {
      appendSegmentWithHops(parts, prevCornerEnd, cur, existingPaths);
      continue;
    }
    const dx1 = cur.x - prev.x;
    const dy1 = cur.y - prev.y;
    const dx2 = next.x - cur.x;
    const dy2 = next.y - cur.y;
    const len1 = Math.hypot(dx1, dy1);
    const len2 = Math.hypot(dx2, dy2);
    if (len1 < 0.5 || len2 < 0.5) {
      appendSegmentWithHops(parts, prevCornerEnd, cur, existingPaths);
      prevCornerEnd = cur;
      continue;
    }
    const r = Math.min(cornerRadius, len1 / 2, len2 / 2);
    const bx = cur.x - (dx1 / len1) * r;
    const by = cur.y - (dy1 / len1) * r;
    const ax = cur.x + (dx2 / len2) * r;
    const ay = cur.y + (dy2 / len2) * r;
    appendSegmentWithHops(parts, prevCornerEnd, { x: bx, y: by }, existingPaths);
    parts.push(`Q ${round1(cur.x)} ${round1(cur.y)} ${round1(ax)} ${round1(ay)}`);
    prevCornerEnd = { x: ax, y: ay };
  }
  return parts.join(" ");
}

/** Self-loop arc above a node card (or below if close to the top boundary). */
export function selfLoopPath(
  rect: { x: number; y: number; width: number; height: number },
  bounds?: { width: number; height: number },
): Point[] {
  const top = rect.y;
  const loopHeight = 36;
  if (bounds && top - loopHeight < 16) {
    const bottom = rect.y + rect.height;
    const left = rect.x + rect.width * 0.3;
    const right = rect.x + rect.width * 0.7;
    const apex = Math.min(bounds.height - 16, bottom + loopHeight);
    return [
      { x: round1(right), y: round1(bottom) },
      { x: round1(right), y: round1(apex) },
      { x: round1(left), y: round1(apex) },
      { x: round1(left), y: round1(bottom) },
    ];
  }
  const left = rect.x + rect.width * 0.3;
  const right = rect.x + rect.width * 0.7;
  const apex = Math.max(12, top - loopHeight);
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

const LABEL_BOX_HEIGHT = 18;

function overlapCount(rect: Rect, obstacles: Rect[]): number {
  let hits = 0;
  for (const o of obstacles) if (rectsOverlap(rect, o)) hits++;
  return hits;
}

export function wrapFlowLabelText(text: string, maxAvailableWidth: number): string[] {
  const CHAR_WIDTH = 6.6;
  const PAD = 8;
  const singleLineWidth = text.length * CHAR_WIDTH + PAD;
  if (singleLineWidth <= maxAvailableWidth || (maxAvailableWidth >= 70 && text.length <= 18) || !text.includes(" ")) {
    return [text];
  }

  const words = text.trim().split(/\s+/);
  if (words.length <= 1) return [text];

  let bestSplit = 1;
  let bestBalanceScore = Number.POSITIVE_INFINITY;

  for (let i = 1; i < words.length; i++) {
    const line1 = words.slice(0, i).join(" ");
    const line2 = words.slice(i).join(" ");
    const w1 = line1.length * CHAR_WIDTH + PAD;
    const w2 = line2.length * CHAR_WIDTH + PAD;
    const maxW = Math.max(w1, w2);
    const diff = Math.abs(w1 - w2);

    const penalty = maxW > maxAvailableWidth ? 1000 + (maxW - maxAvailableWidth) * 10 : 0;
    const score = penalty + diff + maxW * 0.1;
    if (score < bestBalanceScore) {
      bestBalanceScore = score;
      bestSplit = i;
    }
  }

  const line1 = words.slice(0, bestSplit).join(" ");
  const line2 = words.slice(bestSplit).join(" ");

  const w1 = line1.length * CHAR_WIDTH + PAD;
  const w2 = line2.length * CHAR_WIDTH + PAD;
  if (Math.max(w1, w2) > maxAvailableWidth && words.length >= 4) {
    const third = Math.ceil(words.length / 3);
    const l1 = words.slice(0, third).join(" ");
    const l2 = words.slice(third, third * 2).join(" ");
    const l3 = words.slice(third * 2).join(" ");
    const max3W = Math.max(l1.length, l2.length, l3.length) * CHAR_WIDTH + PAD;
    if (max3W < Math.max(w1, w2)) {
      return [l1, l2, l3];
    }
  }

  return [line1, line2];
}

/**
 * Chooses a clean, legible anchor position for an edge label.
 * The label plate is centered along the connector line,
 * with candidate offsets resolving collisions with nodes or adjacent labels.
 */
export function placeFlowLabel(
  points: Point[],
  textWidth: number,
  obstacles: Rect[],
  bounds: { width: number; height: number },
  boxHeight = LABEL_BOX_HEIGHT,
): LabelPlacement {
  const halfW = textWidth / 2 + 5;
  const halfH = boxHeight / 2 + 1;
  const pad = 12;

  let bestPlacement: LabelPlacement | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  // Evaluate candidate placements across all segments of the path
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const segLen = segmentLength(a, b);
    if (segLen < 1) continue;

    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const horizontal = Math.abs(a.x - b.x) >= Math.abs(a.y - b.y);

    const candidates: { x: number; y: number; penalty: number }[] = [
      { x: mid.x, y: mid.y, penalty: 0 },
    ];

    // Longitudinal nudges along segment
    for (let k = 1; k <= 4; k++) {
      const stepLong = k * 16;
      if (horizontal) {
        candidates.push(
          { x: mid.x - stepLong, y: mid.y, penalty: k * 4 },
          { x: mid.x + stepLong, y: mid.y, penalty: k * 4 },
        );
      } else {
        candidates.push(
          { x: mid.x, y: mid.y - stepLong, penalty: k * 4 },
          { x: mid.x, y: mid.y + stepLong, penalty: k * 4 },
        );
      }
    }

    // Perpendicular offsets above / below / left / right
    const perpSteps = [halfH + 8, halfH + 22, halfH + 38, halfH + 56];
    perpSteps.forEach((stepPerp, k) => {
      if (horizontal) {
        candidates.push(
          { x: mid.x, y: mid.y - stepPerp, penalty: 20 + k * 8 },
          { x: mid.x, y: mid.y + stepPerp, penalty: 24 + k * 8 },
        );
      } else {
        candidates.push(
          { x: mid.x - stepPerp, y: mid.y, penalty: 20 + k * 8 },
          { x: mid.x + stepPerp, y: mid.y, penalty: 24 + k * 8 },
        );
      }
    });

    for (const cand of candidates) {
      const cx = clamp(cand.x, pad + halfW, bounds.width - pad - halfW);
      const cy = clamp(cand.y, pad + halfH, bounds.height - pad - halfH);
      const rect: Rect = { x1: cx - halfW, y1: cy - halfH, x2: cx + halfW, y2: cy + halfH };
      const hits = overlapCount(rect, obstacles);

      // Score: 0 hits is essential; prefer centered; prefer horizontal segments
      const score = hits * 100000 + (horizontal ? 0 : 40) + cand.penalty - Math.min(100, segLen) * 0.1;
      if (score < bestScore) {
        bestScore = score;
        bestPlacement = { x: round1(cx), y: round1(cy), rect };
      }
    }
  }

  if (bestPlacement) return bestPlacement;

  const firstMid = points.length >= 2 ? { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 } : { x: 0, y: 0 };
  return {
    x: round1(firstMid.x),
    y: round1(firstMid.y),
    rect: { x1: firstMid.x - halfW, y1: firstMid.y - halfH, x2: firstMid.x + halfW, y2: firstMid.y + halfH },
  };
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

export function laneOffset(lane: number): number {
  if (lane === 0) return -8;
  if (lane === 1) return 8;
  if (lane === 2) return -16;
  if (lane === 3) return 16;
  const step = Math.ceil((lane + 1) / 2);
  return (lane % 2 === 1 ? 1 : -1) * step * 8;
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
 * Removes collinear redundant points and micro-segments while preserving genuine 90° corners.
 */
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

interface PortConfig {
  source: Point;
  sStub: Point;
  target: Point;
  tStub: Point;
  dir: "horizontal" | "vertical" | "mixed";
}

/**
 * Intelligently generates orthogonal routes between source and target rectangles
 * with obstacle avoidance, natural port selection, and minimal bends.
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

  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;
  const isDominantVertical = Math.abs(dy) >= Math.abs(dx);

  const stubLen = 18;
  const allObstacles = obstacles;
  const candidates: Point[][] = [];

  // 1. VERTICAL FLOW CANDIDATES
  if (dy >= 20) {
    // 1A. Downward flow (Target is below source)
    let sX = sourceCenter.x;
    let tX = targetCenter.x;
    if (dx > 16) {
      sX = clamp(sourceCenter.x + (lane > 0 ? Math.abs(laneShift) : 6), sourceRect.x1 + 14, sourceRect.x2 - 14);
      tX = clamp(targetCenter.x - (lane > 0 ? Math.abs(laneShift) : 6), targetRect.x1 + 14, targetRect.x2 - 14);
    } else if (dx < -16) {
      sX = clamp(sourceCenter.x - (lane > 0 ? Math.abs(laneShift) : 6), sourceRect.x1 + 14, sourceRect.x2 - 14);
      tX = clamp(targetCenter.x + (lane > 0 ? Math.abs(laneShift) : 6), targetRect.x1 + 14, targetRect.x2 - 14);
    } else {
      sX = clamp(sourceCenter.x + laneShift, sourceRect.x1 + 14, sourceRect.x2 - 14);
      tX = clamp(targetCenter.x + laneShift, targetRect.x1 + 14, targetRect.x2 - 14);
    }
    const sPort: Point = { x: sX, y: sourceRect.y2 };
    const tPort: Point = { x: tX, y: targetRect.y1 };

    if (Math.abs(sX - tX) < 1) {
      candidates.push([sPort, tPort]);
    } else {
      const midY = round1((sPort.y + tPort.y) / 2 + laneShift);
      candidates.push([
        sPort,
        { x: sPort.x, y: midY },
        { x: tPort.x, y: midY },
        tPort,
      ]);
    }

    // Left/Right corridor bypass around intermediary nodes
    let minObstacleX = Math.min(sourceRect.x1, targetRect.x1);
    let maxObstacleX = Math.max(sourceRect.x2, targetRect.x2);
    for (const o of allObstacles) {
      if (o.y2 > sourceRect.y2 && o.y1 < targetRect.y1) {
        minObstacleX = Math.min(minObstacleX, o.x1);
        maxObstacleX = Math.max(maxObstacleX, o.x2);
      }
    }
    const bypassXLeft = Math.max(16, minObstacleX - 24 - Math.abs(laneShift));
    const bypassXRight = Math.min(bounds.width - 16, maxObstacleX + 24 + Math.abs(laneShift));
    candidates.push([
      sPort,
      { x: sPort.x, y: sPort.y + 12 },
      { x: bypassXLeft, y: sPort.y + 12 },
      { x: bypassXLeft, y: tPort.y - 12 },
      { x: tPort.x, y: tPort.y - 12 },
      tPort,
    ]);
    candidates.push([
      sPort,
      { x: sPort.x, y: sPort.y + 12 },
      { x: bypassXRight, y: sPort.y + 12 },
      { x: bypassXRight, y: tPort.y - 12 },
      { x: tPort.x, y: tPort.y - 12 },
      tPort,
    ]);
  } else if (dy <= -20) {
    // 1B. Upward flow (Target is above source - return/loopback in vertical flow)
    let sX = sourceCenter.x;
    let tX = targetCenter.x;
    if (dx > 16) {
      sX = clamp(sourceCenter.x + (lane > 0 ? Math.abs(laneShift) : 6), sourceRect.x1 + 14, sourceRect.x2 - 14);
      tX = clamp(targetCenter.x - (lane > 0 ? Math.abs(laneShift) : 6), targetRect.x1 + 14, targetRect.x2 - 14);
    } else if (dx < -16) {
      sX = clamp(sourceCenter.x - (lane > 0 ? Math.abs(laneShift) : 6), sourceRect.x1 + 14, sourceRect.x2 - 14);
      tX = clamp(targetCenter.x + (lane > 0 ? Math.abs(laneShift) : 6), targetRect.x1 + 14, targetRect.x2 - 14);
    } else {
      sX = clamp(sourceCenter.x + laneShift, sourceRect.x1 + 14, sourceRect.x2 - 14);
      tX = clamp(targetCenter.x + laneShift, targetRect.x1 + 14, targetRect.x2 - 14);
    }
    const sPort: Point = { x: sX, y: sourceRect.y1 };
    const tPort: Point = { x: tX, y: targetRect.y2 };

    if (Math.abs(sX - tX) < 1) {
      candidates.push([sPort, tPort]);
    } else {
      const midY = round1((sPort.y + tPort.y) / 2 + laneShift);
      candidates.push([
        sPort,
        { x: sPort.x, y: midY },
        { x: tPort.x, y: midY },
        tPort,
      ]);
    }

    let minObstacleX = Math.min(sourceRect.x1, targetRect.x1);
    let maxObstacleX = Math.max(sourceRect.x2, targetRect.x2);
    for (const o of allObstacles) {
      if (o.y1 < sourceRect.y2 && o.y2 > targetRect.y1) {
        minObstacleX = Math.min(minObstacleX, o.x1);
        maxObstacleX = Math.max(maxObstacleX, o.x2);
      }
    }
    const bypassXLeft = Math.max(16, minObstacleX - 28 - Math.abs(laneShift));
    const bypassXRight = Math.min(bounds.width - 16, maxObstacleX + 28 + Math.abs(laneShift));

    candidates.push([
      { x: sourceRect.x1, y: sourceCenter.y },
      { x: bypassXLeft, y: sourceCenter.y },
      { x: bypassXLeft, y: targetCenter.y },
      { x: targetRect.x1, y: targetCenter.y },
    ]);
    candidates.push([
      { x: sourceRect.x2, y: sourceCenter.y },
      { x: bypassXRight, y: sourceCenter.y },
      { x: bypassXRight, y: targetCenter.y },
      { x: targetRect.x2, y: targetCenter.y },
    ]);
  }

  // 2. HORIZONTAL FLOW CANDIDATES
  if (dx >= 20) {
    // 2A. Forward LR flow (Target is to the right of source)
    let sY = sourceCenter.y;
    let tY = targetCenter.y;

    if (Math.abs(dy) > 16) {
      const dirSign = Math.sign(dy);
      sY = clamp(sourceCenter.y + dirSign * 12, sourceRect.y1 + 10, sourceRect.y2 - 10);
      tY = clamp(targetCenter.y - dirSign * 12, targetRect.y1 + 10, targetRect.y2 - 10);
    } else {
      const fwdShift = lane > 0 ? (lane % 2 === 1 ? -10 : -18) : 0;
      sY = clamp(sourceCenter.y + fwdShift, sourceRect.y1 + 10, sourceRect.y2 - 10);
      tY = clamp(targetCenter.y + fwdShift, targetRect.y1 + 10, targetRect.y2 - 10);
    }

    const sPort: Point = { x: sourceRect.x2, y: sY };
    const tPort: Point = { x: targetRect.x1, y: tY };

    if (Math.abs(sY - tY) < 1) {
      candidates.push([sPort, tPort]);
    } else {
      const rawMidX = (sPort.x + tPort.x) / 2 + laneShift;
      const midX = round1(clamp(rawMidX, sourceRect.x2 + 8, targetRect.x1 - 8));
      candidates.push([
        sPort,
        { x: midX, y: sY },
        { x: midX, y: tY },
        tPort,
      ]);
    }

    let minObstacleY = Math.min(sourceRect.y1, targetRect.y1);
    for (const o of allObstacles) {
      if (o.x2 > sourceRect.x2 && o.x1 < targetRect.x1) {
        minObstacleY = Math.min(minObstacleY, o.y1);
      }
    }
    const bypassYTop = Math.max(16, minObstacleY - 24 - Math.abs(laneShift));
    candidates.push([
      { x: sourceCenter.x, y: sourceRect.y1 },
      { x: sourceCenter.x, y: bypassYTop },
      { x: targetCenter.x, y: bypassYTop },
      { x: targetCenter.x, y: targetRect.y1 },
    ]);
  } else if (dx <= -20) {
    // 2B. Backward / detour flow (Target is to the left of source)
    const sX = clamp(sourceCenter.x + (lane > 0 ? (lane % 2 === 1 ? 8 : -8) : 0), sourceRect.x1 + 16, sourceRect.x2 - 16);
    const tX = clamp(targetCenter.x + (lane > 0 ? (lane % 2 === 1 ? 8 : -8) : 0), targetRect.x1 + 16, targetRect.x2 - 16);

    let minObstacleY = Math.min(sourceRect.y1, targetRect.y1);
    for (const o of allObstacles) {
      if (o.x2 > targetRect.x1 && o.x1 < sourceRect.x2) {
        minObstacleY = Math.min(minObstacleY, o.y1);
      }
    }
    const highwayYTop = Math.max(16, minObstacleY - 28 - Math.abs(laneShift));
    candidates.push([
      { x: sX, y: sourceRect.y1 },
      { x: sX, y: highwayYTop },
      { x: tX, y: highwayYTop },
      { x: tX, y: targetRect.y1 },
    ]);

    let maxObstacleY = Math.max(sourceRect.y2, targetRect.y2);
    for (const o of allObstacles) {
      if (o.x2 > targetRect.x1 && o.x1 < sourceRect.x2) {
        maxObstacleY = Math.max(maxObstacleY, o.y2);
      }
    }
    const highwayYBottom = Math.min(bounds.height - 16, maxObstacleY + 28 + Math.abs(laneShift));
    candidates.push([
      { x: sX, y: sourceRect.y2 },
      { x: sX, y: highwayYBottom },
      { x: tX, y: highwayYBottom },
      { x: tX, y: targetRect.y2 },
    ]);

    let sY = sourceCenter.y;
    let tY = targetCenter.y;
    if (Math.abs(dy) > 16) {
      const dirSign = Math.sign(dy);
      sY = clamp(sourceCenter.y + dirSign * 12, sourceRect.y1 + 10, sourceRect.y2 - 10);
      tY = clamp(targetCenter.y - dirSign * 12, targetRect.y1 + 10, targetRect.y2 - 10);
    } else {
      const retShift = lane > 0 ? (lane % 2 === 1 ? 10 : 18) : 10;
      sY = clamp(sourceCenter.y + retShift, sourceRect.y1 + 10, sourceRect.y2 - 10);
      tY = clamp(targetCenter.y + retShift, targetRect.y1 + 10, targetRect.y2 - 10);
    }
    const sPortL: Point = { x: sourceRect.x1, y: sY };
    const tPortR: Point = { x: targetRect.x2, y: tY };
    const midX = round1((sPortL.x + tPortR.x) / 2 + laneShift);
    candidates.push([
      sPortL,
      { x: midX, y: sY },
      { x: midX, y: tY },
      tPortR,
    ]);
  }

  // 3. Obstacle-specific bypasses
  for (const obstacle of allObstacles) {
    const bypassYTop = Math.max(16, obstacle.y1 - 18 - Math.abs(laneShift));
    const bypassYBottom = Math.min(bounds.height - 16, obstacle.y2 + 18 + Math.abs(laneShift));
    const sourceRight = dx >= 0;
    const targetLeft = dx >= 0;
    const sP = { x: sourceRight ? sourceRect.x2 : sourceRect.x1, y: sourceCenter.y };
    const tP = { x: targetLeft ? targetRect.x1 : targetRect.x2, y: targetCenter.y };
    candidates.push([
      sP,
      { x: sP.x + (sourceRight ? stubLen : -stubLen), y: sP.y },
      { x: sP.x + (sourceRight ? stubLen : -stubLen), y: bypassYTop },
      { x: tP.x + (targetLeft ? -stubLen : stubLen), y: bypassYTop },
      { x: tP.x + (targetLeft ? -stubLen : stubLen), y: tP.y },
      tP,
    ]);
    candidates.push([
      sP,
      { x: sP.x + (sourceRight ? stubLen : -stubLen), y: sP.y },
      { x: sP.x + (sourceRight ? stubLen : -stubLen), y: bypassYBottom },
      { x: tP.x + (targetLeft ? -stubLen : stubLen), y: bypassYBottom },
      { x: tP.x + (targetLeft ? -stubLen : stubLen), y: tP.y },
      tP,
    ]);
  }

  // Fallback candidate if none generated
  if (candidates.length === 0) {
    candidates.push([
      { x: sourceCenter.x, y: sourceCenter.y },
      { x: targetCenter.x, y: targetCenter.y },
    ]);
  }

  // Score candidate paths and pick the cleanest route
  let best = candidates[0];
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const cleaned = cleanCollinearPoints(candidate);
    const hits = countPathIntersections(cleaned, allObstacles);
    const bends = routeBends(cleaned);
    const length = routeLength(cleaned);

    let portPenalty = 0;
    const startP = cleaned[0];
    const endP = cleaned[cleaned.length - 1];

    if (isDominantVertical) {
      if (dy >= 20) {
        // Downward vertical: prefer exiting bottom and entering top
        if (Math.abs(startP.y - sourceRect.y1) < 1) portPenalty += 25000;
        if (Math.abs(endP.y - targetRect.y2) < 1) portPenalty += 25000;
      } else if (dy <= -20) {
        // Upward vertical: prefer exiting top and entering bottom
        if (Math.abs(startP.y - sourceRect.y2) < 1) portPenalty += 25000;
        if (Math.abs(endP.y - targetRect.y1) < 1) portPenalty += 25000;
      }
    } else {
      if (dx >= 20) {
        // Forward horizontal: prefer exiting right and entering left
        if (Math.abs(startP.x - sourceRect.x1) < 1) portPenalty += 25000;
        if (Math.abs(endP.x - targetRect.x2) < 1) portPenalty += 25000;
      } else if (dx <= -20) {
        // Backward horizontal: prefer exiting left and entering right
        if (Math.abs(startP.x - sourceRect.x2) < 1) portPenalty += 25000;
        if (Math.abs(endP.x - targetRect.x1) < 1) portPenalty += 25000;
      }
    }

    // Prefer 0 obstacle hits, natural port orientation, minimal bends, shortest Manhattan length
    const score = hits * 1000000 + portPenalty + bends * 500 + length;
    if (score < bestScore) {
      bestScore = score;
      best = cleaned;
    }
  }

  return cleanCollinearPoints(best.map((p) => clampPointToScene(p, bounds)));
}

/**
 * Routes hierarchical parent-to-child edges in tree diagrams.
 * - In portrait/vertical indented outline trees: routes cleanly down the parent trunk corridor,
 *   with horizontal branches into each child's left-center edge, matching the layout structure.
 * - In landscape trees: routes down from parent bottom-center, along a horizontal branch bus,
 *   and down into child top-center.
 */
export function routeTreeEdgePoints(
  from: { x: number; y: number; width: number; height: number },
  to: { x: number; y: number; width: number; height: number },
  lane: number,
  isVertical: boolean,
  bounds: { width: number; height: number },
): Point[] | null {
  // Only apply tree routing for downward/descendant flows
  if (to.y < from.y + from.height - 12) return null;

  if (isVertical) {
    // Vertical indented tree outline (Portrait)
    // If child is positioned to the left of parent, it is not an indented descendant
    if (to.x < from.x - 4) return null;

    // If child is directly below parent with no indentation (same column)
    if (Math.abs(to.x - from.x) < 4) {
      const pX = round1(from.x + from.width / 2);
      const cX = round1(to.x + to.width / 2);
      return cleanCollinearPoints([
        { x: pX, y: from.y + from.height },
        { x: cX, y: to.y },
      ].map((p) => clampPointToScene(p, bounds)));
    }

    // Base trunk runs down along the parent indentation corridor
    const trunkBaseX = Math.round((from.x + 18) / 4) * 4;
    const maxShift = Math.max(0, Math.min(16, (to.x - from.x) / 3));
    const shift = lane === 0 ? 0 : -Math.min(maxShift, lane * 4);
    const trunkX = trunkBaseX + shift;
    const fromY = from.y + from.height;
    const toY = round1(to.y + to.height / 2);

    const raw: Point[] = [
      { x: trunkX, y: fromY },
      { x: trunkX, y: toY },
      { x: to.x, y: toY },
    ];
    return cleanCollinearPoints(raw.map((p) => clampPointToScene(p, bounds)));
  } else {
    // Horizontal landscape tree (Desktop)
    const pX = round1(from.x + from.width / 2);
    const pY = from.y + from.height;
    const cX = round1(to.x + to.width / 2);
    const cY = to.y;

    if (Math.abs(pX - cX) < 2) {
      return cleanCollinearPoints([
        { x: pX, y: pY },
        { x: cX, y: cY },
      ].map((p) => clampPointToScene(p, bounds)));
    }

    const branchY = round1((pY + cY) / 2);
    const laneShift = lane === 0 ? 0 : (lane % 2 === 1 ? 1 : -1) * Math.ceil(lane / 2) * 5;
    const midY = round1(branchY + laneShift);

    const raw: Point[] = [
      { x: pX, y: pY },
      { x: pX, y: midY },
      { x: cX, y: midY },
      { x: cX, y: cY },
    ];
    return cleanCollinearPoints(raw.map((p) => clampPointToScene(p, bounds)));
  }
}
