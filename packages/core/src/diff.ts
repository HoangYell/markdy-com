/**
 * packages/core/src/diff.ts
 * Architectural Evolution and Git-Diff Engine for Markdy.
 * Calculates structural deltas between two architectural states and generates animated migration storyboards.
 * Zero external dependencies.
 */

import type { DiagramAST, NodeDecl, EdgeDecl, GroupDecl } from "./ast.js";

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
  changes: string[];
}

export interface GroupDiff {
  id: string;
  status: DiffChangeType;
  before?: GroupDecl;
  after?: GroupDecl;
  changes: string[];
}

export interface DiagramDiffResult {
  nodes: NodeDiff[];
  edges: EdgeDiff[];
  groups: GroupDiff[];
  addedNodesCount: number;
  removedNodesCount: number;
  modifiedNodesCount: number;
  addedEdgesCount: number;
  removedEdgesCount: number;
  summaryMarkdown: string;
  evolutionMarkdyScript: string;
}

/**
 * Compares two Diagram ASTs to produce a comprehensive architectural evolution report.
 */
export function diffDiagramASTs(beforeAST: DiagramAST, afterAST: DiagramAST): DiagramDiffResult {
  const nodeDiffs: NodeDiff[] = [];
  const edgeDiffs: EdgeDiff[] = [];
  const groupDiffs: GroupDiff[] = [];

  const beforeNodes = beforeAST.nodes || {};
  const afterNodes = afterAST.nodes || {};
  const beforeNodeIds = new Set(Object.keys(beforeNodes));
  const afterNodeIds = new Set(Object.keys(afterNodes));

  let addedNodesCount = 0;
  let removedNodesCount = 0;
  let modifiedNodesCount = 0;

  // 1. Process After Nodes (Added or Modified)
  for (const [id, afterNode] of Object.entries(afterNodes)) {
    if (!beforeNodeIds.has(id)) {
      nodeDiffs.push({ id, status: "added", after: afterNode, changes: ["Newly provisioned node"] });
      addedNodesCount++;
    } else {
      const beforeNode = beforeNodes[id];
      const changes: string[] = [];
      if (beforeNode.kind !== afterNode.kind) {
        changes.push(`Kind: ${beforeNode.kind} → ${afterNode.kind}`);
      }
      if (beforeNode.label !== afterNode.label) {
        changes.push(`Label: "${beforeNode.label}" → "${afterNode.label}"`);
      }
      const beforeSrc = beforeNode.props?.["@src"] || beforeNode.props?.["src"];
      const afterSrc = afterNode.props?.["@src"] || afterNode.props?.["src"];
      if (beforeSrc !== afterSrc) {
        changes.push(`Code Provenance: ${beforeSrc || "none"} → ${afterSrc || "none"}`);
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
  for (const [id, beforeNode] of Object.entries(beforeNodes)) {
    if (!afterNodeIds.has(id)) {
      nodeDiffs.push({ id, status: "removed", before: beforeNode, changes: ["Decommissioned node"] });
      removedNodesCount++;
    }
  }

  // 3. Process Edges
  const edgeKey = (e: { from: string; to: string; kind: string }) => `${e.from}->${e.to}:${e.kind}`;
  const beforeEdgeMap = new Map((beforeAST.edges || []).map((e) => [edgeKey(e), e]));
  const afterEdgeMap = new Map((afterAST.edges || []).map((e) => [edgeKey(e), e]));

  let addedEdgesCount = 0;
  let removedEdgesCount = 0;

  for (const [key, afterEdge] of afterEdgeMap.entries()) {
    if (!beforeEdgeMap.has(key)) {
      edgeDiffs.push({ key, status: "added", after: afterEdge, changes: ["New interaction route"] });
      addedEdgesCount++;
    } else {
      const beforeEdge = beforeEdgeMap.get(key)!;
      const changes: string[] = [];
      if (beforeEdge.label !== afterEdge.label) {
        changes.push(`Protocol/Label: "${beforeEdge.label || ""}" → "${afterEdge.label || ""}"`);
      }
      if (changes.length > 0) {
        edgeDiffs.push({ key, status: "modified", before: beforeEdge, after: afterEdge, changes });
      } else {
        edgeDiffs.push({ key, status: "unchanged", before: beforeEdge, after: afterEdge, changes: [] });
      }
    }
  }

  for (const [key, beforeEdge] of beforeEdgeMap.entries()) {
    if (!afterEdgeMap.has(key)) {
      edgeDiffs.push({ key, status: "removed", before: beforeEdge, changes: ["Decommissioned route"] });
      removedEdgesCount++;
    }
  }

  // 4. Process Groups / Perimeters
  const beforeGroups = beforeAST.groups || {};
  const afterGroups = afterAST.groups || {};
  const beforeGroupIds = new Set(Object.keys(beforeGroups));
  const afterGroupIds = new Set(Object.keys(afterGroups));

  for (const [id, afterGroup] of Object.entries(afterGroups)) {
    if (!beforeGroupIds.has(id)) {
      groupDiffs.push({ id, status: "added", after: afterGroup, changes: ["New security / subsystem boundary"] });
    } else {
      const beforeGroup = beforeGroups[id];
      const beforeMembers = new Set(beforeGroup.members || []);
      const afterMembers = new Set(afterGroup.members || []);
      const diffMembers = (afterGroup.members || []).filter((m) => !beforeMembers.has(m));
      if (diffMembers.length > 0 || beforeGroup.members.length !== afterGroup.members.length) {
        groupDiffs.push({
          id,
          status: "modified",
          before: beforeGroup,
          after: afterGroup,
          changes: [`Boundary membership updated: [${(afterGroup.members || []).join(", ")}]`],
        });
      }
    }
  }

  for (const [id, beforeGroup] of Object.entries(beforeGroups)) {
    if (!afterGroupIds.has(id)) {
      groupDiffs.push({ id, status: "removed", before: beforeGroup, changes: ["Dissolved boundary"] });
    }
  }

  // 5. Generate Animated Evolution Script (MarkdyScript)
  const evolutionMarkdyScript = generateEvolutionMarkdyScript(
    beforeAST,
    afterAST,
    nodeDiffs,
    edgeDiffs
  );

  // 6. Generate Markdown Summary
  const summaryMarkdown = [
    `# Markdy Architectural Diff Summary`,
    `- **Nodes Added**: ${addedNodesCount}`,
    `- **Nodes Removed**: ${removedNodesCount}`,
    `- **Nodes Modified**: ${modifiedNodesCount}`,
    `- **Routes Added**: ${addedEdgesCount}`,
    `- **Routes Removed**: ${removedEdgesCount}`,
    "",
    `### Component Delta`,
    `| Component | Status | Details |`,
    `| :--- | :--- | :--- |`,
    ...nodeDiffs
      .filter((n) => n.status !== "unchanged")
      .map((n) => `| \`${n.id}\` | **${n.status.toUpperCase()}** | ${n.changes.join("; ")} |`),
    "",
    `### Connection Delta`,
    `| Connection | Status | Details |`,
    `| :--- | :--- | :--- |`,
    ...edgeDiffs
      .filter((e) => e.status !== "unchanged")
      .map((e) => `| \`${e.key}\` | **${e.status.toUpperCase()}** | ${e.changes.join("; ")} |`),
  ].join("\n");

  return {
    nodes: nodeDiffs,
    edges: edgeDiffs,
    groups: groupDiffs,
    addedNodesCount,
    removedNodesCount,
    modifiedNodesCount,
    addedEdgesCount,
    removedEdgesCount,
    summaryMarkdown,
    evolutionMarkdyScript,
  };
}

function generateEvolutionMarkdyScript(
  beforeAST: DiagramAST,
  afterAST: DiagramAST,
  nodeDiffs: NodeDiff[],
  edgeDiffs: EdgeDiff[]
): string {
  const lines: string[] = [`scene theme=paper`, `layout ${afterAST.meta?.direction || "LR"}`, ""];

  // Union of all nodes
  const allNodes = new Map<string, NodeDecl>();
  for (const [id, n] of Object.entries(beforeAST.nodes || {})) allNodes.set(id, n);
  for (const [id, n] of Object.entries(afterAST.nodes || {})) allNodes.set(id, n);

  for (const [id, node] of allNodes.entries()) {
    const propsStr = Object.entries(node.props || {})
      .map(([k, v]) => `${k}=${typeof v === "string" ? `"${v}"` : v}`)
      .join(" ");
    lines.push(`${node.kind} ${id} "${node.label}" ${propsStr}`.trim());
  }

  lines.push("");

  // Beat 1: Baseline Architecture
  const beforeNodeIds = Object.keys(beforeAST.nodes || {}).join(" ");
  lines.push(`beat baseline:`);
  lines.push(`  show ${beforeNodeIds}`);
  for (const edge of beforeAST.edges || []) {
    lines.push(`  ${edge.from} -> ${edge.to} "${edge.label || ""}"`);
  }

  // Beat 2: Transition
  const removedNodeIds = nodeDiffs.filter((n) => n.status === "removed").map((n) => n.id);
  const addedNodeIds = nodeDiffs.filter((n) => n.status === "added").map((n) => n.id);

  lines.push("");
  lines.push(`beat transition:`);
  if (removedNodeIds.length > 0) {
    lines.push(`  glow ${removedNodeIds.join(" ")} color=#fb7185 strength=1.2`);
    lines.push(`  hide ${removedNodeIds.join(" ")} dur=800ms`);
  }
  if (addedNodeIds.length > 0) {
    lines.push(`  show ${addedNodeIds.join(" ")} stagger=80ms`);
    lines.push(`  glow ${addedNodeIds.join(" ")} color=#34d399 strength=1.5`);
  }

  return lines.join("\n");
}
