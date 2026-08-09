# @markdy/core

The parser and AST types for [MarkdyScript](../../docs/SYNTAX.md) — a diagram-native DSL for animated architecture diagrams that AI agents can generate reliably.

## Features

- **Zero runtime dependencies** — pure TypeScript, no DOM or platform APIs
- **Single-pass parser** — line-by-line state machine with strict `ParseError` diagnostics
- **Diagram-native grammar** — scene metadata, architecture nodes, groups, styles, beats, flow chains, and reusable patterns
- **Isomorphic** — runs in Node.js, Deno, Bun, edge runtimes, and the browser

## Installation

```sh
pnpm add @markdy/core
```

## Package position (text)

```text
@markdy/core
  -> parser + AST types (no DOM, no runtime deps)
  -> foundation for renderer, CLI, language server, and integrations
```

## Output preview

<p align="center">
  <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/markdy-output-preview.webp" alt="Markdy output preview" width="900" />
</p>

## Usage

```typescript
import { parse, ParseError } from "@markdy/core";
import type { DiagramAST } from "@markdy/core";

const source = `
  scene "Request" theme=paper
  browser Web
  service API
  beat main:
    show $nodes
    Web -> API "GET /users"
`;

try {
  const ast: DiagramAST = parse(source);

  console.log(ast.meta);   // { width: 1280, height: 720, fps: 60, theme: "paper", direction: "LR", title: "Request" }
  console.log(ast.nodes);  // { Web: { kind: "browser", ... }, API: { kind: "service", ... } }
  console.log(ast.beats);  // [{ name: "main", cues: [...] }]
} catch (e) {
  if (e instanceof ParseError) {
    console.error(`Line ${e.line}: ${e.message}`);
  }
}
```

## Exports

| Export | Type | Description |
|---|---|---|
| `parse` | `(source, opts?) => DiagramAST` | Parse MarkdyScript source into a diagram AST |
| `compile` | `(ast) => RenderPlan` | Lay out nodes, route edges, and schedule cues |
| `parseAndCompile` | `(source) => { ast, plan }` | Parse and compile in one call |
| `ParseError` | class | Error with `.line` number for diagnostics |
| `DiagramAST` | type | Parsed scene: meta, nodes, edges, groups, patterns, beats |
| `RenderPlan` | type | Positioned nodes, routed edges, timed cues, beat ranges |
| `SceneMeta` | type | Scene configuration (width, height, fps, theme, direction) |
| `NodeDecl` | type | Node declaration (kind, id, label, style) |
| `EdgeDecl` | type | Edge declaration (kind, from, to, label) |
| `BeatDecl` | type | Named beat with cues |
| `THEMES` / `resolveTheme` | tokens | Semantic theme palettes (`paper`, `midnight`, `blueprint`, `graphite`) |

## Documentation

- **[Syntax Reference](../../docs/SYNTAX.md)** — complete DSL language spec
- **[Tutorial](../../docs/TUTORIAL.md)** — step-by-step guide
- **[Agent Guide](https://markdy.com/agent/)** — structured reference for AI/LLM code generation
- **[Architecture](../../docs/ARCHITECTURE.md)** — parser internals and design decisions

## License

[MIT](../../LICENSE)
