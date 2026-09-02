/**
 * packages/core/src/drift.ts
 * Architecture Drift Detection and In-Tree Code Synchronization Engine for Markdy.
 * Identifies drift between architecture models and real physical repository codebases.
 * Zero external dependencies.
 */

import type { DiagramAST, NodeDecl } from "./ast.js";
import { parseCodeAnchor } from "./provenance.js";

export interface BrokenAnchorDrift {
  nodeId: string;
  nodeLabel: string;
  declaredPath: string;
  reason: "file_not_found" | "path_escaped";
}

export interface OrphanCodeServiceDrift {
  suggestedId: string;
  suggestedKind: string;
  discoveredPath: string;
}

export interface ArchitectureDriftReport {
  isSynchronized: boolean;
  totalAnchorsChecked: number;
  validAnchorCount: number;
  brokenAnchors: BrokenAnchorDrift[];
  orphanCodeServices: OrphanCodeServiceDrift[];
  summaryMarkdown: string;
  healingMarkdySnippet?: string;
}

/**
 * Detects architectural drift between a Diagram AST and a list of physical repository files.
 */
export function detectArchitectureDrift(
  ast: DiagramAST,
  existingFiles: string[] = []
): ArchitectureDriftReport {
  const fileSet = new Set(existingFiles.map((f) => f.replace(/^[./\\]+/, "")));
  const nodes = Object.values(ast.nodes || {});

  const brokenAnchors: BrokenAnchorDrift[] = [];
  let totalAnchorsChecked = 0;
  let validAnchorCount = 0;

  const declaredCodeFiles = new Set<string>();

  for (const node of nodes) {
    const rawSrc = node.props?.["@src"] || node.props?.["src"];
    if (rawSrc) {
      totalAnchorsChecked++;
      const anchor = parseCodeAnchor(rawSrc);
      if (!anchor) {
        brokenAnchors.push({
          nodeId: node.id,
          nodeLabel: node.label,
          declaredPath: String(rawSrc),
          reason: "path_escaped",
        });
      } else {
        const norm = anchor.filePath.replace(/^[./\\]+/, "");
        declaredCodeFiles.add(norm);
        if (fileSet.size > 0 && !fileSet.has(norm)) {
          brokenAnchors.push({
            nodeId: node.id,
            nodeLabel: node.label,
            declaredPath: String(rawSrc),
            reason: "file_not_found",
          });
        } else {
          validAnchorCount++;
        }
      }
    }
  }

  // Scan for orphan code services in repository files that might need mapping
  const orphanCodeServices: OrphanCodeServiceDrift[] = [];
  const servicePathRegex = /^(?:src\/|apps\/|packages\/|services\/)([a-zA-Z0-9_-]+)\/(?:index|main|service|handler|server|app)\.(?:ts|js|go|py|rs)$/i;

  for (const filePath of existingFiles) {
    const cleanPath = filePath.replace(/^[./\\]+/, "");
    const match = cleanPath.match(servicePathRegex);
    if (match) {
      const serviceName = match[1];
      const isMapped = Array.from(declaredCodeFiles).some((f) => f.includes(serviceName)) ||
        nodes.some((n) => n.id.toLowerCase().includes(serviceName.toLowerCase()) || n.label.toLowerCase().includes(serviceName.toLowerCase()));

      if (!isMapped) {
        const id = serviceName.charAt(0).toUpperCase() + serviceName.slice(1).replace(/[-_](\w)/g, (_, c) => c.toUpperCase()) + "Svc";
        orphanCodeServices.push({
          suggestedId: id,
          suggestedKind: "service",
          discoveredPath: cleanPath,
        });
      }
    }
  }

  const isSynchronized = brokenAnchors.length === 0;

  // Build Markdown Summary
  const lines: string[] = [
    `# 🛡️ Architecture Drift & Code Sync Report`,
    ``,
    `**Status**: ${isSynchronized ? "✅ SYNCHRONIZED" : "⚠️ DRIFT DETECTED"}`,
    `**Verified Anchors**: ${validAnchorCount} / ${totalAnchorsChecked}`,
    ``,
  ];

  if (brokenAnchors.length > 0) {
    lines.push(`### ⚠️ Broken Code Provenance Anchors (${brokenAnchors.length})`);
    for (const b of brokenAnchors) {
      lines.push(`- **${b.nodeId}** ("${b.nodeLabel}"): \`${b.declaredPath}\` (${b.reason})`);
    }
    lines.push(``);
  }

  if (orphanCodeServices.length > 0) {
    lines.push(`### 💡 Discovered Unmapped Code Services (${orphanCodeServices.length})`);
    for (const o of orphanCodeServices) {
      lines.push(`- \`${o.discoveredPath}\` → Suggest declaring: \`service ${o.suggestedId} "${o.suggestedId}" @src="${o.discoveredPath}"\``);
    }
    lines.push(``);
  }

  let healingMarkdySnippet: string | undefined;
  if (orphanCodeServices.length > 0) {
    const snippets = orphanCodeServices.map(
      (o) => `service ${o.suggestedId} "${o.suggestedId}" @src="${o.discoveredPath}#L1"`
    );
    healingMarkdySnippet = snippets.join("\n");
  }

  return {
    isSynchronized,
    totalAnchorsChecked,
    validAnchorCount,
    brokenAnchors,
    orphanCodeServices,
    summaryMarkdown: lines.join("\n"),
    healingMarkdySnippet,
  };
}

/**
 * Calculates Levenshtein distance between two strings for fuzzy path healing.
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export interface AutoHealResult {
  healedAst: DiagramAST;
  healedMarkdyScript: string;
  healedAnchorCount: number;
  addedServiceCount: number;
  healedMappings: Array<{ nodeId: string; oldPath: string; newPath: string }>;
}

/**
 * Automatically heals broken architecture anchors and incorporates orphan code services.
 */
export function autoHealArchitectureDrift(
  ast: DiagramAST,
  report: ArchitectureDriftReport,
  existingFiles: string[] = []
): AutoHealResult {
  const cleanExisting = existingFiles.map((f) => f.replace(/^[./\\]+/, ""));
  const clonedNodes: Record<string, NodeDecl> = JSON.parse(JSON.stringify(ast.nodes || {}));
  const healedMappings: Array<{ nodeId: string; oldPath: string; newPath: string }> = [];

  let healedAnchorCount = 0;

  // 1. Heal broken anchors using fuzzy path matching
  for (const broken of report.brokenAnchors) {
    const node = clonedNodes[broken.nodeId];
    if (!node) continue;

    const [cleanPath, lineSuffix] = broken.declaredPath.split("#");
    const oldPath = cleanPath.replace(/^[./\\]+/, "");
    const lineTag = lineSuffix ? `#${lineSuffix}` : "#L1";
    const baseName = oldPath.split("/").pop() || oldPath;

    // Find best candidate in existingFiles
    let bestMatch: string | null = null;
    let minDistance = Infinity;

    for (const cand of cleanExisting) {
      const candBase = cand.split("/").pop() || cand;
      const oldDir = oldPath.includes("/") ? oldPath.substring(0, oldPath.lastIndexOf("/")) : "";
      const candDir = cand.includes("/") ? cand.substring(0, cand.lastIndexOf("/")) : "";

      let dist = levenshteinDistance(oldPath.toLowerCase(), cand.toLowerCase());
      if (oldDir && oldDir === candDir) {
        dist = Math.min(dist, levenshteinDistance(baseName.toLowerCase(), candBase.toLowerCase()));
      }

      if (dist < minDistance && (dist <= 6 || (oldDir && oldDir === candDir))) {
        minDistance = dist;
        bestMatch = cand;
      }
    }

    if (bestMatch) {
      const newPath = `${bestMatch}${lineTag}`;
      node.props = node.props || {};
      node.props["@src"] = newPath;
      healedAnchorCount++;
      healedMappings.push({
        nodeId: broken.nodeId,
        oldPath: broken.declaredPath,
        newPath,
      });
    }
  }

  // 2. Incorporate unmapped orphan services
  let addedServiceCount = 0;
  for (const orphan of report.orphanCodeServices) {
    if (!clonedNodes[orphan.suggestedId]) {
      clonedNodes[orphan.suggestedId] = {
        id: orphan.suggestedId,
        label: orphan.suggestedId,
        kind: orphan.suggestedKind as any,
        line: 1,
        props: {
          "@src": `${orphan.discoveredPath}#L1`,
        },
      };
      addedServiceCount++;
    }
  }

  const healedAst: DiagramAST = {
    ...ast,
    nodes: clonedNodes,
  };

  // Re-generate MarkdyScript
  const lines: string[] = [];
  lines.push(`scene "${ast.meta?.title || "Architecture Diagram"}" theme=midnight`);
  lines.push(`layout LR`);
  lines.push(``);

  for (const node of Object.values(clonedNodes)) {
    const srcProp = node.props?.["@src"] ? ` @src="${node.props["@src"]}"` : "";
    const iconProp = node.props?.["icon"] ? ` icon=${node.props["icon"]}` : "";
    lines.push(`${node.kind || "service"} ${node.id} "${node.label || node.id}"${iconProp}${srcProp}`);
  }

  lines.push(``);
  lines.push(`beat initial_flow "1. System Flow & Connectivity":`);
  lines.push(`  show $nodes stagger=50ms`);

  if (ast.edges && ast.edges.length > 0) {
    for (const edge of ast.edges) {
      const label = edge.label ? ` "${edge.label}"` : "";
      const op = (edge as any).op || (edge.kind === "event" ? "~>" : edge.kind === "response" ? "<-" : "->");
      lines.push(`  ${edge.from} ${op} ${edge.to}${label}`);
    }
  }

  return {
    healedAst,
    healedMarkdyScript: lines.join("\n") + "\n",
    healedAnchorCount,
    addedServiceCount,
    healedMappings,
  };
}

