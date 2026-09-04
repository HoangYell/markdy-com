---
name: markdy-diagram-author
description: Author, design, and optimize kinetic architecture diagrams, scenario recipes, and high-impact share cards using MarkdyScript DSL. Use when creating system designs, cloud topologies, sequence diagrams, microservices flows, or converting static diagrams to animated 60fps scenes.
---

# Markdy Diagram Authoring Skill

This skill guides AI agents in authoring production-grade, 60fps kinetic architecture diagrams and verified blueprints using the **MarkdyScript** DSL.

---

## 🧭 Scenario Recipe Router

When user prompts match a common architectural domain, start from a proven blueprint:

| Scenario / Domain | Recipe ID | Primary Pattern |
|---|---|---|
| **Cache-Aside / Fast Lookups** | `cache-aside` | Gateway → Service → Redis (Hit) / Postgres (Miss & Warm) |
| **Event-Driven / CDC** | `event-driven-eda` | Service → DB WAL → Debezium CDC → Kafka → Consumers |
| **CQRS & Event Sourcing** | `cqrs-event-sourcing` | Command API → EventStore → Projection Engine → Read DB |
| **Microservices Mesh** | `api-gateway-mesh` | Envoy Ingress → mTLS Sidecars → Distributed Tracing |
| **Zero-Trust & Enclave** | `zero-trust-security` | WAF → OIDC Auth → OPA Policy → AWS Nitro Enclave → Vault |
| **Medallion Lakehouse** | `medallion-lakehouse` | Kafka → Bronze Lake → Spark Cleansing → Silver → Gold Tier |
| **Agentic AI & ReAct** | `agentic-react-tools` | Workspace → Agent Core → Vector RAG → LLM → MCP Tools |
| **Active-Active Resilient** | `active-active-failover` | GeoDNS → Multi-Region Clusters → Bidirectional DB Sync |
| **Raft Distributed Consensus**| `distributed-consensus-raft`| Client → Leader → Follower Quorum → Committed State |
| **SRE Incident Runbook** | `incident-runbook` | Prometheus Alert → PagerDuty → K8s Auto-Healer → Slack Bot |

> **CLI Helper**: Run `markdy guide "<query>"` or `markdy recipe <recipe-id>` to output instant canonical MarkdyScript.

---

## 🏗️ 4-Step Diagram Structure

Every MarkdyScript file (`.markdy` or `.mdy`) follows a clean 4-part structure:

```markdy
# 1. Directives: Canvas size, theme, and layout flow
scene "Distributed Payment Processing" theme=midnight width=1440 height=800
layout LR

# 2. Node Declarations: <kind> <Id> ["Human Label"] [icon=<glyph>] [@src="path/file.ts#L10"]
browser Client "Web / Mobile Client" icon=chrome
gateway Gateway "Kong API Gateway" icon=nginx @src="src/gateway/router.ts#L15"
service OrderSvc "Order Service" icon=nodejs @src="src/orders/service.ts#L30"
service PaySvc "Payment Service" icon=golang @src="src/payment/handler.go#L40"
queue Kafka "Kafka Event Stream" icon=kafka
database OrdersDB "PostgreSQL 16" icon=postgresql @src="src/db/schema.sql#L1"
cache Redis "Redis Cluster" icon=redis

# 3. Logical Groups (Perimeters & Tiers)
group edgeTier "Edge Tier": Client Gateway
group coreServices "Core Services": OrderSvc PaySvc
group dataLayer "Data & Streaming": Kafka OrdersDB Redis

# 4. Storyboard Beats: Interactive narrative animation steps
beat checkout "1. Client Checkout Request":
  show $nodes stagger=40ms
  frame Client Gateway OrderSvc zoom=1.12
  Client -> Gateway "POST /api/checkout" -> OrderSvc "validate"
  OrderSvc -> Redis "check idempotency"
  OrderSvc <- Redis "key: new"
  glow OrderSvc color=#38bdf8

beat payment "2. Payment Execution & Event Fan-out":
  frame OrderSvc PaySvc Kafka OrdersDB zoom=1.15
  OrderSvc -> PaySvc "POST /charge"
  PaySvc -> OrdersDB "record transaction"
  OrderSvc ~> Kafka "topic: order.completed"
  Client <- Gateway "201 Created"
  glow PaySvc color=#22c55e & glow Kafka color=#f59e0b
```

---

## 🔍 9-Point Showcase Quality Gate

Before handing off any diagram, verify it with the CLI quality gate:

```bash
markdy verify system.markdy --quality showcase --json
```

A passing showcase verification validates:
1. **Syntax Validity**: Complete AST without fatal syntax or token errors.
2. **Viewport Containment**: Bounds fit responsive desktop ladder (1440×900, 1600×1000, 1920×1080, 2048×1320).
3. **Node Collision Free**: Distinct IDs and balanced spatial distribution.
4. **Label Legibility Floor**: High-density typography without text crowding.
5. **Cycle Governance**: Sync request flows (`->`) do not create circular deadlocks.
6. **Dynamic Port Multiplexing**: Auto-balanced connection lanes with smooth fillet transitions.
7. **Code Provenance Anchors**: `@src="path/file.ext#L10-L50"` anchors verified.
8. **Native Vector Symbols**: Zero-CDN SVG icons resolved from registry (`icon=redis`, `icon=kafka`, `icon=aws`, etc.).
9. **Theme Contrast**: Meets WCAG AA contrast against canvas and node surfaces.

---

## 🔀 Flow Operators

- `A -> B "label"` : Synchronous request / command
- `A <- B "label"` : Synchronous response / return payload *(crucial to avoid cycle rank crushing!)*
- `A ~> B "label"` : Asynchronous event emission / message queue publish
- `A <-> B "label"` : Full-duplex WebSocket / bidirectional stream
- `A ..> B "label"` : Dashed architectural dependency link

---

## 🎬 Narrative Beat Cues

- `show $nodes [stagger=50ms]` : Reveals nodes sequentially
- `frame Node1 Node2 [zoom=1.2] [dur=600ms]` : Smooth camera pan and zoom
- `glow NodeId [color=#hex]` : Kinetic light pulse on target node
- `pulse NodeId` : Ripple wave animation
- `focus NodeId` : Highlights target node while dimming others

---

## 🎴 Contextual Share Cards (1200×630)

Generate OpenGraph and README-ready presentation cards:
- **Standard Share Card**: Clean framing with title and badge.
- **Route Share Card**: Focuses on active message pathway (`from` → `to`) with hop count and protocol telemetry.
- **Reach Share Card**: Highlights blast radius / upstream callers or downstream dependents with impact metrics.
