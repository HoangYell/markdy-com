/**
 * Pure 2-D geometry helpers for node bounds, hit-testing, and orthogonal
 * edge routing. Nothing here touches the DOM or WAAPI — it operates purely on
 * plain points and rectangles, which keeps the flow-edge routing logic (the
 * only consumer that needs obstacle avoidance) unit testable without a browser.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Rectangle of a positioned node given its top-left corner and size. */
export function boxRect(box: { x: number; y: number; width: number; height: number }): Rect {
  return { x1: box.x, y1: box.y, x2: box.x + box.width, y2: box.y + box.height };
}

export function rectCenter(rect: Rect): Point {
  return { x: (rect.x1 + rect.x2) / 2, y: (rect.y1 + rect.y2) / 2 };
}

export function inflateRect(rect: Rect, pad: number): Rect {
  return {
    x1: rect.x1 - pad,
    y1: rect.y1 - pad,
    x2: rect.x2 + pad,
    y2: rect.y2 + pad,
  };
}

/**
 * Axis-aligned segment/rect intersection. Flow edges are routed as
 * orthogonal polylines, so only horizontal and vertical segments are
 * considered — diagonal segments always report "no hit".
 */
export function segmentIntersectsRect(a: Point, b: Point, rect: Rect): boolean {
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);
  const horizontal = Math.abs(a.y - b.y) < 0.001;
  const vertical = Math.abs(a.x - b.x) < 0.001;

  if (horizontal) {
    const yHit = a.y > rect.y1 && a.y < rect.y2;
    const xOverlap = maxX > rect.x1 && minX < rect.x2;
    return yHit && xOverlap;
  }
  if (vertical) {
    const xHit = a.x > rect.x1 && a.x < rect.x2;
    const yOverlap = maxY > rect.y1 && minY < rect.y2;
    return xHit && yOverlap;
  }
  return false;
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
}

export function pointInsideRect(p: Point, rect: Rect): boolean {
  return p.x >= rect.x1 && p.x <= rect.x2 && p.y >= rect.y1 && p.y <= rect.y2;
}

export function countPathIntersections(points: Point[], obstacles: Rect[]): number {
  let hits = 0;
  for (let i = 0; i < points.length - 1; i++) {
    for (const obstacle of obstacles) {
      if (segmentIntersectsRect(points[i], points[i + 1], obstacle)) hits++;
    }
  }
  return hits;
}

