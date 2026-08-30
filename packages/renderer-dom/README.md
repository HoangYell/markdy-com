# @markdy/renderer-dom

Web Animations API renderer for [MarkdyScript](../../docs/SYNTAX.md) scenes. Translates a parsed AST into DOM elements and drives the animation timeline.

## Features

- **Browser-native** — Web Animations API + CSS transforms, no Canvas or GSAP (~24 KB minzipped)
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

## Package position (text)

```text
@markdy/core -> @markdy/renderer-dom -> browser scene playback

This package consumes parsed AST and drives DOM + Web Animations API timelines.
```

## Output preview

<p align="center">
  <a href="https://markdy.com/playground/">
    <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/scene-lakehouse-medallion.webp" alt="Markdy DOM Renderer Lakehouse Medallion Output" width="900" />
  </a>
</p>
<p align="center">
  <a href="https://markdy.com/playground/">
    <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/scene-nebula-constellation.webp" alt="Markdy DOM Renderer Nebula Constellation Output" width="900" />
  </a>
</p>

## Usage

```typescript
import { createDiagram } from "@markdy/renderer-dom";

const diagram = createDiagram({
  container: document.getElementById("scene")!,
  code: `
    scene "Cache-Aside Architecture" theme=paper
    layout LR

    browser Client "Web Client"
    gateway Gateway "API Gateway"
    service Shortener "URL Service"
    cache Redis "Redis Cluster"

    beat hit:
      show $nodes stagger=60ms
      Client -> Gateway "GET /x9" -> Shortener "resolve"
      Shortener -> Redis "GET slug:x9"
      Shortener <- Redis "200 Target URL"
      Client <- Gateway "301 Redirect"
  `,
  autoplay: true,
});

// Playback control
diagram.pause();
diagram.seek(1.5);   // jump to 1.5 seconds
diagram.play();
diagram.destroy();    // clean up DOM + cancel animations
```

## API

### `createDiagram(options: DiagramOptions): Diagram`

| Option | Type | Default | Description |
|---|---|---|---|
| `container` | `HTMLElement` | *(required)* | DOM element to mount the scene into |
| `code` | `string` | *(required)* | MarkdyScript source code |
| `autoplay` | `boolean` | `player.playback.autoplay ?? true` | Override whether playback starts immediately |
| `loop` | `boolean` | `player.playback.loop ?? true` | Override whether playback loops at the end |
| `copyright` | `boolean` | `player.chrome.badge ?? true` | Show the linked badge at the footer's right edge |
| `progressBar` | `boolean \| string` | `true` | Deprecated compatibility flag for the scene-boundary progress bar |
| `sceneBoundaryProgress` | `boolean \| string` | `player.chrome.progress` | Override boundary progress, or pass a custom color/gradient |
| `progressColor` | `string` | `player.chrome.color` or rainbow | Override the progress color or gradient |
| `playbackRate` | `number` | `player.playback.rate ?? 1` | Override the initial timeline multiplier |
| `interactiveViewport` | `boolean` | `player.interaction` | `true` supplies default gestures; `false` suppresses script gestures |
| `controls` | `boolean` | `player.controls` | `true` supplies legacy toolbar defaults; `false` suppresses script controls |
| `shareUrl` | `string` | Markdy playground | Base URL used by the Share control when building `#code=` links |
| `onWarning` | `(warning: Diagnostic) => void` | `console.warn` | Called for each soft parse warning |
| `onTimeUpdate` | `(seconds: number, durationSeconds: number) => void` | — | Called whenever playback or seek changes the current time |
| `onPlayStateChange` | `(playing: boolean) => void` | — | Called when playback starts or pauses |

> **Note:** Prefer grouped `player:` configuration in MarkdyScript. Omitted host options preserve it; host `false` suppresses controls or interaction, while host `true` supplies legacy defaults for leaves the script does not set. A speed selector renders only with at least two distinct positive `speeds` values.

### `Diagram`

| Method | Description |
|---|---|
| `play()` | Start or resume playback |
| `pause()` | Pause at current position |
| `seek(seconds)` | Jump to a specific time |
| `setPlaybackRate(rate)` | Change timeline speed; ignores non-positive or non-finite values |
| `playbackRate()` | Current timeline speed multiplier |
| `currentTime()` | Current playback position in seconds |
| `duration()` | Total scene duration in seconds |
| `isPlaying()` | Whether the scene is currently playing |
| `setTheme(themeName)` | Switch theme dynamically at runtime across all 8 supported themes |
| `exportGif(options?)` | Render zero-dependency animated GIF89a with LZW compression |
| `exportSvg()` | Export Figma-compatible vector SVG snapshot of the current frame |
| `beats()` | Named `beat` ranges, in author order (empty if none) |
| `seekToBeat(name)` | Seek to the start of a named beat; no-op if the name doesn't match |
| `destroy()` | Remove DOM elements and cancel all animations |

## Module Structure

```
src/
  index.ts        — Barrel exports (createDiagram)
  diagram.ts      — Public API, rAF loop, progress bar, responsive scaling
  nodes.ts        — Node element factory + scene title
  edges.ts        — Flow-edge SVG runtime, routing, and cue animations
  sequence.ts     — Participant lifelines, messages, and activation spans
  tree.ts         — Shared parent/child bus connectors
  groups.ts       — Group boundary zones
  annotations.ts  — Editorial callouts and leader lines
  constellation.ts — Nebula halos, orbit rings, and deterministic stars
  geometry/
    rect.ts       — Rects, points, and hit-testing (DOM-free, unit tested)
    path.ts       — Polyline measurement + obstacle-aware orthogonal routing
  theme.ts        — Scene ambience styles and theme-token application
```

### Adding a cue or edge kind

Cue and edge animations live in `edges.ts` (`buildCueAnimations`). Add the new
keyword or operator to `@markdy/core`'s `registry.ts` so the parser accepts it,
then handle it in the corresponding branch of `buildCueAnimations`.

## Documentation

- **[Syntax Reference](../../docs/SYNTAX.md)** — complete DSL language spec
- **[Architecture](../../docs/ARCHITECTURE.md)** — renderer internals and playback design

## License

[MIT](../../LICENSE)
