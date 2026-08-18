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
        parts.push(`A ${R} ${R} 0 0 0 ${round1(h.x - R)} ${round1(start.y)}`);
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
        parts.push(`A ${R} ${R} 0 0 1 ${round1(start.x)} ${round1(h.y - R)}`);
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

/**
 * Chooses a clean, legible anchor position for an edge label.
 * The label plate is snugly attached directly along the connector line,
 * and candidate offsets resolve collisions with nodes or adjacent labels.
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

  const halfW = textWidth / 2 + 5;
  const halfH = LABEL_BOX_HEIGHT / 2 + 1;
  const pad = 12;

  // Prioritize 0 (sitting snugly on the connector segment), then test small tight offsets
  const offsets: number[] = [0];
  const order = horizontal ? [-1, 1] : [1, -1];
  for (let k = 1; k <= 6; k++) {
    for (const sign of order) {
      offsets.push(sign * (horizontal ? k * 14 : k * (textWidth + 8)));
    }
  }

  let fallback: LabelPlacement | null = null;
  let fallbackHits = Number.POSITIVE_INFINITY;

  for (const off of offsets) {
    const cx = clamp(horizontal ? mid.x : mid.x + off, pad + halfW, bounds.width - pad - halfW);
    const cy = clamp(horizontal ? mid.y + off : mid.y, pad + halfH, bounds.height - pad - halfH);
    const rect: Rect = { x1: cx - halfW, y1: cy - halfH, x2: cx + halfW, y2: cy + halfH };
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
      rect: { x1: mid.x - halfW, y1: mid.y - halfH, x2: mid.x + halfW, y2: mid.y + halfH },
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

  const sourceRight = dx >= 0;
  const targetLeft = dx >= 0;
  const sourceDown = dy >= 0;
  const targetUp = dy >= 0;

  const stubLen = 18;
  const infl = obstacles.map((o) => inflateRect(o, 12));

  // Build candidate port configurations
  const portConfigs: PortConfig[] = [];

  // 1. Primary horizontal ports (standard LR flow or backward RL flow)
  const sHoriz: Point = {
    x: sourceRight ? sourceRect.x2 : sourceRect.x1,
    y: clamp(sourceCenter.y + laneShift, sourceRect.y1 + 14, sourceRect.y2 - 14),
  };
  const sHorizStub: Point = {
    x: sHoriz.x + (sourceRight ? stubLen : -stubLen),
    y: sHoriz.y,
  };
  const tHoriz: Point = {
    x: targetLeft ? targetRect.x1 : targetRect.x2,
    y: clamp(targetCenter.y + laneShift, targetRect.y1 + 14, targetRect.y2 - 14),
  };
  const tHorizStub: Point = {
    x: tHoriz.x + (targetLeft ? -stubLen : stubLen),
    y: tHoriz.y,
  };

  portConfigs.push({
    source: sHoriz,
    sStub: sHorizStub,
    target: tHoriz,
    tStub: tHorizStub,
    dir: "horizontal",
  });

  // 2. Primary vertical ports (TB flow)
  const sVert: Point = {
    x: clamp(sourceCenter.x + laneShift, sourceRect.x1 + 16, sourceRect.x2 - 16),
    y: sourceDown ? sourceRect.y2 : sourceRect.y1,
  };
  const sVertStub: Point = {
    x: sVert.x,
    y: sVert.y + (sourceDown ? stubLen : -stubLen),
  };
  const tVert: Point = {
    x: clamp(targetCenter.x + laneShift, targetRect.x1 + 16, targetRect.x2 - 16),
    y: targetUp ? targetRect.y1 : targetRect.y2,
  };
  const tVertStub: Point = {
    x: tVert.x,
    y: tVert.y + (targetUp ? -stubLen : stubLen),
  };

  portConfigs.push({
    source: sVert,
    sStub: sVertStub,
    target: tVert,
    tStub: tVertStub,
    dir: "vertical",
  });

  // 3. For backward/detour flows, also consider exit-bottom / enter-bottom or exit-top / enter-top
  if (!sourceRight) {
    // Backward edge (source is to the right of target)
    portConfigs.push({
      source: { x: sourceRect.x1, y: sHoriz.y },
      sStub: { x: sourceRect.x1 - stubLen, y: sHoriz.y },
      target: { x: targetRect.x2, y: tHoriz.y },
      tStub: { x: targetRect.x2 + stubLen, y: tHoriz.y },
      dir: "horizontal",
    });
  }

  const candidates: Point[][] = [];

  for (const cfg of portConfigs) {
    const { source, sStub, target, tStub } = cfg;

    // A. Direct shot if endpoints share an axis and face each other
    if (
      (Math.abs(source.y - target.y) < 0.001 && cfg.dir === "horizontal") ||
      (Math.abs(source.x - target.x) < 0.001 && cfg.dir === "vertical")
    ) {
      candidates.push([source, target]);
    }

    // B. Mid-channel doglegs with perpendicular stubs
    const midX = round1((sStub.x + tStub.x) / 2 + laneShift);
    const midY = round1((sStub.y + tStub.y) / 2 + laneShift);

    // Z-dogleg horizontal-first
    candidates.push(
      [source, sStub, { x: midX, y: sStub.y }, { x: midX, y: tStub.y }, tStub, target],
      [source, { x: midX, y: source.y }, { x: midX, y: target.y }, target],
    );

    // Z-dogleg vertical-first
    candidates.push(
      [source, sStub, { x: sStub.x, y: midY }, { x: tStub.x, y: midY }, tStub, target],
      [source, { x: source.x, y: midY }, { x: target.x, y: midY }, target],
    );

    // C. Obstacle-specific bypass channels
    for (const obstacle of infl) {
      // Top channel bypass around this obstacle
      const bypassYTop = Math.max(16, obstacle.y1 - 20 - Math.abs(laneShift));
      candidates.push([
        source,
        sStub,
        { x: sStub.x, y: bypassYTop },
        { x: tStub.x, y: bypassYTop },
        tStub,
        target,
      ]);

      // Bottom channel bypass around this obstacle
      const bypassYBottom = Math.min(bounds.height - 16, obstacle.y2 + 20 + Math.abs(laneShift));
      candidates.push([
        source,
        sStub,
        { x: sStub.x, y: bypassYBottom },
        { x: tStub.x, y: bypassYBottom },
        tStub,
        target,
      ]);

      // Left channel bypass
      const bypassXLeft = Math.max(16, obstacle.x1 - 20 - Math.abs(laneShift));
      candidates.push([
        source,
        sStub,
        { x: bypassXLeft, y: sStub.y },
        { x: bypassXLeft, y: tStub.y },
        tStub,
        target,
      ]);

      // Right channel bypass
      const bypassXRight = Math.min(bounds.width - 16, obstacle.x2 + 20 + Math.abs(laneShift));
      candidates.push([
        source,
        sStub,
        { x: bypassXRight, y: sStub.y },
        { x: bypassXRight, y: tStub.y },
        tStub,
        target,
      ]);
    }
  }

  // Score candidate paths and pick the cleanest route
  let best = candidates[0];
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const cleaned = cleanCollinearPoints(candidate);
    const hits = countPathIntersections(cleaned, infl);
    const bends = routeBends(cleaned);
    const length = routeLength(cleaned);

    // Primary preference: 0 obstacle hits, minimal bends, shortest length
    const score = hits * 1000000 + bends * 500 + length;
    if (score < bestScore) {
      best = cleaned;
      bestScore = score;
    }
  }

  return cleanCollinearPoints(best.map((point) => clampPointToScene(point, bounds)));
}
