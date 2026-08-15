/**
 * packages/core/src/classifier.ts
 * Deep Technology and Semantic Classifier for Markdy.
 * Zero external dependencies.
 */

export interface SemanticProfile {
  kind: string;
  role: string;
  suggestedTheme: string;
  badge?: string;
}

interface TechRule {
  patterns: RegExp[];
  kind: string;
  role: string;
  badge?: string;
}

const TECH_CATALOG: TechRule[] = [
  // ── DATABASES ───────────────────────────────────────────────────────
  {
    patterns: [/\b(postgres(ql)?|psql|cockroach(db)?|timescale)\b/i],
    kind: "database",
    role: "database",
    badge: "SQL",
  },
  {
    patterns: [/\b(mysql|mariadb|aurora|planetscale)\b/i],
    kind: "database",
    role: "database",
    badge: "MySQL",
  },
  {
    patterns: [/\b(mongodb|mongo|documentdb|couchdb)\b/i],
    kind: "database",
    role: "database",
    badge: "Document",
  },
  {
    patterns: [/\b(dynamodb|cassandra|scylla|hbase)\b/i],
    kind: "database",
    role: "database",
    badge: "NoSQL",
  },
  {
    patterns: [/\b(redis|memcached?|elasticache|dragonfly|valkey)\b/i],
    kind: "cache",
    role: "cache",
    badge: "Cache",
  },
  {
    patterns: [/\b(neo4j|memgraph|dgraph|graphdb)\b/i],
    kind: "database",
    role: "database",
    badge: "Graph",
  },
  {
    patterns: [/\b(clickhouse|snowflake|bigquery|redshift|duckdb)\b/i],
    kind: "database",
    role: "database",
    badge: "Analytics",
  },

  // ── MESSAGING & EVENT STREAMING ────────────────────────────────────
  {
    patterns: [/\b(kafka|confluent|redpanda)\b/i],
    kind: "queue",
    role: "event_stream",
    badge: "EventStream",
  },
  {
    patterns: [/\b(rabbitmq|sqs|activemq|pulsar|nats|eventgrid|servicebus)\b/i],
    kind: "queue",
    role: "queue",
    badge: "Queue",
  },

  // ── GATEWAYS & INGRESS ──────────────────────────────────────────────
  {
    patterns: [/\b(kong|envoy|nginx|traefik|caddy|haproxy|emissary)\b/i],
    kind: "api_gateway",
    role: "gateway",
    badge: "Gateway",
  },
  {
    patterns: [/\b(cloudfront|cloudflare|fastly|akamai|cdn)\b/i],
    kind: "cdn",
    role: "network",
    badge: "CDN",
  },
  {
    patterns: [/\b(alb|elb|nlb|load_?balancer|ingress)\b/i],
    kind: "load_balancer",
    role: "network",
    badge: "LB",
  },

  // ── CLIENT & PRESENTATION ──────────────────────────────────────────
  {
    patterns: [/\b(react|vue|angular|svelte|next(\.?js)?|nuxt|solid)\b/i],
    kind: "browser",
    role: "client",
    badge: "Web",
  },
  {
    patterns: [/\b(flutter|react_?native|ios|android|swift|kotlin|mobile)\b/i],
    kind: "browser",
    role: "client",
    badge: "Mobile",
  },

  // ── AI & LLM ────────────────────────────────────────────────────────
  {
    patterns: [/\b(gemini|gpt(-?[a-z0-9.]+)?|claude|openai|anthropic|bedrock|vertexai|mistral|ollama|deepseek)\b/i],
    kind: "service",
    role: "ai_model",
    badge: "AI/LLM",
  },
  {
    patterns: [/\b(pinecone|weaviate|qdrant|chroma|milvus)\b/i],
    kind: "database",
    role: "database",
    badge: "VectorDB",
  },

  // ── CLOUD & CONTAINER RUNTIMES ─────────────────────────────────────
  {
    patterns: [/\b(k8s|kubernetes|eks|gke|aks|helm|argocd)\b/i],
    kind: "cluster",
    role: "platform",
    badge: "K8s",
  },
  {
    patterns: [/\b(lambda|cloud_?functions?|azure_?functions?|serverless)\b/i],
    kind: "worker",
    role: "compute",
    badge: "Function",
  },
  {
    patterns: [/\b(docker|ecs|container|fargate|cloud_?run)\b/i],
    kind: "service",
    role: "compute",
    badge: "Container",
  },

  // ── STORAGE & BLOB ──────────────────────────────────────────────────
  {
    patterns: [/\b(s3|gcs|azure_?blob|minio|r2|ceph)\b/i],
    kind: "storage",
    role: "storage",
    badge: "ObjectStorage",
  },

  // ── SECURITY & AUTH ─────────────────────────────────────────────────
  {
    patterns: [/\b(auth0|clerk|keycloak|cognito|okta|vault|jwt|oauth|oidc)\b/i],
    kind: "service",
    role: "security",
    badge: "Security",
  },
];

export function classifyTechnology(id: string, label = ""): SemanticProfile {
  const combined = `${id} ${label}`.trim();

  for (const entry of TECH_CATALOG) {
    if (entry.patterns.some((p) => p.test(combined))) {
      return {
        kind: entry.kind,
        role: entry.role,
        suggestedTheme: "paper",
        badge: entry.badge,
      };
    }
  }

  return {
    kind: "service",
    role: "compute",
    suggestedTheme: "paper",
  };
}
