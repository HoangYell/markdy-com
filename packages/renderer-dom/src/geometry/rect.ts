/**
 * Pure 2-D geometry helpers for actor bounds and hit-testing.
 *
 * Nothing in here touches the DOM or WAAPI — it operates purely on
 * `ActorState` coordinates and plain rectangles, which keeps the flow-edge
 * routing logic (the only consumer that needs obstacle avoidance) unit
 * testable without a browser environment.
 */
import type { ActorState } from "../types.js";

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

/**
 * Nominal rendered footprint per actor type, used for edge anchoring and
 * obstacle avoidance. These mirror the dimensions applied in `actors.ts` /
 * the stdlib-systems node styles; they are deliberately approximate because
 * they only feed routing heuristics, never layout.
 */
const ACTOR_SIZES: Record<string, { width: number; height: number }> = {
  service: { width: 184, height: 88 },
  api: { width: 184, height: 88 },
  microservice: { width: 184, height: 88 },
  client: { width: 184, height: 88 },
  user: { width: 184, height: 88 },
  db: { width: 184, height: 88 },
  database: { width: 184, height: 88 },
  queue: { width: 184, height: 88 },
  cache: { width: 184, height: 88 },
  cloud: { width: 184, height: 88 },
  region: { width: 184, height: 88 },
  container: { width: 184, height: 88 },
  cluster: { width: 184, height: 88 },
  box: { width: 100, height: 100 },
  caption: { width: 260, height: 56 },
  figure: { width: 120, height: 170 },
  parking_map: { width: 390, height: 250 },
  ascii_map: { width: 390, height: 250 },
  game_scene: { width: 390, height: 250 },
  byte_viz: { width: 420, height: 250 },
};

const DEFAULT_ACTOR_SIZE = { width: 140, height: 42 };

export function actorSizeByType(type: string): { width: number; height: number } {
  return ACTOR_SIZES[type] ?? DEFAULT_ACTOR_SIZE;
}

export function actorCenter(state: ActorState, actorType: string): Point {
  const rect = actorRect(state, actorType);
  return { x: rect.x1 + (rect.x2 - rect.x1) / 2, y: rect.y1 + (rect.y2 - rect.y1) / 2 };
}

export function actorRect(state: ActorState, actorType: string): Rect {
  const { width, height } = actorSizeByType(actorType);
  const scale = Math.max(0.001, state.scale);
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  const dx = (scaledWidth - width) / 2;
  const dy = (scaledHeight - height) / 2;
  return {
    x1: state.x - dx,
    y1: state.y - dy,
    x2: state.x + width + dx,
    y2: state.y + height + dy,
  };
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

export function countPathIntersections(points: Point[], obstacles: Rect[]): number {
  let hits = 0;
  for (let i = 0; i < points.length - 1; i++) {
    for (const obstacle of obstacles) {
      if (segmentIntersectsRect(points[i], points[i + 1], obstacle)) hits++;
    }
  }
  return hits;
}
