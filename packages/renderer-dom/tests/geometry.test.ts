/**
 * Flow-edge geometry and routing.
 *
 * These functions are pure — no DOM, no WAAPI — so unlike the rest of the
 * renderer they can be asserted on directly. That's the payoff for moving
 * them out of the animation module: obstacle avoidance is the subtlest logic
 * in the package and it now has real coverage.
 */
import { describe, it, expect } from "vitest";
import {
  boxRect,
  countPathIntersections,
  inflateRect,
  rectCenter,
  segmentIntersectsRect,
} from "../src/geometry/rect.js";
import type { Rect } from "../src/geometry/rect.js";
import {
  cleanCollinearPoints,
  findSegmentHops,
  labelPointForPath,
  placeFlowLabel,
  pointAtDistance,
  polylineLength,
  round1,
  routeOrthogonal,
  routeTreeEdgePoints,
  toPathD,
} from "../src/geometry/path.js";

const BOUNDS = { width: 1280, height: 720 };

const rectsOverlap = (a: Rect, b: Rect) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;

describe("placeFlowLabel", () => {
  const horizontalEdge = [{ x: 300, y: 200 }, { x: 700, y: 200 }];

  it("places a label along the connector path", () => {
    const p = placeFlowLabel(horizontalEdge, 80, [], BOUNDS);
    expect(p.y).toBe(200);
    expect(Math.abs(p.x - 500)).toBeLessThan(1);
  });

  it("separates a second label from the first (no overlap)", () => {
    const first = placeFlowLabel(horizontalEdge, 80, [], BOUNDS);
    const second = placeFlowLabel(horizontalEdge, 80, [first.rect], BOUNDS);
    expect(rectsOverlap(first.rect, second.rect)).toBe(false);
  });

  it("avoids a node box under the edge midpoint", () => {
    const blocker: Rect = { x1: 460, y1: 180, x2: 540, y2: 240 };
    const p = placeFlowLabel(horizontalEdge, 80, [blocker], BOUNDS);
    expect(rectsOverlap(p.rect, blocker)).toBe(false);
  });

  it("keeps the label box inside the scene bounds", () => {
    const p = placeFlowLabel([{ x: 10, y: 8 }, { x: 10, y: 700 }], 200, [], BOUNDS);
    expect(p.rect.x1).toBeGreaterThanOrEqual(0);
    expect(p.rect.x2).toBeLessThanOrEqual(BOUNDS.width);
  });
});

describe("rect helpers", () => {
  it("builds a rect from a positioned node's top-left corner and size", () => {
    expect(boxRect({ x: 10, y: 20, width: 100, height: 100 })).toEqual({ x1: 10, y1: 20, x2: 110, y2: 120 });
  });

  it("computes the center of a rect", () => {
    expect(rectCenter({ x1: 10, y1: 20, x2: 110, y2: 120 })).toEqual({ x: 60, y: 70 });
  });

  it("inflates rectangles symmetrically", () => {
    expect(inflateRect({ x1: 10, y1: 10, x2: 20, y2: 20 }, 5)).toEqual({
      x1: 5,
      y1: 5,
      x2: 25,
      y2: 25,
    });
  });
});

describe("segmentIntersectsRect", () => {
  const rect = { x1: 100, y1: 100, x2: 200, y2: 200 };

  it("detects a horizontal segment cutting through", () => {
    expect(segmentIntersectsRect({ x: 0, y: 150 }, { x: 300, y: 150 }, rect)).toBe(true);
  });

  it("detects a vertical segment cutting through", () => {
    expect(segmentIntersectsRect({ x: 150, y: 0 }, { x: 150, y: 300 }, rect)).toBe(true);
  });

  it("ignores a segment that passes clear of the rect", () => {
    expect(segmentIntersectsRect({ x: 0, y: 50 }, { x: 300, y: 50 }, rect)).toBe(false);
  });

  it("treats grazing the boundary as no hit", () => {
    expect(segmentIntersectsRect({ x: 0, y: 100 }, { x: 300, y: 100 }, rect)).toBe(false);
  });

  it("reports no hit for diagonals, which routing never produces", () => {
    expect(segmentIntersectsRect({ x: 0, y: 0 }, { x: 300, y: 300 }, rect)).toBe(false);
  });

  it("counts one hit per obstacle crossed", () => {
    const path = [
      { x: 0, y: 150 },
      { x: 300, y: 150 },
    ];
    expect(countPathIntersections(path, [rect])).toBe(1);
    expect(countPathIntersections(path, [rect, { x1: 220, y1: 100, x2: 260, y2: 200 }])).toBe(2);
  });
});

describe("polyline measurement", () => {
  const path = [
    { x: 0, y: 0 },
    { x: 30, y: 0 },
    { x: 30, y: 40 },
  ];

  it("sums segment lengths", () => {
    expect(polylineLength(path)).toBe(70);
  });

  it("never reports a zero length, so dash math can divide by it", () => {
    expect(polylineLength([{ x: 5, y: 5 }])).toBe(1);
    expect(
      polylineLength([
        { x: 5, y: 5 },
        { x: 5, y: 5 },
      ]),
    ).toBe(1);
  });

  it("walks a given distance along the path", () => {
    expect(pointAtDistance(path, 0)).toEqual({ x: 0, y: 0 });
    expect(pointAtDistance(path, 15)).toEqual({ x: 15, y: 0 });
    expect(pointAtDistance(path, 50)).toEqual({ x: 30, y: 20 });
  });

  it("clamps past-the-end distances onto the final segment", () => {
    expect(pointAtDistance(path, 999)).toEqual({ x: 30, y: 40 });
  });

  it("emits compact SVG path data", () => {
    expect(toPathD(path, 0)).toBe("M 0 0 L 30 0 L 30 40");
    expect(toPathD(path, 8)).toMatch(/^M 0 0 L 22 0 Q 30 0 30 8 L 30 40$/);
    expect(toPathD(path)).toMatch(/^M 0 0 L 16 0 Q 30 0 30 14 L 30 40$/);
    expect(round1(12.349)).toBe(12.3);
  });

  it("renders semicircular arc bridge hops over intersecting perpendicular paths", () => {
    const horizontalLR = [{ x: 100, y: 200 }, { x: 300, y: 200 }];
    const horizontalRL = [{ x: 300, y: 200 }, { x: 100, y: 200 }];
    const verticalTB = [{ x: 200, y: 100 }, { x: 200, y: 300 }];
    const verticalBT = [{ x: 200, y: 300 }, { x: 200, y: 100 }];

    // Left-to-right horizontal hop
    const hopsLR = findSegmentHops(horizontalLR[0], horizontalLR[1], [verticalTB]);
    expect(hopsLR).toHaveLength(1);
    expect(hopsLR[0]).toEqual({ x: 200, y: 200 });
    const pathLR = toPathD(horizontalLR, 14, [verticalTB]);
    expect(pathLR).toContain("A 5 5 0 0 0 205 200");

    // Right-to-left horizontal hop (consistently arches upward)
    const pathRL = toPathD(horizontalRL, 14, [verticalTB]);
    expect(pathRL).toContain("A 5 5 0 0 1 195 200");

    // Top-to-bottom vertical hop (consistently arches rightward)
    const pathTB = toPathD(verticalTB, 14, [horizontalLR]);
    expect(pathTB).toContain("A 5 5 0 0 1 200 205");

    // Bottom-to-top vertical hop (consistently arches rightward)
    const pathBT = toPathD(verticalBT, 14, [horizontalLR]);
    expect(pathBT).toContain("A 5 5 0 0 0 200 195");
  });

  it("places labels on the longest segment with lane-aware offset", () => {
    expect(labelPointForPath(path, 0)).toEqual({ x: 42, y: 20 });
    expect(labelPointForPath(path, 2)).toEqual({ x: 62, y: 20 });
  });
});

describe("routeOrthogonal", () => {
  it("takes a straight shot between axis-aligned neighbours", () => {
    const from = boxRect({ x: 0, y: 100, width: 100, height: 40 });
    const to = boxRect({ x: 300, y: 100, width: 100, height: 40 });
    const route = routeOrthogonal(from, to, [], BOUNDS);
    expect(route).toHaveLength(2);
    expect(route[0]).toEqual({ x: 100, y: 120 });
    expect(route[1]).toEqual({ x: 300, y: 120 });
  });

  it("detours around a node sitting directly on the straight line", () => {
    const from = boxRect({ x: 0, y: 100, width: 100, height: 40 });
    const to = boxRect({ x: 400, y: 100, width: 100, height: 40 });
    const blocker: Rect = { x1: 200, y1: 90, x2: 300, y2: 150 };
    const route = routeOrthogonal(from, to, [blocker], BOUNDS);
    expect(route.length).toBeGreaterThan(2);
    expect(countPathIntersections(route, [blocker])).toBe(0);
  });

  it("keeps every routed point inside the scene bounds", () => {
    const from = boxRect({ x: 0, y: 0, width: 100, height: 40 });
    const to = boxRect({ x: 1100, y: 640, width: 100, height: 40 });
    const route = routeOrthogonal(from, to, [], BOUNDS);
    for (const point of route) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(BOUNDS.width);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(BOUNDS.height);
    }
  });

  it("uses distinct attach points for concurrent lanes", () => {
    const from = boxRect({ x: 0, y: 100, width: 100, height: 40 });
    const to = boxRect({ x: 300, y: 100, width: 100, height: 40 });
    const first = routeOrthogonal(from, to, [], BOUNDS, 0);
    const second = routeOrthogonal(from, to, [], BOUNDS, 1);
    expect(second[0].y).not.toBe(first[0].y);
    expect(second[1].y).not.toBe(first[1].y);
  });

  it("produces perpendicular stubs when routing doglegs between offset cards", () => {
    const from = boxRect({ x: 100, y: 100, width: 120, height: 60 });
    const to = boxRect({ x: 400, y: 300, width: 120, height: 60 });
    const route = routeOrthogonal(from, to, [], BOUNDS);
    expect(route.length).toBeGreaterThanOrEqual(4);
    // Initial segment must exit horizontally with a straight stub before turning
    expect(route[1].y).toBe(route[0].y);
    expect(route[1].x).toBeGreaterThan(route[0].x);
    // Final segment must enter horizontally with a straight stub
    const last = route[route.length - 1];
    const prev = route[route.length - 2];
    expect(prev.y).toBe(last.y);
    expect(prev.x).toBeLessThan(last.x);
  });
});

describe("cleanCollinearPoints", () => {
  it("removes redundant intermediate points on a horizontal line", () => {
    const raw = [{ x: 0, y: 50 }, { x: 50, y: 50 }, { x: 100, y: 50 }, { x: 200, y: 50 }];
    const cleaned = cleanCollinearPoints(raw);
    expect(cleaned).toEqual([{ x: 0, y: 50 }, { x: 200, y: 50 }]);
  });

  it("removes redundant intermediate points on a vertical line", () => {
    const raw = [{ x: 50, y: 0 }, { x: 50, y: 30 }, { x: 50, y: 100 }];
    const cleaned = cleanCollinearPoints(raw);
    expect(cleaned).toEqual([{ x: 50, y: 0 }, { x: 50, y: 100 }]);
  });

  it("preserves corner turn points in an L-shaped or Z-shaped path", () => {
    const raw = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 200 }];
    const cleaned = cleanCollinearPoints(raw);
    expect(cleaned).toEqual([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 200 }]);
  });

  it("removes duplicate consecutive points", () => {
    const raw = [{ x: 10, y: 10 }, { x: 10, y: 10 }, { x: 50, y: 10 }];
    const cleaned = cleanCollinearPoints(raw);
    expect(cleaned).toEqual([{ x: 10, y: 10 }, { x: 50, y: 10 }]);
  });
});

describe("routeTreeEdgePoints", () => {
  const boundsPortrait = { width: 496, height: 1232 };
  const boundsLandscape = { width: 1920, height: 1080 };

  const rootNode = { x: 68, y: 152, width: 256, height: 76 };
  const childA = { x: 100, y: 244, width: 256, height: 76 };
  const childB = { x: 100, y: 520, width: 256, height: 76 };
  const childC = { x: 100, y: 796, width: 256, height: 76 };

  it("routes vertical indented tree edges along parent trunk corridor into child left edge", () => {
    const routeA = routeTreeEdgePoints(rootNode, childA, 0, true, boundsPortrait);
    expect(routeA).not.toBeNull();
    expect(routeA).toHaveLength(3);
    // Exits bottom of parent at trunk corridor
    expect(routeA![0].y).toBe(rootNode.y + rootNode.height); // 228
    expect(routeA![0].x).toBe(88);
    // Drops vertically along trunk to child center-Y
    expect(routeA![1].x).toBe(88);
    expect(routeA![1].y).toBe(childA.y + childA.height / 2); // 282
    // Turns horizontally right into child left edge
    expect(routeA![2].x).toBe(childA.x); // 100
    expect(routeA![2].y).toBe(childA.y + childA.height / 2); // 282
  });

  it("assigns distinct parallel trunk lanes for concurrent child flows", () => {
    const routeA = routeTreeEdgePoints(rootNode, childA, 0, true, boundsPortrait);
    const routeB = routeTreeEdgePoints(rootNode, childB, 1, true, boundsPortrait);
    const routeC = routeTreeEdgePoints(rootNode, childC, 2, true, boundsPortrait);

    expect(routeA![0].x).toBe(88);
    expect(routeB![0].x).toBe(84);
    expect(routeC![0].x).toBe(80);

    // Each target receives line at its own center-Y
    expect(routeB![2]).toEqual({ x: 100, y: 558 });
    expect(routeC![2]).toEqual({ x: 100, y: 834 });
  });

  it("routes direct vertical child in same column straight down", () => {
    const nodeA = { x: 100, y: 100, width: 200, height: 60 };
    const nodeB = { x: 100, y: 220, width: 200, height: 60 };
    const route = routeTreeEdgePoints(nodeA, nodeB, 0, true, boundsPortrait);
    expect(route).toEqual([
      { x: 200, y: 160 },
      { x: 200, y: 220 },
    ]);
  });

  it("routes landscape tree edges from parent bottom via horizontal branch to child top", () => {
    const parent = { x: 800, y: 100, width: 200, height: 60 };
    const child = { x: 300, y: 240, width: 180, height: 60 };
    const route = routeTreeEdgePoints(parent, child, 0, false, boundsLandscape);
    expect(route).not.toBeNull();
    expect(route).toHaveLength(4);
    expect(route![0]).toEqual({ x: 900, y: 160 }); // parent bottom-center
    expect(route![1].x).toBe(900); // drops to branch level
    expect(route![1].y).toBe(200); // (160 + 240) / 2
    expect(route![2].x).toBe(390); // runs to child center-X (300 + 90)
    expect(route![2].y).toBe(200);
    expect(route![3]).toEqual({ x: 390, y: 240 }); // enters child top-center
  });

  it("returns null for non-downward or backward edges so orthogonal fallback applies", () => {
    const lower = { x: 100, y: 400, width: 200, height: 60 };
    const upper = { x: 100, y: 100, width: 200, height: 60 };
    expect(routeTreeEdgePoints(lower, upper, 0, true, boundsPortrait)).toBeNull();
    expect(routeTreeEdgePoints(lower, upper, 0, false, boundsLandscape)).toBeNull();
  });
});
