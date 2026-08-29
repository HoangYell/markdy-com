import * as vscode from "vscode";
import { compressMarkdyToUrlHash } from "@markdy/core";

export function registerShareCommands(context: vscode.ExtensionContext) {
  const openInWebStudioCmd = vscode.commands.registerCommand("markdy.openInWebStudio", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage("Please open an active .markdy document first.");
      return;
    }

    const code = editor.document.getText();
    if (!code.trim()) {
      vscode.window.showWarningMessage("Document is empty.");
      return;
    }

    try {
      const hash = await compressMarkdyToUrlHash(code);
      const url = `https://markdy.com/playground/#${hash}`;
      await vscode.env.openExternal(vscode.Uri.parse(url));
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to generate share URL: ${err.message || String(err)}`);
    }
  });

  const copyShareUrlCmd = vscode.commands.registerCommand("markdy.copyShareUrl", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage("Please open an active .markdy document first.");
      return;
    }

    const code = editor.document.getText();
    if (!code.trim()) {
      vscode.window.showWarningMessage("Document is empty.");
      return;
    }

    try {
      const hash = await compressMarkdyToUrlHash(code);
      const url = `https://markdy.com/playground/#${hash}`;
      await vscode.env.clipboard.writeText(url);
      vscode.window.showInformationMessage("Markdy Web Studio share URL copied to clipboard!");
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to generate share URL: ${err.message || String(err)}`);
    }
  });

  context.subscriptions.push(openInWebStudioCmd, copyShareUrlCmd);
}
