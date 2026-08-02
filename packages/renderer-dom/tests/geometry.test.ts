/**
 * Flow-edge geometry and routing.
 *
 * These functions are pure — no DOM, no WAAPI — so unlike the rest of the
 * renderer they can be asserted on directly. That's the payoff for moving
 * them out of the animation module: obstacle avoidance is the subtlest logic
 * in the package and it now has real coverage.
 */
import { describe, it, expect } from "vitest";
import { parse } from "@markdy/core";
import {
  actorCenter,
  actorRect,
  actorSizeByType,
  countPathIntersections,
  inflateRect,
  segmentIntersectsRect,
} from "../src/geometry/rect.js";
import {
  labelPointForPath,
  pointAtDistance,
  polylineLength,
  round1,
  routeFlowPath,
  toPathD,
} from "../src/geometry/path.js";
import { stateFrom } from "../src/types.js";
import type { ActorState } from "../src/types.js";

function stateAt(x: number, y: number): ActorState {
  return { x, y, scale: 1, rotate: 0, opacity: 1 };
}

describe("actor bounds", () => {
  it("gives system-diagram node types a shared footprint", () => {
    for (const type of ["service", "api", "microservice", "client", "user", "database", "db", "queue", "cache", "cloud", "region", "container", "cluster"]) {
      expect(actorSizeByType(type)).toEqual({ width: 184, height: 88 });
    }
  });

  it("falls back to a default footprint for unknown actor types", () => {
    expect(actorSizeByType("something-a-future-pack-adds")).toEqual({ width: 140, height: 42 });
  });

  it("treats an actor's position as its top-left corner", () => {
    expect(actorRect(stateAt(10, 20), "box")).toEqual({ x1: 10, y1: 20, x2: 110, y2: 120 });
    expect(actorCenter(stateAt(10, 20), "box")).toEqual({ x: 60, y: 70 });
  });

  it("expands bounds around the actor center when scale changes", () => {
    expect(actorRect({ ...stateAt(10, 20), scale: 2 }, "box")).toEqual({
      x1: -40,
      y1: -30,
      x2: 160,
      y2: 170,
    });
    expect(actorCenter({ ...stateAt(10, 20), scale: 2 }, "box")).toEqual({ x: 60, y: 70 });
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
    expect(toPathD(path)).toBe("M 0 0 L 30 0 L 30 40");
    expect(round1(12.349)).toBe(12.3);
  });

  it("places labels on the longest segment with lane-aware offset", () => {
    expect(labelPointForPath(path, 0)).toEqual({ x: 40, y: 20 });
    expect(labelPointForPath(path, 2)).toEqual({ x: 56, y: 20 });
  });
});

describe("routeFlowPath", () => {
  /** Builds the states map and AST that routing needs from a scene source. */
  function sceneWith(source: string) {
    const ast = parse(source);
    const states = new Map<string, ActorState>();
    for (const [name, def] of Object.entries(ast.actors)) states.set(name, stateFrom(def));
    return { ast, states };
  }

  it("runs straight between two horizontally aligned nodes", () => {
    const { ast, states } = sceneWith(
      [
        "scene width=800 height=400",
        "actor a = box() at (100, 200)",
        "actor b = box() at (500, 200)",
      ].join("\n"),
    );

    const points = routeFlowPath("a", "b", states.get("a")!, states.get("b")!, states, ast, 0);

    expect(points).toHaveLength(2);
    // Leaves a's right face and arrives at b's left face, at shared center-y.
    expect(points[0]).toEqual({ x: 200, y: 250 });
    expect(points[1]).toEqual({ x: 500, y: 250 });
  });

  it("routes around a node sitting directly between source and target", () => {
    const { ast, states } = sceneWith(
      [
        "scene width=900 height=400",
        "actor a = box() at (50, 200)",
        "actor blocker = box() at (400, 200)",
        "actor b = box() at (750, 200)",
      ].join("\n"),
    );

    const direct = [
      { x: 150, y: 250 },
      { x: 750, y: 250 },
    ];
    const blockerRect = inflateRect(actorRect(states.get("blocker")!, "box"), 8);
    expect(countPathIntersections(direct, [blockerRect])).toBeGreaterThan(0);

    const points = routeFlowPath("a", "b", states.get("a")!, states.get("b")!, states, ast, 0);
    expect(countPathIntersections(points, [blockerRect])).toBe(0);
  });

  it("separates concurrent edges by lane so they stay individually readable", () => {
    const { ast, states } = sceneWith(
      [
        "scene width=800 height=500",
        "actor a = box() at (100, 100)",
        "actor b = box() at (500, 300)",
      ].join("\n"),
    );

    const lane0 = routeFlowPath("a", "b", states.get("a")!, states.get("b")!, states, ast, 0);
    const lane2 = routeFlowPath("a", "b", states.get("a")!, states.get("b")!, states, ast, 2);

    expect(toPathD(lane0)).not.toBe(toPathD(lane2));
  });

  it("anchors on top/bottom faces when nodes are mostly stacked", () => {
    const { ast, states } = sceneWith(
      [
        "scene width=600 height=800",
        "actor a = box() at (250, 100)",
        "actor b = box() at (250, 600)",
      ].join("\n"),
    );

    const points = routeFlowPath("a", "b", states.get("a")!, states.get("b")!, states, ast, 0);

    // Same center-x, so the edge leaves a's bottom edge (y = 100 + 100).
    expect(points[0]).toEqual({ x: 300, y: 200 });
    expect(points[points.length - 1]).toEqual({ x: 300, y: 600 });
  });
});
