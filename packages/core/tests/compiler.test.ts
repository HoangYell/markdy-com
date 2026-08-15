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

  it("places constellation scenes around a focal node", () => {
    const source = `
scene type=constellation theme=nebula width=1200 height=720
service Core focal=true
service North
service South
edge north: Core -> North
edge south: Core -> South
`;
    const plan = compile(parse(source));
    const core = plan.nodes.find((node) => node.id === "Core")!;
    const north = plan.nodes.find((node) => node.id === "North")!;
    const south = plan.nodes.find((node) => node.id === "South")!;
    expect(plan.diagramType).toBe("constellation");
    expect(plan.theme.name).toBe("nebula");
    expect(core.focal).toBe(true);
    expect(core.shape).toBe("rounded");
    expect(north.x !== core.x || north.y !== core.y).toBe(true);
    expect(south.x !== core.x || south.y !== core.y).toBe(true);
  });

  it("places loop/flywheel scenes symmetrically around a central state hub", () => {
    const source = `
scene type=loop theme=paper width=1200 height=800
hub SharedMemory "Shared Memory"
station Capture "Capture Signals"
station Research "Evidence"
station Decide "Decision Gate" focal=true
station Act "Execute"
station Learn "Update Playbook"

edge r1: Capture -> Research
edge r2: Research -> Decide
edge r3: Decide -> Act
edge r4: Act -> Learn
edge r5: Learn -> Capture
edge w1: Act -> SharedMemory "outcomes"
`;
    const plan = compile(parse(source));
    expect(plan.diagramType).toBe("loop");
    const hub = plan.nodes.find((n) => n.id === "SharedMemory")!;
    expect(hub.focal).toBe(true);
    expect(hub.shape).toBe("pill");

    const capture = plan.nodes.find((n) => n.id === "Capture")!;
    const decide = plan.nodes.find((n) => n.id === "Decide")!;
    expect(capture.x).not.toEqual(hub.x);
    expect(decide.focal).toBe(true);
    expect(plan.nodes.length).toBe(6);
  });

  it("partitions medallion lakehouse topologies into tiered quality bands", () => {
    const source = `
scene type=medallion theme=paper width=1400 height=800
service EventStream "Kafka Ingestion"
bronze RawTables "Bronze Parquet Tables"
silver ConformedDB "Silver Cleaned DB"
gold AnalyticsMart "Gold Financial Mart"
client Dashboard "Executive BI"

edge e1: EventStream -> RawTables
edge e2: RawTables -> ConformedDB
edge e3: ConformedDB -> AnalyticsMart
edge e4: AnalyticsMart -> Dashboard
`;
    const plan = compile(parse(source));
    expect(plan.diagramType).toBe("medallion");
    const stream = plan.nodes.find((n) => n.id === "EventStream")!;
    const bronze = plan.nodes.find((n) => n.id === "RawTables")!;
    const silver = plan.nodes.find((n) => n.id === "ConformedDB")!;
    const gold = plan.nodes.find((n) => n.id === "AnalyticsMart")!;
    const dash = plan.nodes.find((n) => n.id === "Dashboard")!;

    expect(bronze.x).toBeGreaterThan(stream.x);
    expect(silver.x).toBeGreaterThan(bronze.x);
    expect(gold.x).toBeGreaterThan(silver.x);
    expect(dash.x).toBeGreaterThan(gold.x);
  });

  it("positions strategic quadrant scenes into balanced 2x2 cells", () => {
    const source = `
scene type=quadrant theme=editorial width=1200 height=800
service QuickWin "Quick Win feature" quadrant=Q1 focal=true
service CoreBet "Strategic Bet" quadrant=Q2
service Deprecate "Legacy monolith" quadrant=Q3
service LowPri "Minor task" quadrant=Q4
`;
    const plan = compile(parse(source));
    expect(plan.diagramType).toBe("quadrant");
    const q1 = plan.nodes.find((n) => n.id === "QuickWin")!;
    const q2 = plan.nodes.find((n) => n.id === "CoreBet")!;
    const q3 = plan.nodes.find((n) => n.id === "Deprecate")!;
    const q4 = plan.nodes.find((n) => n.id === "LowPri")!;

    expect(q1.x).toBeGreaterThan(q2.x);
    expect(q1.y).toBeLessThan(q4.y);
    expect(q3.x).toBeLessThan(q4.x);
    expect(q3.y).toBeGreaterThan(q2.y);
    expect(q1.focal).toBe(true);
  });

  it("partitions swimlane diagrams into vertical functional lane bands", () => {
    const source = `
scene type=swimlane theme=paper width=1200 height=900
group presentation "Presentation Tier": WebApp MobileApp
group services "Domain Tier": OrderService PaymentService
group data "Persistence Tier": OrderDB Cache

browser WebApp "Web Application"
browser MobileApp "Mobile Client"
service OrderService "Order Service"
service PaymentService "Payment Service"
database OrderDB "Postgres DB"
cache Cache "Redis"
`;
    const plan = compile(parse(source));
    expect(plan.diagramType).toBe("swimlane");
    const web = plan.nodes.find((n) => n.id === "WebApp")!;
    const order = plan.nodes.find((n) => n.id === "OrderService")!;
    const db = plan.nodes.find((n) => n.id === "OrderDB")!;

    expect(order.y).toBeGreaterThan(web.y);
    expect(db.y).toBeGreaterThan(order.y);
  });

  it("stacks hierarchical pyramid diagrams with proportional tier spread", () => {
    const source = `
scene type=pyramid theme=paper width=1200 height=800
service BusinessValue "Customer Revenue" tier=0 focal=true
service CoreAPIs "Domain APIs" tier=1
service Infrastructure "Cloud Infrastructure" tier=2
`;
    const plan = compile(parse(source));
    expect(plan.diagramType).toBe("pyramid");
    const top = plan.nodes.find((n) => n.id === "BusinessValue")!;
    const mid = plan.nodes.find((n) => n.id === "CoreAPIs")!;
    const base = plan.nodes.find((n) => n.id === "Infrastructure")!;

    expect(mid.y).toBeGreaterThan(top.y);
    expect(base.y).toBeGreaterThan(mid.y);
  });

  it("arranges multi-axis radar scenes along a regular polygon-N", () => {
    const source = `
scene type=radar theme=paper width=1000 height=1000
metric Latency "Low Latency (ms)"
metric Throughput "High Throughput (req/s)" focal=true
metric FaultTolerance "High Availability"
metric DevVelocity "Developer Velocity"
metric CostEfficiency "Infrastructure Cost"
`;
    const plan = compile(parse(source));
    expect(plan.diagramType).toBe("radar");
    expect(plan.nodes).toHaveLength(5);
    const latency = plan.nodes.find((n) => n.id === "Latency")!;
    const throughput = plan.nodes.find((n) => n.id === "Throughput")!;
    expect(throughput.focal).toBe(true);
    expect(latency.x !== throughput.x || latency.y !== throughput.y).toBe(true);
  });

  it("lays out timeline events along a horizontal baseline alternating above/below", () => {
    const source = `
scene type=timeline theme=paper width=1200 height=600
service Alpha "Alpha Launch"
service Beta "Public Beta" focal=true
service GA "General Availability"
`;
    const plan = compile(parse(source));
    expect(plan.diagramType).toBe("timeline");
    expect(plan.nodes).toHaveLength(3);
    const alpha = plan.nodes.find((n) => n.id === "Alpha")!;
    const beta = plan.nodes.find((n) => n.id === "Beta")!;
    expect(beta.focal).toBe(true);
    expect(alpha.y !== beta.y).toBe(true);
  });

  it("stacks gantt bars vertically with phase-based horizontal positioning", () => {
    const source = `
scene type=gantt theme=paper width=1200 height=600
service CoreWork "Core Refactor" phase=0 span=3
service APIWork "API Design" phase=2 span=2 focal=true
service Launch "GA Launch" phase=4 span=1
`;
    const plan = compile(parse(source));
    expect(plan.diagramType).toBe("gantt");
    expect(plan.nodes).toHaveLength(3);
    const core = plan.nodes.find((n) => n.id === "CoreWork")!;
    const api = plan.nodes.find((n) => n.id === "APIWork")!;
    const launch = plan.nodes.find((n) => n.id === "Launch")!;
    expect(api.x).toBeGreaterThan(core.x);
    expect(launch.x).toBeGreaterThan(api.x);
    expect(api.focal).toBe(true);
  });

  it("positions venn sets with overlapping proximity", () => {
    const source = `
scene type=venn theme=paper width=1000 height=800
service SetA "Desirability"
service SetB "Feasibility" focal=true
service SetC "Viability"
`;
    const plan = compile(parse(source));
    expect(plan.diagramType).toBe("venn");
    expect(plan.nodes).toHaveLength(3);
    expect(plan.nodes.find((n) => n.id === "SetB")!.focal).toBe(true);
  });

  it("stacks abstraction layers vertically across full width", () => {
    const source = `
scene type=layers theme=editorial width=1200 height=700
service App "Application"
service Transport "Transport" focal=true
service Network "Network"
`;
    const plan = compile(parse(source));
    expect(plan.diagramType).toBe("layers");
    expect(plan.nodes).toHaveLength(3);
    const app = plan.nodes.find((n) => n.id === "App")!;
    const trans = plan.nodes.find((n) => n.id === "Transport")!;
    const net = plan.nodes.find((n) => n.id === "Network")!;
    expect(trans.y).toBeGreaterThan(app.y);
    expect(net.y).toBeGreaterThan(trans.y);
    expect(app.width).toBe(trans.width);
    expect(trans.focal).toBe(true);
  });

  it("nests concentric security boundaries with stepped insets", () => {
    const source = `
scene type=nested theme=paper width=1000 height=800
security Outer "Outer Perimeter"
security Middle "VPC Network"
security Core "Hardware Enclave" focal=true
`;
    const plan = compile(parse(source));
    expect(plan.diagramType).toBe("nested");
    expect(plan.nodes).toHaveLength(3);
    const outer = plan.nodes.find((n) => n.id === "Outer")!;
    const middle = plan.nodes.find((n) => n.id === "Middle")!;
    const core = plan.nodes.find((n) => n.id === "Core")!;
    expect(outer.width).toBeGreaterThan(middle.width);
    expect(middle.width).toBeGreaterThan(core.width);
    expect(middle.x).toBeGreaterThan(outer.x);
    expect(core.x).toBeGreaterThan(middle.x);
    expect(core.focal).toBe(true);
  });
});
