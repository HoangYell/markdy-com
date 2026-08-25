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
scene title="Modern Cloud Architecture"
  theme "night"
  direction LR

  user client
  gateway api_gateway
  service auth_service
  database main_db
  queue task_queue

  client -> api_gateway "HTTPS request"
  api_gateway -> auth_service "validate JWT"
  api_gateway -> main_db "read/write"
  api_gateway ~> task_queue "dispatch async job"

beat "User Authentication":
  show client, api_gateway
  glow api_gateway
  client -> api_gateway "POST /login"

beat "Database Query":
  show auth_service, main_db
  api_gateway -> auth_service
  auth_service -> main_db
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
- `markdy.preview.theme`: Theme override for preview panel (`auto`, `night`, `light`, `cyber`, `slate`, `tokyo`, `nord`, `monokai`).

---

## 📄 License

MIT © [Hoang Yell](https://hoangyell.com)
