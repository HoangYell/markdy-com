// src/parser.ts
var ParseError = class extends Error {
  constructor(message, line) {
    super(`Line ${line}: ${message}`);
    this.line = line;
    this.name = "ParseError";
  }
  line;
};
function stripComment(line) {
  let depth = 0;
  let inString = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "(") {
      depth++;
      continue;
    }
    if (ch === ")") {
      depth--;
      continue;
    }
    if (ch === "#" && depth === 0) return line.slice(0, i);
  }
  return line;
}
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
var BUILTIN_ACTOR_TYPES = /* @__PURE__ */ new Set(["sprite", "text", "box", "figure"]);
var ACTOR_RE = /^actor\s+(\w+)\s*=\s*(\w+)\(([^)]*)\)\s+at\s+\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)(.*)$/;
var EVENT_RE = /^@([\d.]+):\s+(\w+)\.(\w+)\((.*)\)$/;
var VAR_RE = /^var\s+(\w+)\s*=\s*(.+)$/;
var DEF_HEADER_RE = /^def\s+(\w+)\(([^)]*)\)\s*\{$/;
var DEF_BODY_RE = /^\s*(sprite|text|box|figure)\(([^)]*)\)\s*$/;
var SEQ_HEADER_RE = /^seq\s+(\w+)(?:\(([^)]*)\))?\s*\{$/;
var SEQ_EVENT_RE = /^@\+([\d.]+):\s+\$\.(\w+)\((.*)\)$/;
function interpolate(s, vars) {
  return s.replace(/\$\{(\w+)\}/g, (_, name) => vars[name] ?? `\${${name}}`);
}
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
    events: [],
    defs: {},
    seqs: {},
    vars: {}
  };
  let sceneFound = false;
  const lines = source.split(/\r?\n/);
  let inDef = null;
  let defNeedsClose = false;
  let inSeq = null;
  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
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
    let raw = stripComment(lines[i]).trim();
    if (!raw) continue;
    raw = interpolate(raw, ast.vars);
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
    if (inDef) {
      const bm = DEF_BODY_RE.exec(raw);
      if (!bm) {
        throw new ParseError(`Invalid def body (expected "type(args)"): ${raw}`, lineNum);
      }
      const [, actorType, bodyArgsRaw] = bm;
      const bodyArgs = bodyArgsRaw.trim() ? splitByComma(bodyArgsRaw).map((a) => a.trim()) : [];
      ast.defs[inDef.name] = {
        params: inDef.params,
        actorType,
        bodyArgs
      };
      inDef = null;
      defNeedsClose = true;
      continue;
    }
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
        paramsRaw
      });
      continue;
    }
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
    if (raw.startsWith("seq ")) {
      const sm = SEQ_HEADER_RE.exec(raw);
      if (!sm) {
        throw new ParseError(`Invalid seq declaration: ${raw}`, lineNum);
      }
      const [, name, paramsRaw] = sm;
      const params = paramsRaw ? paramsRaw.split(",").map((p) => p.trim()).filter(Boolean) : [];
      inSeq = { name, params, events: [], startLine: lineNum };
      continue;
    }
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
      const [, name, typeName, argsRaw, xStr, yStr, modifiersRaw] = m;
      let resolvedType;
      let resolvedArgs;
      if (BUILTIN_ACTOR_TYPES.has(typeName)) {
        resolvedType = typeName;
        resolvedArgs = argsRaw.trim() ? splitByComma(argsRaw).map((a) => {
          const t = a.trim();
          return t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1) : t;
        }) : [];
      } else if (ast.defs[typeName]) {
        const tmpl = ast.defs[typeName];
        const callArgs = argsRaw.trim() ? splitByComma(argsRaw).map((a) => {
          const t = a.trim();
          return t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1) : t;
        }) : [];
        const localVars = {};
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
      if (action === "play") {
        const playParts = splitByComma(paramsRaw);
        const seqName = playParts[0]?.trim();
        if (!seqName || !ast.seqs[seqName]) {
          throw new ParseError(`Unknown sequence: "${seqName}"`, lineNum);
        }
        const seq = ast.seqs[seqName];
        const playVars = {};
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
          const absTime = Math.round((time + sev.offset) * 1e3) / 1e3;
          const params2 = parseActionParams(sev.action, expandedParams);
          ast.events.push({
            time: absTime,
            actor,
            action: sev.action,
            params: params2,
            line: lineNum
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
  if (inDef) {
    throw new ParseError(`Unclosed def block "${inDef.name}"`, inDef.startLine);
  }
  if (defNeedsClose) {
    throw new ParseError("Unclosed def block (missing '}')", lines.length);
  }
  if (inSeq) {
    throw new ParseError(`Unclosed seq block "${inSeq.name}"`, inSeq.startLine);
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
