import { describe, it, expect } from "vitest";
import { parse, ParseError } from "../src/parser.js";
import type { SceneAST } from "../src/ast.js";

// ---------------------------------------------------------------------------
// Full DSL example (mirrors the spec exactly)
// ---------------------------------------------------------------------------

const EXAMPLE = `
scene width=800 height=400 fps=30 bg=white

asset pepe = image("https://media1.tenor.com/m/4n4cErvEq_sAAAAd/yapapa-cat.gif")
asset cat  = image("/memes/cat.png")
asset fire = icon("lucide:flame")

actor p     = sprite(pepe) at (100,250) scale 0.4
actor c     = sprite(cat)  at (600,250) scale 0.4
actor title = text("Ship it") at (320,80) size 48

@0.0: p.enter(from=left, dur=0.8)
@1.0: p.say("bruh", dur=1.0)
@2.0: p.move(to=(300,250), dur=1.0, ease=inout)
@3.0: p.throw(fire, to=c, dur=0.8)
@4.0: c.shake(intensity=3, dur=0.5)
@4.6: c.fade_out(dur=0.4)
@5.2: title.fade_in(dur=0.5)
`;

// ---------------------------------------------------------------------------
// Scene meta
// ---------------------------------------------------------------------------

describe("scene meta", () => {
  it("parses explicit scene properties", () => {
    const ast = parse("scene width=1024 height=768 fps=60 bg=black");
    expect(ast.meta).toMatchObject({ width: 1024, height: 768, fps: 60, bg: "black" });
  });

  it("applies defaults when scene line is absent", () => {
    // No scene line — defaults apply
    const ast = parse('asset x = image("/a.png")');
    expect(ast.meta).toMatchObject({ width: 800, height: 400, fps: 30, bg: "white" });
  });

  it("accepts an explicit duration", () => {
    const ast = parse("scene duration=10");
    expect(ast.meta.duration).toBe(10);
  });

  it("throws on duplicate scene declaration", () => {
    expect(() => parse("scene fps=30\nscene fps=60")).toThrow(ParseError);
  });

  it("throws on unknown scene property", () => {
    expect(() => parse("scene unknown=99")).toThrow(ParseError);
  });
});

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

describe("assets", () => {
  it("parses image and icon assets", () => {
    const ast = parse(`
      asset pepe = image("https://media1.tenor.com/m/4n4cErvEq_sAAAAd/yapapa-cat.gif")
      asset fire = icon("lucide:flame")
    `);
    expect(ast.assets["pepe"]).toEqual({ type: "image", value: "https://media1.tenor.com/m/4n4cErvEq_sAAAAd/yapapa-cat.gif" });
    expect(ast.assets["fire"]).toEqual({ type: "icon", value: "lucide:flame" });
  });

  it("throws on unsupported asset type", () => {
    expect(() => parse('asset x = video("/clip.mp4")')).toThrow(ParseError);
  });
});

// ---------------------------------------------------------------------------
// Actors
// ---------------------------------------------------------------------------

describe("actors", () => {
  it("parses a sprite actor with scale modifier", () => {
    const ast = parse("actor p = sprite(pepe) at (100,250) scale 0.4");
    expect(ast.actors["p"]).toMatchObject({
      type: "sprite",
      args: ["pepe"],
      x: 100,
      y: 250,
      scale: 0.4,
    });
  });

  it("parses a text actor with size modifier", () => {
    const ast = parse('actor title = text("Ship it") at (320,80) size 48');
    expect(ast.actors["title"]).toMatchObject({
      type: "text",
      args: ["Ship it"],
      x: 320,
      y: 80,
      size: 48,
    });
  });

  it("parses a box actor without modifiers", () => {
    const ast = parse("actor box1 = box() at (0,0)");
    expect(ast.actors["box1"]).toMatchObject({ type: "box", x: 0, y: 0 });
  });

  it("parses multiple modifiers on a single actor", () => {
    const ast = parse("actor a = sprite(img) at (10,20) scale 0.5 opacity 0.8 rotate 45");
    expect(ast.actors["a"]).toMatchObject({ scale: 0.5, opacity: 0.8, rotate: 45 });
  });

  it("parses z modifier for layering control", () => {
    const ast = parse("actor a = sprite(img) at (10,20) z 5");
    expect(ast.actors["a"]).toMatchObject({ z: 5 });
  });

  it("parses z modifier combined with other modifiers", () => {
    const ast = parse("actor a = sprite(img) at (10,20) scale 0.5 z 10 opacity 0.8");
    expect(ast.actors["a"]).toMatchObject({ scale: 0.5, z: 10, opacity: 0.8 });
  });

  it("throws on invalid actor declaration", () => {
    expect(() => parse("actor bad = unknown() at (0,0)")).toThrow(ParseError);
  });
});

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

describe("events", () => {
  function singleEvent(extra: string) {
    return parse(`actor p = sprite(pepe) at (0,0)\n${extra}`).events[0];
  }

  it("parses named params", () => {
    const ev = singleEvent("@0.0: p.enter(from=left, dur=0.8)");
    expect(ev).toMatchObject({
      time: 0.0,
      actor: "p",
      action: "enter",
      params: { from: "left", dur: 0.8 },
    });
  });

  it("parses tuple param to=(x,y)", () => {
    const ev = singleEvent("@2.0: p.move(to=(300,250), dur=1.0, ease=inout)");
    expect(ev.params).toEqual({ to: [300, 250], dur: 1.0, ease: "inout" });
  });

  it("maps the first positional string arg for say", () => {
    const ev = singleEvent('@1.0: p.say("bruh", dur=1.0)');
    expect(ev.params).toEqual({ text: "bruh", dur: 1.0 });
  });

  it("maps the first positional identifier arg for throw", () => {
    const ast = parse([
      "actor p = sprite(pepe) at (0,0)",
      "actor c = sprite(cat) at (600,250)",
      "@3.0: p.throw(fire, to=c, dur=0.8)",
    ].join("\n"));
    expect(ast.events[0].params).toEqual({ asset: "fire", to: "c", dur: 0.8 });
  });

  it("parses underscore-separated action names (fade_out, fade_in)", () => {
    const ev = singleEvent("@4.6: p.fade_out(dur=0.4)");
    expect(ev.action).toBe("fade_out");
    expect(ev.params).toEqual({ dur: 0.4 });
  });

  it("records the source line number", () => {
    const ast = parse([
      "",
      "actor p = sprite(pepe) at (0,0)",
      "@0.5: p.fade_in(dur=0.5)",
    ].join("\n"));
    expect(ast.events[0].line).toBe(3);
  });

  it("throws on event referencing an unknown actor", () => {
    expect(() => parse("@0.0: ghost.enter(dur=0.5)")).toThrow(ParseError);
  });

  it("throws on a malformed event line", () => {
    expect(() =>
      parse("actor p = sprite(pepe) at (0,0)\n@bad: p.enter(dur=0.5)"),
    ).toThrow(ParseError);
  });
});

// ---------------------------------------------------------------------------
// Duration auto-computation
// ---------------------------------------------------------------------------

describe("duration auto-computation", () => {
  it("computes duration from last event time + dur", () => {
    const ast = parse([
      "actor p = sprite(pepe) at (0,0)",
      "@5.2: p.fade_in(dur=0.5)",
    ].join("\n"));
    expect(ast.meta.duration).toBeCloseTo(5.7);
  });

  it("leaves duration undefined when there are no events", () => {
    const ast = parse('asset x = image("/x.png")');
    expect(ast.meta.duration).toBeUndefined();
  });

  it("does not override an explicit duration", () => {
    const ast = parse([
      "scene duration=20",
      "actor p = sprite(pepe) at (0,0)",
      "@5.0: p.fade_in(dur=1.0)",
    ].join("\n"));
    expect(ast.meta.duration).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// Comments and whitespace
// ---------------------------------------------------------------------------

describe("comments and whitespace", () => {
  it("strips full-line comments", () => {
    const ast = parse("# this is a comment\nscene fps=24");
    expect(ast.meta.fps).toBe(24);
  });

  it("strips inline comments", () => {
    const ast = parse("scene width=1024 height=768 # change later");
    expect(ast.meta.width).toBe(1024);
  });

  it("ignores blank lines", () => {
    const ast = parse("\n\nscene fps=24\n\n");
    expect(ast.meta.fps).toBe(24);
  });
});

// ---------------------------------------------------------------------------
// Unrecognized statements
// ---------------------------------------------------------------------------

describe("error handling", () => {
  it("throws ParseError with the correct line number", () => {
    let err: ParseError | undefined;
    try {
      parse("scene fps=30\nactor p = sprite(pepe) at (0,0)\n@0.0: p.enter(dur=0.5)\nbadtoken");
    } catch (e) {
      if (e instanceof ParseError) err = e;
    }
    expect(err).toBeInstanceOf(ParseError);
    expect(err?.line).toBe(4);
  });

  it("throws on unrecognized top-level statement", () => {
    expect(() => parse("gibberish line here")).toThrow(ParseError);
  });
});

// ---------------------------------------------------------------------------
// Full example integration
// ---------------------------------------------------------------------------

describe("full example", () => {
  it("parses without error", () => {
    expect(() => parse(EXAMPLE)).not.toThrow();
  });

  it("produces the correct counts", () => {
    const ast: SceneAST = parse(EXAMPLE);
    expect(Object.keys(ast.assets)).toHaveLength(3);
    expect(Object.keys(ast.actors)).toHaveLength(3);
    expect(ast.events).toHaveLength(7);
  });

  it("has correct meta", () => {
    const ast = parse(EXAMPLE);
    expect(ast.meta).toMatchObject({ width: 800, height: 400, fps: 30, bg: "white" });
  });

  it("auto-computes duration from the last event", () => {
    const ast = parse(EXAMPLE);
    // Last event: @5.2 + dur=0.5 = 5.7
    expect(ast.meta.duration).toBeCloseTo(5.7);
  });
});

// ---------------------------------------------------------------------------
// Variables (var)
// ---------------------------------------------------------------------------

describe("var declarations", () => {
  it("substitutes var in actor args", () => {
    const ast = parse([
      "var skin = #c68642",
      "actor h = figure(${skin}) at (0,0)",
    ].join("\n"));
    expect(ast.actors["h"].args).toEqual(["#c68642"]);
    expect(ast.vars["skin"]).toBe("#c68642");
  });

  it("substitutes var in position", () => {
    const ast = parse([
      "var px = 300",
      "var py = 200",
      "actor h = sprite(img) at (${px},${py})",
    ].join("\n"));
    expect(ast.actors["h"]).toMatchObject({ x: 300, y: 200 });
  });

  it("substitutes var in event params", () => {
    const ast = parse([
      "var speed = 0.8",
      "actor p = sprite(pepe) at (0,0)",
      "@1.0: p.enter(from=left, dur=${speed})",
    ].join("\n"));
    expect(ast.events[0].params.dur).toBe(0.8);
  });

  it("supports chained var references", () => {
    const ast = parse([
      "var base = 100",
      "var offset = ${base}",
      'actor p = sprite(x) at (${offset},0)',
    ].join("\n"));
    expect(ast.actors["p"].x).toBe(100);
  });

  it("stores vars in AST", () => {
    const ast = parse("var bg_color = #fff5f9\nscene bg=${bg_color}");
    expect(ast.vars["bg_color"]).toBe("#fff5f9");
    expect(ast.meta.bg).toBe("#fff5f9");
  });

  it("substitutes backslash-escaped var in actor args (String.raw MDX form)", () => {
    // String.raw`\${skin}` produces the literal string \${skin} with the backslash.
    // The parser must handle both ${var} and \${var}.
    const ast = parse([
      "var skin = #c68642",
      "actor h = figure(\\${skin}) at (0,0)",
    ].join("\n"));
    expect(ast.actors["h"].args).toEqual(["#c68642"]);
  });

  it("substitutes backslash-escaped var in position (String.raw MDX form)", () => {
    const ast = parse([
      "var px = 300",
      "var py = 200",
      "actor h = sprite(img) at (\\${px},\\${py})",
    ].join("\n"));
    expect(ast.actors["h"]).toMatchObject({ x: 300, y: 200 });
  });

  it("substitutes backslash-escaped var in event params", () => {
    const ast = parse([
      "var speed = 0.8",
      "actor p = sprite(pepe) at (0,0)",
      "@1.0: p.enter(from=left, dur=\\${speed})",
    ].join("\n"));
    expect(ast.events[0].params.dur).toBe(0.8);
  });

  it("substitutes backslash-escaped var in scene bg", () => {
    const ast = parse("var bg_color = #fff5f9\nscene bg=\\${bg_color}");
    expect(ast.meta.bg).toBe("#fff5f9");
  });

  it("supports chained backslash-escaped var references", () => {
    const ast = parse([
      "var base = 100",
      "var offset = \\${base}",
      "actor p = sprite(x) at (\\${offset},0)",
    ].join("\n"));
    expect(ast.actors["p"].x).toBe(100);
  });

  it("handles mixed backslash-escaped and plain vars", () => {
    const ast = parse([
      "var skin = #c68642",
      "var y = 200",
      "actor h = figure(\\${skin}) at (100,${y})",
    ].join("\n"));
    expect(ast.actors["h"].args).toEqual(["#c68642"]);
    expect(ast.actors["h"]).toMatchObject({ x: 100, y: 200 });
  });
});

// ---------------------------------------------------------------------------
// Def (user-defined actor templates)
// ---------------------------------------------------------------------------

describe("def declarations", () => {
  it("defines and uses a template", () => {
    const ast = parse([
      "def fighter(skin, face) {",
      "  figure(${skin}, m, ${face})",
      "}",
      "actor b = fighter(#c68642, 😏) at (300, 200)",
    ].join("\n"));
    expect(ast.actors["b"]).toMatchObject({
      type: "figure",
      args: ["#c68642", "m", "😏"],
      x: 300,
      y: 200,
    });
  });

  it("stores template in AST defs", () => {
    const ast = parse([
      "def hero(skin) {",
      "  figure(${skin}, m)",
      "}",
    ].join("\n"));
    expect(ast.defs["hero"]).toMatchObject({
      params: ["skin"],
      actorType: "figure",
      bodyArgs: ["${skin}", "m"],
    });
  });

  it("allows modifiers on template-based actors", () => {
    const ast = parse([
      "def npc(skin) {",
      "  figure(${skin})",
      "}",
      "actor a = npc(#ffdbac) at (0,0) scale 0.5 opacity 0.8",
    ].join("\n"));
    expect(ast.actors["a"]).toMatchObject({ scale: 0.5, opacity: 0.8 });
  });

  it("throws on unclosed def block", () => {
    expect(() => parse("def bad() {\n  figure()")).toThrow(ParseError);
  });

  it("throws on empty def body", () => {
    expect(() => parse("def bad() {\n}")).toThrow(ParseError);
  });

  it("handles backslash-escaped params in def body (String.raw MDX form)", () => {
    const ast = parse([
      "def guy(skin, face) {",
      "  figure(\\${skin}, m, \\${face})",
      "}",
      "actor b = guy(#c68642, 😎) at (300, 200)",
    ].join("\n"));
    expect(ast.actors["b"]).toMatchObject({
      type: "figure",
      args: ["#c68642", "m", "😎"],
      x: 300,
      y: 200,
    });
  });

  it("handles backslash-escaped global var in def caller args", () => {
    const ast = parse([
      "var skin = #c68642",
      "def guy(s) {",
      "  figure(${s}, m)",
      "}",
      "actor b = guy(\\${skin}) at (300, 200)",
    ].join("\n"));
    expect(ast.actors["b"]).toMatchObject({
      type: "figure",
      args: ["#c68642", "m"],
    });
  });
});

// ---------------------------------------------------------------------------
// Seq (reusable animation sequences)
// ---------------------------------------------------------------------------

describe("seq declarations", () => {
  it("defines and plays a basic sequence", () => {
    const ast = parse([
      "actor p = sprite(img) at (0,0)",
      "seq wave {",
      "  @+0.0: $.rotate_part(part=arm_right, to=-80, dur=0.3)",
      "  @+0.3: $.rotate_part(part=arm_right, to=-25, dur=0.3)",
      "}",
      "@2.0: p.play(wave)",
    ].join("\n"));
    expect(ast.events).toHaveLength(2);
    expect(ast.events[0]).toMatchObject({
      time: 2.0,
      actor: "p",
      action: "rotate_part",
      params: { part: "arm_right", to: -80, dur: 0.3 },
    });
    expect(ast.events[1]).toMatchObject({
      time: 2.3,
      actor: "p",
      action: "rotate_part",
      params: { part: "arm_right", to: -25, dur: 0.3 },
    });
  });

  it("plays a parameterized sequence", () => {
    const ast = parse([
      "actor p = sprite(img) at (0,0)",
      "seq hit(side) {",
      "  @+0.0: $.punch(side=${side}, dur=0.3)",
      "}",
      "@5.0: p.play(hit, side=left)",
    ].join("\n"));
    expect(ast.events[0].params).toMatchObject({ side: "left", dur: 0.3 });
  });

  it("stores sequence in AST seqs", () => {
    const ast = parse([
      "seq wobble {",
      "  @+0.0: $.shake(intensity=5, dur=0.2)",
      "}",
    ].join("\n"));
    expect(ast.seqs["wobble"]).toMatchObject({
      params: [],
      events: [{ offset: 0, action: "shake" }],
    });
  });

  it("throws on unclosed seq block", () => {
    expect(() => parse("seq bad {\n  @+0.0: $.enter(dur=0.5)")).toThrow(ParseError);
  });

  it("throws on unknown sequence in play", () => {
    expect(() => parse([
      "actor p = sprite(img) at (0,0)",
      "@0.0: p.play(nonexistent)",
    ].join("\n"))).toThrow(ParseError);
  });

  it("combines var + def + seq together", () => {
    const ast = parse([
      "var skin = #c68642",
      "def fighter(s, face) {",
      "  figure(${s}, m, ${face})",
      "}",
      "seq greeting {",
      '  @+0.0: $.say("hello", dur=1.0)',
      "}",
      "actor b = fighter(${skin}, 😎) at (300, 200)",
      "@1.0: b.play(greeting)",
    ].join("\n"));
    expect(ast.actors["b"]).toMatchObject({
      type: "figure",
      args: ["#c68642", "m", "😎"],
    });
    expect(ast.events[0]).toMatchObject({
      time: 1.0,
      actor: "b",
      action: "say",
      params: { text: "hello", dur: 1.0 },
    });
  });

  it("handles backslash-escaped vars in seq body params", () => {
    const ast = parse([
      "actor p = sprite(img) at (0,0)",
      "seq hit(side) {",
      "  @+0.0: $.punch(side=\\${side}, dur=0.3)",
      "}",
      "@5.0: p.play(hit, side=left)",
    ].join("\n"));
    expect(ast.events[0].params).toMatchObject({ side: "left", dur: 0.3 });
  });

  it("handles full MDX-realistic scene with all backslash-escaped forms", () => {
    // This simulates what String.raw produces in the actual blog post MDX
    const ast = parse([
      "var skin_jr = #c68642",
      "var skin_sr = #5b4033",
      "var y = 230",
      "",
      "scene width=960 height=460 bg=#0d1117",
      "",
      "def guy(skin, face) {",
      "  figure(\\${skin}, m, \\${face})",
      "}",
      "",
      "seq rage {",
      "  @+0.0: $.shake(intensity=8, dur=0.35)",
      "  @+0.35: $.rotate_part(part=arm_right, to=65, dur=0.25)",
      "  @+0.6: $.rotate_part(part=arm_right, to=-20, dur=0.25)",
      "}",
      "",
      "actor junior = guy(\\${skin_jr}, 😊) at (160, \\${y})",
      "actor senior = guy(\\${skin_sr}, 😒) at (800, \\${y})",
      "",
      "@0.0: junior.enter(from=left, dur=0.8)",
      "@0.5: senior.enter(from=right, dur=0.8)",
      "@5.5: senior.play(rage)",
    ].join("\n"));
    expect(ast.actors["junior"]).toMatchObject({
      type: "figure",
      args: ["#c68642", "m", "😊"],
      x: 160,
      y: 230,
    });
    expect(ast.actors["senior"]).toMatchObject({
      type: "figure",
      args: ["#5b4033", "m", "😒"],
      x: 800,
      y: 230,
    });
    expect(ast.events).toHaveLength(5); // 2 enters + 3 seq events
    expect(ast.events[2]).toMatchObject({
      time: 5.5,
      actor: "senior",
      action: "shake",
      params: { intensity: 8, dur: 0.35 },
    });
  });
});

// ---------------------------------------------------------------------------
// Bounds validation
// ---------------------------------------------------------------------------

describe("Bounds validation", () => {
  it("accepts actor at scene boundary", () => {
    const ast = parse([
      "scene width=400 height=300",
      'actor a = text("hi") at (400, 300)',
    ].join("\n"));
    expect(ast.actors["a"]).toMatchObject({ x: 400, y: 300 });
  });

  it("accepts actor at origin", () => {
    const ast = parse([
      "scene width=400 height=300",
      'actor a = text("hi") at (0, 0)',
    ].join("\n"));
    expect(ast.actors["a"]).toMatchObject({ x: 0, y: 0 });
  });

  it("rejects actor x exceeding scene width", () => {
    expect(() => parse([
      "scene width=400 height=300",
      'actor a = text("hi") at (401, 100)',
    ].join("\n"))).toThrow(/outside scene bounds/);
  });

  it("rejects actor y exceeding scene height", () => {
    expect(() => parse([
      "scene width=400 height=300",
      'actor a = text("hi") at (100, 301)',
    ].join("\n"))).toThrow(/outside scene bounds/);
  });

  it("rejects negative actor position", () => {
    expect(() => parse([
      "scene width=400 height=300",
      'actor a = text("hi") at (-1, 100)',
    ].join("\n"))).toThrow(/outside scene bounds/);
  });

  it("rejects move target outside scene bounds", () => {
    expect(() => parse([
      "scene width=400 height=300",
      'actor a = text("hi") at (100, 100)',
      "@1.0: a.move(to=(500, 100), dur=0.5)",
    ].join("\n"))).toThrow(/outside scene bounds/);
  });

  it("accepts move target within scene bounds", () => {
    const ast = parse([
      "scene width=400 height=300",
      'actor a = text("hi") at (100, 100)',
      "@1.0: a.move(to=(200, 150), dur=0.5)",
    ].join("\n"));
    expect(ast.events[0].params.to).toEqual([200, 150]);
  });

  it("includes actor name in error message", () => {
    expect(() => parse([
      "scene width=400 height=300",
      'actor hero = text("hi") at (500, 100)',
    ].join("\n"))).toThrow(/Actor "hero"/);
  });
});
