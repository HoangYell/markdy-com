import * as vscode from "vscode";
import { MarkdyPreviewPanel } from "../preview/previewPanel";

export function registerExportCommands(context: vscode.ExtensionContext) {
  const ensurePreviewAndExecute = (action: (panel: MarkdyPreviewPanel) => void) => {
    const editor = vscode.window.activeTextEditor;
    if (!editor || editor.document.languageId !== "markdy") {
      vscode.window.showWarningMessage("Please open an active .markdy document first.");
      return;
    }

    if (!MarkdyPreviewPanel.currentPanel) {
      MarkdyPreviewPanel.createOrShow(context.extensionUri, vscode.ViewColumn.Beside);
      setTimeout(() => {
        if (MarkdyPreviewPanel.currentPanel) {
          action(MarkdyPreviewPanel.currentPanel);
        }
      }, 500);
    } else {
      action(MarkdyPreviewPanel.currentPanel);
    }
  };

  const exportSvgCmd = vscode.commands.registerCommand("markdy.exportSvg", () => {
    ensurePreviewAndExecute((panel) => panel.triggerSvgExport());
  });

  const exportPngCmd = vscode.commands.registerCommand("markdy.exportPng", () => {
    ensurePreviewAndExecute((panel) => panel.triggerPngExport());
  });

  const exportGifCmd = vscode.commands.registerCommand("markdy.exportGif", () => {
    ensurePreviewAndExecute((panel) => panel.triggerGifExport());
  });

  const copySvgCmd = vscode.commands.registerCommand("markdy.copySvg", () => {
    ensurePreviewAndExecute((panel) => panel.triggerCopySvg());
  });

  const copyPngCmd = vscode.commands.registerCommand("markdy.copyPng", () => {
    ensurePreviewAndExecute((panel) => panel.triggerCopyPng());
  });

  context.subscriptions.push(exportSvgCmd, exportPngCmd, exportGifCmd, copySvgCmd, copyPngCmd);
}
