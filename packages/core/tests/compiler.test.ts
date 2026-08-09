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

  it("resolves frame cue targets and keeps zoom parameters", () => {
    const source = `
scene theme=paper
service API
database DB
group backend: API DB

beat inspect:
  frame backend zoom=1.3 dur=1s
`;
    const plan = compile(parse(source));
    const frame = plan.cues.find((cue) => cue.kind === "frame");
    expect(frame).toMatchObject({
      kind: "frame",
      targets: ["API", "DB"],
      duration: 1,
      params: { zoom: 1.3 },
    });
  });
});
