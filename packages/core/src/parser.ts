import type {
  ActorDef,
  AssetDef,
  Chapter,
  ImportDecl,
  ParseWarning,
  SceneAST,
  SceneMeta,
  SequenceDef,
  TemplateDef,
  TimelineEvent,
} from "./ast.js";
import { PRESETS } from "./presets.js";

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
 * that appear inside parentheses (e.g. CSS hex colours like `#c68642`),
 * inside double-quoted strings, or immediately after `=` (bare hex values
 * like `bg=#0f0f1a` in scene declarations).
 *
 * Rules:
 *   - `#` at depth 0, outside a string, not preceded by `=` → start of comment
 *   - `#` inside `(...)` or inside `"..."` → literal character
 *   - `#` immediately after `=` (last non-space char) → hex value literal
 */
function stripComment(line: string): string {
  let depth = 0;
  let inString = false;
  let lastNonSpace = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inString = !inString; lastNonSpace = ch; continue; }
    if (inString) continue;
    if (ch === '(') { depth++; lastNonSpace = ch; continue; }
    if (ch === ')') { depth--; lastNonSpace = ch; continue; }
    if (ch === '#' && depth === 0 && lastNonSpace !== '=') return line.slice(0, i);
    if (ch !== ' ' && ch !== '\t') lastNonSpace = ch;
  }
  return line;
}

/**
 * Splits a comma-delimited string while respecting parentheses depth and
 * double-quoted strings. Used for both event params and `with` modifiers.
 *   `to=(300,250), dur=1.0` → [`to=(300,250)`, ` dur=1.0`]
 */
function splitByComma(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inString = false;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
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
// Action vocabulary
// ---------------------------------------------------------------------------

/** Actions available on every actor type. */
const UNIVERSAL_ACTIONS = new Set<string>([
  "enter",
  "exit",
  "move",
  "fade_in",
  "fade_out",
  "scale",
  "rotate",
  "shake",
  "say",
  "throw",
  "play",
]);

/** Actions that only make sense on a `figure` actor. */
const FIGURE_ONLY_ACTIONS = new Set<string>([
  "punch",
  "kick",
  "wave",
  "nod",
  "jump",
  "bounce",
  "face",
  "rotate_part",
  "pose",
]);

/** Actions the reserved `camera` actor supports. */
const CAMERA_ACTIONS = new Set<string>(["pan", "zoom", "shake"]);

function isKnownAction(actorType: ActorDef["type"] | "camera", action: string): boolean {
  if (actorType === "camera") return CAMERA_ACTIONS.has(action);
  if (UNIVERSAL_ACTIONS.has(action)) return true;
  return FIGURE_ONLY_ACTIONS.has(action);
}

// ---------------------------------------------------------------------------
// Actor modifier parsing
// ---------------------------------------------------------------------------

type ModifierKey = "scale" | "rotate" | "opacity" | "size" | "z";
const MODIFIER_KEYS = new Set<ModifierKey>(["scale", "rotate", "opacity", "size", "z"]);
type Modifiers = Partial<Pick<ActorDef, ModifierKey>>;

/**
 * Parses space-separated modifier pairs that follow the actor position
 * (e.g. `scale 0.4 opacity 0.9` → { scale: 0.4, opacity: 0.9 }).
 *
 * This is one of two equivalent modifier forms — the other is the unified
 * `with key=val, key=val` form. Both can appear on the same line (space
 * form first, then `with`).
 *
 * Unknown keys are recorded as warnings rather than silently dropped so
 * tooling can surface typos.
 */
function parseSpaceModifiers(
  raw: string,
  lineNum: number,
  warnings: ParseWarning[],
): Modifiers {
  const result: Modifiers = {};
  const tokens = raw.trim().split(/\s+/).filter(Boolean);

  for (let i = 0; i + 1 < tokens.length; i += 2) {
    const key = tokens[i];
    const val = Number(tokens[i + 1]);
    if (Number.isNaN(val)) continue;
    if (MODIFIER_KEYS.has(key as ModifierKey)) {
      result[key as ModifierKey] = val;
    } else {
      warnings.push({
        kind: "unknown-modifier",
        message: `unknown modifier "${key}" — ignored`,
        line: lineNum,
      });
    }
  }

  return result;
}

/**
 * Parses the unified `with key=val, key=val` modifier form.
 * Unknown keys are recorded as warnings (never hard errors) so the
 * renderer can simply no-op them and tomorrow's parser can add them.
 */
function parseWithModifiers(
  raw: string,
  lineNum: number,
  warnings: ParseWarning[],
): Modifiers {
  const result: Modifiers = {};

  for (const token of splitByComma(raw)) {
    const t = token.trim();
    if (!t) continue;
    const eqIdx = t.indexOf("=");
    if (eqIdx === -1) {
      warnings.push({
        kind: "unknown-modifier",
        message: `expected "key=value" in with-clause, got "${t}"`,
        line: lineNum,
      });
      continue;
    }
    const key = t.slice(0, eqIdx).trim();
    const val = Number(t.slice(eqIdx + 1).trim());
    if (Number.isNaN(val)) {
      warnings.push({
        kind: "unknown-modifier",
        message: `modifier "${key}" needs a numeric value — ignored`,
        line: lineNum,
      });
      continue;
    }
    if (MODIFIER_KEYS.has(key as ModifierKey)) {
      result[key as ModifierKey] = val;
    } else {
      warnings.push({
        kind: "unknown-modifier",
        message: `unknown modifier "${key}" — ignored`,
        line: lineNum,
      });
    }
  }

  return result;
}

/**
 * Parses a modifier trailer that may be the space-separated form
 * (`scale 1.5 rotate 45`), the unified `with key=val, key=val` form,
 * or any mix of the two. The split point is the first standalone `with`
 * token; everything before it is parsed as space-separated pairs, and
 * everything after it is parsed as comma-delimited `key=val` entries.
 */
function parseActorTrailer(
  trailerRaw: string,
  lineNum: number,
  warnings: ParseWarning[],
): Modifiers {
  const trimmed = trailerRaw.trim();
  if (!trimmed) return {};

  // Find a standalone `with` token; anything before it is space form,
  // anything after it is with form.
  const withMatch = /(^|\s)with(\s|$)/.exec(trimmed);
  if (!withMatch) {
    return parseSpaceModifiers(trimmed, lineNum, warnings);
  }

  const before = trimmed.slice(0, withMatch.index).trim();
  const after = trimmed.slice(withMatch.index + withMatch[0].length).trim();

  const fromSpace = before ? parseSpaceModifiers(before, lineNum, warnings) : {};
  const fromWith = after ? parseWithModifiers(after, lineNum, warnings) : {};
  return { ...fromSpace, ...fromWith };
}

// ---------------------------------------------------------------------------
// Compiled regexes
// ---------------------------------------------------------------------------

const ASSET_RE = /^asset\s+(\w+)\s*=\s*(image|icon)\("([^"]+)"\)$/;

// Actor types known to the parser. User-defined templates (`def`) are also valid.
const BUILTIN_ACTOR_TYPES = new Set(["sprite", "text", "box", "figure", "caption"]);

// Captures: name, type, argsRaw, positionKind, xStr|anchor, yStr|'', trailer
//   • Numeric position: `at (x, y)`
//   • Caption anchor:   `at top | bottom | center`
// The anchor form only applies when typeName === "caption"; we still
// match it here so the caller can report a clear error otherwise.
// typeName accepts `chars.fighter` style dotted names so templates coming
// in via `import "..." as chars` resolve.
const ACTOR_NUM_POS_RE =
  /^actor\s+(\w+)\s*=\s*([\w.]+)\(([^)]*)\)\s+at\s+\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)(.*)$/;
const ACTOR_ANCHOR_POS_RE =
  /^actor\s+(\w+)\s*=\s*([\w.]+)\(([^)]*)\)\s+at\s+(top|bottom|center)\b(.*)$/;

// Timeline event. Action may be `!name` (must-understand) or plain `name`.
// The reserved actor `camera` participates like any other event actor.
const EVENT_RE = /^@([\d.]+):\s+(\w+)\.(!?\w+)\((.*)\)$/;

// Relative `@+N:` shorthand (resolved to absolute at parse time).
const REL_EVENT_RE = /^@\+([\d.]+):\s+(\w+)\.(!?\w+)\((.*)\)$/;

// var declaration: var <name> = <value>
const VAR_RE = /^var\s+(\w+)\s*=\s*(.+)$/;

// def header: def <name>(<params>) {
const DEF_HEADER_RE = /^def\s+(\w+)\(([^)]*)\)\s*\{$/;

// def body (single line inside braces): <actorType>(<args>)
const DEF_BODY_RE = /^\s*(sprite|text|box|figure|caption)\(([^)]*)\)\s*$/;

// seq header: seq <name> {  or  seq <name>(<params>) {
const SEQ_HEADER_RE = /^seq\s+(\w+)(?:\(([^)]*)\))?\s*\{$/;

// seq body line: @+<offset>: $.<action>(<params>)
const SEQ_EVENT_RE = /^@\+([\d.]+):\s+\$\.(!?\w+)\((.*)\)$/;

// `scene "title" {` — named chapter block.
const CHAPTER_HEADER_RE = /^scene\s+"([^"]+)"\s*\{$/;

// `import "path.markdy" as ns`
const IMPORT_RE = /^import\s+"([^"]+)"\s+as\s+(\w+)\s*$/;

// `preset <name>` with optional (args)
const PRESET_RE = /^preset\s+(\w+)(?:\s*\((.*)\))?\s*$/;

// ---------------------------------------------------------------------------
// Variable interpolation
// ---------------------------------------------------------------------------

/**
 * Replaces all `${name}` tokens in a string using the provided vars map.
 * Also handles the backslash-escaped form `\${name}` produced by
 * `String.raw` template literals in MDX files (where `\${name}` prevents
 * JavaScript from treating the braces as a JS template expression, but
 * `String.raw` preserves the backslash in the resulting string).
 * Unknown vars are left as-is (will cause a parse error later, which is fine).
 */
function interpolate(s: string, vars: Record<string, string>): string {
  // Identifier form, optionally dotted (e.g. `chars.skin` after import merge).
  // Each segment must start with a letter or underscore so things like
  // `${0.5}` (a literal interpolation with a number-looking "name") stay
  // intact — notably preserving `\${0.5}` produced by MDX String.raw.
  return s.replace(/\\?\$\{([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)\}/g, (_, name) =>
    vars[name] ?? `\${${name}}`,
  );
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

// Caption auto-anchor offsets, in fractions of scene dimensions.
const CAPTION_TOP_Y_FRAC = 0.12;
const CAPTION_BOTTOM_Y_FRAC = 0.88;
const CAPTION_CENTER_Y_FRAC = 0.5;

// Known scene header keys.
const KNOWN_SCENE_KEYS = new Set(["width", "height", "fps", "bg", "duration"]);

// ---------------------------------------------------------------------------
// Move-target bounds check
// ---------------------------------------------------------------------------

function validateMoveTarget(
  action: string,
  params: Record<string, unknown>,
  meta: SceneMeta,
  actor: string,
  line: number,
): void {
  if (action !== "move") return;
  const to = params.to;
  if (!Array.isArray(to) || to.length < 2) return;
  const [x, y] = to as [number, number];
  if (x < 0 || x > meta.width || y < 0 || y > meta.height) {
    throw new ParseError(
      `Actor "${actor}" move target (${x}, ${y}) is outside scene bounds (0–${meta.width}, 0–${meta.height})`,
      line,
    );
  }
}

// ---------------------------------------------------------------------------
// Public parser
// ---------------------------------------------------------------------------

export interface ParseOptions {
  /**
   * Pre-parsed ASTs for `import "path" as ns` declarations. The host
   * (CLI, bundler) is responsible for reading files from disk and
   * parsing them; the parser itself is pure.
   *
   * When an import's namespace is present here, its `vars`, `defs`,
   * and `seqs` are merged into the importing AST under the
   * `<ns>.<name>` prefix. Missing namespaces produce a soft warning.
   */
  imports?: Record<string, SceneAST>;

  /**
   * Internal flag — distinguishes a top-level call from a recursive
   * call used to expand a `preset`. Preset expansion bypasses the
   * "mixed preset and other statements" warning because the expanded
   * source is the only content.
   */
  _fromPreset?: boolean;
}

/**
 * Scope tracks the "previous event's end-time" used to resolve `@+N:`
 * shorthand. Each chapter has its own scope; the top level has one too.
 */
type TimeScope = {
  name: string; // "" for top-level, chapter name otherwise
  prevEnd: number;
};

export function parse(source: string, opts: ParseOptions = {}): SceneAST {
  // ── Detect sole-preset shorthand ──────────────────────────────────────────
  // `preset meme("top", "bottom")` as the only content expands to a full
  // scene. Mixed usage emits a warning and leaves the preset unparsed.
  if (!opts._fromPreset) {
    const expansion = tryExpandSolePreset(source);
    if (expansion) return parse(expansion, { ...opts, _fromPreset: true });
  }

  const ast: SceneAST = {
    meta: { ...DEFAULTS },
    assets: {},
    actors: {},
    events: [],
    defs: {},
    seqs: {},
    vars: {},
    chapters: [],
    warnings: [],
    imports: [],
  };

  let sceneFound = false;
  const lines = source.split(/\r?\n/);

  // ── State for multi-line blocks ───────────────────────────────────────────
  let inDef: { name: string; params: string[]; startLine: number } | null = null;
  let defNeedsClose = false; // after body line consumed, waiting for '}'
  let inSeq: { name: string; params: string[]; events: SequenceDef["events"]; startLine: number } | null = null;
  let inChapter: {
    name: string;
    startLine: number;
    /** Initial time the chapter's scope was opened at (inherited from top scope). */
    openedAt: number;
    /** Earliest event time seen inside this chapter. `Infinity` until an event fires. */
    earliestEventTime: number;
    scope: TimeScope;
  } | null = null;

  const topScope: TimeScope = { name: "", prevEnd: 0 };

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;

    // ── var: parse BEFORE comment stripping (value may contain #hex) ────────
    const rawUntouched = lines[i].trim();
    if (!inDef && !defNeedsClose && !inSeq && rawUntouched.startsWith("var ")) {
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

    // ── Closing brace for def / seq / chapter blocks ───────────────────────
    if (raw === "}") {
      if (defNeedsClose) { defNeedsClose = false; continue; }
      if (inDef) {
        throw new ParseError(`Empty def body for "${inDef.name}"`, lineNum);
      }
      if (inSeq) {
        ast.seqs[inSeq.name] = { params: inSeq.params, events: inSeq.events };
        inSeq = null;
        continue;
      }
      if (inChapter) {
        const endTime = inChapter.scope.prevEnd;
        // `startTime` reports the earliest wall-clock time an event in this
        // chapter fires. Fall back to `openedAt` for empty chapters so a
        // timeline UI still has a deterministic anchor to hang them on.
        const startTime =
          inChapter.earliestEventTime === Infinity
            ? inChapter.openedAt
            : Math.min(inChapter.openedAt, inChapter.earliestEventTime);
        ast.chapters.push({
          name: inChapter.name,
          startLine: inChapter.startLine,
          startTime,
          endTime,
        });
        // Chapters chain: the next chapter (or any top-level @+N event) starts
        // where this chapter ended. Authors can still reset by using absolute
        // times (@N:) at the start of a new chapter.
        if (endTime > topScope.prevEnd) topScope.prevEnd = endTime;
        inChapter = null;
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
      inSeq.events.push({ offset: Number(offsetStr), action, paramsRaw });
      continue;
    }

    // ── import ──────────────────────────────────────────────────────────────
    if (raw.startsWith("import ")) {
      const im = IMPORT_RE.exec(raw);
      if (!im) {
        throw new ParseError(`Invalid import declaration: ${raw}`, lineNum);
      }
      const [, path, namespace] = im;
      const decl: ImportDecl = { path, namespace, line: lineNum };
      ast.imports.push(decl);

      const resolved = opts.imports?.[namespace];
      if (!resolved) {
        ast.warnings.push({
          kind: "import-unresolved",
          message: `import "${path}" as ${namespace} — no pre-parsed AST supplied by host`,
          line: lineNum,
        });
      } else {
        for (const [k, v] of Object.entries(resolved.vars)) {
          ast.vars[`${namespace}.${k}`] = v;
        }
        for (const [k, v] of Object.entries(resolved.defs)) {
          ast.defs[`${namespace}.${k}`] = v;
        }
        for (const [k, v] of Object.entries(resolved.seqs)) {
          ast.seqs[`${namespace}.${k}`] = v;
        }
      }
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

    // ── scene — either chapter ("title" { ) or header (keys) ────────────────
    if (/^scene(\s|$)/.test(raw)) {
      const chm = CHAPTER_HEADER_RE.exec(raw);
      if (chm) {
        if (inChapter) {
          throw new ParseError(
            `Nested chapters are not supported; close chapter "${inChapter.name}" first`,
            lineNum,
          );
        }
        const chapterName = chm[1];
        inChapter = {
          name: chapterName,
          startLine: lineNum,
          openedAt: topScope.prevEnd,
          earliestEventTime: Infinity,
          scope: { name: chapterName, prevEnd: topScope.prevEnd },
        };
        continue;
      }

      // A scene-header statement (e.g. `scene width=800`) inside a chapter
      // block is almost certainly a typo — the author probably meant to open
      // another chapter but forgot the quotes/braces. Reject it so the
      // mistake surfaces at parse time rather than silently mutating meta.
      if (inChapter) {
        throw new ParseError(
          `scene header inside chapter "${inChapter.name}" is not allowed; close the chapter first or use 'scene "title" { ... }' for a nested section`,
          lineNum,
        );
      }

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
            if (KNOWN_SCENE_KEYS.has(key)) break;
            ast.warnings.push({
              kind: "unknown-scene-key",
              message: `unknown scene property "${key}" — ignored`,
              line: lineNum,
            });
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

    // ── preset (mixed use — soft warn and skip) ────────────────────────────
    if (raw.startsWith("preset ")) {
      ast.warnings.push({
        kind: "preset-mixed",
        message: "`preset` is a whole-file shorthand; mid-file presets are ignored",
        line: lineNum,
      });
      continue;
    }

    // ── actor ────────────────────────────────────────────────────────────────
    if (raw.startsWith("actor ")) {
      parseActorLine(raw, lineNum, ast);
      continue;
    }

    // ── event / play / @+N relative / camera ────────────────────────────────
    if (raw.startsWith("@")) {
      parseEventLine(raw, lineNum, ast, inChapter, topScope);
      continue;
    }

    throw new ParseError(`Unrecognized statement: ${raw}`, lineNum);
  }

  // Validate unclosed blocks
  if (inDef) {
    throw new ParseError(`Unclosed def block "${inDef.name}"`, inDef.startLine);
  }
  if (defNeedsClose) {
    throw new ParseError("Unclosed def block (missing '}')", lines.length);
  }
  if (inSeq) {
    throw new ParseError(`Unclosed seq block "${inSeq.name}"`, inSeq.startLine);
  }
  if (inChapter) {
    throw new ParseError(`Unclosed chapter "${inChapter.name}"`, inChapter.startLine);
  }

  // Auto-compute duration from the last event end-time when not explicitly set.
  if (ast.meta.duration === undefined) {
    let maxEnd = 0;
    for (const ev of ast.events) {
      const dur = typeof ev.params.dur === "number" ? ev.params.dur : 0;
      maxEnd = Math.max(maxEnd, ev.time + dur);
    }
    if (maxEnd > 0) ast.meta.duration = round3(maxEnd);
  }

  return ast;
}

// ---------------------------------------------------------------------------
// Actor line parsing
// ---------------------------------------------------------------------------

/**
 * Splits an actor call's argument list and strips surrounding quotes from
 * each token. Used for both built-in actor types and user-defined `def`
 * templates; the two paths both want the same "trim + dequote" behaviour.
 */
function parseActorCallArgs(argsRaw: string): string[] {
  if (!argsRaw.trim()) return [];
  return splitByComma(argsRaw).map((a) => {
    const t = a.trim();
    return t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1) : t;
  });
}

function parseActorLine(raw: string, lineNum: number, ast: SceneAST): void {
  // Try anchor-position form first; it's distinctive (`at top|bottom|center`).
  const amAnchor = ACTOR_ANCHOR_POS_RE.exec(raw);
  const amNum = amAnchor ? null : ACTOR_NUM_POS_RE.exec(raw);

  if (!amAnchor && !amNum) {
    throw new ParseError(`Invalid actor declaration: ${raw}`, lineNum);
  }

  let name: string;
  let typeName: string;
  let argsRaw: string;
  let x: number;
  let y: number;
  let anchor: ActorDef["anchor"] | undefined;
  let trailer: string;

  if (amAnchor) {
    const [, nm, tn, ar, an, tr] = amAnchor;
    name = nm;
    typeName = tn;
    argsRaw = ar;
    anchor = an as ActorDef["anchor"];
    trailer = tr;
    // Compute x/y from anchor + scene dims so renderers that ignore `anchor`
    // still place the caption approximately right.
    x = ast.meta.width / 2;
    switch (anchor) {
      case "top":    y = Math.round(ast.meta.height * CAPTION_TOP_Y_FRAC); break;
      case "bottom": y = Math.round(ast.meta.height * CAPTION_BOTTOM_Y_FRAC); break;
      default:       y = Math.round(ast.meta.height * CAPTION_CENTER_Y_FRAC); break;
    }
  } else {
    const [, nm, tn, ar, xs, ys, tr] = amNum!;
    name = nm;
    typeName = tn;
    argsRaw = ar;
    x = Number(xs);
    y = Number(ys);
    trailer = tr;
  }

  if (name === "camera") {
    throw new ParseError(
      `"camera" is a reserved actor name; drop this declaration and use camera.pan/zoom/shake directly`,
      lineNum,
    );
  }

  // Anchor syntax is only meaningful for caption actors.
  if (anchor && typeName !== "caption") {
    throw new ParseError(
      `anchor syntax "at ${anchor}" only applies to caption actors; got ${typeName}`,
      lineNum,
    );
  }

  // Resolve type: either built-in or a user-defined template (def).
  const rawArgs = parseActorCallArgs(argsRaw);
  let resolvedType: ActorDef["type"];
  let resolvedArgs: string[];

  if (BUILTIN_ACTOR_TYPES.has(typeName)) {
    resolvedType = typeName as ActorDef["type"];
    resolvedArgs = rawArgs;
  } else if (ast.defs[typeName]) {
    const tmpl = ast.defs[typeName];
    const localVars: Record<string, string> = {};
    for (let pi = 0; pi < tmpl.params.length; pi++) {
      localVars[tmpl.params[pi]] = rawArgs[pi] ?? "";
    }
    resolvedType = tmpl.actorType;
    resolvedArgs = tmpl.bodyArgs.map((a) => interpolate(a, localVars));
  } else {
    throw new ParseError(`Unknown actor type or template: "${typeName}"`, lineNum);
  }

  const modifiers = parseActorTrailer(trailer, lineNum, ast.warnings);

  // Captions use the scene anchor; numeric positioning only applies to
  // non-caption actors, where we enforce scene-bounds.
  if (!anchor && (x < 0 || x > ast.meta.width || y < 0 || y > ast.meta.height)) {
    throw new ParseError(
      `Actor "${name}" position (${x}, ${y}) is outside scene bounds (0–${ast.meta.width}, 0–${ast.meta.height})`,
      lineNum,
    );
  }

  ast.actors[name] = {
    type: resolvedType,
    args: resolvedArgs,
    x,
    y,
    ...modifiers,
    ...(anchor ? { anchor } : {}),
  };
}

// ---------------------------------------------------------------------------
// Event line parsing
// ---------------------------------------------------------------------------

function parseEventLine(
  raw: string,
  lineNum: number,
  ast: SceneAST,
  inChapter: {
    name: string;
    scope: TimeScope;
    earliestEventTime: number;
  } | null,
  topScope: TimeScope,
): void {
  const scope = inChapter?.scope ?? topScope;
  const recordEventTime = (t: number): void => {
    if (inChapter && t < inChapter.earliestEventTime) {
      inChapter.earliestEventTime = t;
    }
  };

  const rel = REL_EVENT_RE.exec(raw);
  const abs = rel ? null : EVENT_RE.exec(raw);

  if (!rel && !abs) {
    throw new ParseError(`Invalid event: ${raw}`, lineNum);
  }

  let time: number;
  let actor: string;
  let actionToken: string;
  let paramsRaw: string;

  if (rel) {
    const [, offsetStr, act, action, pr] = rel;
    const offset = Number(offsetStr);
    if (Number.isNaN(offset)) {
      throw new ParseError(`Invalid @+offset value: ${offsetStr}`, lineNum);
    }
    time = round3(scope.prevEnd + offset);
    actor = act;
    actionToken = action;
    paramsRaw = pr;
  } else {
    const [, timeStr, act, action, pr] = abs!;
    const t = Number(timeStr);
    if (Number.isNaN(t)) {
      throw new ParseError(`Invalid time value: ${timeStr}`, lineNum);
    }
    time = t;
    actor = act;
    actionToken = action;
    paramsRaw = pr;
  }

  // Must-understand prefix: `!action` hard-fails if the action is unknown.
  const mustUnderstand = actionToken.startsWith("!");
  const action = mustUnderstand ? actionToken.slice(1) : actionToken;

  // Camera — reserved actor with its own action set.
  if (actor === "camera") {
    if (!CAMERA_ACTIONS.has(action)) {
      if (mustUnderstand) {
        throw new ParseError(`Unknown camera action "${action}"`, lineNum);
      }
      ast.warnings.push({
        kind: "unknown-camera-action",
        message: `unknown camera action "${action}" — renderer will no-op`,
        line: lineNum,
      });
    }
    const params = parseActionParams(action, paramsRaw);
    recordEventTime(time);
    pushEvent(ast, scope, {
      time,
      actor: "camera",
      action,
      params,
      line: lineNum,
      ...(inChapter ? { chapter: inChapter.name } : {}),
    });
    return;
  }

  // Regular actor.
  const actorDef = ast.actors[actor];
  if (!actorDef) {
    throw new ParseError(`Unknown actor: "${actor}"`, lineNum);
  }

  // ── play(<seqName>, params...) → expand seq inline ────────────────────────
  if (action === "play") {
    const playParts = splitByComma(paramsRaw);
    const seqName = playParts[0]?.trim();
    if (!seqName || !ast.seqs[seqName]) {
      throw new ParseError(`Unknown sequence: "${seqName}"`, lineNum);
    }
    const seq = ast.seqs[seqName];

    const playVars: Record<string, string> = {};
    for (let pi = 1; pi < playParts.length; pi++) {
      const eqIdx = playParts[pi].indexOf("=");
      if (eqIdx !== -1) {
        const k = playParts[pi].slice(0, eqIdx).trim();
        const v = playParts[pi].slice(eqIdx + 1).trim();
        playVars[k] = v;
      }
    }
    let posIdx = 0;
    for (let pi = 1; pi < playParts.length; pi++) {
      if (!playParts[pi].includes("=") && posIdx < seq.params.length) {
        playVars[seq.params[posIdx]] = playParts[pi].trim();
        posIdx++;
      }
    }

    for (const sev of seq.events) {
      const expandedParams = interpolate(sev.paramsRaw, playVars);
      const absTime = round3(time + sev.offset);
      const sevMustUnderstand = sev.action.startsWith("!");
      const sevAction = sevMustUnderstand ? sev.action.slice(1) : sev.action;
      validateActionForActor(sevAction, actorDef, sevMustUnderstand, lineNum, ast.warnings);
      const params = parseActionParams(sevAction, expandedParams);
      validateMoveTarget(sevAction, params, ast.meta, actor, lineNum);
      recordEventTime(absTime);
      pushEvent(ast, scope, {
        time: absTime,
        actor,
        action: sevAction,
        params,
        line: lineNum,
        ...(inChapter ? { chapter: inChapter.name } : {}),
      });
    }
    return;
  }

  validateActionForActor(action, actorDef, mustUnderstand, lineNum, ast.warnings);
  const params = parseActionParams(action, paramsRaw);
  validateMoveTarget(action, params, ast.meta, actor, lineNum);
  recordEventTime(time);
  pushEvent(ast, scope, {
    time,
    actor,
    action,
    params,
    line: lineNum,
    ...(inChapter ? { chapter: inChapter.name } : {}),
  });
}

// ---------------------------------------------------------------------------
// Event push + scope time tracking
// ---------------------------------------------------------------------------

function pushEvent(ast: SceneAST, scope: TimeScope, ev: TimelineEvent): void {
  ast.events.push(ev);
  const dur = typeof ev.params.dur === "number" ? ev.params.dur : 0;
  const endTime = round3(ev.time + dur);
  if (endTime > scope.prevEnd) scope.prevEnd = endTime;
}

// ---------------------------------------------------------------------------
// Action type-check
// ---------------------------------------------------------------------------

function validateActionForActor(
  action: string,
  actorDef: ActorDef,
  mustUnderstand: boolean,
  lineNum: number,
  warnings: ParseWarning[],
): void {
  if (FIGURE_ONLY_ACTIONS.has(action)) {
    if (actorDef.type !== "figure") {
      throw new ParseError(
        `action "${action}" is figure-only; actor type is "${actorDef.type}"`,
        lineNum,
      );
    }
    return;
  }
  if (isKnownAction(actorDef.type, action)) return;

  if (mustUnderstand) {
    throw new ParseError(`Unknown action "${action}" (must-understand form)`, lineNum);
  }
  warnings.push({
    kind: "unknown-action",
    message: `unknown action "${action}" on ${actorDef.type} actor — renderer will no-op`,
    line: lineNum,
  });
}

// ---------------------------------------------------------------------------
// Preset expansion
// ---------------------------------------------------------------------------

/**
 * Returns the expansion when the source is essentially `preset <name>(...)`
 * with no other content (apart from blank lines and comments). Otherwise
 * returns null and the caller parses the source verbatim.
 */
function tryExpandSolePreset(source: string): string | null {
  const lines = source.split(/\r?\n/);
  let presetLine: string | null = null;
  for (const raw of lines) {
    const stripped = stripComment(raw).trim();
    if (!stripped) continue;
    if (stripped.startsWith("preset ")) {
      if (presetLine) return null;
      presetLine = stripped;
    } else {
      return null;
    }
  }
  if (!presetLine) return null;
  const pm = PRESET_RE.exec(presetLine);
  if (!pm) return null;
  const [, name, argsRaw] = pm;
  const fn = PRESETS[name];
  if (!fn) return null;
  const args = argsRaw
    ? splitByComma(argsRaw).map((a) => {
        const t = a.trim();
        return t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1) : t;
      })
    : [];
  return fn(args);
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

/** Rounds to 3 decimals to keep event-time arithmetic deterministic. */
function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
