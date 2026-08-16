/**
 * packages/compat/src/infra/terraform-transpiler.ts
 * Ingests Terraform state files (.tfstate) and emits structured MarkdyScript scenes.
 * Zero external dependencies.
 */

export interface TfResourceAttributes {
  id?: string;
  name?: string;
  arn?: string;
  tags?: Record<string, string>;
  vpc_id?: string;
  subnet_id?: string;
  cluster_id?: string;
  load_balancer_arn?: string;
  [key: string]: unknown;
}

export interface TfResourceInstance {
  attributes: TfResourceAttributes;
}

export interface TfResource {
  type: string;
  name: string;
  provider: string;
  instances: TfResourceInstance[];
}

export interface TerraformStateJSON {
  version: number;
  terraform_version?: string;
  resources: TfResource[];
}

function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_]/g, "_");
}

function inferKindFromTfType(type: string): string {
  if (type.includes("database") || type.includes("db_instance") || type.includes("rds") || type.includes("dynamodb")) {
    return "database";
  }
  if (type.includes("elasticache") || type.includes("redis") || type.includes("memcached")) {
    return "cache";
  }
  if (type.includes("sqs") || type.includes("pubsub") || type.includes("servicebus") || type.includes("queue")) {
    return "queue";
  }
  if (type.includes("s3_bucket") || type.includes("storage_bucket") || type.includes("blob")) {
    return "storage";
  }
  if (type.includes("lb") || type.includes("alb") || type.includes("apigateway") || type.includes("gateway")) {
    return "gateway";
  }
  if (type.includes("cloudfront") || type.includes("cdn")) {
    return "cdn";
  }
  if (type.includes("lambda") || type.includes("cloudfunctions") || type.includes("function_app")) {
    return "worker";
  }
  if (type.includes("eks") || type.includes("gke") || type.includes("aks") || type.includes("cluster")) {
    return "cluster";
  }
  return "service";
}

export function transpileTerraformStateToMarkdy(
  tfstateContent: string,
  sceneTitle = "Cloud Infrastructure Architecture"
): string {
  let parsed: TerraformStateJSON;
  try {
    parsed = JSON.parse(tfstateContent) as TerraformStateJSON;
  } catch {
    throw new Error("Invalid Terraform state JSON");
  }

  if (!parsed.resources || !Array.isArray(parsed.resources)) {
    return `scene "${sceneTitle}" theme=paper\nlayout LR\n`;
  }

  const nodes: Array<{ id: string; kind: string; label: string; vpcId?: string }> = [];
  const edges: Array<{ from: string; to: string; label?: string }> = [];
  const vpcGroups = new Map<string, string[]>();
  const arnToResId = new Map<string, string>();

  for (const res of parsed.resources) {
    if (res.type.startsWith("aws_iam_") || res.type.includes("route_table") || res.type.includes("security_group")) {
      continue;
    }

    const firstInst = res.instances?.[0]?.attributes;
    const resId = sanitizeId(`${res.type}_${res.name}`);
    const kind = inferKindFromTfType(res.type);
    const label = firstInst?.tags?.["Name"] || firstInst?.name || `${res.type.split("_").slice(-1)[0]}: ${res.name}`;
    const vpcId = typeof firstInst?.vpc_id === "string" ? sanitizeId(firstInst.vpc_id) : undefined;

    nodes.push({ id: resId, kind, label, vpcId });

    if (typeof firstInst?.arn === "string") {
      arnToResId.set(firstInst.arn, resId);
    }

    if (vpcId) {
      if (!vpcGroups.has(vpcId)) vpcGroups.set(vpcId, []);
      vpcGroups.get(vpcId)!.push(resId);
    }

    if (typeof firstInst?.load_balancer_arn === "string") {
      edges.push({ from: firstInst.load_balancer_arn, to: resId, label: "routes" });
    }
  }

  // Resolve ARN edges
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    if (edge.from.startsWith("arn:") && arnToResId.has(edge.from)) {
      edge.from = arnToResId.get(edge.from)!;
    } else if (edge.from.startsWith("arn:")) {
      edge.from = sanitizeId(edge.from); // Fallback
    }
  }

  const out: string[] = [];
  out.push(`scene "${sceneTitle}" theme=paper`);
  out.push("layout LR");
  out.push("");

  for (const [vpc, members] of vpcGroups) {
    if (members.length > 1) {
      out.push(`group ${vpc} "VPC Network": ${members.join(" ")}`);
    }
  }

  for (const n of nodes) {
    out.push(`${n.kind} ${n.id} "${n.label}"`);
  }

  out.push("");
  out.push('beat main "Provisioned Infrastructure Flow":');
  out.push("  show $nodes stagger=40ms");

  if (edges.length > 0) {
    for (const e of edges) {
      out.push(`  ${e.from} -> ${e.to} "${e.label || "connect"}"`);
    }
  } else if (nodes.length >= 2) {
    out.push(`  ${nodes[0].id} -> ${nodes[1].id} "traffic"`);
  }

  return out.join("\n");
}
