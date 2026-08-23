import { describe, it, expect } from "vitest";
import { parse, compile, computeAdaptiveDimensions } from "../src/index.js";

describe("Content-Adaptive Canvas Sizing", () => {
  it("preserves explicit dimensions when author specifies width and height", () => {
    const script = `
scene "Custom Sized Diagram" width=1600 height=900 theme=midnight
service A
service B

beat main:
  A -> B
`;
    const ast = parse(script);
    expect(ast.meta.explicitWidth).toBe(true);
    expect(ast.meta.explicitHeight).toBe(true);
    expect(ast.meta.width).toBe(1600);
    expect(ast.meta.height).toBe(900);

    const plan = compile(ast);
    expect(plan.meta.width).toBe(1600);
    expect(plan.meta.height).toBe(900);
  });

  it("handles partial explicit overrides (explicit width, auto height)", () => {
    const script = `
scene width=1440 theme=paper
service A
service B
service C

beat main:
  A -> B -> C
`;
    const ast = parse(script);
    expect(ast.meta.explicitWidth).toBe(true);
    expect(ast.meta.explicitHeight).toBeUndefined();

    const plan = compile(ast);
    expect(plan.meta.width).toBe(1440);
    expect(plan.meta.height).toBeGreaterThanOrEqual(576);
    expect(plan.meta.height % 16).toBe(0);
  });

  it("handles partial explicit overrides (explicit height, auto width)", () => {
    const script = `
scene height=800 theme=editorial
service A
service B

beat main:
  A -> B
`;
    const ast = parse(script);
    expect(ast.meta.explicitHeight).toBe(true);
    expect(ast.meta.explicitWidth).toBeUndefined();

    const plan = compile(ast);
    expect(plan.meta.height).toBe(800);
    expect(plan.meta.width).toBeGreaterThanOrEqual(960);
    expect(plan.meta.width % 16).toBe(0);
  });

  it("dynamically sizes small compact diagrams without excessive whitespace", () => {
    const script = `
scene theme=paper
service Client
service Server

beat main:
  Client -> Server "request"
`;
    const ast = parse(script);
    const plan = compile(ast);

    // Compact diagrams should be tight and clean (1024x576)
    expect(plan.meta.width).toBe(1024);
    expect(plan.meta.height).toBe(576);
    expect(plan.meta.width % 16).toBe(0);
    expect(plan.meta.height % 16).toBe(0);
  });

  it("dynamically expands dense horizontal architectures to prevent overlap", () => {
    const script = `
scene theme=midnight layout LR
service N1
service N2
service N3
service N4
service N5
service N6
service N7
service N8

beat pipeline:
  N1 -> N2 -> N3 -> N4 -> N5 -> N6 -> N7 -> N8
`;
    const ast = parse(script);
    const plan = compile(ast);

    // 8 ranks need wide canvas space
    expect(plan.meta.width).toBeGreaterThanOrEqual(1600);
    expect(plan.meta.width % 16).toBe(0);
    expect(plan.nodes.length).toBe(8);

    // Verify all nodes are within bounds
    for (const node of plan.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(48);
      expect(node.x + node.width).toBeLessThanOrEqual(plan.meta.width - 48);
    }
  });

  it("adapts vertical flowcharts (TB direction) with proportional height", () => {
    const script = `
scene theme=paper layout TB type=flowchart
start Begin
service Step1
service Step2
service Step3
service Step4
end Finish

beat flow:
  Begin -> Step1 -> Step2 -> Step3 -> Step4 -> Finish
`;
    const ast = parse(script);
    const plan = compile(ast);

    expect(plan.meta.direction).toBe("TB");
    // Deep vertical stack should allocate vertical space
    expect(plan.meta.height).toBeGreaterThanOrEqual(720);
    expect(plan.meta.height % 16).toBe(0);

    for (const node of plan.nodes) {
      expect(node.y).toBeGreaterThanOrEqual(84);
      expect(node.y + node.height).toBeLessThanOrEqual(plan.meta.height - 48);
    }
  });

  it("adapts sequence diagrams based on participants and flow count", () => {
    const script = `
scene "Payment Flow" theme=midnight type=sequence
client User
service Api
gateway PayGateway
database Db

beat auth:
  User -> Api "login"
  Api -> Db "query user"
  Api <- Db "ok"
  User <- Api "session token"

beat checkout:
  User -> Api "checkout"
  Api -> PayGateway "authorize"
  PayGateway -> Db "record txn"
  Api <- PayGateway "charge success"
  User <- Api "receipt"
`;
    const ast = parse(script);
    const plan = compile(ast);

    expect(plan.diagramType).toBe("sequence");
    // Sequence with 4 participants and 9 flow cues should allocate suitable vertical lifeline
    expect(plan.meta.width).toBeGreaterThanOrEqual(1088);
    expect(plan.meta.height).toBeGreaterThanOrEqual(800);
    expect(plan.sequenceMessages.length).toBe(9);
  });

  it("adapts tree diagrams based on subtree span and depth", () => {
    const script = `
scene "Org Structure" theme=paper type=tree
service CEO "CEO"
service VP1 "VP Eng"
service VP2 "VP Product"
service E1 "Eng 1"
service E2 "Eng 2"
service E3 "Eng 3"
service P1 "PM 1"
service P2 "PM 2"

beat hierarchy:
  CEO -> VP1 & CEO -> VP2
  VP1 -> E1 & VP1 -> E2 & VP1 -> E3
  VP2 -> P1 & VP2 -> P2
`;
    const ast = parse(script);
    const plan = compile(ast);

    expect(plan.diagramType).toBe("tree");
    expect(plan.meta.width).toBeGreaterThanOrEqual(1120);
    expect(plan.meta.height).toBeGreaterThanOrEqual(640);
    expect(plan.meta.width % 16).toBe(0);
    expect(plan.meta.height % 16).toBe(0);
  });

  it("adapts swimlane diagrams based on lane count and members", () => {
    const script = `
scene "Order Processing" theme=editorial type=swimlane
service C1 "Order Form"
service C2 "Pay Button"
service S1 "Order Service"
service S2 "Invoice Gen"
service D1 "Payment Gateway"

group frontend: C1 C2
group backend: S1 S2
group external: D1

beat main:
  show $nodes
`;
    const ast = parse(script);
    const plan = compile(ast);

    expect(plan.diagramType).toBe("swimlane");
    expect(plan.meta.width).toBeGreaterThanOrEqual(1152);
    expect(plan.meta.height).toBeGreaterThanOrEqual(640);
  });

  it("adapts circular and loop topologies", () => {
    const script = `
scene "Data Flywheel" theme=paper type=loop
service Ingest "Ingest Data"
service Train "Train Model"
service Deploy "Deploy Model"
service Measure "Measure Impact"

beat cycle:
  Ingest -> Train -> Deploy -> Measure -> Ingest
`;
    const ast = parse(script);
    const plan = compile(ast);

    expect(plan.diagramType).toBe("loop");
    expect(plan.meta.width).toBeGreaterThanOrEqual(1088);
    expect(plan.meta.height).toBeGreaterThanOrEqual(720);
  });

  it("exports computeAdaptiveDimensions for standalone AST inspection", () => {
    const ast = parse(`
scene theme=paper
service A
service B
service C

beat main:
  A -> B -> C
`);
    const dims = computeAdaptiveDimensions(ast);
    expect(dims.width).toBeGreaterThanOrEqual(1024);
    expect(dims.height).toBeGreaterThanOrEqual(576);
    expect(dims.width % 16).toBe(0);
    expect(dims.height % 16).toBe(0);
  });
});
