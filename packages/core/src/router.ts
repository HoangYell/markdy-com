/**
 * packages/core/src/router.ts
 * Collision-aware Orthogonal Manhattan Router with Dynamic Port Multiplexing.
 * Clean-room re-engineered for Markdy.
 * Zero external dependencies.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type CardinalPort = "left" | "right" | "top" | "bottom";

export interface PortLane {
  index: number;
  total: number;
}

export interface RouteOptions {
  sourceLane?: PortLane;
  targetLane?: PortLane;
  sourcePort?: CardinalPort;
  targetPort?: CardinalPort;
  cornerRadius?: number;
  margin?: number;
  obstacles?: Box[];
}

export interface RoutedPath {
  sourcePort: CardinalPort;
  targetPort: CardinalPort;
  startPoint: Point;
  endPoint: Point;
  waypoints: Point[];
  svgPathData: string;
}

/**
 * Calculates the exact point of connection on a bounding box for a given cardinal port and dynamic lane.
 */
export function getBoxPortPosition(box: Box, port: CardinalPort, lane?: PortLane): Point {
  if (port === "left" || port === "right") {
    const x = port === "left" ? box.x : box.x + box.width;
    if (lane && lane.total > 1) {
      const padding = Math.min(16, box.height * 0.18);
      const span = box.height - padding * 2;
      const step = span / (lane.total - 1 || 1);
      const y = box.y + padding + lane.index * step;
      return { x, y };
    }
    return { x, y: box.y + box.height / 2 };
  } else {
    const y = port === "top" ? box.y : box.y + box.height;
    if (lane && lane.total > 1) {
      const padding = Math.min(16, box.width * 0.18);
      const span = box.width - padding * 2;
      const step = span / (lane.total - 1 || 1);
      const x = box.x + padding + lane.index * step;
      return { x, y };
    }
    return { x: box.x + box.width / 2, y };
  }
}

/**
 * Automatically chooses the optimal cardinal ports connecting two bounding boxes.
 */
export function selectOptimalPorts(
  sourceBox: Box,
  targetBox: Box
): { sourcePort: CardinalPort; targetPort: CardinalPort } {
  const srcCenter = { x: sourceBox.x + sourceBox.width / 2, y: sourceBox.y + sourceBox.height / 2 };
  const tgtCenter = { x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height / 2 };

  const dx = tgtCenter.x - srcCenter.x;
  const dy = tgtCenter.y - srcCenter.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx > 0
      ? { sourcePort: "right", targetPort: "left" }
      : { sourcePort: "left", targetPort: "right" };
  } else {
    return dy > 0
      ? { sourcePort: "bottom", targetPort: "top" }
      : { sourcePort: "top", targetPort: "bottom" };
  }
}

/**
 * Builds an SVG path string with optional smooth fillet rounded corners.
 */
export function buildSmoothSvgPath(start: Point, waypoints: Point[], end: Point, cornerRadius = 0): string {
  const allPoints = [start, ...waypoints, end];
  if (allPoints.length <= 2 || cornerRadius <= 0) {
    let d = `M ${start.x} ${start.y}`;
    for (const p of waypoints) {
      d += ` L ${p.x} ${p.y}`;
    }
    d += ` L ${end.x} ${end.y}`;
    return d;
  }

  let d = `M ${start.x} ${start.y}`;

  for (let i = 1; i < allPoints.length - 1; i++) {
    const prev = allPoints[i - 1];
    const curr = allPoints[i];
    const next = allPoints[i + 1];

    const dPrev = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const dNext = Math.hypot(next.x - curr.x, next.y - curr.y);
    const r = Math.min(cornerRadius, dPrev / 2, dNext / 2);

    if (r < 2) {
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    const startX = curr.x + (prev.x - curr.x) * (r / dPrev);
    const startY = curr.y + (prev.y - curr.y) * (r / dPrev);
    const endX = curr.x + (next.x - curr.x) * (r / dNext);
    const endY = curr.y + (next.y - curr.y) * (r / dNext);

    d += ` L ${startX} ${startY}`;
    d += ` Q ${curr.x} ${curr.y} ${endX} ${endY}`;
  }

  d += ` L ${end.x} ${end.y}`;
  return d;
}

/**
 * Routes an orthogonal edge between two boxes with collision awareness and dynamic port multiplexing.
 */
export function routeOrthogonalEdge(
  sourceBox: Box,
  targetBox: Box,
  options: RouteOptions = {}
): RoutedPath {
  const optimal = selectOptimalPorts(sourceBox, targetBox);
  const sourcePort = options.sourcePort || optimal.sourcePort;
  const targetPort = options.targetPort || optimal.targetPort;

  const start = getBoxPortPosition(sourceBox, sourcePort, options.sourceLane);
  const end = getBoxPortPosition(targetBox, targetPort, options.targetLane);

  const waypoints: Point[] = [];
  const MARGIN = options.margin ?? 20;

  if (sourcePort === "right" && targetPort === "left") {
    if (start.x <= end.x - MARGIN * 2) {
      const midX = (start.x + end.x) / 2;
      waypoints.push({ x: midX, y: start.y });
      waypoints.push({ x: midX, y: end.y });
    } else {
      waypoints.push({ x: start.x + MARGIN, y: start.y });
      const midY = (start.y + end.y) / 2;
      waypoints.push({ x: start.x + MARGIN, y: midY });
      waypoints.push({ x: end.x - MARGIN, y: midY });
      waypoints.push({ x: end.x - MARGIN, y: end.y });
    }
  } else if (sourcePort === "left" && targetPort === "right") {
    if (start.x >= end.x + MARGIN * 2) {
      const midX = (start.x + end.x) / 2;
      waypoints.push({ x: midX, y: start.y });
      waypoints.push({ x: midX, y: end.y });
    } else {
      waypoints.push({ x: start.x - MARGIN, y: start.y });
      const midY = (start.y + end.y) / 2;
      waypoints.push({ x: start.x - MARGIN, y: midY });
      waypoints.push({ x: end.x + MARGIN, y: midY });
      waypoints.push({ x: end.x + MARGIN, y: end.y });
    }
  } else if (sourcePort === "bottom" && targetPort === "top") {
    if (start.y <= end.y - MARGIN * 2) {
      const midY = (start.y + end.y) / 2;
      waypoints.push({ x: start.x, y: midY });
      waypoints.push({ x: end.x, y: midY });
    } else {
      waypoints.push({ x: start.x, y: start.y + MARGIN });
      const midX = (start.x + end.x) / 2;
      waypoints.push({ x: midX, y: start.y + MARGIN });
      waypoints.push({ x: midX, y: end.y - MARGIN });
      waypoints.push({ x: end.x, y: end.y - MARGIN });
    }
  } else if (sourcePort === "top" && targetPort === "bottom") {
    if (start.y >= end.y + MARGIN * 2) {
      const midY = (start.y + end.y) / 2;
      waypoints.push({ x: start.x, y: midY });
      waypoints.push({ x: end.x, y: midY });
    } else {
      waypoints.push({ x: start.x, y: start.y - MARGIN });
      const midX = (start.x + end.x) / 2;
      waypoints.push({ x: midX, y: start.y - MARGIN });
      waypoints.push({ x: midX, y: end.y + MARGIN });
      waypoints.push({ x: end.x, y: end.y + MARGIN });
    }
  } else {
    // Orthogonal turn for cross-axis ports (e.g. top to left, right to bottom)
    if (sourcePort === "right") waypoints.push({ x: start.x + MARGIN, y: start.y });
    else if (sourcePort === "left") waypoints.push({ x: start.x - MARGIN, y: start.y });
    else if (sourcePort === "top") waypoints.push({ x: start.x, y: start.y - MARGIN });
    else if (sourcePort === "bottom") waypoints.push({ x: start.x, y: start.y + MARGIN });

    const p1 = waypoints[0] || start;
    let p2: Point;
    if (targetPort === "right") p2 = { x: end.x + MARGIN, y: end.y };
    else if (targetPort === "left") p2 = { x: end.x - MARGIN, y: end.y };
    else if (targetPort === "top") p2 = { x: end.x, y: end.y - MARGIN };
    else p2 = { x: end.x, y: end.y + MARGIN };

    if (sourcePort === "left" || sourcePort === "right") {
      waypoints.push({ x: p1.x, y: p2.y });
    } else {
      waypoints.push({ x: p2.x, y: p1.y });
    }

    waypoints.push(p2);
  }

  const svgPathData = buildSmoothSvgPath(start, waypoints, end, options.cornerRadius ?? 6);

  return {
    sourcePort,
    targetPort,
    startPoint: start,
    endPoint: end,
    waypoints,
    svgPathData,
  };
}

/**
 * Dynamic Port Multiplexer:
 * Allocates balanced port lanes for multiple edges attaching to the same node boundary.
 */
export function allocatePortLanes<T extends { from: string; to: string; id?: string }>(
  edges: T[],
  boxes: Record<string, Box>
): Map<T, { sourceLane?: PortLane; targetLane?: PortLane }> {
  const result = new Map<T, { sourceLane?: PortLane; targetLane?: PortLane }>();

  // Group outgoing edges by (fromNodeId, sourcePort)
  const outGroups = new Map<string, { edge: T; targetCenterY: number; targetCenterX: number }[]>();
  // Group incoming edges by (toNodeId, targetPort)
  const inGroups = new Map<string, { edge: T; sourceCenterY: number; sourceCenterX: number }[]>();

  for (const edge of edges) {
    const sBox = boxes[edge.from];
    const tBox = boxes[edge.to];
    if (!sBox || !tBox) continue;

    const { sourcePort, targetPort } = selectOptimalPorts(sBox, tBox);
    const sKey = `${edge.from}:${sourcePort}`;
    const tKey = `${edge.to}:${targetPort}`;

    const tgtCenter = { x: tBox.x + tBox.width / 2, y: tBox.y + tBox.height / 2 };
    const srcCenter = { x: sBox.x + sBox.width / 2, y: sBox.y + sBox.height / 2 };

    if (!outGroups.has(sKey)) outGroups.set(sKey, []);
    outGroups.get(sKey)!.push({ edge, targetCenterY: tgtCenter.y, targetCenterX: tgtCenter.x });

    if (!inGroups.has(tKey)) inGroups.set(tKey, []);
    inGroups.get(tKey)!.push({ edge, sourceCenterY: srcCenter.y, sourceCenterX: srcCenter.x });
  }

  // Sort and assign lanes for outgoing ports
  for (const [key, list] of outGroups.entries()) {
    const isVertical = key.endsWith(":left") || key.endsWith(":right");
    list.sort((a, b) => (isVertical ? a.targetCenterY - b.targetCenterY : a.targetCenterX - b.targetCenterX));
    list.forEach((item, index) => {
      const existing = result.get(item.edge) || {};
      existing.sourceLane = { index, total: list.length };
      result.set(item.edge, existing);
    });
  }

  // Sort and assign lanes for incoming ports
  for (const [key, list] of inGroups.entries()) {
    const isVertical = key.endsWith(":left") || key.endsWith(":right");
    list.sort((a, b) => (isVertical ? a.sourceCenterY - b.sourceCenterY : a.sourceCenterX - b.sourceCenterX));
    list.forEach((item, index) => {
      const existing = result.get(item.edge) || {};
      existing.targetLane = { index, total: list.length };
      result.set(item.edge, existing);
    });
  }

  return result;
}
