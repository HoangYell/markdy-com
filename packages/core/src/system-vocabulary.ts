export const TECHNICAL_NODE_TYPES = [
  "service", "api", "microservice", "backend", "server", "worker", "job", "scheduler", "cron", "batch", "function", "lambda", "edge", "controller", "handler", "repository", "module", "package", "library", "sdk", "cli", "runtime", "process",
  "client", "user", "browser", "web", "mobile", "desktop", "frontend", "app", "page", "view", "component", "store",
  "db", "database", "sql", "nosql", "table", "index", "warehouse", "lake", "object_store", "bucket", "blob", "volume", "disk", "search", "cache",
  "queue", "topic", "stream", "event", "event_bus", "bus", "broker", "pubsub", "kafka", "producer", "consumer", "dead_letter", "dlq", "webhook",
  "cloud", "region", "vpc", "subnet", "network", "internet", "dns", "cdn", "proxy", "gateway", "api_gateway", "load_balancer", "reverse_proxy", "router", "switch", "nat", "firewall", "waf", "vpn", "bastion",
  "container", "cluster", "pod", "node", "deployment", "replicaset", "statefulset", "daemonset", "namespace", "ingress", "service_mesh", "sidecar", "image", "registry", "docker", "compose", "helm", "chart", "configmap", "pvc",
  "auth", "identity", "oauth", "oidc", "jwt", "session", "policy", "role", "permission", "vault", "secret", "key", "certificate",
  "repo", "branch", "commit", "pipeline", "workflow", "runner", "build", "test", "artifact", "deploy", "release", "environment", "preview",
  "monitor", "metrics", "logs", "trace", "alert", "dashboard", "probe", "slo",
  "start", "end", "state", "decision", "condition", "step", "loop", "sequence", "participant",
  "replica", "shard", "leader", "follower", "quorum", "consensus", "lock",
  "class", "interface", "method", "object", "enum", "type",
] as const;

export const VISUAL_PRIMITIVE_TYPES = [
  "panel", "surface",
  "terminal",
  "metric", "stat",
  "grid", "matrix",
  "lane", "track",
  "marker", "dot",
  "token_strip", "chips",
  "glyph_card", "glyph",
] as const;

export const TECHNICAL_NODE_KINDS: Record<(typeof TECHNICAL_NODE_TYPES)[number], string> = {
  service: "compute", api: "compute", microservice: "compute", backend: "compute", server: "compute", worker: "compute", job: "compute", scheduler: "compute", cron: "compute", batch: "compute", function: "compute", lambda: "compute", edge: "compute", controller: "compute", handler: "compute", repository: "compute", runtime: "compute", process: "compute",
  module: "code", package: "code", library: "code", sdk: "code", cli: "code", class: "code", interface: "code", method: "code", object: "code", enum: "code", type: "code",
  client: "client", user: "client", browser: "client", web: "client", mobile: "client", desktop: "client", frontend: "client", app: "client", page: "client", view: "client", component: "client", store: "client",
  db: "data", database: "data", sql: "data", nosql: "data", table: "data", index: "data", warehouse: "data", lake: "data", object_store: "data", bucket: "data", blob: "data", volume: "data", disk: "data", search: "data", cache: "data",
  queue: "messaging", topic: "messaging", stream: "messaging", event: "messaging", event_bus: "messaging", bus: "messaging", broker: "messaging", pubsub: "messaging", kafka: "messaging", producer: "messaging", consumer: "messaging", dead_letter: "messaging", dlq: "messaging", webhook: "messaging",
  cloud: "network", region: "network", vpc: "network", subnet: "network", network: "network", internet: "network", dns: "network", cdn: "network", proxy: "network", gateway: "network", api_gateway: "network", load_balancer: "network", reverse_proxy: "network", router: "network", switch: "network", nat: "network", firewall: "network", waf: "network", vpn: "network", bastion: "network",
  container: "platform", cluster: "platform", pod: "platform", node: "platform", deployment: "platform", replicaset: "platform", statefulset: "platform", daemonset: "platform", namespace: "platform", ingress: "platform", service_mesh: "platform", sidecar: "platform", image: "platform", registry: "platform", docker: "platform", compose: "platform", helm: "platform", chart: "platform", configmap: "platform", pvc: "platform",
  auth: "security", identity: "security", oauth: "security", oidc: "security", jwt: "security", session: "security", policy: "security", role: "security", permission: "security", vault: "security", secret: "security", key: "security", certificate: "security",
  repo: "delivery", branch: "delivery", commit: "delivery", pipeline: "delivery", workflow: "delivery", runner: "delivery", build: "delivery", test: "delivery", artifact: "delivery", deploy: "delivery", release: "delivery", environment: "delivery", preview: "delivery",
  monitor: "observability", metrics: "observability", logs: "observability", trace: "observability", alert: "observability", dashboard: "observability", probe: "observability", slo: "observability",
  start: "flow", end: "flow", state: "flow", decision: "flow", condition: "flow", step: "flow", loop: "flow", sequence: "flow", participant: "flow",
  replica: "distributed", shard: "distributed", leader: "distributed", follower: "distributed", quorum: "distributed", consensus: "distributed", lock: "distributed",
};
