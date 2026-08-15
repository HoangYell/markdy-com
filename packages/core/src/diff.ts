/**
 * packages/core/src/diff.ts
 * Semantic AST Diffing and Architectural Evolution for MarkdyScript.
 * Zero external dependencies.
 */

import type { DiagramAST, NodeDecl, EdgeDecl } from "./ast.js";

export type DiffChangeType = "added" | "removed" | "modified" | "unchanged";

export interface NodeDiff {
  id: string;
  status: DiffChangeType;
  before?: NodeDecl;
  after?: NodeDecl;
  changes: string[];
}

export interface EdgeDiff {
  key: string;
  status: DiffChangeType;
  before?: EdgeDecl;
  after?: EdgeDecl;
}

export interface DiagramDiffResult {
  nodes: NodeDiff[];
  edges: EdgeDiff[];
  addedNodesCount: number;
  removedNodesCount: number;
  modifiedNodesCount: number;
  summaryMarkdown: string;
  evolutionMarkdyScript: string;
}

export function diffDiagramASTs(beforeAST: DiagramAST, afterAST: DiagramAST): DiagramDiffResult {
  const nodeDiffs: NodeDiff[] = [];
  const edgeDiffs: EdgeDiff[] = [];

  const beforeNodeIds = new Set(Object.keys(beforeAST.nodes));
  const afterNodeIds = new Set(Object.keys(afterAST.nodes));

  let addedNodesCount = 0;
  let removedNodesCount = 0;
  let modifiedNodesCount = 0;

  // 1. Process After Nodes (Added or Modified)
  for (const [id, afterNode] of Object.entries(afterAST.nodes)) {
    if (!beforeNodeIds.has(id)) {
      nodeDiffs.push({ id, status: "added", after: afterNode, changes: ["Newly added node"] });
      addedNodesCount++;
    } else {
      const beforeNode = beforeAST.nodes[id];
      const changes: string[] = [];
      if (beforeNode.kind !== afterNode.kind) {
        changes.push(`Kind changed: ${beforeNode.kind} → ${afterNode.kind}`);
      }
      if (beforeNode.label !== afterNode.label) {
        changes.push(`Label changed: "${beforeNode.label}" → "${afterNode.label}"`);
      }

      if (changes.length > 0) {
        nodeDiffs.push({ id, status: "modified", before: beforeNode, after: afterNode, changes });
        modifiedNodesCount++;
      } else {
        nodeDiffs.push({ id, status: "unchanged", before: beforeNode, after: afterNode, changes: [] });
      }
    }
  }

  // 2. Process Before Nodes (Removed)
  for (const [id, beforeNode] of Object.entries(beforeAST.nodes)) {
    if (!afterNodeIds.has(id)) {
      nodeDiffs.push({ id, status: "removed", before: beforeNode, changes: ["Removed node"] });
      removedNodesCount++;
    }
  }

  // 3. Process Edges
  const edgeKey = (e: { from: string; to: string; kind: string }) => `${e.from}->${e.to}:${e.kind}`;
  const beforeEdgeMap = new Map(beforeAST.edges.map((e) => [edgeKey(e), e]));
  const afterEdgeMap = new Map(afterAST.edges.map((e) => [edgeKey(e), e]));

  for (const [key, afterEdge] of afterEdgeMap) {
    if (!beforeEdgeMap.has(key)) {
      edgeDiffs.push({ key, status: "added", after: afterEdge });
    } else {
      edgeDiffs.push({ key, status: "unchanged", before: beforeEdgeMap.get(key), after: afterEdge });
    }
  }

  for (const [key, beforeEdge] of beforeEdgeMap) {
    if (!afterEdgeMap.has(key)) {
      edgeDiffs.push({ key, status: "removed", before: beforeEdge });
    }
  }

  // 4. Generate PR Markdown Summary Table
  const summaryLines: string[] = [
    "### 📊 Markdy Architectural Diff Summary",
    "",
    `| Metric | Count |`,
    `|---|---|`,
    `| 🟢 Nodes Added | **${addedNodesCount}** |`,
    `| 🔴 Nodes Removed | **${removedNodesCount}** |`,
    `| 🟡 Nodes Modified | **${modifiedNodesCount}** |`,
    "",
  ];

  if (addedNodesCount > 0 || modifiedNodesCount > 0 || removedNodesCount > 0) {
    summaryLines.push("#### Changes Detail");
    for (const nd of nodeDiffs.filter((n) => n.status !== "unchanged")) {
      summaryLines.push(`- **${nd.id}** (${nd.status.toUpperCase()}): ${nd.changes.join(", ")}`);
    }
    summaryLines.push("");
  }

  // 5. Generate Evolution Animation Scene (Visual Morphing V1 -> V2)
  const evolutionLines: string[] = [
    `scene "Architecture Evolution" theme=${afterAST.meta.theme || "paper"}`,
    `layout ${afterAST.meta.direction || "LR"}`,
    "",
  ];

  for (const [id, node] of Object.entries({ ...beforeAST.nodes, ...afterAST.nodes })) {
    evolutionLines.push(`${node.kind} ${id} "${node.label}"`);
  }

  evolutionLines.push("");
  evolutionLines.push('beat v1 "Baseline Architecture":');
  const v1NodeIds = Object.keys(beforeAST.nodes).join(" ");
  if (v1NodeIds) {
    evolutionLines.push(`  show ${v1NodeIds}`);
  }

  evolutionLines.push("");
  evolutionLines.push('beat transition "Migrate to Target Architecture":');
  const addedIds = nodeDiffs.filter((n) => n.status === "added").map((n) => n.id);
  const removedIds = nodeDiffs.filter((n) => n.status === "removed").map((n) => n.id);

  if (removedIds.length > 0) {
    evolutionLines.push(`  hide ${removedIds.join(" ")}`);
  }
  if (addedIds.length > 0) {
    evolutionLines.push(`  show ${addedIds.join(" ")}`);
    evolutionLines.push(`  glow ${addedIds.join(" ")} color="#10b981"`);
  }

  return {
    nodes: nodeDiffs,
    edges: edgeDiffs,
    addedNodesCount,
    removedNodesCount,
    modifiedNodesCount,
    summaryMarkdown: summaryLines.join("\n"),
    evolutionMarkdyScript: evolutionLines.join("\n"),
  };
}
