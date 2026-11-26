import { describe, it, expect } from "vitest";
import { parse, parseAndCompile } from "@markdy/core";
import {
  detectDiagramFormat,
  transpileToMarkdy,
  transpileMermaidToMarkdy,
  transpileDotToMarkdy,
  transpileExcalidrawToMarkdy,
} from "../src/index.js";

describe("@markdy/compat: Extended Converters & Universal Auto-Detect", () => {
  it("handles Mermaid stateDiagram-v2 with composite blocks and [*] endpoints", () => {
    const mmd = `
      stateDiagram-v2
        direction LR
        [*] --> Pending
        state "Checkout Pipeline" as checkout {
          Pending --> Validating : submit
          Validating --> Paid : charge OK
        }
        Paid --> [*] : receipt sent
    `;
    const res = transpileMermaidToMarkdy(mmd, "Order Lifecycle");
    expect(res.diagramType).toBe("state");
    expect(res.nodeCount).toBe(5);
    expect(res.edgeCount).toBe(4);
    expect(res.groupCount).toBe(1);

    const ast = parse(res.code);
    expect(ast.meta.type).toBe("state");
    expect(ast.nodes["StartState"].kind).toBe("start");
    expect(ast.nodes["EndState"].kind).toBe("end");
    expect(ast.groups["checkout"]).toBeDefined();
  });

  it("handles Mermaid subgraphs, double shapes, & fan-out, and arrows inside labels", () => {
    const mmd = `
      flowchart TB
        classDef hot fill:#f9f;
        Client((End User)) --> Edge[Cache Miss -> Fetch]
        subgraph Core Services
          Edge -. async .-> Bus{{Kafka Broker}}
          API & Worker --> DB[(Postgres 16)]
        end
        style Client stroke:#333
    `;
    const res = transpileMermaidToMarkdy(mmd, "Edge Routing");
    const { ast, plan } = parseAndCompile(res.code);
    expect(ast.nodes["Edge"].label).toBe("Cache Miss -> Fetch");
    expect(ast.nodes["Bus"].kind).toBe("queue");
    expect(ast.nodes["DB"].kind).toBe("database");
    expect(Object.keys(ast.groups)).toHaveLength(1);
    expect(plan.edges.some((e) => e.from === "API" && e.to === "DB")).toBe(true);
    expect(plan.edges.some((e) => e.from === "Worker" && e.to === "DB")).toBe(true);
  });

  it("handles Mermaid sequenceDiagram activation markers and control blocks", () => {
    const mmd = `
      sequenceDiagram
        autonumber
        actor U as "Mobile User"
        participant GW as API Gateway
        Note over U,GW: PKCE Handshake
        U->>+GW: POST /token
        GW-->>-U: 200 JWT
    `;
    const res = transpileMermaidToMarkdy(mmd, "Token Exchange");
    expect(res.diagramType).toBe("sequence");
    expect(res.nodeCount).toBe(2);
    expect(res.edgeCount).toBe(2);
    const ast = parse(res.code);
    expect(ast.nodes["U"].kind).toBe("user");
  });

  it("transpiles Graphviz DOT digraphs and clusters into valid MarkdyScript", () => {
    const dot = `
      digraph Architecture {
        rankdir=LR;
        subgraph cluster_data {
          label="Data Tier";
          cache [label="Redis Cache", shape=box];
          db [label="Primary Postgres", shape=cylinder];
        }
        browser [label="Web Client", shape=ellipse];
        browser -> api [label="HTTPS"];
        api -> cache [label="GET", style=dashed];
        api -> db [label="SQL"];
      }
    `;
    const res = transpileDotToMarkdy(dot);
    expect(res.nodeCount).toBe(4);
    expect(res.edgeCount).toBe(3);
    expect(res.groupCount).toBe(1);

    const ast = parse(res.code);
    expect(ast.nodes["db"].kind).toBe("database");
    expect(ast.nodes["browser"].kind).toBe("browser");
    expect(ast.groups["cluster_data"]).toBeDefined();
  });

  it("transpiles Excalidraw JSON scenes with frames, shapes, and bound arrows", () => {
    const excalidraw = JSON.stringify({
      type: "excalidraw",
      version: 2,
      elements: [
        { id: "frame1", type: "frame", name: "Backend Tier", x: 250, y: 40, width: 420, height: 220 },
        { id: "r1", type: "ellipse", x: 40, y: 100, width: 120, height: 60 },
        { id: "t1", type: "text", x: 50, y: 115, width: 90, height: 25, text: "Web Client", containerId: "r1" },
        { id: "r2", type: "diamond", x: 280, y: 100, width: 130, height: 80, frameId: "frame1" },
        { id: "t2", type: "text", x: 300, y: 125, width: 90, height: 25, text: "API Gateway", containerId: "r2" },
        { id: "r3", type: "rectangle", x: 490, y: 100, width: 140, height: 70, frameId: "frame1" },
        { id: "t3", type: "text", x: 510, y: 120, width: 100, height: 25, text: "Postgres DB", containerId: "r3" },
        { id: "a1", type: "arrow", x: 160, y: 130, width: 120, height: 0, startBinding: { elementId: "r1" }, endBinding: { elementId: "r2" } },
        { id: "ta1", type: "text", x: 200, y: 110, width: 50, height: 20, text: "HTTPS", containerId: "a1" },
        { id: "a2", type: "arrow", x: 410, y: 130, width: 80, height: 0, startBinding: { elementId: "r2" }, endBinding: { elementId: "r3" }, strokeStyle: "dashed" },
      ],
    });

    const res = transpileExcalidrawToMarkdy(excalidraw, "Whiteboard Sync");
    expect(res.nodeCount).toBe(3);
    expect(res.edgeCount).toBe(2);
    expect(res.groupCount).toBe(1);

    const { ast, plan } = parseAndCompile(res.code);
    expect(ast.nodes["Postgres_DB"].kind).toBe("database");
    expect(ast.nodes["API_Gateway"].kind).toBe("api_gateway");
    expect(plan.edges[0].label).toBe("HTTPS");
    expect(plan.edges[1].kind).toBe("event");
  });

  it("resolves scoped D2 container refs without duplicate nodes and prioritizes cache over cylinder shape", () => {
    const mmd = transpileMermaidToMarkdy("flowchart LR\n  API --> Cache[(Redis Cache)]");
    const mmdAst = parse(mmd.code);
    expect(mmdAst.nodes["Cache"].kind).toBe("cache");

    const d2 = `
      gateway: API Gateway
      core: {
        auth: Auth Service
        db: Postgres DB
      }
      gateway -> core.auth: Verify
      core.auth -> core.db: Lookup
    `;
    const d2Res = transpileToMarkdy(d2, { format: "d2" });
    return d2Res.then((r) => {
      const ast = parse(r.code);
      expect(Object.keys(ast.nodes)).toHaveLength(3);
      expect(ast.nodes["core_auth"]).toBeUndefined();
      expect(ast.nodes["auth"]).toBeDefined();
    });
  });

  it("auto-detects all 9 supported source formats and applies theme/layout/player overrides", async () => {
    expect(detectDiagramFormat("flowchart LR\nA --> B")).toBe("mermaid");
    expect(detectDiagramFormat("sequenceDiagram\nA->>B: hi")).toBe("mermaid");
    expect(detectDiagramFormat("stateDiagram-v2\n[*] --> Active")).toBe("mermaid");
    expect(detectDiagramFormat("api: API\napi -> db: query")).toBe("d2");
    expect(detectDiagramFormat("@startuml\nactor User\n@enduml")).toBe("plantuml");
    expect(detectDiagramFormat("digraph G { A -> B }")).toBe("dot");
    expect(detectDiagramFormat("<mxGraphModel><root></root></mxGraphModel>")).toBe("drawio");
    expect(detectDiagramFormat('{"type":"excalidraw","elements":[]}')).toBe("excalidraw");
    expect(detectDiagramFormat("services:\n  web:\n    image: nginx")).toBe("compose");
    expect(detectDiagramFormat("apiVersion: v1\nkind: Service")).toBe("k8s");
    expect(detectDiagramFormat('{"version":4,"resources":[]}')).toBe("terraform");

    const unified = await transpileToMarkdy("digraph G { rankdir=LR; Web -> API -> Postgres }", {
      format: "auto",
      theme: "cad-dark",
      layout: "TB",
      includePlayer: true,
    });
    expect(unified.detectedFormat).toBe("dot");
    expect(unified.code).toContain("theme=cad-dark");
    expect(unified.code).toContain("layout TB");
    expect(unified.code).toContain("player:");
    const ast = parse(unified.code);
    expect(ast.meta.theme).toBe("cad-dark");
    expect(ast.meta.direction).toBe("TB");
  });

  it("preserves decision diamonds and flowchart semantics for {Authenticated?} even with auth keywords", () => {
    const mmd = `
      flowchart TD
        Start([Open App]) --> Auth{Authenticated?}
        Auth -->|Yes| Dash[Dashboard]
        Auth -->|No| Login[Enter Credentials]
        Login --> Valid{Valid?}
    `;
    const res = transpileMermaidToMarkdy(mmd, "Auth Check");
    expect(res.diagramType).toBe("flowchart");
    expect(res.code).not.toContain('"Render Diagram"');
    const { ast, plan } = parseAndCompile(res.code);
    expect(ast.meta.type).toBe("flowchart");
    expect(ast.nodes["Auth"].kind).toBe("decision");
    expect(ast.nodes["Valid"].kind).toBe("decision");
    expect(plan.nodes.find((n) => n.id === "Auth")?.shape).toBe("diamond");
    expect(plan.nodes.find((n) => n.id === "Valid")?.shape).toBe("diamond");
  });

  it("keeps external or previously grouped nodes out of downstream Mermaid subgraphs and maps -->> to response arrows", () => {
    const seq = transpileMermaidToMarkdy(`
      sequenceDiagram
        App->>+IdP: GET /authorize
        IdP-->>-App: 302 Redirect
    `);
    const seqPlan = parseAndCompile(seq.code).plan;
    expect(seqPlan.sequenceMessages?.[1]?.kind).toBe("response");
    expect(seqPlan.sequenceMessages?.[1]?.from).toBe("IdP");
    expect(seqPlan.sequenceMessages?.[1]?.to).toBe("App");

    const sub = transpileMermaidToMarkdy(`
      flowchart TB
        Client([User]) --> CDN[Edge]
        subgraph AuthTier[Auth]
          CDN --> Auth{Valid?}
          Auth -->|Yes| GW[Gateway]
          Auth -->|No| IdP[IdP]
          IdP -.-> Client
        end
        subgraph CoreTier[Core]
          GW --> Orders[Orders]
        end
    `);
    const ast = parse(sub.code);
    expect(ast.groups["AuthTier"].members).not.toContain("Client");
    expect(ast.groups["AuthTier"].members).not.toContain("CDN");
    expect(ast.groups["CoreTier"].members).not.toContain("GW");
    expect(ast.groups["AuthTier"].members).toContain("GW");
  });
});
