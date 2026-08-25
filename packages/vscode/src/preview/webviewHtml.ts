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
      padding: 8px 16px;
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
    }

    button, select {
      background: var(--btn-sec-bg);
      color: var(--btn-sec-fg);
      border: 1px solid var(--border-color);
      padding: 4px 10px;
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
      transition: opacity 0.2s ease;
    }

    .hidden {
      display: none !important;
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div class="toolbar-group">
      <button id="btn-play-pause" title="Play/Pause Animation">⏸ Pause</button>
      <button id="btn-restart" title="Restart Diagram from Beginning">↺ Restart</button>
      <select id="theme-select" title="Override Theme">
        <option value="auto">Theme: Auto</option>
        <option value="night">Night</option>
        <option value="light">Light</option>
        <option value="cyber">Cyber</option>
        <option value="slate">Slate</option>
        <option value="tokyo">Tokyo</option>
        <option value="nord">Nord</option>
        <option value="monokai">Monokai</option>
      </select>
    </div>
    <div class="toolbar-group">
      <button id="btn-export-svg" title="Export as Vector SVG">Export SVG</button>
      <button id="btn-export-png" title="Export as High-Res PNG">Export PNG</button>
    </div>
  </div>

  <div class="preview-stage">
    <div id="error-overlay" class="error-banner hidden">
      ⚠️ <span id="error-message">Syntax error</span>
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
