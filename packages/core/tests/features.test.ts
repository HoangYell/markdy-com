import { describe, it, expect } from "vitest";
import {
  parse,
  validateArchitecture,
  ARCH_RULE_PRESETS,
  classifyTechnology,
  diffDiagramASTs,
  compressMarkdyToUrlHash,
  decompressMarkdyFromUrlHash,
  routeOrthogonalEdge,
  selectOptimalPorts,
  analyzeAndBuildRepairPrompt,
  resolveOutputPreset,
  listOutputPresets,
  resolveTheme,
} from "../src/index.js";

describe("@markdy/core: Architecture Governance Linter", () => {
  it("detects forbidden direct client-to-database connection", () => {
    const code = `
      scene "Direct DB Violation" theme=paper
      layout LR
      browser Client
      database DB
      beat main:
        Client -> DB "direct sql query"
    `;
    const ast = parse(code);
    const violations = validateArchitecture(ast, ARCH_RULE_PRESETS.cleanArchitecture.rules);
    expect(violations.some((v) => v.ruleId === "no-presentation-to-database")).toBe(true);
    expect(violations[0].severity).toBe("error");
  });

  it("passes when communication flows properly through an API service", () => {
    const code = `
      scene "Clean Request Path" theme=paper
      layout LR
      browser Client
      service Api
      database DB
      beat main:
        Client -> Api "GET /users" -> DB "SELECT"
        Client <- Api "200 OK"
    `;
    const ast = parse(code);
    const violations = validateArchitecture(ast, ARCH_RULE_PRESETS.cleanArchitecture.rules);
    expect(violations).toHaveLength(0);
  });

  it("detects forbidden circular request storms", () => {
    const code = `
      scene "Cycle Test" theme=paper
      layout LR
      service ServiceA
      service ServiceB
      service ServiceC
      beat main:
        ServiceA -> ServiceB "call" -> ServiceC "call" -> ServiceA "circular loop"
    `;
    const ast = parse(code);
    const violations = validateArchitecture(ast, ARCH_RULE_PRESETS.microservicesGovernance.rules);
    expect(violations.some((v) => v.ruleId === "no-sync-request-cycles")).toBe(true);
  });
});

describe("@markdy/core: Technology & Semantic Classifier", () => {
  it("correctly identifies databases and SQL technology", () => {
    expect(classifyTechnology("psql_master", "PostgreSQL Database").kind).toBe("database");
    expect(classifyTechnology("cockroach_node", "CockroachDB").badge).toBe("SQL");
    expect(classifyTechnology("mongo_cluster", "MongoDB Document Store").badge).toBe("Document");
  });

  it("correctly identifies queues, caches, and stream platforms", () => {
    expect(classifyTechnology("kafka_stream", "Kafka Event Bus").kind).toBe("queue");
    expect(classifyTechnology("redis_cache", "Redis In-Memory Store").kind).toBe("cache");
    expect(classifyTechnology("sqs_orders", "AWS SQS").kind).toBe("queue");
  });

  it("correctly identifies AI/LLM models and gateways", () => {
    expect(classifyTechnology("gemini_pro", "Gemini 1.5 Pro").role).toBe("ai_model");
    expect(classifyTechnology("claude_sonnet", "Claude 3.5 Sonnet").role).toBe("ai_model");
    expect(classifyTechnology("kong_gateway", "Kong API Gateway").kind).toBe("api_gateway");
  });
});

describe("@markdy/core: Semantic AST Diff Engine", () => {
  it("computes added, removed, and modified nodes and generates PR summary", () => {
    const v1Code = `
      scene "V1 Arch" theme=paper
      layout LR
      browser Client
      service Monolith
      database DB
      beat main:
        Client -> Monolith "req" -> DB "query"
    `;

    const v2Code = `
      scene "V2 Microservices Arch" theme=paper
      layout LR
      browser Client
      gateway ApiGateway
      service OrderService
      database DB
      beat main:
        Client -> ApiGateway "req" -> OrderService "req" -> DB "query"
    `;

    const ast1 = parse(v1Code);
    const ast2 = parse(v2Code);

    const diff = diffDiagramASTs(ast1, ast2);
    expect(diff.addedNodesCount).toBe(2); // ApiGateway, OrderService
    expect(diff.removedNodesCount).toBe(1); // Monolith
    expect(diff.summaryMarkdown).toContain("Markdy Architectural Diff Summary");
    expect(diff.evolutionMarkdyScript).toContain("scene \"Architecture Evolution\"");
    expect(diff.evolutionMarkdyScript).toContain("beat transition");
  });
});

describe("@markdy/core: Native URL State Codec", () => {
  it("compresses and decompresses MarkdyScript code losslessly", async () => {
    const sampleCode = `
      scene "Authentication Flow" theme=paper
      layout LR
      browser App
      service Auth
      database Users
      beat main:
        App -> Auth "POST /login" -> Users "verify"
    `;

    const hash = await compressMarkdyToUrlHash(sampleCode);
    expect(hash.startsWith("~m")).toBe(true);

    const restored = await decompressMarkdyFromUrlHash(hash);
    expect(restored.trim()).toBe(sampleCode.trim());
  });
});

describe("@markdy/core: Orthogonal Manhattan Router", () => {
  it("calculates optimal port anchors and 90-degree orthogonal path", () => {
    const boxA = { x: 0, y: 0, width: 100, height: 60 };
    const boxB = { x: 300, y: 0, width: 100, height: 60 };

    const ports = selectOptimalPorts(boxA, boxB);
    expect(ports.sourcePort).toBe("right");
    expect(ports.targetPort).toBe("left");

    const route = routeOrthogonalEdge(boxA, boxB);
    expect(route.startPoint).toEqual({ x: 100, y: 30 });
    expect(route.endPoint).toEqual({ x: 300, y: 30 });
    expect(route.svgPathData).toContain("M 100 30");
    expect(route.svgPathData).toContain("L 300 30");
  });
});

describe("@markdy/core: Self-Healing AI Diagnostic Loop", () => {
  it("detects syntax errors and creates a structured repair prompt", () => {
    const brokenCode = `??? invalid syntax token !!!`;
    const result = analyzeAndBuildRepairPrompt(brokenCode);
    expect(result.isValid).toBe(false);
    expect(result.repairPrompt).toBeDefined();
    expect(result.repairPrompt).toContain("failed to parse");
  });

  it("detects architectural violations and creates a self-healing prompt", () => {
    const invalidArch = `
      scene "Bad Arch" theme=paper
      layout LR
      browser Web
      database PrivateDB
      beat main:
        Web -> PrivateDB "bypass api"
    `;
    const result = analyzeAndBuildRepairPrompt(invalidArch);
    expect(result.isValid).toBe(false);
    expect(result.archViolations.length).toBeGreaterThan(0);
    expect(result.repairPrompt).toContain("Architectural Violations");
  });

  it("resolves custom architecture configuration with presets and severity overrides", async () => {
    const { resolveArchitectureConfig } = await import("../src/index.js");
    const rules = resolveArchitectureConfig({
      extends: ["cleanArchitecture"],
      severityOverrides: {
        "no-presentation-to-database": "warning",
      },
    });
    expect(rules.length).toBeGreaterThan(0);
    const dbRule = rules.find((r) => r.id === "no-presentation-to-database");
    expect(dbRule?.severity).toBe("warning");
  });
});

describe("@markdy/core: Algorithmic Brand Theme Generator", () => {
  it("generates light and dark theme tokens with harmonious roles", async () => {
    const { generateThemeFromBrand } = await import("../src/index.js");
    const lightTheme = generateThemeFromBrand({
      name: "acme-indigo",
      accentHex: "#6366f1",
      mode: "light",
    });

    expect(lightTheme.name).toBe("acme-indigo");
    expect(lightTheme.accent).toBe("#6366f1");
    expect(lightTheme.paper).toBeDefined();
    expect(lightTheme.ink).toBeDefined();
    expect(lightTheme.roles.compute).toBe("#6366f1");
    expect(lightTheme.edges.request).toBeDefined();

    const darkTheme = generateThemeFromBrand({
      name: "acme-indigo-dark",
      accentHex: "#6366f1",
      mode: "dark",
    });

    expect(darkTheme.name).toBe("acme-indigo-dark");
    expect(darkTheme.accent).toBe("#6366f1");
    expect(darkTheme.canvas).not.toBe(lightTheme.canvas);
  });

  it("resolves output presets for multi-format export targets", () => {
    const presets = listOutputPresets();
    expect(presets.length).toBeGreaterThanOrEqual(8);
    expect(presets).toContain("social-og");
    expect(presets).toContain("slide-16x9");
    expect(presets).toContain("print-a4");

    const og = resolveOutputPreset("social-og");
    expect(og.width).toBe(1200);
    expect(og.height).toBe(632);
    expect(og.safeArea).toBe(64);

    const fallback = resolveOutputPreset("nonexistent");
    expect(fallback.name).toBe("doc-inline");
  });

  it("ships series palette on editorial and paper themes for chart types", () => {
    const paper = resolveTheme("paper");
    expect(paper.series).toBeDefined();
    expect(paper.series!.length).toBe(5);

    const editorial = resolveTheme("editorial");
    expect(editorial.series).toBeDefined();
    expect(editorial.series!.length).toBe(5);
  });
});
