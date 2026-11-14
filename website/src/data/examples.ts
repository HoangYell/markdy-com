/**
 * Single source of truth for shipped demo scenes shown on the landing page,
 * the interactive playground, the docs page, and the dedicated /examples gallery.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type ExampleCategory =
  | "system-design"
  | "distributed-systems"
  | "cloud-infrastructure"
  | "data-engineering"
  | "security-auth"
  | "architecture"
  | "system"
  | "chart"
  | "ui-state"
  | "reliability"
  | "education";

export interface ExampleMeta {
  id: string;
  title: string;
  category: ExampleCategory;
  /** Primary diagram engine/scene type. */
  sceneType:
    | "architecture"
    | "flowchart"
    | "tree"
    | "sequence"
    | "state"
    | "layers"
    | "nested"
    | "swimlane"
    | "timeline"
    | "gantt"
    | "medallion"
    | "flywheel"
    | "constellation"
    | "quadrant"
    | "pyramid"
    | "radar"
    | "venn";
  /** Architecture pattern label for docs/gallery filtering. */
  pattern?: string;
  /** Short description for gallery cards and SEO. */
  description?: string;
  /** Semantic theme used by the scene. */
  theme?: "midnight" | "paper" | "blueprint" | "graphite" | "editorial" | "nebula" | "terminal" | "sketchy" | "ink" | "doodle" | "cad" | "cad-dark";
  /** Path relative to the repo's `examples/` directory. */
  file: string;
  playback?: {
    previewStart?: number;
    loop?: boolean;
  };
}

export interface ExampleEntry extends ExampleMeta {
  sourcePath: string;
  sourceUrl: string;
  code: string;
}

/**
 * Curated 1-per-scene-type premier showcase for the homepage Studio dropdown.
 * Mapped directly to standard Top-Tier Interview & Advanced System Architectures.
 */
export const HOMEPAGE_SHOWCASE_REGISTRY: ExampleMeta[] = [
  {
    id: "url-shortener-architecture",
    title: "Cache-Aside & Sharded Microservices",
    category: "system-design",
    sceneType: "architecture",
    pattern: "cache-aside",
    description: "High-throughput URL shortener with edge CDN, Redis cache warming, and PostgreSQL sharding.",
    theme: "auto",
    file: "showcase/url-shortener-architecture.markdy",
    playback: { previewStart: 0 },
  },
  {
    id: "concurrency-decision-flowchart",
    title: "Python Concurrency Decision Tree",
    category: "system-design",
    sceneType: "flowchart",
    pattern: "decision-tree",
    description: "Decision matrix for selecting Asyncio event loops vs Multiprocessing worker pools.",
    theme: "auto",
    file: "showcase/concurrency-decision-flowchart.markdy",
  },
  {
    id: "consistent-hash-tree",
    title: "Consistent Hash Virtual Node Hierarchy",
    category: "distributed-systems",
    sceneType: "tree",
    pattern: "consistent-hashing",
    description: "Hierarchical partition sharding and virtual node replica routing across a distributed cluster.",
    theme: "auto",
    file: "showcase/consistent-hash-tree.markdy",
  },
  {
    id: "oauth-pkce-sequence",
    title: "OAuth 2.0 PKCE & OIDC Handshake",
    category: "security-auth",
    sceneType: "sequence",
    pattern: "auth-handshake",
    description: "Secure authorization code grant with SHA-256 code challenge, token exchange, and JWT access.",
    theme: "auto",
    file: "showcase/oauth-pkce-sequence.markdy",
  },
  {
    id: "distributed-2pc-state",
    title: "Distributed 2-Phase Commit (2PC)",
    category: "distributed-systems",
    sceneType: "state",
    pattern: "consensus-2pc",
    description: "Coordinator-participant voting state machine: Init -> Preparing -> Prepared / Aborted -> Commit.",
    theme: "auto",
    file: "showcase/distributed-2pc-state.markdy",
  },
  {
    id: "osi-abstraction-layers",
    title: "OSI 7-Layer Abstraction Stack",
    category: "system-design",
    sceneType: "layers",
    pattern: "network-layers",
    description: "Layered network protocol stack from Layer 7 Application down to Layer 1 Physical fiber.",
    theme: "auto",
    file: "showcase/osi-abstraction-layers.markdy",
  },
  {
    id: "nested-security-perimeter",
    title: "Zero-Trust Kubernetes Perimeter",
    category: "cloud-infrastructure",
    sceneType: "nested",
    pattern: "defense-in-depth",
    description: "Concentric security boundaries: External DMZ -> VPC Network -> Private K8s -> HSM Enclave.",
    theme: "auto",
    file: "showcase/nested-security-perimeter.markdy",
  },
  {
    id: "cross-functional-swimlanes",
    title: "Saga Distributed Transaction Swimlanes",
    category: "system-design",
    sceneType: "swimlane",
    pattern: "saga-orchestration",
    description: "Multi-tier cross-functional checkout: Client -> Edge WAF -> Domain Services -> Persistence Vault.",
    theme: "auto",
    file: "showcase/cross-functional-swimlanes.markdy",
  },
  {
    id: "platform-milestones-timeline",
    title: "Database Write-Ahead Log (WAL) & CDC",
    category: "data-engineering",
    sceneType: "timeline",
    pattern: "event-timeline",
    description: "Chronological event lifecycle from write-ahead log append to SSTable compaction and CDC stream.",
    theme: "auto",
    file: "showcase/platform-milestones-timeline.markdy",
  },
  {
    id: "engineering-gantt-roadmap",
    title: "Zero-Downtime Migration Gantt Rollout",
    category: "cloud-infrastructure",
    sceneType: "gantt",
    pattern: "migration-roadmap",
    description: "Phased blue/green database migration: Dual-write -> Historical backfill -> Cutover.",
    theme: "auto",
    file: "showcase/engineering-gantt-roadmap.markdy",
  },
  {
    id: "lakehouse-medallion-pipeline",
    title: "Streaming Lakehouse Medallion Pipeline",
    category: "data-engineering",
    sceneType: "medallion",
    pattern: "medallion",
    description: "Multi-stage stream processing: Bronze raw ingestion -> Silver validation -> Gold feature store.",
    theme: "auto",
    file: "showcase/lakehouse-medallion-pipeline.markdy",
  },
  {
    id: "data-flywheel-loop",
    title: "Gossip Protocol Anti-Entropy Loop",
    category: "distributed-systems",
    sceneType: "flywheel",
    pattern: "flywheel-loop",
    description: "Compounding distributed consensus engine with vector clock synchronization and anti-entropy push.",
    theme: "auto",
    file: "showcase/data-flywheel-loop.markdy",
  },
  {
    id: "nebula-constellation",
    title: "Raft Quorum Heartbeat Constellation",
    category: "distributed-systems",
    sceneType: "constellation",
    pattern: "raft-consensus",
    description: "Radial Raft leader election with deterministic follower heartbeat synchronizations.",
    theme: "auto",
    file: "showcase/nebula-constellation.markdy",
  },
  {
    id: "strategic-decision-quadrant",
    title: "CAP Theorem Trade-Off 2x2 Quadrant",
    category: "system-design",
    sceneType: "quadrant",
    pattern: "cap-theorem",
    description: "Consistency vs Availability architectural trade-offs across CP, AP, and CA systems.",
    theme: "auto",
    file: "showcase/strategic-decision-quadrant.markdy",
  },
  {
    id: "enterprise-value-pyramid",
    title: "Full-Stack Observability Pyramid",
    category: "cloud-infrastructure",
    sceneType: "pyramid",
    pattern: "observability-pyramid",
    description: "Layered telemetry hierarchy: High-volume logs -> Metrics -> Traces -> Continuous profiling.",
    theme: "auto",
    file: "showcase/enterprise-value-pyramid.markdy",
  },
  {
    id: "database-radar-benchmark",
    title: "Distributed Database Radar Benchmark",
    category: "system-design",
    sceneType: "radar",
    pattern: "database-benchmark",
    description: "Multi-axis comparison of Spanner vs CockroachDB across latency, throughput, scale, and consistency.",
    theme: "auto",
    file: "showcase/database-radar-benchmark.markdy",
  },
  {
    id: "product-market-fit-venn",
    title: "ACID vs BASE Storage Guarantees",
    category: "system-design",
    sceneType: "venn",
    pattern: "acid-vs-base",
    description: "Strict transactional atomicity vs eventual consistency and soft-state storage guarantees.",
    theme: "auto",
    file: "showcase/product-market-fit-venn.markdy",
  },
];

/**
 * Full archive of all diagrams for the dedicated /examples gallery page.
 */
export const FULL_GALLERY_REGISTRY: ExampleMeta[] = [
  ...HOMEPAGE_SHOWCASE_REGISTRY,
  {
    id: "twitter-timeline-service",
    title: "Twitter Timeline Fan-Out Service",
    category: "system-design",
    sceneType: "architecture",
    pattern: "fan-out",
    description: "Event streaming and timeline fan-out service using Kafka queues and Redis follower timelines.",
    theme: "midnight",
    file: "showcase/twitter-timeline-service.markdy",
  },
  {
    id: "youtube-processing-pipeline",
    title: "YouTube Video Processing Pipeline",
    category: "data-engineering",
    sceneType: "architecture",
    pattern: "async-pipeline",
    description: "Distributed chunked video transcoding, thumbnail generation, and multi-region CDN replication.",
    theme: "graphite",
    file: "showcase/youtube-processing-pipeline.markdy",
  },
  {
    id: "kubernetes-cluster-architecture",
    title: "Kubernetes Cluster Ingress & Pods",
    category: "cloud-infrastructure",
    sceneType: "architecture",
    pattern: "platform",
    description: "Ingress controller routing across container pod replicas and Aurora PostgreSQL databases.",
    theme: "blueprint",
    file: "showcase/kubernetes-cluster-architecture.markdy",
  },
  {
    id: "cicd-delivery-pipeline",
    title: "Zero-Trust CI/CD Delivery Pipeline",
    category: "cloud-infrastructure",
    sceneType: "architecture",
    pattern: "ci-cd",
    description: "Automated build runners, security container scanning, canary deployments, and rollback gates.",
    theme: "paper",
    file: "showcase/cicd-delivery-pipeline.markdy",
  },
  {
    id: "editorial-architecture",
    title: "API Platform Architecture",
    category: "system-design",
    sceneType: "architecture",
    pattern: "tiered-platform",
    description: "Multi-tiered API gateway platform with authentication validation and transactional storage.",
    theme: "editorial",
    file: "showcase/editorial-architecture.markdy",
  },
  {
    id: "editorial-flowchart",
    title: "E-Commerce Checkout Flowchart",
    category: "system-design",
    sceneType: "flowchart",
    pattern: "decision-flow",
    description: "Sequential shopping cart validation, payment capture, and receipt generation flowchart.",
    theme: "editorial",
    file: "showcase/editorial-flowchart.markdy",
  },
  {
    id: "editorial-tree",
    title: "Engineering Organization Hierarchy",
    category: "system-design",
    sceneType: "tree",
    pattern: "hierarchy",
    description: "Organizational leadership and sub-team branching tree hierarchy.",
    theme: "editorial",
    file: "showcase/editorial-tree.markdy",
  },
  {
    id: "editorial-state",
    title: "Order Lifecycle State Machine",
    category: "system-design",
    sceneType: "state",
    pattern: "lifecycle",
    description: "E-Commerce order state transitions from Pending to Paid, Shipped, and Closed.",
    theme: "editorial",
    file: "showcase/editorial-state.markdy",
  },
  {
    id: "editorial-sequence",
    title: "User Authentication Sequence",
    category: "security-auth",
    sceneType: "sequence",
    pattern: "request-sequence",
    description: "Browser to API and Auth Service credential verification and session creation sequence.",
    theme: "editorial",
    file: "showcase/editorial-sequence.markdy",
  },
  {
    id: "fintech-governance-engine",
    title: "Fintech Governance Engine",
    category: "security-auth",
    sceneType: "architecture",
    pattern: "well-architected",
    description: "Strict audit logging, policy enforcement, and compliance tracking for financial transactions.",
    theme: "blueprint",
    file: "showcase/fintech-governance-engine.markdy",
  },
  {
    id: "microservices-mesh-ingest",
    title: "Service Mesh Ingestion Topology",
    category: "cloud-infrastructure",
    sceneType: "architecture",
    pattern: "microservices",
    description: "Service mesh sidecar proxy routing and distributed tracing between backend services.",
    theme: "paper",
    file: "showcase/microservices-mesh-ingest.markdy",
  },
  {
    id: "secure-paved-road-enforcement",
    title: "Zero-Trust Secure Paved Road",
    category: "security-auth",
    sceneType: "architecture",
    pattern: "paved-road",
    description: "Golden path development pipeline enforcing identity verification, static analysis, and mTLS.",
    theme: "editorial",
    file: "showcase/secure-paved-road-enforcement.markdy",
  },
  {
    id: "fanin-concurrency-bottleneck",
    title: "Fan-In Queue & Bottleneck Analysis",
    category: "system-design",
    sceneType: "architecture",
    pattern: "queue-bottleneck",
    description: "High-concurrency fan-in queue analysis identifying backpressure bottlenecks and rate limits.",
    theme: "paper",
    file: "showcase/fanin-concurrency-bottleneck.markdy",
  },
  {
    id: "terminal-cli-architecture",
    title: "Terminal Infrastructure Topology",
    category: "cloud-infrastructure",
    sceneType: "architecture",
    pattern: "terminal",
    description: "CLI and infrastructure monitoring topology rendered in terminal monospace style.",
    theme: "terminal",
    file: "showcase/terminal-cli-architecture.markdy",
  },
  {
    id: "sketchy-whiteboard-flow",
    title: "Whiteboard Product Discovery",
    category: "system-design",
    sceneType: "architecture",
    pattern: "sketchy",
    description: "Informal whiteboard architecture flow rendered with organic sketchy hand-drawn style.",
    theme: "sketchy",
    file: "showcase/sketchy-whiteboard-flow.markdy",
  },
  {
    id: "blue-ink-distributed-consensus",
    title: "Distributed Raft Consensus in Blue Ink",
    category: "distributed-systems",
    sceneType: "architecture",
    pattern: "raft-consensus",
    description: "Quorum replication, write-ahead logging, and state machine commits rendered in classic blue ink style.",
    theme: "ink",
    file: "showcase/blue-ink-distributed-consensus.markdy",
  },
  {
    id: "cloud-architecture-cad",
    title: "Modern Cloud Architecture Stack",
    category: "cloud-infrastructure",
    sceneType: "architecture",
    pattern: "cloud-cad",
    description: "Precision engineered-paper CAD architecture blueprint featuring AWS VPC public and private subnets, modern stack vector brand logos, and multi-beat interactive routing.",
    theme: "cad",
    file: "32-cloud-architecture-cad.markdy",
  },
  {
    id: "rag-multimodal-vector-search",
    title: "Multimodal RAG & Vector Search Platform",
    category: "data-engineering",
    sceneType: "architecture",
    pattern: "multimodal-rag",
    description: "End-to-end multimodal ingestion pipeline, Kafka chunk streaming, hybrid vector retrieval with Qdrant, cross-encoder reranking, and grounded LLM synthesis.",
    theme: "cad",
    file: "showcase/rag-multimodal-vector-search.markdy",
  },
  {
    id: "agentic-code-execution-sandbox",
    title: "Agentic Code Execution Sandbox",
    category: "security-auth",
    sceneType: "architecture",
    pattern: "agent-sandbox",
    description: "Ephemeral rootless container sandbox with OPA policy verification, Kafka job queueing, and immutable signed audit trails for autonomous AI coding agents.",
    theme: "cad",
    file: "showcase/agentic-code-execution-sandbox.markdy",
  },
  {
    id: "kafka-clickhouse-realtime-analytics",
    title: "Kafka & ClickHouse Real-Time Analytics",
    category: "data-engineering",
    sceneType: "architecture",
    pattern: "event-streaming",
    description: "High-throughput event streaming architecture with Apache Flink stateful windowing, ClickHouse columnar storage, and sub-second live Grafana dashboards.",
    theme: "cad",
    file: "showcase/kafka-clickhouse-realtime-analytics.markdy",
  },
  {
    id: "zero-trust-service-mesh-istio",
    title: "Zero-Trust Service Mesh & mTLS Identity",
    category: "security-auth",
    sceneType: "architecture",
    pattern: "zero-trust-mesh",
    description: "Mutual TLS cryptographic mesh with SPIFFE/SPIRE x509 workload attestation, Envoy sidecar proxies, and OPA fine-grained policy enforcement.",
    theme: "cad",
    file: "showcase/zero-trust-service-mesh-istio.markdy",
  },
  {
    id: "llm-gateway-fallback-rate-limiting",
    title: "High-Availability LLM Gateway & Fallback Router",
    category: "cloud-infrastructure",
    sceneType: "architecture",
    pattern: "llm-gateway",
    description: "Multi-provider AI routing gateway featuring Redis semantic caching, token bucket rate limiters, and automated circuit-breaker failover across cloud and local models.",
    theme: "cad",
    file: "showcase/llm-gateway-fallback-rate-limiting.markdy",
  },
  {
    id: "fintech-double-entry-ledger",
    title: "FinTech Double-Entry Ledger & Settlement",
    category: "system-design",
    sceneType: "architecture",
    pattern: "double-entry-ledger",
    description: "ACID double-entry ledger platform with cryptographic HSM transaction signing, balance projection caches, and automated end-of-period reconciliation.",
    theme: "cad",
    file: "showcase/fintech-double-entry-ledger.markdy",
  },
  {
    id: "postgres-cdc-debezium-outbox",
    title: "Transactional Outbox & Debezium CDC Streaming",
    category: "data-engineering",
    sceneType: "architecture",
    pattern: "cdc-outbox",
    description: "Guaranteed at-least-once event delivery architecture using PostgreSQL transactional outbox, Debezium WAL decoding, and Kafka downstream projection bridges.",
    theme: "cad",
    file: "showcase/postgres-cdc-debezium-outbox.markdy",
  },
  {
    id: "multi-tenant-saas-rls-isolation",
    title: "Multi-Tenant SaaS Row-Level Security Isolation",
    category: "security-auth",
    sceneType: "architecture",
    pattern: "multi-tenant-rls",
    description: "Zero-leakage multi-tenant data architecture using PostgreSQL Row-Level Security (RLS), session context propagation, and automated tenant isolation penetration probes.",
    theme: "cad",
    file: "showcase/multi-tenant-saas-rls-isolation.markdy",
  },
  {
    id: "cloud-finops-karpenter-autoscaling",
    title: "Cloud FinOps & Karpenter Just-in-Time Autoscaling",
    category: "cloud-infrastructure",
    sceneType: "architecture",
    pattern: "karpenter-finops",
    description: "Kubernetes cost-optimization topology using Karpenter spot instance JIT provisioning, spot price forecasting, and automated node consolidation.",
    theme: "cad",
    file: "showcase/cloud-finops-karpenter-autoscaling.markdy",
  },
  {
    id: "webrtc-sfu-live-streaming",
    title: "WebRTC SFU Live Interactive Media Mesh",
    category: "distributed-systems",
    sceneType: "architecture",
    pattern: "webrtc-sfu",
    description: "Ultra-low-latency interactive broadcast architecture with STUN/TURN NAT traversal, selective forwarding unit (SFU) stream replication, and adaptive bitrate QoE loops.",
    theme: "cad",
    file: "showcase/webrtc-sfu-live-streaming.markdy",
  },
];

/** Backward-compatible default export pointing to homepage showcase. */
export const EXAMPLE_REGISTRY: ExampleMeta[] = HOMEPAGE_SHOWCASE_REGISTRY;

async function loadFromRegistry(root: string, registry: ExampleMeta[]): Promise<ExampleEntry[]> {
  return Promise.all(
    registry.map(async (meta) => {
      const sourcePath = `examples/${meta.file}`;
      const code = await readFile(join(root, sourcePath), "utf8");
      return {
        ...meta,
        sourcePath,
        sourceUrl: `https://github.com/HoangYell/markdy-com/blob/main/${sourcePath}`,
        code,
      };
    }),
  );
}

/** Loads the 1-per-scene-type premier examples for the homepage. */
export async function loadHomepageExamples(root: string): Promise<ExampleEntry[]> {
  return loadFromRegistry(root, HOMEPAGE_SHOWCASE_REGISTRY);
}

/** Loads all examples for the dedicated /examples gallery. */
export async function loadAllExamples(root: string): Promise<ExampleEntry[]> {
  return loadFromRegistry(root, FULL_GALLERY_REGISTRY);
}

/** Legacy alias for loadHomepageExamples. */
export async function loadExamples(root: string): Promise<ExampleEntry[]> {
  return loadHomepageExamples(root);
}
