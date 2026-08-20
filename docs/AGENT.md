# MarkdyScript Agent Reference

> ### CURRENT AUTHORITATIVE SPECIFICATION
> - **Status**: Active & Canonical
> - **Current Version**: v1.0.19
> - **Specification Version**: 1.0.x
> - **Time Updated**: 2026-08-20T15:41:11.006Z
> - **Last Updated**: 2026-08-20
> - **Canonical URL**: <https://markdy.com/AGENT.md>
> - **Human-Readable Mirror**: <https://markdy.com/agent/>
> - **LLM Index**: <https://markdy.com/llms.txt>
> - **Full LLM Context**: <https://markdy.com/llms-full.txt>
>
> **CRITICAL INSTRUCTIONS FOR AI AGENTS & LLMs:**
> 1. **Disregard Legacy Memory**: This document is the single source of truth for MarkdyScript syntax. Do not invent tags, properties, or directives not documented here.
> 2. **Produce Self-Contained Output**: Always output a complete, valid `.markdy` code block starting with `scene` that can be rendered directly by `@markdy/renderer-dom` or pasted into the Studio.
> 3. **Follow the 4-Step Mental Model**: 1) Directives & Scene Config → 2) Node Declarations → 3) Groups (Optional) → 4) Animated Storyboard Beats.
> 4. **No Cyclical Ranking**: Use `->` for forward calls and `<-` for responses/returns. Using `->` for return values creates layout cycles that collapse node positions.

---

## ⚡ The 4-Step Markdy Mental Model

Every Markdy diagram follows a clean, predictable 4-part structure:

```markdy
# ─────────────────────────────────────────────────────────────────────────────
# 1. Scene Directives & Configuration
# ─────────────────────────────────────────────────────────────────────────────
scene theme=paper width=1280 height=720
layout LR

# ─────────────────────────────────────────────────────────────────────────────
# 2. Semantic Node Declarations (<kind> <Id> ["Human Label"])
# ─────────────────────────────────────────────────────────────────────────────
browser Client "Shopper"
gateway Gateway "API Gateway"
service OrderService "Order Service"
database OrdersDB "Orders DB"
cache Redis "Cart Cache"
queue EventBus "Kafka / SQS"
worker BillingWorker "Payment Worker"

# ─────────────────────────────────────────────────────────────────────────────
# 3. Structural Grouping (Optional)
# ─────────────────────────────────────────────────────────────────────────────
group backend "Core Infrastructure": OrderService OrdersDB Redis
group asyncTier "Background Processing": EventBus BillingWorker

# ─────────────────────────────────────────────────────────────────────────────
# 4. Animated Storyboard Beats (Sequential Action & Camera Movement)
# ─────────────────────────────────────────────────────────────────────────────
beat reveal "Reveal System Architecture":
  show $nodes stagger=50ms

beat checkout "Submit Order Flow":
  frame Client Gateway OrderService zoom=1.15
  Client -> Gateway "POST /orders" -> OrderService "create_order"
  OrderService -> OrdersDB "INSERT order"
  OrderService <- OrdersDB "200 OK"
  OrderService ~> EventBus "order.created"
  Client <- Gateway "201 Created"

beat payment "Asynchronous Payment Processing":
  frame asyncTier zoom=1.18
  EventBus ~> BillingWorker "consume event"
  glow BillingWorker color=#10b981
```

---

## 📐 Grammar & Directive Reference

### 1. Scene Directives (`scene`)

The `scene` declaration sets canvas dimensions, theme, and runtime behavior:

```markdy
scene theme=paper width=1280 height=720 type=architecture
layout LR
```

| Directive | Default | Allowed Values / Purpose |
|---|---|---|
| `theme` | `paper` | `paper` (clean light), `editorial` (warm doc light), `midnight` (deep navy dark), `blueprint` (cyan engineering), `graphite` (charcoal dark), `nebula` (cyberpunk purple), `sketchy` (editorial hand-drawn), `terminal` (CLI retro green) |
| `layout` | `LR` | Auto-layout direction: `LR` (left-to-right), `TB` (top-to-bottom), `RL` (right-to-left), `BT` (bottom-to-top) |
| `width` | `1280` | Canvas width in pixels (see Sizing Formula below) |
| `height` | `720` | Canvas height in pixels (see Sizing Formula below) |
| `type` | `architecture` | Diagram composition mode: `architecture`, `flowchart`, `sequence`, `tree`, `state`, `constellation`, `loop`, `medallion`, `quadrant`, `swimlane`, `pyramid`, `radar`, `timeline`, `gantt`, `venn`, `layers` |
| `controls` | `false` | When `true`, mounts playback transport controls and reset buttons |
| `interactive` | `false` | When `true`, enables wheel zoom and pan gestures |
| `autoplay` | `true` | When `true`, starts playback automatically on load |
| `loop` | `true` | When `true`, restarts animation smoothly after completion |

#### 📏 Canvas Sizing Formula
Auto-layout distributes nodes into ranks (columns in `LR`, rows in `TB`). Nodes are ~170×72px. To prevent overlapping on dense diagrams:
- `width` $\ge \max(1280, 190 \times \text{rank count})$
- `height` $\ge \max(720, 110 \times \text{max nodes in busiest rank})$
- *Example*: For 6 ranks deep and 6 services in the busiest rank, use `width=1440 height=800`.

---

### 2. Node Declarations

Declare nodes at the top level before referencing them in beats:

```text
<kind> <Id> ["Optional Display Label"]
```

```markdy
service ApiService "Order API"
database PostgresDB "Main Store"
queue EventBus "Kafka Events"
```

- `<kind>`: Semantic role (determines SVG icon glyph, color tone, and border styling).
- `<Id>`: Unique alphanumeric identifier (used in flows, groups, and cues).
- `"Optional Display Label"`: Human-readable string rendered inside the node card.

#### Semantic Node Kinds Table

| Category | Node Kinds | Primary Role |
|---|---|---|
| **Client / User** | `client`, `user`, `browser`, `mobile`, `desktop`, `frontend`, `app` | Traffic origin, end users, client applications |
| **Compute / API** | `service`, `api`, `microservice`, `backend`, `worker`, `job`, `lambda`, `cron` | Business logic, application servers, background jobs |
| **Data / Storage** | `database`, `db`, `cache`, `warehouse`, `lake`, `bucket`, `storage`, `search` | Persistence engines, Redis/Memcached, object storage |
| **Messaging** | `queue`, `topic`, `stream`, `event`, `bus`, `broker`, `kafka`, `pubsub` | Asynchronous message brokers, event streaming |
| **Networking** | `gateway`, `api_gateway`, `load_balancer`, `cloud`, `vpc`, `cdn`, `dns`, `firewall` | Entry points, ingress, edge distribution, security perimeter |
| **Platform / K8s** | `cluster`, `pod`, `container`, `ingress`, `sidecar`, `registry`, `volume` | Kubernetes workloads, container orchestration |
| **Security / Auth** | `auth`, `vault`, `secret`, `key`, `identity`, `policy` | Identity providers, token validation, secrets management |
| **AI / Machine Learning** | `service LLM`, `database VectorDB`, `service Embedder`, `agent Agent` | AI models, embedding services, vector indexes |
| **Flowchart / State** | `start`, `end`, `state`, `decision`, `condition`, `step` | Workflow states, decision gateways, pipeline stages |

---

### 3. Structural Grouping (`group`)

Group nodes into visual boundary containers:

```markdy
database Database
cache Cache
group storageTier "Storage & Caching Tier": Database Cache

beat focusStorage "Inspect Data Tier":
  frame storageTier zoom=1.2
  glow storageTier color=#3b82f6
```

---

### 4. Flow Operators & Cycle-Safe Routing

Connect nodes using semantic directed edges. Chain multiple steps on one line:

| Operator | Semantic Meaning | Visual Rendering | Layout Engine Impact |
|---|---|---|---|
| `->` | **Forward Request / Call** | Solid line with arrow | **Determines forward rank order** |
| `<-` | **Response / Return Value** | Dashed line back to caller | **Excluded from ranking (prevents layout cycles!)** |
| `~>` | **Async Event / Pub-Sub** | Dotted line with arrow | Forward event propagation |
| `--` | **Structural Link** | Thin solid neutral line | Non-directed dependency |

```markdy
browser Client
gateway Gateway
service AuthService
service OrderService
queue Kafka

beat auth "Authentication Flow":
  # Request and immediate response chain:
  Client -> Gateway "POST /login" -> AuthService "verify_credentials"
  Gateway <- AuthService "JWT Token"
  Client <- Gateway "200 OK (Set-Cookie)"

  # Async event emission:
  OrderService ~> Kafka "order.placed"
```

> [!IMPORTANT]
> **Never use `->` for return responses.**
> If `A -> B` exists, writing `B -> A "response"` creates a circular rank dependency that causes nodes `A` and `B` to overlap. Always write `A <- B "response"`.

---

### 5. Storyboard Beats & Visual Cues

Beats organize diagram motion into sequential steps. Each beat runs sequentially and can display a descriptive caption:

```markdy
beat name "Optional Caption Displayed to User":
  # Cues executed in sequence
```

#### Complete Cue Catalog

| Cue | Syntax | Description |
|---|---|---|
| `show` | `show $nodes [stagger=50ms]` | Reveals nodes/edges. `$nodes` reveals all nodes; `$edges` reveals static edges. |
| `hide` | `hide NodeId [dur=300ms]` | Fades out a node, group, or edge. |
| `frame` | `frame NodeA NodeB [zoom=1.15]` | Smoothly moves and zooms the scene camera to focus on specific nodes/groups. `frame $nodes` resets camera to the whole diagram. |
| `glow` | `glow NodeId [color=#10b981]` | Emphasizes a node with an energetic pulsing glow ring. |
| `focus` | `focus NodeId [zoom=1.1]` | Briefly scales up a node to draw user attention. |
| `&` | `CueA & CueB` | Parallel runner — executes two or more cues simultaneously. |

---

## 🏛️ 8 Golden Architecture Templates for AI Agents

When asked to generate architecture diagrams, pick and adapt one of these battle-tested patterns:

### 1. Cloud Microservices & Database Tier

```markdy
scene theme=paper width=1440 height=760
layout LR

browser WebApp "Web Application"
mobile MobileApp "Mobile Client"
gateway ApiGateway "Cloud Gateway"
auth AuthService "Auth / OAuth2"
service OrderService "Order Service"
service PaymentService "Payment Gateway"
database MainDB "PostgreSQL"
cache RedisCache "Redis Cluster"

group clients "User Surfaces": WebApp MobileApp
group backend "Service Tier": ApiGateway AuthService OrderService PaymentService
group dataTier "Data Tier": MainDB RedisCache

beat reveal "System Overview":
  show $nodes stagger=40ms

beat authFlow "Authenticate Request":
  frame clients ApiGateway AuthService zoom=1.12
  WebApp -> ApiGateway "GET /profile" -> AuthService "validate_jwt"
  WebApp <- ApiGateway "200 OK (Claims)"

beat checkout "Process Order":
  frame ApiGateway OrderService PaymentService dataTier zoom=1.1
  MobileApp -> ApiGateway "POST /checkout" -> OrderService "create_order"
  OrderService -> RedisCache "check inventory"
  OrderService -> PaymentService "authorize charge"
  PaymentService -> MainDB "record transaction"
  MobileApp <- ApiGateway "201 Created"
```

---

### 2. AI Agent & RAG (Retrieval-Augmented Generation) Pipeline

```markdy
scene theme=editorial width=1440 height=760
layout LR

user User "Engineer"
browser ChatUI "Chat Interface"
service Orchestrator "Agent Orchestrator"
service Embedder "Embedding Model"
database VectorDB "Vector Index (Qdrant)"
service LLM "Claude 3.5 / Gemini"
service Tools "Tool Execution Engine"

group aiCore "Intelligence Engine": Embedder VectorDB LLM
group execution "Tools & Sandbox": Tools

beat init "System Reveal":
  show $nodes stagger=50ms

beat retrieve "Query & Vector Search":
  frame User ChatUI Orchestrator aiCore zoom=1.12
  User -> ChatUI "Ask technical question" -> Orchestrator "parse intent"
  Orchestrator -> Embedder "embed(query)" -> VectorDB "cosine search (k=5)"
  Orchestrator <- VectorDB "retrieved context chunks"

beat generate "Synthesis & Tool Execution":
  frame Orchestrator LLM Tools zoom=1.15
  Orchestrator -> LLM "prompt + context"
  LLM -> Tools "execute_code(sql)"
  LLM <- Tools "tool_result"
  ChatUI <- Orchestrator "streamed response with citations"
  glow ChatUI color=#10b981
```

---

### 3. Event-Driven Architecture & Kafka Fan-Out

```markdy
scene theme=midnight width=1440 height=760
layout LR

service IngestionAPI "Ingestion API"
queue KafkaTopic "orders.events"
worker InventoryWorker "Inventory Worker"
worker NotificationWorker "Email/SMS Worker"
worker AnalyticsWorker "Clickhouse Sink"
database InventoryDB "Inventory DB"
database AnalyticsDB "Clickhouse"
queue DLQ "Dead Letter Queue"

group workers "Consumer Worker Group": InventoryWorker NotificationWorker AnalyticsWorker

beat reveal "Topology":
  show $nodes stagger=40ms

beat publish "Publish Event":
  frame IngestionAPI KafkaTopic zoom=1.15
  IngestionAPI ~> KafkaTopic "publish(OrderPlaced)"
  glow KafkaTopic color=#38bdf8

beat fanout "Parallel Fan-out Processing":
  frame KafkaTopic workers zoom=1.12
  KafkaTopic ~> InventoryWorker "consume event" & KafkaTopic ~> NotificationWorker "consume event" & KafkaTopic ~> AnalyticsWorker "consume event"
  InventoryWorker -> InventoryDB "UPDATE stock"
  AnalyticsWorker -> AnalyticsDB "INSERT analytics"
```

---

### 4. Kubernetes Cluster & Cloud Ingress

```markdy
scene theme=blueprint width=1440 height=800
layout LR

cloud CDN "Cloudflare CDN"
network Ingress "Traefik Ingress Controller"
pod WebPod1 "web-frontend-pod-1"
pod WebPod2 "web-frontend-pod-2"
service ClusterIP "api-service (ClusterIP)"
pod ApiPod1 "api-backend-pod-1"
pod ApiPod2 "api-backend-pod-2"
storage PV "Ceph CSI Volume"

group frontendPods "Frontend Deployment": WebPod1 WebPod2
group apiPods "API Deployment": ApiPod1 ApiPod2

beat reveal "Cluster Architecture":
  show $nodes stagger=40ms

beat routing "Ingress Traffic Routing":
  frame CDN Ingress frontendPods zoom=1.12
  CDN -> Ingress "HTTPS Request" -> WebPod1 "reverse proxy"
  WebPod1 -> ClusterIP "internal call" -> ApiPod1 "gRPC invocation"
  ApiPod1 -> PV "read/write volume"
  CDN <- Ingress "200 HTTP OK"
```

---

### 5. CI/CD GitOps Delivery Pipeline

```markdy
scene theme=graphite width=1440 height=720
layout LR

user Dev "Developer"
service GitHub "GitHub Repository"
worker Actions "GitHub Actions CI"
registry DockerHub "Container Registry"
service ArgoCD "ArgoCD Controller"
cluster Production "Kubernetes Prod"

beat reveal "Pipeline Infrastructure":
  show $nodes stagger=45ms

beat build "Commit & Build Validation":
  frame Dev GitHub Actions DockerHub zoom=1.12
  Dev -> GitHub "git push origin main"
  GitHub ~> Actions "trigger workflow"
  Actions -> Actions "run unit & visual tests"
  Actions -> DockerHub "docker push image:v1.0.7"
  glow DockerHub color=#10b981

beat deploy "GitOps Sync & Deployment":
  frame DockerHub ArgoCD Production zoom=1.15
  ArgoCD -> GitHub "detect manifest drift"
  ArgoCD -> DockerHub "pull image:v1.0.7"
  ArgoCD -> Production "apply rollout"
  glow Production color=#22c55e
```

---

### 6. OAuth2 / OIDC Authentication Flow

```markdy
scene theme=paper width=1440 height=720
layout LR

browser User "End User Browser"
service ClientApp "OAuth Client App"
auth IdP "Identity Provider (Auth0/Okta)"
service ResourceServer "Protected API Server"

beat reveal "System Overview":
  show $nodes stagger=50ms

beat redirect "Authorize & Consent":
  frame User ClientApp IdP zoom=1.15
  User -> ClientApp "click 'Login with IdP'"
  User <- ClientApp "302 Redirect to /authorize"
  User -> IdP "submit credentials & consent"
  User <- IdP "302 Redirect with ?code=AUTH_CODE"

beat exchange "Token Exchange & API Access":
  frame ClientApp IdP ResourceServer zoom=1.15
  ClientApp -> IdP "POST /token (code + secret)"
  ClientApp <- IdP "200 OK (access_token + id_token)"
  ClientApp -> ResourceServer "GET /userinfo (Bearer Token)"
  ClientApp <- ResourceServer "200 OK (User Profile)"
  glow ClientApp color=#10b981
```

---

### 7. Resilient Multi-Region High Availability & Cache-Aside

```markdy
scene theme=midnight width=1440 height=760
layout LR

gateway GeoDNS "Global Route53 / Anycast"
gateway RegionEast "US-East Gateway"
gateway RegionWest "US-West Gateway"
cache RedisPrimary "Redis Master"
cache RedisReplica "Redis Read Replica"
database AuroraGlobal "Aurora Multi-Region DB"

group eastTier "US-East (Primary)": RegionEast RedisPrimary
group westTier "US-West (Failover)": RegionWest RedisReplica

beat reveal "Global Infrastructure":
  show $nodes stagger=40ms

beat readCache "Cache-Aside Read Flow":
  frame GeoDNS eastTier AuroraGlobal zoom=1.12
  GeoDNS -> RegionEast "route nearest user" -> RedisPrimary "GET item:101"
  RegionEast <- RedisPrimary "cache miss"
  RegionEast -> AuroraGlobal "SELECT FROM db"
  RegionEast -> RedisPrimary "SET item:101 (TTL 60s)"
  GeoDNS <- RegionEast "200 OK (Payload)"

beat replication "Global Storage Replication":
  frame RedisPrimary RedisReplica AuroraGlobal zoom=1.15
  RedisPrimary ~> RedisReplica "async sync" & AuroraGlobal ~> AuroraGlobal "storage replication"
```

---

### 8. Decision Tree / Flowchart Workflow

```markdy
scene theme=sketchy width=1280 height=720 type=flowchart
layout TB

start PR "New Pull Request"
decision LintCheck "Lint & Typecheck Passed?"
decision TestCheck "All 142 Tests Passed?"
decision A11yCheck "Lighthouse 100/100 Score?"
step Merge "Merge into Main"
end Reject "Reject & Post PR Feedback"

beat reveal "Quality Gates":
  show $nodes stagger=50ms

beat evaluate "Validation Pipeline":
  PR -> LintCheck "run eslint & tsc"
  LintCheck -> TestCheck "yes"
  TestCheck -> A11yCheck "yes"
  A11yCheck -> Merge "yes (approved)"
  glow Merge color=#10b981

beat failure "Fallback Reject Path":
  LintCheck -> Reject "no (syntax error)"
  TestCheck -> Reject "no (broken tests)"
```

---

## 🚫 Common LLM Anti-Patterns & How to Fix Them

| ❌ Common AI Mistake | ✅ Correct Implementation |
|---|---|
| **Cycles from using `->` for returns**<br>`A -> B "call"`<br>`B -> A "response"` | **Use `<-` for responses**<br>`A -> B "call"`<br>`A <- B "response"` *(leaves node ranking clean)* |
| **Flows placed outside `beat` blocks**<br>`service A`<br>`A -> B "data"` | **Place flows inside named `beat` blocks**<br>`beat process:`<br>`  A -> B "data"` |
| **Hallucinating non-existent cues**<br>`pulse NodeA`<br>`camera zoom=2`<br>`say "Hello"` | **Use standard Markdy cues**<br>`focus NodeA`<br>`frame NodeA zoom=1.2`<br>*(Beat labels act as captions)* |
| **Unquoted multi-word node labels**<br>`service API API Gateway Server` | **Wrap multi-word strings in double quotes**<br>`service API "API Gateway Server"` |
| **Undersized canvas for dense architectures**<br>15 nodes on `width=1280 height=720` | **Apply canvas sizing rule**<br>`scene width=1600 height=860` |

---

## 🛠️ Programmatic Tooling & Integration

### Model Context Protocol (MCP) Server

Connect AI coding agents (Claude Desktop, Cursor, Antigravity, Windsurf) directly to Markdy:

```json
{
  "mcpServers": {
    "markdy": {
      "command": "npx",
      "args": ["-y", "@markdy/mcp-server"]
    }
  }
}
```

- `validate_markdy_code`: Validates syntax and tests Well-Architected governance rules (layer boundaries, cycle detection, gateway checks).
- `transpile_to_markdy`: Converts Mermaid, Docker Compose, Kubernetes manifests, and Terraform state into animated MarkdyScript.
- `explain_architecture`: Generates structured topology summaries, role breakdowns, and governance health metrics.

### Vanilla TypeScript / JavaScript Integration

```typescript
import { createDiagram } from "@markdy/renderer-dom";

const diagram = createDiagram({
  container: document.getElementById("diagram-container")!,
  code: markdySourceCode,
  autoplay: true,
  loop: true,
});
```

### Astro & MDX Integration

```astro
---
import { Markdy } from "@markdy/astro";
---
<Markdy code={markdySourceCode} width={1280} height={720} autoplay />
```
