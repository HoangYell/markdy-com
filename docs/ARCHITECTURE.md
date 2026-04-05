# Architecture

Technical deep dive into Markdy's design, data flow, and renderer internals.

---

## Design Principles

1. **Separation of concerns** — parsing and rendering are independent packages with a clean AST boundary
2. **Zero runtime dependencies** — `@markdy/core` has no deps; `@markdy/renderer-dom` depends only on `@markdy/core`
3. **Browser-native** — Web Animations API (WAAPI) for animation; no Canvas, no GSAP, no React
4. **Deterministic playback** — manual `currentTime` control ensures identical rendering across browsers
5. **Language-first extensibility** — `var`, `def`, `seq` compile down to primitives at parse time; no runtime plugin system needed

---

## Data Flow

```
  MarkdyScript source (string)
        │
        ▼
  ┌─────────────────────────────────────────────┐
  │              @markdy/core                    │
  │                                              │
  │  parse(source) ─────────► SceneAST           │
  │                                              │
  │  • Line-by-line single-pass parser           │
  │  • var/def/seq expanded at parse time        │
  │  • Strict validation with ParseError(line)   │
  │  • Pure function, no side effects            │
  └───────────────────┬─────────────────────────┘
                      │ SceneAST
                      ▼
  ┌─────────────────────────────────────────────┐
  │          @markdy/renderer-dom                │
  │                                              │
  │  createPlayer(opts) ──────► Player           │
  │                                              │
  │  1. Creates scene <div> (root element)       │
  │  2. Creates actor elements (DOM nodes)       │
  │  3. Builds WAAPI Animations from events      │
  │  4. Runs rAF loop to drive currentTime       │
  └───────────────────┬─────────────────────────┘
                      │ Player { play, pause, seek, destroy }
                      ▼
  ┌─────────────────────────────────────────────┐
  │            @markdy/astro                     │
  │                                              │
  │  <Markdy /> island component                 │
  │                                              │
  │  • SSR: sized placeholder <div>              │
  │  • Client: IntersectionObserver → hydrate    │
  │  • View Transition compatible                │
  └─────────────────────────────────────────────┘
```

---

## Package Details

### `@markdy/core`

**Zero runtime dependencies.** Runs in Node.js, Deno, Bun, edge runtimes, and the browser.

#### Parser Design

The parser is a **single-pass, line-by-line state machine**:

```
for each line in source:
  1. If inside a def/seq block → handle block-specific parsing
  2. Otherwise, match against statement patterns (var, scene, asset, actor, event)
  3. Throw ParseError(lineNumber) on any unrecognised input
```

**Key implementation details:**

- **`var` handling:** Parsed *before* comment stripping because values may contain `#` (hex colours)
- **Comment stripping:** Context-aware — `#` inside parentheses or double quotes is preserved (`stripComment()`)
- **`def` expansion:** Template args are substituted via `${param}` interpolation and resolved to a built-in actor type
- **`seq` expansion:** `play()` calls expand sequence events inline, converting relative `@+offset` to absolute `@time` values
- **Duration auto-computation:** When `scene duration=` is omitted, the parser scans all events and computes `max(event.time + event.dur)`

#### AST Shape

```typescript
interface SceneAST {
  meta: SceneMeta;                    // width, height, fps, bg, duration?
  assets: Record<string, AssetDef>;   // { type, value }
  actors: Record<string, ActorDef>;   // { type, args, x, y, scale?, ... }
  events: TimelineEvent[];            // [{ time, actor, action, params, line }]
  defs: Record<string, TemplateDef>;  // kept for tooling/inspection
  seqs: Record<string, SequenceDef>;  // kept for tooling/inspection
  vars: Record<string, string>;       // kept for tooling/inspection
}
```

`defs`, `seqs`, and `vars` are retained in the AST even though they've already been expanded. This supports future tooling (linters, formatters, editor extensions) that need access to the original source semantics.

---

### `@markdy/renderer-dom`

**Single dependency:** `@markdy/core`.

#### Module Structure

```
src/
  types.ts        — ActorState, FaceSwap, easing utilities
  figure.ts       — Stick-figure DOM factory (emoji body parts)
  actors.ts       — Actor element factory (sprite, text, figure, box)
  animations.ts   — Timeline event → WAAPI Animation builder
  player.ts       — Public API, rAF loop, face-swap engine
  index.ts        — Barrel exports (PlayerOptions, Player, createPlayer)
```

#### Playback Architecture

All WAAPI animations stay **permanently paused**. A `requestAnimationFrame` loop manually advances `sceneMs` and sets `anim.currentTime = sceneMs` on every animation each frame.

**Why not use WAAPI's native playback?**

Two browser-specific issues forced this design:

1. **`startTime` unreliability:** Setting `startTime` on a paused animation does not reliably change the play state to `"running"` across all browsers.

2. **`fill:"both"` cascade conflict:** With `fill:"both"`, later-created animations (e.g., `move`) win the WAAPI cascade during their *before-phase*, overriding earlier animations' (e.g., `enter`) backward fill. This caused actors to appear at their final positions immediately instead of starting off-screen.

**Solution:** `fill:"forwards"` only + pre-initialised inline styles. Each actor's before-phase falls through to the inline style set during setup, which gives correct initial positions and opacity values.

```
Frame loop:
  1. sceneMs += (now - lastTimestamp)
  2. for each animation: anim.currentTime = sceneMs
  3. Apply face swaps (last-swap-before-sceneMs wins per element)
  4. requestAnimationFrame(next frame)
```

#### Actor Element Creation

| Type | DOM Output |
|---|---|
| `sprite` (image) | `<img>` with `src` from asset def or override |
| `sprite` (icon) | `<span data-icon="set:name">` |
| `text` | `<div>` with `textContent` |
| `box` | `<div>` with fixed 100×100 dimensions |
| `figure` | Flexbox column: face → neck → shirt row (with arms) → legs row |

#### Figure DOM Structure

```
<div>  (flex column, 80px wide)
  ├── <span data-fig-face data-fig-head>  emoji face (40px)
  ├── <div>  neck (8px skin-coloured bridge)
  ├── <div>  shirt row (relative positioned)
  │     ├── <span data-fig-body>  torso emoji (👕/👗)
  │     ├── <div data-fig-arm-l>  left arm
  │     │     ├── <div>  skin-coloured stick
  │     │     └── <span>  hand emoji (🤜/💅)
  │     └── <div data-fig-arm-r>  right arm
  │           ├── <div>  skin-coloured stick
  │           └── <span>  hand emoji
  └── <div>  legs row (flex, centered, 10px gap)
        ├── <div data-fig-leg-l>  left leg
        │     ├── <div>  ink stick
        │     └── <span>  shoe emoji (👟/👠)
        └── <div data-fig-leg-r>  right leg
              ├── <div>  ink stick
              └── <span>  shoe emoji
```

Arms pivot at the shoulder (left arm: `transform-origin: right center`; right arm: `transform-origin: left center`). Legs pivot at the hip (`transform-origin: top center`).

#### Face-Swap Engine

Face changes (`face("😡")`) are **not** WAAPI animations — they're instant `textContent` swaps. To make them **seek-safe** (work correctly when scrubbing backward), they're stored in a `FaceSwap[]` array:

```typescript
interface FaceSwap { timeMs: number; el: HTMLElement; emoji: string; }
```

Each frame, the rAF loop scans all swaps and applies the last one whose `timeMs <= sceneMs` for each face element. Initial face text is stored in `data-fig-face-initial` for seek-back restoration.

#### Animation Pre-Initialisation

Before building animations, the renderer pre-processes inline styles:

- Actors whose **first action is `enter`** → inline transform set to off-screen position
- Actors whose **first action is `fade_in`** and declared `opacity > 0` → inline `opacity: 0`

This ensures correct visual state at `t=0` without needing `fill:"both"`.

---

### `@markdy/astro`

#### Hydration Strategy

```
Server → SSR placeholder <div> (correct size + bg colour)
           ↓ (browser)
IntersectionObserver (rootMargin: 100px) watches .markdy-root
           ↓ (element enters viewport)
observer.unobserve(el) → hydrate(el)
           ↓
createPlayer({ container: el, code, assets, autoplay })
```

- `data-markdy-code` — MarkdyScript source stored on the DOM element
- `data-markdy-assets` — JSON-serialised asset overrides
- `data-markdy-init` — prevents double-registration
- **View Transitions:** Listens for `astro:page-load` to re-observe new elements

---

## Build System

- **Bundler:** tsup (esbuild-based) producing ESM + `.d.ts`
- **Test runner:** vitest (48 parser tests)
- **Type checking:** TypeScript strict mode, `tsc --noEmit`
- **Monorepo:** pnpm workspaces
- **CI:** GitHub Actions matrix on Node 18 / 20 / 22

### Build Order

```
@markdy/core  →  @markdy/renderer-dom  →  @markdy/astro  →  astro-demo
```

`@markdy/core` must build first — `@markdy/renderer-dom` imports from it.

---

## Extension Points

To add a new **action** (e.g., `bounce`):

1. Add a `case "bounce":` branch in [animations.ts](../packages/renderer-dom/src/animations.ts)
2. Construct WAAPI keyframes and push to `anims[]`
3. Update actor state (`s.x`, `s.y`, etc.) if the action has lasting effects
4. Add parser tests in [packages/core/tests/parser.test.ts](../packages/core/tests/parser.test.ts) — the parser doesn't know about specific action names, so no parser changes needed
5. Document in [SYNTAX.md](SYNTAX.md), [TUTORIAL.md](TUTORIAL.md), [AGENT.md](AGENT.md)

To add a new **actor type** (e.g., `svg`):

1. Add a `case "svg":` branch in [actors.ts](../packages/renderer-dom/src/actors.ts)
2. Add the type string to `BUILTIN_ACTOR_TYPES` in the parser
3. Add the type to the `ActorDef["type"]` union in [ast.ts](../packages/core/src/ast.ts)
4. Document everywhere
