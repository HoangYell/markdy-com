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
  AgentOrchestrator <- MCPToolExecutor "Observation Receipt"
  UserClient <- AgentOrchestrator "Goal Achieved: Deployed successfully"
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
  {
    id: "agentic-multi-swarm",
    name: "Autonomous Multi-Agent Engineering Swarm",
    category: "ai",
    description: "Multi-agent collaborative architecture with Orchestrator Leader, Specialized Coder/Reviewer Subagents, Sandboxed Tool Execution, and Consensus Verification.",
    keywords: ["agent", "swarm", "multi-agent", "orchestrator", "mcp", "subagent", "sandbox", "ai"],
    recommendedLayout: "LR",
    primaryNodes: ["UserLead", "OrchestratorAgent", "CoderSubagent", "ReviewerSubagent", "SandboxRuntime"],
    highlights: [
      "Dynamic hierarchical task delegation",
      "Dual-agent verification & adversarial review",
      "Isolated sandboxed execution with telemetry",
    ],
    code: `scene "Autonomous Multi-Agent Engineering Swarm" theme=graphite
layout LR

browser UserLead "Lead Engineer / IDE" icon=gemini
service OrchestratorAgent "Orchestrator Leader" icon=nodejs @src="src/agent/leader.ts#L10"
service CoderSubagent "Coder Subagent" icon=typescript @src="src/agent/coder.ts#L15"
service ReviewerSubagent "Reviewer Subagent" icon=python @src="src/agent/critic.ts#L20"
service SandboxRuntime "Secure Tool Sandbox" icon=docker @src="src/tools/mcp_host.ts#L5"

beat task_delegation "1. Task Decomposition & Parallel Spawn":
  show $nodes stagger=60ms
  UserLead -> OrchestratorAgent "Prompt: Implement Feature & Tests"
  OrchestratorAgent -> CoderSubagent "Spawn task: Write TypeScript Implementation"
  OrchestratorAgent -> ReviewerSubagent "Spawn task: Construct Invariant Quality Gate"

beat tool_verification "2. Sandboxed Execution & Review Consensus":
  CoderSubagent -> SandboxRuntime "Execute unit tests in sandbox"
  CoderSubagent <- SandboxRuntime "308 tests pass (100%)"
  ReviewerSubagent -> CoderSubagent "Verify Code Provenance & Zero Regressions"
  OrchestratorAgent <- ReviewerSubagent "Consensus Approved: Ready for PR"
  UserLead <- OrchestratorAgent "200 Feature Complete & Verified"
  glow OrchestratorAgent color=#38bdf8 & glow SandboxRuntime color=#10b981
`,
  },
  {
    id: "edge-serverless-mesh",
    name: "Edge-First Serverless & Distributed Vector Mesh",
    category: "resilience",
    description: "Ultra-low-latency globally distributed edge architecture with Cloudflare Workers, KV caching, D1 relational store, and Vectorize embedding search.",
    keywords: ["edge", "cloudflare", "workers", "serverless", "d1", "vector", "embedding", "kv"],
    recommendedLayout: "LR",
    primaryNodes: ["GlobalClient", "EdgeWorker", "EdgeKV", "D1Database", "VectorizeStore"],
    highlights: [
      "Sub-10ms global edge invocation",
      "Local relational replication with D1",
      "Native vector similarity lookup at the edge",
    ],
    code: `scene "Edge-First Serverless & Vector Mesh" theme=paper
layout LR

browser GlobalClient "Global Mobile/Web Client" icon=chrome
gateway EdgeWorker "Cloudflare Edge Worker" icon=cloudflare @src="src/worker/index.ts#L1"
cache EdgeKV "Global KV Cache" icon=redis
database D1Database "Cloudflare D1 SQL" icon=postgresql @src="src/db/schema.sql#L10"
database VectorizeStore "Vectorize Embedding DB" icon=gemini

beat edge_lookup "1. Nearest Edge Routing & Cache Hit":
  show $nodes stagger=50ms
  GlobalClient -> EdgeWorker "GET /recommendations (Geo: Tokyo)"
  EdgeWorker -> EdgeKV "GET edge_cache:user_tokyo"
  EdgeWorker <- EdgeKV "Hit (3ms latency)"

beat semantic_search "2. Edge Vector Search & D1 Fetch":
  EdgeWorker -> VectorizeStore "Query vector topK=5"
  EdgeWorker <- VectorizeStore "Embedding Matches"
  EdgeWorker -> D1Database "SELECT metadata FROM products WHERE id IN (...)"
  EdgeWorker <- D1Database "Product Records"
  GlobalClient <- EdgeWorker "200 OK (8ms total transit)"
  glow EdgeWorker color=#f59e0b & glow VectorizeStore color=#ec4899
`,
  },
  {
    id: "zero-downtime-canary",
    name: "Zero-Downtime Blue-Green & Canary Deployment",
    category: "resilience",
    description: "Progressive delivery traffic routing with Envoy/Ingress, Blue (Stable) vs Green (Canary) cluster weighting, and automated rollback on error spikes.",
    keywords: ["canary", "blue-green", "deployment", "envoy", "kubernetes", "traffic", "rollback", "zero-downtime"],
    recommendedLayout: "LR",
    primaryNodes: ["IngressController", "EnvoyMesh", "BlueCluster", "GreenCanary", "PrometheusWatcher"],
    highlights: [
      "Fine-grained 90/10 traffic split",
      "Zero dropped active connections during migration",
      "Sub-second automated circuit breaker rollback",
    ],
    code: `scene "Zero-Downtime Canary Deployment" theme=terminal
layout LR

browser UserTraffic "Live Production Traffic" icon=chrome
gateway EnvoyMesh "Envoy Service Mesh" icon=envoy @src="k8s/envoy-config.yaml#L1"
service BlueCluster "Blue Pods (v1.2.0 Stable 90%)" icon=kubernetes @src="deploy/blue.yaml#L1"
service GreenCanary "Green Pods (v1.3.0 Canary 10%)" icon=docker @src="deploy/green.yaml#L1"
service PrometheusWatcher "Canary Health Sentry" icon=prometheus

beat canary_routing "1. Weighted Traffic Split (90/10)":
  show $nodes stagger=50ms
  UserTraffic -> EnvoyMesh "Production Request Pool"
  EnvoyMesh -> BlueCluster "Route 90% Stable"
  EnvoyMesh -> GreenCanary "Route 10% Canary"

beat health_verification "2. Automated Sentry Gate & 100% Promotion":
  PrometheusWatcher -> GreenCanary "Monitor Error Rate (< 0.01%) & P99"
  PrometheusWatcher -> EnvoyMesh "Signal: Canary Healthy -> Shift 100% to Green"
  EnvoyMesh -> GreenCanary "Promote to 100% Live"
  glow GreenCanary color=#22c55e & glow BlueCluster color=#64748b
`,
  },
  {
    id: "opentelemetry-tracing",
    name: "Full-Stack Distributed Tracing & Observability",
    category: "observability",
    description: "End-to-end W3C trace context propagation across Frontend, API Gateway, Microservices, and OpenTelemetry Collector with Jaeger/Grafana visualization.",
    keywords: ["opentelemetry", "tracing", "jaeger", "grafana", "prometheus", "span", "context", "observability"],
    recommendedLayout: "LR",
    primaryNodes: ["WebFrontend", "ApiGateway", "OrderService", "OtelCollector", "JaegerGrafana"],
    highlights: [
      "Unified W3C traceparent context injection",
      "Non-blocking asynchronous telemetry batching",
      "Unified metrics, logs, and trace correlation",
    ],
    code: `scene "Full-Stack Distributed Tracing" theme=editorial
layout LR

browser WebFrontend "Web App (OTel Web SDK)" icon=chrome @src="src/tracing/web.ts#L5"
gateway ApiGateway "Kong API Gateway" icon=nginx
service OrderService "Order Microservice" icon=golang @src="src/orders/main.go#L30"
service OtelCollector "OpenTelemetry Collector" icon=docker @src="otel/collector.yaml#L1"
database JaegerGrafana "Jaeger & Grafana Cloud" icon=datadog

beat trace_propagation "1. Context Injection & Downstream Propagation":
  show $nodes stagger=50ms
  WebFrontend -> ApiGateway "POST /checkout [traceparent: 00-4bf92...]"
  ApiGateway -> OrderService "Forward [traceparent: 00-4bf92...]"
  WebFrontend ~> OtelCollector "Async Span: browser_render (42ms)"

beat collector_export "2. OTLP gRPC Batch Ingestion & Indexing":
  ApiGateway ~> OtelCollector "Async Span: gateway_auth (12ms)"
  OrderService ~> OtelCollector "Async Span: db_transaction (88ms)"
  OtelCollector -> JaegerGrafana "Export OTLP Batch (Traces + Metrics)"
  glow OtelCollector color=#38bdf8 & glow JaegerGrafana color=#ec4899
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

export interface SynthesizedRecipeResult {
  markdyScript: string;
  detectedComponents: Array<{ id: string; label: string; kind: string; icon?: string }>;
  inferredPattern: string;
  rationale: string;
}

/**
 * Zero-token deterministic dynamic architecture synthesis engine.
 * Parses user requirements and synthesizes custom tailor-made MarkdyScript diagrams.
 */
export function synthesizeCustomRecipe(query: string): SynthesizedRecipeResult {
  const text = query.toLowerCase();
  const detected: Array<{ id: string; label: string; kind: string; icon?: string }> = [];

  // 1. Client / Frontend Detection
  if (text.includes("next") || text.includes("nextjs") || text.includes("react") || text.includes("web")) {
    detected.push({ id: "NextApp", label: "Next.js Web Client", kind: "browser", icon: "chrome" });
  } else if (text.includes("mobile") || text.includes("ios") || text.includes("android") || text.includes("flutter")) {
    detected.push({ id: "MobileApp", label: "Mobile Client Application", kind: "mobile", icon: "chrome" });
  } else {
    detected.push({ id: "ClientApp", label: "Client Application", kind: "browser", icon: "chrome" });
  }

  // 2. Gateway / Edge Proxy Detection
  if (text.includes("cloudflare") || text.includes("edge") || text.includes("cdn")) {
    detected.push({ id: "CloudflareEdge", label: "Cloudflare Edge Ingress", kind: "gateway", icon: "cloudflare" });
  } else if (text.includes("nginx") || text.includes("envoy") || text.includes("kong") || text.includes("gateway")) {
    detected.push({ id: "ApiGateway", label: "API Gateway & Ingress", kind: "gateway", icon: "nginx" });
  }

  // 3. Security / Auth / Third-Party Integration
  if (text.includes("stripe") || text.includes("payment") || text.includes("checkout")) {
    detected.push({ id: "StripeGateway", label: "Stripe Payment Gateway", kind: "service", icon: "docker" });
  }
  if (text.includes("keycloak") || text.includes("auth0") || text.includes("jwt") || text.includes("oauth")) {
    detected.push({ id: "AuthService", label: "Identity & Access Provider", kind: "service", icon: "keycloak" });
  }
  if (text.includes("vault") || text.includes("secret") || text.includes("opa")) {
    detected.push({ id: "SecurityVault", label: "Security & Secret Store", kind: "service", icon: "vault" });
  }

  // 4. Core Backend Services
  if (text.includes("fastapi") || text.includes("python") || text.includes("django")) {
    detected.push({ id: "PythonBackend", label: "FastAPI Core Service", kind: "service", icon: "python" });
  } else if (text.includes("go") || text.includes("golang") || text.includes("gin")) {
    detected.push({ id: "GoCoreSvc", label: "Go Microservice Core", kind: "service", icon: "golang" });
  } else if (text.includes("rust") || text.includes("actix") || text.includes("axum")) {
    detected.push({ id: "RustService", label: "High-Performance Rust Core", kind: "service", icon: "docker" });
  } else if (text.includes("nest") || text.includes("express") || text.includes("node") || text.includes("typescript")) {
    detected.push({ id: "BackendSvc", label: "Node.js Backend Service", kind: "service", icon: "nodejs" });
  } else {
    detected.push({ id: "AppService", label: "Application Core Service", kind: "service", icon: "nodejs" });
  }

  // 5. Cache Layer
  if (text.includes("redis") || text.includes("cache") || text.includes("memcached")) {
    detected.push({ id: "RedisCache", label: "Redis Distributed Cache", kind: "cache", icon: "redis" });
  }

  // 6. Queue / Streaming Layer
  if (text.includes("kafka") || text.includes("stream") || text.includes("event") || text.includes("cdc")) {
    detected.push({ id: "KafkaStream", label: "Kafka Event Stream", kind: "queue", icon: "kafka" });
  } else if (text.includes("rabbit") || text.includes("queue") || text.includes("sqs") || text.includes("nats")) {
    detected.push({ id: "MessageQueue", label: "Message Queue Broker", kind: "queue", icon: "rabbitmq" });
  }

  // 7. Database Layer
  if (text.includes("postgres") || text.includes("postgresql") || text.includes("sql") || text.includes("db")) {
    detected.push({ id: "PostgresDB", label: "PostgreSQL 16 Primary", kind: "database", icon: "postgresql" });
  } else if (text.includes("mongo") || text.includes("nosql") || text.includes("dynamo")) {
    detected.push({ id: "NoSqlStore", label: "NoSQL Document Store", kind: "database", icon: "docker" });
  } else {
    detected.push({ id: "PrimaryDB", label: "Primary Database Store", kind: "database", icon: "postgresql" });
  }

  // Deduplicate IDs
  const nodeMap = new Map<string, typeof detected[0]>();
  for (const n of detected) {
    if (!nodeMap.has(n.id)) nodeMap.set(n.id, n);
  }
  const nodes = Array.from(nodeMap.values());

  // Build MarkdyScript dynamically
  const lines: string[] = [];
  lines.push(`scene "Synthesized Architecture: ${query.slice(0, 40)}" theme=midnight`);
  lines.push(`layout LR`);
  lines.push(``);

  for (const node of nodes) {
    const iconAttr = node.icon ? ` icon=${node.icon}` : "";
    lines.push(`${node.kind} ${node.id} "${node.label}"${iconAttr}`);
  }

  // Separate ingress stage vs downstream persistence/events stage
  const clientNode = nodes.find((n) => n.kind === "browser" || n.kind === "mobile") || nodes[0];
  const gatewayNode = nodes.find((n) => n.kind === "gateway");
  const mainSvc = nodes.find((n) => n.kind === "service") || nodes[1];
  const dbNode = nodes.find((n) => n.kind === "database") || nodes[nodes.length - 1];
  const cacheNode = nodes.find((n) => n.kind === "cache");
  const queueNode = nodes.find((n) => n.kind === "queue");

  const ingressSet = new Set([clientNode, gatewayNode, mainSvc, cacheNode].filter(Boolean).map((n) => n!.id));
  const downstreamSet = new Set(nodes.filter((n) => !ingressSet.has(n.id)).map((n) => n.id));

  lines.push(``);
  lines.push(`beat synchronous_flow "1. Client Ingress & Request Path":`);
  lines.push(`  show ${Array.from(ingressSet).join(" ")} stagger=50ms`);

  if (gatewayNode) {
    lines.push(`  ${clientNode.id} -> ${gatewayNode.id} "HTTPS TLS Request" -> ${mainSvc.id} "Route dispatch"`);
  } else {
    lines.push(`  ${clientNode.id} -> ${mainSvc.id} "HTTPS API Request"`);
  }

  if (cacheNode) {
    lines.push(`  ${mainSvc.id} -> ${cacheNode.id} "GET /cached-data"`);
  }

  if (downstreamSet.size > 0) {
    lines.push(``);
    if (queueNode) {
      lines.push(`beat downstream_flow "2. Persistence & Asynchronous Event Bus":`);
      lines.push(`  show ${Array.from(downstreamSet).join(" ")} stagger=50ms`);
      lines.push(`  ${mainSvc.id} -> ${dbNode.id} "SELECT / INSERT transaction"`);
      lines.push(`  ${mainSvc.id} ~> ${queueNode.id} "Publish state.changed"`);
      lines.push(`  glow ${queueNode.id} color=#38bdf8 & glow ${dbNode.id} color=#10b981`);
    } else {
      lines.push(`beat persistence_and_response "2. State Commit & Response":`);
      lines.push(`  show ${Array.from(downstreamSet).join(" ")} stagger=50ms`);
      lines.push(`  ${mainSvc.id} -> ${dbNode.id} "SELECT / INSERT transaction"`);
      lines.push(`  ${clientNode.id} <- ${mainSvc.id} "200 OK JSON Response"`);
      lines.push(`  glow ${mainSvc.id} color=#38bdf8 & glow ${dbNode.id} color=#10b981`);
    }
  } else {
    lines.push(``);
    lines.push(`beat ack_response "2. Acknowledged Response":`);
    lines.push(`  ${clientNode.id} <- ${mainSvc.id} "200 OK Response"`);
    lines.push(`  glow ${mainSvc.id} color=#38bdf8`);
  }

  return {
    markdyScript: lines.join("\n") + "\n",
    detectedComponents: nodes,
    inferredPattern: queueNode ? "Event-Driven Microservices" : "Layered Service Mesh",
    rationale: `Synthesized ${nodes.length} architectural components (${nodes.map((n) => n.id).join(", ")}) based on query criteria.`,
  };
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

