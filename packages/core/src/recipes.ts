/**
 * packages/core/src/recipes.ts
 * Architectural Scenario Recipes & Recommendation Engine for Markdy.
 * Clean-room re-engineered architectural pattern catalog and AI prompt matching.
 * Zero external dependencies.
 */

export interface ArchitectureRecipe {
  id: string;
  name: string;
  category: "caching" | "streaming" | "microservices" | "security" | "data" | "ai" | "resilience" | "consensus" | "observability";
  description: string;
  keywords: string[];
  recommendedLayout: "LR" | "TD" | "TB" | "RL";
  primaryNodes: string[];
  code: string;
  highlights: string[];
}

export const ARCHITECTURE_RECIPES: ArchitectureRecipe[] = [
  {
    id: "cache-aside",
    name: "Multi-Tier Cache-Aside Architecture",
    category: "caching",
    description: "High-performance cache-aside pattern with Redis Cluster, relational database persistence, and asynchronous cache warming.",
    keywords: ["cache", "redis", "postgres", "cache-aside", "hit", "miss", "warm", "database", "latency"],
    recommendedLayout: "LR",
    primaryNodes: ["Client", "Gateway", "URLService", "RedisCluster", "PostgreSQL"],
    highlights: [
      "Sub-millisecond read latency on cache hit",
      "Asynchronous cache population on miss",
      "Graceful fallback on cache eviction",
    ],
    code: `scene "Multi-Tier Cache-Aside Architecture" theme=auto
layout LR

browser Client "Web Client" icon=chrome
gateway Gateway "API Gateway" icon=nginx @src="src/gateway/proxy.ts#L12"
service URLService "URL Service" icon=nodejs @src="src/services/resolver.ts#L25"
cache RedisCluster "Redis Cluster" icon=redis
database PostgreSQL "PostgreSQL 16" icon=postgresql @src="src/db/schema.sql#L1"

beat cache_hit "1. Cache Hit Path":
  show $nodes stagger=60ms
  frame Client Gateway URLService RedisCluster zoom=1.12
  Client -> Gateway "GET /link" -> URLService "resolve"
  URLService -> RedisCluster "GET key:url"
  URLService <- RedisCluster "200 Target URL"
  Client <- Gateway "301 Redirect"

beat cache_miss "2. Cache Miss & Async Warm":
  frame URLService RedisCluster PostgreSQL zoom=1.15
  URLService -> PostgreSQL "SELECT dest WHERE key = 'url'"
  URLService <- PostgreSQL "Row Found"
  URLService ~> RedisCluster "SETEX key:url (TTL 1h)"
  glow PostgreSQL color=#38bdf8 & glow RedisCluster color=#22c55e
`,
  },
  {
    id: "event-driven-eda",
    name: "Event-Driven EDA with Kafka & Change Data Capture",
    category: "streaming",
    description: "Decoupled real-time event streaming pipeline using Kafka/Redpanda with Debezium CDC, Schema Registry, and DLQ handling.",
    keywords: ["kafka", "event", "streaming", "eda", "cdc", "debezium", "pubsub", "dlq", "consumer"],
    recommendedLayout: "LR",
    primaryNodes: ["OrderService", "DebeziumCDC", "KafkaCluster", "NotificationSvc", "AnalyticsConsumer", "DeadLetterQueue"],
    highlights: [
      "Zero dual-write penalty with transactional outbox",
      "Ordered partition publishing with schema validation",
      "Dead Letter Queue for poison-pill isolation",
    ],
    code: `scene "Event-Driven EDA with Kafka & CDC" theme=midnight
layout LR

service OrderSvc "Order Service" icon=golang @src="src/orders/handler.go#L40"
database OrderDB "Order Store" icon=postgresql
service DebeziumCDC "Debezium CDC" icon=docker
queue KafkaCluster "Kafka Event Stream" icon=kafka
service NotificationSvc "Notification Engine" icon=nodejs
service AnalyticsConsumer "Real-Time Analytics" icon=python
queue DLQ "Dead Letter Queue" icon=rabbitmq

beat order_outbox "1. Transactional Outbox Commit":
  show $nodes stagger=50ms
  OrderSvc -> OrderDB "COMMIT (Order + Outbox Event)"
  OrderDB -> DebeziumCDC "WAL Stream"
  DebeziumCDC ~> KafkaCluster "Publish order.created"

beat consumer_fanout "2. Real-Time Consumer Fanout":
  KafkaCluster ~> NotificationSvc "Consume order.created"
  KafkaCluster ~> AnalyticsConsumer "Consume order.created"
  NotificationSvc -> DLQ "Routing Reject (Retries Exceeded)"
  glow KafkaCluster color=#fbbf24 & glow DLQ color=#fb7185
`,
  },
  {
    id: "cqrs-event-sourcing",
    name: "CQRS & Event Sourcing Architecture",
    category: "streaming",
    description: "Strict Command Query Responsibility Segregation with immutable append-only Event Store and read-optimized query projections.",
    keywords: ["cqrs", "event sourcing", "event store", "projection", "read model", "command", "query"],
    recommendedLayout: "LR",
    primaryNodes: ["CommandAPI", "CommandHandler", "EventStore", "ProjectionEngine", "ReadDB", "QueryAPI"],
    highlights: [
      "Complete auditability via append-only event stream",
      "Independent write-scaling and read-scaling",
      "Zero lock contention between queries and mutations",
    ],
    code: `scene "CQRS & Event Sourcing Architecture" theme=blueprint
layout LR

gateway CommandAPI "Command API" icon=nginx
service CommandHandler "Command Handler" icon=golang @src="src/commands/execute.go#L18"
database EventStore "Event Store (Append-Only)" icon=cassandra
service ProjectionEngine "Projection Engine" icon=rust @src="src/projections/sync.rs#L30"
database ReadDB "Read Database" icon=mongodb
gateway QueryAPI "Query API" icon=nodejs

beat write_command "1. Command & Append Event":
  show $nodes stagger=60ms
  CommandAPI -> CommandHandler "POST /orders/create"
  CommandHandler -> EventStore "APPEND OrderCreatedEvent"
  CommandHandler <- EventStore "Event Ack (Offset: 10482)"
  CommandAPI <- CommandHandler "202 Accepted"

beat async_projection "2. Asynchronous Projection Update":
  EventStore ~> ProjectionEngine "Tail Commit Log"
  ProjectionEngine -> ReadDB "UPSERT Materialized Order View"
  QueryAPI -> ReadDB "SELECT * FROM orders WHERE id = :id"
  QueryAPI <- ReadDB "Read Model Payload"
`,
  },
  {
    id: "api-gateway-mesh",
    name: "Cloud-Native API Gateway & Service Mesh",
    category: "microservices",
    description: "Enterprise zero-trust microservices architecture with Envoy/Istio service mesh, mTLS enforcement, and distributed tracing.",
    keywords: ["gateway", "mesh", "envoy", "istio", "microservices", "mtls", "kubernetes", "discovery"],
    recommendedLayout: "LR",
    primaryNodes: ["IngressGateway", "AuthService", "OrderMeshSvc", "PaymentMeshSvc", "InventoryMeshSvc", "JaegerCollector"],
    highlights: [
      "Strict mTLS identity verification between sidecars",
      "Global rate limiting and distributed OpenTelemetry spans",
      "Dynamic circuit breaking and automated retries",
    ],
    code: `scene "Cloud-Native API Gateway & Service Mesh" theme=graphite
layout LR

gateway IngressGateway "Envoy Ingress Gateway" icon=envoy @src="k8s/gateway.yaml#L1"
service AuthService "Auth & Token Service" icon=nodejs @src="src/auth/token.ts#L44"
service OrderMeshSvc "Order Service (mTLS)" icon=golang
service PaymentMeshSvc "Payment Gateway (mTLS)" icon=nodejs
service InventoryMeshSvc "Inventory Service (mTLS)" icon=python
service JaegerCollector "OpenTelemetry Collector" icon=jaeger

beat ingress_auth "1. Edge Authentication & Route Verification":
  show $nodes stagger=50ms
  IngressGateway -> AuthService "Validate JWT Bearer"
  IngressGateway <- AuthService "Claims Verified"
  IngressGateway ~> JaegerCollector "Span: ingress_entry"

beat internal_mesh_flow "2. Internal mTLS Mesh Fanout":
  IngressGateway -> OrderMeshSvc "POST /checkout (mTLS)"
  OrderMeshSvc -> PaymentMeshSvc "POST /charge (mTLS)"
  OrderMeshSvc -> InventoryMeshSvc "POST /reserve (mTLS)"
  PaymentMeshSvc ~> JaegerCollector "Span: payment_settled"
  InventoryMeshSvc ~> JaegerCollector "Span: inventory_reserved"
  glow IngressGateway color=#38bdf8 & glow OrderMeshSvc color=#22c55e
`,
  },
  {
    id: "zero-trust-security",
    name: "Zero-Trust Security & Enclave Perimeter",
    category: "security",
    description: "Defense-in-depth zero-trust security perimeter featuring OIDC authentication, Open Policy Agent authorization, and Nitro Enclaves.",
    keywords: ["security", "zero-trust", "oidc", "opa", "policy", "enclave", "encryption", "vault", "waf"],
    recommendedLayout: "LR",
    primaryNodes: ["CloudflareWAF", "IdentityOIDC", "PolicyEngineOPA", "KeyVault", "SecureEnclave", "AuditLogStore"],
    highlights: [
      "Continuous runtime identity verification on every invocation",
      "Confidential computing in isolated CPU Nitro enclaves",
      "Immutable write-once cryptographic audit trail",
    ],
    code: `scene "Zero-Trust Security & Enclave Perimeter" theme=midnight
layout LR

gateway CloudflareWAF "Cloudflare Edge WAF" icon=cloudflare
service IdentityOIDC "Identity Provider (OIDC)" icon=keycloak
service PolicyEngineOPA "Policy Engine (OPA)" icon=opa @src="policies/authz.rego#L1"
service KeyVault "HashiCorp Vault" icon=vault @src="config/vault.hcl#L10"
service SecureEnclave "AWS Nitro Enclave" icon=aws
database AuditLogStore "WORM Audit Store" icon=s3

beat access_request "1. Identity & Policy Evaluation":
  show $nodes stagger=60ms
  CloudflareWAF -> IdentityOIDC "Authenticate Request"
  CloudflareWAF <- IdentityOIDC "Token Issued"
  CloudflareWAF -> PolicyEngineOPA "Evaluate RBAC/ABAC Context"
  CloudflareWAF <- PolicyEngineOPA "Decision: ALLOW"

beat confidential_execution "2. Enclave Decryption & Audit":
  CloudflareWAF -> SecureEnclave "Execute Protected Payload"
  SecureEnclave -> KeyVault "Request Ephemeral Decryption Key"
  SecureEnclave <- KeyVault "Key Granted"
  SecureEnclave ~> AuditLogStore "Cryptographic Audit Receipt"
  glow SecureEnclave color=#fb7185 & glow KeyVault color=#a78bfa
`,
  },
  {
    id: "medallion-lakehouse",
    name: "Medallion Data Lakehouse Architecture",
    category: "data",
    description: "Modern data engineering pipeline organizing raw, cleansed, and curated data across Bronze, Silver, and Gold tiers.",
    keywords: ["data", "lakehouse", "medallion", "bronze", "silver", "gold", "spark", "delta", "iceberg", "analytics"],
    recommendedLayout: "LR",
    primaryNodes: ["RawIngestKafka", "BronzeLake", "SparkCleansing", "SilverLake", "FlinkAggregation", "GoldWarehouse", "SupersetBI"],
    highlights: [
      "ACID transactions over object storage with Delta/Iceberg",
      "Multi-stage data quality checks between Bronze and Silver",
      "Sub-second dimensional queries on Gold warehouse",
    ],
    code: `scene "Medallion Data Lakehouse Architecture" theme=editorial
layout LR

queue RawIngestKafka "Raw Event Ingestion" icon=kafka
database BronzeLake "Bronze Lake (Raw Ingest)" icon=s3
service SparkCleansing "Spark Cleansing Job" icon=spark @src="jobs/cleanse_bronze.py#L15"
database SilverLake "Silver Lake (Enriched)" icon=delta
service FlinkAggregation "Flink Streaming Aggregator" icon=flink
database GoldWarehouse "Gold Warehouse (Curated)" icon=snowflake
browser SupersetBI "Apache Superset BI" icon=superset

beat bronze_ingest "1. Raw Stream to Bronze Tier":
  show $nodes stagger=60ms
  RawIngestKafka -> BronzeLake "Append Raw JSON Payload"
  BronzeLake -> SparkCleansing "Trigger Micro-Batch"

beat silver_and_gold "2. Cleansing, Enrichment & BI Serving":
  SparkCleansing -> SilverLake "Upsert Deduplicated Parquet"
  SilverLake -> FlinkAggregation "Stream Entity Updates"
  FlinkAggregation -> GoldWarehouse "Merge Into Star Schema"
  SupersetBI -> GoldWarehouse "Execute Dimensional Query"
  SupersetBI <- GoldWarehouse "Render Dashboard Metrics"
`,
  },
  {
    id: "agentic-react-tools",
    name: "Agentic AI Orchestrator & Tool Execution Loop",
    category: "ai",
    description: "Autonomous ReAct agent system with LLM Orchestrator, dynamic context memory, vector embeddings, and MCP tool execution.",
    keywords: ["ai", "agent", "llm", "react", "tool", "mcp", "vector", "rag", "orchestrator", "prompt"],
    recommendedLayout: "LR",
    primaryNodes: ["UserClient", "AgentOrchestrator", "VectorMemory", "ModelInference", "MCPToolExecutor", "SandboxRuntime"],
    highlights: [
      "Interactive reasoning loop (Thought -> Action -> Observation)",
      "Hybrid semantic search over vector memory store",
      "Secure sandboxed runtime for tool call executions",
    ],
    code: `scene "Agentic AI Orchestrator & Tool Loop" theme=nebula
layout LR

browser UserClient "User Workspace" icon=terminal
service AgentOrchestrator "ReAct Agent Orchestrator" icon=python @src="agent/core.py#L35"
database VectorMemory "Vector Memory (RAG)" icon=redis
service ModelInference "LLM Inference API" icon=gemini
service MCPToolExecutor "MCP Tool Protocol" icon=docker @src="agent/mcp_client.py#L20"
service SandboxRuntime "Secure Container Sandbox" icon=docker

beat agent_thought "1. Plan & Context Retrieval":
  show $nodes stagger=60ms
  UserClient -> AgentOrchestrator "Goal: Deploy microservice"
  AgentOrchestrator -> VectorMemory "Query Relevant Runbooks"
  AgentOrchestrator <- VectorMemory "Runbook Context Vectors"
  AgentOrchestrator -> ModelInference "Generate Plan & Tool Call"
  AgentOrchestrator <- ModelInference "Call: run_command(kubectl apply)"

beat tool_execution "2. MCP Tool Execution & Observation":
  AgentOrchestrator -> MCPToolExecutor "Execute Tool Request"
  MCPToolExecutor -> SandboxRuntime "Spawn Container & Execute"
  MCPToolExecutor <- SandboxRuntime "Output: deployment created"
  MCPToolExecutor ~> AgentOrchestrator "Observation Receipt"
  AgentOrchestrator -> UserClient "Goal Achieved: Deployed successfully"
  glow AgentOrchestrator color=#c4b5fd & glow MCPToolExecutor color=#67e8f9
`,
  },
  {
    id: "active-active-failover",
    name: "Multi-Region Active-Active Resilient Failover",
    category: "resilience",
    description: "High-availability global architecture with GeoDNS latency routing, multi-region cluster active-active syncing, and automated failover.",
    keywords: ["resilience", "active-active", "failover", "multi-region", "disaster recovery", "replication", "dns", "ha"],
    recommendedLayout: "LR",
    primaryNodes: ["GlobalDNS", "RegionUSEast", "DBPrimaryEast", "RegionEUWest", "DBPrimaryWest", "HealthProbe"],
    highlights: [
      "Sub-second DNS failover when health probe detects outage",
      "Bi-directional conflict-free replicated database sync (CRDT)",
      "Zero downtime during planned regional maintenance",
    ],
    code: `scene "Multi-Region Active-Active Failover" theme=midnight
layout LR

gateway GlobalDNS "Global Route53 GeoDNS" icon=aws
service RegionUSEast "Region US-East API" icon=kubernetes @src="infra/us-east/app.yaml#L1"
database DBPrimaryEast "Aurora Global DB (East)" icon=postgresql
service RegionEUWest "Region EU-West API" icon=kubernetes @src="infra/eu-west/app.yaml#L1"
database DBPrimaryWest "Aurora Global DB (West)" icon=postgresql
service HealthProbe "Global Health Checker" icon=datadog

beat steady_state "1. Steady-State Geo-Routing & Sync":
  show $nodes stagger=60ms
  GlobalDNS -> RegionUSEast "Route US Traffic"
  RegionUSEast -> DBPrimaryEast "Local Read/Write"
  GlobalDNS -> RegionEUWest "Route EU Traffic"
  RegionEUWest -> DBPrimaryWest "Local Read/Write"
  DBPrimaryEast ~> DBPrimaryWest "Cross-Region Stream Replication"

beat simulated_failover "2. Outage Detection & Instant Failover":
  HealthProbe -> RegionUSEast "HTTP Health Probe (Timeout)"
  HealthProbe ~> GlobalDNS "Withdraw US-East IP from Pool"
  GlobalDNS -> RegionEUWest "Reroute 100% Global Traffic"
  glow RegionEUWest color=#22c55e & glow RegionUSEast color=#fb7185
`,
  },
  {
    id: "distributed-consensus-raft",
    name: "Distributed Consensus & Raft Log Replication",
    category: "consensus",
    description: "Raft consensus protocol state machine with Leader Election, Heartbeat synchronization, and atomic log commitment.",
    keywords: ["raft", "consensus", "leader", "follower", "election", "replication", "distributed", "etcd"],
    recommendedLayout: "LR",
    primaryNodes: ["ClientApp", "RaftLeader", "RaftFollowerA", "RaftFollowerB", "StateStore"],
    highlights: [
      "Guaranteed linearizable reads and writes",
      "Automated leader reelection on heartbeat loss",
      "Strict quorum (N/2 + 1) commit guarantees",
    ],
    code: `scene "Distributed Consensus Raft Engine" theme=paper
layout LR

browser ClientApp "Client Application" icon=terminal
service RaftLeader "Raft Node 1 (Leader)" icon=golang @src="raft/leader.go#L42"
service RaftFollowerA "Raft Node 2 (Follower)" icon=golang @src="raft/follower.go#L20"
service RaftFollowerB "Raft Node 3 (Follower)" icon=golang @src="raft/follower.go#L20"
database StateStore "Committed State Machine" icon=sqlite

beat propose_entry "1. Client Proposal & Log Replication":
  show $nodes stagger=60ms
  ClientApp -> RaftLeader "Propose: SET key = 'val'"
  RaftLeader -> RaftFollowerA "AppendEntries(Term=2, Entry=4)"
  RaftLeader -> RaftFollowerB "AppendEntries(Term=2, Entry=4)"

beat quorum_commit "2. Quorum Acknowledgment & State Commit":
  RaftLeader <- RaftFollowerA "Success Ack"
  RaftLeader <- RaftFollowerB "Success Ack"
  RaftLeader -> StateStore "Apply to State Machine"
  ClientApp <- RaftLeader "200 Commit Acknowledged"
  glow RaftLeader color=#0284c7 & glow StateStore color=#16a34a
`,
  },
  {
    id: "incident-runbook",
    name: "Automated Incident Response & Self-Healing Runbook",
    category: "observability",
    description: "Automated site reliability incident workflow: metric threshold breach, PagerDuty alert, automated pod restart, and status page sync.",
    keywords: ["incident", "sre", "runbook", "pagerduty", "alert", "prometheus", "slack", "self-healing"],
    recommendedLayout: "LR",
    primaryNodes: ["PrometheusAlert", "PagerDutyEngine", "K8sAutoHealer", "SlackIncidentBot", "StatusPageSync"],
    highlights: [
      "Instant multi-channel incident triaging",
      "Automated remediation before human on-call escalation",
      "Zero-latency public status communication",
    ],
    code: `scene "Automated Incident Response Runbook" theme=midnight
layout LR

service PrometheusAlert "Prometheus Alertmanager" icon=prometheus @src="alerts/p99_latency.yaml#L1"
service PagerDutyEngine "PagerDuty Event Router" icon=pagerduty
service K8sAutoHealer "K8s Auto-Remediation" icon=kubernetes @src="runbooks/restart_pod.sh#L5"
service SlackIncidentBot "Slack War Room Bot" icon=slack
service StatusPageSync "Public Status Page" icon=cloudflare

beat alert_trigger "1. High Latency P99 Breach":
  show $nodes stagger=50ms
  PrometheusAlert -> PagerDutyEngine "TRIGGER: P99 Latency > 1500ms"
  PagerDutyEngine -> SlackIncidentBot "Spawn #incident-2026-09"
  PagerDutyEngine -> StatusPageSync "Update: Degraded Performance"

beat auto_heal "2. Self-Healing Pod Recycle & Resolution":
  PagerDutyEngine -> K8sAutoHealer "Execute Remediation Runbook"
  K8sAutoHealer -> PrometheusAlert "Verify Latency Normalized (< 200ms)"
  PagerDutyEngine ~> SlackIncidentBot "Resolved: Auto-healed in 42s"
  PagerDutyEngine ~> StatusPageSync "Update: All Systems Operational"
  glow K8sAutoHealer color=#22c55e & glow StatusPageSync color=#38bdf8
`,
  },
];

export interface PatternRecommendationResult {
  recipe: ArchitectureRecipe;
  score: number;
  matchedKeywords: string[];
  rationale: string;
}

/**
 * Recommends best architecture recipes for a user prompt or requirement query.
 */
export function recommendArchitecturePattern(query: string): PatternRecommendationResult[] {
  const normalized = query.toLowerCase();
  const queryTokens = normalized.split(/[\s,._\-:;/?!]+/).filter(Boolean);

  const results: PatternRecommendationResult[] = [];

  for (const recipe of ARCHITECTURE_RECIPES) {
    let score = 0;
    const matched: string[] = [];

    // Category match
    if (normalized.includes(recipe.category)) {
      score += 10;
      matched.push(`category:${recipe.category}`);
    }

    // Direct id/name match
    if (normalized.includes(recipe.id.replace(/-/g, " "))) {
      score += 25;
      matched.push(recipe.id);
    }

    // Keyword match
    for (const kw of recipe.keywords) {
      if (normalized.includes(kw)) {
        score += 8;
        if (!matched.includes(kw)) matched.push(kw);
      }
    }

    // Token match against recipe name and description
    const descTokens = recipe.description.toLowerCase().split(/\W+/);
    for (const token of queryTokens) {
      if (token.length > 2 && descTokens.includes(token)) {
        score += 3;
      }
    }

    if (score > 0) {
      results.push({
        recipe,
        score,
        matchedKeywords: matched,
        rationale: `Matched ${matched.length} key attributes: ${matched.join(", ")} (Score: ${score})`,
      });
    }
  }

  // Sort descending by match score
  results.sort((a, b) => b.score - a.score);

  // Fallback to top default if no query matches
  if (results.length === 0 && ARCHITECTURE_RECIPES.length > 0) {
    results.push({
      recipe: ARCHITECTURE_RECIPES[0],
      score: 1,
      matchedKeywords: ["default"],
      rationale: "Default canonical cache-aside architecture blueprint",
    });
  }

  return results;
}

/**
 * Retrieves an architecture recipe by its exact ID or alias.
 */
export function getArchitectureRecipe(id: string): ArchitectureRecipe | undefined {
  const cleanId = id.trim().toLowerCase();
  return ARCHITECTURE_RECIPES.find(
    (r) => r.id === cleanId || r.name.toLowerCase().includes(cleanId)
  );
}

/**
 * Lists all available architecture recipes.
 */
export function listArchitectureRecipes(): ArchitectureRecipe[] {
  return [...ARCHITECTURE_RECIPES];
}
