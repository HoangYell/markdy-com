/**
 * packages/core/src/ai-healing.ts
 * Self-healing AI Prompt Generation & Diagnostic Repair Loop for Markdy.
 * Zero external dependencies.
 */

import { parse } from "./parser.js";
import { validateArchitecture, type ArchitectureViolation } from "./arch-lint.js";

export interface RepairPromptBundle {
  isValid: boolean;
  repairPrompt?: string;
  syntaxErrors: string[];
  archViolations: ArchitectureViolation[];
}

export function analyzeAndBuildRepairPrompt(sourceCode: string): RepairPromptBundle {
  const syntaxErrors: string[] = [];
  let ast = null;

  try {
    ast = parse(sourceCode);
  } catch (err) {
    syntaxErrors.push(err instanceof Error ? err.message : String(err));
  }

  if (!ast) {
    return {
      isValid: false,
      syntaxErrors,
      archViolations: [],
      repairPrompt: [
        "The following MarkdyScript failed to parse with syntax errors:",
        ...syntaxErrors.map((e) => `  - ${e}`),
        "",
        "Please fix the code below to follow valid MarkdyScript syntax:",
        "```markdy",
        sourceCode,
        "```",
      ].join("\n"),
    };
  }

  const archViolations = validateArchitecture(ast);

  if (ast.diagnostics.length === 0 && archViolations.length === 0) {
    return { isValid: true, syntaxErrors: [], archViolations: [] };
  }

  const promptSections = [
    "The MarkdyScript diagram has the following compiler diagnostics and architectural rule violations:",
    "",
    "### Diagnostics:",
    ...ast.diagnostics.map((d) => `  - Line ${d.line}: ${d.message}`),
    "",
    "### Architectural Violations:",
    ...archViolations.map((v) => `  - [${v.severity.toUpperCase()}] ${v.ruleName}: ${v.message}`),
    "",
    "Please revise the diagram code to resolve all issues while preserving semantic nodes and beats:",
    "```markdy",
    sourceCode,
    "```",
  ];

  return {
    isValid: false,
    syntaxErrors: [],
    archViolations,
    repairPrompt: promptSections.join("\n"),
  };
}
