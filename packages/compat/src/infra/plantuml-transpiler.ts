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

    // C4 Macro Support: Person(id, "label", "desc"), Container(id, "label", "tech"), ContainerDb(id, "label", "tech"), Rel(from, to, "label", "tech")
    const c4NodeMatch = line.match(/^(Person|Person_Ext|System|System_Ext|SystemDb|Container|ContainerDb|ContainerQueue|Component|ComponentDb)\s*\(\s*([a-zA-Z0-9_]+)\s*,\s*["']([^"']+)["'](?:\s*,\s*["']([^"']*)["'])?(?:\s*,\s*["']([^"']*)["'])?\s*\)/i);
    if (c4NodeMatch) {
      const macro = c4NodeMatch[1].toLowerCase();
      const id = sanitizeId(c4NodeMatch[2]);
      const label = c4NodeMatch[3];
      const techOrDesc = c4NodeMatch[4] || "";

      let kind = "service";
      let icon = "nodejs";

      if (macro.includes("person")) {
        kind = "browser";
        icon = "chrome";
      } else if (macro.includes("db")) {
        kind = "database";
        icon = "postgresql";
      } else if (macro.includes("queue")) {
        kind = "queue";
        icon = "kafka";
      } else if (macro.includes("gateway") || techOrDesc.toLowerCase().includes("gateway") || techOrDesc.toLowerCase().includes("proxy")) {
        kind = "gateway";
        icon = "nginx";
      }

      nodes.set(id, { id, label, kind, icon });
      if (currentGroup && groups.has(currentGroup)) {
        groups.get(currentGroup)!.members.push(id);
      }
      continue;
    }

    const c4RelMatch = line.match(/^Rel(?:_[RLDUB]|_Neighbor|_Back)?\s*\(\s*([a-zA-Z0-9_]+)\s*,\s*([a-zA-Z0-9_]+)\s*,\s*["']([^"']+)["'](?:\s*,\s*["']([^"']*)["'])?\s*\)/i);
    if (c4RelMatch) {
      const fromId = sanitizeId(c4RelMatch[1]);
      const toId = sanitizeId(c4RelMatch[2]);
      const desc = c4RelMatch[3];
      const tech = c4RelMatch[4];
      const fullLabel = tech ? `${desc} (${tech})` : desc;

      if (!nodes.has(fromId)) {
        nodes.set(fromId, { id: fromId, label: fromId, kind: mapPlantUmlKind("service", fromId) });
      }
      if (!nodes.has(toId)) {
        nodes.set(toId, { id: toId, label: toId, kind: mapPlantUmlKind("service", toId) });
      }

      edges.push({ from: fromId, to: toId, op: "->", label: fullLabel });
      continue;
    }

    // Explicit node declaration: service Svc "Label" [icon] or class Foo or component Bar or database DB
    const declMatch = line.match(/^(component|interface|database|queue|actor|boundary|control|entity|participant|node)\s+(?:"([^"]+)"\s+as\s+(\w+)|(\w+)(?:\s+as\s+(\w+))?|(\w+))/i);
    if (declMatch) {
      const rawType = declMatch[1];
      const label = declMatch[2] || declMatch[4] || declMatch[6];
      const id = sanitizeId(declMatch[3] || declMatch[5] || declMatch[6] || label);

      nodes.set(id, {
        id,
        label,
        kind: mapPlantUmlKind(rawType, label),
      });

      if (currentGroup && groups.has(currentGroup)) {
        groups.get(currentGroup)!.members.push(id);
      }
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
      if (arrow.startsWith("<-")) op = "<-";
      else if (arrow === "<->") op = "<->";
      else if (arrow.startsWith("--") || arrow === "-") op = "..>";

      edges.push({ from: fromId, to: toId, op, label });
      continue;
    }

    warnings.push(`Ignored unsupported PlantUML syntax at line ${idx + 1}: ${line.slice(0, 40)}`);
  }

  // Generate MarkdyScript
  const scriptLines: string[] = [];
  scriptLines.push(`scene "${sceneTitle}" theme=auto`);
  scriptLines.push(`layout LR`);
  scriptLines.push(``);

  for (const node of nodes.values()) {
    const iconProp = node.icon ? ` icon=${node.icon}` : "";
    scriptLines.push(`${node.kind} ${node.id} "${node.label}"${iconProp}`);
  }

  if (groups.size > 0) {
    scriptLines.push(``);
    for (const group of groups.values()) {
      if (group.members.length > 0) {
        scriptLines.push(`group ${group.id} "${group.label}": ${group.members.join(" ")}`);
      }
    }
  }

  scriptLines.push(``);
  scriptLines.push(`beat system_flow "Imported PlantUML Flow":`);
  scriptLines.push(`  show $nodes stagger=50ms`);

  for (const edge of edges) {
    const label = edge.label ? ` "${edge.label}"` : "";
    scriptLines.push(`  ${edge.from} ${edge.op} ${edge.to}${label}`);
  }

  return {
    markdyScript: scriptLines.join("\n") + "\n",
    nodeCount: nodes.size,
    edgeCount: edges.length,
    groupCount: groups.size,
    warnings,
  };
}
