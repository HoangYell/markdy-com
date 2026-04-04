# Markdy

An open-source animation DSL engine for blog posts. Write MarkdyScript, get an animated scene in the browser. Similar in spirit to Mermaid, but for motion.

- **Zero-dependency core.** `@markdy/core` is a pure TypeScript parser with no DOM or runtime deps.
- **Web-native renderer.** `@markdy/renderer-dom` uses the Web Animations API and CSS transforms -- no GSAP, no Canvas, no React.
- **Astro-ready.** `@markdy/astro` ships a `<Markdy />` island that hydrates on viewport entry (equivalent to `client:visible`).
- **Embeddable in Markdown/MDX.** Use a `\`\`\`markdy` code fence or import the component directly.
- **Deterministic and strict.** The parser provides line-number errors for every malformed statement.

---

## Repository layout

```
markdy/
  packages/
    core/            @markdy/core        -- AST types, parser, zero DOM deps
    renderer-dom/    @markdy/renderer-dom -- Web Animations API renderer
    astro/           @markdy/astro        -- <Markdy /> Astro island
  examples/
    astro-demo/      Runnable demo site
  docs/
    SYNTAX.md        Full DSL reference
  package.json       pnpm workspace root
  pnpm-workspace.yaml
  tsconfig.base.json
```

---

## Quick start

### Prerequisites

- Node.js 18+
- pnpm 8+

### Install

```sh
pnpm add @markdy/core @markdy/renderer-dom
```

For Astro projects:

```sh
pnpm add @markdy/astro
```

---

## Usage

### In plain HTML / vanilla JS

```html
<div id="scene"></div>
<script type="module">
  import { createPlayer } from "@markdy/renderer-dom";

  const code = `
scene width=600 height=300 bg=white

actor label = text("Hello") at (50,130) size 40 opacity 0

@0.3: label.fade_in(dur=0.6)
@1.2: label.move(to=(200,130), dur=0.8, ease=out)
  `.trim();

  const player = createPlayer({
    container: document.getElementById("scene"),
    code,
    autoplay: true,
  });
</script>
```

### In Astro / MDX

```astro
---
import { Markdy } from "@markdy/astro";

const CODE = `
scene width=800 height=400 bg=white

asset pepe = image("/memes/pepe.webp")
actor p = sprite(pepe) at (100,250) scale 0.4

@0.0: p.enter(from=left, dur=0.8)
`.trim();
---

<Markdy code={CODE} width={800} height={400} autoplay />
```

The `<Markdy />` component renders a sized SSR placeholder and hydrates once the element nears the viewport.

### `assets` override

Use the `assets` prop to map DSL asset names to runtime URLs (useful for CDN paths, data URIs, or test fixtures):

```astro
<Markdy
  code={CODE}
  assets={{ pepe: "https://cdn.example.com/pepe.webp" }}
  width={800}
  height={400}
/>
```

---

## Renderer API

```ts
import { createPlayer } from "@markdy/renderer-dom";

const player = createPlayer({
  container: document.getElementById("scene"), // HTMLElement to mount into
  code: "...",                                  // MarkdyScript source
  assets: { fire: "/icons/fire.svg" },         // optional URL overrides
  autoplay: false,                              // default: false
});

player.play();
player.pause();
player.seek(2.5);  // jump to 2.5 seconds
player.destroy();  // removes DOM nodes and cancels all animations
```

---

## Parser API

```ts
import { parse, ParseError } from "@markdy/core";
import type { SceneAST } from "@markdy/core";

try {
  const ast: SceneAST = parse(source);
  console.log(ast.meta, ast.actors, ast.events);
} catch (e) {
  if (e instanceof ParseError) {
    console.error(`Line ${e.line}: ${e.message}`);
  }
}
```

### `SceneAST` shape

```ts
type SceneAST = {
  meta: {
    width: number;
    height: number;
    fps: number;
    bg: string;
    duration?: number;   // auto-computed when not explicit
  };
  assets: Record<string, { type: "image" | "icon"; value: string }>;
  actors: Record<string, {
    type: "sprite" | "text" | "box";
    args: string[];
    x: number;
    y: number;
    scale?: number;
    rotate?: number;
    opacity?: number;
    size?: number;
  }>;
  events: Array<{
    time: number;
    actor: string;
    action: string;
    params: Record<string, unknown>;
    line: number;
  }>;
};
```

---

## DSL overview

Full reference: [docs/SYNTAX.md](docs/SYNTAX.md)

```markdy
scene width=800 height=400 fps=30 bg=white

asset pepe = image("/memes/pepe.webp")
asset cat  = image("/memes/cat.png")
asset fire = icon("lucide:flame")

actor p     = sprite(pepe) at (100,250) scale 0.4
actor c     = sprite(cat)  at (600,250) scale 0.4
actor title = text("Ship it") at (320,80) size 48

@0.0: p.enter(from=left, dur=0.8)
@1.0: p.say("bruh", dur=1.0)
@2.0: p.move(to=(300,250), dur=1.0, ease=inout)
@3.0: p.throw(fire, to=c, dur=0.8)
@4.0: c.shake(intensity=3, dur=0.5)
@4.6: c.fade_out(dur=0.4)
@5.2: title.fade_in(dur=0.5)
```

### Supported actions

| Action       | Description                                         |
|--------------|-----------------------------------------------------|
| `enter`      | Slide in from `left`, `right`, `top`, or `bottom`   |
| `move`       | Translate to `to=(x,y)`                             |
| `fade_in`    | Opacity 0 to 1                                      |
| `fade_out`   | Opacity to 0                                        |
| `scale`      | Animate scale to `to=<val>`                         |
| `rotate`     | Animate rotation to `to=<deg>`                      |
| `shake`      | Horizontal oscillation                              |
| `say`        | Speech bubble for `dur` seconds                     |
| `throw`      | Projectile from actor to target actor               |

Easing values: `linear` (default), `in`, `out`, `inout`.

---

## Running the demo

```sh
git clone https://github.com/your-org/markdy-com.git
cd markdy-com
pnpm install
pnpm --filter @markdy/core run build
pnpm --filter @markdy/renderer-dom run build
pnpm --filter astro-demo run dev
```

Open `http://localhost:4321`.

---

## Development

```sh
# Build all packages
pnpm build

# Run parser tests
pnpm test

# Watch mode for core
pnpm --filter @markdy/core exec vitest
```

---

## Packages

| Package                 | Version | Description                            |
|-------------------------|---------|----------------------------------------|
| `@markdy/core`          | 0.1.0   | AST types and parser                   |
| `@markdy/renderer-dom`  | 0.1.0   | Web Animations API renderer            |
| `@markdy/astro`         | 0.1.0   | Astro island integration               |

---

## License

MIT
