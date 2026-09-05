/**
 * Diagram-native MarkdyScript parser and compiler.
 */
import type {
  AnnotationDecl,
  BeatDecl,
  Cue,
  DiagramAST,
  Diagnostic,
  EdgeDecl,
  FlowSegment,
  GroupDecl,
  LayoutDirection,
  NodeDecl,
  PatternDecl,
  RenderPlan,
  SceneMeta,
  StyleDecl,
} from "./ast.js";
import {
  BEAT_CUE_KEYWORDS,
  canonicalNodeKind,
  CUE_ALIASES,
  DIAGRAM_TYPES,
  EDGE_OPERATORS,
  humanizeId,
  NODE_KINDS,
  RESERVED_SELECTORS,
  SCENE_KEYS,
} from "./registry.js";
import {
  applyPlayerSetting,
  isKnownPlayerSetting,
  parseBooleanToken,
  PLAYER_FLAT_KEYS,
  type PlayerScope,
} from "./player.js";
import { compilePlan } from "./compiler.js";
import { resolveTheme } from "./themes.js";

export class ParseError extends Error {
  readonly line: number;
  readonly column?: number;

  constructor(message: string, line: number, column?: number) {
    super(`line ${line}: ${message}`);
    this.name = "ParseError";
    this.line = line;
    this.column = column;
  }
}

export type ParseResult = {
  ast: DiagramAST;
  plan: RenderPlan;
};

export type ParseOptions = {
  /** When true, only parse without compiling layout/schedule. */
  parseOnly?: boolean;
};

const FLOW_OP_RE = /(->|<-|~>|--|\.\.>|<->)/;

function stripComment(line: string): string {
  let inString = false;
  let escaped = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (inString && ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "/" && line[i + 1] === "/") return line.slice(0, i);
    // `#` starts a comment only in the conventional `# text` form (space/EOL
    // after it), so bare hex colors like `= #3b82f6` are never eaten.
    if (
      ch === "#" &&
      (i === 0 || /\s/.test(line[i - 1])) &&
      (i + 1 >= line.length || /\s/.test(line[i + 1]))
    ) {
      return line.slice(0, i);
    }
  }
  return line;
}

function parsePropValue(raw: string): unknown {
  let val: unknown = raw;
  if (raw.startsWith('"')) {
    const parsed = parseStringToken(raw);
    if (parsed && parsed.rest === "") val = parsed.value;
  }
  if (typeof val === "string") {
    if (/^\d+(\.\d+)?$/.test(val)) val = Number(val);
    else if (val === "true") val = true;
    else if (val === "false") val = false;
    else if (/^\d+ms$/.test(val)) val = Number(val.slice(0, -2)) / 1000;
    else if (/^\d+(\.\d+)?s$/.test(val)) val = Number(val.slice(0, -1));
  }
  return val;
}

function parseProps(raw: string): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  let i = 0;
  while (i < raw.length) {
    const ch = raw[i];
    if (ch === '"') {
      const parsed = parseStringToken(raw.slice(i));
      if (!parsed) break;
      i = raw.length - parsed.rest.length;
      continue;
    }
    const keyMatch = raw.slice(i).match(/^(@?[\w.-]+)=/);
    if (!keyMatch) {
      i++;
      continue;
    }
    const key = keyMatch[1];
    i += key.length + 1;
    let value = "";
    if (raw[i] === '"') {
      const start = i;
      const parsed = parseStringToken(raw.slice(i));
      if (!parsed) {
        value = raw.slice(i);
        i = raw.length;
      } else {
        i = raw.length - parsed.rest.length;
        value = raw.slice(start, i).trim();
      }
    } else {
      const start = i;
      while (i < raw.length && !/\s/.test(raw[i])) i++;
      value = raw.slice(start, i);
    }
    props[key] = parsePropValue(value);
  }
  return props;
}

function parseStringToken(raw: string): { value: string; rest: string } | null {
  const trimmed = raw.trimStart();
  if (!trimmed.startsWith('"')) return null;
  let i = 1;
  let value = "";
  while (i < trimmed.length) {
    const ch = trimmed[i];
    if (ch === '"') return { value, rest: trimmed.slice(i + 1).trim() };
    if (ch === "\\" && i + 1 < trimmed.length) {
      value += trimmed[i + 1];
      i += 2;
      continue;
    }
    value += ch;
    i++;
  }
  return null;
}

function splitTargets(raw: string): string[] {
  const tokens = raw.match(/"(?:[^"\\]|\\.)*"|[^\s,]+/g) ?? [];
  return tokens
    .map((token) => token.trim())
    .filter((token) => token.length > 0 && !token.startsWith('"'));
}

function splitOutsideQuotes(raw: string, separator: "&"): string[] {
  const parts: string[] = [];
  let start = 0;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (inString && ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString && ch === separator && /\s/.test(raw[i - 1] ?? "") && /\s/.test(raw[i + 1] ?? "")) {
      parts.push(raw.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(raw.slice(start).trim());
  return parts.filter(Boolean);
}

function stripCueProps(raw: string, keys: string[]): string {
  let inString = false;
  let escaped = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (inString && ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString || !/\s/.test(ch)) continue;
    const rest = raw.slice(i + 1);
    if (keys.some((key) => rest.startsWith(`${key}=`))) return raw.slice(0, i).trim();
  }
  return raw.trim();
}

function tokenizeFlowChain(line: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inString) {
      current += ch;
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      current += ch;
      continue;
    }
    const op3 = line.slice(i, i + 3);
    if (op3 === "..>" || op3 === "<->") {
      if (current.trim()) parts.push(current.trim());
      parts.push(op3);
      current = "";
      i += 2;
      continue;
    }
    const op = line.slice(i, i + 2);
    if (op === "->" || op === "<-" || op === "~>" || op === "--") {
      if (current.trim()) parts.push(current.trim());
      parts.push(op);
      current = "";
      i += 1;
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

function parseFlowChain(line: string, lineNo: number): FlowSegment[] {
  const segments: FlowSegment[] = [];
  const parts = tokenizeFlowChain(line);
  if (parts.length < 3) {
    throw new ParseError(`expected flow chain like A -> B "label"`, lineNo);
  }

  let i = 0;
  let from = splitTargetLabel(parts[i++], lineNo).node;
  while (i < parts.length) {
    const opToken = parts[i++];
    if (i >= parts.length) throw new ParseError(`expected target after '${opToken}'`, lineNo);

    const { node: to, label } = splitTargetLabel(parts[i++], lineNo);
    if (!to) throw new ParseError(`expected target node after '${opToken}'`, lineNo);

    if (opToken === "<->") {
      segments.push({
        from,
        op: "request",
        to,
        label,
      });
      segments.push({
        from: to,
        op: "response",
        to: from,
        label,
      });
      from = to;
      continue;
    }

    const op = EDGE_OPERATORS[opToken];
    if (!op) throw new ParseError(`unknown flow operator '${opToken}'`, lineNo);

    segments.push({
      from: op === "response" ? to : from,
      op,
      to: op === "response" ? from : to,
      label,
    });
    from = op === "response" ? from : to;
  }
  return segments;
}

/**
 * Splits a flow target token into its node id and an optional trailing
 * quoted label, e.g. `Gateway "POST /shorten"` → `{ node, label }`.
 */
function splitTargetLabel(token: string, lineNo: number): { node: string; label?: string } {
  const quoteIdx = token.indexOf('"');
  if (quoteIdx < 0) return { node: token.trim() };
  const parsed = parseStringToken(token.slice(quoteIdx));
  if (!parsed) throw new ParseError("unterminated string in flow label", lineNo);
  const before = token.slice(0, quoteIdx).trim();
  const node = before || parsed.rest.trim();
  return { node, label: parsed.value };
}

function parseCueLine(line: string, lineNo: number): Cue {
  const trimmed = line.trim();
  const props = parseProps(trimmed);

  if (/^@\+?\d/.test(trimmed) || /^\w[\w.-]*\.\w+\(/.test(trimmed) || /^camera\./.test(trimmed)) {
    throw new ParseError(
      "unsupported timeline command; use beat cues like show, frame, focus, glow, and flow lines",
      lineNo,
    );
  }

  const parallelParts = splitOutsideQuotes(trimmed, "&");
  if (parallelParts.length > 1) {
    return {
      kind: "parallel",
      cues: parallelParts.map((p, idx) => parseCueLine(p, lineNo + idx * 0.001)),
      line: lineNo,
    };
  }

  if (FLOW_OP_RE.test(trimmed)) {
    const chainPart = stripCueProps(trimmed, ["dur", "stagger", "color", "strength", "zoom", "after"]);
    return {
      kind: "flow",
      segments: parseFlowChain(chainPart, lineNo),
      dur: typeof props.dur === "number" ? props.dur : undefined,
      line: lineNo,
    };
  }

  const [head, ...rest] = trimmed.split(/\s+/);
  const rawKeyword = head.toLowerCase();
  const keyword = CUE_ALIASES[rawKeyword] ?? rawKeyword;

  if (keyword === "show" || keyword === "hide") {
    const targetRaw = stripCueProps(rest.join(" "), ["dur", "stagger"]);
    return {
      kind: keyword,
      targets: splitTargets(targetRaw),
      stagger: typeof props.stagger === "number" ? props.stagger : undefined,
      dur: typeof props.dur === "number" ? props.dur : undefined,
      line: lineNo,
    };
  }

  if (keyword === "glow") {
    const targetRaw = stripCueProps(rest.join(" "), ["color", "strength", "dur"]);
    return {
      kind: "glow",
      targets: splitTargets(targetRaw),
      color: typeof props.color === "string" ? props.color : undefined,
      strength: typeof props.strength === "number" ? props.strength : undefined,
      dur: typeof props.dur === "number" ? props.dur : undefined,
      line: lineNo,
    };
  }

  if (keyword === "focus") {
    const targetRaw = stripCueProps(rest.join(" "), ["zoom", "dur"]);
    return {
      kind: "focus",
      targets: splitTargets(targetRaw),
      zoom: typeof props.zoom === "number" ? props.zoom : undefined,
      dur: typeof props.dur === "number" ? props.dur : undefined,
      line: lineNo,
    };
  }

  if (keyword === "frame") {
    const targetRaw = stripCueProps(rest.join(" "), ["zoom", "dur"]);
    const targets = splitTargets(targetRaw);
    if (targets.length === 0) throw new ParseError(`expected frame target`, lineNo);
    return {
      kind: "frame",
      targets,
      zoom: typeof props.zoom === "number" ? props.zoom : undefined,
      dur: typeof props.dur === "number" ? props.dur : undefined,
      line: lineNo,
    };
  }

  if (keyword === "use") {
    const call = rest.join(" ");
    const m = call.match(/^(\w+)\s*\((.*)\)\s*$/);
    if (!m) throw new ParseError(`expected use pattern(args)`, lineNo);
    const args: Record<string, string> = {};
    if (m[2].trim()) {
      for (const part of m[2].split(",")) {
        const trimmed = part.trim();
        if (trimmed.includes("=")) {
          const [k, v] = trimmed.split("=").map((s) => s.trim());
          if (!k || !v) throw new ParseError(`invalid use argument '${part}'`, lineNo);
          args[k] = v;
        } else {
          args[`__pos_${Object.keys(args).length}`] = trimmed;
        }
      }
    }
    return { kind: "use", pattern: m[1], args, line: lineNo };
  }

  throw new ParseError(`unknown cue '${head}'; use show, hide, glow, focus, frame, or use`, lineNo);
}

function expandPatternCues(cues: Cue[], patterns: Record<string, PatternDecl>, line: number): Cue[] {
  const out: Cue[] = [];
  for (const cue of cues) {
    if (cue.kind === "use") {
      const pat = patterns[cue.pattern];
      if (!pat) throw new ParseError(`unknown pattern '${cue.pattern}'`, line);
      const substituted = pat.body.map((c) => substitutePatternCue(c, pat.params, cue.args));
      out.push(...substituted);
      continue;
    }
    if (cue.kind === "parallel") {
      out.push({ ...cue, cues: expandPatternCues(cue.cues, patterns, line) });
      continue;
    }
    out.push(cue);
  }
  return out;
}

function substitutePatternCue(cue: Cue, params: string[], args: Record<string, string>): Cue {
  const positional = Object.keys(args)
    .filter((k) => k.startsWith("__pos_"))
    .sort()
    .map((k) => args[k]);
  const resolvedArgs: Record<string, string> = { ...args };
  params.forEach((p, i) => {
    if (resolvedArgs[p] === undefined && positional[i]) resolvedArgs[p] = positional[i];
  });
  for (const key of Object.keys(resolvedArgs)) {
    if (key.startsWith("__pos_")) delete resolvedArgs[key];
  }

  const sub = (s: string) => {
    for (const p of params) {
      if (resolvedArgs[p]) s = s.replaceAll(`$${p}`, resolvedArgs[p]);
    }
    return s;
  };

  if (cue.kind === "flow") {
    return {
      ...cue,
      segments: cue.segments.map((seg) => ({
        ...seg,
        from: sub(seg.from),
        to: sub(seg.to),
        label: seg.label ? sub(seg.label) : undefined,
      })),
    };
  }
  if (cue.kind === "show" || cue.kind === "hide" || cue.kind === "glow" || cue.kind === "focus" || cue.kind === "frame") {
    return { ...cue, targets: cue.targets.map(sub) };
  }
  if (cue.kind === "parallel") {
    return { ...cue, cues: cue.cues.map((c) => substitutePatternCue(c, params, args)) };
  }
  return cue;
}

type Block = { line: number; indent: number; text: string };

function readBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim() || raw.trim().startsWith("//")) continue;
    const indent = raw.match(/^\s*/)?.[0].length ?? 0;
    blocks.push({ line: i + 1, indent, text: raw.trim() });
  }
  return blocks;
}

function readIndentedBody(blocks: Block[], startIdx: number, parentIndent: number): { body: Block[]; nextIdx: number } {
  const body: Block[] = [];
  let i = startIdx;
  while (i < blocks.length) {
    if (blocks[i].indent <= parentIndent) break;
    body.push(blocks[i]);
    i++;
  }
  return { body, nextIdx: i };
}

const PLAYER_KEYWORDS = [...PLAYER_FLAT_KEYS].sort((a, b) => b.length - a.length).join("|");

const TOP_LEVEL_KEYWORDS_RE = new RegExp(
  `^(scene|player|layout|pattern|group|annotation|edge|beat|var|style|${PLAYER_KEYWORDS})\\b`,
);

const PLAYER_DIRECTIVE_RE = new RegExp(`^(${PLAYER_KEYWORDS})\\b(?:\\s*[:=]?\\s*(.+))?$`);

const PLAYER_GROUP_RE = /^(playback|controls|interaction|chrome)\s*:\s*$/;

const PLAYER_SETTING_RE = /^(\w+)(?:\s*[:=]\s*|\s+)?(.*)$/;

const PLAYER_FLAT_KEY_SET = new Set(PLAYER_FLAT_KEYS);

/** `player` is the source of truth; deprecated SceneMeta fields mirror it. */
function mirrorLegacySceneMeta(meta: SceneMeta): SceneMeta {
  const player = meta.player;
  if (!player) return meta;
  const { playback, controls, interaction, chrome } = player;

  if (playback?.autoplay !== undefined) meta.autoplay = playback.autoplay;
  if (playback?.loop !== undefined) meta.loop = playback.loop;
  if (playback?.rate !== undefined) meta.playbackRate = playback.rate;
  if (controls) meta.controls = Object.values(controls).some(Boolean);
  if (interaction) {
    meta.interactiveViewport = Boolean(interaction.zoom ?? true) || Boolean(interaction.pan ?? true);
  }
  if (chrome?.badge !== undefined) meta.copyright = chrome.badge;
  if (chrome?.progress === "none") meta.progressColor = "none";
  else if (chrome?.progressColor !== undefined) meta.progressColor = chrome.progressColor;

  return meta;
}

const NON_PLAYER_TOP_LEVEL_RE = /^(scene|player|layout|pattern|group|annotation|edge|beat|var|style)\b/;

function isPlayerBlockLine(line: string): boolean {
  if (PLAYER_GROUP_RE.test(line)) return true;
  const match = line.match(PLAYER_SETTING_RE);
  if (!match) return false;
  return isKnownPlayerSetting(match[1]);
}

function isNonPlayerTopLevelStatement(line: string): boolean {
  if (line === "}") return true;
  if (NON_PLAYER_TOP_LEVEL_RE.test(line)) return true;
  if (isPlayerBlockLine(line)) return false;
  const nodeMatch = line.match(/^(\w[\w.-]*)\s+(\w[\w.-]*)/);
  if (!nodeMatch) return false;
  const kind = canonicalNodeKind(nodeMatch[1].toLowerCase());
  return NODE_KINDS.has(kind);
}

/**
 * True for statements that open a new top-level construct. Used to recover
 * colon bodies when a host (MDX/JSX template literals, HTML attribute
 * serialization) strips the indentation that normally delimits them.
 */
function isTopLevelStatement(line: string): boolean {
  if (line === "}") return true;
  if (TOP_LEVEL_KEYWORDS_RE.test(line)) return true;
  const nodeMatch = line.match(/^(\w[\w.-]*)\s+(\w[\w.-]*)/);
  if (!nodeMatch) return false;
  const kind = canonicalNodeKind(nodeMatch[1].toLowerCase());
  return NODE_KINDS.has(kind);
}

/**
 * Colon bodies are normally indentation-delimited. When indentation is lost,
 * fall back silently to consuming same-indent lines until the next structural
 * top-level statement so diagrams still parse in MDX/blog hosts.
 */
function readColonBody(
  blocks: Block[],
  startIdx: number,
  parentIndent: number,
  diagnostics: Diagnostic[],
  context: string,
  headerLine: number,
): { body: Block[]; nextIdx: number } {
  const indented = readIndentedBody(blocks, startIdx, parentIndent);
  if (indented.body.length > 0 || startIdx >= blocks.length) {
    return indented;
  }

  if (isTopLevelStatement(blocks[startIdx].text)) {
    return indented;
  }

  const body: Block[] = [];
  let i = startIdx;
  while (i < blocks.length) {
    const block = blocks[i];
    if (block.indent < parentIndent) break;
    if (block.indent === parentIndent && isTopLevelStatement(block.text)) break;
    body.push(block);
    i++;
  }

  return { body, nextIdx: i };
}

function readBody(
  blocks: Block[],
  startIdx: number,
  parentIndent: number,
  braceDelimited: boolean,
  diagnostics: Diagnostic[] = [],
  context = "block",
  headerLine = 1,
): { body: Block[]; nextIdx: number } {
  if (!braceDelimited) {
    return readColonBody(blocks, startIdx, parentIndent, diagnostics, context, headerLine);
  }
  const body: Block[] = [];
  let i = startIdx;
  while (i < blocks.length) {
    if (blocks[i].text === "}") return { body, nextIdx: i + 1 };
    body.push(blocks[i]);
    i++;
  }
  return { body, nextIdx: i };
}

function normalizeCueBlocks(blocks: Block[]): Block[] {
  const normalized: Block[] = [];
  for (const block of blocks) {
    if (block.text.startsWith("& ")) {
      const prev = normalized[normalized.length - 1];
      if (!prev) throw new ParseError(`parallel continuation must follow a cue`, block.line);
      prev.text = `${prev.text} ${block.text}`;
      continue;
    }
    normalized.push({ ...block });
  }
  return normalized;
}

function unsupportedSyntaxMessage(line: string): string | null {
  if (/^actor\s+/.test(line) || /\bfigure\s*\(/.test(line) || /\bbox\s*\(/.test(line) || /\bat\s*\(/.test(line)) {
    return "unsupported manual drawing syntax; declare architecture nodes like service API, cache Redis, and database DB";
  }
  if (/^@\+?\d/.test(line)) {
    return "unsupported timeline command; put flow and cue lines inside beat blocks";
  }
  if (/^camera\b/.test(line)) {
    return "unsupported camera command; use frame NodeOrGroup zoom=... inside a beat";
  }
  return null;
}

const RESERVED_VAR_NAMES = new Set(["nodes", "title", "edges"]);

/**
 * Pulls top-level `var name = value` declarations out of the block stream so
 * their `$name` references can be substituted before parsing. Keeps AI-friendly
 * named constants (colors, durations) DRY without a runtime.
 */
function extractVars(blocks: Block[], diagnostics: Diagnostic[]): { vars: Map<string, string>; rest: Block[] } {
  const vars = new Map<string, string>();
  const rest: Block[] = [];
  for (const block of blocks) {
    if (!/^var\b/.test(block.text)) {
      rest.push(block);
      continue;
    }
    const m = block.text.match(/^var\s+([A-Za-z_]\w*)\s*=\s*(.+)$/);
    if (!m) throw new ParseError("expected var name = value", block.line);
    const name = m[1];
    if (RESERVED_VAR_NAMES.has(name)) {
      diagnostics.push({ severity: "warning", message: `var '${name}' shadows a reserved selector and was ignored`, line: block.line });
      continue;
    }
    const raw = m[2].trim();
    const str = parseStringToken(raw);
    vars.set(name, str && str.rest === "" ? str.value : raw);
  }
  return { vars, rest };
}

function applyVars(blocks: Block[], vars: Map<string, string>): Block[] {
  if (vars.size === 0) return blocks;
  return blocks.map((block) => {
    let text = block.text;
    for (const [name, value] of vars) {
      text = text.replace(new RegExp(`\\$${name}(?![\\w])`, "g"), value);
    }
    return { ...block, text };
  });
}

function pushWarning(diagnostics: Diagnostic[], seen: Set<string>, line: number, message: string): void {
  const key = `${line}:${message}`;
  if (seen.has(key)) return;
  seen.add(key);
  diagnostics.push({ severity: "warning", message, line });
}

function visitCues(cues: Cue[], visit: (cue: Cue) => void): void {
  for (const cue of cues) {
    visit(cue);
    if (cue.kind === "parallel") visitCues(cue.cues, visit);
  }
}

function validateReferences(ast: DiagramAST): void {
  const seen = new Set<string>();
  const hasNode = (id: string) => Boolean(ast.nodes[id]);
  const hasGroup = (id: string) => Boolean(ast.groups[id]);
  const isKnownTarget = (target: string) => {
    if (RESERVED_SELECTORS.has(target)) return true;
    if (target.startsWith("$")) return hasGroup(target.slice(1));
    return hasNode(target) || hasGroup(target);
  };

  for (const group of Object.values(ast.groups)) {
    for (const member of group.members) {
      if (!hasNode(member)) {
        pushWarning(ast.diagnostics, seen, group.line, `group '${group.id}' references unknown node '${member}'`);
      }
    }
  }

  for (const node of Object.values(ast.nodes)) {
    if (typeof node.style === "string" && !ast.styles[node.style]) {
      pushWarning(ast.diagnostics, seen, node.line, `node '${node.id}' references unknown style '${node.style}'`);
    }
  }

  const validateFlowEndpoint = (line: number, endpoint: string) => {
    if (!hasNode(endpoint)) {
      pushWarning(ast.diagnostics, seen, line, `flow references unknown node '${endpoint}'`);
    }
  };

  for (const edge of ast.edges) {
    validateFlowEndpoint(edge.line, edge.from);
    validateFlowEndpoint(edge.line, edge.to);
  }

  for (const ann of ast.annotations) {
    if (ann.target && !hasNode(ann.target)) {
      pushWarning(ast.diagnostics, seen, ann.line, `annotation references unknown target '${ann.target}'`);
    }
  }

  if (ast.annotations.length > 2) {
    pushWarning(ast.diagnostics, seen, ast.annotations[2].line, "more than 2 annotation callouts; editorial diagrams should use ≤2");
  }

  for (const beat of ast.beats) {
    visitCues(beat.cues, (cue) => {
      if (cue.kind === "flow") {
        for (const segment of cue.segments) {
          validateFlowEndpoint(cue.line, segment.from);
          validateFlowEndpoint(cue.line, segment.to);
        }
        return;
      }
      if (cue.kind === "show" || cue.kind === "hide" || cue.kind === "glow" || cue.kind === "focus" || cue.kind === "frame") {
        for (const target of cue.targets) {
          if (!isKnownTarget(target)) {
            pushWarning(ast.diagnostics, seen, cue.line, `${cue.kind} references unknown target '${target}'`);
          }
        }
      }
    });
  }
}

/**
 * Auto-layout ranks nodes by longest path through forward edges (`->`, `~>`, `--`);
 * `<-` is excluded because it represents a reply, not a new hop. A forward edge that
 * closes a loop (often a reply/return value mislabeled as `->` instead of `<-`) has no
 * bound in the ranking pass, so it keeps pushing the looped nodes to a deeper rank
 * until the diagram collapses into a couple of overlapping columns. Surface it early.
 */
function detectFlowCycles(ast: DiagramAST): void {
  const dtype = ast.meta.type ?? "architecture";
  if (dtype !== "architecture" && dtype !== "flowchart") return;
  const seen = new Set<string>();
  const adj = new Map<string, { to: string; line: number }[]>();
  const ensure = (id: string) => {
    if (!adj.has(id)) adj.set(id, []);
  };
  for (const id of Object.keys(ast.nodes)) ensure(id);

  const addEdge = (from: string, to: string, line: number) => {
    if (from === to) return;
    if (!ast.nodes[from] || !ast.nodes[to]) return;
    ensure(from);
    adj.get(from)!.push({ to, line });
  };

  for (const edge of ast.edges) {
    if (edge.kind !== "response") addEdge(edge.from, edge.to, edge.line);
  }
  for (const beat of ast.beats) {
    visitCues(beat.cues, (cue) => {
      if (cue.kind !== "flow") return;
      for (const segment of cue.segments) {
        if (segment.op !== "response") addEdge(segment.from, segment.to, cue.line);
      }
    });
  }

  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  for (const id of adj.keys()) color.set(id, WHITE);
  const stack: string[] = [];

  const dfs = (node: string) => {
    color.set(node, GRAY);
    stack.push(node);
    for (const { to, line } of adj.get(node) ?? []) {
      if (color.get(to) === GRAY) {
        const idx = stack.indexOf(to);
        const cyclePath = [...stack.slice(idx), to].join(" -> ");
        pushWarning(
          ast.diagnostics,
          seen,
          line,
          `flow cycle detected: ${cyclePath} — if '${to}' is receiving a reply/return value here, use '<-' for this edge instead of '->'/'~>'/'--' (an unmarked cycle can crush the ranked layout and overlap nodes)`,
        );
      } else if (color.get(to) === WHITE) {
        dfs(to);
      }
    }
    stack.pop();
    color.set(node, BLACK);
  };

  for (const id of adj.keys()) {
    if (color.get(id) === WHITE) dfs(id);
  }
}

export function parse(source: string, opts: ParseOptions = {}): DiagramAST {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const diagnostics: Diagnostic[] = [];
  const meta: SceneMeta = {
    width: 1280,
    height: 720,
    fps: 60,
    theme: "paper",
    explicitTheme: false,
    direction: "LR",
    explicitDirection: false,
  };
  const styles: Record<string, StyleDecl> = {};
  const nodes: Record<string, NodeDecl> = {};
  const edges: EdgeDecl[] = [];
  const groups: Record<string, GroupDecl> = {};
  const patterns: Record<string, PatternDecl> = {};
  const beats: BeatDecl[] = [];
  const annotations: AnnotationDecl[] = [];
  let title = "";
  let edgeCounter = 0;
  let annotationCounter = 0;

  const rawBlocks = readBlocks(lines.map(stripComment));
  const { vars, rest } = extractVars(rawBlocks, diagnostics);
  const blocks = applyVars(rest, vars);
  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i];
    const line = block.text;
    const lineNo = block.line;

    const unsupportedMessage = unsupportedSyntaxMessage(line);
    if (unsupportedMessage) throw new ParseError(unsupportedMessage, lineNo);

    if (/^player\s*:\s*$/.test(line)) {
      let { body, nextIdx } = readIndentedBody(blocks, i + 1, block.indent);
      if (body.length === 0 && i + 1 < blocks.length) {
        // Indentation was stripped by MDX or host: recover same-indent lines
        const unindented: Block[] = [];
        let j = i + 1;
        while (j < blocks.length) {
          const nextBlock = blocks[j];
          if (nextBlock.indent < block.indent) break;
          if (nextBlock.indent === block.indent && isNonPlayerTopLevelStatement(nextBlock.text)) break;
          if (isNonPlayerTopLevelStatement(nextBlock.text)) break;
          unindented.push(nextBlock);
          j++;
        }
        if (unindented.length > 0) {
          body = unindented;
          nextIdx = j;
        }
      }

      if (body.length === 0) {
        if (i + 1 < blocks.length && isNonPlayerTopLevelStatement(blocks[i + 1].text)) {
          throw new ParseError(
            `player block requires at least one setting (found '${blocks[i + 1].text}' immediately following 'player:')`,
            lineNo,
          );
        }
        throw new ParseError("player block requires at least one setting", lineNo);
      }

      const player = (meta.player ??= {});

      const applySetting = (scope: PlayerScope, setting: Block): void => {
        const match = setting.text.match(PLAYER_SETTING_RE);
        const error = applyPlayerSetting(player, scope, match?.[1] ?? "", match?.[2] ?? "");
        if (error) diagnostics.push({ severity: "warning", message: error, line: setting.line });
      };

      let settingIdx = 0;
      while (settingIdx < body.length) {
        const setting = body[settingIdx];
        const groupMatch = setting.text.match(PLAYER_GROUP_RE);
        if (groupMatch) {
          const scope = groupMatch[1] as PlayerScope;
          let childBody: Block[] = [];
          let childNextIdx = settingIdx + 1;

          // 1. Try reading indented children
          const indented = readIndentedBody(body, settingIdx + 1, setting.indent);
          if (indented.body.length > 0) {
            childBody = indented.body;
            childNextIdx = indented.nextIdx;
          } else {
            // 2. If children share the same indentation level (or MDX stripped indentation):
            let k = settingIdx + 1;
            while (k < body.length) {
              if (PLAYER_GROUP_RE.test(body[k].text)) break;
              childBody.push(body[k]);
              k++;
            }
            childNextIdx = k;
          }

          if (childBody.length === 0) {
            throw new ParseError(`player ${scope} block requires at least one setting`, setting.line);
          }
          for (const child of childBody) applySetting(scope, child);
          settingIdx = childNextIdx;
          continue;
        }
        applySetting("player", setting);
        settingIdx++;
      }
      i = nextIdx;
      continue;
    }

    if (line.startsWith("scene")) {
      const rest = line.slice(5).trim();
      if (line.endsWith("{")) {
        throw new ParseError(`nested scene blocks are not supported; use one scene with multiple beat blocks`, lineNo);
      }
      let remainder = rest;
      const str = parseStringToken(rest);
      if (str) {
        title = str.value;
        meta.title = title;
        remainder = str.rest;
      }
      const inlineLayout = remainder.match(/\b(?:layout|direction|rankdir)\s+(LR|RL|TB|BT)\b/i);
      if (inlineLayout) {
        meta.direction = inlineLayout[1].toUpperCase() as LayoutDirection;
        meta.explicitDirection = true;
        remainder = remainder.replace(/\b(?:layout|direction|rankdir)\s+(LR|RL|TB|BT)\b/i, " ");
      }
      const props = parseProps(remainder);
      for (const [k, v] of Object.entries(props)) {
        if (!SCENE_KEYS.has(k)) {
          diagnostics.push({ severity: "warning", message: `unknown scene property '${k}'`, line: lineNo });
          continue;
        }
        if (k === "width") {
          meta.width = Number(v);
          meta.explicitWidth = true;
        } else if (k === "height") {
          meta.height = Number(v);
          meta.explicitHeight = true;
        } else if (k === "fps") {
          meta.fps = Number(v);
        } else if (k === "duration") meta.duration = Number(v);
        else if (k === "theme") {
          const val = String(v).toLowerCase();
          meta.theme = val;
          meta.explicitTheme = val !== "auto";
        } else if (k === "direction" || k === "layout" || k === "rankdir") {
          meta.direction = String(v).toUpperCase() as LayoutDirection;
          meta.explicitDirection = true;
        } else if (PLAYER_FLAT_KEY_SET.has(k)) {
          const error = applyPlayerSetting((meta.player ??= {}), "player", k, String(v));
          if (error) diagnostics.push({ severity: "warning", message: error, line: lineNo });
        } else if (k === "type") {
          const t = String(v).toLowerCase();
          if (!DIAGRAM_TYPES.has(t)) {
            diagnostics.push({ severity: "warning", message: `unknown diagram type '${v}'`, line: lineNo });
          } else {
            meta.type = t as SceneMeta["type"];
            if ((t === "flowchart" || t === "nested") && !props.direction && !props.layout && !props.rankdir && !inlineLayout) {
              meta.direction = "TB";
              meta.explicitDirection = true;
            }
          }
        }
      }
      i++;
      continue;
    }

    if (/^theme\s*[:=]?\s*([a-zA-Z0-9_-]+)/i.test(line)) {
      const match = line.match(/^theme\s*[:=]?\s*([a-zA-Z0-9_-]+)/i);
      if (match) {
        const val = match[1].toLowerCase();
        meta.theme = val;
        meta.explicitTheme = val !== "auto";
      }
      i++;
      continue;
    }

    const directiveMatch = line.match(PLAYER_DIRECTIVE_RE);
    if (directiveMatch) {
      const error = applyPlayerSetting((meta.player ??= {}), "player", directiveMatch[1], directiveMatch[2] ?? "");
      if (error) diagnostics.push({ severity: "warning", message: error, line: lineNo });
      i++;
      continue;
    }

    if (/^layout\s+(LR|RL|TB|BT)\b/i.test(line)) {
      meta.direction = line.split(/\s+/)[1].toUpperCase() as LayoutDirection;
      meta.explicitDirection = true;
      i++;
      continue;
    }

    if (line.startsWith("style ")) {
      const m = line.match(/^style\s+(\w+)\s*=\s*(.+)$/);
      if (!m) throw new ParseError(`expected style name = props`, lineNo);
      styles[m[1]] = { name: m[1], props: parseProps(m[2]), line: lineNo };
      i++;
      continue;
    }

    if (line.startsWith("pattern ")) {
      const m = line.match(/^pattern\s+(\w+)\s*\(([^)]*)\)\s*(?::|\{)\s*$/);
      if (!m) throw new ParseError(`expected pattern name(params):`, lineNo);
      const params = m[2].trim() ? m[2].split(",").map((p) => p.trim()) : [];
      const { body, nextIdx } = readBody(
        blocks,
        i + 1,
        block.indent,
        line.endsWith("{"),
        diagnostics,
        `pattern '${m[1]}'`,
        lineNo,
      );
      const cues = normalizeCueBlocks(body).map((b) => parseCueLine(b.text, b.line));
      patterns[m[1]] = { name: m[1], params, body: cues, line: lineNo };
      i = nextIdx;
      continue;
    }

    if (line.startsWith("group ")) {
      const inline = line.match(/^group\s+(\w+)(?:\s+"([^"]*)")?\s*:\s*(.+)$/);
      if (inline) {
        groups[inline[1]] = {
          id: inline[1],
          label: inline[2],
          members: splitTargets(inline[3]),
          props: {},
          line: lineNo,
        };
        i++;
        continue;
      }
      // Multi-line form: `group name ["Label"]:` followed by members.
      // Prefer indented members; recover when hosts strip indentation.
      const header = line.match(/^group\s+(\w+)(?:\s+"([^"]*)")?\s*:\s*$/);
      if (!header) throw new ParseError(`expected group name: A B C`, lineNo);
      const { body, nextIdx } = readColonBody(
        blocks,
        i + 1,
        block.indent,
        diagnostics,
        `group '${header[1]}'`,
        lineNo,
      );
      const members = body.flatMap((b) => splitTargets(b.text));
      if (members.length === 0) throw new ParseError(`group '${header[1]}' has no members`, lineNo);
      groups[header[1]] = {
        id: header[1],
        label: header[2],
        members,
        props: {},
        line: lineNo,
      };
      i = nextIdx;
      continue;
    }

    if (line.startsWith("annotation ")) {
      const str = parseStringToken(line.slice("annotation ".length).trim());
      if (!str) throw new ParseError(`expected annotation "text" with optional target= position=`, lineNo);
      const props = parseProps(str.rest);
      const target = typeof props.target === "string" ? props.target : undefined;
      const position = typeof props.position === "string" ? props.position : undefined;
      annotations.push({
        id: `ann_${++annotationCounter}`,
        text: str.value,
        target,
        position,
        props,
        line: lineNo,
      });
      i++;
      continue;
    }

    if (line.startsWith("edge ")) {
      const m = line.match(/^edge\s+(\w+)\s*:\s*(.+)$/);
      if (!m) throw new ParseError(`expected edge id: A -> B`, lineNo);
      const segments = parseFlowChain(m[2].split(/\s+\w+=/)[0], lineNo);
      for (const seg of segments) {
        edges.push({
          id: `edge_${++edgeCounter}`,
          kind: seg.op,
          from: seg.from,
          to: seg.to,
          label: seg.label,
          props: parseProps(m[2]),
          line: lineNo,
        });
      }
      i++;
      continue;
    }

    if (line.startsWith("beat ")) {
      const m = line.match(/^beat\s+([\w.-]+)(?:\s+"([^"]*)")?\s*(?::|\{)\s*$/);
      if (!m) throw new ParseError(`expected beat name:`, lineNo);
      const { body, nextIdx } = readBody(
        blocks,
        i + 1,
        block.indent,
        line.endsWith("{"),
        diagnostics,
        `beat '${m[1]}'`,
        lineNo,
      );
      let cues = normalizeCueBlocks(body).map((b) => parseCueLine(b.text, b.line));
      cues = expandPatternCues(cues, patterns, lineNo);
      beats.push({ name: m[1], label: m[2], cues, line: lineNo });
      i = nextIdx;
      continue;
    }

    // Node declaration: kind ID ["Label"] [props]
    const nodeMatch = line.match(/^(\w[\w.-]*)\s+(\w[\w.-]*)(.*)$/);
    if (nodeMatch) {
      const rawKind = nodeMatch[1].toLowerCase();
      const kind = canonicalNodeKind(rawKind);
      const id = nodeMatch[2];
      let remainder = nodeMatch[3].trim();
      if (!NODE_KINDS.has(kind)) {
        throw new ParseError(`unknown node kind '${rawKind}'`, lineNo);
      }
      let label = humanizeId(id);
      const str = parseStringToken(remainder);
      if (str) {
        label = str.value;
        remainder = str.rest;
      }
      const styleMatch = remainder.match(/\bstyle=(\w+)/);
      const props = parseProps(remainder);
      nodes[id] = {
        kind,
        id,
        label,
        style: styleMatch?.[1],
        props,
        line: lineNo,
      };
      i++;
      continue;
    }

    if (BEAT_CUE_KEYWORDS.has(line.split(/\s+/)[0].toLowerCase()) || FLOW_OP_RE.test(line)) {
      throw new ParseError(`top-level cues must be inside a beat block`, lineNo);
    }

    throw new ParseError(`unexpected statement`, lineNo);
  }

  const ast: DiagramAST = {
    meta: { ...mirrorLegacySceneMeta(meta), title: title || undefined },
    styles,
    nodes,
    edges,
    groups,
    annotations,
    patterns,
    beats,
    diagnostics,
  };

  validateReferences(ast);
  detectFlowCycles(ast);

  const errors = ast.diagnostics.filter((d) => d.severity === "error");
  if (errors.length) {
    throw new ParseError(errors[0].message, errors[0].line, errors[0].column);
  }

  if (!opts.parseOnly && Object.keys(nodes).length === 0 && beats.length === 0) {
    // Allow empty parse for tooling
  }

  return ast;
}

export function compile(ast: DiagramAST): RenderPlan {
  return compilePlan(ast, resolveTheme(ast.meta.theme));
}

export function parseAndCompile(source: string): ParseResult {
  const ast = parse(source);
  const plan = compile(ast);
  return { ast, plan };
}

// Re-export for tooling that only needs compile step
export { compilePlan } from "./compiler.js";
