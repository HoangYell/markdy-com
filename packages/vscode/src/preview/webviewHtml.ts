import * as vscode from "vscode";

export function getWebviewHtml(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, "dist", "preview-runtime.js")
  );

  const nonce = getNonce();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data: blob: https:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>Markdy Diagram Preview</title>
  <style>
    :root {
      --bg-color: var(--vscode-editor-background, #0d1117);
      --fg-color: var(--vscode-editor-foreground, #c9d1d9);
      --border-color: var(--vscode-panel-border, #30363d);
      --btn-bg: var(--vscode-button-background, #238636);
      --btn-fg: var(--vscode-button-foreground, #ffffff);
      --btn-hover: var(--vscode-button-hoverBackground, #2ea043);
      --btn-sec-bg: var(--vscode-button-secondaryBackground, #21262d);
      --btn-sec-fg: var(--vscode-button-secondaryForeground, #c9d1d9);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg-color);
      color: var(--fg-color);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }

    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 6px 12px;
      background: var(--btn-sec-bg);
      border-bottom: 1px solid var(--border-color);
      gap: 8px;
      flex-wrap: wrap;
      z-index: 10;
    }

    .toolbar-group {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    button, select {
      background: var(--btn-sec-bg);
      color: var(--btn-sec-fg);
      border: 1px solid var(--border-color);
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      transition: background 0.15s ease;
    }

    button:hover, select:hover {
      background: var(--btn-hover);
      color: var(--btn-fg);
      border-color: transparent;
    }

    .btn-primary {
      background: var(--btn-bg);
      color: var(--btn-fg);
    }

    .preview-stage {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: auto;
      padding: 24px;
    }

    #diagram-mount {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    .error-banner {
      position: absolute;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: #dc2626;
      color: #ffffff;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 20;
      max-width: 90%;
      text-align: center;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .error-banner:hover {
      background: #ef4444;
      transform: translateX(-50%) scale(1.02);
    }

    .loading-banner {
      position: absolute;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: #2563eb;
      color: #ffffff;
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 20;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .hidden {
      display: none !important;
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div class="toolbar-group">
      <button id="btn-play-pause" title="Play / Pause Animation (Space)">⏸ Pause</button>
      <button id="btn-restart" title="Restart Diagram (R)">↺ Restart</button>
      <button id="btn-prev-beat" title="Previous Narrative Beat (Left / J)">⏮</button>
      <button id="btn-next-beat" title="Next Narrative Beat (Right / L)">⏭</button>
      <button id="btn-fit-view" title="Reset Pan / Zoom to Fit (F)">⛶ Fit</button>
      <select id="speed-select" title="Playback Speed (S)">
        <option value="0.5">0.5x</option>
        <option value="1.0" selected>1.0x</option>
        <option value="1.5">1.5x</option>
        <option value="2.0">2.0x</option>
      </select>
      <select id="theme-select" title="Official Markdy Theme Override (T)">
        <option value="auto">Theme: Auto</option>
        <option value="midnight">Midnight</option>
        <option value="paper">Paper</option>
        <option value="blueprint">Blueprint</option>
        <option value="nebula">Nebula</option>
        <option value="editorial">Editorial</option>
        <option value="graphite">Graphite</option>
        <option value="terminal">Terminal</option>
        <option value="sketchy">Sketchy</option>
      </select>
    </div>
    <div class="toolbar-group">
      <button id="btn-export-svg" class="btn-primary" title="Export as Vector SVG">SVG</button>
      <button id="btn-export-png" title="Export as High-Res PNG">PNG</button>
      <button id="btn-copy-svg" title="Copy SVG to Clipboard">Copy SVG</button>
      <button id="btn-copy-png" title="Copy PNG to Clipboard">Copy PNG</button>
    </div>
  </div>

  <div class="preview-stage">
    <div id="error-overlay" class="error-banner hidden" title="Click to reveal this line in editor">
      ⚠️ <span id="error-message">Syntax error</span>
    </div>
    <div id="loading-overlay" class="loading-banner hidden">
      ⏳ <span id="loading-message">Loading...</span>
    </div>
    <div id="diagram-mount"></div>
  </div>

  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function getNonce(): string {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
