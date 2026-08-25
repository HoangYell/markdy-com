import * as vscode from "vscode";
import { getWebviewHtml } from "./webviewHtml";

export class MarkdyPreviewPanel {
  public static currentPanel: MarkdyPreviewPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _updateTimeout: NodeJS.Timeout | undefined;

  public static createOrShow(extensionUri: vscode.Uri, viewColumn: vscode.ViewColumn = vscode.ViewColumn.Beside) {
    if (MarkdyPreviewPanel.currentPanel) {
      MarkdyPreviewPanel.currentPanel._panel.reveal(viewColumn);
      MarkdyPreviewPanel.currentPanel.update();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      "markdyPreview",
      "Markdy Preview",
      viewColumn,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, "dist")],
      }
    );

    MarkdyPreviewPanel.currentPanel = new MarkdyPreviewPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._panel.webview.html = getWebviewHtml(this._panel.webview, this._extensionUri);

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case "ready":
            this.update();
            break;

          case "requestExportSvg":
            vscode.commands.executeCommand("markdy.exportSvg");
            break;

          case "requestExportPng":
            vscode.commands.executeCommand("markdy.exportPng");
            break;

          case "svgExportReady":
            await this._saveSvgFile(message.data);
            break;

          case "pngExportReady":
            await this._savePngFile(message.dataUrl);
            break;

          case "exportError":
            vscode.window.showErrorMessage(`Markdy Export Error: ${message.message}`);
            break;
        }
      },
      null,
      this._disposables
    );

    vscode.workspace.onDidChangeTextDocument(
      (e) => {
        const activeDoc = vscode.window.activeTextEditor?.document;
        if (activeDoc && e.document.uri.toString() === activeDoc.uri.toString()) {
          this.scheduleUpdate();
        }
      },
      null,
      this._disposables
    );

    vscode.window.onDidChangeActiveTextEditor(
      (editor) => {
        if (editor && editor.document.languageId === "markdy") {
          this.update();
        }
      },
      null,
      this._disposables
    );
  }

  public scheduleUpdate() {
    if (this._updateTimeout) {
      clearTimeout(this._updateTimeout);
    }
    this._updateTimeout = setTimeout(() => {
      this.update();
    }, 120);
  }

  public update() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const doc = editor.document;
    if (doc.languageId !== "markdy") return;

    const code = doc.getText();
    const config = vscode.workspace.getConfiguration("markdy");

    this._panel.webview.postMessage({
      type: "update",
      code,
      options: {
        autoplay: config.get<boolean>("preview.autoplay", true),
        loop: config.get<boolean>("preview.loop", true),
        progressBar: config.get<boolean>("preview.progressBar", true),
      },
    });
  }

  public triggerSvgExport() {
    this._panel.webview.postMessage({ type: "exportSvg" });
  }

  public triggerPngExport() {
    this._panel.webview.postMessage({ type: "exportPng" });
  }

  private async _saveSvgFile(svgContent: string) {
    const uri = await vscode.window.showSaveDialog({
      filters: { "Scalable Vector Graphics": ["svg"] },
      defaultUri: vscode.Uri.file("diagram.svg"),
    });

    if (uri) {
      const enc = new TextEncoder();
      await vscode.workspace.fs.writeFile(uri, enc.encode(svgContent));
      vscode.window.showInformationMessage(`Exported SVG successfully: ${uri.fsPath}`);
    }
  }

  private async _savePngFile(dataUrl: string) {
    const uri = await vscode.window.showSaveDialog({
      filters: { "PNG Image": ["png"] },
      defaultUri: vscode.Uri.file("diagram.png"),
    });

    if (uri) {
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      await vscode.workspace.fs.writeFile(uri, buffer);
      vscode.window.showInformationMessage(`Exported PNG successfully: ${uri.fsPath}`);
    }
  }

  public dispose() {
    MarkdyPreviewPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) x.dispose();
    }
  }
}
