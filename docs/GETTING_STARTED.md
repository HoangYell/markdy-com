# Getting Started with Markdy

Markdy is an open-source text-to-animation DSL for animated diagrams, architecture visualization, docs-as-code workflows, and AI-generated technical explainers.

Use this guide when you want to answer: "How do I turn a text description into an animated developer diagram?"

## 1. Write a scene file

Create `architecture.markdy`:

```markdy
scene "Request" theme=paper
layout LR

browser WebApp
service ApiServer
database Postgres

beat main:
  show $nodes stagger=80ms
  WebApp -> ApiServer "GET /users" -> Postgres "query"
  WebApp <- ApiServer "200 OK"
```

Node labels are optional. IDs like `ApiServer` and `OrdersDb` render as readable labels such as `API Server` and `Orders DB`.

## 2. Preview and validate it

For a quick visual pass, open the homepage playground and start from one of the shipped architecture examples. It uses the same `.markdy` files from `examples/showcase/`, shows syntax-highlighted MarkdyScript, and links back to each source file.

```sh
npm i -D @markdy/cli
npx markdy lint architecture.markdy
npx markdy render architecture.markdy --out architecture.html
```

The full architecture node vocabulary ships inside Markdy, so no registration step is needed. `@markdy/stdlib-systems` is an optional re-export/manifest of that vocabulary for tooling.

## 3. Pick the right integration

Use the scene file directly when you can. Reach for package APIs only when you need to embed or automate it.

| Goal | Use |
|---|---|
| Preview, lint, format, or render files | `@markdy/cli` |
| Embed in Astro docs | `@markdy/astro` |
| Write fenced code blocks in MDX | `@markdy/mdx` |
| Build a custom browser embed | `@markdy/renderer-dom` |
| Parse or inspect scenes in tooling | `@markdy/core` |
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

The docs showcase uses compact pattern labels (`cache-aside`, `fan-out`, `pipeline`, `auth-flow`, `platform`, `ci-cd`) so you can pick examples by architecture shape instead of reading long descriptions.

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

