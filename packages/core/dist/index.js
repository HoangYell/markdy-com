// src/parser.ts
var ParseError = class extends Error {
  constructor(message, line) {
    super(`Line ${line}: ${message}`);
    this.line = line;
    this.name = "ParseError";
  }
  line;
};
function splitByComma(s) {
  const parts = [];
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
function parseValue(s) {
  const t = s.trim();
  if (t.startsWith('"') && t.endsWith('"')) {
    return t.slice(1, -1);
  }
  if (t.startsWith("(") && t.endsWith(")")) {
    const inner = t.slice(1, -1);
    return inner.split(",").map((p) => {
      const v = p.trim();
      const n2 = Number(v);
      return Number.isNaN(n2) ? v : n2;
    });
  }
  const n = Number(t);
  if (!Number.isNaN(n) && t !== "") return n;
  return t;
}
var POSITIONAL_KEYS = {
  say: ["text"],
  throw: ["asset"]
};
function parseActionParams(action, raw) {
  const params = {};
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
function parseModifiers(raw) {
  const result = {};
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
var ASSET_RE = /^asset\s+(\w+)\s*=\s*(image|icon)\("([^"]+)"\)$/;
var ACTOR_RE = /^actor\s+(\w+)\s*=\s*(sprite|text|box|figure)\(([^)]*)\)\s+at\s+\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)(.*)$/;
var EVENT_RE = /^@([\d.]+):\s+(\w+)\.(\w+)\((.*)\)$/;
var DEFAULTS = {
  width: 800,
  height: 400,
  fps: 30,
  bg: "white"
};
function parse(source) {
  const ast = {
    meta: { ...DEFAULTS },
    assets: {},
    actors: {},
    events: []
  };
  let sceneFound = false;
  const lines = source.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const raw = lines[i].replace(/#.*$/, "").trim();
    if (!raw) continue;
    if (/^scene(\s|$)/.test(raw)) {
      if (sceneFound) {
        throw new ParseError("Duplicate scene declaration", lineNum);
      }
      sceneFound = true;
      for (const [, key, val] of raw.matchAll(/(\w+)=([\S]+)/g)) {
        switch (key) {
          case "width":
            ast.meta.width = Number(val);
            break;
          case "height":
            ast.meta.height = Number(val);
            break;
          case "fps":
            ast.meta.fps = Number(val);
            break;
          case "bg":
            ast.meta.bg = val;
            break;
          case "duration":
            ast.meta.duration = Number(val);
            break;
          default:
            throw new ParseError(`Unknown scene property: ${key}`, lineNum);
        }
      }
      continue;
    }
    if (raw.startsWith("asset")) {
      const m = ASSET_RE.exec(raw);
      if (!m) {
        throw new ParseError(`Invalid asset declaration: ${raw}`, lineNum);
      }
      const [, name, type, value] = m;
      ast.assets[name] = { type, value };
      continue;
    }
    if (raw.startsWith("actor")) {
      const m = ACTOR_RE.exec(raw);
      if (!m) {
        throw new ParseError(`Invalid actor declaration: ${raw}`, lineNum);
      }
      const [, name, type, argsRaw, xStr, yStr, modifiersRaw] = m;
      const args = argsRaw.trim() ? splitByComma(argsRaw).map((a) => {
        const t = a.trim();
        return t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1) : t;
      }) : [];
      const modifiers = parseModifiers(modifiersRaw);
      ast.actors[name] = {
        type,
        args,
        x: Number(xStr),
        y: Number(yStr),
        ...modifiers
      };
      continue;
    }
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
  if (ast.meta.duration === void 0) {
    let maxEnd = 0;
    for (const ev of ast.events) {
      const dur = typeof ev.params.dur === "number" ? ev.params.dur : 0;
      maxEnd = Math.max(maxEnd, ev.time + dur);
    }
    if (maxEnd > 0) ast.meta.duration = maxEnd;
  }
  return ast;
}
export {
  ParseError,
  parse
};
