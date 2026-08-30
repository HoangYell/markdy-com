# Markdy for Visual Studio Code & Cursor

<p align="center">
  <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/docs/images/mascot/3d-icon.png" width="100" alt="Markdy Mascot" />
</p>

<h1 align="center">Markdy for VS Code &amp; Cursor</h1>

<p align="center">
  <strong>The official diagram-as-code extension for animated architecture &amp; system design diagrams.</strong><br>
  Write declarative MarkdyScript → preview silky-smooth 60fps kinetic animations in real time next to your code.
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=hoangyell.markdy-vscode"><img src="https://vsmarketplacebadges.dev/version-short/hoangyell.markdy-vscode.svg" alt="VS Code Marketplace" /></a>
  <a href="https://open-vsx.org/extension/hoangyell/markdy-vscode"><img src="https://img.shields.io/open-vsx/v/hoangyell/markdy-vscode?color=purple&label=Open%20VSX" alt="Open VSX Version" /></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=hoangyell.markdy-vscode"><img src="https://vsmarketplacebadges.dev/installs-short/hoangyell.markdy-vscode.svg" alt="Marketplace Installs" /></a>
  <a href="https://open-vsx.org/extension/hoangyell/markdy-vscode"><img src="https://img.shields.io/open-vsx/dt/hoangyell/markdy-vscode?color=green" alt="Open VSX Downloads" /></a>
  <a href="https://github.com/HoangYell/markdy-com/actions/workflows/ci.yml"><img src="https://github.com/HoangYell/markdy-com/actions/workflows/ci.yml/badge.svg" alt="CI Status" /></a>
  <a href="https://github.com/HoangYell/markdy-com/blob/main/LICENSE"><img src="https://img.shields.io/github/license/HoangYell/markdy-com" alt="MIT License" /></a>
</p>

<p align="center">
  <a href="https://markdy.com/playground/"><b>⚡ Web Studio</b></a> &nbsp;•&nbsp;
  <a href="https://markdy.com/docs/"><b>📖 Full Docs</b></a> &nbsp;•&nbsp;
  <a href="https://markdy.com/examples/"><b>🌟 29 Blueprints</b></a> &nbsp;•&nbsp;
  <a href="https://github.com/HoangYell/markdy-com"><b>🐙 GitHub Repo</b></a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/docs/images/markdy-split-editor.webp" width="100%" alt="Markdy Live Animated Preview" />
</p>

---

## 📥 Installation

Markdy is officially published on both the **VS Code Marketplace** and the **Open VSX Registry**, supporting all major VS Code forks out of the box.

| Editor | Marketplace Search | CLI Installation Command |
|---|---|---|
| **Visual Studio Code** | Search `Markdy` in Extensions (`Cmd+Shift+X`) | `code --install-extension hoangyell.markdy-vscode` |
| **Cursor** | Search `Markdy` in Extensions (`Cmd+Shift+X`) | `cursor --install-extension hoangyell.markdy-vscode` |
| **Windsurf / VSCodium** | Search `Markdy` in Extensions (`Cmd+Shift+X`) | `codium --install-extension hoangyell.markdy-vscode` |

<details>
<summary><b>📦 Manual / Direct / Offline Installation (.vsix)</b></summary>

- **Instant 1-Line CLI Installer (Direct from Open VSX):**
  ```bash
  curl -sL "https://open-vsx.org/api/hoangyell/markdy-vscode/latest/file/hoangyell.markdy-vscode-1.1.6.vsix" -o /tmp/markdy.vsix && cursor --install-extension /tmp/markdy.vsix && rm /tmp/markdy.vsix
  ```

- **From GitHub Releases:**
  1. Download the latest `markdy-vscode.vsix` from [GitHub Releases](https://github.com/HoangYell/markdy-com/releases).
  2. Install via command line:
     ```bash
     code --install-extension markdy-vscode.vsix
     # or for Cursor
     cursor --install-extension markdy-vscode.vsix
     ```
     *(Or in your editor: Press `Cmd+Shift+P` / `Ctrl+Shift+P` → select **Extensions: Install from VSIX...**)*
</details>

---

## ⚡ Quick Start (60 Seconds)

1. **Install**: Follow the [Installation instructions](#-installation) above for your editor.
2. **Prompt AI or Create Diagram**: Ask your AI Agent (Cursor / Claude / Antigravity / Copilot) using https://markdy.com/AGENT.md or run `Markdy: Insert Template...` from the Command Palette.
3. **Open Live Preview**: Press **`Cmd+K V`** (macOS) or **`Ctrl+K V`** (Windows/Linux) to open the side-by-side animated live preview.

```markdy
scene "Cloud Architecture" theme=midnight
layout LR

browser Client "Global User"
gateway ApiGateway "Kong Gateway"
service AuthService "Auth Service"
database MainDB "PostgreSQL 16"
queue TaskQueue "Kafka Stream"

beat auth "1. Authentication Flow":
  show $nodes stagger=60ms
  frame Client ApiGateway AuthService zoom=1.12
  Client -> ApiGateway "POST /login" -> AuthService "validate JWT"
  AuthService -> MainDB "SELECT credentials"
  AuthService <- MainDB "user record"
  Client <- ApiGateway "200 OK (JWT Token)"

beat async_job "2. Async Background Task":
  frame ApiGateway TaskQueue zoom=1.15
  ApiGateway ~> TaskQueue "dispatch event"
  glow TaskQueue color=#38bdf8
```

---

## ✨ Key Features

- 🎬 **Side-by-Side Live Preview**: 60fps Web Animations API preview with playback speed (`0.5x`–`2.0x`) and beat steppers (`⏮` / `⏭`).
- ⚡ **IntelliCode & Linter**: Real-time architecture governance rules, typo QuickFixes (`💡 Fix`), and one-click auto-repair.
- 📐 **Format on Save (`Shift+Alt+F`)**: AST-aware document formatting.
- 🔄 **Universal Ingestion**: Right-click `.mermaid`, `docker-compose.yml`, `*.tfstate`, or `*.drawio` to transpile to Markdy.
- 🖼️ **Multi-Format Exports**: Export to vector **SVG** or high-res **PNG**, or copy directly to clipboard.
- 🌟 **Curated Templates**: 1-click scaffolding for Microservices, Kafka, Kubernetes, Lakehouses, and OAuth PKCE.
- 🤖 **AI Prompt Assistant**: Export context-rich LLM prompt bundles ready for Cursor, Claude, Copilot, or ChatGPT.
- 📄 **Markdown / MDX CodeLens**: Interactive `[▶ Preview]` buttons above ````markdy` blocks in documentation.
- 🔒 **100% Offline & Private**: Zero network dependencies, zero telemetry.

---

## ⌨️ Command Palette & Shortcuts

### Commands (`Cmd+Shift+P` / `Ctrl+Shift+P`)

| Command | Keybinding | Description |
|---|---|---|
| `Markdy: Live Preview` | `Cmd+K V` / `Ctrl+K V` | Opens live animated preview panel beside editor |
| `Format Document` | `Shift+Alt+F` | AST-aware document formatting |
| `Markdy: Export SVG` | — | Exports vector `.svg` diagram |
| `Markdy: Export PNG` | — | Exports high-resolution `.png` image |
| `Markdy: Copy SVG` | — | Copies raw vector SVG XML to clipboard |
| `Markdy: Copy PNG` | — | Copies PNG Data URL to clipboard |
| `Markdy: Insert Template...` | — | Scaffolds curated architecture models at cursor |
| `Markdy: New From Template...` | — | Creates a new `.markdy` document from template |
| `Markdy: AI Prompt Helper` | — | Compiles LLM prompt bundle with AST & rules |
| `Markdy: Import Diagram...` | — | Transpiles Mermaid, Compose, K8s, Terraform, or Draw.io |
| `Markdy: Open in Web Studio` | — | Opens diagram in browser at markdy.com/playground |
| `Markdy: Copy Web Link` | — | Copies compressed playground link to clipboard |
| `Markdy: Restart Server` | — | Restarts background language server worker |

### Preview Panel Keyboard Shortcuts

When the Preview panel is focused:

| Key | Action |
|---|---|
| `Space` / `K` | Play / Pause animation |
| `R` | Restart animation from beginning |
| `←` / `J` | Previous narrative beat |
| `→` / `L` | Next narrative beat |
| `F` | Fit view / reset viewport transforms |
| `S` | Cycle playback speed (`0.5x` → `1.0x` → `1.5x` → `2.0x`) |
| `T` | Cycle official theme (`midnight`, `paper`, `blueprint`, `nebula`, etc.) |

---

## 🖱️ Right-Click Context Menu

Right-click anywhere in a `.markdy` editor or in the Explorer tree to open the nested **`Markdy >`** submenu:

```text
Right-click ──▶ Markdy ▶ ──┬── Live Preview
                           ├── Insert Template...
                           ├── AI Prompt Helper
                           ├── ───────────────────────
                           ├── Export SVG / PNG
                           ├── Copy SVG / PNG
                           ├── ───────────────────────
                           ├── Open in Web Studio
                           ├── Copy Web Link
                           └── Import Diagram...
```

---

## ⚙️ Extension Settings

| Setting | Default | Options / Description |
|---|---|---|
| `markdy.preview.theme` | `"auto"` | `"auto"`, `"midnight"`, `"paper"`, `"blueprint"`, `"nebula"`, `"editorial"`, `"graphite"`, `"terminal"`, `"sketchy"`, `"ink"`, `"doodle"` |
| `markdy.preview.autoplay` | `true` | Automatically play diagram animations when preview opens |
| `markdy.preview.loop` | `true` | Continuously loop diagram animations |
| `markdy.preview.progressBar` | `true` | Show interactive timeline scrubber and progress bar |
| `markdy.trace.server` | `"off"` | `"off"`, `"messages"`, `"verbose"` — language server tracing |

---

## 📄 License

MIT © [Hoang Yell](https://hoangyell.com). Built with ❤️ for software architects, systems engineers, and technical storytellers.
