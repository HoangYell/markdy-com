# @markdy/astro

[Astro](https://astro.build/) island component for [MarkdyScript](../../docs/SYNTAX.md) animated scenes.

## Features

- **SSR placeholder** — correctly-sized `<div>` prevents layout shift before hydration
- **Viewport-triggered hydration** — `IntersectionObserver` with 100px root margin
- **View Transition compatible** — re-observes elements on `astro:page-load`
- **Zero config** — pass your MarkdyScript code as a prop

## Installation

```sh
pnpm add @markdy/astro
```

## Usage

```astro
---
import { Markdy } from "@markdy/astro";

const code = `
  scene width=800 height=400 bg=#fff5f9
  actor hero = figure(#c68642, m, 😎) at (400, 200)
  @0.0: hero.enter(from=left, dur=0.8)
  @1.5: hero.say("Hello!", dur=1.2)
`;
---

<Markdy code={code} width={800} height={400} bg="#fff5f9" autoplay />
```

### In MDX

```mdx
import { Markdy } from "@markdy/astro";

export const code = `
  scene width=600 height=300 bg=white
  actor label = text("Hello") at (200, 130) size 40 opacity 0
  @0.3: label.fade_in(dur=0.6)
`;

<Markdy code={code} width={600} height={300} autoplay />
```

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `code` | `string` | *(required)* | MarkdyScript source code |
| `width` | `number` | `800` | Placeholder width in pixels |
| `height` | `number` | `400` | Placeholder height in pixels |
| `bg` | `string` | `"white"` | Placeholder background colour |
| `assets` | `Record<string, string>` | `{}` | Asset URL overrides |
| `autoplay` | `boolean` | `true` | Start playing on hydration |
| `class` | `string` | — | CSS class for the outer wrapper |

> **Tip:** Match `width`, `height`, and `bg` props to your `scene` declaration values to avoid a visual flash on hydration.

## How It Works

1. **Server:** renders a sized placeholder `<div>` with a `▶ markdy` label
2. **Client:** an `IntersectionObserver` watches all `.markdy-root` elements
3. **On viewport entry:** the observer fires, clears the placeholder, and calls `createPlayer()` from `@markdy/renderer-dom`
4. **View Transitions:** listens for `astro:page-load` to re-observe newly added elements

## Documentation

- **[Tutorial](../../docs/TUTORIAL.md)** — step-by-step guide from zero to animated scenes
- **[Syntax Reference](../../docs/SYNTAX.md)** — complete DSL language spec

## License

[MIT](../../LICENSE)
