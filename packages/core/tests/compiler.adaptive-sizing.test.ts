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
    expect(plan.meta.height).toBeGreaterThanOrEqual(208);
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
    expect(plan.meta.width).toBeGreaterThanOrEqual(480);
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

    // Compact diagrams should be tight and clean without excessive whitespace
    expect(plan.meta.width).toBe(512);
    expect(plan.meta.height).toBe(240);
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
    expect(plan.meta.width).toBeGreaterThanOrEqual(960);
    expect(plan.meta.height).toBeGreaterThanOrEqual(750);
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
    expect(plan.meta.width).toBeGreaterThanOrEqual(960);
    expect(plan.meta.height).toBeGreaterThanOrEqual(560);
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
    expect(plan.meta.width).toBeGreaterThanOrEqual(704);
    expect(plan.meta.height).toBeGreaterThanOrEqual(560);
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
    expect(plan.meta.width).toBeGreaterThanOrEqual(640);
    expect(plan.meta.height).toBeGreaterThanOrEqual(600);
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
    expect(dims.width).toBeGreaterThanOrEqual(720);
    expect(dims.height).toBeGreaterThanOrEqual(208);
    expect(dims.width % 16).toBe(0);
    expect(dims.height % 16).toBe(0);
  });

  it("adapts tree diagrams for portrait (TB) vs landscape (LR) orientation", () => {
    const scriptTB = `
scene "Consistent Hash Ring" theme=paper type=tree layout TB
service Coord "Ring Coordinator"
service TierA "Partition Tier A"
service TierB "Partition Tier B"
database V1 "vNode 1"
database V2 "vNode 2"
database V3 "vNode 3"
database V4 "vNode 4"

beat main:
  Coord -> TierA & Coord -> TierB
  TierA -> V1 & TierA -> V2
  TierB -> V3 & TierB -> V4
`;
    const planTB = compile(parse(scriptTB));
    expect(planTB.diagramType).toBe("tree");
    expect(planTB.meta.direction).toBe("TB");
    // Portrait tree: narrower width and vertical height
    expect(planTB.meta.width).toBeLessThanOrEqual(800);
    expect(planTB.meta.height).toBeGreaterThanOrEqual(680);

    const nodeById = new Map(planTB.nodes.map((n) => [n.id, n]));
    const coord = nodeById.get("Coord")!;
    const tierA = nodeById.get("TierA")!;
    const tierB = nodeById.get("TierB")!;
    const v1 = nodeById.get("V1")!;

    // Root coordinator is above tiers
    expect(coord.y).toBeLessThan(tierA.y);
    // Tier A is above Tier B (stacked vertically in portrait)
    expect(tierA.y).toBeLessThan(tierB.y);
    // Leaves (V1) are placed to the right of branch head TierA
    expect(v1.x).toBeGreaterThan(tierA.x);
  });

  it("adapts medallion diagrams for portrait (TB) vs landscape (LR) orientation", () => {
    const scriptTB = `
scene "Medallion Pipeline" theme=paper type=medallion layout TB
bronze B1 "Bronze 1"
bronze B2 "Bronze 2"
silver S1 "Silver 1"
silver S2 "Silver 2"
gold G1 "Gold 1"
gold G2 "Gold 2"
client C1 "Client 1"
client C2 "Client 2"

beat main:
  B1 -> S1 -> G1 -> C1
`;
    const planTB = compile(parse(scriptTB));
    expect(planTB.diagramType).toBe("medallion");
    expect(planTB.meta.direction).toBe("TB");
    // Portrait medallion: compact width and vertical height with 4 rows
    expect(planTB.meta.width).toBeLessThanOrEqual(800);
    expect(planTB.meta.height).toBeGreaterThanOrEqual(680);

    const nodeById = new Map(planTB.nodes.map((n) => [n.id, n]));
    const b1 = nodeById.get("B1")!;
    const s1 = nodeById.get("S1")!;
    const g1 = nodeById.get("G1")!;
    const c1 = nodeById.get("C1")!;

    // Tiers stack top to bottom: Bronze -> Silver -> Gold -> Client
    expect(b1.y).toBeLessThan(s1.y);
    expect(s1.y).toBeLessThan(g1.y);
    expect(g1.y).toBeLessThan(c1.y);
  });

  it("adapts timeline diagrams for portrait (TB) vs landscape (LR) orientation", () => {
    const scriptLR = `
scene "WAL Progression" theme=auto type=timeline layout LR
event T0 "T0: Client Ingress"
event T1 "T1: WAL fsync"
event T2 "T2: MemTable"
event T3 "T3: SSTable"
`;
    const planLR = compile(parse(scriptLR));
    expect(planLR.diagramType).toBe("timeline");
    expect(planLR.meta.direction).toBe("LR");
    // Landscape: wide horizontal layout
    expect(planLR.meta.width).toBeGreaterThanOrEqual(960);

    const scriptTB = `
scene "WAL Progression" theme=auto type=timeline layout TB
event T0 "T0: Client Ingress"
event T1 "T1: WAL fsync"
event T2 "T2: MemTable"
event T3 "T3: SSTable"
`;
    const planTB = compile(parse(scriptTB));
    expect(planTB.diagramType).toBe("timeline");
    expect(planTB.meta.direction).toBe("TB");
    // Portrait: compact width, tall height
    expect(planTB.meta.width).toBeLessThanOrEqual(700);
    expect(planTB.meta.height).toBeGreaterThanOrEqual(640);

    const nodeById = new Map(planTB.nodes.map((n) => [n.id, n]));
    const t0 = nodeById.get("T0")!;
    const t1 = nodeById.get("T1")!;
    const t2 = nodeById.get("T2")!;
    const t3 = nodeById.get("T3")!;

    // In portrait, milestones flow top to bottom
    expect(t0.y).toBeLessThan(t1.y);
    expect(t1.y).toBeLessThan(t2.y);
    expect(t2.y).toBeLessThan(t3.y);

    // Milestones alternate left and right across centerX
    const centerX = planTB.meta.width / 2;
    expect(t0.x + t0.width / 2).toBeLessThan(centerX);
    expect(t1.x + t1.width / 2).toBeGreaterThan(centerX);
    expect(t2.x + t2.width / 2).toBeLessThan(centerX);
    expect(t3.x + t3.width / 2).toBeGreaterThan(centerX);
  });

  it("adapts gantt roadmap diagrams for portrait (TB) vs landscape (LR) orientation", () => {
    const scriptTB = `
scene "Phased Rollout" theme=auto type=gantt layout TB
step S1 "Phase 1: Setup"
step S2 "Phase 2: Migration"
step S3 "Phase 3: Verify"
`;
    const planTB = compile(parse(scriptTB));
    expect(planTB.diagramType).toBe("gantt");
    expect(planTB.meta.direction).toBe("TB");
    expect(planTB.meta.width).toBeLessThanOrEqual(700);
    expect(planTB.meta.height).toBeGreaterThanOrEqual(640);
  });
});
