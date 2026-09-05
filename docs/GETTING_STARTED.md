# Getting Started with Markdy

> ### DOCUMENTATION METADATA
> - **Status**: Active & Canonical
> - **Current Version**: v1.3.2
> - **Specification Version**: 1.3.x
> - **Last Updated**: 2026-09-05
> - **Documentation Hub**: <https://markdy.com/docs/>
> - **Quickstart Command**: `npm install -g @markdy/cli`

Markdy is an open-source, diagram-as-code DSL for animated architecture diagrams, system visualization, docs-as-code workflows, and AI-generated technical explainers. MarkdyScript is diagram-native: you declare semantic nodes, groups, beats, flows, and cues instead of drawing shapes by hand.

Use this guide when you want to answer: "How do I turn semantic nodes, groups, beats, and flows into an animated developer diagram?"

## 1. Write a scene file

Create `architecture.markdy`:

```markdy
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
```

<p align="center">
  <img src="images/scene-url-shortener.webp" alt="Markdy Rendered Architecture Scene" width="800" />
</p>

Node labels are optional. IDs like `ApiServer` and `OrdersDb` render as readable labels such as `API Server` and `Orders DB`.

## 2. Preview and validate it

### In Your Editor (VS Code / Cursor / Windsurf)

Install the official Markdy extension from the **[VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=hoangyell.markdy-vscode)** or **[Open VSX Registry](https://open-vsx.org/extension/hoangyell/markdy-vscode)**:

```sh
# For Visual Studio Code
code --install-extension hoangyell.markdy-vscode

# For Cursor
cursor --install-extension hoangyell.markdy-vscode
```

- **Live Animated Preview**: Press `Cmd+K V` (macOS) or `Ctrl+K V` (Windows/Linux) or click the Play icon in the editor title bar.
- **Language Intelligence**: Real-time syntax diagnostics, error squiggles, symbol navigation, autocompletions, and hover tooltips.
- **Direct Export**: Export clean vector `.svg` or high-resolution `.png` images directly from the preview toolbar.

### In the Web Playground or Terminal

For a quick visual pass in your browser, open the dedicated playground at <https://markdy.com/playground/>. It uses the same `.markdy` files from `examples/showcase/`, shows syntax-highlighted MarkdyScript, offers an adjustable editor/preview split, and links back to each source file.

<p align="center">
  <img src="images/markdy-split-editor.webp" alt="Markdy Playground Split Editor Preview" width="800" />
</p>

```sh
pnpm add -D @markdy/cli
pnpm markdy lint architecture.markdy
pnpm markdy render architecture.markdy --out architecture.html
```

The full architecture node vocabulary ships inside Markdy, so no registration step is needed. `@markdy/stdlib-systems` is an optional re-export/manifest of that vocabulary for tooling.

## 3. Pick the right integration

Use the scene file directly when you can. Reach for package APIs only when you need to embed or automate it.

| Goal | Use |
|---|---|
| Preview, lint, format, import, or diff files | `@markdy/cli` |
| Transpile Mermaid, Draw.io, Docker Compose, K8s, Terraform | `@markdy/compat` |
| AI Agent integration for Claude, Cursor, Antigravity | `@markdy/mcp-server` |
| Embed in Astro docs | `@markdy/astro` |
| Write fenced code blocks in MDX | `@markdy/mdx` |
| Build a custom browser embed or export SVG/GIF | `@markdy/renderer-dom` |
| Parse, diff, or audit architecture rules in tooling | `@markdy/core` |
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

Use <https://markdy.com/AGENT.md> as the full grammar reference, but prompt with your idea in normal product or architecture language. The AI should translate that idea into valid MarkdyScript.

<p align="center">
  <img src="images/markdy-ai-agent-workflow.webp" alt="Prompting AI Coding Agents for Markdy" width="800" />
</p>

Example prompt:

> Use the Markdy agent guide to write one complete MarkdyScript scene. I want to explain a URL shortener: first a user creates a short link, then someone opens the short link and gets redirected. Show the API, URL service, Redis cache, and database. Make the animation clear enough for a short engineering demo.
