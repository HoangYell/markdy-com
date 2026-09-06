import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { parse, compile } from "../src/parser.js";
import type { Cue, FlowSegment } from "../src/ast.js";
import { extractDiagramCodeAnchors, verifyCodeAnchorsWithReader } from "../src/provenance.js";

const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const reviewedExamples = [
  "02-flow-operators.markdy",
  "05-universal-ingestion.markdy",
  "22-code-provenance-anchors.markdy",
  "24-blast-radius-impact-lens.markdy",
  "30-active-active-failover-consensus.markdy",
  "31-width-first-responsive-autoscale.markdy",
];

function loadExample(file: string) {
  return parse(readFileSync(resolve(repositoryRoot, "examples", file), "utf8"));
}

function flattenCues(cues: Cue[]): Cue[] {
  return cues.flatMap((cue) => cue.kind === "parallel" ? flattenCues(cue.cues) : [cue]);
}

function flowsIn(cues: Cue[]): FlowSegment[] {
  return flattenCues(cues).flatMap((cue) => cue.kind === "flow" ? cue.segments : []);
}

describe("Reviewed example semantics", () => {
  it.each(reviewedExamples)("parses and compiles %s without diagnostics", (file) => {
    const ast = loadExample(file);
    expect(ast.diagnostics).toEqual([]);
    expect(compile(ast).nodes.length).toBe(Object.keys(ast.nodes).length);
  });

  it("returns the basic response from the API to the client", () => {
    const ast = loadExample("02-flow-operators.markdy");
    const responses = flowsIn(ast.beats.flatMap((beat) => beat.cues))
      .filter((flow) => flow.op === "response");
    expect(responses).toEqual([{ from: "Api", to: "WebApp", op: "response", label: "response" }]);
  });

  it("returns the order response through the gateway and load balancer", () => {
    const ast = loadExample("05-universal-ingestion.markdy");
    const settlement = ast.beats.find((beat) => beat.name === "settlement")!;
    const responses = flowsIn(settlement.cues).filter((flow) => flow.op === "response");
    expect(responses.map((flow) => [flow.from, flow.to])).toEqual([
      ["orders_svc", "edge_gw"],
      ["edge_gw", "alb"],
      ["alb", "Client"],
    ]);
  });

  it("grounds every provenance node in its actual source definition", () => {
    const ast = loadExample("22-code-provenance-anchors.markdy");
    expect(ast.meta.type).toBe("flowchart");
    const anchors = extractDiagramCodeAnchors(ast);
    const report = verifyCodeAnchorsWithReader(anchors, {
      fileExists: (file) => existsSync(resolve(repositoryRoot, file)),
      getLineCount: (file) => readFileSync(resolve(repositoryRoot, file), "utf8").split("\n").length,
    });
    expect(report.diagnostics).toEqual([]);
    expect(report.verifiedCount).toBe(Object.keys(ast.nodes).length);

    const definitions: Record<string, string> = {
      EntryPoint: "export function parseAndCompile(",
      Parser: "export function parse(",
      DiagramAST: "export type DiagramAST =",
      Compiler: "export function compile(",
      LayoutEngine: "export function compilePlan(",
    };
    for (const [nodeId, definition] of Object.entries(definitions)) {
      const anchor = anchors.get(nodeId)!;
      const lines = readFileSync(resolve(repositoryRoot, anchor.filePath), "utf8").split("\n");
      expect(lines[anchor.startLine! - 1]).toContain(definition);
    }
  });

  it("highlights the downstream dashboard as part of the transitive impact", () => {
    const ast = loadExample("24-blast-radius-impact-lens.markdy");
    const impact = ast.beats.find((beat) => beat.name === "simulate_impact")!;
    const affected = flattenCues(impact.cues)
      .flatMap((cue) => cue.kind === "glow" && cue.color === "#f97316" ? cue.targets : []);
    expect(affected.sort()).toEqual(["Analytics", "CentralStore", "HotBuffer"]);
    expect(ast.nodes.Analytics.props.accent).toBe("#f97316");
  });

  it("uses a single Aurora writer until the replica has been promoted", () => {
    const ast = loadExample("30-active-active-failover-consensus.markdy");
    const promotionIndex = ast.beats.findIndex((beat) => beat.name === "promote_replica");
    expect(promotionIndex).toBeGreaterThan(0);
    const normalFlows = flowsIn(ast.beats.slice(0, promotionIndex).flatMap((beat) => beat.cues));
    const writes = normalFlows.filter((flow) => /write/i.test(flow.label ?? ""));
    expect(writes).toHaveLength(2);
    expect(writes.every((flow) => flow.to === "AuroraMasterEast")).toBe(true);
    const replication = normalFlows.filter((flow) => flow.op === "event");
    expect(replication.map((flow) => [flow.from, flow.to])).toEqual([
      ["AuroraMasterEast", "AuroraMasterWest"],
    ]);

    const promotion = flowsIn(ast.beats[promotionIndex].cues);
    expect(promotion).toEqual(expect.arrayContaining([
      expect.objectContaining({ from: "AuroraMasterWest", to: "RecoveryControl", op: "response" }),
    ]));
    const recovery = flowsIn(ast.beats.slice(promotionIndex + 1).flatMap((beat) => beat.cues));
    expect(recovery).toEqual(expect.arrayContaining([
      expect.objectContaining({ from: "SecondaryCluster", to: "AuroraMasterWest", op: "request" }),
    ]));
    expect(extractDiagramCodeAnchors(ast).size).toBe(0);
  });

  it("uses the built-in mobile node glyph instead of an unsupported React override", () => {
    const ast = loadExample("31-width-first-responsive-autoscale.markdy");
    expect(ast.nodes.MobileClient.kind).toBe("mobile");
    expect(ast.nodes.MobileClient.props.icon).toBeUndefined();
    expect(ast.meta.direction).toBe("TB");
  });
});