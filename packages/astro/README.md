# @markdy/astro

[Astro](https://astro.build/) island component for [MarkdyScript](../../docs/SYNTAX.md) animated scenes.

## Features

- **SSR placeholder** — correctly-sized `<div>` prevents layout shift before hydration
- **Viewport-triggered hydration** — `IntersectionObserver` with 100px root margin
- **View Transition compatible** — re-observes elements on `astro:page-load`
- **Semantic node cards** — inherits renderer SVG glyphs for technical node kinds
- **Zero config** — pass your MarkdyScript code as a prop
- **Indent-safe transport** — encodes MarkdyScript as base64 on the DOM so HTML attribute normalization cannot destroy colon-body indentation before hydration

## Installation

```sh
pnpm add @markdy/astro
```

## Package position (text)

```text
@markdy/core -> @markdy/renderer-dom -> @markdy/astro

Astro integration provides an island wrapper for lazy client-side hydration.
```

## Output preview

<p align="center">
  <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/markdy-framework-integrations.webp" alt="Markdy Astro Integration" width="900" />
</p>
<p align="center">
  <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/scene-url-shortener.webp" alt="Markdy Rendered Scene in Astro" width="900" />
</p>

## Usage

```astro
---
import { Markdy } from "@markdy/astro";

const code = `
  scene theme=paper width=800 height=400
  browser Web
  service API
  beat main:
    show $nodes
    Web -> API "GET /users"
`;
---

<Markdy code={code} width={800} height={400} bg="#07111f" autoplay controls />
```

### In MDX

```mdx
import { Markdy } from "@markdy/astro";

export const code = `
  scene theme=paper width=600 height=300
  browser Web
  service API
  beat main:
    show $nodes
    Web -> API "GET /users"
`;

<Markdy code={code} width={600} height={300} bg="#07111f" autoplay controls />
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `code` | `string` | *(required)* | MarkdyScript source code |
| `width` | `number` | `800` | Placeholder width in pixels |
| `height` | `number` | `400` | Placeholder height in pixels |
| `bg` | `string` | `"white"` | Placeholder background colour |
| `assets` | `Record<string, string>` | `{}` | Asset URL overrides |
| `autoplay` | `boolean` | `plan.meta.autoplay ?? true` | Start playing on hydration |
| `loop` | `boolean` | `plan.meta.loop ?? true` | Loop the animation when it ends |
| `copyright` | `boolean` | `plan.meta.copyright ?? true` | Show a "Powered by Markdy" badge below the animation |
| `progressBar` | `boolean \| string` | `true` | Deprecated compatibility flag for the scene-boundary progress bar |
| `sceneBoundaryProgress` | `boolean \| string` | `true` | Show boundary progress bar, or pass a custom color/gradient string |
| `progressColor` | `string` | `plan.meta.progressColor ?? "rainbow"` | Custom progress bar color (e.g. `"#3b82f6"`) or gradient (e.g. `"#ec4899, #8b5cf6"`) |
| `playbackRate` | `number` | `plan.meta.playbackRate ?? 1` | Normalized timeline speed multiplier; `1` is Markdy's normal pace |
| `interactiveViewport` | `boolean` | `controls \|\| plan.meta.interactiveViewport` | Enable wheel zoom and drag pan after hydration |
| `controls` | `boolean` | `plan.meta.controls ?? false` | Show left-aligned footer controls toolbar (play/pause, restart, speed, reset view); also enables viewport interaction |
| `class` | `string` | — | CSS class for the outer wrapper |

> **Self-Contained MarkdyScript:** You can declare `controls true`, `interactive true`, `progressColor "#3b82f6"`, `loop false`, etc. directly inside the `.markdy` code so you only need `<Markdy code={code} />`. Explicit props passed to `<Markdy />` will override in-script directives.
>
> **Tip:** Match `width`, `height`, and `bg` props to your `scene` declaration values to avoid a visual flash on hydration.

## How It Works

1. **Server:** renders a sized placeholder `<div>` with a `▶ markdy` label
2. **Client:** an `IntersectionObserver` watches all `.markdy-root` elements
3. **On viewport entry:** the observer fires, clears the placeholder, and calls `createDiagram()` from `@markdy/renderer-dom`
4. **View Transitions:** listens for `astro:page-load` to re-observe newly added elements

## Documentation

- **[Tutorial](../../docs/TUTORIAL.md)** — step-by-step guide from zero to animated scenes
- **[Syntax Reference](../../docs/SYNTAX.md)** — complete DSL language spec

## License

[MIT](../../LICENSE)
