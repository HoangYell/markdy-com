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
            declaredPath: anchor.filePath,
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
