/**
 * packages/mcp-server/src/tools.ts
 * MCP Tool definitions and execution handlers for Markdy.
 */

import {
  parse,
  validateArchitecture,
  analyzeAndBuildRepairPrompt,
  diffDiagramASTs,
  ARCH_RULE_PRESETS,
  type DiagramAST,
} from "@markdy/core";
import {
  transpileMermaidToMarkdy,
  transpileDockerComposeToMarkdy,
  transpileKubernetesManifestsToMarkdy,
  transpileTerraformStateToMarkdy,
} from "@markdy/compat";

export interface ToolResult {
  [x: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export function handleValidateMarkdy(code: string, checkArchitecture = true): ToolResult {
  try {
    const ast = parse(code);
    const diagnostics = ast.diagnostics ?? [];
    const archViolations = checkArchitecture ? validateArchitecture(ast) : [];

    const lines: string[] = [];
    lines.push(`✅ Markdy Syntax Valid: ${Object.keys(ast.nodes).length} nodes, ${ast.edges.length} static edges, ${ast.beats.length} beats.`);

    if (diagnostics.length > 0) {
      lines.push("\n⚠️ Diagnostics & Suggestions:");
      for (const d of diagnostics) {
        lines.push(`- line ${d.line}: [${d.severity}] ${d.message}`);
      }
    }

    if (archViolations.length > 0) {
      lines.push("\n🛡️ Architecture Rule Violations:");
      for (const v of archViolations) {
        lines.push(`- [${v.severity.toUpperCase()}] ${v.ruleName} (line ${v.line ?? 1}): ${v.message}`);
      }
    }

    return {
      content: [{ type: "text", text: lines.join("\n") }],
    };
  } catch (error) {
    const repairPrompt = analyzeAndBuildRepairPrompt(code);
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `❌ Parse Error: ${(error as Error).message}\n\nSuggested AI Healing Prompt:\n${repairPrompt}`,
        },
      ],
    };
  }
}

export function handleTranspileToMarkdy(
  source: string,
  format: "mermaid" | "docker-compose" | "k8s" | "terraform",
  title = "Imported Scene"
): ToolResult {
  try {
    let markdyCode = "";

    switch (format) {
      case "mermaid":
        markdyCode = transpileMermaidToMarkdy(source, title).code;
        break;
      case "docker-compose":
        markdyCode = transpileDockerComposeToMarkdy(source, title);
        break;
      case "k8s":
        markdyCode = transpileKubernetesManifestsToMarkdy(source, title);
        break;
      case "terraform":
        markdyCode = transpileTerraformStateToMarkdy(source, title);
        break;
      default:
        throw new Error(`Unsupported ingestion format: ${format}`);
    }

    // Verify transpiled output passes parser
    parse(markdyCode);

    return {
      content: [
        {
          type: "text",
          text: markdyCode,
        },
      ],
    };
  } catch (error) {
    return {
      isError: true,
      content: [{ type: "text", text: `Transpilation failed: ${(error as Error).message}` }],
    };
  }
}

export function handleExplainArchitecture(code: string): ToolResult {
  try {
    const ast = parse(code);
    const nodeCount = Object.keys(ast.nodes).length;
    const edgeCount = ast.edges.length;
    const groupCount = Object.keys(ast.groups).length;
    const beatsCount = ast.beats.length;

    const rolesSummary = new Map<string, number>();
    for (const n of Object.values(ast.nodes)) {
      rolesSummary.set(n.kind, (rolesSummary.get(n.kind) ?? 0) + 1);
    }

    const roleBreakdown = Array.from(rolesSummary.entries())
      .map(([k, count]) => `  - ${k}: ${count}`)
      .join("\n");

    const violations = validateArchitecture(ast);

    const explanation = [
      `### Architecture Overview: ${ast.meta.title || "Untitled Diagram"}`,
      `- **Layout:** ${ast.meta.direction || "LR"}`,
      `- **Theme:** ${ast.meta.theme || "paper"}`,
      `- **Components:** ${nodeCount} nodes across ${groupCount} groups`,
      `- **Interactions:** ${edgeCount} static connections, ${beatsCount} dynamic beats`,
      "",
      `#### Component Kinds:`,
      roleBreakdown,
      "",
      `#### Governance & Well-Architected Health:`,
      violations.length === 0
        ? "✅ No architectural violations detected across Well-Architected rule presets."
        : `⚠️ Detected ${violations.length} governance issue(s):\n` +
          violations.map((v) => `- [${v.ruleName}] ${v.message}`).join("\n"),
    ].join("\n");

    return {
      content: [{ type: "text", text: explanation }],
    };
  } catch (error) {
    return {
      isError: true,
      content: [{ type: "text", text: `Explain failed: ${(error as Error).message}` }],
    };
  }
}

export function handleGenerateMarkdyPrompt(userGoal: string): ToolResult {
  const prompt = [
    `You are an expert system architecture designer specializing in MarkdyScript DSL.`,
    `Goal: ${userGoal}`,
    ``,
    `### Instructions:`,
    `1. Use MarkdyScript 0.8+ syntax. Start with: \`scene "<Title>" theme=paper layout=LR\``,
    `2. Define nodes using semantic types (e.g. \`browser client\`, \`gateway api_gw\`, \`service auth_svc\`, \`database pg_db\`, \`cache redis\`, \`queue kafka\`).`,
    `3. Organize components in \`group <id> "<Label>": <members...>\` boundaries.`,
    `4. Define animated traffic steps in \`beat <id> "<Description>":\``,
    `5. Animate flows with \`show $nodes\`, \`client -> api_gw "request"\`, and \`api_gw -> auth_svc "verify"\`.`,
    `6. Keep syntax clean and output ONLY valid MarkdyScript.`,
  ].join("\n");

  return {
    content: [{ type: "text", text: prompt }],
  };
}
