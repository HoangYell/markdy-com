/**
 * packages/core/src/provenance.ts
 * Code Provenance and Git Verification Engine for Markdy.
 * Anchors architecture diagram components to physical source code references with deterministic proof.
 * Zero runtime dependencies (Node fs/path utilized conditionally in verification CLI).
 */

import type { DiagramAST } from "./ast.js";

export interface CodeProvenanceAnchor {
  raw: string;
  filePath: string;
  startLine?: number;
  endLine?: number;
  revision?: string;
  resolvedHref?: string;
}

export interface CodeProvenanceDiagnostic {
  nodeId: string;
  severity: "error" | "warning";
  code:
    | "provenance/path-invalid"
    | "provenance/path-escape"
    | "provenance/file-not-found"
    | "provenance/line-out-of-bounds"
    | "provenance/git-mismatch";
  message: string;
  filePath: string;
  line?: number;
  fixSuggestion?: string;
}

export interface CodeProvenanceVerificationReport {
  isValid: boolean;
  totalAnchors: number;
  verifiedCount: number;
  anchors: Map<string, CodeProvenanceAnchor>;
  diagnostics: CodeProvenanceDiagnostic[];
  summaryMarkdown: string;
}

const CONTROL_CHAR_RE = /[\u0000-\u001f\u007f]/;

/**
 * Parses a code anchor string (e.g. "src/auth/jwt.ts#L20-L85" or "prisma/schema.prisma#L110").
 */
export function parseCodeAnchor(raw: unknown, repositoryUrl?: string, revision?: string): CodeProvenanceAnchor | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const trimmed = raw.trim();

  // Handle GitHub blob URL input if provided
  const ghMatch = trimmed.match(/^(?:https:\/\/github\.com\/[^/]+\/[^/]+\/blob\/([^/]+)\/)([^#]+)(?:#L(\d+)(?:-L(\d+))?)?$/i);
  if (ghMatch) {
    const rev = ghMatch[1];
    const filePath = decodeURIComponent(ghMatch[2]);
    const startLine = ghMatch[3] ? parseInt(ghMatch[3], 10) : undefined;
    const endLine = ghMatch[4] ? parseInt(ghMatch[4], 10) : startLine;
    return {
      raw: trimmed,
      filePath,
      startLine,
      endLine,
      revision: rev,
      resolvedHref: trimmed,
    };
  }

  // Handle local POSIX repo path with fragment
  const [filePathRaw, fragment] = trimmed.split("#");
  const filePath = filePathRaw.trim();

  if (
    !filePath ||
    filePath.startsWith("/") ||
    filePath.startsWith(".") ||
    filePath.includes("..") ||
    filePath.includes("\\") ||
    CONTROL_CHAR_RE.test(filePath)
  ) {
    return null;
  }

  let startLine: number | undefined;
  let endLine: number | undefined;

  if (fragment) {
    const lineMatch = fragment.match(/^L?(\d+)(?:-L?(\d+))?$/i);
    if (lineMatch) {
      startLine = parseInt(lineMatch[1], 10);
      endLine = lineMatch[2] ? parseInt(lineMatch[2], 10) : startLine;
    }
  }

  let resolvedHref: string | undefined;
  if (repositoryUrl) {
    const base = repositoryUrl.replace(/\/$/, "");
    const rev = revision || "main";
    const lineFrag = startLine
      ? `#L${startLine}${endLine && endLine !== startLine ? `-L${endLine}` : ""}`
      : "";
    resolvedHref = `${base}/blob/${rev}/${filePath}${lineFrag}`;
  }

  return {
    raw: trimmed,
    filePath,
    startLine,
    endLine,
    revision,
    resolvedHref,
  };
}

/**
 * Extracts all code provenance anchors declared on nodes across a DiagramAST.
 */
export function extractDiagramCodeAnchors(
  ast: DiagramAST,
  repositoryUrl?: string,
  revision?: string
): Map<string, CodeProvenanceAnchor> {
  const anchors = new Map<string, CodeProvenanceAnchor>();

  for (const [nodeId, node] of Object.entries(ast.nodes || {})) {
    const rawAnchor =
      node.props["@src"] ||
      node.props["src"] ||
      node.props["@source"] ||
      node.props["source"] ||
      node.props["@code"] ||
      node.props["code"] ||
      node.props["@anchor"] ||
      node.props["anchor"];

    if (rawAnchor) {
      const parsed = parseCodeAnchor(rawAnchor, repositoryUrl, revision);
      if (parsed) {
        anchors.set(nodeId, parsed);
      }
    }
  }

  return anchors;
}

/**
 * Verifies code provenance anchors against a filesystem reader interface.
 */
export function verifyCodeAnchorsWithReader(
  anchors: Map<string, CodeProvenanceAnchor>,
  fileReader: {
    fileExists: (relPath: string) => boolean;
    getLineCount: (relPath: string) => number;
  }
): CodeProvenanceVerificationReport {
  const diagnostics: CodeProvenanceDiagnostic[] = [];
  let verifiedCount = 0;

  for (const [nodeId, anchor] of anchors.entries()) {
    const { filePath, startLine, endLine } = anchor;

    // 1. Path safety check
    const segments = filePath.split("/");
    if (segments.some((s) => !s || s === "." || s === "..") || segments[0] === ".git") {
      diagnostics.push({
        nodeId,
        severity: "error",
        code: "provenance/path-escape",
        message: `Code anchor for node "${nodeId}" must stay within repository and cannot address .git (${filePath}).`,
        filePath,
        fixSuggestion: "Remove relative path traversal dots or .git segments.",
      });
      continue;
    }

    // 2. Existence check
    if (!fileReader.fileExists(filePath)) {
      diagnostics.push({
        nodeId,
        severity: "error",
        code: "provenance/file-not-found",
        message: `Referenced file "${filePath}" does not exist in target repository.`,
        filePath,
        fixSuggestion: `Ensure "${filePath}" is committed and relative to repository root.`,
      });
      continue;
    }

    // 3. Line bounds check
    const lineCount = fileReader.getLineCount(filePath);
    if (startLine !== undefined && (startLine < 1 || startLine > lineCount)) {
      diagnostics.push({
        nodeId,
        severity: "warning",
        code: "provenance/line-out-of-bounds",
        message: `Line #${startLine} exceeds total line count (${lineCount}) of file "${filePath}".`,
        filePath,
        line: startLine,
        fixSuggestion: `Adjust line range to fall within 1..${lineCount}.`,
      });
      continue;
    }

    if (endLine !== undefined && (endLine < (startLine || 1) || endLine > lineCount)) {
      diagnostics.push({
        nodeId,
        severity: "warning",
        code: "provenance/line-out-of-bounds",
        message: `End line #${endLine} is out of bounds for "${filePath}" (total lines: ${lineCount}).`,
        filePath,
        line: endLine,
        fixSuggestion: `Ensure end line is >= start line and <= ${lineCount}.`,
      });
      continue;
    }

    verifiedCount++;
  }

  const isValid = diagnostics.filter((d) => d.severity === "error").length === 0;

  const summaryMarkdown = [
    `### 🛡️ Code Provenance Verification Report`,
    `- **Status**: ${isValid ? "✅ VERIFIED" : "❌ FAILED"}`,
    `- **Total Anchors**: ${anchors.size}`,
    `- **Verified In-Tree**: ${verifiedCount}`,
    `- **Diagnostics**: ${diagnostics.length} issue(s)`,
    ...(diagnostics.length > 0
      ? [
          "",
          `| Node | Severity | Issue | File / Location | Fix |`,
          `| :--- | :--- | :--- | :--- | :--- |`,
          ...diagnostics.map(
            (d) =>
              `| \`${d.nodeId}\` | **${d.severity.toUpperCase()}** | ${d.message} | \`${d.filePath}${d.line ? `:${d.line}` : ""}\` | ${d.fixSuggestion || "N/A"} |`
          ),
        ]
      : []),
  ].join("\n");

  return {
    isValid,
    totalAnchors: anchors.size,
    verifiedCount,
    anchors,
    diagnostics,
    summaryMarkdown,
  };
}
