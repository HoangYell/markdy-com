import { describe, it, expect } from "vitest";
import { parseAndCompile } from "../src/parser.js";
import { verifyDiagramQuality } from "../src/verifier.js";

describe("9-Point Quality Gate & Viewport Verifier", () => {
  it("verifies a standard diagram successfully", () => {
    const code = `
scene "System Architecture" theme=midnight
layout LR

browser Client "Web Client" icon=chrome
gateway Gateway "API Gateway" icon=nginx @src="src/gateway.ts#L10"
service Svc "Order Service" icon=nodejs @src="src/order.ts#L20"
database DB "Postgres Database" icon=postgresql

beat flow:
  show $nodes
  Client -> Gateway "GET /order" -> Svc "Process"
  Svc -> DB "Query"
`;
    const { ast } = parseAndCompile(code);
    const report = verifyDiagramQuality(ast, { profile: "standard" });

    expect(report.passed).toBe(true);
    expect(report.errorCount).toBe(0);
    expect(report.checks.length).toBe(9);
    expect(report.sha256Receipt).toMatch(/^sha256-[0-9a-f]{32}$/);
    expect(report.metrics.nodeCount).toBe(4);
    expect(report.metrics.hasCodeProvenance).toBe(true);
    expect(report.metrics.provenanceAnchorCount).toBe(2);
    expect(report.viewportCompliance["1440x900"]).toBe(true);
  });

  it("fails verification on empty AST", () => {
    const { ast } = parseAndCompile("scene \"Empty Scene\"");
    const report = verifyDiagramQuality(ast);
    expect(report.passed).toBe(false);
    expect(report.errorCount).toBeGreaterThan(0);
    const syntaxCheck = report.checks.find((c) => c.id === "syntax_validity");
    expect(syntaxCheck?.status).toBe("fail");
  });

  it("detects invalid code provenance anchor format", () => {
    const code = `
scene "Bad Provenance"
service Svc "Invalid Node" @src="/absolute/path/escape#L1"
`;
    const { ast } = parseAndCompile(code);
    const report = verifyDiagramQuality(ast);
    const provCheck = report.checks.find((c) => c.id === "provenance_anchors");
    expect(provCheck?.status).toBe("fail");
  });

  it("checks showcase quality profile strictly", () => {
    const code = `
scene "Showcase Scene" theme=midnight
browser Client "Web Client" icon=chrome
service Svc "Service" icon=nodejs

beat main:
  Client -> Svc "Request"
`;
    const { ast } = parseAndCompile(code);
    const report = verifyDiagramQuality(ast, { profile: "showcase" });
    expect(report.passed).toBe(true);
    expect(report.qualityProfile).toBe("showcase");
  });
});
