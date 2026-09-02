/**
 * packages/compat/src/infra/plantuml-transpiler.ts
 * Transpiles PlantUML architecture & component diagrams into MarkdyScript DSL.
 * Zero external dependencies.
 */

export interface PlantUmlTranspileResult {
  markdyScript: string;
  nodeCount: number;
  edgeCount: number;
  groupCount: number;
  warnings: string[];
}

export function transpilePlantUmlToMarkdy(pumlSource: string): PlantUmlTranspileResult {
  const lines = pumlSource.split("\n");
  const warnings: string[] = [];
  const nodes = new Map<string, { id: string; label: string; kind: string; icon?: string }>();
  const edges: { from: string; to: string; op: string; label?: string }[] = [];
  const groups = new Map<string, { id: string; label: string; members: string[] }>();

  let currentGroup: string | null = null;
  let sceneTitle = "PlantUML System Architecture";

  function sanitizeId(raw: string): string {
    return raw.trim().replace(/[^a-zA-Z0-9_]/g, "_");
  }

  function mapPlantUmlKind(rawType: string, label: string): string {
    const type = rawType.toLowerCase();
    const lbl = label.toLowerCase();

    if (type === "database" || lbl.includes("database") || lbl.includes("postgres") || lbl.includes("mysql") || lbl.includes("sql")) {
      return "database";
    }
    if (type === "queue" || lbl.includes("queue") || lbl.includes("kafka") || lbl.includes("rabbitmq")) {
      return "queue";
    }
    if (type === "boundary" || lbl.includes("gateway") || lbl.includes("proxy") || lbl.includes("ingress")) {
      return "gateway";
    }
    if (type === "actor" || lbl.includes("user") || lbl.includes("client") || lbl.includes("browser")) {
      return "browser";
    }
    if (lbl.includes("cache") || lbl.includes("redis")) {
      return "cache";
    }
    if (lbl.includes("s3") || lbl.includes("storage") || lbl.includes("blob")) {
      return "storage";
    }
    return "service";
  }

  for (let idx = 0; idx < lines.length; idx++) {
    let line = lines[idx].trim();
    if (!line || line.startsWith("'") || line.startsWith("@startuml") || line.startsWith("@enduml")) {
      continue;
    }

    // Title: title "System Flow"
    const titleMatch = line.match(/^title\s+["']?([^"']+)["']?$/i);
    if (titleMatch) {
      sceneTitle = titleMatch[1].trim();
      continue;
    }

    // Package/Group: package "Core Services" as Core { or rectangle "VPC" {
    const groupOpenMatch = line.match(/^(?:package|rectangle|node|cloud|frame)\s+(?:"([^"]+)"|(\w+))(?:\s+as\s+(\w+))?\s*\{/i);
    if (groupOpenMatch) {
      const label = groupOpenMatch[1] || groupOpenMatch[2];
      const id = sanitizeId(groupOpenMatch[3] || label);
      currentGroup = id;
      groups.set(id, { id, label, members: [] });
      continue;
    }

    if (line === "}") {
      currentGroup = null;
      continue;
    }

    // Connection: A -> B : Label or A --> B : Label or A <-> B : Label
    const connMatch = line.match(/^([a-zA-Z0-9_.-]+)\s*(-+>|<-+|<->|-+)\s*([a-zA-Z0-9_.-]+)(?:\s*:\s*(.*))?$/);
    if (connMatch) {
      const fromId = sanitizeId(connMatch[1]);
      const arrow = connMatch[2];
      const toId = sanitizeId(connMatch[3]);
      let label = connMatch[4]?.trim();
      if (label?.startsWith('"') && label.endsWith('"')) {
        label = label.slice(1, -1);
      }

      if (!nodes.has(fromId)) {
        nodes.set(fromId, { id: fromId, label: fromId, kind: mapPlantUmlKind("service", fromId) });
      }
      if (!nodes.has(toId)) {
        nodes.set(toId, { id: toId, label: toId, kind: mapPlantUmlKind("service", toId) });
      }

      let op = "->";
      if (arrow.includes("<") && arrow.includes(">")) op = "<->";
      else if (arrow.startsWith("<-")) op = "<-";
      else if (arrow.includes("--")) op = "->";

      edges.push({ from: fromId, to: toId, op, label });
      continue;
    }

    // Node declarations: database "PostgreSQL" as DB or service OrderSvc or [Order Service] as OrderSvc
    const nodeDeclMatch = line.match(/^(actor|boundary|control|entity|database|queue|component|node|cloud)?\s*(?:"([^"]+)"|\[([^\]]+)\]|([a-zA-Z0-9_.-]+))(?:\s+as\s+([a-zA-Z0-9_.-]+))?$/i);
    if (nodeDeclMatch) {
      const rawType = nodeDeclMatch[1] || "service";
      const rawLabel = nodeDeclMatch[2] || nodeDeclMatch[3] || nodeDeclMatch[4];
      const id = sanitizeId(nodeDeclMatch[5] || rawLabel);
      const label = rawLabel || id;
      const kind = mapPlantUmlKind(rawType, label);

      nodes.set(id, { id, label, kind });
      if (currentGroup) {
        groups.get(currentGroup)?.members.push(id);
      }
      continue;
    }
  }

  // Generate MarkdyScript
  const outLines: string[] = [
    `scene "${sceneTitle}" theme=midnight`,
    `layout LR`,
    "",
  ];

  for (const [, node] of nodes) {
    const iconAttr = node.icon ? ` icon=${node.icon}` : "";
    outLines.push(`${node.kind} ${node.id} "${node.label}"${iconAttr}`);
  }

  if (groups.size > 0) {
    outLines.push("");
    for (const [, grp] of groups) {
      if (grp.members.length > 0) {
        outLines.push(`group ${grp.id} "${grp.label}": ${grp.members.join(" ")}`);
      }
    }
  }

  outLines.push("");
  outLines.push(`beat main_flow "1. Execution Flow":`);
  outLines.push(`  show $nodes stagger=40ms`);

  for (const edge of edges) {
    const lbl = edge.label ? ` "${edge.label}"` : "";
    outLines.push(`  ${edge.from} ${edge.op} ${edge.to}${lbl}`);
  }

  return {
    markdyScript: outLines.join("\n") + "\n",
    nodeCount: nodes.size,
    edgeCount: edges.length,
    groupCount: groups.size,
    warnings,
  };
}
