/**
 * packages/compat/src/infra/d2-transpiler.ts
 * Transpiles D2 declarative diagram scripts into MarkdyScript DSL.
 * Zero external dependencies.
 */

export interface D2TranspileResult {
  markdyScript: string;
  nodeCount: number;
  edgeCount: number;
  containerCount: number;
  warnings: string[];
}

export function transpileD2ToMarkdy(d2Source: string): D2TranspileResult {
  const lines = d2Source.split("\n");
  const warnings: string[] = [];
  const nodes = new Map<string, { id: string; label: string; kind: string; icon?: string }>();
  const edges: { from: string; to: string; op: string; label?: string }[] = [];
  const containers = new Map<string, string[]>();

  let currentContainer: string | null = null;
  let sceneTitle = "Architecture Diagram";

  function sanitizeId(raw: string): string {
    return raw.trim().replace(/[^a-zA-Z0-9_]/g, "_");
  }

  function inferNodeKind(labelOrId: string, shape?: string): string {
    const lower = (labelOrId + " " + (shape || "")).toLowerCase();
    if (lower.includes("db") || lower.includes("database") || lower.includes("postgres") || lower.includes("sql") || lower.includes("cylinder")) {
      return "database";
    }
    if (lower.includes("cache") || lower.includes("redis") || lower.includes("memcached")) {
      return "cache";
    }
    if (lower.includes("browser") || lower.includes("client") || lower.includes("web") || lower.includes("ui") || lower.includes("mobile")) {
      return "browser";
    }
    if (lower.includes("gateway") || lower.includes("proxy") || lower.includes("nginx") || lower.includes("envoy") || lower.includes("ingress")) {
      return "gateway";
    }
    if (lower.includes("queue") || lower.includes("kafka") || lower.includes("rabbit") || lower.includes("sqs") || lower.includes("stream")) {
      return "queue";
    }
    if (lower.includes("storage") || lower.includes("s3") || lower.includes("bucket")) {
      return "storage";
    }
    return "service";
  }

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx].trim();
    if (!rawLine || rawLine.startsWith("#")) continue;

    // Title directive: title: "My Architecture"
    const titleMatch = rawLine.match(/^title\s*:\s*["']?([^"']+)["']?$/i);
    if (titleMatch) {
      sceneTitle = titleMatch[1].trim();
      continue;
    }

    // Container block opening: container_name: {
    const containerOpenMatch = rawLine.match(/^([a-zA-Z0-9_-]+)\s*:\s*\{$/);
    if (containerOpenMatch) {
      currentContainer = sanitizeId(containerOpenMatch[1]);
      containers.set(currentContainer, []);
      continue;
    }

    if (rawLine === "}") {
      currentContainer = null;
      continue;
    }

    // Connection: A -> B: Label or A -- B: Label or A <-> B: Label
    const connMatch = rawLine.match(/^([a-zA-Z0-9_.-]+)\s*(->|<-|<->|--)\s*([a-zA-Z0-9_.-]+)(?:\s*:\s*(.*))?$/);
    if (connMatch) {
      const fromId = sanitizeId(connMatch[1]);
      const rawOp = connMatch[2];
      const toId = sanitizeId(connMatch[3]);
      let label = connMatch[4]?.trim();
      if (label?.startsWith('"') && label.endsWith('"')) {
        label = label.slice(1, -1);
      }

      // Ensure endpoints exist
      if (!nodes.has(fromId)) {
        nodes.set(fromId, { id: fromId, label: fromId, kind: inferNodeKind(fromId) });
      }
      if (!nodes.has(toId)) {
        nodes.set(toId, { id: toId, label: toId, kind: inferNodeKind(toId) });
      }

      if (rawOp === "<->") {
        edges.push({ from: fromId, to: toId, op: "->", label });
        edges.push({ from: toId, to: fromId, op: "<-", label });
        continue;
      }
      let op = "->";
      if (rawOp === "<-") op = "<-";
      else if (rawOp === "--") op = "..>";

      edges.push({ from: fromId, to: toId, op, label });
      continue;
    }

    // Shape/Icon property assignment: nodeId.shape: cylinder or nodeId.icon: postgres
    const propMatch = rawLine.match(/^([a-zA-Z0-9_.-]+)\.(shape|icon|style\.fill)\s*:\s*(.*)$/i);
    if (propMatch) {
      const id = sanitizeId(propMatch[1]);
      const propKey = propMatch[2].toLowerCase();
      let propVal = propMatch[3].trim();
      if (propVal.startsWith('"') && propVal.endsWith('"')) {
        propVal = propVal.slice(1, -1);
      }

      const existing = nodes.get(id) || { id, label: id, kind: inferNodeKind(id) };
      if (propKey === "shape") {
        existing.kind = inferNodeKind(existing.label, propVal);
      } else if (propKey === "icon") {
        existing.icon = propVal.toLowerCase().replace(/[^a-z0-9]/g, "");
      }
      nodes.set(id, existing);
      continue;
    }

    // Node declaration: nodeId: Label or nodeId: "Label"
    const nodeMatch = rawLine.match(/^([a-zA-Z0-9_.-]+)\s*:\s*(.*)$/);
    if (nodeMatch) {
      const rawKey = nodeMatch[1];
      let label = nodeMatch[2].trim();
      if (label.startsWith('"') && label.endsWith('"')) {
        label = label.slice(1, -1);
      }

      // Check if it's a nested container path: parent.child
      if (rawKey.includes(".")) {
        const parts = rawKey.split(".");
        const parent = sanitizeId(parts[0]);
        const childId = sanitizeId(rawKey);

        if (!containers.has(parent)) {
          containers.set(parent, []);
        }
        containers.get(parent)!.push(childId);

        const kind = inferNodeKind(label || childId);
        nodes.set(childId, { id: childId, label: label || childId, kind });
        continue;
      }

      const id = sanitizeId(rawKey);
      const kind = inferNodeKind(label || id);
      nodes.set(id, { id, label: label || id, kind });

      if (currentContainer) {
        containers.get(currentContainer)?.push(id);
      }
      continue;
    }

    // Simple single token identifier
    if (/^[a-zA-Z0-9_.-]+$/.test(rawLine)) {
      const id = sanitizeId(rawLine);
      if (!nodes.has(id)) {
        nodes.set(id, { id, label: id, kind: inferNodeKind(id) });
      }
      if (currentContainer) {
        containers.get(currentContainer)?.push(id);
      }
    }
  }

  // Generate MarkdyScript
  const outLines: string[] = [
    `scene "${sceneTitle}" theme=midnight`,
    `layout LR`,
    "",
  ];

  // Node declarations
  for (const [, node] of nodes) {
    const iconAttr = node.icon ? ` icon=${node.icon}` : "";
    outLines.push(`${node.kind} ${node.id} "${node.label}"${iconAttr}`);
  }

  // Groups
  if (containers.size > 0) {
    outLines.push("");
    for (const [containerId, members] of containers) {
      if (members.length > 0) {
        outLines.push(`group ${containerId} "${containerId}": ${members.join(" ")}`);
      }
    }
  }

  // Beats & Flows
  outLines.push("");
  outLines.push(`beat main_flow "1. Architecture Dataflow":`);
  outLines.push(`  show $nodes stagger=40ms`);

  for (const edge of edges) {
    const lbl = edge.label ? ` "${edge.label}"` : "";
    outLines.push(`  ${edge.from} ${edge.op} ${edge.to}${lbl}`);
  }

  return {
    markdyScript: outLines.join("\n") + "\n",
    nodeCount: nodes.size,
    edgeCount: edges.length,
    containerCount: containers.size,
    warnings,
  };
}

