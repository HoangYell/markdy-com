import type { ActorDef, AssetDef, SceneAST, SequenceDef, TemplateDef } from "./ast.js";

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class ParseError extends Error {
  constructor(
    message: string,
    public readonly line: number,
  ) {
    super(`Line ${line}: ${message}`);
    this.name = "ParseError";
  }
}

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

/**
 * Strips a trailing comment from a source line while ignoring `#` characters
 * that appear inside parentheses (e.g. CSS hex colours like `#c68642`) or
 * inside double-quoted strings.
 *
 * Rules:
 *   - `#` at depth 0, outside a string → start of comment
 *   - `#` inside `(...)` or inside `"..."` → literal character
 */
function stripComment(line: string): string {
  let depth = 0;
  let inString = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '(') { depth++; continue; }
    if (ch === ')') { depth--; continue; }
    if (ch === '#' && depth === 0) return line.slice(0, i);
  }
  return line;
}

/**
 * Splits a comma-delimited string while respecting parentheses depth.
 * "to=(300,250), dur=1.0" → ["to=(300,250)", " dur=1.0"]
 */
function splitByComma(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(s.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(s.slice(start));
  return parts;
}

/**
 * Converts a raw token string to a typed value:
 *   "quoted"  → string (without surrounding quotes)
 *   (x,y)     → Array<number | string>
 *   42 / 3.14 → number
 *   identifier → string
 */
function parseValue(s: string): unknown {
  const t = s.trim();

  if (t.startsWith('"') && t.endsWith('"')) {
    return t.slice(1, -1);
  }

  if (t.startsWith("(") && t.endsWith(")")) {
    const inner = t.slice(1, -1);
    return inner.split(",").map((p) => {
      const v = p.trim();
      const n = Number(v);
      return Number.isNaN(n) ? v : n;
    });
  }

  const n = Number(t);
  if (!Number.isNaN(n) && t !== "") return n;

  return t;
}

// ---------------------------------------------------------------------------
// Parameter parsing
// ---------------------------------------------------------------------------

/**
 * Maps action names to their ordered positional parameter keys.
 * All other parameters are expected to be named (key=value).
 */
const POSITIONAL_KEYS: Record<string, string[]> = {
  say: ["text"],
  throw: ["asset"],
};

function parseActionParams(
  action: string,
  raw: string,
): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  const trimmed = raw.trim();
  if (!trimmed) return params;

  const positionalKeys = POSITIONAL_KEYS[action] ?? [];
  let positionalIndex = 0;

  for (const token of splitByComma(trimmed)) {
    const t = token.trim();
    if (!t) continue;

    const eqIdx = t.indexOf("=");
    if (eqIdx === -1) {
      const key = positionalKeys[positionalIndex] ?? `_${positionalIndex}`;
      positionalIndex++;
      params[key] = parseValue(t);
    } else {
      const key = t.slice(0, eqIdx).trim();
      const val = t.slice(eqIdx + 1).trim();
      params[key] = parseValue(val);
    }
  }

  return params;
}

// ---------------------------------------------------------------------------
// Actor modifier parsing
// ---------------------------------------------------------------------------

/**
 * Parses space-separated modifier pairs that follow the actor position.
 * Example: "scale 0.4 opacity 0.9" → { scale: 0.4, opacity: 0.9 }
 */
function parseModifiers(
  raw: string,
): Partial<Pick<ActorDef, "scale" | "rotate" | "opacity" | "size">> {
  const result: Partial<Pick<ActorDef, "scale" | "rotate" | "opacity" | "size">> = {};
  const tokens = raw.trim().split(/\s+/).filter(Boolean);

  for (let i = 0; i + 1 < tokens.length; i += 2) {
    const key = tokens[i];
    const val = Number(tokens[i + 1]);
    if (Number.isNaN(val)) continue;
    if (key === "scale") result.scale = val;
    else if (key === "rotate") result.rotate = val;
    else if (key === "opacity") result.opacity = val;
    else if (key === "size") result.size = val;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Compiled regexes
// ---------------------------------------------------------------------------

const ASSET_RE = /^asset\s+(\w+)\s*=\s*(image|icon)\("([^"]+)"\)$/;

// Built-in actor types — user-defined templates (def) are also valid.
const BUILTIN_ACTOR_TYPES = new Set(["sprite", "text", "box", "figure"]);

// Captures: name, type, argsRaw, x, y, modifiersTrailing
const ACTOR_RE =
  /^actor\s+(\w+)\s*=\s*(\w+)\(([^)]*)\)\s+at\s+\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)(.*)$/;

// (.*)  is greedy and backtracks to let \)$ match the outermost closing paren.
const EVENT_RE = /^@([\d.]+):\s+(\w+)\.(\w+)\((.*)\)$/;

// var declaration: var <name> = <value>
const VAR_RE = /^var\s+(\w+)\s*=\s*(.+)$/;

// def header: def <name>(<params>) {
const DEF_HEADER_RE = /^def\s+(\w+)\(([^)]*)\)\s*\{$/;

// def body (single line inside braces): <actorType>(<args>)
const DEF_BODY_RE = /^\s*(sprite|text|box|figure)\(([^)]*)\)\s*$/;

// seq header: seq <name> {  or  seq <name>(<params>) {
const SEQ_HEADER_RE = /^seq\s+(\w+)(?:\(([^)]*)\))?\s*\{$/;

// seq body line: @+<offset>: $.<action>(<params>)
const SEQ_EVENT_RE = /^@\+([\d.]+):\s+\$\.(\w+)\((.*)\)$/;

// ---------------------------------------------------------------------------
// Variable interpolation
// ---------------------------------------------------------------------------

/**
 * Replaces all `${name}` tokens in a string using the provided vars map.
 * Unknown vars are left as-is (will cause a parse error later, which is fine).
 */
function interpolate(s: string, vars: Record<string, string>): string {
  return s.replace(/\$\{(\w+)\}/g, (_, name) => vars[name] ?? `\${${name}}`);
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULTS = {
  width: 800,
  height: 400,
  fps: 30,
  bg: "white",
} as const;

// ---------------------------------------------------------------------------
// Public parser
// ---------------------------------------------------------------------------

export function parse(source: string): SceneAST {
  const ast: SceneAST = {
    meta: { ...DEFAULTS },
    assets: {},
    actors: {},
    events: [],
    defs: {},
    seqs: {},
    vars: {},
  };

  let sceneFound = false;
  const lines = source.split(/\r?\n/);

  // ── State for multi-line blocks ───────────────────────────────────────────
  let inDef: { name: string; params: string[]; startLine: number } | null = null;
  let defNeedsClose = false; // after body line consumed, waiting for '}'
  let inSeq: { name: string; params: string[]; events: SequenceDef["events"]; startLine: number } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;

    // ── var: parse BEFORE comment stripping (value may contain #hex) ────────
    const rawUntouched = lines[i].trim();
    if (!inDef && !defNeedsClose && !inSeq && rawUntouched.startsWith("var ")) {
      // Interpolate existing vars, but don't strip comments (# is valid in vals)
      const varLine = interpolate(rawUntouched, ast.vars);
      const vm = VAR_RE.exec(varLine);
      if (!vm) {
        throw new ParseError(`Invalid var declaration: ${varLine}`, lineNum);
      }
      const [, name, value] = vm;
      ast.vars[name] = value.trim();
      continue;
    }

    // Strip inline comments (context-aware: ignores # inside parens/strings).
    let raw = stripComment(lines[i]).trim();
    if (!raw) continue;

    // ── Variable interpolation ──────────────────────────────────────────────
    raw = interpolate(raw, ast.vars);

    // ── Closing brace for def / seq blocks ──────────────────────────────────
    if (raw === "}") {
      if (defNeedsClose) {
        defNeedsClose = false;
        continue;
      }
      if (inDef) {
        throw new ParseError(`Empty def body for "${inDef.name}"`, lineNum);
      }
      if (inSeq) {
        ast.seqs[inSeq.name] = { params: inSeq.params, events: inSeq.events };
        inSeq = null;
        continue;
      }
      throw new ParseError("Unexpected '}'", lineNum);
    }

    // ── Inside a def block (waiting for body line) ──────────────────────────
    if (inDef) {
      const bm = DEF_BODY_RE.exec(raw);
      if (!bm) {
        throw new ParseError(`Invalid def body (expected "type(args)"): ${raw}`, lineNum);
      }
      const [, actorType, bodyArgsRaw] = bm;
      const bodyArgs = bodyArgsRaw.trim()
        ? splitByComma(bodyArgsRaw).map((a) => a.trim())
        : [];

      ast.defs[inDef.name] = {
        params: inDef.params,
        actorType: actorType as ActorDef["type"],
        bodyArgs,
      };
      inDef = null;
      defNeedsClose = true; // now expect '}'
      continue;
    }

    // ── Inside a seq block ──────────────────────────────────────────────────
    if (inSeq) {
      const interpolatedSeq = interpolate(raw, ast.vars);
      const sm = SEQ_EVENT_RE.exec(interpolatedSeq);
      if (!sm) {
        throw new ParseError(`Invalid seq event (expected "@+offset: $.action(params)"): ${raw}`, lineNum);
      }
      const [, offsetStr, action, paramsRaw] = sm;
      inSeq.events.push({
        offset: Number(offsetStr),
        action,
        paramsRaw,
      });
      continue;
    }

    // ── def ─────────────────────────────────────────────────────────────────
    if (raw.startsWith("def ")) {
      const dm = DEF_HEADER_RE.exec(raw);
      if (!dm) {
        throw new ParseError(`Invalid def declaration: ${raw}`, lineNum);
      }
      const [, name, paramsRaw] = dm;
      const params = paramsRaw.split(",").map((p) => p.trim()).filter(Boolean);
      inDef = { name, params, startLine: lineNum };
      continue;
    }

    // ── seq ─────────────────────────────────────────────────────────────────
    if (raw.startsWith("seq ")) {
      const sm = SEQ_HEADER_RE.exec(raw);
      if (!sm) {
        throw new ParseError(`Invalid seq declaration: ${raw}`, lineNum);
      }
      const [, name, paramsRaw] = sm;
      const params = paramsRaw
        ? paramsRaw.split(",").map((p) => p.trim()).filter(Boolean)
        : [];
      inSeq = { name, params, events: [], startLine: lineNum };
      continue;
    }

    // ── scene ───────────────────────────────────────────────────────────────
    if (/^scene(\s|$)/.test(raw)) {
      if (sceneFound) {
        throw new ParseError("Duplicate scene declaration", lineNum);
      }
      sceneFound = true;

      for (const [, key, val] of raw.matchAll(/(\w+)=([\S]+)/g)) {
        switch (key) {
          case "width":    ast.meta.width    = Number(val); break;
          case "height":   ast.meta.height   = Number(val); break;
          case "fps":      ast.meta.fps      = Number(val); break;
          case "bg":       ast.meta.bg       = val;         break;
          case "duration": ast.meta.duration = Number(val); break;
          default:
            throw new ParseError(`Unknown scene property: ${key}`, lineNum);
        }
      }
      continue;
    }

    // ── asset ────────────────────────────────────────────────────────────────
    if (raw.startsWith("asset")) {
      const m = ASSET_RE.exec(raw);
      if (!m) {
        throw new ParseError(`Invalid asset declaration: ${raw}`, lineNum);
      }
      const [, name, type, value] = m;
      ast.assets[name] = { type: type as AssetDef["type"], value };
      continue;
    }

    // ── actor ────────────────────────────────────────────────────────────────
    if (raw.startsWith("actor")) {
      const m = ACTOR_RE.exec(raw);
      if (!m) {
        throw new ParseError(`Invalid actor declaration: ${raw}`, lineNum);
      }
      const [, name, typeName, argsRaw, xStr, yStr, modifiersRaw] = m;

      // Resolve type: either built-in or a user-defined template (def)
      let resolvedType: ActorDef["type"];
      let resolvedArgs: string[];

      if (BUILTIN_ACTOR_TYPES.has(typeName)) {
        resolvedType = typeName as ActorDef["type"];
        resolvedArgs = argsRaw.trim()
          ? splitByComma(argsRaw).map((a) => {
              const t = a.trim();
              return t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1) : t;
            })
          : [];
      } else if (ast.defs[typeName]) {
        // Expand user-defined template
        const tmpl = ast.defs[typeName];
        const callArgs = argsRaw.trim()
          ? splitByComma(argsRaw).map((a) => {
              const t = a.trim();
              return t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1) : t;
            })
          : [];

        // Build a local var map from template params → call args
        const localVars: Record<string, string> = {};
        for (let pi = 0; pi < tmpl.params.length; pi++) {
          localVars[tmpl.params[pi]] = callArgs[pi] ?? "";
        }

        resolvedType = tmpl.actorType;
        resolvedArgs = tmpl.bodyArgs.map((a) => interpolate(a, localVars));
      } else {
        throw new ParseError(`Unknown actor type or template: "${typeName}"`, lineNum);
      }

      const modifiers = parseModifiers(modifiersRaw);

      ast.actors[name] = {
        type: resolvedType,
        args: resolvedArgs,
        x: Number(xStr),
        y: Number(yStr),
        ...modifiers,
      };
      continue;
    }

    // ── event / play ─────────────────────────────────────────────────────────
    if (raw.startsWith("@")) {
      const m = EVENT_RE.exec(raw);
      if (!m) {
        throw new ParseError(`Invalid event: ${raw}`, lineNum);
      }
      const [, timeStr, actor, action, paramsRaw] = m;

      const time = Number(timeStr);
      if (Number.isNaN(time)) {
        throw new ParseError(`Invalid time value: ${timeStr}`, lineNum);
      }
      if (!ast.actors[actor]) {
        throw new ParseError(`Unknown actor: "${actor}"`, lineNum);
      }

      // ── play(<seqName>, params...) → expand seq inline ────────────────────
      if (action === "play") {
        const playParts = splitByComma(paramsRaw);
        const seqName = playParts[0]?.trim();
        if (!seqName || !ast.seqs[seqName]) {
          throw new ParseError(`Unknown sequence: "${seqName}"`, lineNum);
        }
        const seq = ast.seqs[seqName];

        // Collect named params passed to play()
        const playVars: Record<string, string> = {};
        for (let pi = 1; pi < playParts.length; pi++) {
          const eqIdx = playParts[pi].indexOf("=");
          if (eqIdx !== -1) {
            const k = playParts[pi].slice(0, eqIdx).trim();
            const v = playParts[pi].slice(eqIdx + 1).trim();
            playVars[k] = v;
          }
        }
        // Also map positional seq params
        let posIdx = 0;
        for (let pi = 1; pi < playParts.length; pi++) {
          if (!playParts[pi].includes("=") && posIdx < seq.params.length) {
            playVars[seq.params[posIdx]] = playParts[pi].trim();
            posIdx++;
          }
        }

        // Expand each seq event with substituted params + resolved time
        for (const sev of seq.events) {
          const expandedParams = interpolate(sev.paramsRaw, playVars);
          const absTime = Math.round((time + sev.offset) * 1000) / 1000;
          const params = parseActionParams(sev.action, expandedParams);
          ast.events.push({
            time: absTime,
            actor,
            action: sev.action,
            params,
            line: lineNum,
          });
        }
        continue;
      }

      const params = parseActionParams(action, paramsRaw);
      ast.events.push({ time, actor, action, params, line: lineNum });
      continue;
    }

    throw new ParseError(`Unrecognized statement: ${raw}`, lineNum);
  }

  // Validate unclosed blocks
  if (inDef) {
    throw new ParseError(`Unclosed def block "${inDef.name}"`, inDef.startLine);
  }
  if (defNeedsClose) {
    // Body was consumed but closing '}' never came
    throw new ParseError("Unclosed def block (missing '}')", lines.length);
  }
  if (inSeq) {
    throw new ParseError(`Unclosed seq block "${inSeq.name}"`, inSeq.startLine);
  }

  // Auto-compute duration from the last event end-time when not explicitly set.
  if (ast.meta.duration === undefined) {
    let maxEnd = 0;
    for (const ev of ast.events) {
      const dur = typeof ev.params.dur === "number" ? ev.params.dur : 0;
      maxEnd = Math.max(maxEnd, ev.time + dur);
    }
    if (maxEnd > 0) ast.meta.duration = maxEnd;
  }

  return ast;
}
