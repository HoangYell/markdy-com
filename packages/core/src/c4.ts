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

  if (l2Nodes.length > 0) {
    beats.push(``);
    beats.push(`beat c4_l2_containers "Level 2: Container Topology & Stores":`);
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

export interface C4LevelViewExport {
  level: C4Level;
  levelNumber: 1 | 2 | 3 | 4;
  title: string;
  markdyScript: string;
  nodeCount: number;
  edgeCount: number;
}

/**
 * Exports isolated, production-ready MarkdyScript blueprints for each of the 4 C4 levels.
 */
export function exportC4LevelViews(ast: DiagramAST): Record<C4Level, C4LevelViewExport> {
  const levels: C4Level[] = ["context", "container", "component", "code"];
  const result: Record<string, C4LevelViewExport> = {};

  for (const lvl of levels) {
    const { filteredAst } = filterC4Hierarchy(ast, lvl);
    const nodes = Object.values(filteredAst.nodes || {});
    const edges = filteredAst.edges || [];

    const lines: string[] = [];
    const levelTitle = `C4 L${LEVEL_ORDER[lvl]} ${lvl.toUpperCase()}: ${ast.meta?.title || "Architecture"}`;
    lines.push(`scene "${levelTitle}" theme=auto`);
    lines.push(`layout LR`);
    lines.push(``);

    for (const node of nodes) {
      const iconProp = node.props?.["icon"] ? ` icon=${node.props["icon"]}` : "";
      const rawSrc = node.props?.["@src"] || node.props?.["src"];
      const srcProp = lvl === "code" && rawSrc ? ` @src="${rawSrc}"` : "";
      lines.push(`${node.kind || "service"} ${node.id} "${node.label || node.id}"${iconProp}${srcProp}`);
    }

    lines.push(``);
    lines.push(`beat c4_view "C4 ${lvl.toUpperCase()} Topology":`);
    lines.push(`  show $nodes stagger=50ms`);

    for (const edge of edges) {
      const label = edge.label ? ` "${edge.label}"` : "";
      let op = "->";
      if (edge.kind === "event") op = "~>";
      else if (edge.kind === "response") op = "<-";
      else if (edge.kind === "dependency") op = "--";
      lines.push(`  ${edge.from} ${op} ${edge.to}${label}`);
    }

    result[lvl] = {
      level: lvl,
      levelNumber: LEVEL_ORDER[lvl],
      title: levelTitle,
      markdyScript: lines.join("\n") + "\n",
      nodeCount: nodes.length,
      edgeCount: edges.length,
    };
  }

  return result as Record<C4Level, C4LevelViewExport>;
}

/**
 * Validates cross-level containment and flags orphaned lower-level components.
 */
export function validateC4Containment(ast: DiagramAST): { isValid: boolean; issues: string[] } {
  const nodes = Object.values(ast.nodes || {});
  const issues: string[] = [];

  const l3OrL4Nodes = nodes.filter((n) => {
    const { levelNumber } = inferNodeC4Level(n);
    return levelNumber >= 3;
  });

  const containers = nodes.filter((n) => {
    const { levelNumber } = inferNodeC4Level(n);
    return levelNumber === 2;
  });

  if (l3OrL4Nodes.length > 0 && containers.length === 0) {
    issues.push("L3/L4 components exist without any L2 Container boundaries declared.");
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

