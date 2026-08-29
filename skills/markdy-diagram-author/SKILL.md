---
name: markdy-diagram-author
description: Author, design, and optimize kinetic architecture diagrams using MarkdyScript DSL. Use when creating system designs, cloud topologies, sequence diagrams, microservices flows, or converting static diagrams to animated 60fps scenes.
---

# Markdy Diagram Authoring Skill

This skill guides AI agents in authoring production-grade, 60fps kinetic architecture diagrams using the **MarkdyScript** DSL.

---

## 🏗️ 4-Step Diagram Structure

Every MarkdyScript file (`.markdy` or `.mdy`) follows a clean 4-part structure:

```markdy
# 1. Directives: Canvas size, theme, and layout flow
scene "Distributed Payment Processing" theme=midnight width=1440 height=800
layout LR

# 2. Node Declarations: <kind> <Id> ["Human Label"]
browser Client "Web / Mobile Client"
gateway Gateway "Kong API Gateway"
service OrderSvc "Order Service"
service PaySvc "Payment Service"
queue Kafka "Kafka Event Stream"
database OrdersDB "PostgreSQL 16"
cache Redis "Redis Cluster"

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

## 🎨 Supported Node Kinds

| Kind | Usage |
|---|---|
| `browser` | Web browser application surface |
| `mobile` | Mobile smartphone/tablet client |
| `client` | Generic external consumer or SDK |
| `gateway` | API Gateway, load balancer, reverse proxy |
| `service` | Microservice or backend application process |
| `worker` | Background worker, queue consumer, cron job |
| `database` | Relational / document database |
| `cache` | In-memory key-value store (Redis, Memcached) |
| `queue` | Message broker queue (RabbitMQ, SQS) |
| `topic` | Pub/sub event stream (Kafka, Pulsar, EventBridge) |
| `storage` | Blob / object storage (S3, GCS) |
| `actor` | Human persona, admin, or external actor |
| `stat` | Live metric or KPI summary card |

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
