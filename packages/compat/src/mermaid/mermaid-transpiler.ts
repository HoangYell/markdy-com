/**
 * packages/compat/src/mermaid/mermaid-transpiler.ts
 * Transpiles Mermaid Flowcharts, Sequence Diagrams, and State Diagrams into animated MarkdyScript.
 * Zero external dependencies.
 */

export interface MermaidTranspileResult {
  code: string;
  diagramType: "architecture" | "sequence" | "flowchart" | "state";
  nodeCount: number;
  edgeCount: number;
  groupCount?: number;
  warnings?: string[];
}

const RESERVED_IDS = new Set([
  "scene", "layout", "group", "beat", "style", "pattern", "use", "edge",
  "annotation", "var", "player", "show", "hide", "glow", "focus", "frame",
]);

function sanitizeId(id: string, fallback = "node"): string {
  let cleaned = id.trim().replace(/[^a-zA-Z0-9_]/g, "_").replace(/^_+|_+$/g, "");
  if (!cleaned || /^[0-9]/.test(cleaned)) {
    cleaned = `${fallback}_${cleaned || "item"}`;
  }
  if (RESERVED_IDS.has(cleaned)) {
    cleaned = `${cleaned}_node`;
  }
  return cleaned;
}

function cleanLabel(raw: string): string {
  let s = raw.trim();
  const pairs: Array<[string, string]> = [
    ["[(", ")]"],
    ["[[", "]]"],
    ["([", "])"],
    ["((", "))"],
    ["{{", "}}"],
    ["[/", "/]"],
    ["[\\", "\\]"],
    ["[", "]"],
    ["{", "}"],
    ["(", ")"],
  ];
  for (const [open, close] of pairs) {
    if (s.startsWith(open) && s.endsWith(close) && s.length >= open.length + close.length) {
      s = s.slice(open.length, s.length - close.length).trim();
      break;
    }
  }
  return s
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/"/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMermaidBracket(body?: string): string | undefined {
  if (!body) return undefined;
  for (const prefix of ["[(", "[[", "([", "((", "{{", "[/", "[\\"]) {
    if (body.startsWith(prefix)) return prefix;
  }
  return body.slice(0, 1);
}

function inferKindFromMermaid(id: string, label: string, shapeBracket?: string): string {
  const text = `${id} ${label}`.toLowerCase();
  if (shapeBracket === "{") return "decision";
  if (/(cache|redis|memcached|varnish)/.test(text)) return "cache";
  if (shapeBracket === "[(" || shapeBracket === ")]" || /(db|database|sql|postgres|mysql|mongo|dynamo|sqlite|aurora)/.test(text)) {
    return "database";
  }
  if (shapeBracket === "{{") {
    return /(gateway|proxy|ingress|lb|alb|nginx|envoy)/.test(text) && !/(queue|kafka|rabbitmq|sqs|event|bus|pubsub|nats)/.test(text)
      ? "gateway"
      : "queue";
  }
  if (shapeBracket === "([") {
    if (/(user|customer|actor)/.test(text)) return "user";
    if (/^(start|begin|init|entry)\b/.test(text)) return "start";
    if (/^(end|done|finish|stop|exit)\b/.test(text)) return "end";
    return "browser";
  }
  if (/(queue|kafka|rabbitmq|sqs|event|bus|pubsub|nats)/.test(text)) {
    return "queue";
  }
  if (/(decision|check|valid|condition|branch|if_)/.test(text)) {
    return "decision";
  }
  if (/(gateway|proxy|ingress|lb|alb|nginx|envoy)/.test(text)) {
    return "gateway";
  }
  if (shapeBracket === "((" || /(client|user|browser|ui|app|web|frontend|mobile)/.test(text)) {
    return /(user|customer|actor)/.test(text) ? "user" : "browser";
  }
  if (/(storage|s3|bucket|blob|disk|volume)/.test(text)) return "storage";
  if (/(worker|cron|job|lambda|function|consumer)/.test(text)) return "worker";
  if (/(firewall|waf|auth|oauth|oidc|vault|security)/.test(text)) return "auth";
  return "service";
}

export function transpileMermaidToMarkdy(mermaidSource: string, sceneTitle = "Imported Diagram"): MermaidTranspileResult {
  const lines = mermaidSource
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("%%"));

  if (lines.length === 0) {
    return {
      code: `scene theme=paper\nlayout LR\n`,
      diagramType: "architecture",
      nodeCount: 0,
      edgeCount: 0,
      groupCount: 0,
      warnings: [],
    };
  }

  const firstLine = lines[0].toLowerCase();

  // ── SEQUENCE DIAGRAM ──────────────────────────────────────────────
  if (firstLine.startsWith("sequencediagram")) {
    return transpileSequenceDiagram(lines.slice(1), sceneTitle);
  }

  // ── STATE DIAGRAM ─────────────────────────────────────────────────
  if (firstLine.startsWith("statediagram")) {
    return transpileStateDiagram(lines.slice(1), sceneTitle);
  }

  // ── FLOWCHART / GRAPH ─────────────────────────────────────────────
  return transpileFlowchart(lines, sceneTitle);
}

function transpileSequenceDiagram(lines: string[], title: string): MermaidTranspileResult {
  const participants = new Map<string, { id: string; label: string; kind: string }>();
  const messages: Array<{ from: string; to: string; label: string; kind: "->" | "<-" | "~>" }> = [];
  const warnings: string[] = [];

  for (const line of lines) {
    if (/^(autonumber|activate|deactivate|note\b|alt\b|else\b|opt\b|loop\b|par\b|and\b|critical\b|option\b|break\b|rect\b|box\b|end\b|title\b|link\b|links\b)/i.test(line)) {
      continue;
    }

    const partMatch = /^(?:participant|actor)\s+("[^"]+"|[^\s]+)(?:\s+as\s+(.+))?$/i.exec(line);
    if (partMatch) {
      const rawAlias = partMatch[1].replace(/^["']|["']$/g, "");
      const id = sanitizeId(rawAlias);
      const label = partMatch[2] ? cleanLabel(partMatch[2]) : rawAlias;
      const isActor = line.toLowerCase().startsWith("actor");
      const kind = isActor ? "user" : inferKindFromMermaid(id, label);
      participants.set(id, { id, label, kind });
      continue;
    }

    const msgMatch = /^([a-zA-Z0-9_-]+?)\s*(-->>|->>|-->|->|-\)|--x|-x|~>)[+-]?\s*([a-zA-Z0-9_-]+)\s*:\s*(.*)$/.exec(line);
    if (msgMatch) {
      const from = sanitizeId(msgMatch[1]);
      const arrow = msgMatch[2];
      const to = sanitizeId(msgMatch[3]);
      const label = cleanLabel(msgMatch[4] || "call") || "call";

      if (!participants.has(from)) participants.set(from, { id: from, label: from, kind: inferKindFromMermaid(from, from) });
      if (!participants.has(to)) participants.set(to, { id: to, label: to, kind: inferKindFromMermaid(to, to) });

      let kind: "->" | "<-" | "~>" = "->";
      if (arrow === "-->>" || arrow === "-->" || arrow === "--x") kind = "<-";
      else if (arrow === "~>" || arrow === "-)") kind = "~>";

      messages.push({ from, to, label, kind });
      continue;
    }

    warnings.push(`Skipped sequence directive: ${line.slice(0, 60)}`);
  }

  const out: string[] = [];
  out.push(title ? `scene "${cleanLabel(title)}" type=sequence theme=paper` : `scene type=sequence theme=paper`);
  out.push("");

  for (const p of participants.values()) {
    out.push(`${p.kind} ${p.id} "${p.label}"`);
  }

  out.push("");
  out.push("beat main:");
  out.push("  show $nodes");

  for (const msg of messages) {
    if (msg.kind === "<-") {
      out.push(`  ${msg.to} <- ${msg.from} "${msg.label}"`);
    } else {
      out.push(`  ${msg.from} ${msg.kind} ${msg.to} "${msg.label}"`);
    }
  }

  return {
    code: out.join("\n"),
    diagramType: "sequence",
    nodeCount: participants.size,
    edgeCount: messages.length,
    groupCount: 0,
    warnings,
  };
}

function transpileStateDiagram(lines: string[], title: string): MermaidTranspileResult {
  let direction = "LR";
  const states = new Map<string, { id: string; label: string; kind: string }>();
  const groups = new Map<string, { id: string; label: string; members: string[] }>();
  const transitions: Array<{ from: string; to: string; label?: string }> = [];
  const warnings: string[] = [];
  let currentGroup: { id: string; label: string; members: string[] } | null = null;

  const ensureState = (raw: string, isTarget: boolean): string => {
    if (raw === "[*]") {
      const id = isTarget ? "EndState" : "StartState";
      if (!states.has(id)) {
        states.set(id, {
          id,
          label: isTarget ? "End" : "Start",
          kind: isTarget ? "end" : "start",
        });
      }
      return id;
    }
    const id = sanitizeId(raw, "state");
    if (!states.has(id)) {
      states.set(id, { id, label: raw.replace(/_/g, " "), kind: "state" });
    }
    if (currentGroup && !currentGroup.members.includes(id)) {
      currentGroup.members.push(id);
    }
    return id;
  };

  for (const line of lines) {
    const dirMatch = /^direction\s+(lr|rl|tb|td|bt)\b/i.exec(line);
    if (dirMatch) {
      direction = dirMatch[1].toUpperCase() === "TD" ? "TB" : dirMatch[1].toUpperCase();
      continue;
    }
    if (/^(note\b|classdef\b|class\b|style\b|hide\b)/i.test(line)) continue;

    const compositeMatch = /^state\s+(?:"([^"]+)"\s+as\s+)?([a-zA-Z0-9_-]+)\s*\{$/i.exec(line);
    if (compositeMatch) {
      const id = sanitizeId(compositeMatch[2], "state_group");
      const label = compositeMatch[1] ? cleanLabel(compositeMatch[1]) : id;
      currentGroup = { id, label, members: [] };
      groups.set(id, currentGroup);
      continue;
    }
    if (line === "}" && currentGroup) {
      currentGroup = null;
      continue;
    }

    const stateAliasMatch = /^state\s+"([^"]+)"\s+as\s+([a-zA-Z0-9_-]+)$/i.exec(line);
    if (stateAliasMatch) {
      const id = sanitizeId(stateAliasMatch[2], "state");
      const label = cleanLabel(stateAliasMatch[1]);
      states.set(id, { id, label, kind: "state" });
      if (currentGroup && !currentGroup.members.includes(id)) currentGroup.members.push(id);
      continue;
    }

    const stateDescMatch = /^([a-zA-Z0-9_-]+)\s*:\s*(.+)$/.exec(line);
    if (stateDescMatch && !line.includes("-->") && !line.includes("->")) {
      const id = sanitizeId(stateDescMatch[1], "state");
      const label = cleanLabel(stateDescMatch[2]);
      states.set(id, { id, label, kind: "state" });
      if (currentGroup && !currentGroup.members.includes(id)) currentGroup.members.push(id);
      continue;
    }

    const transMatch = /^(\[\*\]|[a-zA-Z0-9_-]+)\s*(-->|->)\s*(\[\*\]|[a-zA-Z0-9_-]+)(?:\s*:\s*(.+))?$/.exec(line);
    if (transMatch) {
      const from = ensureState(transMatch[1], false);
      const to = ensureState(transMatch[3], true);
      const label = transMatch[4] ? cleanLabel(transMatch[4]) : undefined;
      transitions.push({ from, to, label });
      continue;
    }

    warnings.push(`Skipped state directive: ${line.slice(0, 60)}`);
  }

  const out: string[] = [];
  out.push(title ? `scene "${cleanLabel(title)}" type=state theme=paper` : `scene type=state theme=paper`);
  out.push(`layout ${direction}`);
  out.push("");

  for (const g of groups.values()) {
    if (g.members.length > 0) {
      out.push(`group ${g.id} "${g.label}": ${g.members.join(" ")}`);
    }
  }
  if (groups.size > 0) out.push("");

  for (const s of states.values()) {
    out.push(`${s.kind} ${s.id} "${s.label}"`);
  }

  out.push("");
  out.push('beat transitions "State Machine Flow":');
  out.push("  show $nodes stagger=60ms");
  for (const tr of transitions) {
    out.push(tr.label ? `  ${tr.from} -> ${tr.to} "${tr.label}"` : `  ${tr.from} -> ${tr.to}`);
  }

  return {
    code: out.join("\n"),
    diagramType: "state",
    nodeCount: states.size,
    edgeCount: transitions.length,
    groupCount: groups.size,
    warnings,
  };
}

const MERMAID_SHAPE_BODY =
  "\\[\\([^\\n]*?\\)\\]|\\[\\[[^\\n]*?\\]\\]|\\(\\[[^\\n]*?\\]\\)|\\(\\([^\\n]*?\\)\\)|\\{\\{[^\\n]*?\\}\\}|\\[\\/[^\\n]*?\\/\\]|\\[\\\\[^\\n]*?\\\\\\]|\\[[^\\n\\]]*?\\]|\\{[^\\n\\}]*?\\}|\\([^\\n\\)]*?\\)";

function parseMermaidNodeTokens(segment: string): Array<{ id: string; label?: string; bracket?: string }> {
  return segment
    .split("&")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const m = new RegExp(`^([a-zA-Z0-9_-]+)\\s*(${MERMAID_SHAPE_BODY})?$`).exec(part);
      if (!m) {
        const idMatch = /^([a-zA-Z0-9_-]+)/.exec(part);
        const raw = idMatch ? idMatch[1] : part;
        return { id: sanitizeId(raw) };
      }
      const rawId = m[1];
      const body = m[2];
      return {
        id: sanitizeId(rawId),
        label: body ? cleanLabel(body) : undefined,
        bracket: extractMermaidBracket(body),
      };
    });
}

const TOP_LEVEL_ARROW_RE = /^(<-->|-\.->|==>|<->|-->|---|->|-\.\s*([^.]+?)\s*\.->|==\s*([^=]+?)\s*==>|-\-\s*([^-]+?)\s*-->|--\s*([^-]+?)\s*---)/;

function findTopLevelEdges(line: string): Array<{ index: number; length: number; arrow: string; label?: string }> {
  const matches: Array<{ index: number; length: number; arrow: string; label?: string }> = [];
  let inQuote = false;
  let quoteChar = "";
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === "\\" && i + 1 < line.length) {
        i++;
        continue;
      }
      if (ch === quoteChar) inQuote = false;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inQuote = true;
      quoteChar = ch;
      continue;
    }
    if (ch === "(") { parenDepth++; continue; }
    if (ch === ")" && parenDepth > 0) { parenDepth--; continue; }
    if (ch === "[") { bracketDepth++; continue; }
    if (ch === "]" && bracketDepth > 0) { bracketDepth--; continue; }
    if (ch === "{") { braceDepth++; continue; }
    if (ch === "}" && braceDepth > 0) { braceDepth--; continue; }

    if (parenDepth > 0 || bracketDepth > 0 || braceDepth > 0) continue;

    if (ch !== "-" && ch !== "=" && ch !== "<") continue;
    const sub = line.slice(i);
    const am = TOP_LEVEL_ARROW_RE.exec(sub);
    if (!am) continue;

    let totalLen = am[0].length;
    const inlineLabel = am[2] || am[3] || am[4] || am[5];
    let pipeLabel: string | undefined;

    const afterArrow = line.slice(i + totalLen);
    const pipeMatch = /^\s*\|([^|]+)\|/.exec(afterArrow);
    if (pipeMatch) {
      pipeLabel = pipeMatch[1];
      totalLen += pipeMatch[0].length;
    }

    matches.push({
      index: i,
      length: totalLen,
      arrow: am[1],
      label: pipeLabel ? cleanLabel(pipeLabel) : inlineLabel ? cleanLabel(inlineLabel) : undefined,
    });
    i += totalLen - 1;
  }

  return matches;
}

function transpileFlowchart(lines: string[], title: string): MermaidTranspileResult {
  let direction = "LR";
  const first = lines[0].toLowerCase();
  if (first.startsWith("graph") || first.startsWith("flowchart")) {
    const dirMatch = /\b(lr|rl|tb|td|bt)\b/i.exec(first);
    if (dirMatch) {
      direction = dirMatch[1].toUpperCase();
      if (direction === "TD") direction = "TB";
    }
    lines = lines.slice(1);
  }

  const nodes = new Map<string, { id: string; label: string; kind: string }>();
  const groups = new Map<string, { id: string; label: string; members: string[] }>();
  const flows: Array<{ from: string; to: string; op: string; label?: string }> = [];
  const warnings: string[] = [];
  const ownedGroup = new Map<string, string>();
  const declaredOutsideGroup = new Set<string>();

  const groupStack: Array<{ id: string; label: string; members: string[] }> = [];

  const registerNode = (id: string, label?: string, bracket?: string) => {
    const existing = nodes.get(id);
    const activeGroup = groupStack[groupStack.length - 1];
    if (existing) {
      if (label && existing.label === existing.id) {
        existing.label = label;
        existing.kind = inferKindFromMermaid(id, label, bracket);
      }
      if (activeGroup && !ownedGroup.has(id) && (!declaredOutsideGroup.has(id) || Boolean(label))) {
        if (!activeGroup.members.includes(id)) activeGroup.members.push(id);
        ownedGroup.set(id, activeGroup.id);
      }
    } else {
      const finalLabel = label || id;
      nodes.set(id, { id, label: finalLabel, kind: inferKindFromMermaid(id, finalLabel, bracket) });
      if (activeGroup) {
        if (!activeGroup.members.includes(id)) activeGroup.members.push(id);
        ownedGroup.set(id, activeGroup.id);
      } else {
        declaredOutsideGroup.add(id);
      }
    }
  };

  const explicitNodeRe = new RegExp(`([a-zA-Z0-9_-]+)\\s*(${MERMAID_SHAPE_BODY})`, "g");

  for (const rawLine of lines) {
    const line = rawLine.replace(/;+\s*$/, "").trim();
    if (!line) continue;

    // Ignore styling / directive statements cleanly
    if (/^(classDef|class|style|linkStyle|click|direction|accTitle|accDescr)\b/i.test(line)) {
      continue;
    }

    const subMatch = /^subgraph\s+(.+)$/i.exec(line);
    if (subMatch) {
      const rest = subMatch[1].trim();
      let rawId = "";
      let label = "";

      const idBracket = /^([a-zA-Z0-9_-]+)\s*\[([^\]]+)\]$/.exec(rest);
      const idQuoted = /^([a-zA-Z0-9_-]+)\s+"([^"]+)"$/.exec(rest);
      const quotedOnly = /^"([^"]+)"$/.exec(rest);

      if (idBracket) {
        rawId = idBracket[1];
        label = cleanLabel(idBracket[2]);
      } else if (idQuoted) {
        rawId = idQuoted[1];
        label = cleanLabel(idQuoted[2]);
      } else if (quotedOnly) {
        rawId = `group_${groups.size + 1}`;
        label = cleanLabel(quotedOnly[1]);
      } else if (/^[a-zA-Z0-9_-]+$/.test(rest)) {
        rawId = rest;
        label = rest;
      } else {
        rawId = `group_${groups.size + 1}`;
        label = cleanLabel(rest);
      }

      const id = sanitizeId(rawId, "group");
      const grp = { id, label: label || id, members: [] };
      groups.set(id, grp);
      groupStack.push(grp);
      continue;
    }

    if (line === "end" && groupStack.length > 0) {
      groupStack.pop();
      continue;
    }

    // Check if the line contains edge operators outside brackets/quotes
    const edgeMatches = findTopLevelEdges(line);

    if (edgeMatches.length > 0) {
      // Split line into node segments around the matched arrows
      const segments: string[] = [];
      let cursor = 0;
      for (const m of edgeMatches) {
        segments.push(line.slice(cursor, m.index).trim());
        cursor = m.index + m.length;
      }
      segments.push(line.slice(cursor).trim());

      for (let i = 0; i < edgeMatches.length; i++) {
        const leftNodes = parseMermaidNodeTokens(segments[i] || "");
        const rightNodes = parseMermaidNodeTokens(segments[i + 1] || "");
        for (const ln of leftNodes) registerNode(ln.id, ln.label, ln.bracket);
        for (const rn of rightNodes) registerNode(rn.id, rn.label, rn.bracket);

        const arrow = edgeMatches[i].arrow;
        let op = "->";
        if (arrow === "<-->" || arrow === "<->") op = "<->";
        else if (arrow.includes("-.")) op = "~>";
        else if (arrow === "---" || arrow.endsWith("---")) op = "..>";

        for (const ln of leftNodes) {
          for (const rn of rightNodes) {
            flows.push({ from: ln.id, to: rn.id, op, label: edgeMatches[i].label });
          }
        }
      }
      continue;
    }

    // Standalone node definitions
    let match: RegExpExecArray | null;
    let matchedNode = false;
    explicitNodeRe.lastIndex = 0;
    while ((match = explicitNodeRe.exec(line)) !== null) {
      matchedNode = true;
      const id = sanitizeId(match[1]);
      const rawBody = match[2];
      const bracket = extractMermaidBracket(rawBody);
      const label = cleanLabel(rawBody) || id;
      registerNode(id, label, bracket);
    }

    if (!matchedNode && /^[a-zA-Z0-9_-]+$/.test(line)) {
      registerNode(sanitizeId(line));
    } else if (!matchedNode) {
      warnings.push(`Skipped unrecognized Mermaid line: ${line.slice(0, 60)}`);
    }
  }

  const hasFlowchartShapes = [...nodes.values()].some(
    (n) => n.kind === "decision" || n.kind === "condition" || n.kind === "start" || n.kind === "end"
  );
  const out: string[] = [];
  const typeAttr = hasFlowchartShapes ? " type=flowchart" : "";
  out.push(title ? `scene "${cleanLabel(title)}"${typeAttr} theme=paper` : `scene${typeAttr} theme=paper`);
  out.push(`layout ${direction}`);
  out.push("");

  for (const g of groups.values()) {
    if (g.members.length > 0) {
      out.push(`group ${g.id} "${g.label}": ${g.members.join(" ")}`);
    }
  }

  for (const n of nodes.values()) {
    out.push(`${n.kind} ${n.id} "${n.label}"`);
  }

  out.push("");
  out.push("beat main:");
  out.push("  show $nodes stagger=60ms");

  for (const flow of flows) {
    if (flow.label) {
      out.push(`  ${flow.from} ${flow.op} ${flow.to} "${flow.label}"`);
    } else {
      out.push(`  ${flow.from} ${flow.op} ${flow.to}`);
    }
  }

  return {
    code: out.join("\n"),
    diagramType: hasFlowchartShapes ? "flowchart" : "architecture",
    nodeCount: nodes.size,
    edgeCount: flows.length,
    groupCount: groups.size,
    warnings,
  };
}
