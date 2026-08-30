/**
 * packages/core/src/syntax-diagnostics.ts
 * Deep Syntax Diagnostics, Fuzzy Typo Matching, Grammar Inspection & Auto-Healing for Markdy.
 * Zero external dependencies.
 */

import {
  NODE_KINDS,
  NODE_ALIASES,
  CUE_ALIASES,
  BEAT_CUE_KEYWORDS,
  DIAGRAM_TYPES,
  canonicalNodeKind,
} from "./registry.js";
import { THEMES } from "./themes.js";
import { parse } from "./parser.js";
import { validateArchitecture, type ArchitectureViolation } from "./arch-lint.js";

export interface DiagnosticIssue {
  line: number;
  column?: number;
  severity: "error" | "warning" | "info";
  code:
    | "TYPO_KEYWORD"
    | "TYPO_NODE_KIND"
    | "UNDEFINED_NODE_REFERENCE"
    | "UNQUOTED_STRING_LABEL"
    | "UNTERMINATED_STRING"
    | "MISSING_COLON"
    | "CUE_OUTSIDE_BEAT"
    | "INVALID_FLOW_OPERATOR"
    | "FLOW_CYCLE_RETURN_EDGE"
    | "UNKNOWN_THEME_OR_PROPERTY"
    | "FOREIGN_DIAGRAM_SYNTAX"
    | "SYNTAX_ERROR"
    | "ARCH_RULE_VIOLATION";
  message: string;
  snippet?: string;
  suggestion?: string;
  didYouMean?: string;
  ruleExplanation?: string;
  fix?: {
    original: string;
    replacement: string;
  };
}

export interface SyntaxDiagnosticReport {
  isValid: boolean;
  errorCount: number;
  warningCount: number;
  issues: DiagnosticIssue[];
  repairedCode?: string;
  repairPrompt: string;
  summary: string;
  declaredNodes: string[];
  referencedNodes: string[];
}

export interface AutoRepairResult {
  repairedCode: string;
  changes: string[];
  isFixed: boolean;
}

export interface DiagnosticOptions {
  checkArchitecture?: boolean;
  transpileMermaid?: (source: string) => string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fuzzy String Matching (Damerau-Levenshtein Distance)
// ─────────────────────────────────────────────────────────────────────────────

export function damerauLevenshteinDistance(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  const matrix: number[][] = [];
  for (let i = 0; i <= al; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= bl; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1;
      let min = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );

      // Transposition
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1].toLowerCase() === b[j - 2].toLowerCase() &&
        a[i - 2].toLowerCase() === b[j - 1].toLowerCase()
      ) {
        min = Math.min(min, matrix[i - 2][j - 2] + cost);
      }

      matrix[i][j] = min;
    }
  }

  return matrix[al][bl];
}

const COMMON_CONTRACTIONS: Record<string, string> = {
  svc: "service",
  srv: "service",
  gw: "gateway",
  db: "database",
  app: "application",
  msg: "message",
  repo: "repository",
  cfg: "config",
  auth: "authenticator",
  mgr: "manager",
  fn: "function",
};

export function splitIdentifierIntoTokens(s: string): string[] {
  return s
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function expandContractions(s: string): string {
  const norm = s.toLowerCase().trim();
  const tokens = splitIdentifierIntoTokens(s);
  if (tokens.length === 0) return norm;
  const expandedTokens = tokens.map((t) => COMMON_CONTRACTIONS[t] ?? t);
  let res = expandedTokens.join("");
  if (tokens.length === 1) {
    for (const [k, v] of Object.entries(COMMON_CONTRACTIONS)) {
      if (k.length >= 2 && norm.length > k.length + 2 && norm.endsWith(k)) {
        res = norm.slice(0, -k.length) + v;
        break;
      }
    }
  }
  return res;
}

export function findClosestMatch(
  word: string,
  candidates: Iterable<string>,
  maxDistance = 4
): { match: string; distance: number } | null {
  const normalized = word.toLowerCase().trim();
  if (!normalized || !/^[a-zA-Z_][\w.-]*$/.test(normalized)) return null;
  const expandedWord = expandContractions(normalized);

  let bestMatch: string | null = null;
  let bestDistance = Infinity;

  const wordConsonants = normalized.replace(/[aeiou_-]/g, "");

  for (const candidate of candidates) {
    const candNorm = candidate.toLowerCase().trim();
    const expandedCand = expandContractions(candNorm);

    if (candNorm === normalized || expandedCand === expandedWord) {
      return { match: candidate, distance: 0 };
    }

    // Prefix / Suffix / Abbreviation match
    if (candNorm.startsWith(normalized) || normalized.startsWith(candNorm) || expandedCand.startsWith(expandedWord) || expandedWord.startsWith(expandedCand)) {
      const dist = Math.abs(candNorm.length - normalized.length);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestMatch = candidate;
        continue;
      }
    }

    // Consonant skeleton match (e.g. ordrsvc vs orderservice)
    if (wordConsonants.length >= 3) {
      const candConsonants = candNorm.replace(/[aeiou_-]/g, "");
      if (candConsonants.startsWith(wordConsonants) || wordConsonants.startsWith(candConsonants)) {
        const dist = 1;
        if (dist < bestDistance) {
          bestDistance = dist;
          bestMatch = candidate;
          continue;
        }
      }
    }

    const dist = Math.min(
      damerauLevenshteinDistance(normalized, candNorm),
      damerauLevenshteinDistance(expandedWord, expandedCand)
    );
    const dynamicMax = Math.max(2, Math.min(maxDistance, Math.floor(Math.max(candidate.length, word.length) * 0.5)));

    if (dist <= dynamicMax && dist < bestDistance) {
      bestDistance = dist;
      bestMatch = candidate;
    }
  }

  return bestMatch ? { match: bestMatch, distance: bestDistance } : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Vocabulary & Keywords
// ─────────────────────────────────────────────────────────────────────────────

const TOP_LEVEL_KEYWORDS = [
  "scene",
  "layout",
  "player",
  "var",
  "group",
  "beat",
  "style",
  "pattern",
  "edge",
  "annotation",
  "use",
];

const CUE_KEYWORDS = [
  "show",
  "hide",
  "glow",
  "focus",
  "frame",
  "use",
  "pulse",
  "highlight",
  "emphasize",
];

const LAYOUT_DIRECTIONS = ["LR", "RL", "TB", "BT"];

const THEME_NAMES = Object.keys(THEMES);

const ALL_NODE_KINDS = Array.from(
  new Set([...Array.from(NODE_KINDS), ...Object.keys(NODE_ALIASES)])
);

const FOREIGN_SYNTAX_PATTERNS = [
  {
    type: "Mermaid",
    pattern: /^\s*(graph\s+(TB|TD|BT|RL|LR)|flowchart\s+(TB|TD|BT|RL|LR)|classDiagram|sequenceDiagram|erDiagram|stateDiagram|pie\s+title|gitGraph)/i,
    hint: "Mermaid syntax detected. Convert using 'transpile_to_markdy(source, format=\"mermaid\")'.",
  },
  {
    type: "PlantUML",
    pattern: /^\s*(@startuml|@startmindmap|@startgantt|@startwbs)/i,
    hint: "PlantUML syntax detected. Markdy uses declarative 'scene', node declarations, and 'beat' blocks.",
  },
  {
    type: "Graphviz DOT",
    pattern: /^\s*(digraph|strict\s+digraph|graph)\s+\w*\s*\{/i,
    hint: "Graphviz DOT syntax detected. Markdy uses 'scene', '<kind> <Id> [\"Label\"]', and 'beat' blocks.",
  },
  {
    type: "D2",
    pattern: /^\s*(direction\s*:|vars\s*:|classes\s*:)/i,
    hint: "D2 syntax detected. Markdy uses 'layout LR|TB' and 'beat <id>:' blocks.",
  },
];

const INVALID_FLOW_OP_MAP: Record<string, string> = {
  "-->": "->",
  "->>": "->",
  "==>": "->",
  "<--": "<-",
  "<<-": "<-",
  "<==": "<-",
  "~~>": "~>",
  "~>>": "~>",
  "---": "--",
  "--->": "->",
  "-.-": "--",
  "-..->": "~>",
  ">--": "->",
  ">-": "->",
};

// ─────────────────────────────────────────────────────────────────────────────
// Diagnostic Scanner
// ─────────────────────────────────────────────────────────────────────────────

export function diagnoseMarkdyCode(
  code: string,
  options: DiagnosticOptions = {}
): SyntaxDiagnosticReport {
  const issues: DiagnosticIssue[] = [];
  const lines = code.replace(/\r\n/g, "\n").split("\n");
  const declaredNodes = new Set<string>();
  const referencedNodes = new Set<string>();
  const checkArchitecture = options.checkArchitecture ?? true;

  // 1. Check for foreign syntax first
  for (const foreign of FOREIGN_SYNTAX_PATTERNS) {
    if (foreign.pattern.test(code)) {
      issues.push({
        line: 1,
        severity: "error",
        code: "FOREIGN_DIAGRAM_SYNTAX",
        message: `${foreign.type} syntax detected instead of MarkdyScript.`,
        snippet: lines.slice(0, 3).join("\n"),
        suggestion: foreign.hint,
        ruleExplanation:
          "MarkdyScript diagrams begin with 'scene [theme=paper layout=LR]', followed by node declarations ('<kind> <Id> [\"Label\"]') and dynamic 'beat' blocks.",
      });
      break;
    }
  }

  // 2. Pre-pass: collect all declared nodes
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("//") || line.startsWith("#")) continue;

    // Direct node declaration: <kind> <Id> ["Label"]
    const nodeMatch = line.match(/^(\w[\w.-]*)\s+(\w[\w.-]*)/);
    if (nodeMatch) {
      const head = nodeMatch[1].toLowerCase();
      const id = nodeMatch[2];
      if (
        !TOP_LEVEL_KEYWORDS.includes(head) &&
        !CUE_KEYWORDS.includes(head) &&
        !["show", "hide", "glow", "focus", "frame"].includes(head)
      ) {
        declaredNodes.add(id);
      }
    }
  }

  // 3. Line-by-line detailed syntax & grammar inspection
  let insideBeat = false;
  let insideGroup = false;
  let insidePattern = false;
  let beatIndent = 0;

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const lineNo = idx + 1;
    const trimmed = rawLine.trim();

    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#")) {
      continue;
    }

    const indent = rawLine.match(/^\s*/)?.[0].length ?? 0;

    // Track block exit via un-indent
    if (insideBeat && indent <= beatIndent && !trimmed.startsWith("&")) {
      insideBeat = false;
    }
    if (insideGroup && indent === 0) {
      insideGroup = false;
    }
    if (insidePattern && indent === 0) {
      insidePattern = false;
    }

    const tokens = trimmed.split(/\s+/);
    const firstWord = tokens[0];
    const firstWordLower = firstWord.toLowerCase();

    // ── Check A: Scene Directives & Typos ──────────────────────────────────
    if (firstWordLower.startsWith("scen") || firstWordLower === "secne" || firstWordLower === "scence") {
      if (firstWord !== "scene") {
        issues.push({
          line: lineNo,
          severity: "error",
          code: "TYPO_KEYWORD",
          message: `Unknown keyword '${firstWord}'. Did you mean 'scene'?`,
          snippet: trimmed,
          suggestion: `Replace '${firstWord}' with 'scene'.`,
          didYouMean: "scene",
          ruleExplanation: "Every Markdy diagram starts with a 'scene' directive: 'scene theme=paper width=1280 height=720'.",
          fix: { original: firstWord, replacement: "scene" },
        });
      }

      // Check scene theme property
      const themeMatch = trimmed.match(/\btheme=(\w+)/);
      if (themeMatch) {
        const themeVal = themeMatch[1].toLowerCase();
        if (!THEME_NAMES.includes(themeVal)) {
          const closeTheme = findClosestMatch(themeVal, THEME_NAMES);
          issues.push({
            line: lineNo,
            severity: "warning",
            code: "UNKNOWN_THEME_OR_PROPERTY",
            message: `Unknown theme '${themeMatch[1]}'. Available themes: ${THEME_NAMES.join(", ")}.`,
            snippet: trimmed,
            suggestion: closeTheme ? `Use theme '${closeTheme.match}'.` : `Choose from: ${THEME_NAMES.join(", ")}.`,
            didYouMean: closeTheme?.match,
            ruleExplanation: "Supported themes: paper, editorial, midnight, blueprint, graphite, nebula, sketchy, terminal, draft, doodle.",
            fix: closeTheme ? { original: themeMatch[0], replacement: `theme=${closeTheme.match}` } : undefined,
          });
        }
      }

      // Check scene layout property
      const layoutMatch = trimmed.match(/\blayout\s*=?\s*(\w+)/i);
      if (layoutMatch) {
        const layoutVal = layoutMatch[1].toUpperCase();
        if (!LAYOUT_DIRECTIONS.includes(layoutVal)) {
          issues.push({
            line: lineNo,
            severity: "warning",
            code: "UNKNOWN_THEME_OR_PROPERTY",
            message: `Invalid layout direction '${layoutMatch[1]}'. Must be one of: LR, RL, TB, BT.`,
            snippet: trimmed,
            suggestion: "Use layout LR (left-to-right) or TB (top-to-bottom).",
            didYouMean: "LR",
            ruleExplanation: "Layout directions must be LR (Left-to-Right), RL, TB (Top-to-Bottom), or BT.",
            fix: { original: layoutMatch[0], replacement: "layout LR" },
          });
        }
      }
      continue;
    }

    // ── Check B: Layout Directive Typos ────────────────────────────────────
    if (
      firstWordLower === "layput" ||
      firstWordLower === "layour" ||
      firstWordLower === "layuot" ||
      firstWordLower === "directon"
    ) {
      issues.push({
        line: lineNo,
        severity: "error",
        code: "TYPO_KEYWORD",
        message: `Typo in layout directive '${firstWord}'. Did you mean 'layout'?`,
        snippet: trimmed,
        suggestion: `Change '${firstWord}' to 'layout'.`,
        didYouMean: "layout",
        ruleExplanation: "Use 'layout LR' or 'layout TB' to define the diagram orientation.",
        fix: { original: firstWord, replacement: "layout" },
      });
      continue;
    }

    // ── Check C: Beat Declarations & Colons ─────────────────────────────────
    if (firstWordLower.startsWith("beat") || firstWordLower === "bea" || firstWordLower === "beats") {
      insideBeat = true;
      beatIndent = indent;

      if (firstWord !== "beat") {
        issues.push({
          line: lineNo,
          severity: "error",
          code: "TYPO_KEYWORD",
          message: `Unknown keyword '${firstWord}'. Did you mean 'beat'?`,
          snippet: trimmed,
          suggestion: `Replace '${firstWord}' with 'beat'.`,
          didYouMean: "beat",
          ruleExplanation: "Storyboard narrative steps start with 'beat <id> [\"Caption\"]:' followed by indented cues.",
          fix: { original: firstWord, replacement: "beat" },
        });
      }

      // Check for missing colon
      if (!trimmed.endsWith(":") && !trimmed.endsWith("{")) {
        issues.push({
          line: lineNo,
          severity: "error",
          code: "MISSING_COLON",
          message: `Missing colon ':' at the end of beat header.`,
          snippet: trimmed,
          suggestion: `Append ':' to the beat declaration: '${trimmed}:'`,
          ruleExplanation: "Every beat block must end with a colon ':', e.g. `beat checkout \"Process Payment\":`.",
          fix: { original: trimmed, replacement: `${trimmed}:` },
        });
      }
      continue;
    }

    // ── Check D: Group Declarations & Colons ────────────────────────────────
    if (firstWordLower === "group" || firstWordLower === "groop" || firstWordLower === "grp") {
      insideGroup = true;
      if (firstWord !== "group") {
        issues.push({
          line: lineNo,
          severity: "error",
          code: "TYPO_KEYWORD",
          message: `Typo in group keyword '${firstWord}'. Did you mean 'group'?`,
          snippet: trimmed,
          suggestion: `Change '${firstWord}' to 'group'.`,
          didYouMean: "group",
          fix: { original: firstWord, replacement: "group" },
        });
      }

      if (!trimmed.includes(":")) {
        issues.push({
          line: lineNo,
          severity: "error",
          code: "MISSING_COLON",
          message: `Missing colon ':' in group definition.`,
          snippet: trimmed,
          suggestion: `Add a colon before group members: e.g. 'group <id> "Label": Node1 Node2'`,
          ruleExplanation: "Groups require a colon: `group clients \"User Tier\": WebApp MobileApp`.",
        });
      } else {
        // Check inline group members
        const colonIdx = trimmed.indexOf(":");
        const membersRaw = trimmed.slice(colonIdx + 1).trim();
        if (membersRaw) {
          const members = membersRaw.split(/\s+/).filter((m) => m && !m.includes("=") && !m.startsWith("$") && /^[a-zA-Z_][\w.-]*$/.test(m));
          for (const mem of members) {
            referencedNodes.add(mem);
            if (declaredNodes.size > 0 && !declaredNodes.has(mem)) {
              const closest = findClosestMatch(mem, declaredNodes);
              issues.push({
                line: lineNo,
                severity: "warning",
                code: "UNDEFINED_NODE_REFERENCE",
                message: `Group references undefined node '${mem}'.${closest ? ` Did you mean '${closest.match}'?` : ""}`,
                snippet: trimmed,
                suggestion: closest
                  ? `Replace '${mem}' with declared node '${closest.match}'.`
                  : `Ensure node '${mem}' is declared before adding it to a group.`,
                didYouMean: closest?.match,
                fix: closest ? { original: mem, replacement: closest.match } : undefined,
              });
            }
          }
        }
      }
      continue;
    }

    // Check annotation declarations
    if (firstWordLower === "annotation") {
      const targetMatch = trimmed.match(/\btarget=([\w.-]+)/i);
      if (targetMatch) {
        const target = targetMatch[1];
        referencedNodes.add(target);
        if (declaredNodes.size > 0 && !declaredNodes.has(target)) {
          const closest = findClosestMatch(target, declaredNodes);
          issues.push({
            line: lineNo,
            severity: "warning",
            code: "UNDEFINED_NODE_REFERENCE",
            message: `Annotation targets undefined node '${target}'.${closest ? ` Did you mean '${closest.match}'?` : ""}`,
            snippet: trimmed,
            suggestion: closest ? `Replace target='${target}' with target='${closest.match}'.` : undefined,
            didYouMean: closest?.match,
            fix: closest ? { original: target, replacement: closest.match } : undefined,
          });
        }
      }
      continue;
    }

    // ── Check E: Top-Level Cue Outside Beat ─────────────────────────────────
    if (!insideBeat) {
      const isCueWord = CUE_KEYWORDS.includes(firstWordLower) || firstWordLower === "shwo" || firstWordLower === "fram" || firstWordLower === "focsu" || firstWordLower === "gloww";
      const isFlowLine = /(-->|->|<-|<--|~>|--)/.test(trimmed);

      if (isCueWord || isFlowLine) {
        issues.push({
          line: lineNo,
          severity: "error",
          code: "CUE_OUTSIDE_BEAT",
          message: `Action cue or flow line '${trimmed}' found at top-level outside a 'beat' block.`,
          snippet: trimmed,
          suggestion: `Wrap this line inside an indented beat block:\nbeat main "System Flow":\n  ${trimmed}`,
          ruleExplanation:
            "In MarkdyScript, top-level code is reserved for Directives, Nodes, and Groups. Animated flow transitions and visual cues (show, hide, glow, frame, focus) must reside inside a 'beat <name>:' block.",
        });
        continue;
      }
    }

    // ── Check F: Invalid Flow Operators in Flows ───────────────────────────
    for (const [invalidOp, validOp] of Object.entries(INVALID_FLOW_OP_MAP)) {
      if (trimmed.includes(invalidOp)) {
        issues.push({
          line: lineNo,
          severity: "error",
          code: "INVALID_FLOW_OPERATOR",
          message: `Invalid flow operator '${invalidOp}'. Did you mean '${validOp}'?`,
          snippet: trimmed,
          suggestion: `Replace '${invalidOp}' with '${validOp}'.`,
          didYouMean: validOp,
          ruleExplanation:
            "Markdy uses 4 clean flow operators: '->' (request/call), '<-' (response/return), '~>' (asynchronous/event), and '--' (static dependency).",
          fix: { original: invalidOp, replacement: validOp },
        });
      }
    }

    // ── Check G: Node Declarations, Kinds & Unquoted Strings ───────────────
    if (!insideBeat && !insideGroup && !insidePattern) {
      const match = trimmed.match(/^(\w[\w.-]*)\s+(\w[\w.-]*)(.*)$/);
      if (match) {
        const rawKind = match[1];
        const rawKindLower = rawKind.toLowerCase();
        const id = match[2];
        const rest = match[3].trim();

        if (!TOP_LEVEL_KEYWORDS.includes(rawKindLower)) {
          const canonical = canonicalNodeKind(rawKindLower);

          if (!NODE_KINDS.has(canonical)) {
            // Check if it's a typo of a known node kind
            const matchKind = findClosestMatch(rawKindLower, ALL_NODE_KINDS);
            const resolvedKind = matchKind ? canonicalNodeKind(matchKind.match) : undefined;
            issues.push({
              line: lineNo,
              severity: "error",
              code: "TYPO_NODE_KIND",
              message: `Unknown node kind '${rawKind}'.${resolvedKind ? ` Did you mean '${resolvedKind}'?` : ""}`,
              snippet: trimmed,
              suggestion: resolvedKind
                ? `Change '${rawKind}' to '${resolvedKind}': '${resolvedKind} ${id} ...'`
                : `Use a valid node kind: service, database, cache, gateway, browser, mobile, worker, cloud, queue, storage, cluster, etc.`,
              didYouMean: resolvedKind,
              ruleExplanation:
                "Markdy requires semantic node kinds (e.g. browser, gateway, service, database, cache, queue, worker, cloud, storage, pod, cluster).",
              fix: resolvedKind ? { original: rawKind, replacement: resolvedKind } : undefined,
            });
          }

          // Check for unquoted label with spaces (e.g. `service api My API Gateway`)
          if (rest && !rest.startsWith('"') && !rest.startsWith("style=") && !rest.startsWith("icon=")) {
            const hasMultipleWords = rest.split(/\s+/).length > 1;
            if (hasMultipleWords && !rest.includes("=")) {
              issues.push({
                line: lineNo,
                severity: "error",
                code: "UNQUOTED_STRING_LABEL",
                message: `Unquoted multi-word label '${rest}'. String labels with spaces must be enclosed in double quotes.`,
                snippet: trimmed,
                suggestion: `Wrap the label in quotes: '${rawKind} ${id} "${rest}"'`,
                ruleExplanation: "String labels containing spaces must be enclosed in double quotes `\"...\"`.",
                fix: { original: `${id} ${rest}`, replacement: `${id} "${rest}"` },
              });
            }
          }

          // Check for unterminated quotes
          const quoteCount = (rest.match(/"/g) || []).length;
          if (quoteCount % 2 !== 0) {
            issues.push({
              line: lineNo,
              severity: "error",
              code: "UNTERMINATED_STRING",
              message: `Unterminated string quote in node declaration.`,
              snippet: trimmed,
              suggestion: `Add closing quote: '${trimmed}"'`,
              fix: { original: trimmed, replacement: `${trimmed}"` },
            });
          }
        }
      }
    }

    // ── Check H: Undefined Node References inside Beats & Cues ──────────────
    if (insideBeat) {
      // Flow line analysis
      if (trimmed.includes("->") || trimmed.includes("<-") || trimmed.includes("~>") || trimmed.includes("--")) {
        // Extract flow node tokens
        const cleanFlow = trimmed.replace(/"[^"]*"/g, " ");
        const flowTokens = cleanFlow.split(/->|<-|~>|--|&|\s+/).filter(Boolean);

        for (const token of flowTokens) {
          if (
            token.includes("=") ||
            token.startsWith("$") ||
            !/^[a-zA-Z_][\w.-]*$/.test(token) ||
            ["and", "show", "hide", "glow", "focus", "frame", "pulse", "use"].includes(token.toLowerCase())
          ) {
            continue;
          }
          referencedNodes.add(token);

          if (declaredNodes.size > 0 && !declaredNodes.has(token)) {
            const closest = findClosestMatch(token, declaredNodes);
            issues.push({
              line: lineNo,
              severity: "error",
              code: "UNDEFINED_NODE_REFERENCE",
              message: `Flow references undefined node '${token}'.${closest ? ` Did you mean '${closest.match}'?` : ""}`,
              snippet: trimmed,
              suggestion: closest
                ? `Replace '${token}' with declared node '${closest.match}'.`
                : `Declare node '${token}' at top of diagram before referencing it.`,
              didYouMean: closest?.match,
              ruleExplanation:
                "All nodes used in flow transitions must be declared beforehand (e.g. `service ${token}`).",
              fix: closest ? { original: token, replacement: closest.match } : undefined,
            });
          }
        }
      }

      // Action cues (frame, glow, focus, show, hide)
      const cueMatch = trimmed.match(/^(show|hide|glow|focus|frame)\s+(.+)$/i);
      if (cueMatch) {
        const cueKind = cueMatch[1].toLowerCase();
        const targetsRaw = cueMatch[2].replace(/\b\w+=[^\s]+/g, "").trim();
        const targets = targetsRaw.split(/\s+/).filter((t) => t && !t.startsWith("$") && !t.startsWith('"') && /^[a-zA-Z_][\w.-]*$/.test(t));

        for (const target of targets) {
          referencedNodes.add(target);
          if (declaredNodes.size > 0 && !declaredNodes.has(target)) {
            const closest = findClosestMatch(target, declaredNodes);
            issues.push({
              line: lineNo,
              severity: "warning",
              code: "UNDEFINED_NODE_REFERENCE",
              message: `${cueKind} cue targets undefined node '${target}'.${closest ? ` Did you mean '${closest.match}'?` : ""}`,
              snippet: trimmed,
              suggestion: closest
                ? `Replace '${target}' with '${closest.match}'.`
                : `Ensure node '${target}' is declared before targeting it.`,
              didYouMean: closest?.match,
              fix: closest ? { original: target, replacement: closest.match } : undefined,
            });
          }
        }
      }
    }
  }

  // 4. Try standard parse and architecture validation for deeper diagnostics
  try {
    const ast = parse(code);
    if (checkArchitecture) {
      const archViolations = validateArchitecture(ast);
      for (const v of archViolations) {
        issues.push({
          line: v.line ?? 1,
          severity: v.severity === "error" ? "error" : "warning",
          code: "ARCH_RULE_VIOLATION",
          message: `[${v.ruleName}] ${v.message}`,
          suggestion: `Refactor architecture to comply with Well-Architected governance: ${v.ruleName}.`,
          ruleExplanation: `Architecture Rule Preset: ${v.ruleName}`,
        });
      }
    }

    // Include parser's own diagnostics if any
    for (const d of ast.diagnostics) {
      if (d.message.includes("flow cycle detected")) {
        issues.push({
          line: d.line,
          severity: "warning",
          code: "FLOW_CYCLE_RETURN_EDGE",
          message: d.message,
          suggestion: "Use '<-' for return/response edges instead of '->' or '~>'.",
          ruleExplanation:
            "Cycle Safety: Always use '<-' when returning calls to callers to prevent cyclical layout rank collisions.",
        });
      } else {
        const isDuplicate = issues.some((iss) => iss.line === d.line && iss.message === d.message);
        if (!isDuplicate) {
          issues.push({
            line: d.line,
            severity: d.severity === "error" ? "error" : "warning",
            code: "SYNTAX_ERROR",
            message: d.message,
          });
        }
      }
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const lineMatch = errMsg.match(/line\s+(\d+):\s*(.*)/);
    const errLine = lineMatch ? Number(lineMatch[1]) : 1;
    const cleanMsg = lineMatch ? lineMatch[2] : errMsg;

    const alreadyCaptured = issues.some((iss) => iss.line === errLine && iss.severity === "error");
    if (!alreadyCaptured) {
      issues.push({
        line: errLine,
        severity: "error",
        code: "SYNTAX_ERROR",
        message: cleanMsg,
        snippet: lines[errLine - 1] ?? "",
        suggestion: "Review Markdy 4-step structure: Directives -> Semantic Nodes -> Groups -> Beats.",
      });
    }
  }

  // 5. Generate Auto-Repaired Code
  const autoRepair = repairMarkdyCode(code, {
    transpileMermaid: options.transpileMermaid,
    precomputedIssues: issues,
  });

  // 6. Build AI Healing Prompt with context
  const repairPrompt = buildAIHealingPrompt(code, issues, autoRepair.repairedCode);

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const isValid = errorCount === 0;

  const summary = isValid
    ? `✅ Markdy code is valid with ${warningCount} warning(s).`
    : `❌ Markdy code has ${errorCount} syntax error(s) and ${warningCount} warning(s).`;

  return {
    isValid,
    errorCount,
    warningCount,
    issues,
    repairedCode: autoRepair.repairedCode !== code ? autoRepair.repairedCode : undefined,
    repairPrompt,
    summary,
    declaredNodes: Array.from(declaredNodes),
    referencedNodes: Array.from(referencedNodes),
  };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic Auto-Repair
// ─────────────────────────────────────────────────────────────────────────────

export function repairMarkdyCode(
  code: string,
  options?: {
    transpileMermaid?: (source: string) => string;
    precomputedIssues?: DiagnosticIssue[];
  }
): AutoRepairResult {
  const changes: string[] = [];

  // Check if code is Mermaid and optional transpiler is provided
  if (options?.transpileMermaid && /^\s*(graph\s+(TB|TD|BT|RL|LR)|flowchart\s+(TB|TD|BT|RL|LR))/i.test(code)) {
    try {
      const transpiledCode = options.transpileMermaid(code);
      changes.push("Transpiled Mermaid flowchart to canonical MarkdyScript.");
      return {
        repairedCode: transpiledCode,
        changes,
        isFixed: true,
      };
    } catch {
      // Fall through to standard repairs if transpiler fails
    }
  }

  const lines = code.replace(/\r\n/g, "\n").split("\n");
  const repairedLines: string[] = [];
  const declaredNodes = new Set<string>();

  // Pre-scan declared nodes
  for (const line of lines) {
    const trimmed = line.trim();
    const nodeMatch = trimmed.match(/^(\w[\w.-]*)\s+(\w[\w.-]*)/);
    if (nodeMatch && !TOP_LEVEL_KEYWORDS.includes(nodeMatch[1].toLowerCase())) {
      declaredNodes.add(nodeMatch[2]);
    }
  }

  let inBeat = false;
  let beatIndent = 0;
  let hasBareCues = false;
  const bareCuesBuffer: string[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    let line = lines[idx];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#")) {
      repairedLines.push(line);
      continue;
    }

    const indent = line.match(/^\s*/)?.[0] ?? "";
    const indentLen = indent.length;
    let processed = trimmed;

    // Track un-indent to exit beat block
    if (inBeat && indentLen <= beatIndent && !trimmed.startsWith("&") && !trimmed.startsWith("beat ") && !trimmed.startsWith("bea ")) {
      inBeat = false;
    }

    // 1. Fix keyword typos
    processed = processed.replace(/^scen\b|^secne\b|^scence\b/i, "scene");
    processed = processed.replace(/^layput\b|^layour\b|^layuot\b/i, "layout");
    processed = processed.replace(/^groop\b|^grp\b/i, "group");
    processed = processed.replace(/^bea\b|^beats\b/i, "beat");
    processed = processed.replace(/^patern\b/i, "pattern");

    // 2. Fix invalid flow operators
    for (const [inv, valid] of Object.entries(INVALID_FLOW_OP_MAP)) {
      if (processed.includes(inv)) {
        processed = processed.replaceAll(inv, valid);
        changes.push(`Line ${idx + 1}: Fixed invalid flow operator '${inv}' -> '${valid}'.`);
      }
    }

    // 3. Fix beat headers missing colons
    if (/^beat\s+/i.test(processed)) {
      inBeat = true;
      beatIndent = indentLen;
      if (/^beat\s+[\w.-]+(\s+"[^"]*")?\s*$/i.test(processed)) {
        processed = `${processed}:`;
        changes.push(`Line ${idx + 1}: Added missing colon ':' to beat header.`);
      }
    }

    // 4. Fix group headers missing colons or unquoted labels
    if (/^group\s+/i.test(processed)) {
      if (!processed.includes(":")) {
        const groupMatch = processed.match(/^group\s+([\w.-]+)(?:\s+"([^"]*)")?\s+(.+)$/i);
        if (groupMatch) {
          const gid = groupMatch[1];
          const label = groupMatch[2] ? ` "${groupMatch[2]}"` : "";
          const rest = groupMatch[3];
          processed = `group ${gid}${label}: ${rest}`;
          changes.push(`Line ${idx + 1}: Added missing colon ':' to group header.`);
        }
      }
    }

    // 5. Fix node declarations: typos in kind & unquoted labels
    if (!inBeat && !processed.startsWith("scene") && !processed.startsWith("layout") && !processed.startsWith("group")) {
      const match = processed.match(/^(\w[\w.-]*)\s+(\w[\w.-]*)(.*)$/);
      if (match) {
        const rawKind = match[1];
        const rawKindLower = rawKind.toLowerCase();
        const id = match[2];
        let rest = match[3].trim();

        // Fix kind typo
        const canonical = canonicalNodeKind(rawKindLower);
        if (!NODE_KINDS.has(canonical)) {
          const matchKind = findClosestMatch(rawKindLower, ALL_NODE_KINDS);
          if (matchKind) {
            const canonicalFix = canonicalNodeKind(matchKind.match);
            changes.push(`Line ${idx + 1}: Repaired node kind '${rawKind}' -> '${canonicalFix}'.`);
            processed = `${canonicalFix} ${id}${rest ? ` ${rest}` : ""}`;
          }
        }

        // Fix unquoted multi-word labels
        if (rest && !rest.startsWith('"') && !rest.startsWith("style=") && !rest.startsWith("icon=") && rest.split(/\s+/).length > 1 && !rest.includes("=")) {
          changes.push(`Line ${idx + 1}: Enclosed multi-word label in quotes: "${rest}".`);
          processed = `${canonicalNodeKind(rawKindLower)} ${id} "${rest}"`;
        }
      }
    }

    // 6. Fix undefined node typos in beats and groups
    if ((inBeat || processed.startsWith("group ")) && declaredNodes.size > 0) {
      if (processed.includes("->") || processed.includes("<-") || processed.includes("~>") || processed.includes("--") || processed.startsWith("group ")) {
        const cleanFlow = processed.replace(/"[^"]*"/g, '""');
        const flowTokens = cleanFlow.split(/->|<-|~>|--|&|:|\s+/).filter(Boolean);
        for (const tok of flowTokens) {
          if (
            !tok.startsWith("$") &&
            !tok.includes("=") &&
            /^[a-zA-Z_][\w.-]*$/.test(tok) &&
            tok !== '""' &&
            tok !== "group" &&
            !["and", "show", "hide", "glow", "focus", "frame", "pulse", "use"].includes(tok.toLowerCase()) &&
            !declaredNodes.has(tok)
          ) {
            const match = findClosestMatch(tok, declaredNodes);
            if (match) {
              const regex = new RegExp(`\\b${escapeRegex(tok)}\\b`, "g");
              processed = processed.replace(regex, match.match);
              changes.push(`Line ${idx + 1}: Corrected typo in node reference '${tok}' -> '${match.match}'.`);
            }
          }
        }
      }
    }

    // 7. Fix bare top-level cues by collecting them to wrap into a beat
    if (!inBeat) {
      const isCue = CUE_KEYWORDS.includes(processed.split(/\s+/)[0].toLowerCase());
      const isFlow = /(-->|->|<-|<--|~>|--)/.test(processed);
      if (isCue || isFlow) {
        hasBareCues = true;
        bareCuesBuffer.push(`  ${processed}`);
        changes.push(`Line ${idx + 1}: Wrapped bare cue '${processed}' into 'beat main'.`);
        continue;
      }
    }

    repairedLines.push(`${indent}${processed}`);
  }

  // If there were bare top-level cues and no beat block was opened, append a beat
  if (hasBareCues && !lines.some((l) => l.trim().startsWith("beat "))) {
    repairedLines.push("\nbeat main \"Flow\":");
    repairedLines.push(...bareCuesBuffer);
  }

  const repairedCode = repairedLines.join("\n");

  let isFixed = false;
  try {
    parse(repairedCode);
    isFixed = true;
  } catch {
    isFixed = false;
  }

  return {
    repairedCode,
    changes,
    isFixed,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Healing Prompt Builder
// ─────────────────────────────────────────────────────────────────────────────

function buildAIHealingPrompt(
  sourceCode: string,
  issues: DiagnosticIssue[],
  suggestedRepair?: string
): string {
  if (issues.length === 0) {
    return "The MarkdyScript diagram is completely valid. No healing required.";
  }

  const errorIssues = issues.filter((i) => i.severity === "error" && i.code !== "ARCH_RULE_VIOLATION");
  const warningIssues = issues.filter((i) => i.severity === "warning" && i.code !== "ARCH_RULE_VIOLATION");
  const archIssues = issues.filter((i) => i.code === "ARCH_RULE_VIOLATION");

  const promptSections: string[] = [
    "### Markdy Diagram Syntax & Architectural Diagnostics",
    "",
  ];

  if (errorIssues.length > 0) {
    promptSections.push("The following MarkdyScript failed to parse with syntax errors:");
    promptSections.push("");
    promptSections.push("### Diagnostics & Critical Errors:");
    for (const err of errorIssues) {
      const lineStr = err.line ? `  - Line ${err.line}: ` : "  - ";
      promptSections.push(`${lineStr}${err.message}`);
      if (err.snippet) {
        promptSections.push(`    *Problem:* \`${err.snippet}\``);
      }
      if (err.suggestion) {
        promptSections.push(`    *Recommendation:* ${err.suggestion}`);
      }
      if (err.didYouMean) {
        promptSections.push(`    *Did you mean:* \`${err.didYouMean}\`?`);
      }
    }
    promptSections.push("");
  }

  if (archIssues.length > 0) {
    promptSections.push("### Architectural Violations:");
    for (const v of archIssues) {
      const lineStr = v.line ? ` (line ${v.line})` : "";
      promptSections.push(`  - [${v.severity.toUpperCase()}] ${v.message}${lineStr}`);
      if (v.suggestion) {
        promptSections.push(`    *Recommendation:* ${v.suggestion}`);
      }
    }
    promptSections.push("");
  } else if (warningIssues.length > 0) {
    promptSections.push("### Diagnostics & Warnings:");
    for (const w of warningIssues) {
      const lineStr = w.line ? `  - Line ${w.line}: ` : "  - ";
      promptSections.push(`${lineStr}${w.message}`);
      if (w.suggestion) {
        promptSections.push(`    *Recommendation:* ${w.suggestion}`);
      }
    }
    promptSections.push("");
  }

  promptSections.push("### Canonical Markdy Mental Model Guidelines:");
  promptSections.push("1. **Directives**: `scene theme=paper width=1280 height=720` and `layout LR` (or TB).");
  promptSections.push("2. **Nodes**: `<kind> <Id> [\"Human Label\"]` (e.g. `service Orders \"Order Service\"`, `database DB \"PostgreSQL\"`). Labels with spaces MUST be in double quotes.");
  promptSections.push("3. **Groups**: `group <id> \"<Label>\": Node1 Node2`");
  promptSections.push("4. **Beats**: `beat <id> \"<Caption>\":` with indented flows and cues.");
  promptSections.push("5. **Cycle Safety**: Always use `<-` for response/return edges to prevent layout rank cycles. Never use `->` to return to a previous node.");
  promptSections.push("");

  if (suggestedRepair && suggestedRepair !== sourceCode) {
    promptSections.push("### Proposed Repaired MarkdyScript:");
    promptSections.push("```markdy");
    promptSections.push(suggestedRepair);
    promptSections.push("```");
    promptSections.push("");
  }

  promptSections.push("Please revise the diagram code to resolve all issues while preserving semantic nodes and beats:");
  promptSections.push("```markdy");
  promptSections.push(sourceCode);
  promptSections.push("```");

  return promptSections.join("\n");
}
