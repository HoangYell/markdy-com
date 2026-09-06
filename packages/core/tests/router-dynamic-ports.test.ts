import { describe, it, expect } from "vitest";
import {
  getBoxPortPosition,
  routeOrthogonalEdge,
  allocatePortLanes,
  type Box,
} from "../src/router.js";

describe("Router & Dynamic Port Multiplexer", () => {
  it.each([
    ["right", { x: 100, y: 100 }, { x: 400, y: 100 }, { x: 250, y: 80, width: 60, height: 100 }],
    ["left", { x: 400, y: 100 }, { x: 100, y: 100 }, { x: 250, y: 80, width: 60, height: 100 }],
    ["down", { x: 100, y: 100 }, { x: 100, y: 400 }, { x: 80, y: 250, width: 140, height: 60 }],
    ["up", { x: 100, y: 400 }, { x: 100, y: 100 }, { x: 80, y: 250, width: 140, height: 60 }],
    ["self-loop", { x: 100, y: 100 }, { x: 100, y: 100 }, { x: 120, y: 50, width: 60, height: 40 }],
  ])("avoids a blocking box for %s routes", (_direction, source, target, obstacle) => {
    const from = { ...source, width: 100, height: 60 };
    const to = { ...target, width: 100, height: 60 };
    const route = routeOrthogonalEdge(from, to, { obstacles: [obstacle], cornerRadius: 0 });
    const points = [route.startPoint, ...route.waypoints, route.endPoint];
    for (let index = 1; index < points.length; index++) {
      const start = points[index - 1];
      const end = points[index];
      expect(start.x === end.x || start.y === end.y).toBe(true);
      const horizontalHit = start.y === end.y && start.y > obstacle.y && start.y < obstacle.y + obstacle.height &&
        Math.max(start.x, end.x) > obstacle.x && Math.min(start.x, end.x) < obstacle.x + obstacle.width;
      const verticalHit = start.x === end.x && start.x > obstacle.x && start.x < obstacle.x + obstacle.width &&
        Math.max(start.y, end.y) > obstacle.y && Math.min(start.y, end.y) < obstacle.y + obstacle.height;
      expect(horizontalHit || verticalHit).toBe(false);
    }
  });

  const boxA: Box = { x: 50, y: 50, width: 100, height: 60 };
  const boxB: Box = { x: 300, y: 50, width: 100, height: 60 };
  const boxOffset: Box = { x: 300, y: 150, width: 100, height: 60 };

  it("calculates default center port positions", () => {
    const p = getBoxPortPosition(boxA, "right");
    expect(p).toEqual({ x: 150, y: 80 });
  });

  it("distributes multiple lanes across node boundary", () => {
    const lane0 = getBoxPortPosition(boxA, "right", { index: 0, total: 3 });
    const lane1 = getBoxPortPosition(boxA, "right", { index: 1, total: 3 });
    const lane2 = getBoxPortPosition(boxA, "right", { index: 2, total: 3 });

    expect(lane0.x).toBe(150);
    expect(lane1.x).toBe(150);
    expect(lane2.x).toBe(150);

    expect(lane0.y).toBeLessThan(lane1.y);
    expect(lane1.y).toBeLessThan(lane2.y);
  });

  it("allocates balanced port lanes for multiple converging edges", () => {
    const nodeS1: Box = { x: 50, y: 20, width: 100, height: 40 };
    const nodeS2: Box = { x: 50, y: 100, width: 100, height: 40 };
    const nodeTarget: Box = { x: 300, y: 50, width: 120, height: 80 };

    const edges = [
      { from: "s1", to: "target", id: "e1" },
      { from: "s2", to: "target", id: "e2" },
    ];

    const boxes = { s1: nodeS1, s2: nodeS2, target: nodeTarget };
    const laneMap = allocatePortLanes(edges, boxes);

    const e1Lanes = laneMap.get(edges[0])!;
    const e2Lanes = laneMap.get(edges[1])!;

    expect(e1Lanes.targetLane?.total).toBe(2);
    expect(e2Lanes.targetLane?.total).toBe(2);
    expect(e1Lanes.targetLane?.index).not.toBe(e2Lanes.targetLane?.index);
  });

  it("routes orthogonal edge with smooth rounded corners", () => {
    const routed = routeOrthogonalEdge(boxA, boxOffset, { cornerRadius: 8 });
    expect(routed.svgPathData).toContain("M 150 80");
    expect(routed.svgPathData).toContain("Q");
    expect(routed.svgPathData).toContain("300 180");
  });

  it("routes self-loop edge as smooth arch without cutting through node", () => {
    const routed = routeOrthogonalEdge(boxA, boxA, { cornerRadius: 6, margin: 20 });
    expect(routed.sourcePort).toBe("top");
    expect(routed.targetPort).toBe("top");
    expect(routed.startPoint.y).toBe(boxA.y);
    expect(routed.endPoint.y).toBe(boxA.y);
    // Waypoints must loop above the box (y < boxA.y)
    for (const wp of routed.waypoints) {
      expect(wp.y).toBeLessThan(boxA.y);
    }
    expect(routed.svgPathData).toContain("Q");
  });

  it("allocates distinct parallel lanes for bidirectional request/response pairs", () => {
    const edges = [
      { from: "a", to: "b", id: "req" },
      { from: "b", to: "a", id: "res" },
    ];
    const boxes = { a: boxA, b: boxB };
    const laneMap = allocatePortLanes(edges, boxes);

    const reqLanes = laneMap.get(edges[0])!;
    const resLanes = laneMap.get(edges[1])!;

    expect(reqLanes.sourceLane?.total).toBe(2);
    expect(resLanes.targetLane?.total).toBe(2);
    // Request forward and response return must have different indices (parallel, no collision)
    expect(reqLanes.sourceLane?.index).not.toBe(resLanes.targetLane?.index);
    expect(reqLanes.targetLane?.index).not.toBe(resLanes.sourceLane?.index);

    const reqStart = getBoxPortPosition(boxA, "right", reqLanes.sourceLane);
    const resEnd = getBoxPortPosition(boxA, "right", resLanes.targetLane);
    expect(reqStart.y).not.toBe(resEnd.y);
  });
});
