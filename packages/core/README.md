# @markdy/core

The parser and AST types for [MarkdyScript](../../docs/SYNTAX.md) — a DSL for describing 2D animated scenes.

## Features

- **Zero runtime dependencies** — pure TypeScript, no DOM or platform APIs
- **Single-pass parser** — line-by-line state machine with strict `ParseError` diagnostics
- **Rich type system** — `var`, `def`, `seq` expanded at parse time for composable scene authoring
- **Isomorphic** — runs in Node.js, Deno, Bun, edge runtimes, and the browser

## Installation

```sh
pnpm add @markdy/core
```

## Visual guide

<p align="center">
  <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/markdy-core-renderer-map.webp" alt="Markdy core and renderer package map" width="900" />
</p>

## Love Story result

<p align="center">
  <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/markdy-love-story-result.webp" alt="Love Story main Markdy result" width="900" />
</p>

## Usage

```typescript
import { parse, ParseError } from "@markdy/core";
import type { SceneAST } from "@markdy/core";

const source = `
  scene width=600 height=300 bg=white
  actor label = text("Hello") at (50, 130) size 40 opacity 0
  @0.3: label.fade_in(dur=0.6)
`;

try {
  const ast: SceneAST = parse(source);

  console.log(ast.meta);     // { width: 600, height: 300, fps: 30, bg: "white", duration: 0.9 }
  console.log(ast.actors);   // { label: { type: "text", args: ["Hello"], x: 50, y: 130, ... } }
  console.log(ast.events);   // [{ time: 0.3, actor: "label", action: "fade_in", ... }]
} catch (e) {
  if (e instanceof ParseError) {
    console.error(`Line ${e.line}: ${e.message}`);
  }
}
```

## Exports

| Export | Type | Description |
|---|---|---|
| `parse` | `(source: string) => SceneAST` | Parse MarkdyScript source into an AST |
| `ParseError` | class | Error with `.line` number for diagnostics |
| `SceneAST` | type | Complete scene representation |
| `SceneMeta` | type | Scene configuration (width, height, bg, etc.) |
| `AssetDef` | type | Asset declaration (image or icon) |
| `ActorDef` | type | Actor declaration (type, position, modifiers) |
| `TimelineEvent` | type | Timeline event (time, actor, action, params) |
| `TemplateDef` | type | User-defined actor template |
| `SequenceDef` | type | User-defined animation sequence |

## Documentation

- **[Syntax Reference](../../docs/SYNTAX.md)** — complete DSL language spec
- **[Tutorial](../../docs/TUTORIAL.md)** — step-by-step guide
- **[Agent Guide](../../docs/AGENT.md)** — structured reference for AI/LLM code generation
- **[Architecture](../../docs/ARCHITECTURE.md)** — parser internals and design decisions

## License

[MIT](../../LICENSE)
