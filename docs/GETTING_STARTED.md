# Getting Started with Markdy

Markdy is an open-source text-to-animation DSL for animated diagrams, architecture visualization, docs-as-code workflows, and AI-generated technical explainers.

Use this guide when you want to answer: "How do I turn a text description into an animated developer diagram?"

## 1. Install the core packages

```sh
npm i @markdy/core @markdy/renderer-dom
```

For architecture diagrams, also install the systems pack:

```sh
npm i @markdy/stdlib-systems
```

## 2. Render a scene in the browser

```ts
import { registerActorPack } from "@markdy/core";
import { createPlayer } from "@markdy/renderer-dom";
import { systemsPack } from "@markdy/stdlib-systems";

registerActorPack(systemsPack);

createPlayer({
  container: document.getElementById("scene")!,
  code: `
scene width=900 height=480 bg=#0f172a fps=60
client Browser "Browser" at (100, 240) opacity 0
service API "API" at (360, 240) opacity 0
database Postgres "Postgres" at (620, 240) opacity 0
@0.0: Browser.fade_in(dur=0.3)
@0.1: API.fade_in(dur=0.3)
@0.2: Postgres.fade_in(dur=0.3)
@0.6: Browser.request(to=API, label="GET /users", dur=0.6)
@1.4: API.request(to=Postgres, label="query", dur=0.5)
@2.1: Postgres.response(to=API, label="rows", dur=0.5)
@2.8: API.response(to=Browser, label="200 OK", dur=0.6)
`,
});
```

## 3. Pick the right integration

| Goal | Use |
|---|---|
| Render in a web app | `@markdy/core` + `@markdy/renderer-dom` |
| Embed in Astro docs | `@markdy/astro` |
| Write fenced code blocks in MDX | `@markdy/mdx` |
| Lint, format, render, or preview files | `@markdy/cli` |
| Autocomplete and diagnostics in editors | `@markdy/language-server` |
| Architecture nodes and flow edges | `@markdy/stdlib-systems` |

## 4. Use examples as templates

Start from `examples/showcase/` when building architecture visualization:

- URL shortener architecture
- Twitter timeline service
- YouTube processing pipeline
- OAuth / OIDC login flow
- Kubernetes cluster architecture

Start from top-level `examples/*.markdy` when learning one syntax feature at a time.

## 5. Validate scenes before publishing

```sh
pnpm run verify:examples
markdy lint path/to/scene.markdy
markdy render path/to/scene.markdy --out preview.html
```

## 6. Prompt an AI coding agent

Use `docs/AGENT.md` as the full grammar reference and ask for MarkdyScript directly.

Example prompt:

> Use the Markdy agent guide. Create a 1280x720 animated architecture diagram for a URL shortener. Include short-link creation, redirect resolution, Redis cache lookup, database fallback, chapters, labeled request/response edges, and a final camera focus on the hot path.

