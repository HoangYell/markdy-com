<p align="center">
  <strong>Markdy</strong><br>
  An open-source animation DSL engine.<br>
  Write MarkdyScript → get animated scenes in the browser.
</p>

<p align="center">
  <a href="https://markdy.com"><b>✨ Try the Interactive Playground</b></a>
</p>

<p align="center">
  <a href="https://github.com/HoangYell/markdy-com/actions/workflows/ci.yml"><img src="https://github.com/HoangYell/markdy-com/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <a href="https://www.npmjs.com/package/@markdy/core"><img src="https://img.shields.io/npm/v/@markdy/core?color=blue&label=%40markdy%2Fcore" alt="npm version" /></a>
  <a href="https://bundlephobia.com/package/@markdy/core"><img src="https://img.shields.io/bundlephobia/minzip/@markdy/core?label=size" alt="Bundle Size" /></a>
  <a href="https://stackblitz.com/github/HoangYell/markdy-com/tree/main/examples/astro-starter"><img src="https://developer.stackblitz.com/img/open_in_stackblitz.svg" alt="Open in StackBlitz" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/HoangYell/markdy-com" alt="MIT License" /></a>
</p>

---

## What is Markdy?

**Markdy is a framework-agnostic Animation DSL.** Write animations like Markdown.

It is like [Mermaid](https://mermaid.js.org/) but for motion. Define actors, timelines, and interactions in a simple, readable DSL — the engine handles rendering with the Web Animations API. No Canvas, no GSAP, no bloated dependencies.

```markdy
scene width=600 height=300 bg=white

actor label = text("Hello World") at (50, 130) size 40 opacity 0

@0.3: label.fade_in(dur=0.6)
@1.2: label.move(to=(200, 130), dur=0.8, ease=out)
```

### Key Features

| Feature | Detail |
|---|---|
| **Zero-dep parser** | `@markdy/core` is pure TypeScript — no DOM, no runtime deps |
| **Web-native renderer** | Web Animations API + CSS transforms. No Canvas, no GSAP |
| **Stick-figure actors** | Emoji-based `figure` type with articulatable limbs, face expressions |
| **Chapters + cameras** | `scene "title" { ... }` blocks, `camera.pan/zoom/shake`, `@+N:` relative time |
| **Captions, imports, presets** | First-class `caption` actors, `import "..." as ns` composition, parse-time `preset <name>(...)` macros |
| **Forgiving by default, strict on demand** | Unknown actions soft-warn; prefix with `!` to hard-fail (e.g. `hero.!shake(...)`) |
| **Language-first design** | `var`, `def`, `seq` let users build character systems and choreographies without engine changes |
| **Astro-ready** | `<Markdy />` island that hydrates on viewport entry |
| **AI-agent friendly** | Structured DSL that LLMs can generate, validate, and iterate on ([Agent Guide](docs/AGENT.md)) |

---

## Packages

| Package | Description | Size |
|---|---|---|
| [`@markdy/core`](packages/core) | Parser + AST types (zero runtime deps) | ~12 KB |
| [`@markdy/renderer-dom`](packages/renderer-dom) | Web Animations API renderer | ~22 KB |
| [`@markdy/astro`](packages/astro) | Astro island component | ~2 KB |

---

## Quick Start

### Vanilla JS / TypeScript

```sh
pnpm add @markdy/core @markdy/renderer-dom
```

```ts
import { createPlayer } from "@markdy/renderer-dom";

const player = createPlayer({
  container: document.getElementById("scene")!,
  code: `
    scene width=600 height=300 bg=white
    actor label = text("Hello") at (50, 130) size 40 opacity 0
    @0.3: label.fade_in(dur=0.6)
  `,
  autoplay: true,
});

// Control playback
player.pause();
player.seek(1.5);   // jump to 1.5 s
player.play();
player.destroy();    // clean up
```

### Astro / MDX

```sh
pnpm add @markdy/astro
```

```astro
---
import { Markdy } from "@markdy/astro";

const code = `
  scene width=800 height=400 bg=#fff5f9
  actor hero = figure(#c68642, m, 😎) at (300, 200)
  @0.5: hero.enter(from=left, dur=0.8)
  @1.5: hero.say("Hello!", dur=1.0)
`;
---

<Markdy code={code} width={800} height={400} bg="#fff5f9" autoplay />
```

### Parser Only (Node.js / Edge)

```ts
import { parse, ParseError } from "@markdy/core";

try {
  const ast = parse(source);
  console.log(ast.actors);  // { hero: { type: "figure", ... } }
  console.log(ast.events);  // [{ time: 0.5, actor: "hero", action: "enter", ... }]
} catch (e) {
  if (e instanceof ParseError) {
    console.error(`Line ${e.line}: ${e.message}`);
  }
}
```

---

## DSL at a Glance

Full reference: **[docs/SYNTAX.md](docs/SYNTAX.md)** · Step-by-step tutorial: **[docs/TUTORIAL.md](docs/TUTORIAL.md)** · AI agent guide: **[docs/AGENT.md](docs/AGENT.md)**

### Scene + Actors + Timeline

```markdy
scene width=800 height=400 bg=white

asset flower = image("/flower.svg")

actor hero  = figure(#c68642, m, 😎) at (100, 200)
actor label = text("Watch this") at (400, 50) size 32 opacity 0

@0.0: hero.enter(from=left, dur=0.8)
@1.0: hero.say("Hi!", dur=1.2)
@2.5: hero.face("😄")
@3.0: label.fade_in(dur=0.5)
```

### Variables + Templates + Sequences

```markdy
var skin = #c68642

def fighter(skin, face) {
  figure(${skin}, m, ${face})
}

seq punch_combo(side) {
  @+0.0: $.punch(side=${side}, dur=0.3)
  @+0.3: $.shake(intensity=5, dur=0.2)
}

actor bruno = fighter(${skin}, 😏) at (200, 200)

@0.5: bruno.enter(from=left, dur=0.8)
@2.0: bruno.play(punch_combo, side=right)
```

### Chapters, Camera, Captions

```markdy
scene width=900 height=500 bg=#101424

actor title = caption("ROUND 1") at top
actor hero  = figure(#c68642, m, 😎) at (300, 260)

scene "intro" {
  @+0.0: title.fade_in(dur=0.3)
  @+0.3: hero.enter(from=left, dur=0.7)
}

scene "beat" {
  @+0.2: camera.zoom(to=1.3, dur=0.5)
  @+0.1: hero.punch(side=right, dur=0.3)
  @+0.0: camera.shake(intensity=10, dur=0.3)
}

@+0.5: hero.exit(to=right, dur=0.5)
```

### Namespaced Imports + Presets

```markdy
# One-liner using a shipped preset macro:
preset meme("when the bug is finally fixed", "it was a typo")
```

```markdy
# Compose across files — host resolves "as chars" → ast
import "./characters.markdy" as chars

actor hero = chars.fighter(${chars.skin_warm}, 😎) at (200, 200)
@0.0: hero.enter(from=left, dur=0.6)
```

### Actions Reference

| Action | Description | Key Parameters |
|---|---|---|
| `enter` | Slide in from offscreen + fade | `from`, `dur`, `ease` |
| `exit` | Slide off-screen + fade out | `to`, `dur`, `ease` |
| `move` | Translate to position | `to=(x,y)`, `dur`, `ease` |
| `fade_in` / `fade_out` | Opacity transitions | `dur` |
| `scale` | Animate scale | `to`, `dur`, `ease` |
| `rotate` | Animate rotation | `to` (degrees), `dur` |
| `shake` | Horizontal oscillation | `intensity`, `dur` |
| `say` | Speech bubble | `"text"`, `dur` |
| `throw` | Projectile to target | `asset`, `to`, `dur` |
| `punch` / `kick` | Limb strike (figure only) | `side` |
| `rotate_part` | Rotate body part (figure only) | `part`, `to`, `dur` |
| `pose` | Set multiple parts at once (figure only) | `arm_left`, `arm_right`, etc. |
| `wave` | Wave gesture (figure only) | `side`, `dur` |
| `nod` | Head nod gesture (figure only) | `dur` |
| `jump` | Jump with squash/stretch (figure only) | `height`, `dur` |
| `bounce` | Diminishing vertical bounce (figure only) | `intensity`, `count`, `dur` |
| `face` | Swap emoji expression (figure only) | `"emoji"` |
| `camera.pan` | Pan scene to center on `(x, y)` | `to=(x,y)`, `dur`, `ease` |
| `camera.zoom` | Zoom scene content | `to`, `dur` |
| `camera.shake` | Camera-level shake | `intensity`, `dur` |

Easing values: `linear` (default), `in`, `out`, `inout`.

---

## API Reference

### `parse(source: string, opts?: ParseOptions): SceneAST`

Parses MarkdyScript source into a typed AST. Throws `ParseError` with line numbers on structural errors. Pure function with no side effects — runs in Node.js, Deno, edge runtimes, or the browser.

```ts
interface ParseOptions {
  // Host-resolved ASTs for `import "..." as ns`. Namespaces whose ASTs are
  // supplied have their vars/defs/seqs merged under `ns.<name>` and can be
  // referenced from the parent. Unresolved namespaces emit a soft warning.
  imports?: Record<string, SceneAST>;
}
```

`SceneAST` includes `ast.warnings[]` (soft parse warnings like `unknown-action`, `import-unresolved`), `ast.chapters[]`, and `ast.imports[]`. See [docs/AGENT.md](docs/AGENT.md#ast-shape-for-programmatic-use) for the full shape.

### `createPlayer(options: PlayerOptions): Player`

Creates a DOM-based animation player.

```ts
interface PlayerOptions {
  container: HTMLElement;    // Mount point
  code: string;             // MarkdyScript source
  assets?: Record<string, string>;  // Asset URL overrides
  imports?: Record<string, SceneAST>;  // Namespaces for `import "..." as ns`
  autoplay?: boolean;       // Start immediately (default: true)
  loop?: boolean;           // Loop at end (default: true)
  copyright?: boolean;      // "Powered by Markdy" badge (default: true)
  progressBar?: boolean;    // Rainbow border progress bar (default: true)
  onWarning?: (w: ParseWarning) => void;  // Surface soft parse warnings
}

interface Player {
  play(): void;             // Start / resume
  pause(): void;            // Pause at current position
  seek(seconds: number): void;  // Jump to time
  destroy(): void;          // Remove DOM + cancel animations
}
```

### `<Markdy />` (Astro Component)

| Prop | Type | Default | Description |
|---|---|---|---|
| `code` | `string` | *(required)* | MarkdyScript source |
| `width` | `number` | `800` | Placeholder width (px) |
| `height` | `number` | `400` | Placeholder height (px) |
| `bg` | `string` | `"white"` | Placeholder background colour |
| `assets` | `Record<string, string>` | `{}` | Asset URL overrides |
| `autoplay` | `boolean` | `true` | Auto-play when fully visible in viewport |
| `loop` | `boolean` | `true` | Loop the animation when it ends |
| `copyright` | `boolean` | `true` | Show a "Powered by Markdy" badge below the animation |
| `progressBar` | `boolean` | `true` | Show a rainbow progress bar around the viewport border |
| `class` | `string` | — | CSS class for outer wrapper |

---

## Architecture

See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for technical details.

```
  MarkdyScript source
        │
        ▼
  ┌─────────────┐
  │ @markdy/core │  parse() → SceneAST
  │  (parser)    │  Pure TS, zero deps
  └──────┬──────┘
         │ SceneAST
         ▼
  ┌──────────────────┐
  │ @markdy/renderer  │  createPlayer() → Player
  │  -dom             │  WAAPI + rAF loop
  └──────┬───────────┘
         │ Player
         ▼
  ┌──────────────────┐
  │ @markdy/astro     │  <Markdy /> island
  │  (optional)       │  SSR placeholder + IntersectionObserver
  └──────────────────┘
```

All WAAPI animations are permanently paused. A `requestAnimationFrame` loop manually sets `anim.currentTime = sceneMs` each frame. This avoids browser-specific quirks with `startTime`-based resumption and enables reliable `seek()`.

---

## Development

```sh
git clone https://github.com/HoangYell/markdy-com.git
cd markdy-com
pnpm install
pnpm build
pnpm test
```

### Project Structure

```
packages/
  core/              @markdy/core         — Parser + AST types (zero deps)
  renderer-dom/      @markdy/renderer-dom — WAAPI renderer
  astro/             @markdy/astro        — Astro island component
website/               Official markdy.com playground & website (Astro)
docs/
  SYNTAX.md          Full DSL reference
  TUTORIAL.md        Step-by-step human tutorial
  AGENT.md           Guide for AI agents / LLMs
  ARCHITECTURE.md    Technical deep dive
```

### Scripts

| Command | Description |
|---|---|
| `pnpm build` | Build all packages and website |
| `pnpm test` | Run all tests (vitest) |
| `pnpm typecheck` | Type-check all packages |
| `pnpm clean` | Remove all `dist/` directories |
| `pnpm run release <version>` | Bump version, commit, tag, and push to trigger CI/CD |

### Deployment (Cloudflare)

The project is deployed via Cloudflare Pages (Workers Assets).
- **Project Name:** `markdy-com`
- **Build command:** `pnpm build`
- **Deploy command:** `cd website && npx wrangler deploy`
- **Path:** `/` (repo root)

---

## Documentation

| Document | Audience | Description |
|---|---|---|
| **[SYNTAX.md](docs/SYNTAX.md)** | All users | Complete DSL language reference |
| **[TUTORIAL.md](docs/TUTORIAL.md)** | Humans | Step-by-step guide from zero to animated scenes |
| **[AGENT.md](docs/AGENT.md)** | AI agents / LLMs | Structured prompt-ready reference for code generation |
| **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** | Contributors | Technical design, renderer internals, AST shape |
| **[CONTRIBUTING.md](CONTRIBUTING.md)** | Contributors | Dev setup, code style, PR guidelines |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

---

## License

[MIT](LICENSE) © [Hoang Yell](https://hoangyell.com)