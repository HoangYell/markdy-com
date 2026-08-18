/**
 * packages/compat/src/mermaid/mermaid-transpiler.ts
 * Transpiles Mermaid Flowcharts and Sequence Diagrams into animated MarkdyScript.
 * Zero external dependencies.
 */

export interface MermaidTranspileResult {
  code: string;
  diagramType: "architecture" | "sequence" | "flowchart";
  nodeCount: number;
  edgeCount: number;
}

function sanitizeId(id: string): string {
  return id.trim().replace(/[^a-zA-Z0-9_]/g, "_");
}

function cleanLabel(raw: string): string {
  return raw
    .trim()
    .replace(/^["'\[\(\{]+/, "")
    .replace(/["'\]\)\}]+$/, "")
    .replace(/<br\s*\/?>/gi, " ");
}

function inferKindFromMermaid(id: string, label: string, shapeBracket?: string): string {
  const text = `${id} ${label}`.toLowerCase();
  if (shapeBracket === "[(" || shapeBracket === ")]" || /(db|database|sql|postgres|mongo|dynamo|redis)/.test(text)) {
    return "database";
  }
  if (shapeBracket === "{{" || shapeBracket === "}}" || /(queue|kafka|rabbitmq|sqs|event|bus)/.test(text)) {
    return "queue";
  }
  if (shapeBracket === "{" || shapeBracket === "}" || /(decision|check|valid|auth|gate)/.test(text)) {
    return "gateway";
  }
  if (shapeBracket === "([" || shapeBracket === "])" || /(client|user|browser|ui|app|web|frontend)/.test(text)) {
    return "browser";
  }
  if (/(cache|memcached|varnish)/.test(text)) return "cache";
  if (/(storage|s3|bucket|blob)/.test(text)) return "storage";
  if (/(worker|cron|job|lambda|function)/.test(text)) return "worker";
  return "service";
}

export function transpileMermaidToMarkdy(mermaidSource: string, sceneTitle = "Imported Diagram"): MermaidTranspileResult {
  const lines = mermaidSource.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("%%"));
  if (lines.length === 0) {
    return {
      code: `scene theme=paper\nlayout LR\n`,
      diagramType: "architecture",
      nodeCount: 0,
      edgeCount: 0,
    };
  }

  const firstLine = lines[0].toLowerCase();

  // ── SEQUENCE DIAGRAM ──────────────────────────────────────────────
  if (firstLine.startsWith("sequencediagram")) {
    return transpileSequenceDiagram(lines.slice(1), sceneTitle);
  }

  // ── FLOWCHART / GRAPH ─────────────────────────────────────────────
  return transpileFlowchart(lines, sceneTitle);
}

function transpileSequenceDiagram(lines: string[], title: string): MermaidTranspileResult {
  const participants = new Map<string, { id: string; label: string; kind: string }>();
  const messages: Array<{ from: string; to: string; label: string; kind: "->" | "<-" | "~>" }> = [];

  for (const line of lines) {
    const partMatch = /^(?:participant|actor)\s+([^\s]+)(?:\s+as\s+(.+))?$/i.exec(line);
    if (partMatch) {
      const id = sanitizeId(partMatch[1]);
      const label = partMatch[2] ? cleanLabel(partMatch[2]) : id;
      const kind = inferKindFromMermaid(id, label);
      participants.set(id, { id, label, kind });
      continue;
    }

    const msgMatch = /^([a-zA-Z0-9_]+)\s*(-->>|->>|->|-->|-\)|~>)\s*([a-zA-Z0-9_]+)\s*:\s*(.+)$/.exec(line);
    if (msgMatch) {
      const from = sanitizeId(msgMatch[1]);
      const arrow = msgMatch[2];
      const to = sanitizeId(msgMatch[3]);
      const label = cleanLabel(msgMatch[4]);

      if (!participants.has(from)) participants.set(from, { id: from, label: from, kind: inferKindFromMermaid(from, from) });
      if (!participants.has(to)) participants.set(to, { id: to, label: to, kind: inferKindFromMermaid(to, to) });

      let kind: "->" | "<-" | "~>" = "->";
      if (arrow === "-->>" || arrow === "-->" || arrow === "-.->") kind = "~>";

      messages.push({ from, to, label, kind });
    }
  }

  const out: string[] = [];
  out.push(title ? `scene "${title}" type=sequence theme=paper` : `scene type=sequence theme=paper`);
  out.push("");

  for (const p of participants.values()) {
    out.push(`${p.kind} ${p.id} "${p.label}"`);
  }

  out.push("");
  out.push('beat main "Sequence Flow":');
  out.push("  show $nodes");

  for (const msg of messages) {
    out.push(`  ${msg.from} ${msg.kind} ${msg.to} "${msg.label}"`);
  }

  return {
    code: out.join("\n"),
    diagramType: "sequence",
    nodeCount: participants.size,
    edgeCount: messages.length,
  };
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

  let currentSubgraph: { id: string; label: string; members: string[] } | null = null;

  // Match: id[(label)], id[[label]], id([label]), id((label)), id[label], id{label}, id(label)
  const explicitNodeRe = /([a-zA-Z0-9_-]+)\s*(\[\([^\n]*?\)\]|\[\[[^\n]*?\]\]|\(\[[^\n]*?\]\)|\(\([^\n]*?\)\)|\[[^\n]*?\]|\{[^\n]*?\}|\([^\n]*?\))/g;
  const flowPattern = /([a-zA-Z0-9_-]+)\s*(?:\[[^\]]*\]|\([^)]*\)|\{[^}]*\})?\s*(-->|->|==>|-.->|--\s*([^-]+)\s*-->)\s*(?:\|([^|]+)\|)?\s*([a-zA-Z0-9_-]+)/;

  for (const line of lines) {
    const subMatch = /^subgraph\s+([a-zA-Z0-9_]+)?\s*(\[.*\]|".*")?/i.exec(line);
    if (subMatch) {
      const rawId = subMatch[1] || `group_${groups.size + 1}`;
      const id = sanitizeId(rawId);
      const label = subMatch[2] ? cleanLabel(subMatch[2]) : id;
      currentSubgraph = { id, label, members: [] };
      groups.set(id, currentSubgraph);
      continue;
    }

    if (line === "end" && currentSubgraph) {
      currentSubgraph = null;
      continue;
    }

    // Extract node definitions
    let match: RegExpExecArray | null;
    while ((match = explicitNodeRe.exec(line)) !== null) {
      const rawId = match[1];
      const rawBody = match[2];
      const id = sanitizeId(rawId);
      const bracket = rawBody.slice(0, 2);
      const label = cleanLabel(rawBody) || id;
      const kind = inferKindFromMermaid(id, label, bracket);

      nodes.set(id, { id, label, kind });
      if (currentSubgraph && !currentSubgraph.members.includes(id)) {
        currentSubgraph.members.push(id);
      }
    }

    // Extract connections (handling chained edges like A -> B -> C)
    let remainingLine = line;
    while (true) {
      const fMatch = flowPattern.exec(remainingLine);
      if (!fMatch) break;

      const from = sanitizeId(fMatch[1]);
      const arrow = fMatch[2];
      const inlineLabel = fMatch[3];
      const pipeLabel = fMatch[4];
      const to = sanitizeId(fMatch[5]);
      const label = pipeLabel ? cleanLabel(pipeLabel) : inlineLabel ? cleanLabel(inlineLabel) : undefined;

      if (!nodes.has(from)) nodes.set(from, { id: from, label: from, kind: inferKindFromMermaid(from, from) });
      if (!nodes.has(to)) nodes.set(to, { id: to, label: to, kind: inferKindFromMermaid(to, to) });

      let op = "->";
      if (arrow.includes("-.->") || arrow.includes("~")) op = "~>";

      flows.push({ from, to, op, label });

      // advance remainder to the 'to' node, allowing it to become the 'from' node for the next link
      const toIndex = fMatch.index + fMatch[0].lastIndexOf(fMatch[5]);
      if (toIndex === 0) break; // prevent infinite loop if unexpected match
      remainingLine = remainingLine.substring(toIndex);
    }
  }

  const out: string[] = [];
  out.push(title ? `scene "${title}" theme=paper` : `scene theme=paper`);
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
  out.push('beat main "Render Diagram":');
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
    diagramType: "architecture",
    nodeCount: nodes.size,
    edgeCount: flows.length,
  };
}
