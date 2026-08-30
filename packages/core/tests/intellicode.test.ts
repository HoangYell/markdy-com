import { describe, it, expect } from "vitest";
import {
  getIntelliCodeCompletions,
  predictNextLineSuggestion,
  getArchitectureSuggestions,
  extractDiagramContext,
} from "../src/intellicode.js";

describe("@markdy/core: IntelliCode & Autocompletion Engine", () => {
  it("extracts context, declared nodes, and groups correctly", () => {
    const doc = `
scene theme=paper layout=LR
service ApiGw "API Gateway"
database Postgres "PostgreSQL 16"
group backend "Backend VPC": ApiGw Postgres

beat main "System Flow":
  ApiGw -> Postgres "SELECT"
`;
    const ctx = extractDiagramContext(doc, 7, 2);
    expect(ctx.declaredNodes.length).toBe(2);
    expect(ctx.declaredNodes[0].id).toBe("ApiGw");
    expect(ctx.declaredNodes[1].id).toBe("Postgres");
    expect(ctx.declaredGroups.length).toBe(1);
    expect(ctx.declaredGroups[0].id).toBe("backend");
    expect(ctx.declaredGroups[0].members).toEqual(["ApiGw", "Postgres"]);
    expect(ctx.declaredBeats.length).toBe(1);
    expect(ctx.insideBeat).toBe(true);
  });

  it("provides top-level keyword, directive, and node completions at line start", () => {
    const doc = `\n`;
    const completions = getIntelliCodeCompletions(doc, 0, 0);

    const labels = completions.map((c) => c.label);
    expect(labels).toContain("scene");
    expect(labels).toContain("layout LR");
    expect(labels).toContain("service");
    expect(labels).toContain("database");
    expect(labels).toContain("cache");
    expect(labels).toContain("queue");
    expect(labels).toContain("beat");
    expect(labels).toContain("group");
  });

  it("provides technology preset completions with semantic classifications", () => {
    const doc = ``;
    const completions = getIntelliCodeCompletions(doc, 0, 0);

    const pg = completions.find((c) => c.label === "PostgreSQL");
    expect(pg).toBeDefined();
    expect(pg?.kind).toBe("tech");
    expect(pg?.insertText).toContain("database Postgres");

    const redis = completions.find((c) => c.label === "Redis");
    expect(redis).toBeDefined();
    expect(redis?.insertText).toContain("cache Redis");

    const kafka = completions.find((c) => c.label === "Kafka");
    expect(kafka).toBeDefined();
    expect(kafka?.insertText).toContain("queue Kafka");
  });

  it("provides theme completions after 'theme=' or 'theme '", () => {
    const doc = `scene theme=`;
    const completions = getIntelliCodeCompletions(doc, 0, 12);
    const themeNames = completions.map((c) => c.label);

    expect(themeNames).toContain("paper");
    expect(themeNames).toContain("midnight");
    expect(themeNames).toContain("blueprint");
    expect(themeNames).toContain("nebula");
    expect(themeNames).toContain("editorial");
    expect(themeNames).toContain("graphite");
    expect(themeNames).toContain("terminal");
    expect(themeNames).toContain("sketchy");
    expect(themeNames).toContain("draft");
    expect(themeNames).toContain("doodle");
  });

  it("provides layout completions after 'layout '", () => {
    const doc = `layout `;
    const completions = getIntelliCodeCompletions(doc, 0, 7);
    const layoutNames = completions.map((c) => c.label);

    expect(layoutNames).toContain("LR");
    expect(layoutNames).toContain("TB");
    expect(layoutNames).toContain("RL");
    expect(layoutNames).toContain("BT");
  });

  it("predicts target nodes and flow labels after arrow operators", () => {
    const doc = `
client WebApp "Web Client"
gateway ApiGw "API Gateway"
database Postgres "PostgreSQL"

beat main:
  WebApp -> 
`;
    const completions = getIntelliCodeCompletions(doc, 6, 12);

    const targetNodeItem = completions.find((c) => c.label === "ApiGw");
    expect(targetNodeItem).toBeDefined();
    expect(targetNodeItem?.kind).toBe("node");
    // ApiGw should be boosted higher than Postgres for a Client source
    const pgItem = completions.find((c) => c.label === "Postgres");
    expect((targetNodeItem?.boost ?? 0)).toBeGreaterThan((pgItem?.boost ?? 0));
  });

  it("provides flow operator completions after node ID", () => {
    const doc = `
service ApiService "API"
database MainDB "DB"

beat main:
  ApiService 
`;
    const completions = getIntelliCodeCompletions(doc, 5, 13);
    const ops = completions.map((c) => c.label);

    expect(ops).toContain("->");
    expect(ops).toContain("~>");
    expect(ops).toContain("<-");
    expect(ops).toContain("<->");
    expect(ops).toContain("..>");
  });

  it("provides cue completions and selectors inside beats", () => {
    const doc = `
service ApiService "API"
database MainDB "DB"

beat main:
  
`;
    const completions = getIntelliCodeCompletions(doc, 5, 2);
    const labels = completions.map((c) => c.label);

    expect(labels).toContain("show");
    expect(labels).toContain("glow");
    expect(labels).toContain("pulse");
    expect(labels).toContain("frame");
    expect(labels).toContain("ApiService");
    expect(labels).toContain("MainDB");
  });

  it("predicts next logical line / ghost text for entrance beat and return flows", () => {
    // 1. Initial suggestion when empty
    const emptyGhost = predictNextLineSuggestion("", 0);
    expect(emptyGhost).toBeDefined();
    expect(emptyGhost?.type).toBe("next-node");

    // 2. Init beat suggestion when nodes exist but no beat
    const docWithoutBeat = `
service ApiSvc "API"
database DB "Postgres"
`;
    const beatGhost = predictNextLineSuggestion(docWithoutBeat, 3);
    expect(beatGhost).toBeDefined();
    expect(beatGhost?.type).toBe("init-beat");
    expect(beatGhost?.insertText).toContain("beat main");
    expect(beatGhost?.insertText).toContain("show $nodes stagger=60ms");

    // 3. Symmetric return response inside beat
    const docWithReq = `
client WebApp "Web Client"
gateway ApiGw "Gateway"

beat main:
  WebApp -> ApiGw "POST /items"
  
`;
    const returnGhost = predictNextLineSuggestion(docWithReq, 6);
    expect(returnGhost).toBeDefined();
    expect(returnGhost?.type).toBe("next-flow");
    expect(returnGhost?.text).toContain("WebApp <- ApiGw");
  });

  it("generates proactive architecture suggestions", () => {
    const directClientToDB = `
client WebApp "Web Client"
database Postgres "PostgreSQL"
`;
    const suggestions = getArchitectureSuggestions(directClientToDB);
    expect(suggestions.some((s) => s.id === "add-gateway")).toBe(true);

    const serviceAndDB = `
service OrderService "Orders"
service PaymentService "Payments"
database Postgres "PostgreSQL"
`;
    const archSuggestions = getArchitectureSuggestions(serviceAndDB);
    expect(archSuggestions.some((s) => s.id === "add-cache")).toBe(true);
    expect(archSuggestions.some((s) => s.id === "add-group-boundary")).toBe(true);
    expect(archSuggestions.some((s) => s.id === "add-entrance-beat")).toBe(true);
  });
});
