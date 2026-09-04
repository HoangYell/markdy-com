# @markdy/astro

<p align="center">
  <a href="https://markdy.com/playground/"><img src="https://img.shields.io/badge/⚡_Live_Studio-markdy.com%2Fplayground-3b82f6?style=for-the-badge" alt="Live Studio" /></a>
  <a href="https://markdy.com/docs/"><img src="https://img.shields.io/badge/📖_Docs-Documentation-10b981?style=for-the-badge" alt="Documentation" /></a>
  <a href="https://markdy.com/examples/"><img src="https://img.shields.io/badge/🌟_Blueprints-30+_Examples-f59e0b?style=for-the-badge" alt="Examples" /></a>
</p>

[Astro](https://astro.build/) island component for [MarkdyScript](https://markdy.com/docs/) animated scenes. Embed interactive, zero-CLS architecture diagrams directly inside your Astro blogs, docs, and landing pages.

> 🚀 **Try it live**: Test MarkdyScript in the browser at **[markdy.com/playground](https://markdy.com/playground/)**  
> 📚 **Documentation**: Complete syntax guide and examples at **[markdy.com/docs](https://markdy.com/docs/)**

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
  <a href="https://markdy.com/playground/">
    <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/markdy-framework-integrations.webp" alt="Markdy Astro Integration" width="900" />
  </a>
</p>
<p align="center">
  <a href="https://markdy.com/playground/">
    <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/scene-ecommerce-swimlanes.webp" alt="Markdy Rendered Swimlane Scene in Astro" width="900" />
  </a>
</p>

## Usage

```astro
---
import { Markdy } from "@markdy/astro";

const code = `
scene "Cache-Aside Architecture" theme=paper width=800 height=400
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
`;
---

<Markdy code={code} width={800} height={400} bg="#fafafa" autoplay controls />
```

### In MDX

```mdx
import { Markdy } from "@markdy/astro";

export const code = `
scene "Cache-Aside Architecture" theme=paper width=800 height=400
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
`;

<Markdy code={code} width={800} height={400} bg="#fafafa" autoplay controls />
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

## Ecosystem & Documentation

- ⚡ **[Interactive Studio / Playground](https://markdy.com/playground/)** — edit MarkdyScript with instant live preview in your browser
- 📖 **[Syntax Guide & Reference](https://markdy.com/docs/)** — complete language specification and keywords
- 🌟 **[Canonical Blueprints](https://markdy.com/examples/)** — production-grade distributed system and cloud architectures
- 📦 **[GitHub Repository](https://github.com/HoangYell/markdy-com)** — source code, benchmarks, and issue tracker

## License

[MIT](https://github.com/HoangYell/markdy-com/blob/main/LICENSE)
