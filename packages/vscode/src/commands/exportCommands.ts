import * as vscode from "vscode";
import { MarkdyPreviewPanel } from "../preview/previewPanel";

export function registerExportCommands(context: vscode.ExtensionContext) {
  const exportSvgCmd = vscode.commands.registerCommand("markdy.exportSvg", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== "markdy") {
      vscode.window.showWarningMessage("Please open an active .markdy document first.");
      return;
    }

    if (!MarkdyPreviewPanel.currentPanel) {
      MarkdyPreviewPanel.createOrShow(context.extensionUri, vscode.ViewColumn.Beside);
      // Wait shortly for webview initialization
      setTimeout(() => {
        MarkdyPreviewPanel.currentPanel?.triggerSvgExport();
      }, 500);
    } else {
      MarkdyPreviewPanel.currentPanel.triggerSvgExport();
    }
  });

  const exportPngCmd = vscode.commands.registerCommand("markdy.exportPng", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== "markdy") {
      vscode.window.showWarningMessage("Please open an active .markdy document first.");
      return;
    }

    if (!MarkdyPreviewPanel.currentPanel) {
      MarkdyPreviewPanel.createOrShow(context.extensionUri, vscode.ViewColumn.Beside);
      setTimeout(() => {
        MarkdyPreviewPanel.currentPanel?.triggerPngExport();
      }, 500);
    } else {
      MarkdyPreviewPanel.currentPanel.triggerPngExport();
    }
  });

  context.subscriptions.push(exportSvgCmd, exportPngCmd);
}
