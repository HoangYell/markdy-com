/**
 * packages/compat/src/infra/dot-transpiler.ts
 * Transpiles Graphviz DOT (.dot / .gv) graphs into animated MarkdyScript DSL.
 * Zero external dependencies.
 */

export interface DotTranspileResult {
  code: string;
  markdyScript: string;
  diagramType: "architecture";
  nodeCount: number;
  edgeCount: number;
  groupCount: number;
  warnings: string[];
}

function sanitizeDotId(raw: string): string {
  const withoutPort = raw.split(":")[0].replace(/^["']|["']$/g, "").trim();
  let cleaned = withoutPort.replace(/[^a-zA-Z0-9_]/g, "_").replace(/^_+|_+$/g, "");
  if (!cleaned || /^[0-9]/.test(cleaned)) cleaned = `n_${cleaned || "node"}`;
  return cleaned;
}

function inferKindFromDot(id: string, label: string, shape?: string): string {
  const s = (shape || "").toLowerCase();
  const text = `${id} ${label}`.toLowerCase();

  if (s === "cylinder" || s === "database" || /(db|database|postgres|mysql|mongo|sql)/.test(text)) {
    return "database";
  }
  if (/(cache|redis|memcached)/.test(text)) return "cache";
  if (/(queue|kafka|rabbit|sqs|broker|event)/.test(text)) return "queue";
  if (s === "diamond" || /(decision|check|branch)/.test(text)) return "decision";
  if (s === "hexagon" || /(gateway|proxy|ingress|lb|loadbalancer)/.test(text)) return "gateway";
  if (s === "actor" || s === "ellipse" || s === "circle" || /(user|client|browser|frontend|web)/.test(text)) {
    return /(user|actor|customer)/.test(text) ? "user" : "browser";
  }
  if (s === "folder" || /(storage|s3|bucket|disk)/.test(text)) return "storage";
  if (/(worker|cron|job|lambda)/.test(text)) return "worker";
  return "service";
}

function parseDotAttrs(attrBlock: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRe = /([a-zA-Z0-9_]+)\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([a-zA-Z0-9_.-]+))/g;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(attrBlock)) !== null) {
    const key = m[1].toLowerCase();
    const val = (m[2] !== undefined ? m[2] : m[3] || "").replace(/\\n/g, " ").replace(/"/g, "'").trim();
    attrs[key] = val;
  }
  return attrs;
}

function stripDotComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "")
    .replace(/^\s*#.*$/gm, "");
}

export function transpileDotToMarkdy(dotSource: string, defaultTitle = "Graphviz Architecture"): DotTranspileResult {
  const cleaned = stripDotComments(dotSource);
  const warnings: string[] = [];

  let sceneTitle = defaultTitle;
  let direction: "LR" | "TB" | "RL" | "BT" = "LR";

  const nodes = new Map<string, { id: string; label: string; kind: string }>();
  const groups = new Map<string, { id: string; label: string; members: string[] }>();
  const edges: Array<{ from: string; to: string; op: string; label?: string }> = [];

  // Split outer graph body if wrapped in digraph/graph { ... }
  const outerMatch = /^(?:strict\s+)?(?:di)?graph\s+(?:"([^"]+)"|([a-zA-Z0-9_]+))?\s*\{([\s\S]*)\}\s*$/i.exec(cleaned.trim());
  if (outerMatch) {
    const graphName = outerMatch[1] || outerMatch[2];
    if (graphName && graphName !== "G" && graphName !== "g" && defaultTitle === "Graphviz Architecture") {
      sceneTitle = graphName.replace(/_/g, " ");
    }
  }
  const body = outerMatch ? outerMatch[3] : cleaned;

  const lines = body
    .split(/\r?\n|;/)
    .map((l) => l.trim())
    .filter(Boolean);

  const groupStack: Array<{ id: string; label: string; members: string[] }> = [];

  const ensureNode = (rawId: string, attrs?: Record<string, string>) => {
    const id = sanitizeDotId(rawId);
    const existing = nodes.get(id);
    const label = attrs?.label || existing?.label || rawId.split(":")[0].replace(/^["']|["']$/g, "").trim();
    const kind = inferKindFromDot(id, label, attrs?.shape);

    if (existing) {
      if (attrs?.label) existing.label = label;
      if (attrs?.shape || attrs?.label) existing.kind = kind;
    } else {
      nodes.set(id, { id, label, kind });
    }

    const active = groupStack[groupStack.length - 1];
    if (active && !active.members.includes(id)) {
      active.members.push(id);
    }
    return id;
  };

  for (const line of lines) {
    if (line === "{") continue;
    if (line === "}") {
      if (groupStack.length > 0) groupStack.pop();
      continue;
    }

    const rankMatch = /^rankdir\s*=\s*"?(LR|TB|TD|RL|BT)"?$/i.exec(line);
    if (rankMatch) {
      const dir = rankMatch[1].toUpperCase();
      direction = (dir === "TD" ? "TB" : dir) as "LR" | "TB" | "RL" | "BT";
      continue;
    }

    const graphLabelMatch = /^label\s*=\s*"((?:[^"\\]|\\.)*)"$/i.exec(line);
    if (graphLabelMatch) {
      const lbl = graphLabelMatch[1].replace(/\\n/g, " ").replace(/"/g, "'").trim();
      if (groupStack.length > 0) {
        groupStack[groupStack.length - 1].label = lbl;
      } else {
        sceneTitle = lbl;
      }
      continue;
    }

    if (/^(node|edge|graph)\s*\[/i.test(line) || /^(splines|nodesep|ranksep|bgcolor|fontname|fontsize|pad|compound)\s*=/i.test(line)) {
      continue;
    }

    const subMatch = /^subgraph\s+([a-zA-Z0-9_"]+)?\s*\{?$/i.exec(line);
    if (subMatch) {
      const rawName = (subMatch[1] || `cluster_${groups.size + 1}`).replace(/^["']|["']$/g, "");
      const id = sanitizeDotId(rawName);
      const label = rawName.replace(/^cluster_?/i, "").replace(/_/g, " ") || id;
      const grp = { id, label, members: [] };
      groups.set(id, grp);
      groupStack.push(grp);
      continue;
    }

    // Edge chain: A -> B -> C [label="...", style=dashed]
    if (line.includes("->") || line.includes("--")) {
      const attrMatch = /\[([^\]]*)\]\s*$/.exec(line);
      const attrs = attrMatch ? parseDotAttrs(attrMatch[1]) : {};
      const edgeExpr = attrMatch ? line.slice(0, attrMatch.index).trim() : line;

      const opUsed = edgeExpr.includes("->") ? "->" : "--";
      const parts = edgeExpr.split(/\s*(?:->|--)\s*/).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const markdyOp =
          attrs.dir === "both"
            ? "<->"
            : attrs.style === "dashed" || attrs.style === "dotted"
            ? "~>"
            : opUsed === "--"
            ? "..>"
            : "->";

        for (let i = 0; i < parts.length - 1; i++) {
          const fromId = ensureNode(parts[i]);
          const toId = ensureNode(parts[i + 1]);
          edges.push({ from: fromId, to: toId, op: markdyOp, label: attrs.label });
        }
        continue;
      }
    }

    // Node declaration: node_id [label="...", shape=box]
    const nodeDeclMatch = /^("[^"]+"|[a-zA-Z0-9_.-]+)(?:\s*\[([^\]]*)\])?$/.exec(line);
    if (nodeDeclMatch) {
      const attrs = nodeDeclMatch[2] ? parseDotAttrs(nodeDeclMatch[2]) : undefined;
      ensureNode(nodeDeclMatch[1], attrs);
      continue;
    }

    warnings.push(`Skipped DOT statement: ${line.slice(0, 60)}`);
  }

  const out: string[] = [];
  out.push(`scene "${sceneTitle}" theme=paper`);
  out.push(`layout ${direction}`);
  out.push("");

  for (const grp of groups.values()) {
    if (grp.members.length > 0) {
      out.push(`group ${grp.id} "${grp.label}": ${grp.members.join(" ")}`);
    }
  }
  if (groups.size > 0) out.push("");

  for (const n of nodes.values()) {
    out.push(`${n.kind} ${n.id} "${n.label}"`);
  }

  out.push("");
  out.push('beat main "Graphviz Flow":');
  out.push("  show $nodes stagger=50ms");
  for (const e of edges) {
    out.push(e.label ? `  ${e.from} ${e.op} ${e.to} "${e.label}"` : `  ${e.from} ${e.op} ${e.to}`);
  }

  const code = out.join("\n") + "\n";
  return {
    code,
    markdyScript: code,
    diagramType: "architecture",
    nodeCount: nodes.size,
    edgeCount: edges.length,
    groupCount: groups.size,
    warnings,
  };
}
