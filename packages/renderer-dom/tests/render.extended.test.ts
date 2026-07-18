import { describe, it, expect, beforeAll } from "vitest";
import { parse, registerActorPack } from "@markdy/core";
import { createActorEl } from "../src/actors.js";
import { buildAnimations } from "../src/animations.js";
import type { FaceSwap } from "../src/types.js";

// ---------------------------------------------------------------------------
// jsdom does not implement element.animate(); stub it with a minimal fake.
// ---------------------------------------------------------------------------

beforeAll(() => {
  const g: Record<string, unknown> = globalThis as Record<string, unknown>;
  if (typeof (g as { Element?: typeof Element }).Element !== "undefined") {
    const proto = (g as { Element: typeof Element }).Element.prototype as unknown as {
      animate?: (...args: unknown[]) => Animation;
    };
    if (typeof proto.animate !== "function") {
      proto.animate = function (this: Element, keyframes: unknown, opts: unknown): Animation {
        return {
          pause() {},
          cancel() {},
          addEventListener() {},
          removeEventListener() {},
          currentTime: 0,
          playState: "paused",
          // Non-standard fields — tests read these to assert on keyframe shape
          // without needing a full WAAPI implementation.
          _keyframes: keyframes,
          _opts: opts,
        } as unknown as Animation;
      };
    }
  }

  registerActorPack({
    name: "systems-test-pack",
    actors: ["service", "db", "queue", "client"],
    actions: {
      service: ["request", "response", "emit"],
      db: ["request", "response", "emit"],
      queue: ["request", "response", "emit"],
      client: ["request", "response", "emit"],
    },
  });
});

/**
 * Mount helper: parses `code`, creates a fake scene / sceneContent pair,
 * builds actor elements and animations, and returns everything for assertion.
 *
 * This mirrors what `player.ts` does internally, minus the rAF loop and the
 * chrome (progress bar, badge, responsive scaling).
 */
function mount(code: string) {
  const ast = parse(code);
  const scene = document.createElement("div");
  scene.style.width = `${ast.meta.width}px`;
  scene.style.height = `${ast.meta.height}px`;
  const sceneContent = document.createElement("div");
  scene.appendChild(sceneContent);
  const actorEls = new Map<string, HTMLElement>();
  for (const [name, def] of Object.entries(ast.actors)) {
    const el = createActorEl(name, def, ast.assets, {});
    sceneContent.appendChild(el);
    actorEls.set(name, el);
  }
  const faceSwaps: FaceSwap[] = [];
  const anims = buildAnimations(ast, actorEls, sceneContent, {}, faceSwaps);
  return { ast, scene, sceneContent, actorEls, anims };
}

function flowPathDs(sceneContent: HTMLElement): string[] {
  return Array.from(
    sceneContent.querySelectorAll<SVGPathElement>("path[data-markdy-flow-action]"),
  ).map((p) => p.getAttribute("d") ?? "");
}

// ---------------------------------------------------------------------------

describe("renderer — caption actor", () => {
  it("renders a caption element with the text content", () => {
    const { actorEls } = mount(
      [
        "scene width=800 height=400 bg=white",
        'actor c = caption("Hello World") at top',
      ].join("\n"),
    );
    const el = actorEls.get("c");
    expect(el).toBeDefined();
    expect(el!.textContent).toBe("Hello World");
    expect(el!.dataset.markdyCaption).toBe("top");
  });

  it("centers the caption on its anchor point via calc(-50%) transform", () => {
    const { actorEls } = mount(
      [
        "scene width=800 height=400",
        'actor c = caption("mid") at center',
      ].join("\n"),
    );
    const el = actorEls.get("c")!;
    // txCaption produces `translate(calc(Npx - 50%), calc(Mpx - 50%)) ...`
    expect(el.style.transform).toContain("calc(400px - 50%)");
    expect(el.style.transform).toContain("calc(200px - 50%)");
  });

  it("auto-layers captions above default actor z-index", () => {
    const { actorEls } = mount(
      [
        "scene width=800 height=400",
        'actor c = caption("on top") at top',
      ].join("\n"),
    );
    expect(actorEls.get("c")!.style.zIndex).toBe("100");
  });
});

// ---------------------------------------------------------------------------

describe("renderer — exit action", () => {
  it("builds at least one animation for an exit event", () => {
    const { anims } = mount(
      [
        "actor h = figure(#c68642, m, 😎) at (100, 100)",
        "@0.0: h.exit(to=right, dur=0.4)",
      ].join("\n"),
    );
    expect(anims.length).toBeGreaterThan(0);
  });

  it("works on non-figure actors (text exit)", () => {
    const { anims } = mount(
      [
        'actor t = text("bye") at (100, 100)',
        "@0.0: t.exit(to=top, dur=0.3)",
      ].join("\n"),
    );
    expect(anims.length).toBeGreaterThan(0);
  });

  it("works on captions (caption exit fades and slides)", () => {
    const { anims } = mount(
      [
        "scene width=800 height=400",
        'actor c = caption("gone") at bottom',
        "@0.0: c.exit(to=bottom, dur=0.4)",
      ].join("\n"),
    );
    expect(anims.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------

describe("renderer — enter action", () => {
  it("keyframes include opacity so re-entry after exit restores visibility", () => {
    // Scenario: actor exits (opacity 0, offscreen), then re-enters. The enter
    // animation must animate opacity back to 1 — otherwise the actor slides
    // in invisibly and users can't see them again.
    const { anims } = mount(
      [
        "scene width=800 height=400",
        "actor h = figure(#c68642, m, 😎) at (200, 200)",
        "@0.0:  h.exit(to=left, dur=0.4)",
        "@+0.2: h.move(to=(200, 200), dur=0.0)",
        "@+0.0: h.enter(from=left, dur=0.6)",
      ].join("\n"),
    );
    // Find the enter animation — identify it by the two keyframes, the
    // second of which must carry opacity: 1 to restore visibility.
    const withKeyframes = anims as unknown as Array<{ _keyframes?: unknown }>;
    const enterKF = withKeyframes
      .map((a) => a._keyframes as Array<Record<string, unknown>> | undefined)
      .find(
        (kf) =>
          Array.isArray(kf) &&
          kf.length === 2 &&
          "transform" in kf[0] &&
          "opacity" in kf[0] &&
          kf[1].opacity === 1,
      );
    expect(enterKF).toBeDefined();
  });
});

// ---------------------------------------------------------------------------

describe("renderer — camera reserved actor", () => {
  it("animates the sceneContent layer on camera.pan", () => {
    const { anims } = mount(
      [
        "scene width=800 height=400",
        'actor h = text("x") at (0,0)',
        "@0.0: camera.pan(to=(400,200), dur=1.0)",
      ].join("\n"),
    );
    expect(anims.length).toBeGreaterThan(0);
  });

  it("animates the sceneContent layer on camera.zoom", () => {
    const { anims } = mount(
      [
        "scene width=800 height=400",
        'actor h = text("x") at (0,0)',
        "@0.0: camera.zoom(to=1.5, dur=1.0)",
      ].join("\n"),
    );
    expect(anims.length).toBeGreaterThan(0);
  });

  it("animates the sceneContent layer on camera.shake", () => {
    const { anims } = mount(
      [
        "scene width=800 height=400",
        'actor h = text("x") at (0,0)',
        "@0.0: camera.shake(intensity=10, dur=0.4)",
      ].join("\n"),
    );
    expect(anims.length).toBeGreaterThan(0);
  });

  it("no-ops unknown camera actions (silently, parser already warned)", () => {
    const { anims } = mount(
      [
        "scene width=800 height=400",
        'actor h = text("x") at (0,0)',
        "@0.0: camera.spin(dur=1.0)",
      ].join("\n"),
    );
    // Zero animations from camera.spin, and the parser warning was recorded
    // in ast.warnings (verified by core tests). The renderer must not throw.
    expect(anims.length).toBe(0);
  });

  it("computes pan offsets against the AST scene dimensions (not the DOM)", () => {
    // Regression: camera.pan previously fell back to a hard-coded 800×400 when
    // `scene.clientWidth` was 0 (jsdom) or the layer used percentage widths.
    // For a 1920×1080 scene, panning to the center must translate by (0, 0);
    // the old code would translate by (-560, -340) instead.
    const { anims } = mount(
      [
        "scene width=1920 height=1080",
        'actor h = text("x") at (0,0)',
        "@0.0: camera.pan(to=(960, 540), dur=1.0)",
      ].join("\n"),
    );
    const cam = anims[anims.length - 1] as unknown as { _keyframes: Keyframe[] };
    const endTransform = String(cam._keyframes[1].transform ?? "");
    // Pan target is the scene center, so the camera offset must be (0, 0).
    expect(endTransform).toMatch(/translate\(-?0px,\s*-?0px\)/);
  });
});

// ---------------------------------------------------------------------------

describe("renderer — baseline back-compat", () => {
  it("still renders a plain baseline scene with no new behaviors leaking in", () => {
    const { ast, actorEls, anims } = mount(
      [
        "scene width=800 height=400 bg=white",
        'actor t = text("hi") at (100, 100) size 32',
        "@0.0: t.fade_in(dur=0.4)",
      ].join("\n"),
    );
    expect(ast.warnings).toEqual([]);
    expect(ast.chapters).toEqual([]);
    expect(ast.imports).toEqual([]);
    expect(actorEls.size).toBe(1);
    expect(anims.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------

describe("renderer — combined end-to-end scene", () => {
  it("renders caption + camera + chapters + exit together without errors", () => {
    const { ast, actorEls, anims } = mount(
      [
        "scene width=800 height=400 fps=30",
        'actor title = caption("The Fight") at top',
        "actor h = figure(#c68642, m, 😎) at (100, 200)",
        'scene "intro" {',
        "  @+0.0: h.enter(from=left, dur=0.6)",
        "  @+0.2: camera.zoom(to=1.2, dur=0.4)",
        "}",
        'scene "outro" {',
        "  @+0.5: camera.pan(to=(400, 200), dur=0.4)",
        "  @+0.0: h.exit(to=right, dur=0.5)",
        "  @+0.0: title.exit(to=top, dur=0.4)",
        "}",
      ].join("\n"),
    );
    expect(ast.warnings).toEqual([]);
    expect(ast.chapters.map((c) => c.name)).toEqual(["intro", "outro"]);
    expect(actorEls.size).toBe(2);
    expect(anims.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------

describe("renderer — system flow actions", () => {
  it("renders system actor cards and flow-edge animations", () => {
    const { actorEls, anims } = mount(
      [
        "scene width=900 height=400 bg=#0f172a",
        'actor client = client("Browser") at (100, 200)',
        'actor auth = service("Auth API") at (400, 100)',
        "@0.0: client.request(to=auth, label=\"POST /login\", dur=0.8)",
        "@1.0: auth.response(to=client, label=\"200 OK\", dur=0.6)",
      ].join("\n"),
    );

    expect(actorEls.get("client")?.textContent).toContain("Browser");
    expect(actorEls.get("auth")?.textContent).toContain("Auth API");
    expect(anims.length).toBeGreaterThan(0);
  });

  it("routes around a blocking middle actor in a 3-actor scene", () => {
    const { sceneContent } = mount(
      [
        "scene width=900 height=400 bg=#0f172a",
        'actor a = client("A") at (80, 160)',
        'actor b = service("B") at (360, 160)',
        'actor c = db("C") at (640, 160)',
        "@0.0: a.request(to=c, label=\"cross\", dur=0.6)",
      ].join("\n"),
    );

    const [d] = flowPathDs(sceneContent);
    expect(d).toBeDefined();
    // Elbow/orthogonal route should have multiple line segments, not one straight segment.
    expect((d.match(/L/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("keeps multi-edge routing stable for a dense 5-actor scene", () => {
    const { sceneContent } = mount(
      [
        "scene width=980 height=420 bg=#0f172a",
        'actor a = client("A") at (40, 80)',
        'actor b = service("B") at (240, 80)',
        'actor c = service("C") at (440, 80)',
        'actor d = service("D") at (640, 80)',
        'actor e = db("E") at (840, 80)',
        "@0.0: a.request(to=e, label=\"1\", dur=0.6)",
        "@0.2: e.response(to=a, label=\"2\", dur=0.6)",
        "@0.4: b.request(to=d, label=\"3\", dur=0.6, style=dashed)",
      ].join("\n"),
    );

    const paths = flowPathDs(sceneContent);
    expect(paths).toHaveLength(3);
    expect(paths.every((d) => d.startsWith("M "))).toBe(true);
  });

  it("supports 10-actor routing and fire_and_forget dashed style", () => {
    const { sceneContent } = mount(
      [
        "scene width=1400 height=520 bg=#0f172a",
        'actor a1 = client("A1") at (40, 70)',
        'actor a2 = service("A2") at (260, 70)',
        'actor a3 = service("A3") at (480, 70)',
        'actor a4 = service("A4") at (700, 70)',
        'actor a5 = db("A5") at (920, 70)',
        'actor b1 = client("B1") at (40, 280)',
        'actor b2 = queue("B2") at (260, 280)',
        'actor b3 = service("B3") at (480, 280)',
        'actor b4 = service("B4") at (700, 280)',
        'actor b5 = db("B5") at (920, 280)',
        "@0.0: a1.request(to=a5, label=\"frontline\", dur=0.6)",
        "@0.2: b1.request(to=b5, label=\"backend\", dur=0.6)",
        "@0.4: a3.emit(to=b3, label=\"event_bus\", dur=0.5, style=fire_and_forget)",
      ].join("\n"),
    );

    const flowPaths = Array.from(
      sceneContent.querySelectorAll<SVGPathElement>("path[data-markdy-flow-action]"),
    );
    expect(flowPaths).toHaveLength(3);
    const emitPath = flowPaths.find((p) => p.getAttribute("data-markdy-flow-action") === "emit");
    expect(emitPath).toBeDefined();
    expect(emitPath?.style.strokeDasharray).toBe("8 6");
  });
});
