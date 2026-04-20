import { describe, it, expect } from "vitest";
import { parse, ParseError } from "../src/parser.js";

// ---------------------------------------------------------------------------
// Additive grammar tests — all new features are part of the base grammar.
// No version pragma, no version gating; `@markdy N` is NOT a thing.
//
// Every test in this file drives one of the shipped features against the
// single parser. Existing baseline files continue to parse identically; see
// `packages/compat/snapshots/` for the gate that enforces that.
// ---------------------------------------------------------------------------

describe("caption actor with anchor positioning", () => {
  it("places `at top` relative to scene height", () => {
    const ast = parse(
      [
        "scene width=800 height=400",
        'actor c = caption("hello") at top',
      ].join("\n"),
    );
    const c = ast.actors["c"];
    expect(c.type).toBe("caption");
    expect(c.anchor).toBe("top");
    expect(c.args).toEqual(["hello"]);
    expect(c.x).toBe(400);
    expect(c.y).toBe(Math.round(400 * 0.12));
  });

  it("places `at bottom` near the scene floor", () => {
    const ast = parse(
      [
        "scene width=800 height=400",
        'actor c = caption("bye") at bottom',
      ].join("\n"),
    );
    expect(ast.actors["c"].anchor).toBe("bottom");
    expect(ast.actors["c"].x).toBe(400);
    expect(ast.actors["c"].y).toBe(400 - Math.round(400 * 0.12));
  });

  it("centers with `at center`", () => {
    const ast = parse(
      [
        "scene width=800 height=400",
        'actor c = caption("mid") at center',
      ].join("\n"),
    );
    expect(ast.actors["c"].anchor).toBe("center");
    expect(ast.actors["c"].x).toBe(400);
    expect(ast.actors["c"].y).toBe(200);
  });

  it("requires an `at` clause (captions never default-position silently)", () => {
    expect(() =>
      parse([
        "scene width=800 height=400",
        'actor c = caption("hi")',
      ].join("\n")),
    ).toThrow(ParseError);
  });

  it("rejects numeric positioning on caption actors", () => {
    // The renderer always applies a `-50%, -50%` self-centering transform
    // to captions, so `at (x, y)` would give wildly different visual
    // semantics than for text/box actors. Docs explicitly disallow it.
    expect(() =>
      parse(
        [
          "scene width=800 height=400",
          'actor c = caption("hi") at (100, 50)',
        ].join("\n"),
      ),
    ).toThrow(/Caption actors require anchor syntax/);
  });

  it("also rejects numeric positioning when the caption is created via a `def` template", () => {
    expect(() =>
      parse(
        [
          "def subtitle(txt) {",
          '  caption(${txt})',
          "}",
          'actor s = subtitle("hi") at (100, 50)',
        ].join("\n"),
      ),
    ).toThrow(/Caption actors require anchor syntax/);
  });

  it("accepts anchor syntax when the caption is created via a `def` template", () => {
    // Regression: previously the inverse check ran against the surface
    // type name (`subtitle`) and spuriously rejected anchor syntax for
    // templates that expand to caption.
    const ast = parse(
      [
        "def subtitle(txt) {",
        '  caption(${txt})',
        "}",
        'actor s = subtitle("hi") at top',
      ].join("\n"),
    );
    expect(ast.actors["s"].type).toBe("caption");
    expect(ast.actors["s"].anchor).toBe("top");
  });
});

// ---------------------------------------------------------------------------

describe("chapters — scene \"title\" { ... }", () => {
  it("records the named block in ast.chapters", () => {
    const ast = parse(
      [
        "actor h = figure(#c68642, m, 😎) at (10, 10)",
        'scene "intro" {',
        "  @+0.0: h.enter(from=left, dur=0.4)",
        '  @+0.1: h.face("🙂")',
        "}",
      ].join("\n"),
    );
    expect(ast.chapters).toHaveLength(1);
    expect(ast.chapters[0].name).toBe("intro");
    expect(ast.events.every((e) => e.chapter === "intro")).toBe(true);
  });

  it("leaves top-level events outside any chapter", () => {
    const ast = parse(
      [
        "actor h = figure(#c68642, m, 😎) at (10, 10)",
        "@0.0: h.enter(from=left, dur=0.4)",
      ].join("\n"),
    );
    expect(ast.chapters).toHaveLength(0);
    expect(ast.events[0].chapter).toBeUndefined();
  });

  it("resolves per-chapter @+N relative to the chapter's own prev event", () => {
    const ast = parse(
      [
        "actor h = figure(#c68642, m, 😎) at (10, 10)",
        '@0.0: h.enter(from=left, dur=0.4)',
        'scene "shot" {',
        "  @+0.0: h.say(\"A\", dur=0.5)",
        "  @+0.1: h.say(\"B\", dur=0.5)",
        "}",
      ].join("\n"),
    );
    const sayEvents = ast.events.filter((e) => e.action === "say");
    expect(sayEvents.map((e) => e.time)).toEqual([0.4, 1.0]);
  });

  it("chains adjacent chapters — next chapter starts where the previous one ended", () => {
    const ast = parse(
      [
        "actor h = figure(#c68642, m, 😎) at (10, 10)",
        'scene "a" {',
        "  @+0.0: h.enter(from=left, dur=0.6)",
        "  @+0.1: h.say(\"A\", dur=0.5)",
        "}",
        'scene "b" {',
        "  @+0.0: h.face(\"😎\")",
        "  @+0.2: h.say(\"B\", dur=0.4)",
        "}",
      ].join("\n"),
    );
    // Chapter "a" ends at 0.6 (enter) + 0.1 + 0.5 = 1.2
    expect(ast.chapters[0]).toMatchObject({ name: "a", startTime: 0, endTime: 1.2 });
    // Chapter "b" picks up where "a" left off.
    expect(ast.chapters[1].startTime).toBe(1.2);
    const bEvents = ast.events.filter((e) => e.chapter === "b");
    expect(bEvents[0].time).toBe(1.2);
    expect(bEvents[1].time).toBeCloseTo(1.4, 3);
  });

  it("rejects a bare `scene` header inside a chapter block", () => {
    // scene header only has meaning at top level; inside a chapter it's
    // almost always a typo for another `scene "title" { ... }`.
    expect(() =>
      parse(
        [
          "scene width=800 height=400",
          "actor h = box() at (100, 100)",
          'scene "intro" {',
          "  scene width=2000",
          "  @+0.0: h.fade_in(dur=0.4)",
          "}",
        ].join("\n"),
      ),
    ).toThrow(/scene header inside chapter/);
  });

  it("reports startTime as the earliest event time, even when events are absolute", () => {
    // Chapter inherits a high `openedAt` from top scope but then the first
    // event uses an absolute earlier timestamp. `startTime` should reflect
    // the actual earliest event so timeline UIs line up.
    const ast = parse(
      [
        "actor h = box() at (100, 100)",
        "@1.0: h.fade_in(dur=0.4)",
        'scene "jump" {',
        "  @0.2: h.fade_in(dur=0.4)",
        "}",
      ].join("\n"),
    );
    expect(ast.chapters[0].startTime).toBeCloseTo(0.2, 3);
  });

  it("empty chapter still records a deterministic startTime", () => {
    const ast = parse(
      [
        "actor h = box() at (100, 100)",
        "@1.0: h.fade_in(dur=0.4)",
        'scene "quiet" {',
        "}",
      ].join("\n"),
    );
    // Ends at 1.0 + 0.4 = 1.4 (fade_in end-time).
    expect(ast.chapters[0].startTime).toBeCloseTo(1.4, 3);
    expect(ast.chapters[0].endTime).toBeCloseTo(1.4, 3);
  });
});

// ---------------------------------------------------------------------------

describe("@+N: relative-time shorthand", () => {
  it("schedules events N seconds after the previous event's end", () => {
    const ast = parse(
      [
        "actor a = figure(#c68642, m, 😎) at (100, 100)",
        "@0.0: a.enter(from=left, dur=0.6)",
        '@+0.4: a.say("hi", dur=1.0)',
      ].join("\n"),
    );
    expect(ast.events.map((e) => e.time)).toEqual([0.0, 1.0]);
  });

  it("handles a sequence of relative events", () => {
    const ast = parse(
      [
        "actor a = figure(#c68642, m, 😎) at (0,0)",
        "@0.0: a.enter(from=left, dur=0.4)",
        '@+0.0: a.say("A", dur=0.5)',
        '@+0.0: a.say("B", dur=0.5)',
      ].join("\n"),
    );
    expect(ast.events.map((e) => e.time)).toEqual([0.0, 0.4, 0.9]);
  });
});

// ---------------------------------------------------------------------------

describe("camera reserved actor", () => {
  it("records camera.pan with tuple coords", () => {
    const ast = parse(
      [
        "scene width=800 height=400",
        'actor h = text("x") at (100, 100)',
        "@0.0: camera.pan(to=(400, 200), dur=1.0)",
      ].join("\n"),
    );
    const cam = ast.events.find((e) => e.actor === "camera");
    expect(cam?.action).toBe("pan");
    expect(cam?.params.to).toEqual([400, 200]);
  });

  it("records camera.zoom with scalar target", () => {
    const ast = parse(
      [
        "scene width=800 height=400",
        'actor h = text("x") at (0, 0)',
        "@0.0: camera.zoom(to=1.5, dur=0.8)",
      ].join("\n"),
    );
    const cam = ast.events[0];
    expect(cam.actor).toBe("camera");
    expect(cam.action).toBe("zoom");
    expect(cam.params.to).toBe(1.5);
  });

  it("records camera.shake with intensity", () => {
    const ast = parse(
      [
        "scene width=800 height=400",
        'actor h = text("x") at (0, 0)',
        "@0.0: camera.shake(intensity=8, dur=0.4)",
      ].join("\n"),
    );
    expect(ast.events[0]).toMatchObject({
      actor: "camera",
      action: "shake",
      params: { intensity: 8, dur: 0.4 },
    });
  });

  it("soft-warns on unknown camera actions", () => {
    const ast = parse(
      [
        "scene width=800 height=400",
        'actor h = text("x") at (0,0)',
        "@0.0: camera.spin(dur=1.0)",
      ].join("\n"),
    );
    expect(ast.warnings.some((w) => w.message.includes("spin"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe("exit action", () => {
  it("is accepted as a universal action", () => {
    const ast = parse(
      [
        "actor h = figure(#c68642, m, 😎) at (100, 100)",
        "@0.0: h.enter(from=left, dur=0.4)",
        "@1.0: h.exit(to=right, dur=0.4)",
      ].join("\n"),
    );
    expect(ast.events.map((e) => e.action)).toEqual(["enter", "exit"]);
    expect(ast.events[1].params.to).toBe("right");
  });

  it("works on text and box actors too", () => {
    const ast = parse(
      [
        'actor t = text("x") at (0,0)',
        "@0.0: t.exit(to=top, dur=0.3)",
      ].join("\n"),
    );
    expect(ast.events[0].action).toBe("exit");
  });
});

// ---------------------------------------------------------------------------

describe("import statements", () => {
  it("records the import declaration", () => {
    const ast = parse('import "./characters.markdy" as chars');
    expect(ast.imports).toHaveLength(1);
    expect(ast.imports[0].namespace).toBe("chars");
    expect(ast.imports[0].path).toBe("./characters.markdy");
  });

  it("warns when no host-provided imports resolve the namespace", () => {
    const ast = parse('import "./characters.markdy" as chars');
    expect(ast.warnings.some((w) => w.kind === "import-unresolved")).toBe(true);
  });

  it("merges a resolved namespace's vars, defs, seqs", () => {
    const child = parse(
      [
        "var skin = #c68642",
        "def fighter(face) {",
        "  figure(${skin}, m, ${face})",
        "}",
      ].join("\n"),
    );
    const ast = parse('import "./child.markdy" as chars', {
      imports: { chars: child },
    });
    expect(ast.vars["chars.skin"]).toBe("#c68642");
    expect(ast.defs["chars.fighter"]).toBeDefined();
  });

  it("lets actors reference dotted (namespaced) defs", () => {
    const child = parse(
      [
        "def fighter(skin, face) {",
        "  figure(${skin}, m, ${face})",
        "}",
      ].join("\n"),
    );
    const ast = parse(
      [
        'import "./child.markdy" as chars',
        "scene width=800 height=400",
        "actor hero = chars.fighter(#c68642, 😎) at (400, 200)",
      ].join("\n"),
      { imports: { chars: child } },
    );
    expect(ast.actors["hero"].type).toBe("figure");
    expect(ast.actors["hero"].args).toEqual(["#c68642", "m", "😎"]);
  });

  it("resolves dotted (namespaced) variable refs via ${ns.name}", () => {
    const child = parse("var skin = #c68642");
    const ast = parse(
      [
        'import "./child.markdy" as chars',
        'actor hero = figure(${chars.skin}, m, 😎) at (100, 100)',
      ].join("\n"),
      { imports: { chars: child } },
    );
    expect(ast.actors["hero"].args).toEqual(["#c68642", "m", "😎"]);
  });

  it("expands namespaced sequences via play(ns.seqName)", () => {
    const child = parse(
      [
        "seq combo {",
        "  @+0.0: $.fade_in(dur=0.3)",
        "  @+0.3: $.fade_out(dur=0.3)",
        "}",
      ].join("\n"),
    );
    const ast = parse(
      [
        'import "./child.markdy" as anim',
        "actor h = box() at (100, 100)",
        "@0.0: h.play(anim.combo)",
      ].join("\n"),
      { imports: { anim: child } },
    );
    expect(ast.events.map((e) => e.action)).toEqual(["fade_in", "fade_out"]);
    expect(ast.events[0].time).toBe(0);
    expect(ast.events[1].time).toBeCloseTo(0.3, 3);
  });
});

// ---------------------------------------------------------------------------

describe("preset expansion", () => {
  it("expands the meme preset into a complete scene", () => {
    const ast = parse('preset meme("top", "bottom")');
    expect(ast.actors["top"].type).toBe("caption");
    expect(ast.actors["top"].args[0]).toBe("top");
    expect(ast.actors["bottom"].args[0]).toBe("bottom");
  });

  it("expands every built-in preset without errors", async () => {
    const { PRESET_NAMES } = await import("../src/presets.js");
    for (const name of PRESET_NAMES) {
      expect(() => parse(`preset ${name}`)).not.toThrow();
    }
  });

  it("warns `unknown-preset` with the list of valid names on a typo", () => {
    // Regression: previously any unrecognised preset silently produced an
    // empty scene with a misleading `preset-mixed` warning. Now it surfaces
    // the typo directly.
    const ast = parse("preset meem");
    expect(ast.warnings).toHaveLength(1);
    expect(ast.warnings[0].kind).toBe("unknown-preset");
    expect(ast.warnings[0].message).toContain('"meem"');
    // The message should enumerate valid names so the author can self-correct.
    expect(ast.warnings[0].message).toContain("meme");
  });

  it("still emits `preset-mixed` when a known preset is used alongside other statements", () => {
    const ast = parse(
      [
        "scene width=800 height=400",
        "preset meme",
        'actor h = text("x") at (100, 100)',
      ].join("\n"),
    );
    expect(ast.warnings.some((w) => w.kind === "preset-mixed")).toBe(true);
    expect(ast.warnings.some((w) => w.kind === "unknown-preset")).toBe(false);
  });

  it("prefers `unknown-preset` over `preset-mixed` when the name is unrecognised in a mixed file", () => {
    const ast = parse(
      [
        "scene width=800 height=400",
        "preset meem",
        'actor h = text("x") at (100, 100)',
      ].join("\n"),
    );
    // Either order is acceptable as long as the typo is surfaced.
    expect(ast.warnings.some((w) => w.kind === "unknown-preset")).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe("!action prefix — hard-fail opt-in for unknown actions", () => {
  it("soft-warns unknown actions by default", () => {
    const ast = parse(
      [
        "actor h = figure(#c68642, m, 😎) at (0,0)",
        "@0.0: h.breakdance(dur=0.5)",
      ].join("\n"),
    );
    expect(ast.warnings).toHaveLength(1);
    expect(ast.warnings[0].kind).toBe("unknown-action");
  });

  it("hard-fails with ! on unknown actions", () => {
    expect(() =>
      parse(
        [
          "actor h = figure(#c68642, m, 😎) at (0,0)",
          "@0.0: h.!breakdance(dur=0.5)",
        ].join("\n"),
      ),
    ).toThrow(ParseError);
  });

  it("accepts ! when the action is known (no-op)", () => {
    const ast = parse(
      [
        "actor h = figure(#c68642, m, 😎) at (0,0)",
        "@0.0: h.!shake(intensity=5, dur=0.3)",
      ].join("\n"),
    );
    expect(ast.events[0].action).toBe("shake");
  });
});

// ---------------------------------------------------------------------------

describe("unified with-modifier form", () => {
  it("parses `with key=val, key=val`", () => {
    const ast = parse(
      'actor t = box() at (10, 10) with scale=1.5, opacity=0.4, rotate=45',
    );
    expect(ast.actors["t"]).toMatchObject({ scale: 1.5, opacity: 0.4, rotate: 45 });
  });

  it("preserves the space-separated form for back-compat", () => {
    const ast = parse(
      'actor t = box() at (10, 10) scale 1.5 rotate 45 opacity 0.4',
    );
    expect(ast.actors["t"]).toMatchObject({ scale: 1.5, opacity: 0.4, rotate: 45 });
  });

  it("accepts the two forms mixed on the same line", () => {
    const ast = parse(
      'actor t = box() at (10, 10) scale 1.5 with opacity=0.4, rotate=45',
    );
    expect(ast.actors["t"]).toMatchObject({ scale: 1.5, opacity: 0.4, rotate: 45 });
  });
});

// ---------------------------------------------------------------------------

describe("figure-only type check", () => {
  it("hard-fails on non-figure actors", () => {
    expect(() =>
      parse(
        [
          'actor t = text("x") at (0,0)',
          "@0.0: t.punch(side=right, dur=0.3)",
        ].join("\n"),
      ),
    ).toThrow(/figure-only/);
  });

  it("accepts figure-only actions on figure actors", () => {
    const ast = parse(
      [
        "actor f = figure(#c68642, m, 😎) at (0,0)",
        "@0.0: f.punch(side=right, dur=0.3)",
      ].join("\n"),
    );
    expect(ast.events[0].action).toBe("punch");
  });
});

// ---------------------------------------------------------------------------

describe("soft warnings on unknown tokens", () => {
  it("warns on unknown scene keys", () => {
    const ast = parse("scene unknown_key=whatever");
    expect(ast.warnings.some((w) => w.kind === "unknown-scene-key")).toBe(true);
  });

  it("warns on unknown modifier keys inside `with(...)`", () => {
    const ast = parse(
      'actor t = box() at (0,0) with scale=1.2, fizzbuzz=true',
    );
    expect(ast.warnings.some((w) => w.kind === "unknown-modifier")).toBe(true);
  });

  it("never warns on a known-good program", () => {
    const ast = parse(
      [
        "scene width=800 height=400 fps=30",
        "actor h = figure(#c68642, m, 😎) at (100, 100)",
        "@0.0: h.enter(from=left, dur=0.4)",
      ].join("\n"),
    );
    expect(ast.warnings).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe("combined end-to-end extended program", () => {
  it("parses a scene using chapters + camera + caption + @+N + exit", () => {
    const ast = parse(
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
        "}",
      ].join("\n"),
    );

    expect(ast.warnings).toEqual([]);
    expect(ast.actors["title"].type).toBe("caption");
    expect(ast.chapters.map((c) => c.name)).toEqual(["intro", "outro"]);
    const introEvents = ast.events.filter((e) => e.chapter === "intro");
    const outroEvents = ast.events.filter((e) => e.chapter === "outro");
    expect(introEvents).toHaveLength(2);
    expect(outroEvents).toHaveLength(2);
    expect(ast.events.find((e) => e.action === "exit")).toBeDefined();
    expect(ast.events.find((e) => e.actor === "camera" && e.action === "pan")).toBeDefined();
  });
});
