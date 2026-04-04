import type { ActorDef, AssetDef, SceneAST } from "./ast.js";

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

// Captures: name, type, argsRaw, x, y, modifiersTrailing
// [^)]* in argsRaw is intentional: actor constructor args in the MVP spec
// never contain a bare ')' (quoted strings are the only multi-char arg type).
const ACTOR_RE =
  /^actor\s+(\w+)\s*=\s*(sprite|text|box)\(([^)]*)\)\s+at\s+\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)(.*)$/;

// (.*)  is greedy and backtracks to let \)$ match the outermost closing paren,
// which correctly handles nested tuples like to=(300,250) in the param list.
const EVENT_RE = /^@([\d.]+):\s+(\w+)\.(\w+)\((.*)\)$/;

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
  };

  let sceneFound = false;
  const lines = source.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    // Strip line comments and surrounding whitespace.
    const raw = lines[i].replace(/#.*$/, "").trim();
    if (!raw) continue;

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
      const [, name, type, argsRaw, xStr, yStr, modifiersRaw] = m;

      const args: string[] = argsRaw.trim()
        ? splitByComma(argsRaw).map((a) => {
            const t = a.trim();
            return t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1) : t;
          })
        : [];

      const modifiers = parseModifiers(modifiersRaw);

      ast.actors[name] = {
        type: type as ActorDef["type"],
        args,
        x: Number(xStr),
        y: Number(yStr),
        ...modifiers,
      };
      continue;
    }

    // ── event ────────────────────────────────────────────────────────────────
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

      const params = parseActionParams(action, paramsRaw);
      ast.events.push({ time, actor, action, params, line: lineNum });
      continue;
    }

    throw new ParseError(`Unrecognized statement: ${raw}`, lineNum);
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
