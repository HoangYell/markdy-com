/**
 * packages/compat/src/infra/docker-compose-transpiler.ts
 * Ingests Docker Compose configurations and transpiles to animated MarkdyScript scenes.
 * Zero external dependencies.
 */

export interface ComposeServiceSpec {
  name: string;
  image?: string;
  ports?: string[];
  dependsOn?: string[];
  networks?: string[];
}

function sanitizeIdentifier(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, "_");
}

function inferSemanticKind(serviceName: string, image?: string): string {
  const combined = `${serviceName} ${image ?? ""}`.toLowerCase();
  if (/(postgres|mysql|mongo|mariadb|sqlite|cockroach|db)/.test(combined)) return "database";
  if (/(redis|memcache)/.test(combined)) return "cache";
  if (/(kafka|rabbitmq|sqs|pulsar|nats|queue)/.test(combined)) return "queue";
  if (/(nginx|envoy|traefik|caddy|gateway|haproxy)/.test(combined)) return "gateway";
  if (/(web|frontend|client|ui|react|vue|next)/.test(combined)) return "browser";
  if (/(worker|job|cron|consumer)/.test(combined)) return "worker";
  if (/(minio|s3|storage|blob)/.test(combined)) return "storage";
  return "service";
}

export function parseSimpleYaml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split(/\r?\n/);
  const stack: Array<{ indent: number; obj: Record<string, unknown> | unknown[] }> = [
    { indent: -1, obj: result },
  ];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (!rawLine.trim() || rawLine.trim().startsWith("#")) continue;
    const indent = rawLine.length - rawLine.trimStart().length;
    const trimmed = rawLine.trim();

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    if (trimmed.startsWith("- ")) {
      const val = trimmed.slice(2).trim().replace(/^['"]|['"]$/g, "");
      const parent = stack[stack.length - 1].obj;
      if (Array.isArray(parent)) {
        parent.push(val);
      }
      continue;
    }

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim().replace(/^['"]|['"]$/g, "");
    const valRaw = trimmed.slice(colonIdx + 1).trim();

    const parent = stack[stack.length - 1].obj;
    if (valRaw === "" || valRaw === "|" || valRaw === ">") {
      let isArray = false;
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j];
        if (!nextLine.trim() || nextLine.trim().startsWith("#")) continue;
        const nextIndent = nextLine.length - nextLine.trimStart().length;
        if (nextIndent > indent && nextLine.trim().startsWith("- ")) {
          isArray = true;
        }
        break;
      }

      if (isArray) {
        const child: unknown[] = [];
        (parent as Record<string, unknown>)[key] = child;
        stack.push({ indent, obj: child });
      } else {
        const child: Record<string, unknown> = {};
        (parent as Record<string, unknown>)[key] = child;
        stack.push({ indent, obj: child });
      }
    } else if (valRaw.startsWith("[") && valRaw.endsWith("]")) {
      // Inline YAML/JSON array: e.g. ["db", "cache"] or [80:80, 443:443]
      const inner = valRaw.slice(1, -1).trim();
      const items = inner
        ? inner.split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean)
        : [];
      (parent as Record<string, unknown>)[key] = items;
    } else {
      (parent as Record<string, unknown>)[key] = valRaw.replace(/^['"]|['"]$/g, "");
    }
  }

  return result;
}

export function transpileDockerComposeToMarkdy(
  yamlContent: string,
  title = "Container Topology"
): string {
  const parsed = parseSimpleYaml(yamlContent);
  const rawServices = (parsed["services"] as Record<string, unknown>) ?? {};
  const serviceList: ComposeServiceSpec[] = [];

  for (const [svcName, svcConfig] of Object.entries(rawServices)) {
    if (typeof svcConfig !== "object" || svcConfig === null) continue;
    const cfg = svcConfig as Record<string, unknown>;
    
    // Normalize ports
    let ports: string[] = [];
    if (Array.isArray(cfg["ports"])) {
      ports = (cfg["ports"] as unknown[]).map((p) => String(p).replace(/^['"]|['"]$/g, ""));
    } else if (typeof cfg["ports"] === "string") {
      const pStr = cfg["ports"].trim();
      if (pStr.startsWith("[") && pStr.endsWith("]")) {
        ports = pStr.slice(1, -1).split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
      } else {
        ports = [pStr.replace(/^['"]|['"]$/g, "")];
      }
    }

    // Normalize depends_on (handles array, string, or object with conditions)
    let dependsOn: string[] = [];
    if (Array.isArray(cfg["depends_on"])) {
      dependsOn = (cfg["depends_on"] as unknown[]).map((d) => String(d).replace(/^['"]|['"]$/g, ""));
    } else if (typeof cfg["depends_on"] === "object" && cfg["depends_on"] !== null) {
      dependsOn = Object.keys(cfg["depends_on"]);
    } else if (typeof cfg["depends_on"] === "string") {
      const dStr = cfg["depends_on"].trim();
      if (dStr.startsWith("[") && dStr.endsWith("]")) {
        dependsOn = dStr.slice(1, -1).split(",").map((s) => s.trim().replace(/^['"]|['"]$/g, "")).filter(Boolean);
      } else {
        dependsOn = [dStr.replace(/^['"]|['"]$/g, "")];
      }
    }

    serviceList.push({
      name: svcName,
      image: typeof cfg["image"] === "string" ? cfg["image"] : undefined,
      ports,
      dependsOn,
    });
  }

  const out: string[] = [];
  out.push(title ? `scene "${title}" theme=paper` : `scene theme=paper`);
  out.push("layout LR");
  out.push("");

  // 1. Declare semantic nodes
  for (const svc of serviceList) {
    const id = sanitizeIdentifier(svc.name);
    const kind = inferSemanticKind(svc.name, svc.image);
    const ports = svc.ports ?? [];
    const label = ports.length > 0 ? `${svc.name} :${ports[0]}` : svc.name;
    out.push(`${kind} ${id} "${label}"`);
  }

  out.push("");
  out.push('beat main "Initialize and connect services":');
  out.push("  show $nodes stagger=60ms");

  // 2. Declare dependency flows
  for (const svc of serviceList) {
    const sourceId = sanitizeIdentifier(svc.name);
    for (const dep of svc.dependsOn ?? []) {
      const targetId = sanitizeIdentifier(dep);
      out.push(`  ${sourceId} -> ${targetId} "depends on"`);
    }
  }

  return out.join("\n");
}
