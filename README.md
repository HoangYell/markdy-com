<p align="center">
  <a href="https://markdy.com">
    <img src="docs/images/mascot/markdy-com.webp" width="340" alt="Markdy" />
  </a>
</p>

<h1 align="center">Markdy</h1>

<p align="center">
  <strong>Diagram-as-code DSL for animated architecture &amp; system design explainers.</strong><br>
  Write declarative MarkdyScript → render 60fps browser-native kinetic diagrams powered by the Web Animations API.
</p>

<p align="center">
  <a href="https://markdy.com/playground/"><b>⚡ Live Studio</b></a> &nbsp;•&nbsp;
  <a href="https://marketplace.visualstudio.com/items?itemName=hoangyell.markdy-vscode"><b>🔌 VS Code Extension</b></a> &nbsp;•&nbsp;
  <a href="https://markdy.com/docs/"><b>📖 Documentation</b></a> &nbsp;•&nbsp;
  <a href="https://markdy.com/examples/"><b>🌟 29+ Examples</b></a> &nbsp;•&nbsp;
  <a href="https://markdy.com/agent/"><b>🤖 AI &amp; Agent Guide</b></a>
</p>

<p align="center">
  <a href="https://github.com/HoangYell/markdy-com/actions/workflows/ci.yml"><img src="https://github.com/HoangYell/markdy-com/actions/workflows/ci.yml/badge.svg" alt="CI Status" /></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=hoangyell.markdy-vscode"><img src="https://img.shields.io/visual-studio-marketplace/v/hoangyell.markdy-vscode?color=blue&label=VS%20Code" alt="VS Code Extension" /></a>
  <a href="https://www.npmjs.com/package/@markdy/core"><img src="https://img.shields.io/npm/v/@markdy/core?color=blue&label=%40markdy%2Fcore" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@markdy/core"><img src="https://img.shields.io/badge/core_size-~14_kB-brightgreen" alt="Core Bundle Size" /></a>
  <a href="https://www.npmjs.com/package/@markdy/core"><img src="https://img.shields.io/badge/runtime_deps-0-success" alt="Zero Dependencies" /></a>
  <a href="https://github.com/HoangYell/markdy-com/blob/main/LICENSE"><img src="https://img.shields.io/github/license/HoangYell/markdy-com" alt="MIT License" /></a>
</p>

<p align="center">
  <a href="https://markdy.com/playground/">
    <img src="docs/images/markdy-split-editor.webp" width="100%" alt="Markdy Interactive Studio" />
  </a>
</p>

---

## ⚡ Why Markdy?

Static boxes and arrows fail to capture distributed systems in action. **Markdy turns text into choreographed 60fps motion graphics** directly in your browser.

- 🎬 **Kinetic Storytelling**: Choreograph requests (`->`), responses (`<-`), and events (`~>`) across sequential `beat` timelines with auto-zooms and glow cues.
- 📐 **Zero-Config Layout**: Collision-aware orthogonal Manhattan edge routing and rank-based auto-layout.
- ⚡ **Zero-Dep & Web-Native**: Powered by pure CSS/SVG transforms and the Web Animations API (WAAPI) — ~14 kB parser, no Canvas, no GSAP.
- 🔄 **Universal Ingestion**: 1-click migration from Mermaid, Draw.io, Docker Compose, Kubernetes manifests, and Terraform states.
- 🤖 **AI-Native & MCP**: Official Model Context Protocol (MCP) server for Claude, Cursor, and Antigravity with self-healing syntax diagnostics.
- 🛡️ **Architecture Governance**: Built-in rules prevent deadlock cycles and cross-layer bypasses.

---

## 📊 Feature Comparison

| Capability | Mermaid / PlantUML | Excalidraw / Draw.io | Markdy |
|---|---|---|---|
| **Animation & Timing** | ❌ Static SVG / PNG | ❌ Static canvas | ✅ **60fps WAAPI motion & step-by-step narrative beats** |
| **Authoring Style** | Text DSL | Manual drag-and-drop | ✅ **Declarative text DSL + Live Editor Preview** |
| **Return Flows & Cycles** | ⚠️ Rank distortion / tangling | Manual curve placement | ✅ **Cycle-safe returns (`<-`) & async event arcs (`~>`)** |
| **AI Agent Reliability** | ⚠️ High hallucination | ❌ Coordinate hallucination | ✅ **Strict grammar AST + Self-healing MCP Server** |
| **Architecture Linter** | ❌ None | ❌ None | ✅ **Built-in rules (e.g. anti-pattern detection)** |
| **Universal Ingestion** | ❌ Manual rewrite | ❌ Manual export | ✅ **1-Click Transpiler for Mermaid, Compose, K8s, Terraform** |
| **Core Footprint** | ~2 MB+ runtime | Heavy web app | ✅ **~14 kB core parser, zero dependencies** |

---

## 🚀 Quick Start (60 Seconds)

### 1. Write MarkdyScript (`system.markdy`)

```markdy
scene "Cache-Aside Architecture" theme=midnight
layout LR

browser Client "Web Client"
gateway Gateway "API Gateway"
service Svc "URL Service"
cache Redis "Redis Cluster"
database Postgres "PostgreSQL 16"

beat cache_hit "1. Cache Hit Path":
  show $nodes stagger=60ms
  frame Client Gateway Svc Redis zoom=1.12
  Client -> Gateway "GET /link" -> Svc "resolve"
  Svc -> Redis "GET key:link"
  Svc <- Redis "200 Target URL"
  Client <- Gateway "301 Redirect"

beat cache_miss "2. Cache Miss & Async Warm":
  frame Svc Redis Postgres zoom=1.15
  Svc -> Postgres "SELECT destination WHERE key = 'link'"
  Svc <- Postgres "Row Found"
  Svc ~> Redis "SETEX key:link (Warm Cache)"
  glow Postgres color=#38bdf8 & glow Redis color=#22c55e
```

### 2. Choose Your Workflow

- **VS Code / Cursor**: Install [`hoangyell.markdy-vscode`](https://marketplace.visualstudio.com/items?itemName=hoangyell.markdy-vscode) and press **`Cmd+K V`** (macOS) or **`Ctrl+K V`** (Windows/Linux) for live preview.
- **Web Studio**: Open [markdy.com/playground](https://markdy.com/playground/) for interactive authoring and shareable links.
- **Terminal & CI/CD**: Run `npx @markdy/cli render system.markdy --out diagram.html`.
- **Astro / MDX Docs**: Use `<Markdy code={code} client:visible />` with `@markdy/astro` or `@markdy/mdx`.

---

## 📦 Component Responsibilities & Packages

Markdy is architected as a modular monorepo where each package fulfills a focused responsibility:

| Package | Responsibility | Primary Exports |
|---|---|---|
| **[`@markdy/core`](packages/core)** | **Compiler Core & AST Engine** | `parse()`, `compile()`, `formatScene()`, `diagnoseMarkdyCode()`, `validateArchitecture()`. Zero dependencies (~14 kB). |
| **[`@markdy/renderer-dom`](packages/renderer-dom)** | **Motion Graphics & Rendering** | `createDiagram()`, `exportDiagramAsVectorSvg()`, `exportDiagramAsPng()`, `exportDiagramAsGif()`. 60fps WAAPI timeline. |
| **[`markdy-vscode`](packages/vscode)** | **IDE Extension (VS Code & Cursor)** | Side-by-side live animated preview, document formatter (`Shift+Alt+F`), QuickFix lightbulbs (`💡 Fix`), Universal Ingestion, CodeLens. |
| **[`@markdy/compat`](packages/compat)** | **Universal Ingestion Suite** | Transpilers for Mermaid, Docker Compose, Kubernetes YAMLs, Terraform state, and Draw.io XML. |
| **[`@markdy/cli`](packages/cli)** | **Terminal Tool & CI/CD** | `markdy lint`, `markdy render`, `markdy format`, `markdy import`, `markdy diff`. |
| **[`@markdy/mcp-server`](packages/mcp-server)** | **AI Agent Integration (MCP)** | Model Context Protocol server exposing validation, auto-healing, and transpilation tools for Claude, Cursor, Antigravity. |
| **[`@markdy/astro`](packages/astro)** & **[`@markdy/mdx`](packages/mdx)** | **Docs & Blog Integrations** | Zero-CLS, SSR-placeholder islands with viewport hydration for content sites. |
| **[`@markdy/language-server`](packages/markdy-language-server)** | **Headless LSP Server** | Diagnostic publishing, hover docs, formatting, and completions for language clients. |
| **[`@markdy/stdlib-systems`](packages/stdlib-systems)** | **Domain Vocabulary** | Semantic primitives for cloud, infrastructure, and distributed systems. |

---

## 🔍 Detailed Features & Advanced Usage

<details>
<summary><b>🎨 17 Specialized Layout Engines &amp; 8 Editorial Themes</b></summary>
<br>

Markdy provides topological layout algorithms tailored to specific system patterns:

- **Distributed Systems**: `architecture`, `flowchart`, `tree`, `state`, `sequence`
- **Security & Structure**: `layers`, `nested`, `swimlane`, `quadrant`, `pyramid`
- **Data & Product Loops**: `medallion`, `timeline`, `gantt`, `flywheel`, `constellation`, `radar`, `venn`

**Themes**: `midnight` (dark modern), `paper` (light technical), `blueprint` (CAD cyan), `editorial` (serif publication), `graphite` (minimal dark), `nebula` (cosmic violet), `terminal` (CLI retro), `sketchy` (hand-drawn).

👉 *[Explore all 17+ interactive scenes in the Live Gallery ↗](https://markdy.com/examples/)*
</details>

<details>
<summary><b>🔄 Universal Ingestion (1-Command Migration)</b></summary>
<br>

Convert existing diagrams and infrastructure configs into animated MarkdyScript scenes:

```bash
markdy import flow.mmd            --out flow.markdy        # Mermaid.js Flowcharts & Sequences
markdy import docker-compose.yml  --out compose.markdy     # Docker Compose Services & Networks
markdy import k8s-manifests/      --out cluster.markdy     # Kubernetes Ingress, Pods & Services
markdy import terraform.tfstate   --out infra.markdy       # Terraform Provisioned State
markdy import architecture.drawio --out diagram.markdy     # Draw.io / diagrams.net XML
```
</details>

<details>
<summary><b>🤖 AI Assistant &amp; Model Context Protocol (MCP) Setup</b></summary>
<br>

Configure the official Markdy MCP Server in Claude Desktop, Cursor, or Antigravity:

```json
{
  "mcpServers": {
    "markdy": {
      "command": "npx",
      "args": ["-y", "@markdy/mcp-server"]
    }
  }
}
```

Equips AI agents with `validate_markdy_code`, `diagnose_markdy_syntax`, `fix_markdy_code`, `transpile_to_markdy`, and access to `markdy://spec/agent-reference`.

👉 *[Read the Authoritative AI Agent Guide (`AGENT.md`) ↗](https://markdy.com/agent/)*
</details>

---

## 📖 Documentation Links

| Guide | Description |
|---|---|
| **[Syntax Reference (SYNTAX.md)](docs/SYNTAX.md)** | Full DSL grammar, flow operators, selectors, cues, and player settings |
| **[Step-by-Step Tutorial (TUTORIAL.md)](docs/TUTORIAL.md)** | Step-by-step guide from basic flows to multi-beat kinetic scenes |
| **[AI Agent Guide (AGENT.md)](docs/AGENT.md)** | LLM system prompts, token rules, and anti-patterns |
| **[Architecture Internals (ARCHITECTURE.md)](docs/ARCHITECTURE.md)** | Compiler pipelines, WAAPI loop, and orthogonal routing geometry |
| **[VS Code Extension Guide](packages/vscode/README.md)** | Shortcuts, settings, and IDE features |

---

<p align="center">
  <img src="docs/images/mascot/male-markdy.webp" width="64" height="64" alt="Markdy Mascot" /><br>
  <strong>Empowering engineers and AI agents to create living architecture diagrams.</strong><br>
  <sub>Built with ❤️ by <a href="https://hoangyell.com">Hoang Yell</a> &amp; the community. Distributed under the <a href="LICENSE">MIT License</a>.</sub>
</p>