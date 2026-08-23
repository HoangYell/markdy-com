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

| Architecture (Cache-Aside Pattern) | Concurrency Strategy Flowchart |
|---|---|
| [![Architecture](../docs/images/scene-url-shortener.webp)](https://markdy.com/playground/) | [![Flowchart](../docs/images/scene-concurrency-decision-flowchart.webp)](https://markdy.com/playground/) |
| **Consistent Hash Ring Tree** | **OAuth 2.0 PKCE Auth Sequence** |
| [![Tree](../docs/images/scene-consistent-hash-tree.webp)](https://markdy.com/playground/) | [![Sequence](../docs/images/scene-oauth-pkce-sequence.webp)](https://markdy.com/playground/) |
| **Distributed 2PC Consensus State** | **OSI 7-Layer Protocol Stack** |
| [![State](../docs/images/scene-distributed-2pc-state.webp)](https://markdy.com/playground/) | [![Layers](../docs/images/scene-osi-layers.webp)](https://markdy.com/playground/) |
| **Zero-Trust Security Perimeter** | **Distributed Saga Order Swimlanes** |
| [![Nested](../docs/images/scene-nested-security.webp)](https://markdy.com/playground/) | [![Swimlane](../docs/images/scene-ecommerce-swimlanes.webp)](https://markdy.com/playground/) |
| **Database WAL & CDC Stream Timeline** | **Zero-Downtime Migration Gantt** |
| [![Timeline](../docs/images/scene-platform-milestones-timeline.webp)](https://markdy.com/playground/) | [![Gantt](../docs/images/scene-engineering-roadmap.webp)](https://markdy.com/playground/) |
| **Lakehouse Medallion Data Pipeline** | **Decentralized Gossip Flywheel** |
| [![Medallion](../docs/images/scene-lakehouse-medallion.webp)](https://markdy.com/playground/) | [![Flywheel](../docs/images/scene-data-flywheel.webp)](https://markdy.com/playground/) |
| **Raft Quorum Constellation (Nebula)** | **CAP Theorem Decision Quadrant** |
| [![Constellation](../docs/images/scene-nebula-constellation.webp)](https://markdy.com/playground/) | [![Quadrant](../docs/images/scene-strategic-quadrant.webp)](https://markdy.com/playground/) |
| **Cloud Observability Pyramid** | **Storage Benchmark Radar** |
| [![Pyramid](../docs/images/scene-platform-pyramid.webp)](https://markdy.com/playground/) | [![Radar](../docs/images/scene-database-radar.webp)](https://markdy.com/playground/) |

Compat-gate fixtures (baseline snapshot corpus) live alongside their snapshots in `packages/compat/fixtures/` and are covered by `pnpm run gate`.

## Verifying

```bash
pnpm run verify:examples   # parse every file, assert no regressions
pnpm run gate              # compat-gate against baseline snapshots
pnpm run ci                # full test + gate + verify pipeline
```

