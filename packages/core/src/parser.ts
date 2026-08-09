/**
 * Diagram-native MarkdyScript parser and compiler.
 */
import type {
  BeatDecl,
  Cue,
  DiagramAST,
  Diagnostic,
  EdgeDecl,
  EdgeKind,
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
  EDGE_OPERATORS,
  humanizeId,
  NODE_KINDS,
  RESERVED_SELECTORS,
  SCENE_KEYS,
} from "./registry.js";
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

const FLOW_OP_RE = /(->|<-|~>|--)/;

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
    if (ch === "#" && (i === 0 || /\s/.test(line[i - 1]))) return line.slice(0, i);
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
    const keyMatch = raw.slice(i).match(/^(\w[\w.-]*)=/);
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
  return raw
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean);
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

function parseFlowChain(line: string, lineNo: number): FlowSegment[] {
  const segments: FlowSegment[] = [];
  const parts = line.split(FLOW_OP_RE).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 3) {
    throw new ParseError(`expected flow chain like A -> B "label"`, lineNo);
  }

  let i = 0;
  let from = splitTargetLabel(parts[i++], lineNo).node;
  while (i < parts.length) {
    const opToken = parts[i++];
    const op = EDGE_OPERATORS[opToken];
    if (!op) throw new ParseError(`unknown flow operator '${opToken}'`, lineNo);
    if (i >= parts.length) throw new ParseError(`expected target after '${opToken}'`, lineNo);

    const { node: to, label } = splitTargetLabel(parts[i++], lineNo);
    if (!to) throw new ParseError(`expected target node after '${opToken}'`, lineNo);

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
  const keyword = head.toLowerCase();

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

  throw new ParseError(`unknown cue '${head}'`, lineNo);
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

function readBody(blocks: Block[], startIdx: number, parentIndent: number, braceDelimited: boolean): { body: Block[]; nextIdx: number } {
  if (!braceDelimited) return readIndentedBody(blocks, startIdx, parentIndent);
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
  if (/^var\s+/.test(line)) {
    return "unsupported variable declaration; use scene properties and style declarations instead";
  }
  if (/^actor\s+/.test(line) || /\bfigure\s*\(/.test(line) || /\bbox\s*\(/.test(line) || /\bat\s*\(/.test(line)) {
    return "unsupported manual drawing syntax; declare architecture nodes like service API, cache Redis, and database DB";
  }
  if (/^@\+?\d/.test(line)) {
    return "unsupported timeline command; put flow and cue lines inside beat blocks";
  }
  if (/^camera\./.test(line)) {
    return "unsupported camera command; use frame NodeOrGroup zoom=... inside a beat";
  }
  return null;
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
    if (node.style && !ast.styles[node.style]) {
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

export function parse(source: string, opts: ParseOptions = {}): DiagramAST {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const diagnostics: Diagnostic[] = [];
  const meta: SceneMeta = {
    width: 1280,
    height: 720,
    fps: 60,
    theme: "paper",
    direction: "LR",
  };
  const styles: Record<string, StyleDecl> = {};
  const nodes: Record<string, NodeDecl> = {};
  const edges: EdgeDecl[] = [];
  const groups: Record<string, GroupDecl> = {};
  const patterns: Record<string, PatternDecl> = {};
  const beats: BeatDecl[] = [];
  let title = "";
  let edgeCounter = 0;

  const blocks = readBlocks(lines.map(stripComment));
  let i = 0;

  while (i < blocks.length) {
    const block = blocks[i];
    const line = block.text;
    const lineNo = block.line;

    const unsupportedMessage = unsupportedSyntaxMessage(line);
    if (unsupportedMessage) throw new ParseError(unsupportedMessage, lineNo);

    if (line.startsWith("scene")) {
      const rest = line.slice(5).trim();
      if (line.endsWith("{")) {
        throw new ParseError(`nested scene blocks are not supported; use one scene with multiple beat blocks`, lineNo);
      }
      let remainder = rest;
      const str = parseStringToken(rest);
      if (str) {
        title = str.value;
        remainder = str.rest;
      }
      const inlineLayout = remainder.match(/\blayout\s+(LR|RL|TB|BT)\b/i);
      if (inlineLayout) {
        meta.direction = inlineLayout[1].toUpperCase() as LayoutDirection;
        remainder = remainder.replace(/\blayout\s+(LR|RL|TB|BT)\b/i, " ");
      }
      const props = parseProps(remainder);
      for (const [k, v] of Object.entries(props)) {
        if (!SCENE_KEYS.has(k)) {
          diagnostics.push({ severity: "warning", message: `unknown scene property '${k}'`, line: lineNo });
          continue;
        }
        if (k === "width" || k === "height" || k === "fps") (meta as Record<string, unknown>)[k] = Number(v);
        else if (k === "duration") meta.duration = Number(v);
        else if (k === "theme") meta.theme = String(v);
        else if (k === "direction" || k === "layout") meta.direction = String(v).toUpperCase() as LayoutDirection;
      }
      i++;
      continue;
    }

    if (/^layout\s+(LR|RL|TB|BT)\b/i.test(line)) {
      meta.direction = line.split(/\s+/)[1].toUpperCase() as LayoutDirection;
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
      const { body, nextIdx } = readBody(blocks, i + 1, block.indent, line.endsWith("{"));
      const cues = normalizeCueBlocks(body).map((b) => parseCueLine(b.text, b.line));
      patterns[m[1]] = { name: m[1], params, body: cues, line: lineNo };
      i = nextIdx;
      continue;
    }

    if (line.startsWith("group ")) {
      const m = line.match(/^group\s+(\w+)(?:\s+"([^"]*)")?\s*:\s*(.+)$/);
      if (!m) throw new ParseError(`expected group name: A B C`, lineNo);
      groups[m[1]] = {
        id: m[1],
        label: m[2],
        members: splitTargets(m[3]),
        props: {},
        line: lineNo,
      };
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
      const m = line.match(/^beat\s+(\w+)(?:\s+"([^"]*)")?\s*(?::|\{)\s*$/);
      if (!m) throw new ParseError(`expected beat name:`, lineNo);
      const { body, nextIdx } = readBody(blocks, i + 1, block.indent, line.endsWith("{"));
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
    meta: { ...meta, title: title || undefined },
    styles,
    nodes,
    edges,
    groups,
    patterns,
    beats,
    diagnostics,
  };

  validateReferences(ast);

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
