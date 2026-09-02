/**
 * packages/core/src/c4.ts
 * C4 Hierarchical Architecture Engine for Markdy.
 * Supports L1 System Context, L2 Containers, L3 Components, and L4 Code Provenance views.
 * Zero external dependencies.
 */

import type { DiagramAST, NodeDecl, EdgeDecl } from "./ast.js";

export type C4Level = "context" | "container" | "component" | "code";

export interface C4NodeMeta {
  id: string;
  level: C4Level;
  levelNumber: 1 | 2 | 3 | 4;
  isExternal: boolean;
  containerParent?: string;
  hasCodeProvenance: boolean;
}

export interface C4ModelReport {
  ast: DiagramAST;
  levelsPresent: Record<C4Level, number>;
  nodesByLevel: Record<C4Level, string[]>;
  summaryMarkdown: string;
}

const LEVEL_ORDER: Record<C4Level, 1 | 2 | 3 | 4> = {
  context: 1,
  container: 2,
  component: 3,
  code: 4,
};

/**
 * Infers the C4 abstraction level of a node based on explicit @c4 prop or node characteristics.
 */
export function inferNodeC4Level(node: NodeDecl): { level: C4Level; levelNumber: 1 | 2 | 3 | 4 } {
  const explicit = node.props?.["@c4"] || node.props?.["c4"] || node.props?.["level"];
  if (typeof explicit === "string" || typeof explicit === "number") {
    const raw = String(explicit).toLowerCase();
    if (raw === "1" || raw === "context") return { level: "context", levelNumber: 1 };
    if (raw === "2" || raw === "container") return { level: "container", levelNumber: 2 };
    if (raw === "3" || raw === "component") return { level: "component", levelNumber: 3 };
    if (raw === "4" || raw === "code") return { level: "code", levelNumber: 4 };
  }

  // Heuristic inference based on node kind and provenance
  const hasSrc = Boolean(node.props?.["@src"] || node.props?.["src"]);
  const kind = (node.kind || "").toLowerCase();

  if (kind === "actor" || kind === "client" || kind === "browser" || kind === "mobile") {
    return { level: "context", levelNumber: 1 };
  }

  if (hasSrc) {
    return { level: "code", levelNumber: 4 };
  }

  if (kind === "database" || kind === "gateway" || kind === "cache" || kind === "queue" || kind === "storage") {
    return { level: "container", levelNumber: 2 };
  }

  if (kind === "service" || kind === "worker") {
    return { level: "container", levelNumber: 2 };
  }

  return { level: "component", levelNumber: 3 };
}

/**
 * Analyzes the C4 model distribution of a Diagram AST.
 */
export function analyzeC4Model(ast: DiagramAST): C4ModelReport {
  const nodes = Object.values(ast.nodes || {});
  const levelsPresent: Record<C4Level, number> = {
    context: 0,
    container: 0,
    component: 0,
    code: 0,
  };
  const nodesByLevel: Record<C4Level, string[]> = {
    context: [],
    container: [],
    component: [],
    code: [],
  };

  for (const node of nodes) {
    const { level } = inferNodeC4Level(node);
    levelsPresent[level]++;
    nodesByLevel[level].push(node.id);
  }

  const lines: string[] = [
    `# C4 Architecture Model Hierarchy`,
    ``,
    `| C4 Level | Level # | Node Count | Key Components |`,
    `| :--- | :--- | :--- | :--- |`,
    `| **L1 System Context** | 1 | ${levelsPresent.context} | ${nodesByLevel.context.slice(0, 4).join(", ") || "None"} |`,
    `| **L2 Container Architecture** | 2 | ${levelsPresent.container} | ${nodesByLevel.container.slice(0, 4).join(", ") || "None"} |`,
    `| **L3 Component Internal** | 3 | ${levelsPresent.component} | ${nodesByLevel.component.slice(0, 4).join(", ") || "None"} |`,
    `| **L4 Code Provenance** | 4 | ${levelsPresent.code} | ${nodesByLevel.code.slice(0, 4).join(", ") || "None"} |`,
  ];

  return {
    ast,
    levelsPresent,
    nodesByLevel,
    summaryMarkdown: lines.join("\n"),
  };
}

/**
 * Filters a Diagram AST to a specific C4 abstraction ceiling (e.g. show all nodes up to L2 Container level).
 */
export function filterC4Hierarchy(
  ast: DiagramAST,
  maxLevel: C4Level | 1 | 2 | 3 | 4 = "container"
): { filteredAst: DiagramAST; visibleNodeIds: string[] } {
  const targetLevelNum = typeof maxLevel === "number" ? maxLevel : LEVEL_ORDER[maxLevel];
  const allNodes = Object.values(ast.nodes || {});
  const visibleNodes: Record<string, NodeDecl> = {};
  const visibleNodeIds: string[] = [];

  for (const node of allNodes) {
    const { levelNumber } = inferNodeC4Level(node);
    if (levelNumber <= targetLevelNum) {
      visibleNodes[node.id] = node;
      visibleNodeIds.push(node.id);
    }
  }

  const visibleIdSet = new Set(visibleNodeIds);
  const filteredEdges = (ast.edges || []).filter(
    (edge: EdgeDecl) => visibleIdSet.has(edge.from) && visibleIdSet.has(edge.to)
  );

  const filteredAst: DiagramAST = {
    ...ast,
    nodes: visibleNodes,
    edges: filteredEdges,
  };

  return {
    filteredAst,
    visibleNodeIds,
  };
}

/**
 * Automatically synthesizes a 4-beat interactive narrative storyboard zooming through C4 levels.
 */
export function generateC4Storyboard(ast: DiagramAST): string {
  const report = analyzeC4Model(ast);
  const beats: string[] = [];

  // Beat 1: L1 Context
  const l1Nodes = report.nodesByLevel.context;
  const l2Nodes = report.nodesByLevel.container;
  const l3Nodes = report.nodesByLevel.component;
  const l4Nodes = report.nodesByLevel.code;

  beats.push(`beat c4_l1_context "Level 1: System Context & Actors":`);
  beats.push(`  show $nodes`);
  if (l1Nodes.length > 0) {
    beats.push(`  frame ${l1Nodes.join(" ")} zoom=1.1`);
    beats.push(`  glow ${l1Nodes.slice(0, 2).join(" & glow ")} color=#38bdf8`);
  }

  beats.push(``);
  beats.push(`beat c4_l2_containers "Level 2: Container Topology & Stores":`);
  if (l2Nodes.length > 0) {
    beats.push(`  frame ${l2Nodes.join(" ")} zoom=1.15`);
    beats.push(`  glow ${l2Nodes.slice(0, 3).join(" & glow ")} color=#10b981`);
  }

  if (l3Nodes.length > 0 || l4Nodes.length > 0) {
    beats.push(``);
    beats.push(`beat c4_l3_components "Level 3: Internal Modules & Flow":`);
    const focusNodes = [...l3Nodes, ...l4Nodes].slice(0, 5);
    beats.push(`  frame ${focusNodes.join(" ")} zoom=1.2`);
    beats.push(`  glow ${focusNodes.slice(0, 2).join(" & glow ")} color=#f59e0b`);
  }

  if (l4Nodes.length > 0) {
    beats.push(``);
    beats.push(`beat c4_l4_code "Level 4: Physical Code Provenance Anchors":`);
    beats.push(`  frame ${l4Nodes.join(" ")} zoom=1.25`);
    beats.push(`  glow ${l4Nodes.join(" & glow ")} color=#ec4899`);
  }

  return beats.join("\n") + "\n";
}
