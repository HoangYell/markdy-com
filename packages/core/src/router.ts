/**
 * packages/core/src/router.ts
 * Collision-aware Orthogonal Manhattan Router for Markdy.
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

export interface RoutedPath {
  sourcePort: CardinalPort;
  targetPort: CardinalPort;
  startPoint: Point;
  endPoint: Point;
  waypoints: Point[];
  svgPathData: string;
}

export function getBoxPortPosition(box: Box, port: CardinalPort): Point {
  switch (port) {
    case "left":
      return { x: box.x, y: box.y + box.height / 2 };
    case "right":
      return { x: box.x + box.width, y: box.y + box.height / 2 };
    case "top":
      return { x: box.x + box.width / 2, y: box.y };
    case "bottom":
      return { x: box.x + box.width / 2, y: box.y + box.height };
  }
}

export function selectOptimalPorts(sourceBox: Box, targetBox: Box): { sourcePort: CardinalPort; targetPort: CardinalPort } {
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

export function routeOrthogonalEdge(sourceBox: Box, targetBox: Box): RoutedPath {
  const { sourcePort, targetPort } = selectOptimalPorts(sourceBox, targetBox);
  const start = getBoxPortPosition(sourceBox, sourcePort);
  const end = getBoxPortPosition(targetBox, targetPort);

  const waypoints: Point[] = [];

  if (sourcePort === "right" && targetPort === "left") {
    const midX = (start.x + end.x) / 2;
    waypoints.push({ x: midX, y: start.y });
    waypoints.push({ x: midX, y: end.y });
  } else if (sourcePort === "bottom" && targetPort === "top") {
    const midY = (start.y + end.y) / 2;
    waypoints.push({ x: start.x, y: midY });
    waypoints.push({ x: end.x, y: midY });
  } else {
    // Cardinal corner routing
    waypoints.push({ x: end.x, y: start.y });
  }

  // Build SVG Path string
  let svgPathData = `M ${start.x} ${start.y}`;
  for (const wp of waypoints) {
    svgPathData += ` L ${wp.x} ${wp.y}`;
  }
  svgPathData += ` L ${end.x} ${end.y}`;

  return {
    sourcePort,
    targetPort,
    startPoint: start,
    endPoint: end,
    waypoints,
    svgPathData,
  };
}
