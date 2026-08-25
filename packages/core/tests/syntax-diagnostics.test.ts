import { describe, it, expect } from "vitest";
import {
  diagnoseMarkdyCode,
  repairMarkdyCode,
  findClosestMatch,
  damerauLevenshteinDistance,
} from "../src/syntax-diagnostics.js";

describe("@markdy/core: Syntax Diagnostics & Auto-Healing", () => {
  describe("Fuzzy Distance Matching", () => {
    it("computes Damerau-Levenshtein distance including transpositions", () => {
      expect(damerauLevenshteinDistance("service", "service")).toBe(0);
      expect(damerauLevenshteinDistance("servce", "service")).toBe(1);
      expect(damerauLevenshteinDistance("secne", "scene")).toBe(1); // transposition
      expect(damerauLevenshteinDistance("databse", "database")).toBe(1);
    });

    it("finds closest matches from a dictionary", () => {
      const candidates = ["scene", "layout", "service", "database", "gateway"];
      expect(findClosestMatch("scen", candidates)?.match).toBe("scene");
      expect(findClosestMatch("layput", candidates)?.match).toBe("layout");
      expect(findClosestMatch("servce", candidates)?.match).toBe("service");
      expect(findClosestMatch("databse", candidates)?.match).toBe("database");
      expect(findClosestMatch("gateawy", candidates)?.match).toBe("gateway");
    });
  });

  describe("diagnoseMarkdyCode", () => {
    it("passes valid MarkdyScript without errors", () => {
      const validCode = `
scene theme=paper width=1280 height=720
layout LR

browser WebApp "Web Application"
service Orders "Order Service"
database DB "PostgreSQL"

group backend "Service Layer": Orders DB

beat init "System Reveal":
  show $nodes stagger=40ms

beat checkout "Order Placement":
  WebApp -> Orders "create order" -> DB "insert"
  WebApp <- Orders "201 Created"
`;
      const report = diagnoseMarkdyCode(validCode);
      expect(report.isValid).toBe(true);
      expect(report.errorCount).toBe(0);
      expect(report.declaredNodes).toEqual(["WebApp", "Orders", "DB"]);
    });

    it("detects keyword typos like scen and layput", () => {
      const broken = `
scen theme=papr
layput LR
service API
database DB
beat main:
  API -> DB
`;
      const report = diagnoseMarkdyCode(broken);
      expect(report.isValid).toBe(false);
      expect(report.errorCount).toBeGreaterThanOrEqual(1);

      const sceneIssue = report.issues.find((i) => i.code === "TYPO_KEYWORD" && i.didYouMean === "scene");
      expect(sceneIssue).toBeDefined();

      const layoutIssue = report.issues.find((i) => i.code === "TYPO_KEYWORD" && i.didYouMean === "layout");
      expect(layoutIssue).toBeDefined();

      const themeIssue = report.issues.find((i) => i.code === "UNKNOWN_THEME_OR_PROPERTY" && i.didYouMean === "paper");
      expect(themeIssue).toBeDefined();
    });

    it("detects node kind typos like servce and databse", () => {
      const broken = `
scene theme=paper
layout LR
servce Orders "Order Svc"
databse MainDB "Postgres"
cach Redis "Redis Cache"
beat main:
  Orders -> MainDB
`;
      const report = diagnoseMarkdyCode(broken);
      expect(report.isValid).toBe(false);

      const kindIssues = report.issues.filter((i) => i.code === "TYPO_NODE_KIND");
      expect(kindIssues.some((i) => i.didYouMean === "service")).toBe(true);
      expect(kindIssues.some((i) => i.didYouMean === "database")).toBe(true);
      expect(kindIssues.some((i) => i.didYouMean === "cache")).toBe(true);
    });

    it("detects undefined node references in flows with 'Did you mean?'", () => {
      const broken = `
scene theme=paper
layout LR
service OrderService
database OrdersDB
beat checkout:
  OrderSvc -> OrdersDB "query"
`;
      const report = diagnoseMarkdyCode(broken);
      const undefinedNodeIssue = report.issues.find(
        (i) => i.code === "UNDEFINED_NODE_REFERENCE" && i.didYouMean === "OrderService"
      );
      expect(undefinedNodeIssue).toBeDefined();
      expect(undefinedNodeIssue?.suggestion).toContain("OrderService");
    });

    it("detects unquoted multi-word string labels", () => {
      const broken = `
scene theme=paper
layout LR
service api My API Gateway
database db Primary Database
beat main:
  api -> db
`;
      const report = diagnoseMarkdyCode(broken);
      const unquotedIssues = report.issues.filter((i) => i.code === "UNQUOTED_STRING_LABEL");
      expect(unquotedIssues.length).toBeGreaterThanOrEqual(1);
    });

    it("detects missing colons on beats", () => {
      const broken = `
scene theme=paper
layout LR
service API
database DB
beat checkout "Process Payment"
  API -> DB
`;
      const report = diagnoseMarkdyCode(broken);
      const colonIssue = report.issues.find((i) => i.code === "MISSING_COLON");
      expect(colonIssue).toBeDefined();
      expect(colonIssue?.suggestion).toContain(":");
    });

    it("detects cues placed outside beat blocks", () => {
      const broken = `
scene theme=paper
layout LR
service API
database DB
show $nodes
API -> DB "query"
`;
      const report = diagnoseMarkdyCode(broken);
      const outsideBeatIssue = report.issues.find((i) => i.code === "CUE_OUTSIDE_BEAT");
      expect(outsideBeatIssue).toBeDefined();
      expect(outsideBeatIssue?.ruleExplanation).toContain("beat");
    });

    it("detects foreign diagram syntax like Mermaid", () => {
      const mmd = `
flowchart LR
  A[Client] --> B[Server]
`;
      const report = diagnoseMarkdyCode(mmd);
      const foreignIssue = report.issues.find((i) => i.code === "FOREIGN_DIAGRAM_SYNTAX");
      expect(foreignIssue).toBeDefined();
      expect(foreignIssue?.suggestion).toContain("transpile_to_markdy");
    });

    it("detects invalid flow operators", () => {
      const broken = `
scene theme=paper
layout LR
service A
service B
beat main:
  A --> B "invalid op"
`;
      const report = diagnoseMarkdyCode(broken);
      const opIssue = report.issues.find((i) => i.code === "INVALID_FLOW_OPERATOR");
      expect(opIssue).toBeDefined();
      expect(opIssue?.didYouMean).toBe("->");
    });

    it("detects flow cycles where -> should be <- for responses", () => {
      const cyclical = `
scene theme=paper
layout LR
browser UI
service API
database DB
beat main:
  UI -> API "request" -> DB "read"
  API -> UI "response"
`;
      const report = diagnoseMarkdyCode(cyclical);
      const cycleIssue = report.issues.find((i) => i.code === "FLOW_CYCLE_RETURN_EDGE");
      expect(cycleIssue).toBeDefined();
      expect(cycleIssue?.suggestion).toContain("<-");
    });

    it("handles parallel flows with '&' without flagging false-positive undefined nodes", () => {
      const parallelCode = `
scene theme=paper
layout LR
gateway GW "API Gateway"
service API "API Service"
database DB "Database"
queue Queue "Task Queue"

beat main:
  GW -> API "forward"
  API -> DB "query" & API ~> Queue "publish"
`;
      const report = diagnoseMarkdyCode(parallelCode);
      const undefinedNodeIssues = report.issues.filter((i) => i.code === "UNDEFINED_NODE_REFERENCE");
      expect(undefinedNodeIssues).toHaveLength(0);
      expect(report.errorCount).toBe(0);
    });

    it("expands contractions intelligently without corrupting English words", () => {
      const candidates = ["OrderService", "ApiGateway", "UserDatabase", "RedisCache"];
      expect(findClosestMatch("OrderSvc", candidates)?.match).toBe("OrderService");
      expect(findClosestMatch("ApiGW", candidates)?.match).toBe("ApiGateway");
      expect(findClosestMatch("UserDB", candidates)?.match).toBe("UserDatabase");
      // Standard words should not match arbitrarily
      expect(findClosestMatch("request", candidates)).toBeNull();
      expect(findClosestMatch("sequence", candidates)).toBeNull();
    });
  });

  describe("repairMarkdyCode (Auto-Healing)", () => {
    it("auto-repairs typo in keyword, node kind, operator, and missing colon", () => {
      const broken = `
scen theme=paper
layput LR
servce WebApp "Web Client"
databse DB "Main Database"
beat main "Initialize"
  WebApp --> DB "query"
`;
      const result = repairMarkdyCode(broken);
      expect(result.changes.length).toBeGreaterThanOrEqual(3);
      expect(result.repairedCode).toContain("scene theme=paper");
      expect(result.repairedCode).toContain("layout LR");
      expect(result.repairedCode).toContain("service WebApp");
      expect(result.repairedCode).toContain("database DB");
      expect(result.repairedCode).toContain("beat main \"Initialize\":");
      expect(result.repairedCode).toContain("WebApp -> DB");
      expect(result.isFixed).toBe(true);
    });

    it("auto-wraps bare top-level cues in a beat block", () => {
      const broken = `
scene theme=paper
layout LR
service API
database DB
API -> DB "query"
`;
      const result = repairMarkdyCode(broken);
      expect(result.repairedCode).toContain("beat main");
      expect(result.isFixed).toBe(true);
    });

    it("preserves parallel flows with '&' during auto-repair", () => {
      const broken = `
scene theme=paper
layout LR
servce API "API"
databse DB "DB"
queue Tasks "Tasks"
beat main "Flow"
  API --> DB "query" & API ~> Tasks "send"
`;
      const result = repairMarkdyCode(broken);
      expect(result.repairedCode).toContain("service API");
      expect(result.repairedCode).toContain("database DB");
      expect(result.repairedCode).toContain("API -> DB \"query\" & API ~> Tasks \"send\"");
      expect(result.isFixed).toBe(true);
    });
  });
});
