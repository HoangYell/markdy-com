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
  <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/scene-ecommerce-swimlanes.webp" alt="Markdy Rendered Swimlane Scene in Astro" width="900" />
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
| `autoplay` | `boolean` | script or `true` | Override whether playback starts on hydration |
| `loop` | `boolean` | script or `true` | Override whether playback loops |
| `copyright` | `boolean` | script or `true` | Show the linked badge at the footer's right edge |
| `progressBar` | `boolean \| string` | `true` | Deprecated compatibility flag for the scene-boundary progress bar |
| `sceneBoundaryProgress` | `boolean \| string` | script | Override boundary progress or its color |
| `progressColor` | `string` | script or rainbow | Override the progress color or gradient |
| `playbackRate` | `number` | script or `1` | Override the initial timeline multiplier |
| `interactiveViewport` | `boolean` | script | `true` supplies default gestures; `false` suppresses script gestures |
| `controls` | `boolean` | script | `true` supplies legacy toolbar defaults; `false` suppresses script controls |
| `class` | `string` | — | CSS class for the outer wrapper |

> **Self-Contained MarkdyScript:** Prefer grouped `player:` settings inside the `.markdy` code so `<Markdy code={code} />` preserves scene behavior. Pass props only when the host intentionally gates or supplies defaults.
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
