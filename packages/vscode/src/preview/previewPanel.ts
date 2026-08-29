import * as vscode from "vscode";
import { getWebviewHtml } from "./webviewHtml";

export class MarkdyPreviewPanel {
  public static currentPanel: MarkdyPreviewPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _currentDocument?: vscode.TextDocument;
  private _disposables: vscode.Disposable[] = [];
  private _updateTimeout: NodeJS.Timeout | undefined;

  public static createOrShow(
    extensionUri: vscode.Uri,
    viewColumn: vscode.ViewColumn = vscode.ViewColumn.Beside,
    targetDoc?: vscode.TextDocument
  ) {
    if (MarkdyPreviewPanel.currentPanel) {
      MarkdyPreviewPanel.currentPanel._panel.reveal(viewColumn);
      if (targetDoc) {
        MarkdyPreviewPanel.currentPanel._currentDocument = targetDoc;
      }
      MarkdyPreviewPanel.currentPanel.update(targetDoc);
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

    MarkdyPreviewPanel.currentPanel = new MarkdyPreviewPanel(panel, extensionUri, targetDoc);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, initialDoc?: vscode.TextDocument) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._currentDocument = initialDoc;

    this._panel.webview.html = getWebviewHtml(this._panel.webview, this._extensionUri);

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case "ready":
            this.update(this._currentDocument);
            break;

          case "requestExportSvg":
            vscode.commands.executeCommand("markdy.exportSvg");
            break;

          case "requestExportPng":
            vscode.commands.executeCommand("markdy.exportPng");
            break;

          case "requestExportGif":
            vscode.commands.executeCommand("markdy.exportGif");
            break;

          case "requestCopySvg":
            vscode.commands.executeCommand("markdy.copySvg");
            break;

          case "requestCopyPng":
            vscode.commands.executeCommand("markdy.copyPng");
            break;

          case "svgExportReady":
            await this._saveSvgFile(message.data);
            break;

          case "pngExportReady":
            await this._savePngFile(message.dataUrl);
            break;

          case "gifExportReady":
            await this._saveGifFile(message.dataUrl);
            break;

          case "svgCopied":
            await vscode.env.clipboard.writeText(message.data);
            vscode.window.showInformationMessage("Markdy SVG copied to clipboard!");
            break;

          case "pngCopied":
            await vscode.env.clipboard.writeText(message.dataUrl);
            vscode.window.showInformationMessage("Markdy PNG Data URL copied to clipboard!");
            break;

          case "exportError":
            vscode.window.showErrorMessage(`Markdy Export Error: ${message.message}`);
            break;

          case "revealLine":
            if (typeof message.line === "number" && message.line > 0) {
              const editor = vscode.window.visibleTextEditors.find(
                (e) => this._currentDocument && e.document.uri.toString() === this._currentDocument.uri.toString()
              ) || vscode.window.activeTextEditor;

              if (editor) {
                const targetLine = Math.min(Math.max(0, message.line - 1), editor.document.lineCount - 1);
                const lineRange = editor.document.lineAt(targetLine).range;
                editor.selection = new vscode.Selection(lineRange.start, lineRange.end);
                editor.revealRange(lineRange, vscode.TextEditorRevealType.InCenter);
                vscode.window.showTextDocument(editor.document, editor.viewColumn, false);
              }
            }
            break;
        }
      },
      null,
      this._disposables
    );

    vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (this._currentDocument && e.document.uri.toString() === this._currentDocument.uri.toString()) {
          this.scheduleUpdate(e.document);
        } else {
          const activeDoc = vscode.window.activeTextEditor?.document;
          if (activeDoc && (activeDoc.languageId === "markdy" || activeDoc.fileName.endsWith(".markdy") || activeDoc.fileName.endsWith(".mdy")) && e.document.uri.toString() === activeDoc.uri.toString()) {
            this.scheduleUpdate(activeDoc);
          }
        }
      },
      null,
      this._disposables
    );

    vscode.window.onDidChangeActiveTextEditor(
      (editor) => {
        if (editor && (editor.document.languageId === "markdy" || editor.document.fileName.endsWith(".markdy") || editor.document.fileName.endsWith(".mdy"))) {
          this.update(editor.document);
        }
      },
      null,
      this._disposables
    );

    vscode.window.onDidChangeActiveColorTheme(
      () => {
        this.update(this._currentDocument);
      },
      null,
      this._disposables
    );
  }

  public scheduleUpdate(targetDoc?: vscode.TextDocument) {
    if (this._updateTimeout) {
      clearTimeout(this._updateTimeout);
    }
    this._updateTimeout = setTimeout(() => {
      this.update(targetDoc);
    }, 120);
  }

  public update(targetDoc?: vscode.TextDocument) {
    let doc = targetDoc || this._currentDocument;
    if (!doc) {
      const editor = vscode.window.activeTextEditor;
      if (editor && (editor.document.languageId === "markdy" || editor.document.fileName.endsWith(".markdy") || editor.document.fileName.endsWith(".mdy"))) {
        doc = editor.document;
      }
    }

    if (!doc) {
      const visibleMarkdyEditor = vscode.window.visibleTextEditors.find(
        (e) => e.document.languageId === "markdy" || e.document.fileName.endsWith(".markdy") || e.document.fileName.endsWith(".mdy")
      );
      if (visibleMarkdyEditor) {
        doc = visibleMarkdyEditor.document;
      }
    }

    if (!doc) return;

    this._currentDocument = doc;
    const code = doc.getText();
    const config = vscode.workspace.getConfiguration("markdy");

    this._panel.webview.postMessage({
      type: "update",
      code,
      options: {
        autoplay: config.get<boolean>("preview.autoplay", true),
        loop: config.get<boolean>("preview.loop", true),
        progressBar: config.get<boolean>("preview.progressBar", true),
        theme: config.get<string>("preview.theme", "auto"),
      },
    });
  }

  public triggerSvgExport() {
    this._panel.webview.postMessage({ type: "exportSvg" });
  }

  public triggerPngExport() {
    this._panel.webview.postMessage({ type: "exportPng" });
  }

  public triggerGifExport() {
    this._panel.webview.postMessage({ type: "exportGif" });
  }

  public triggerCopySvg() {
    this._panel.webview.postMessage({ type: "copySvg" });
  }

  public triggerCopyPng() {
    this._panel.webview.postMessage({ type: "copyPng" });
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

  private async _saveGifFile(dataUrl: string) {
    const uri = await vscode.window.showSaveDialog({
      filters: { "Animated GIF": ["gif"] },
      defaultUri: vscode.Uri.file("diagram.gif"),
    });

    if (uri) {
      const base64Data = dataUrl.replace(/^data:image\/gif;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      await vscode.workspace.fs.writeFile(uri, buffer);
      vscode.window.showInformationMessage(`Exported Animated GIF successfully: ${uri.fsPath}`);
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
