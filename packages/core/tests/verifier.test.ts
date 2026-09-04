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
    expect(report.checks.length).toBe(12);
    expect(report.sha256Receipt).toMatch(/^sha256-[0-9a-f]{32}$/);
    expect(report.metrics.nodeCount).toBe(4);
    expect(report.metrics.hasCodeProvenance).toBe(true);
    expect(report.metrics.provenanceAnchorCount).toBe(2);
    expect(report.viewportCompliance["1440x900"]).toBe(true);
  });

  it("detects orphan disconnected nodes in topology", () => {
    const code = `
scene "Orphan Node Detection" theme=midnight
service NodeA "Active Service A"
service NodeB "Active Service B"
service OrphanSvc "Orphaned Unconnected Service"

beat flow:
  NodeA -> NodeB "Direct request"
`;
    const { ast } = parseAndCompile(code);
    const report = verifyDiagramQuality(ast);
    const orphanCheck = report.checks.find((c) => c.id === "orphan_nodes");
    expect(orphanCheck?.status).toBe("warn");
    expect(orphanCheck?.message).toContain("OrphanSvc");
  });

  it("detects synchronous blocking deadlock cycles", () => {
    const code = `
scene "Deadlock Cycle Detection" theme=midnight
service SvcA "Service A"
service SvcB "Service B"
service SvcC "Service C"

beat cycle:
  SvcA -> SvcB "Calls B"
  SvcB -> SvcC "Calls C"
  SvcC -> SvcA "Calls back A synchronously"
`;
    const { ast } = parseAndCompile(code);
    const report = verifyDiagramQuality(ast);
    const deadlockCheck = report.checks.find((c) => c.id === "sync_deadlock");
    expect(deadlockCheck?.status).toBe("warn");
    expect(deadlockCheck?.message).toContain("Synchronous circular blocking dependency detected");
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

