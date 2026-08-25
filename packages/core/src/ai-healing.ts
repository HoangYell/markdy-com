/**
 * packages/core/src/ai-healing.ts
 * Self-healing AI Prompt Generation & Diagnostic Repair Loop for Markdy.
 * Zero external dependencies.
 */

import {
  diagnoseMarkdyCode,
  type SyntaxDiagnosticReport,
  type DiagnosticIssue,
} from "./syntax-diagnostics.js";
import type { ArchitectureViolation } from "./arch-lint.js";

export interface RepairPromptBundle {
  isValid: boolean;
  repairPrompt?: string;
  syntaxErrors: string[];
  archViolations: ArchitectureViolation[];
  issues?: DiagnosticIssue[];
  repairedCode?: string;
  report?: SyntaxDiagnosticReport;
}

export function analyzeAndBuildRepairPrompt(sourceCode: string): RepairPromptBundle {
  const report = diagnoseMarkdyCode(sourceCode, { checkArchitecture: true });

  const syntaxErrors = report.issues
    .filter((i) => i.severity === "error")
    .map((i) => (i.line ? `Line ${i.line}: ${i.message}` : i.message));

  const archViolations: ArchitectureViolation[] = report.issues
    .filter((i) => i.code === "ARCH_RULE_VIOLATION")
    .map((i) => ({
      ruleId: i.code ?? "ARCH_RULE_VIOLATION",
      ruleName: i.ruleExplanation?.replace("Architecture Rule Preset: ", "") ?? "ArchitectureGovernance",
      severity: i.severity === "error" ? "error" : "warning",
      message: i.message,
      nodeIds: [],
      edgeKeys: [],
      line: i.line,
    }));

  return {
    isValid: report.isValid && report.warningCount === 0,
    repairPrompt: report.repairPrompt,
    syntaxErrors,
    archViolations,
    issues: report.issues,
    repairedCode: report.repairedCode,
    report,
  };
}
