/**
 * packages/compat/src/infra/k8s-transpiler.ts
 * Transpiles Kubernetes YAML manifests into animated Markdy architecture scenes.
 * Zero external dependencies.
 */

import { parseSimpleYaml } from "./docker-compose-transpiler.js";

export interface K8sManifest {
  kind: string;
  name: string;
  namespace?: string;
  selectorLabels?: Record<string, string>;
  podLabels?: Record<string, string>;
  services?: string[];
}

function sanitize(id: string): string {
  return id.replace(/[^a-zA-Z0-9_]/g, "_");
}

export function transpileKubernetesManifestsToMarkdy(
  manifestContent: string,
  title = "Kubernetes Cluster Topology"
): string {
  const docs = manifestContent
    .split(/^---/m)
    .map((d) => d.trim())
    .filter((d) => d.length > 0);

  const manifests: K8sManifest[] = [];

  for (const doc of docs) {
    const raw = parseSimpleYaml(doc);
    const kind = typeof raw["kind"] === "string" ? raw["kind"] : "";
    const meta = (raw["metadata"] as Record<string, unknown>) || {};
    const name = typeof meta["name"] === "string" ? meta["name"] : "";
    const namespace = typeof meta["namespace"] === "string" ? meta["namespace"] : "default";

    if (!kind || !name) continue;

    manifests.push({
      kind,
      name,
      namespace,
    });
  }

  const out: string[] = [];
  out.push(`scene "${title}" theme=paper`);
  out.push("layout TB");
  out.push("");

  const namespaces = new Set(manifests.map((m) => m.namespace || "default"));
  for (const ns of namespaces) {
    const nsMembers = manifests
      .filter((m) => (m.namespace || "default") === ns)
      .map((m) => sanitize(`${m.kind}_${m.name}`));

    if (nsMembers.length > 0) {
      out.push(`group ns_${sanitize(ns)} "Namespace: ${ns}": ${nsMembers.join(" ")}`);
    }
  }

  out.push("");

  for (const m of manifests) {
    const id = sanitize(`${m.kind}_${m.name}`);
    let kind = "service";

    if (m.kind === "Ingress") kind = "gateway";
    else if (m.kind === "Service") kind = "load_balancer";
    else if (m.kind === "StatefulSet") kind = "database";
    else if (m.kind === "CronJob" || m.kind === "Job") kind = "worker";
    else if (m.kind === "PersistentVolumeClaim") kind = "storage";

    out.push(`${kind} ${id} "${m.name} (${m.kind})"`);
  }

  out.push("");
  out.push('beat main "Cluster Ingress & Service Mesh":');
  out.push("  show $nodes stagger=50ms");

  // Ingress -> Service -> Workload wiring
  const ingresses = manifests.filter((m) => m.kind === "Ingress");
  const services = manifests.filter((m) => m.kind === "Service");
  const workloads = manifests.filter((m) => ["Deployment", "StatefulSet", "DaemonSet"].includes(m.kind));

  for (const ing of ingresses) {
    for (const svc of services) {
      out.push(`  ${sanitize(`${ing.kind}_${ing.name}`)} -> ${sanitize(`${svc.kind}_${svc.name}`)} "route"`);
    }
  }

  for (const svc of services) {
    for (const wl of workloads) {
      out.push(`  ${sanitize(`${svc.kind}_${svc.name}`)} -> ${sanitize(`${wl.kind}_${wl.name}`)} "balance"`);
    }
  }

  return out.join("\n");
}
