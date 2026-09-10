# @markdy/renderer-dom

<p align="center">
  <a href="https://markdy.com/playground/"><img src="https://img.shields.io/badge/⚡_Live_Studio-markdy.com%2Fplayground-3b82f6?style=for-the-badge" alt="Live Studio" /></a>
  <a href="https://markdy.com/docs/"><img src="https://img.shields.io/badge/📖_Docs-Documentation-10b981?style=for-the-badge" alt="Documentation" /></a>
  <a href="https://markdy.com/examples/"><img src="https://img.shields.io/badge/🌟_Blueprints-30+_Examples-f59e0b?style=for-the-badge" alt="Examples" /></a>
  <a href="https://github.com/sponsors/HoangYell"><img src="https://img.shields.io/badge/💖_Sponsor-Support_Markdy-ea4aaa?style=for-the-badge" alt="Sponsor Markdy" /></a>
</p>

Web Animations API renderer for [MarkdyScript](https://markdy.com/docs/) scenes. Translates a parsed AST into 60fps GPU-accelerated DOM elements and drives the animation timeline with interactive analytical capabilities (Blast Radius, Route Pathfinder, and SVG/GIF export).

> 🚀 **Try it live**: Test MarkdyScript in the browser at **[markdy.com/playground](https://markdy.com/playground/)**  
> 📚 **Documentation**: Complete syntax guide and examples at **[markdy.com/docs](https://markdy.com/docs/)**  
> 💼 **Enterprise & Commercial**: Free under MIT. To support development or request custom architecture blueprints, explore **[GitHub Sponsors](https://github.com/sponsors/HoangYell)**.

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

## Responsive Playback

Animations run on the browser's Web Animations timeline. JavaScript synchronizes
them on play, pause, seek, speed changes, and layout changes, not on every frame.

`responsiveLayout` controls whether the renderer may change orientation:

- `"auto"` (default): adapt diagrams without an explicit `layout` directive.
- `true`: also adapt diagrams that declare a direction, as in the playground.
- `false`: keep the source layout fixed and only scale the scene.

With `fitMode: "auto"` (default), automatically sized architecture, flowchart,
state, and tree diagrams compare cached horizontal and vertical layouts against
the available width and height. Orientation changes only when the alternative
improves the fitted scale by more than 20%. Other cases use a width breakpoint
around 640px with a 32px margin on either side. Reverse flow stays BT/RL, and
explicit scene dimensions are preserved, including partially specified sizes.

Auto fitting uses width-first framing in natural-height embeds and contain
framing in height-constrained hosts. If fitting requires a scale below
`minReadableScale` (default `0.9`, valid range `0` to `1`), the viewport scrolls
instead of shrinking further. Set it to `0` to disable the readability floor.
The Fit control toggles between a contained overview and readable framing.
Scrollable framing starts horizontally centered and pins storyboard camera motion
so frame cues do not compete with manual scrolling; other animations keep playing.
Explicit `fitMode: "width"` and `fitMode: "contain"` keep their original scaling
behavior without a readability floor.

Bounds include routed paths and label rectangles, even outside the estimated
scene dimensions, and are cached after mounting or re-layout. Container resizing
preserves playback time and state. ResizeObserver handles split panes as well as
window resizing; hosts can call `diagram.resize()` after revealing a hidden preview.

## Animated GIF Export

```typescript
const gif = await diagram.exportGif({
  fps: 12,
  pixelRatio: 1,
  maxFrames: 120,
  maxWidth: 1600,
  holdEndMs: 1400,
  loop: true,
  onProgress: (progress) => console.log(Math.round(progress * 100)),
});
```

GIF export captures the rendered DOM, including node styling, shadows, and
the current animation state. Use `mode: "pure"` for the previous vector-based
rasterization path. PNG and SVG exports keep their existing defaults.

`fps` and `pixelRatio` are targets. Long scenes are sampled evenly across the
complete timeline, with at most `maxFrames` frames including the final hold.
Output width is capped by `maxWidth`; resolution is reduced further when needed
to keep captured frames within a 48-megapixel budget. Repeated frames are merged
without losing their delays, so compression preserves playback duration.

Playback time and playing/paused state are restored after export, including
when capture fails. Browser font and cross-origin image restrictions still apply.

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
| `exportDiagramAsGif(container, timeline, opts?)` | `Function` | Export animated GIF89a recording |

## Ecosystem & Documentation

- ⚡ **[Interactive Studio / Playground](https://markdy.com/playground/)** — edit MarkdyScript with instant live preview in your browser
- 📖 **[Syntax Guide & Reference](https://markdy.com/docs/)** — complete language specification and keywords
- 🌟 **[Canonical Blueprints](https://markdy.com/examples/)** — production-grade distributed system and cloud architectures
- 📦 **[GitHub Repository](https://github.com/HoangYell/markdy-com)** — source code, benchmarks, and issue tracker

## License

[MIT](https://github.com/HoangYell/markdy-com/blob/main/LICENSE)
