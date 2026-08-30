<p align="center">
  <a href="https://markdy.com">
    <img src="docs/images/mascot/markdy-com.webp" width="340" alt="Markdy" />
  </a>
</p>

<p align="center">
  <strong>Diagram-as-code DSL for animated architecture &amp; system design explainers.</strong><br>
  Prompt your AI agent → generate declarative MarkdyScript → render 60fps kinetic diagrams powered by the Web Animations API.
</p>

<p align="center">
  <a href="https://markdy.com/playground/"><b>⚡ Live Studio</b></a> &nbsp;•&nbsp;
  <a href="https://marketplace.visualstudio.com/items?itemName=hoangyell.markdy-vscode"><b>🔌 VS Code Extension</b></a> &nbsp;•&nbsp;
  <a href="https://markdy.com/docs/"><b>📖 Documentation</b></a> &nbsp;•&nbsp;
  <a href="https://markdy.com/examples/"><b>🌟 29 Blueprints</b></a> &nbsp;•&nbsp;
  <a href="https://markdy.com/agent/"><b>🤖 AI &amp; Agent Guide</b></a>
</p>

<p align="center">
  <a href="https://github.com/HoangYell/markdy-com/actions/workflows/ci.yml"><img src="https://github.com/HoangYell/markdy-com/actions/workflows/ci.yml/badge.svg" alt="CI Status" /></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=hoangyell.markdy-vscode"><img src="https://vsmarketplacebadges.dev/version-short/hoangyell.markdy-vscode.svg" alt="VS Code Extension" /></a>
  <a href="https://open-vsx.org/extension/hoangyell/markdy-vscode"><img src="https://img.shields.io/open-vsx/v/hoangyell/markdy-vscode?color=purple&label=Open%20VSX" alt="Open VSX Extension" /></a>
  <a href="https://www.npmjs.com/package/@markdy/core"><img src="https://img.shields.io/npm/v/@markdy/core?color=blue&label=%40markdy%2Fcore" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@markdy/mcp-server"><img src="https://img.shields.io/npm/v/@markdy/mcp-server?color=purple&label=MCP%20Server" alt="MCP Server version" /></a>
  <a href="https://www.npmjs.com/package/@markdy/core"><img src="https://img.shields.io/badge/core_size-~14_kB-brightgreen" alt="Core Bundle Size" /></a>
  <a href="https://github.com/HoangYell/markdy-com/blob/main/LICENSE"><img src="https://img.shields.io/github/license/HoangYell/markdy-com" alt="MIT License" /></a>
</p>

<p align="center">
  <a href="https://markdy.com/playground/">
    <img src="docs/images/markdy-split-editor.webp" width="100%" alt="Markdy Interactive Studio" />
  </a>
</p>

---

## 💡 How It Works

> **Describe your system in plain English → your AI agent generates the Markdy script → your browser renders the animated diagram.**

<p align="center">
  <img src="docs/images/ai-paradigm-flow.webp" width="100%" alt="How to Use Markdy with AI Agents" />
</p>

---

## 🚀 Quick Start (60 Seconds)

### 1. Prompt Your AI Agent

You don't need to write MarkdyScript manually. Ask **Cursor**, **Claude Code**, **Google Antigravity**, **ChatGPT**, or any coding agent:

> **Example Prompt:**
>
> "Follow the canonical Markdy specification (https://markdy.com/AGENT.md) and generate a `.markdy` scene:  
> Explain a **Cache-Aside Architecture** with a Web Client, API Gateway, URL Service, Redis Cluster, and PostgreSQL database. Include two animated storyboard beats: **1. Cache Hit Path** and **2. Cache Miss & Async Warm**."

*(Tip: If you have the official [Markdy MCP Server](#mcp-setup) installed, just ask: `"Create an animated Markdy architecture diagram for our cache-aside service."`)*

#### 🤖 AI-Generated MarkdyScript (`system.markdy`):

```markdy
scene "Cache-Aside Architecture" theme=auto
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

### 2. Preview & Explore

- **VS Code / Cursor**: Press **`Cmd+K V`** (macOS) or **`Ctrl+K V`** (Windows/Linux) using the [`hoangyell.markdy-vscode`](https://marketplace.visualstudio.com/items?itemName=hoangyell.markdy-vscode) extension for live side-by-side animated preview.
- **Web Studio**: Paste into [markdy.com/playground](https://markdy.com/playground/) for interactive timeline scrubbing and shareable links.
- **Terminal & CI/CD**: Run `npx @markdy/cli render system.markdy --out diagram.html`.

---

## 📦 Embedding in Web Apps & Docs

Render 60fps interactive diagrams directly in your web applications, documentation, or blog:

```bash
npm install @markdy/renderer-dom
# or
pnpm add @markdy/renderer-dom
```

```ts
import { createDiagram } from "@markdy/renderer-dom";

// Mount and render interactive 60fps WAAPI diagram directly from code
const diagram = createDiagram({
  container: document.getElementById("diagram-container")!,
  code: markdyScriptCode,
});
```

> 💡 **Using Astro or Next.js/MDX?** See the **[@markdy/astro Guide ↗](packages/astro/README.md)** and **[@markdy/mdx Guide ↗](packages/mdx/README.md)** (or jump to [Astro `<Markdy />`](#astro-integration) and [MDX / React](#mdx-integration) below) for 1-line zero-JS declarative components.

👉 **[@markdy/renderer-dom Guide ↗](packages/renderer-dom/README.md)** &nbsp;•&nbsp; **[@markdy/core Guide ↗](packages/core/README.md)**

---

## ⚡ Why Markdy?

Static boxes and arrows fail to capture distributed systems in action. **Markdy turns text into choreographed 60fps motion graphics** directly in your browser.

- 🎬 **Kinetic Storytelling**: Choreograph requests (`->`), responses (`<-`), and events (`~>`) across sequential `beat` timelines with auto-zooms and glow cues.
- 📐 **Zero-Config Layout**: Collision-aware orthogonal Manhattan edge routing and rank-based auto-layout.
- ⚡ **Zero-Dep & Web-Native**: Powered by pure CSS/SVG transforms and the Web Animations API (WAAPI) — ~14 kB parser, no Canvas, no GSAP.
- 🔄 **Universal Ingestion**: 1-click migration from Mermaid, Draw.io, Docker Compose, Kubernetes manifests, and Terraform states.
- 🤖 **AI-Native & MCP**: Official Model Context Protocol (MCP) server for Claude, Cursor, Antigravity, and Cline with self-healing syntax diagnostics.
- 🛡️ **Architecture Governance**: Built-in rules prevent deadlock cycles and cross-layer bypasses.

---

## 🔌 Integrations & Ecosystem

Extend Markdy across your favorite AI agents, editors, frameworks, and deployment workflows:

<details open>
<summary><b>🤖 AI Coding Agents &amp; MCP Server (Recommended)</b></summary>
<br>

Equip Claude, Cursor, Antigravity, VS Code, Cline, Windsurf, or Zed with self-healing syntax diagnostics, auto-repair, and transpilers:

```bash
# Claude Code / CLI
claude mcp add markdy -- npx -y @markdy/mcp-server

# Google Antigravity & Gemini CLI
agy mcp add markdy -- npx -y @markdy/mcp-server
```

👉 **[1-Click Install for Cursor ↗](https://markdy.com/mcp/cursor)** &nbsp;•&nbsp; **[1-Click Install for VS Code ↗](https://markdy.com/mcp/vscode)** &nbsp;•&nbsp; **[Detailed AI Setup Guide (`AGENT.md`) ↗](docs/AGENT.md)**
</details>

<details open>
<summary><b>🔌 IDE Extensions (VS Code, Cursor, Windsurf, VSCodium)</b></summary>
<br>

Live side-by-side animated preview (`Cmd+K V`), syntax highlighting, auto-completion, error squiggles, and SVG/PNG export:

```bash
# Visual Studio Code
code --install-extension hoangyell.markdy-vscode

# Cursor / VSCodium (Open VSX Registry)
cursor --install-extension hoangyell.markdy-vscode
```

👉 **[VS Code Marketplace ↗](https://marketplace.visualstudio.com/items?itemName=hoangyell.markdy-vscode)** &nbsp;•&nbsp; **[Open VSX Registry ↗](https://open-vsx.org/extension/hoangyell/markdy-vscode)** &nbsp;•&nbsp; **[Extension Docs ↗](packages/vscode/README.md)**
</details>

<a id="astro-integration"></a>
<details open id="astro-integration">
<summary><b>🚀 Astro Integration (`@markdy/astro`)</b></summary>
<br>

Zero-CLS, SSR-placeholder islands with viewport-triggered lazy hydration for Astro documentation sites and blogs:

```bash
pnpm add @markdy/astro
```

```astro
---
import { Markdy } from "@markdy/astro";
import code from "./diagram.markdy?raw";
---

<Markdy code={code} client:visible />
```

👉 **[@markdy/astro Package Guide ↗](packages/astro/README.md)**
</details>

<a id="mdx-integration"></a>
<details open id="mdx-integration">
<summary><b>📝 MDX / React / Next.js Integration (`@markdy/mdx`)</b></summary>
<br>

Render fenced ```markdy code blocks directly inside `.mdx` files with automatic lazy loading:

```bash
pnpm add @markdy/mdx react react-dom
```

```ts
// mdx.config.js
import { remarkMarkdy } from "@markdy/mdx";

export default {
  remarkPlugins: [[remarkMarkdy, { componentName: "MarkdyDiagram" }]],
};
```

👉 **[@markdy/mdx Package Guide ↗](packages/mdx/README.md)**
</details>

<details>
<summary><b>⚡ Terminal CLI &amp; Migration Suite (`@markdy/cli`, `@markdy/compat`)</b></summary>
<br>

Render standalone HTML diagrams, run linting in CI/CD, or convert legacy Mermaid, Draw.io, Docker Compose, Kubernetes, and Terraform configs:

```bash
# Global install
npm install -g @markdy/cli

# Render diagram to animated HTML or SVG
markdy render system.markdy --out diagram.html

# Transpile Mermaid / Docker Compose / Kubernetes to Markdy
markdy import flow.mmd --out flow.markdy
```

👉 **[CLI Package Guide ↗](packages/cli/README.md)** &nbsp;•&nbsp; **[Compat Transpiler Guide ↗](packages/compat/README.md)**
</details>

<details>
<summary><b>🏗️ Systems Vocabulary &amp; Language Server (`@markdy/stdlib-systems`, `@markdy/language-server`)</b></summary>
<br>

- **[`@markdy/stdlib-systems`](packages/stdlib-systems/README.md)**: Standard library of semantic cloud and distributed systems node kinds.
- **[`@markdy/language-server`](packages/markdy-language-server/README.md)**: Headless LSP for custom editor integrations (Neovim, Helix, Emacs).
</details>

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

## 📦 Component Responsibilities & Packages

Markdy is architected as a modular monorepo where each package fulfills a focused responsibility:

| Package | Responsibility | Primary Exports |
|---|---|---|
| **[`@markdy/core`](packages/core)** | **Compiler Core & AST Engine** | `parse()`, `compile()`, `formatScene()`, `diagnoseMarkdyCode()`, `validateArchitecture()`. Zero dependencies (~14 kB). |
| **[`@markdy/renderer-dom`](packages/renderer-dom)** | **Motion Graphics & Rendering** | `createDiagram()`, `exportDiagramAsVectorSvg()`, `exportDiagramAsPng()`, `exportDiagramAsGif()`. 60fps WAAPI timeline. |
| **[`markdy-vscode`](packages/vscode)** | **IDE Extension (VS Code & Cursor)** | Side-by-side live animated preview, document formatter (`Shift+Alt+F`), QuickFix lightbulbs (`💡 Fix`), Universal Ingestion, CodeLens. |
| **[`@markdy/compat`](packages/compat)** | **Universal Ingestion Suite** | Transpilers for Mermaid, Docker Compose, Kubernetes YAMLs, Terraform state, and Draw.io XML. |
| **[`@markdy/cli`](packages/cli)** | **Terminal Tool & CI/CD** | `markdy lint`, `markdy render`, `markdy format`, `markdy import`, `markdy diff`. |
| **[`@markdy/mcp-server`](packages/mcp-server)** | **AI Agent Integration (MCP)** | Model Context Protocol server exposing validation, auto-healing, and transpilation tools for Claude, Cursor, Antigravity, Cline, Windsurf. |
| **[`@markdy/astro`](packages/astro)** & **[`@markdy/mdx`](packages/mdx)** | **Docs & Blog Integrations** | Zero-CLS, SSR-placeholder islands with viewport hydration for content sites. |
| **[`@markdy/language-server`](packages/markdy-language-server)** | **Headless LSP Server** | Diagnostic publishing, hover docs, formatting, and completions for language clients. |
| **[`@markdy/stdlib-systems`](packages/stdlib-systems)** | **Domain Vocabulary** | Semantic primitives for cloud, infrastructure, and distributed systems. |

---

## 🔍 Detailed Features & Advanced Usage

<details>
<summary><b>🎨 17 Specialized Layout Engines &amp; 10 Editorial Themes</b></summary>
<br>

Markdy provides topological layout algorithms tailored to specific system patterns:

- **Distributed Systems**: `architecture`, `flowchart`, `tree`, `state`, `sequence`
- **Security & Structure**: `layers`, `nested`, `swimlane`, `quadrant`, `pyramid`
- **Data & Product Loops**: `medallion`, `timeline`, `gantt`, `flywheel`, `constellation`, `radar`, `venn`

**Themes**: `midnight` (dark modern), `paper` (light technical), `blueprint` (CAD cyan), `editorial` (serif publication), `graphite` (minimal dark), `nebula` (cosmic violet), `terminal` (CLI retro), `sketchy` (hand-drawn), `ink` (blue ballpoint & fountain pen ink), `doodle` (playful doodle).

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

<a id="mcp-setup"></a>
<details open id="mcp-setup">
<summary><b>🤖 AI Coding Agents &amp; Model Context Protocol (MCP) Setup (Cursor, VS Code, Claude, Antigravity)</b></summary>
<br>

Equip your favorite AI Coding Agent with native Markdy tools (`validate_markdy_code`, `diagnose_markdy_syntax`, `fix_markdy_code`, `transpile_to_markdy`) and live specification resources (`markdy://spec/agent-reference`).

### ⚡ Quick MCP Server Setup & Installation

| AI Environment | Setup Action | Method |
|---|---|---|
| **Cursor** | [![Install in Cursor](https://img.shields.io/badge/⚡_Install_in-Cursor-000000?style=for-the-badge&logo=cursor&logoColor=white)](https://markdy.com/mcp/cursor) | **[1-Click Install ↗](https://markdy.com/mcp/cursor)** or [JSON Config](#cursor-setup) |
| **VS Code / Copilot** | [![Install in VS Code](https://img.shields.io/badge/⚡_Install_in-VS_Code-007ACC?style=for-the-badge&logo=visualstudiocode&logoColor=white)](https://markdy.com/mcp/vscode) | **[1-Click Install ↗](https://markdy.com/mcp/vscode)** or [JSON Config](#vscode-setup) |
| **Claude Code & Desktop** | [![Setup in Claude](https://img.shields.io/badge/⚡_Setup_in-Claude-D97706?style=for-the-badge&logo=anthropic&logoColor=white)](#claude-setup) | **CLI (`claude mcp add`) & JSON** |
| **Google Antigravity** | [![Setup in Antigravity](https://img.shields.io/badge/⚡_Setup_in-Antigravity-4285F4?style=for-the-badge&logo=google&logoColor=white)](#antigravity-setup) | **1-Command CLI (`agy mcp add`)** |
| **Cline / Roo Code** | [![Config in Cline](https://img.shields.io/badge/Config_in-Cline-6366F1?style=for-the-badge)](#cline-setup) | **Config File (`cline_mcp_settings.json`)** |
| **Windsurf / Cascade** | [![Config in Windsurf](https://img.shields.io/badge/Config_in-Windsurf-09B6A2?style=for-the-badge&logo=codeium&logoColor=white)](#windsurf-setup) | **Config File (`mcp_config.json`)** |
| **Zed Editor** | [![Config in Zed](https://img.shields.io/badge/Config_in-Zed-4B5563?style=for-the-badge)](#zed-setup) | **Config File (`settings.json`)** |

---

### 🛠️ Client Configuration Snippets

<a id="claude-setup"></a>
#### 1. Claude Code & Claude Desktop

**Claude Code (Anthropic CLI):**
```bash
claude mcp add markdy -- npx -y @markdy/mcp-server
```

**Claude Desktop GUI (`claude_desktop_config.json`):**
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

<a id="cursor-setup"></a>
<a id="vscode-setup"></a>
#### 2. Cursor & VS Code (`.cursor/mcp.json` or `.vscode/mcp.json`)
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

<a id="antigravity-setup"></a>
#### 3. Google Antigravity & Gemini CLI

**Via 1-Command CLI:**
```bash
agy mcp add markdy -- npx -y @markdy/mcp-server
```

**Or via Config File (`~/.gemini/antigravity/mcp_config.json` or `.agents/mcp_config.json`):**
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

<a id="cline-setup"></a>
#### 4. Cline & Roo Code (`cline_mcp_settings.json`)
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

<a id="windsurf-setup"></a>
#### 5. Windsurf / Cascade (`~/.codeium/windsurf/mcp_config.json`)
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

<a id="zed-setup"></a>
#### 6. Zed Editor (`settings.json`)
```json
{
  "context_servers": {
    "markdy": {
      "command": {
        "path": "npx",
        "args": ["-y", "@markdy/mcp-server"]
      }
    }
  }
}
```

---

### 🧰 Available Agent Tools & Resources

- 🔍 `validate_markdy_code`: Check syntax, unresolved node references, and cycle rules.
- 💡 `diagnose_markdy_syntax`: Detailed diagnostics with exact line numbers and remediation steps.
- 🩹 `fix_markdy_code`: Self-healing code repair that fixes common syntax mistakes and formats AST.
- 🔄 `transpile_to_markdy`: Convert Mermaid, Docker Compose, Kubernetes, Terraform, or Draw.io into valid MarkdyScript.
- 📚 `markdy://spec/agent-reference`: Full AST grammar reference and token catalog.
- 🏛️ `markdy://governance/rules`: Architecture rules (Well-Architected, cycle bounds, layer separation).
- 📦 `markdy://templates/catalog`: 29 production-grade architecture blueprints.

👉 *[Read the Full AI Agent Reference Guide (`AGENT.md`) ↗](https://markdy.com/agent/)*
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