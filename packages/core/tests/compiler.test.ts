import { describe, it, expect } from "vitest";
import { parse, compile } from "../src/parser.js";

describe("compiler", () => {
  it("produces deterministic layout for the same source", () => {
    const source = `
scene "Demo" theme=midnight
layout LR
browser A
service B
service C

beat main:
  A -> B -> C
`;
    const a = compile(parse(source));
    const b = compile(parse(source));
    expect(a.nodes.map((n) => [n.id, n.x, n.y])).toEqual(b.nodes.map((n) => [n.id, n.x, n.y]));
    expect(a.duration).toBeGreaterThan(0);
  });

  it("schedules beats in order", () => {
    const source = `
scene theme=midnight
browser A
service B

beat one:
  show A
beat two:
  A -> B "ping"
`;
    const plan = compile(parse(source));
    expect(plan.beats.map((b) => b.name)).toEqual(["one", "two"]);
    expect(plan.cues.some((c) => c.kind === "flow")).toBe(true);
  });
});
