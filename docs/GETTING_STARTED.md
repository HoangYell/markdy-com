# Getting Started with Markdy

Markdy is an open-source text-to-animation DSL for animated diagrams, architecture visualization, docs-as-code workflows, and AI-generated technical explainers.

Use this guide when you want to answer: "How do I turn a text description into an animated developer diagram?"

## 1. Install the core packages

```sh
npm i @markdy/core @markdy/renderer-dom
```

The full architecture node vocabulary ships inside `@markdy/core`, so no registration step is needed. `@markdy/stdlib-systems` is an optional re-export/manifest of that vocabulary for tooling.

## 2. Render a scene in the browser

```ts
import { createPlayer } from "@markdy/renderer-dom";

createPlayer({
  container: document.getElementById("scene")!,
  code: `
scene "Request" theme=midnight
layout LR

browser Browser
service API
database Postgres "Postgres"

beat main:
  show $nodes stagger=80ms
  Browser -> API "GET /users" -> Postgres "query"
  Browser <- API "200 OK"
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
| Architecture node vocabulary manifest | `@markdy/stdlib-systems` (optional) |

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

> Use the Markdy agent guide. Create a 1280x720 animated architecture diagram for a URL shortener. Include short-link creation, redirect resolution, Redis cache lookup, database fallback, beats, labeled flow edges (`->`, `<-`, `~>`), and a final `glow` on the hot path.

