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
  <a href="https://marketplace.visualstudio.com/items?itemName=hoangyell.markdy-vscode"><img src="https://img.shields.io/visual-studio-marketplace/v/hoangyell.markdy-vscode?color=blue&label=VS%20Code%20Marketplace" alt="Marketplace Version" /></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=hoangyell.markdy-vscode"><img src="https://img.shields.io/visual-studio-marketplace/i/hoangyell.markdy-vscode?color=green" alt="Installs" /></a>
  <a href="https://github.com/HoangYell/markdy-com/actions/workflows/ci.yml"><img src="https://github.com/HoangYell/markdy-com/actions/workflows/ci.yml/badge.svg" alt="CI Status" /></a>
  <a href="https://github.com/HoangYell/markdy-com/blob/main/LICENSE"><img src="https://img.shields.io/github/license/HoangYell/markdy-com" alt="MIT License" /></a>
</p>

<p align="center">
  <a href="https://markdy.com/playground/"><b>⚡ Web Studio</b></a> &nbsp;•&nbsp;
  <a href="https://markdy.com/docs/"><b>📖 Full Docs</b></a> &nbsp;•&nbsp;
  <a href="https://markdy.com/examples/"><b>🌟 29+ Examples</b></a> &nbsp;•&nbsp;
  <a href="https://github.com/HoangYell/markdy-com"><b>🐙 GitHub Repo</b></a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/docs/images/markdy-split-editor.webp" width="100%" alt="Markdy Live Animated Preview" />
</p>

---

## ⚡ Quick Start (60 Seconds)

1. **Install**: Search for `Markdy` in the Extensions view (`Cmd+Shift+X` / `Ctrl+Shift+X`) or run:
   ```bash
   code --install-extension hoangyell.markdy-vscode
   ```
2. **Create Diagram**: Create `system.markdy` (or run `Markdy: Insert Architecture Template...`).
3. **Open Preview**: Press **`Cmd+K V`** (macOS) or **`Ctrl+K V`** (Windows/Linux) to open the side-by-side animated live preview.

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
- 🖼️ **Multi-Format Exports**: Export to vector **SVG**, high-res **PNG**, or animated **GIF89a**, or copy directly to clipboard.
- 🌟 **Curated Templates**: 1-click scaffolding for Microservices, Kafka, Kubernetes, Lakehouses, and OAuth PKCE.
- 🤖 **AI Prompt Assistant**: Export context-rich LLM prompt bundles ready for Cursor, Claude, Copilot, or ChatGPT.
- 📄 **Markdown / MDX CodeLens**: Interactive `[▶ Preview]` buttons above ````markdy` blocks in documentation.
- 🔒 **100% Offline & Private**: Zero network dependencies, zero telemetry.

---

## ⌨️ Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)

| Command Title | Keybinding | Description |
|---|---|---|
| `Markdy: Open Live Preview to the Side` | `Cmd+K V` / `Ctrl+K V` | Opens live animated preview panel beside editor |
| `Format Document` | `Shift+Alt+F` | Formats MarkdyScript syntax and indentation |
| `Markdy: Export Current Diagram to SVG` | — | Exports current frame to scalable `.svg` |
| `Markdy: Export Current Diagram to PNG` | — | Exports high-resolution `.png` raster image |
| `Markdy: Export Current Diagram to Animated GIF` | — | Records and renders animated `.gif` file |
| `Markdy: Copy Diagram SVG to Clipboard` | — | Copies raw vector SVG XML to clipboard |
| `Markdy: Copy Diagram PNG to Clipboard` | — | Copies PNG Data URL to clipboard |
| `Markdy: Import Architecture Diagram...` | — | Transpiles Mermaid, Compose, K8s, Terraform, or Draw.io |
| `Markdy: Insert Architecture Template...` | — | Inserts curated system design models at cursor |
| `Markdy: New Diagram from Template...` | — | Creates a new `.markdy` document from template |
| `Markdy: Generate AI Architecture Prompt` | — | Compiles LLM prompt bundle with AST & rules |
| `Markdy: Open Diagram in Markdy Web Studio` | — | Opens diagram in browser at markdy.com/playground |
| `Markdy: Copy Web Studio Share URL` | — | Copies compressed playground link to clipboard |
| `Markdy: Restart Language Server` | — | Restarts background language server worker |

---

## ⚙️ Extension Settings

| Setting | Default | Options / Description |
|---|---|---|
| `markdy.preview.theme` | `"auto"` | `"auto"`, `"midnight"`, `"paper"`, `"blueprint"`, `"nebula"`, `"editorial"`, `"graphite"`, `"terminal"`, `"sketchy"` |
| `markdy.preview.autoplay` | `true` | Automatically play diagram animations when preview opens |
| `markdy.preview.loop` | `true` | Continuously loop diagram animations |
| `markdy.preview.progressBar` | `true` | Show interactive timeline scrubber and progress bar |
| `markdy.trace.server` | `"off"` | `"off"`, `"messages"`, `"verbose"` — language server tracing |

---

## 📄 License

MIT © [Hoang Yell](https://hoangyell.com). Built with ❤️ for software architects, systems engineers, and technical storytellers.
