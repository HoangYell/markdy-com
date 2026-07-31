# @markdy/renderer-dom

Web Animations API renderer for [MarkdyScript](../../docs/SYNTAX.md) scenes. Translates a parsed AST into DOM elements and drives the animation timeline.

## Features

- **Browser-native** — Web Animations API + CSS transforms, no Canvas or GSAP
- **Emoji stick figures** — `figure` actor type with articulatable limbs, shoulder/hip joints, and body-part rig
- **Expressive gestures** — built-in `wave`, `nod`, `jump`, `bounce`, and multi-part `pose` actions
- **Seek-safe** — manual `currentTime` control enables reliable `seek()` in any direction
- **Face expressions** — instant emoji face swaps that work correctly on seek-back
- **Speech bubbles** — auto-positioned bubbles with fade-in/fade-out
- **Z-index layering** — `z` modifier for actor depth ordering
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
import { createPlayer } from "@markdy/renderer-dom";

const player = createPlayer({
  container: document.getElementById("scene")!,
  code: `
    scene width=600 height=300 bg=white
    actor hero = figure(#c68642, m, 😎) at (200, 150)
    @0.0: hero.enter(from=left, dur=0.8)
    @1.5: hero.say("Hello!", dur=1.2)
    @1.5: hero.face("😄")
  `,
  autoplay: true,
});

// Playback control
player.pause();
player.seek(1.5);   // jump to 1.5 seconds
player.play();
player.destroy();    // clean up DOM + cancel animations
```

## API

### `createPlayer(options: PlayerOptions): Player`

| Option | Type | Default | Description |
|---|---|---|---|
| `container` | `HTMLElement` | *(required)* | DOM element to mount the scene into |
| `code` | `string` | *(required)* | MarkdyScript source code |
| `assets` | `Record<string, string>` | `{}` | Asset URL overrides (key = asset name) |
| `autoplay` | `boolean` | `true` | Start playing immediately |
| `loop` | `boolean` | `true` | Loop the animation when it reaches the end |
| `copyright` | `boolean` | `true` | Show a small "Powered by Markdy" badge below the animation |
| `progressBar` | `boolean` | `true` | Show a rainbow progress bar around the viewport border |
| `onWarning` | `(warning: ParseWarning) => void` | `console.warn` | Called for each soft parse warning |
| `onTimeUpdate` | `(seconds: number, durationSeconds: number) => void` | — | Called whenever playback or seek changes the current time |
| `onPlayStateChange` | `(playing: boolean) => void` | — | Called when playback starts or pauses |

### `Player`

| Method | Description |
|---|---|
| `play()` | Start or resume playback |
| `pause()` | Pause at current position |
| `seek(seconds)` | Jump to a specific time |
| `currentTime()` | Current playback position in seconds |
| `duration()` | Total scene duration in seconds |
| `isPlaying()` | Whether the scene is currently playing |
| `chapters()` | Named `scene "..." { ... }` chapter blocks, in author order (empty if none) |
| `seekToChapter(name)` | Seek to the start of a named chapter; no-op if the name doesn't match |
| `destroy()` | Remove DOM elements and cancel all animations |

## Module Structure

```
src/
  types.ts        — ActorState, FaceSwap, easing utilities
  figure.ts       — Stick-figure DOM factory (emoji body parts)
  actors.ts       — Actor element factory (sprite, text, figure, box)
  animations.ts   — Timeline → WAAPI Animation builder
  player.ts       — Public API, rAF loop, face-swap engine
  index.ts        — Barrel exports
```

## Documentation

- **[Syntax Reference](../../docs/SYNTAX.md)** — complete DSL language spec
- **[Architecture](../../docs/ARCHITECTURE.md)** — renderer internals and playback design

## License

[MIT](../../LICENSE)
