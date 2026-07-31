/**
 * `group` declarations and staggered fan-out.
 *
 * Groups are a parse-time construct: they expand into ordinary per-actor
 * events so the renderer stays unaware of them. These tests pin both halves
 * of that contract — the expansion itself, and the fact that nothing about
 * single-actor events changes.
 */
import { describe, it, expect } from "vitest";
import { parse, ParseError } from "../src/index.js";

const SCENE = "scene width=800 height=400";
const ACTORS = [
  'actor a = text("A") at (10, 10)',
  'actor b = text("B") at (20, 10)',
  'actor c = text("C") at (30, 10)',
].join("\n");

function parseScene(...lines: string[]) {
  return parse([SCENE, ACTORS, ...lines].join("\n"));
}

describe("group declaration", () => {
  it("records members in author order", () => {
    const ast = parseScene("group all = a, b, c");
    expect(ast.groups).toEqual({ all: ["a", "b", "c"] });
  });

  it("tolerates loose whitespace around members", () => {
    const ast = parseScene("group all =   a ,b ,  c  ");
    expect(ast.groups.all).toEqual(["a", "b", "c"]);
  });

  it("rejects a member that isn't a declared actor", () => {
    expect(() => parseScene("group all = a, nope")).toThrow(ParseError);
    expect(() => parseScene("group all = a, nope")).toThrow(/Unknown actor "nope" in group "all"/);
  });

  it("rejects a name that collides with an actor", () => {
    expect(() => parseScene("group a = b, c")).toThrow(/collides with an actor/);
  });

  it("rejects redefinition", () => {
    expect(() => parseScene("group g = a, b", "group g = b, c")).toThrow(/already defined/);
  });

  it("rejects duplicate members", () => {
    expect(() => parseScene("group g = a, b, a")).toThrow(/listed twice/);
  });

  it("rejects an empty member list", () => {
    expect(() => parseScene("group g =   ")).toThrow(ParseError);
  });
});

describe("group fan-out", () => {
  it("emits one event per member, in declaration order", () => {
    const ast = parseScene("group all = a, b, c", "@1.0: all.fade_in(dur=0.5)");

    expect(ast.events).toHaveLength(3);
    expect(ast.events.map((e) => e.actor)).toEqual(["a", "b", "c"]);
    expect(ast.events.every((e) => e.action === "fade_in")).toBe(true);
  });

  it("fires members simultaneously when no stagger is given", () => {
    const ast = parseScene("group all = a, b, c", "@1.0: all.fade_in(dur=0.5)");
    expect(ast.events.map((e) => e.time)).toEqual([1.0, 1.0, 1.0]);
  });

  it("walks the start time forward by stagger for each member", () => {
    const ast = parseScene("group all = a, b, c", "@1.0: all.fade_in(dur=0.5, stagger=0.2)");
    expect(ast.events.map((e) => e.time)).toEqual([1.0, 1.2, 1.4]);
  });

  it("keeps stagger out of the emitted params", () => {
    const ast = parseScene("group all = a, b", "@1.0: all.fade_in(dur=0.5, stagger=0.2)");
    for (const ev of ast.events) {
      expect(ev.params).not.toHaveProperty("stagger");
      expect(ev.params.dur).toBe(0.5);
    }
  });

  it("preserves other params untouched, including parenthesized ones", () => {
    const ast = parseScene("group all = a, b", "@0.0: all.move(to=(300, 250), dur=1.0, stagger=0.1)");

    expect(ast.events).toHaveLength(2);
    for (const ev of ast.events) {
      expect(ev.params.to).toEqual([300, 250]);
      expect(ev.params.dur).toBe(1.0);
    }
    expect(ast.events.map((e) => e.time)).toEqual([0.0, 0.1]);
  });

  it("works with @+N relative timing", () => {
    const ast = parseScene(
      "group all = a, b",
      "@0.0: a.fade_in(dur=0.5)",
      "@+0.5: all.move(to=(100, 100), dur=0.4, stagger=0.25)",
    );

    // Previous event ends at 0.5, +0.5 offset => 1.0 for the first member.
    const fanned = ast.events.filter((e) => e.action === "move");
    expect(fanned.map((e) => e.time)).toEqual([1.0, 1.25]);
  });

  it("extends the auto-computed scene duration to the last member", () => {
    const ast = parseScene("group all = a, b, c", "@0.0: all.fade_in(dur=1.0, stagger=0.5)");
    // Last member starts at 1.0 and runs 1.0s.
    expect(ast.meta.duration).toBe(2.0);
  });

  it("type-checks each member individually", () => {
    const source = [
      SCENE,
      'actor guide = figure(#c68642, m, 🙂) at (10, 10)',
      'actor label = text("L") at (20, 10)',
      "group both = guide, label",
      "@0.0: both.wave(side=right, dur=0.4)",
    ].join("\n");

    // `wave` is figure-only, so fanning it onto a text actor must still fail.
    expect(() => parse(source)).toThrow(/figure-only/);
  });

  it("rejects a negative stagger", () => {
    expect(() => parseScene("group all = a, b", "@0.0: all.fade_in(stagger=-1)")).toThrow(
      /must not be negative/,
    );
  });

  it("rejects a non-numeric stagger", () => {
    expect(() => parseScene("group all = a, b", "@0.0: all.fade_in(stagger=fast)")).toThrow(
      /Invalid stagger value/,
    );
  });
});

describe("single-actor events are unaffected", () => {
  it("still emits exactly one event", () => {
    const ast = parseScene("@1.0: a.fade_in(dur=0.5)");
    expect(ast.events).toHaveLength(1);
    expect(ast.events[0]).toMatchObject({ actor: "a", action: "fade_in", time: 1.0 });
  });

  it("leaves groups empty when the feature is unused", () => {
    expect(parseScene("@1.0: a.fade_in(dur=0.5)").groups).toEqual({});
  });

  it("still rejects unknown actors", () => {
    expect(() => parseScene("@1.0: ghost.fade_in(dur=0.5)")).toThrow(/Unknown actor/);
  });
});
