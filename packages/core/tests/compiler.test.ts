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

  it("assigns diagram type, shapes, group boundaries, and structural edges", () => {
    const source = `
scene "Checkout" theme=editorial type=flowchart
layout TB
start Start
decision Check
end End
edge path: Start -> Check -> End

group flow: Start Check End

beat main:
  show $nodes
  glow $edges
`;
    const plan = compile(parse(source));
    expect(plan.diagramType).toBe("flowchart");
    expect(plan.theme.name).toBe("editorial");
    const check = plan.nodes.find((n) => n.id === "Check");
    expect(check?.shape).toBe("diamond");
    expect(plan.groupBoundaries.some((b) => b.id === "flow")).toBe(true);
    expect(plan.edges.some((e) => e.structural && e.from === "Start")).toBe(true);
    const glow = plan.cues.find((c) => c.kind === "glow");
    expect(glow?.targets.some((t) => t.startsWith("edge_") || t.startsWith("flow_"))).toBe(true);
  });

  it("uses tree layout for type=tree", () => {
    const source = `
scene type=tree theme=paper
layout TB
service Root
service ChildA
service ChildB

edge e1: Root -> ChildA
edge e2: Root -> ChildB

beat main:
  show $nodes
`;
    const plan = compile(parse(source));
    expect(plan.diagramType).toBe("tree");
    const root = plan.nodes.find((n) => n.id === "Root")!;
    const childA = plan.nodes.find((n) => n.id === "ChildA")!;
    expect(childA.y).toBeGreaterThan(root.y);
  });

  it("uses column layout for type=sequence", () => {
    const source = `
scene type=sequence theme=paper
participant Client
participant API
participant DB

beat main:
  show $nodes
  Client -> API "request"
  API -> DB "query"
`;
    const plan = compile(parse(source));
    expect(plan.diagramType).toBe("sequence");
    const client = plan.nodes.find((n) => n.id === "Client")!;
    const api = plan.nodes.find((n) => n.id === "API")!;
    expect(client.column).toBeDefined();
    expect(api.column).toBeDefined();
    expect(api.x).toBeGreaterThan(client.x);
    expect(plan.sequenceMessages).toHaveLength(2);
    expect(plan.sequenceMessages[0]).toMatchObject({ from: "Client", to: "API", label: "request" });
    expect(plan.sequenceMessages[1].y).toBeGreaterThan(plan.sequenceMessages[0].y);
    expect(plan.sequenceActivations).toHaveLength(4);
  });

  it("keeps state cycles finite and warning-free", () => {
    const source = `
scene type=state theme=paper
state Pending
state Paid

edge forward: Pending -> Paid
edge retry: Paid -> Pending

beat main:
  show $nodes
`;
    const ast = parse(source);
    const plan = compile(ast);
    expect(ast.diagnostics).toEqual([]);
    expect(plan.nodes.every((node) => Number.isFinite(node.x) && Number.isFinite(node.y))).toBe(true);
    expect(plan.nodes.find((node) => node.id === "Paid")?.shape).toBe("rounded");
  });

  it("builds shared tree buses for sibling fan-out", () => {
    const source = `
scene type=tree theme=paper
service Root
service Left
service Right
edge left: Root -> Left
edge right: Root -> Right
`;
    const plan = compile(parse(source));
    expect(plan.treeBuses).toHaveLength(1);
    expect(plan.treeBuses[0]).toMatchObject({
      parentId: "Root",
      childIds: ["Left", "Right"],
    });
    expect(plan.treeBuses[0].childXs[0]).toBeLessThan(plan.treeBuses[0].childXs[1]);
  });
});
