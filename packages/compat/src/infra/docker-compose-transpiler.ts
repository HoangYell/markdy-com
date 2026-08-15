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
  const stack: Array<{ indent: number; obj: Record<string, unknown> }> = [
    { indent: -1, obj: result },
  ];

  for (const rawLine of lines) {
    if (!rawLine.trim() || rawLine.trim().startsWith("#")) continue;
    const indent = rawLine.length - rawLine.trimStart().length;
    const trimmed = rawLine.trim();

    if (trimmed.startsWith("- ")) {
      const val = trimmed.slice(2).trim();
      const parent = stack[stack.length - 1].obj;
      const lastKey = Object.keys(parent).pop();
      if (lastKey && Array.isArray(parent[lastKey])) {
        (parent[lastKey] as unknown[]).push(val);
      }
      continue;
    }

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    const valRaw = trimmed.slice(colonIdx + 1).trim();

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].obj;
    if (valRaw === "" || valRaw === "|" || valRaw === ">") {
      const child: Record<string, unknown> = {};
      parent[key] = child;
      stack.push({ indent, obj: child });
    } else {
      parent[key] = valRaw.replace(/^['"]|['"]$/g, "");
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
    const ports = Array.isArray(cfg["ports"])
      ? (cfg["ports"] as string[])
      : typeof cfg["ports"] === "string"
      ? [cfg["ports"]]
      : [];
    const dependsOn = Array.isArray(cfg["depends_on"])
      ? (cfg["depends_on"] as string[])
      : typeof cfg["depends_on"] === "string"
      ? [cfg["depends_on"]]
      : [];

    serviceList.push({
      name: svcName,
      image: typeof cfg["image"] === "string" ? cfg["image"] : undefined,
      ports,
      dependsOn,
    });
  }

  const out: string[] = [];
  out.push(`scene "${title}" theme=paper`);
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

  // 2. Declare dependency and request flows
  let hasFlows = false;
  for (const svc of serviceList) {
    const sourceId = sanitizeIdentifier(svc.name);
    for (const dep of svc.dependsOn ?? []) {
      const targetId = sanitizeIdentifier(dep);
      out.push(`  ${sourceId} -> ${targetId} "depends on"`);
      hasFlows = true;
    }
  }

  if (!hasFlows && serviceList.length > 1) {
    out.push(`  ${sanitizeIdentifier(serviceList[0].name)} -> ${sanitizeIdentifier(serviceList[1].name)} "request"`);
  }

  return out.join("\n");
}
