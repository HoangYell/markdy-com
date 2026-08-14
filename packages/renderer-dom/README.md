# @markdy/renderer-dom

Web Animations API renderer for [MarkdyScript](../../docs/SYNTAX.md) scenes. Translates a parsed AST into DOM elements and drives the animation timeline.

## Features

- **Browser-native** — Web Animations API + CSS transforms, no Canvas or GSAP
- **Auto-layout diagrams** — renders positioned nodes and orthogonal, obstacle-aware edges from a compiled `RenderPlan`
- **Flow edges** — `->` request, `<-` response, `~>` event, `--` dependency, each with its own stroke, plus a pulse that travels the edge as it draws
- **Beat-driven cues** — `show`, `hide`, `glow`, and `focus`, sequenced by named beats
- **Focused diagram visuals** — flowchart shapes, tree buses, state self-loops, sequence lifelines/messages, constellation orbits, group zones, and annotations
- **Semantic node cards** — compact SVG glyphs for browsers, services, gateways, queues, workers, databases, storage, CDN, security, platform, and more
- **Seek-safe** — manual `currentTime` control enables reliable `seek()` in any direction
- **Playback-rate controls** — set normalized timeline speed to slow down or speed up diagrams without rebuilding animations
- **Interactive viewport** — opt into wheel zoom and drag pan while click-to-pause stays available
- **Embed controls** — opt into a compact playback toolbar with restart, speed, and view reset controls
- **Semantic themes** — `paper`, `editorial`, `nebula`, `midnight`, `blueprint`, and `graphite`, with per-role node and edge colors
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
  <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/markdy-output-preview.webp" alt="Markdy output preview" width="900" />
</p>

## Usage

```typescript
import { createDiagram } from "@markdy/renderer-dom";

const diagram = createDiagram({
  container: document.getElementById("scene")!,
  code: `
    scene "Request" theme=paper
    browser Web
    service API
    beat main:
      show $nodes
      Web -> API "GET /users"
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
| `autoplay` | `boolean` | `true` | Start playing immediately |
| `loop` | `boolean` | `true` | Loop the animation when it reaches the end |
| `copyright` | `boolean` | `true` | Show a small "Powered by Markdy" badge below the animation |
| `progressBar` | `boolean` | `true` | Deprecated compatibility flag for the rainbow scene-boundary progress bar |
| `sceneBoundaryProgress` | `boolean` | `progressBar ?? true` | Preferred flag for the rainbow scene-boundary progress bar |
| `playbackRate` | `number` | `1` | Normalized timeline speed multiplier; `1` is Markdy's normal pace |
| `interactiveViewport` | `boolean` | `false` | Enable wheel zoom and drag pan on the rendered viewport |
| `controls` | `boolean` | `false` | Show a compact toolbar with play/pause, restart, speed, and view reset controls when viewport interaction is enabled |
| `onWarning` | `(warning: Diagnostic) => void` | `console.warn` | Called for each soft parse warning |
| `onTimeUpdate` | `(seconds: number, durationSeconds: number) => void` | — | Called whenever playback or seek changes the current time |
| `onPlayStateChange` | `(playing: boolean) => void` | — | Called when playback starts or pauses |

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
