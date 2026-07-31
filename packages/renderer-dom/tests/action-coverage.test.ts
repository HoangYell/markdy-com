/**
 * Parser ↔ renderer contract.
 *
 * The parser accepting an action and the renderer knowing how to draw it are
 * two separate lists. When they drift, the failure is silent: the scene
 * parses cleanly, emits no warning, and simply doesn't animate. These tests
 * make that drift a build failure instead.
 */
import { describe, it, expect } from "vitest";
import {
  CAMERA_ACTION_NAMES,
  FIGURE_ONLY_ACTION_NAMES,
  UNIVERSAL_ACTION_NAMES,
} from "@markdy/core";
import { SYSTEM_FLOW_ACTIONS } from "@markdy/stdlib-systems";
import { ACTION_HANDLERS, handlerFor } from "../src/actions/registry.js";

/**
 * `play` expands to the sequence's own events at parse time, so no event
 * with `action === "play"` ever reaches the renderer.
 */
const EXPANDED_BY_PARSER = new Set(["play"]);

/** Camera actions render through `buildCameraAction`, not the actor registry. */
const HANDLED_BY_CAMERA = new Set<string>(CAMERA_ACTION_NAMES);

describe("every parseable action can be rendered", () => {
  const actorActions = [...UNIVERSAL_ACTION_NAMES, ...FIGURE_ONLY_ACTION_NAMES, ...SYSTEM_FLOW_ACTIONS];

  for (const action of actorActions) {
    if (EXPANDED_BY_PARSER.has(action)) continue;

    it(`has a handler for "${action}"`, () => {
      expect(handlerFor(action), `no renderer handler registered for "${action}"`).toBeTypeOf(
        "function",
      );
    });
  }
});

describe("the renderer registry has no stray entries", () => {
  it("registers nothing the parser wouldn't accept", () => {
    const parseable = new Set<string>([
      ...UNIVERSAL_ACTION_NAMES,
      ...FIGURE_ONLY_ACTION_NAMES,
      ...SYSTEM_FLOW_ACTIONS,
    ]);

    const stray = Object.keys(ACTION_HANDLERS).filter(
      (name) => !parseable.has(name) && !HANDLED_BY_CAMERA.has(name),
    );
    expect(stray, `handlers registered for actions the parser rejects: ${stray.join(", ")}`).toEqual(
      [],
    );
  });

  it("returns undefined for unknown actions so they no-op rather than throw", () => {
    expect(handlerFor("breakdance")).toBeUndefined();
  });
});
