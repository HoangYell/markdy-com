# @markdy/core

The parser, routing engine, and AST types for [MarkdyScript](../../docs/SYNTAX.md) — a diagram-native DSL for animated architecture diagrams that AI agents can generate reliably.

## Features

- **Zero runtime dependencies** — pure TypeScript, no DOM or platform APIs (~14 KB minzipped)
- **Single-pass parser** — line-by-line state machine with strict `ParseError` line-number diagnostics
- **Dynamic Port Multiplexer & Smooth Router** — obstacle-aware orthogonal Manhattan routing with balanced multi-lane fan-in/fan-out and smooth fillet curves
- **Code Provenance & Git In-Tree Grounding** — anchor architecture nodes directly to source files (`@src="path/file.ts#L10-L40"`) with automated path traversal security and bounds validation
- **Architectural Evolution & Git-Diff Matrix** — deep structural and visual comparison of architecture states with auto-generated animated migration storyboards
- **Native Vector Symbol Registry** — zero-dependency vector SVG icons for 20+ top cloud, database, runtime, and messaging technologies
- **17 Specialized Layout Engines** — `architecture`, `flowchart`, `tree`, `sequence`, `state`, `layers`, `nested`, `swimlane`, `timeline`, `gantt`, `medallion`, `flywheel`, `constellation`, `quadrant`, `pyramid`, `radar`, `venn`
- **10 Semantic Themes** — `paper`, `editorial`, `midnight`, `blueprint`, `graphite`, `nebula`, `terminal`, `sketchy`, `ink`, `doodle`
- **Content-Adaptive Canvas Sizing** — automatically calculates optimal aspect ratio and bounds based on diagram items and topology
- **Well-Architected Governance & AST Diffing** — layer boundaries, deadlock cycle detection, gateway isolation, and semantic AST evolution
- **Isomorphic** — runs in Node.js, Deno, Bun, edge runtimes, and the browser

## Installation

```sh
pnpm add @markdy/core
```

## Package Position

```text
@markdy/core
  -> parser + AST types (no DOM, no runtime deps)
  -> dynamic port multiplexer & orthogonal router
  -> code provenance & git verification
  -> architectural evolution & diff matrix
  -> native vector symbol registry
  -> foundation for renderer, CLI, language server, and integrations
```

## Usage

```typescript
import { parse, ParseError, diffDiagramASTs, resolveVectorSymbol } from "@markdy/core";
import type { DiagramAST } from "@markdy/core";

const source = `
scene "Cache-Aside Architecture" theme=paper
layout LR

browser Client "Web Client"
gateway Gateway "API Gateway"
service Shortener "URL Service" @src="src/url/service.ts#L15-L80"
cache Redis "Redis Cluster" icon=redis
database Postgres "PostgreSQL 16" icon=postgresql

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
  console.log(ast.nodes);  // { Client: { kind: "browser", ... }, Shortener: { ... } }
  console.log(ast.beats);  // [{ name: "hit", cues: [...] }]
} catch (e) {
  if (e instanceof ParseError) {
    console.error(`Line ${e.line}: ${e.message}`);
  }
}
```

## Key API Exports

| Export | Type | Description |
|---|---|---|
| `parse` | `(source, opts?) => DiagramAST` | Parse MarkdyScript source into a diagram AST |
| `compile` | `(ast) => RenderPlan` | Lay out nodes, route edges, and schedule cues |
| `routeOrthogonalEdge` | `(src, tgt, opts?) => RoutedPath` | Compute collision-aware orthogonal waypoints with smooth fillet curves |
| `allocatePortLanes` | `(edges, boxes) => Map` | Dynamic port multiplexer distributing multi-edge lanes along node perimeters |
| `parseCodeAnchor` / `extractDiagramCodeAnchors` | `functions` | Parse and extract `@src` code provenance anchors from diagram nodes |
| `verifyCodeAnchorsWithReader` | `(anchors, reader) => Report` | Verify code anchors against local repository files and line counts |
| `diffDiagramASTs` | `(astA, astB) => DiffResult` | Compare architecture versions and generate executable migration storyboards |
| `resolveVectorSymbol` / `renderSymbolSvg` | `functions` | Zero-dependency vector SVG icon registry (AWS, K8s, Redis, Postgres, Kafka...) |
| `generateThemeFromBrand` | `(hexColor, name?) => { light, dark }` | Generate WCAG-compliant light and dark theme palettes from any brand hex color |
| `compressMarkdyToUrlHash` / `decompress` | `functions` | Lossless URL hash state encoder for shareable playground links |
| `THEMES` / `resolveTheme` | tokens / function | 10 Semantic theme palettes |

## Documentation

- **[Syntax Reference](../../docs/SYNTAX.md)** — complete DSL language spec
- **[Tutorial](../../docs/TUTORIAL.md)** — step-by-step guide
- **[Agent Guide](https://markdy.com/agent/)** — structured reference for AI/LLM code generation
- **[Architecture](../../docs/ARCHITECTURE.md)** — parser internals and design decisions

## License

[MIT](../../LICENSE)
