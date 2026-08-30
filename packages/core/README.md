# @markdy/core

The parser and AST types for [MarkdyScript](../../docs/SYNTAX.md) — a diagram-native DSL for animated architecture diagrams that AI agents can generate reliably.

## Features

- **Zero runtime dependencies** — pure TypeScript, no DOM or platform APIs (~14 KB minzipped)
- **Single-pass parser** — line-by-line state machine with strict `ParseError` line-number diagnostics
- **17 Specialized Layout Engines** — `architecture`, `flowchart`, `tree`, `sequence`, `state`, `layers`, `nested`, `swimlane`, `timeline`, `gantt`, `medallion`, `flywheel`, `constellation`, `quadrant`, `pyramid`, `radar`, `venn`
- **10 Semantic Themes** — `paper`, `editorial`, `midnight`, `blueprint`, `graphite`, `nebula`, `terminal`, `sketchy`, `ink`, `doodle`
- **Content-Adaptive Canvas Sizing** — automatically calculates optimal aspect ratio and bounds based on diagram items and topology
- **Well-Architected Governance & AST Diffing** — layer boundaries, deadlock cycle detection, gateway isolation, and semantic AST evolution
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
  <a href="https://markdy.com/playground/">
    <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/scene-url-shortener.webp" alt="Markdy Core Parser Architecture Preview" width="900" />
  </a>
</p>
<p align="center">
  <a href="https://markdy.com/playground/">
    <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/scene-concurrency-decision-flowchart.webp" alt="Markdy Concurrency Flowchart Preview" width="900" />
  </a>
</p>

## Usage

```typescript
import { parse, ParseError } from "@markdy/core";
import type { DiagramAST } from "@markdy/core";

const source = `
scene "Cache-Aside Architecture" theme=paper
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

try {
  const ast: DiagramAST = parse(source);

  console.log(ast.meta);   // { width: 1280, height: 720, fps: 60, theme: "paper", direction: "LR", title: "Cache-Aside Architecture" }
  console.log(ast.nodes);  // { Client: { kind: "browser", ... }, Gateway: { ... } }
  console.log(ast.beats);  // [{ name: "hit", cues: [...] }]
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
| `compilePlan` | `(ast, theme) => RenderPlan` | Compile AST against a resolved theme token set |
| `computeAdaptiveDimensions` | `(ast, edges?) => { width, height }` | Compute content-adaptive canvas dimensions from topology & items |
| `parseAndCompile` | `(source) => { ast, plan }` | Parse and compile in one call |
| `ParseError` | class | Error with `.line` number for diagnostics |
| `DiagramAST` | type | Parsed scene: meta, nodes, edges, groups, patterns, beats |
| `RenderPlan` | type | Positioned nodes, routed edges, group zones, sequence messages, timed cues, beat ranges |
| `SceneMeta` | type | Scene configuration; `meta.player` is authoritative, with deprecated flat mirrors retained for compatibility |
| `PlayerConfig` / `resolvePlayer` | type / function | Grouped playback, controls, interaction, and chrome configuration with host resolution |
| `generateThemeFromBrand` | `(hexColor, name?) => { light, dark }` | Generate WCAG-compliant light and dark theme palettes from any brand hex color |
| `validateArchitectureRules` | `(ast) => Diagnostic[]` | Run Well-Architected rules: cycle detection, layer boundaries, and gateway checks |
| `diffAST` | `(astA, astB) => ASTDiffResult` | Compare architecture versions, calculate diff metrics, and generate migration scenes |
| `compressUrlState` / `decompressUrlState` | `(code, opts?) => string` | Zero-dependency URL hash state encoder for shareable playground links |
| `THEMES` / `resolveTheme` | tokens / function | 10 Semantic theme palettes (`paper`, `editorial`, `nebula`, `midnight`, `blueprint`, `graphite`, `terminal`, `sketchy`, `ink`, `doodle`) |

## Documentation

- **[Syntax Reference](../../docs/SYNTAX.md)** — complete DSL language spec
- **[Tutorial](../../docs/TUTORIAL.md)** — step-by-step guide
- **[Agent Guide](https://markdy.com/agent/)** — structured reference for AI/LLM code generation
- **[Architecture](../../docs/ARCHITECTURE.md)** — parser internals and design decisions

## License

[MIT](../../LICENSE)
