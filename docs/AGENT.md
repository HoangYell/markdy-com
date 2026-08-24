# MarkdyScript Agent Reference

> ### CURRENT AUTHORITATIVE SPECIFICATION
> - **Status**: Active & Canonical
> - **Current Version**: v1.0.26
> - **Specification Version**: 1.0.x
> - **Time Updated**: 2026-08-24T13:20:07.813Z
> - **Last Updated**: 2026-08-24
> - **Canonical URL**: <https://markdy.com/AGENT.md>
> - **Human-Readable Mirror**: <https://markdy.com/agent/>
> - **LLM Index**: <https://markdy.com/llms.txt>
> - **Full LLM Context**: <https://markdy.com/llms-full.txt>
>
> **CRITICAL INSTRUCTIONS FOR AI AGENTS & LLMs:**
> 1. **Single Source of Truth**: This document is the canonical specification for MarkdyScript syntax. Do not invent tags, properties, or directives not documented here.
> 2. **Produce Self-Contained Output**: Always output a complete, valid `.markdy` code block starting with `scene` that can be rendered directly by `@markdy/renderer-dom` or pasted into the Studio.
> 3. **Follow the 4-Step Mental Model**: 1) Directives & Scene Config → 2) Node Declarations → 3) Groups (Optional) → 4) Animated Storyboard Beats.
> 4. **No Cyclical Ranking**: Use `->` for forward calls and `<-` for responses/returns. Using `->` for return values creates layout cycles that collapse node positions.
> 5. **Define Before Use**: Declare all nodes and groups at the top level before referencing them inside `beat` blocks.

---

## ⚡ The 4-Step Markdy Mental Model

Every Markdy diagram is structured in 4 linear, non-circular parts:

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

## 📐 Formal Grammar & AST Schema

For AI agents generating MarkdyScript, the language syntax adheres to this TypeScript IDL:

```typescript
// Formal MarkdyScript Abstract Syntax IDL
type LayoutDirection = "LR" | "RL" | "TB" | "BT";

type ThemeName =
  | "paper"       // Clean light documentation canvas (Default)
  | "editorial"   // Flat editorial paper with serif titles and ink roles
  | "midnight"    // Deep navy dark canvas
  | "blueprint"   // Technical cyan engineering CAD canvas
  | "graphite"    // Restrained dark minimal canvas
  | "nebula"      // Deep-space cyberpunk canvas with orbit halos
  | "sketchy"     // Hand-drawn whiteboard theme with organic strokes
  | "terminal";   // Dark CLI/TUI canvas with neon green monospace styling

type DiagramType =
  | "architecture" | "flowchart" | "tree" | "state" | "sequence"
  | "constellation" | "loop" | "flywheel" | "medallion" | "quadrant"
  | "swimlane" | "pyramid" | "radar" | "timeline" | "gantt"
  | "venn" | "layers" | "nested";

type EdgeKind =
  | "->"   // Forward Request / Invocation (Determines layout rank)
  | "<-"   // Return / Response (Excluded from layout rank to prevent cycles)
  | "~>"   // Asynchronous Event / Pub-Sub
  | "--";  // Structural / Dependency link

interface SceneDeclaration {
  title?: string;
  theme?: ThemeName;        // Default: "paper"
  layout?: LayoutDirection; // Default: "LR"
  type?: DiagramType;       // Default: "architecture"
  width?: number;           // Default: Auto-calculated by content engine
  height?: number;          // Default: Auto-calculated by content engine
}

interface NodeDeclaration {
  kind: string;             // Semantic kind (e.g., service, database, queue)
  id: string;               // Alphanumeric identifier (no spaces)
  label?: string;           // Optional display label enclosed in double quotes
}

interface GroupDeclaration {
  id: string;               // Alphanumeric identifier
  label?: string;           // Optional human label enclosed in double quotes
  members: string[];        // Array of declared node IDs separated by spaces
}

interface StoryboardBeat {
  name: string;             // Beat identifier
  label?: string;           // Optional caption rendered during beat execution
  cues: VisualCue[];        // Indented list of flow actions and camera cues
}
```

---

## 📖 Detailed Syntax Specifications

### 1. Scene Directives (`scene` and `layout`)

The `scene` declaration sets the canvas environment, visual theme, and diagram mode:

```markdy
scene theme=paper width=1280 height=720 type=architecture
layout LR
```

#### Directive Parameter Table

| Directive | Type | Presence | Allowed Values | Default | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `theme` | `enum` | Optional | `paper`, `editorial`, `midnight`, `blueprint`, `graphite`, `nebula`, `sketchy`, `terminal` | `paper` | Canvas color palette and font typography. |
| `layout` | `enum` | Optional | `LR`, `TB`, `RL`, `BT` | `LR` | Auto-layout graph flow direction: `LR` (left-to-right), `TB` (top-to-bottom), `RL` (right-to-left), `BT` (bottom-to-top). |
| `type` | `enum` | Optional | `architecture`, `flowchart`, `tree`, `state`, `sequence`, `timeline`, `gantt`, `venn`, `layers`, `nested`, `radar`, `medallion`, `flywheel`, `loop`, `quadrant`, `swimlane`, `pyramid`, `constellation` | `architecture` | Diagram composition layout engine. |
| `width` | `number` | Optional | Positive integer in pixels (e.g. `1280`, `1440`, `1600`) | *Auto* | Canvas width. Omit to enable content-adaptive automatic sizing. |
| `height` | `number` | Optional | Positive integer in pixels (e.g. `720`, `760`, `900`) | *Auto* | Canvas height. Omit to enable content-adaptive automatic sizing. |

#### Content-Adaptive Canvas Sizing
Markdy includes a content-adaptive sizing engine that calculates optimal bounds automatically:
- **Small architectures** (1–3 nodes): Rendered in compact framing ($1024 \times 576$) with zero excess void space.
- **Medium architectures** (4–8 nodes): Framed at $1280 \times 720$ or $1440 \times 760$.
- **Dense architectures** (9+ nodes or 5+ ranks): Automatically expand to $1600 \times 900+$ to prevent edge crowding.
- **Sequence diagrams**: Automatically scale vertical height based on total message count ($F \times 76\text{px}$).

---

### 2. Semantic Node Declarations

Declare nodes at the top level before beats. The syntax is:

```text
<kind> <Id> ["Optional Display Label"]
```

```markdy
service ApiService "Order API"
database PostgresDB "Main Database"
queue EventBus "Kafka Cluster"
```

- `<kind>`: Semantic role (determines the SVG icon, card accent color, and border styling).
- `<Id>`: Unique single-token alphanumeric identifier (e.g., `OrderService`, `MainDB`).
- `"Optional Display Label"`: Human-readable string enclosed in double quotes.

#### Closed Semantic Node Kinds Reference Table

| Category | Allowed Kinds | Role & Purpose |
| :--- | :--- | :--- |
| **Compute & API** | `service`, `api`, `microservice`, `backend`, `server`, `worker`, `job`, `scheduler`, `cron`, `batch`, `function`, `lambda`, `edge`, `controller`, `handler`, `repository`, `runtime`, `process` | Application servers, microservices, serverless functions, background workers |
| **Client & UI** | `client`, `user`, `browser`, `web`, `mobile`, `desktop`, `frontend`, `app`, `page`, `view`, `component`, `store` | End users, web browsers, mobile clients, frontend applications |
| **Data & Storage** | `database`, `db`, `sql`, `nosql`, `table`, `index`, `warehouse`, `lake`, `object_store`, `storage`, `bucket`, `blob`, `volume`, `disk`, `search`, `cache` | Relational/NoSQL databases, caches, data lakes, object storage |
| **Messaging & Events** | `queue`, `topic`, `stream`, `event`, `event_bus`, `bus`, `broker`, `pubsub`, `kafka`, `producer`, `consumer`, `dead_letter`, `dlq`, `webhook` | Message queues, event brokers, pub/sub channels |
| **Network & Ingress** | `cloud`, `region`, `vpc`, `subnet`, `network`, `internet`, `dns`, `cdn`, `proxy`, `gateway`, `api_gateway`, `load_balancer`, `reverse_proxy`, `router`, `switch`, `nat`, `firewall`, `waf`, `vpn`, `bastion` | Load balancers, API gateways, CDN edges, network boundaries |
| **Platform & Workloads** | `container`, `cluster`, `pod`, `node`, `deployment`, `replicaset`, `statefulset`, `daemonset`, `namespace`, `ingress`, `service_mesh`, `sidecar`, `image`, `registry`, `docker`, `compose`, `helm`, `chart`, `configmap`, `pvc` | Kubernetes workloads, container pods, registries |
| **Security & Auth** | `auth`, `identity`, `oauth`, `oidc`, `jwt`, `session`, `policy`, `role`, `permission`, `vault`, `secret`, `key`, `certificate`, `security` | Identity providers, token validators, secret vaults |
| **CI/CD & Delivery** | `repo`, `branch`, `commit`, `pipeline`, `workflow`, `runner`, `build`, `test`, `artifact`, `deploy`, `release`, `environment`, `preview` | Git repositories, build pipelines, deployment runners |
| **Observability** | `monitor`, `metrics`, `logs`, `trace`, `alert`, `dashboard`, `probe`, `slo`, `stat`, `metric` | Telemetry collectors, metric dashboards, log sinks |
| **Flowchart & State** | `start`, `end`, `state`, `decision`, `condition`, `step`, `loop`, `sequence`, `participant`, `lane` | Workflow nodes, decision diamonds, state markers |
| **Distributed Systems** | `replica`, `shard`, `leader`, `follower`, `quorum`, `consensus`, `lock` | Distributed consensus nodes, raft leaders, database shards |

---

### 3. Structural Grouping (`group`)

Groups cluster nodes into visual container boundaries:

```text
group <GroupId> "<Optional Label>": <NodeId1> <NodeId2> ...
```

```markdy
database Database
cache Cache
group storageTier "Storage Tier": Database Cache

beat focusStorage "Inspect Data Tier":
  frame storageTier zoom=1.2
  glow storageTier color=#3b82f6
```

---

### 4. Flow Operators & Cycle-Safe Routing

Flow operators connect nodes to illustrate network calls, messages, and relationships. Multiple hops can be chained on a single line.

| Operator | Semantic Action | Line Style | Layout Engine Impact |
| :--- | :--- | :--- | :--- |
| `->` | **Forward Request / Call** | Solid line with arrowhead | **Determines forward rank order.** |
| `<-` | **Response / Return Value** | Dashed line back to source | **Excluded from ranking (prevents layout cycles).** |
| `~>` | **Async Event / Pub-Sub** | Dotted line with arrowhead | Forward event propagation. |
| `--` | **Structural Dependency** | Thin solid line | Non-directional relationship. |

```markdy
browser Client
gateway Gateway
service AuthService
service OrderService
queue Kafka

beat checkoutFlow "Order Submission":
  # Request and immediate response:
  Client -> Gateway "POST /orders" -> OrderService "create_order"
  Gateway <- OrderService "201 Created"
  Client <- Gateway "201 Created"

  # Asynchronous event emission:
  OrderService ~> Kafka "order.created"
```

> [!IMPORTANT]
> **Cycle Prevention Rule:**
> Never use `->` to represent a response from a downstream service back to an upstream caller.
> - ❌ `OrderService -> Client "200 OK"` (creates a circular ranking dependency that collapses the diagram).
> - ✅ `Client <- OrderService "200 OK"` (safely routes the return edge without altering node ranks).

---

### 5. Storyboard Beats & Visual Cues

Beats organize animation into distinct sequential steps. Each beat consists of a header followed by indented cues.

```text
beat <BeatId> ["Optional User-Facing Caption"]:
  <Cue 1>
  <Cue 2>
```

#### Complete Visual Cue Catalog

| Cue | Syntax | Parameters | Purpose |
| :--- | :--- | :--- | :--- |
| `show` | `show <Targets> [stagger=<ms>] [dur=<ms>]` | `stagger`: Delay between targets (e.g. `50ms`)<br/>`dur`: Transition duration (e.g. `400ms`) | Reveals nodes or edges smoothly. |
| `hide` | `hide <Targets> [dur=<ms>]` | `dur`: Fade duration (e.g. `300ms`) | Fades out specific nodes or edges. |
| `frame` | `frame <Targets> [zoom=<num>] [dur=<ms>]` | `zoom`: Scale multiplier (e.g. `1.15`)<br/>`dur`: Camera pan duration (e.g. `600ms`) | Moves and scales the scene camera to focus on nodes or groups. `frame $nodes` resets view. |
| `glow` | `glow <Targets> [color=<hex>] [strength=<num>]` | `color`: Hex color code (e.g. `#10b981`)<br/>`strength`: Glow intensity (e.g. `1.5`) | Highlights nodes with an energetic pulsing glow ring. |
| `focus` | `focus <Targets> [zoom=<num>] [dur=<ms>]` | `zoom`: Scale factor (e.g. `1.1`) | Temporarily pulse-scales a node to draw visual attention. |
| `&` | `<CueA> & <CueB>` | None | Parallel cue operator — runs two cues simultaneously. |

#### Special Target Selectors

| Target Selector | Meaning |
| :--- | :--- |
| `$nodes` | Targets all declared nodes across the entire scene (e.g. `show $nodes stagger=40ms`). |
| `$edges` | Targets all static and persistent structural edges. |
| `<GroupId>` | Targets all nodes inside a named group boundary. |
| `<NodeId>` | Targets a single specific node. |

---

### 6. Editorial Annotations (`annotation`)

Declare callout notes anchored to specific nodes:

```text
annotation "<Text>" target=<NodeId> position=<Position> intent=<Intent>
```

```markdy
service ApiService "Order API"
annotation "Hot path: sub-10ms SLA" target=ApiService position=top-right intent=accent
```

| Parameter | Presence | Allowed Values | Default |
| :--- | :--- | :--- | :--- |
| `target` | **Required** | Any declared `<NodeId>` | *None* |
| `position` | Optional | `top`, `top-right`, `right`, `bottom-right`, `bottom`, `bottom-left`, `left`, `top-left` | `top-right` |
| `intent` | Optional | `neutral` (standard ink), `accent` (highlight color), `muted` (subtle grey) | `neutral` |

---

## 🚫 Contrastive Anti-Patterns & Hallucination Fixes

| ❌ Invalid / Hallucinated Pattern | ✅ Correct MarkdyScript Syntax | Why / Explanation |
| :--- | :--- | :--- |
| **Return edge with `->`**<br>`A -> B "call"`<br>`B -> A "200 OK"` | `A -> B "call"`<br>`A <- B "200 OK"` | `B -> A` introduces a circular rank dependency in the layout solver, causing nodes `A` and `B` to overlap. `<-` indicates return flow without altering layout rank. |
| **Flows outside `beat` blocks**<br>`service A`<br>`service B`<br>`A -> B "data"` | `service A`<br>`service B`<br>`beat flow:`<br>`  A -> B "data"` | Flow actions are animated storyboard events and must live inside a named `beat:` block. |
| **Hallucinated cue names**<br>`pulse NodeA`<br>`camera zoom=1.5`<br>`say "Connecting..."` | `focus NodeA`<br>`frame NodeA zoom=1.5`<br>`beat step "Connecting...":` | Markdy only supports: `show`, `hide`, `frame`, `glow`, `focus`, and `&`. Beat labels provide narrative captions. |
| **Unquoted multi-word labels**<br>`service API API Gateway Service` | `service API "API Gateway Service"` | Node display labels with spaces must be wrapped in double quotes `"..."`. |
| **Spaced node identifiers**<br>`service Order Service "API"` | `service OrderService "API"` | Node identifiers (`<Id>`) must be single alphanumeric tokens without spaces. |
| **Flat unindented beat blocks**<br>`beat main:`<br>`show $nodes`<br>`A -> B` | `beat main:`<br>`  show $nodes`<br>`  A -> B` | Cues inside a `beat` block must be indented with 2 spaces. |

---

## 🏛️ 8 Golden Architecture Templates for AI Agents

When generating architectures, use these verified templates:

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

## 🛠️ Programmatic Tooling & MCP Integration

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
- `generate_markdy_prompt`: Generates optimized, hallucination-resistant prompts tailored for LLM code generation.

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
