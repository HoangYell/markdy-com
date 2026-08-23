# MarkdyScript examples

Every file in this tree parses cleanly on the current grammar. Changes that break an example also break the `verify:examples` gate in CI.
Examples lead with scene content and keep optional `player:` configuration at the bottom.

## Layout

- Top-level `.markdy` files — a progressive learning sequence, one concept per file:
  - [`01-first-diagram.markdy`](01-first-diagram.markdy) — nodes, a beat, and a flow chain.
  - [`02-flow-operators.markdy`](02-flow-operators.markdy) — the four edge operators (`->`, `<-`, `~>`, `--`).
  - [`03-beats-and-groups.markdy`](03-beats-and-groups.markdy) — beats, groups, parallel `&` cues, `glow`/`focus`.
  - [`04-patterns-and-styles.markdy`](04-patterns-and-styles.markdy) — reusable `pattern` + `use`, and node `style`.
  - [`05-universal-ingestion.markdy`](05-universal-ingestion.markdy) — microservice mesh transpiled from Docker Compose & Kubernetes.
  - [`06-architecture-governance.markdy`](06-architecture-governance.markdy) — Well-Architected governance with layered isolation and cycle validation.
  - [`07-flywheel-loop.markdy`](07-flywheel-loop.markdy) — circular closed-loop engine with tangential flow paths.
  - [`08-medallion-lakehouse.markdy`](08-medallion-lakehouse.markdy) — multi-tier Bronze &rarr; Silver &rarr; Gold data lakehouse stages.
  - [`09-strategic-quadrant.markdy`](09-strategic-quadrant.markdy) — 2&times;2 strategic decision & technology positioning matrix.
  - [`10-cross-functional-swimlane.markdy`](10-cross-functional-swimlane.markdy) — cross-functional horizontal lane partitions.
  - [`11-enterprise-pyramid.markdy`](11-enterprise-pyramid.markdy) — value pyramids and step-proportional tier stacks.
  - [`12-multi-axis-radar.markdy`](12-multi-axis-radar.markdy) — multi-axis polygon technology benchmark radar chart.
  - [`13-secure-paved-road.markdy`](13-secure-paved-road.markdy) — Zero-trust secure paved road with perimeter and egress gateways.
  - [`14-fanin-queue-bottleneck.markdy`](14-fanin-queue-bottleneck.markdy) — Fan-in queue with worker concurrency and throughput bottlenecks.
  - [`15-project-timeline.markdy`](15-project-timeline.markdy) — horizontal milestone baseline with collision-free alternating placement.
  - [`16-gantt-roadmap.markdy`](16-gantt-roadmap.markdy) — Gantt task schedules with phase and span tracking.
  - [`17-venn-overlap.markdy`](17-venn-overlap.markdy) — 2&ndash;3 circle set overlap and sweet-spot intersection.
  - [`18-layer-stack.markdy`](18-layer-stack.markdy) — OSI & abstraction layer stacked horizontal bands.
  - [`19-nested-containment.markdy`](19-nested-containment.markdy) — concentric defense-in-depth security perimeters.
  - [`20-player-configuration.markdy`](20-player-configuration.markdy) — script-owned playback, focused controls, interaction, and footer chrome.
- `showcase/` — 17 premier 1-per-scene-type showcase diagrams featured on the homepage, plus 30+ full archive scenes in the gallery.
- `astro-starter/` — a minimal Astro project embedding the `<Markdy />` component.

## 🏛️ Visual Showcase Gallery (17 Diagram Engines)

Explore the full interactive archive at **[markdy.com/examples](https://markdy.com/examples/)** or test scenes in the **[Markdy Studio / Playground](https://markdy.com/playground/)**:

| ⚡ Systems &amp; High Concurrency | 🚦 Decision Logic &amp; Consensus |
|:---:|:---:|
| **Architecture (Cache-Aside Pattern)**<br><sub>Sub-2ms Redis cache redirection &amp; database fallback</sub><br><br><a href="https://markdy.com/playground/"><img src="../docs/images/scene-url-shortener.webp" alt="Architecture (Cache-Aside Pattern)" width="100%" /></a> | **Concurrency Strategy Flowchart**<br><sub>Thread safety, CAS atomics &amp; mutex contention</sub><br><br><a href="https://markdy.com/playground/"><img src="../docs/images/scene-concurrency-decision-flowchart.webp" alt="Concurrency Strategy Flowchart" width="100%" /></a> |
| **Consistent Hash Ring Tree**<br><sub>`O(k/N)` minimal data rebalancing &amp; vNode partitions</sub><br><br><a href="https://markdy.com/playground/"><img src="../docs/images/scene-consistent-hash-tree.webp" alt="Consistent Hash Ring Tree" width="100%" /></a> | **OAuth 2.0 PKCE Auth Sequence**<br><sub>Zero-trust Single Page App authentication exchange</sub><br><br><a href="https://markdy.com/playground/"><img src="../docs/images/scene-oauth-pkce-sequence.webp" alt="OAuth 2.0 PKCE Auth Sequence" width="100%" /></a> |
| **Distributed 2PC Consensus State**<br><sub>Prepare/Commit/Abort multi-partition consensus</sub><br><br><a href="https://markdy.com/playground/"><img src="../docs/images/scene-distributed-2pc-state.webp" alt="Distributed 2PC Consensus State" width="100%" /></a> | **OSI 7-Layer Protocol Stack**<br><sub>Full-width horizontal packet encapsulation bands</sub><br><br><a href="https://markdy.com/playground/"><img src="../docs/images/scene-osi-layers.webp" alt="OSI 7-Layer Protocol Stack" width="100%" /></a> |
| **Zero-Trust Security Perimeter**<br><sub>Concentric defense-in-depth Kubernetes security enclaves</sub><br><br><a href="https://markdy.com/playground/"><img src="../docs/images/scene-nested-security.webp" alt="Zero-Trust Security Perimeter" width="100%" /></a> | **Distributed Saga Order Swimlanes**<br><sub>Cross-functional lanes &amp; asynchronous rollback coordination</sub><br><br><a href="https://markdy.com/playground/"><img src="../docs/images/scene-ecommerce-swimlanes.webp" alt="Distributed Saga Order Swimlanes" width="100%" /></a> |
| **Database WAL &amp; CDC Stream Timeline**<br><sub>Zero-collision alternating milestone baseline</sub><br><br><a href="https://markdy.com/playground/"><img src="../docs/images/scene-platform-milestones-timeline.webp" alt="Database WAL & CDC Stream Timeline" width="100%" /></a> | **Zero-Downtime Migration Gantt**<br><sub>Multi-phase task spans &amp; critical path dependencies</sub><br><br><a href="https://markdy.com/playground/"><img src="../docs/images/scene-engineering-roadmap.webp" alt="Zero-Downtime Migration Gantt" width="100%" /></a> |
| **Lakehouse Medallion Data Pipeline**<br><sub>Streaming Bronze &rarr; Silver &rarr; Gold transformations</sub><br><br><a href="https://markdy.com/playground/"><img src="../docs/images/scene-lakehouse-medallion.webp" alt="Lakehouse Medallion Data Pipeline" width="100%" /></a> | **Decentralized Gossip Flywheel**<br><sub>Circular closed-loop anti-entropy sync engine</sub><br><br><a href="https://markdy.com/playground/"><img src="../docs/images/scene-data-flywheel.webp" alt="Decentralized Gossip Flywheel" width="100%" /></a> |
| **Raft Quorum Constellation (Nebula)**<br><sub>Radial orbit geometry &amp; pulsating consensus halos</sub><br><br><a href="https://markdy.com/playground/"><img src="../docs/images/scene-nebula-constellation.webp" alt="Raft Quorum Constellation" width="100%" /></a> | **CAP Theorem Decision Quadrant**<br><sub>Automated 2&times;2 matrix trade-off positioning</sub><br><br><a href="https://markdy.com/playground/"><img src="../docs/images/scene-strategic-quadrant.webp" alt="CAP Theorem Decision Quadrant" width="100%" /></a> |
| **Cloud Observability Pyramid**<br><sub>Step-proportional telemetry &amp; monitoring tier stack</sub><br><br><a href="https://markdy.com/playground/"><img src="../docs/images/scene-platform-pyramid.webp" alt="Cloud Observability Pyramid" width="100%" /></a> | **Storage Benchmark Radar**<br><sub>Multi-axis polygon database performance evaluation</sub><br><br><a href="https://markdy.com/playground/"><img src="../docs/images/scene-database-radar.webp" alt="Storage Benchmark Radar" width="100%" /></a> |
| **ACID vs BASE Consistency Venn**<br><sub>3-Circle concept intersection &amp; sweet spot overlap</sub><br><br><a href="https://markdy.com/playground/"><img src="../docs/images/scene-product-market-fit-venn.webp" alt="ACID vs BASE Consistency Venn" width="100%" /></a> | **AI Agent Workflow &amp; Prompting**<br><sub>Autonomous MCP tool execution &amp; self-healing diagrams</sub><br><br><a href="https://markdy.com/agent/"><img src="../docs/images/markdy-ai-agent-workflow.webp" alt="AI Agent Workflow" width="100%" /></a> |

Compat-gate fixtures (baseline snapshot corpus) live alongside their snapshots in `packages/compat/fixtures/` and are covered by `pnpm run gate`.

## Verifying

```bash
pnpm run verify:examples   # parse every file, assert no regressions
pnpm run gate              # compat-gate against baseline snapshots
pnpm run ci                # full test + gate + verify pipeline
```

