# @markdy/renderer-dom

Web Animations API renderer for [MarkdyScript](../../docs/SYNTAX.md) scenes. Translates a parsed AST into DOM elements and drives the animation timeline with interactive analytical capabilities.

## Features

- **Browser-native** — Web Animations API + CSS transforms, no Canvas or GSAP (~24 KB minzipped)
- **Blast Radius & Upstream Impact Lens** — compute and highlight transitive inward callers and outward impact chains dynamically
- **Route Pathfinder** — discover and animate the shortest topological communication route between any two services
- **Dynamic Port Multiplexing & Fillet Connectors** — renders balanced parallel connection lanes with smooth rounded corner paths
- **17 Diagram Layout Topologies** — `architecture`, `flowchart`, `tree`, `sequence`, `state`, `layers`, `nested`, `swimlane`, `timeline`, `gantt`, `medallion`, `flywheel`, `constellation`, `quadrant`, `pyramid`, `radar`, `venn`
- **Dynamic Theme Switching** — live runtime switching across 10 semantic themes (`paper`, `editorial`, `midnight`, `blueprint`, `graphite`, `nebula`, `terminal`, `sketchy`, `ink`, `doodle`)
- **Flow edges** — `->` request, `<-` response, `~>` event, `--` dependency, each with its own stroke, plus animated traveling pulse
- **Beat-driven cues** — `show`, `hide`, `glow`, `focus`, and `frame` camera zooms, sequenced by named beats
- **Media Exporters** — zero-dep animated GIF89a exporter with LZW compression and Figma-ready vector SVG export
- **Seek-safe** — manual `currentTime` control enables reliable `seek()` in any direction
- **Playback-rate controls** — set normalized timeline speed to slow down or speed up diagrams without rebuilding animations
- **Interactive viewport** — wheel zoom, drag pan, and double-click reset with responsive auto-fit
- **Single dependency** — only `@markdy/core`

## Installation

```sh
pnpm add @markdy/core @markdy/renderer-dom
```

## Package Position

```text
@markdy/core -> @markdy/renderer-dom -> browser scene playback & impact lens
```

## Usage

```typescript
import { createDiagram, calculateBlastRadius, findShortestRoute } from "@markdy/renderer-dom";
import { parse } from "@markdy/core";

const code = `
scene "FinTech Checkout" theme=paper
layout LR

browser Client "Web Client"
gateway Gateway "API Gateway"
service PaymentSvc "Payment Service" @src="src/pay/index.ts#L10"
database LedgerDb "Ledger DB" icon=postgresql

beat checkout:
  show $nodes stagger=60ms
  Client -> Gateway "POST /checkout" -> PaymentSvc "Process" -> LedgerDb "Commit"
`;

const diagram = createDiagram({
  container: document.getElementById("scene")!,
  code,
  autoplay: true,
});

// Calculate Blast Radius
const ast = parse(code);
const impact = calculateBlastRadius("PaymentSvc", ast);
console.log("Upstream callers:", impact.upstreamNodeIds);     // ['Gateway', 'Client']
console.log("Downstream blast:", impact.downstreamNodeIds);   // ['LedgerDb']

// Shortest Route Pathfinder
const shortestPath = findShortestRoute("Client", "LedgerDb", ast);
console.log("Route:", shortestPath); // ['Client', 'Gateway', 'PaymentSvc', 'LedgerDb']
```

## API Exports

| Export | Type | Description |
|---|---|---|
| `createDiagram(options)` | `Function` | Mounts and drives an animated diagram in a DOM container |
| `calculateBlastRadius(nodeId, ast)` | `Function` | Computes upstream dependency callers and downstream blast radius |
| `findShortestRoute(fromId, toId, ast)` | `Function` | Finds the shortest topological message path between two nodes |
| `applyImpactHighlight(container, impact)` | `Function` | Highlights affected subgraph and dims non-impacted nodes |
| `clearImpactHighlight(container)` | `Function` | Resets all impact highlighting |
| `exportDiagramAsVectorSvg(container, opts?)` | `Function` | Export pure SVG vector snapshot of active scene frame |
| `exportDiagramAsPng(container, opts?)` | `Function` | Export high-DPI rasterized PNG Blob |
| `exportDiagramAsGif(diagram, opts?)` | `Function` | Export animated GIF89a recording |

## License

[MIT](../../LICENSE)
