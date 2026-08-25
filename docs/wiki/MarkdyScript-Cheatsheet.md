# MarkdyScript 1-Page Cheatsheet

Quick copy-paste syntax cheatsheet for MarkdyScript scenes.

---

## 1. Scene Header & Layout

```markdy
scene "Scene Title" theme=paper width=1280 height=720
layout LR   # Options: LR (Left-to-Right), RL, TB (Top-to-Bottom), BT
```

### Themes
- `theme=paper` — Clean light documentation canvas (Default)
- `theme=editorial` — Serif typography with refined ink lines and semantic accents
- `theme=terminal` — Dark CLI/TUI canvas with neon monospace glow
- `theme=midnight` — Deep modern dark developer canvas
- `theme=blueprint` — Technical cyan CAD drafting grid
- `theme=sketchy` — Organic hand-drawn whiteboard style
- `theme=nebula` — Deep-space cyberpunk canvas with orbit halos
- `theme=graphite` — Minimalist monochrome dark canvas

### Layout Types
`type=architecture` (default) • `type=flowchart` • `type=tree` • `type=state` • `type=sequence` • `type=layers` • `type=nested` • `type=swimlane` • `type=timeline` • `type=gantt` • `type=medallion` • `type=flywheel` • `type=constellation` • `type=quadrant` • `type=pyramid` • `type=radar` • `type=venn`

---

## 2. Semantic Node Declarations

```markdy
# Syntax: <kind> <Id> ["Human Readable Label"]
browser WebApp "React SPA"
gateway ApiGateway "Envoy Gateway"
service AuthService "Auth & OAuth2"
service PaymentService "Stripe Checkout"
database Postgres "PostgreSQL 16"
cache Redis "Redis Cluster"
queue Kafka "Event Bus"
worker Transcoder "FFmpeg Worker"
storage S3 "Asset Bucket"
cdn Cloudflare "Edge CDN"
firewall WAF "AWS WAF Shield"
lambda Resize "Serverless Function"
pod OrderPod "order-pod-v2"
```

---

## 3. Structural Grouping

```markdy
group ingress "Public Ingress": Cloudflare WAF
group core "Core Backend Services": ApiGateway AuthService PaymentService
group persistence "Data Stores": Postgres Redis
```

---

## 4. Flow Operators

| Operator | Kind | Description |
|---|---|---|
| `->` | Synchronous Request | Solid arrow with moving particle (defines layout rank) |
| `<-` | Synchronous Response | Dashed return arrow flowing backward (cycle-safe) |
| `~>` | Asynchronous Event | Dotted pub/sub or event emission arrow |
| `<->` | Bidirectional Stream | Full-duplex WebSocket or socket connection |
| `==>` | Data Bulk Stream | Thick pipe for ETL, bulk replication, or WAL streams |
| `-.->` | Dotted Probe | Heartbeat ping, liveness probe, telemetry beacon |
| `--` | Structural Link | Static non-directional dependency line |

---

## 5. Storyboard Beats & Cues

```markdy
beat reveal "Initial Reveal":
  show $nodes stagger=60ms

beat step1 "Process Checkout":
  frame WebApp ApiGateway zoom=1.1
  WebApp -> ApiGateway "POST /checkout"
  ApiGateway -> AuthService "verify token"
  ApiGateway <- AuthService "200 OK"
  ApiGateway -> PaymentService "charge"
  PaymentService -> Postgres "INSERT order"
  PaymentService ~> Kafka "order.created"
  WebApp <- ApiGateway "201 Created"
  glow Postgres color=#10b981
```

### Cue Commands
- `show <target>`: Reveal nodes or groups (`stagger=50ms`, `dur=400ms`).
- `hide <target>`: Fade nodes out.
- `glow <target>`: Highlight with colored beacon (`color=#3b82f6`, `strength=1.5`).
- `focus <target>`: Pulse-scale attention ring.
- `frame <target>`: Smoothly pan and zoom camera to fit targets (`zoom=1.15`).
- `&`: Run concurrent cues at the same instant (`show A & show B`).
