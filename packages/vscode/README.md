# Markdy for Visual Studio Code

<p align="center">
  <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/docs/images/mascot/3d-icon.png" width="128" alt="Markdy Mascot" />
</p>

<p align="center">
  <strong>Open-source diagram-as-code editor tooling for animated architecture and system diagrams.</strong><br>
  Write diagram-native MarkdyScript, get browser-native motion diagrams with zero external dependencies.
</p>

<p align="center">
  <a href="https://markdy.com">Website & Playground</a> •
  <a href="https://github.com/HoangYell/markdy-com">GitHub</a> •
  <a href="https://markdy.com/docs/syntax">Syntax Guide</a>
</p>

---

## ✨ Features

- 🎨 **Full Syntax Highlighting**: Comprehensive TextMate grammar for `.markdy` files and embedded ````markdy` code blocks in Markdown and MDX.
- ⚡ **Real-Time Diagnostics & Autocompletion**: Backed by `@markdy/language-server` with instant AST validation, error squiggles, symbol navigation, and hover docs.
- 🎬 **Side-by-Side Live Animated Preview**: Preview your diagram with silky-smooth Web Animations API (WAAPI) motion as you type.
- ⏱️ **Interactive Playback Controls**: Play, pause, restart, step through narrative beats, and switch themes in the live preview toolbar.
- 📐 **Vector & Raster Exports**: Export diagrams directly to clean, scalable SVG vector graphics or high-resolution PNG images.
- 🔒 **100% Offline & Private**: Bundled locally with zero telemetry or remote CDN requirements.

---

## 🚀 Quick Start

1. Install the extension from the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com) or [Open VSX Registry](https://open-vsx.org).
2. Create a new file with the `.markdy` extension (e.g. `architecture.markdy`).
3. Press `Cmd+K V` (macOS) or `Ctrl+K V` (Windows/Linux) or click the **Preview** icon in the editor title bar to open the live animated diagram preview.

### Example MarkdyScript

```markdy
scene "Modern Cloud Architecture" theme=midnight
layout LR

browser Client "Global Client"
gateway ApiGateway "Kong Edge"
service AuthService "Auth Service"
database MainDB "PostgreSQL 16"
queue TaskQueue "Kafka Stream"

beat auth "User Authentication":
  show $nodes stagger=60ms
  frame Client ApiGateway AuthService zoom=1.12
  Client -> ApiGateway "POST /login" -> AuthService "validate JWT"
  AuthService -> MainDB "SELECT credentials"
  AuthService <- MainDB "user record"
  Client <- ApiGateway "200 OK (JWT Token)"

beat async_dispatch "Async Background Job":
  frame ApiGateway TaskQueue zoom=1.15
  ApiGateway ~> TaskQueue "dispatch async task"
  glow TaskQueue color=#38bdf8
```

---

## ⌨️ Keyboard Shortcuts & Commands

| Command | Keybinding | Description |
|---|---|---|
| `Markdy: Open Live Preview to the Side` | `Cmd+K V` / `Ctrl+K V` | Opens the live animated preview panel next to the editor |
| `Markdy: Open Live Preview` | — | Opens preview in the active editor column |
| `Markdy: Export Current Diagram to SVG` | — | Exports current diagram to a vector `.svg` file |
| `Markdy: Export Current Diagram to PNG` | — | Exports current diagram to a `.png` raster image |
| `Markdy: Restart Language Server` | — | Restarts the background language server worker |

---

## ⚙️ Extension Settings

- `markdy.preview.autoplay`: Automatically play diagram animations when preview opens (default: `true`).
- `markdy.preview.loop`: Loop diagram animations continuously (default: `true`).
- `markdy.preview.progressBar`: Show interactive playback progress bar and scrubber (default: `true`).
- `markdy.preview.theme`: Theme override for preview panel (`paper`, `editorial`, `midnight`, `blueprint`, `terminal`, `graphite`, `nebula`, `sketchy`).

---

## 📄 License

MIT © [Hoang Yell](https://hoangyell.com)
