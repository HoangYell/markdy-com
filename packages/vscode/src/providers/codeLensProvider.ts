import * as vscode from "vscode";
import { MarkdyPreviewPanel } from "../preview/previewPanel";

export class MarkdyCodeLensProvider implements vscode.CodeLensProvider {
  private _context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
  }

  public provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];
    const text = document.getText();
    const regex = /```(?:markdy|mdy)\b([\s\S]*?)```/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const startPos = document.positionAt(match.index);
      const endPos = document.positionAt(match.index + match[0].length);
      const range = new vscode.Range(startPos, endPos);
      const snippetCode = match[1].trim();

      // 1. Preview CodeLens
      const previewLens = new vscode.CodeLens(range, {
        title: "▶ Open Markdy Preview",
        command: "markdy.previewSnippet",
        arguments: [snippetCode],
      });

      // 2. Export SVG CodeLens
      const exportLens = new vscode.CodeLens(range, {
        title: "📐 Export SVG",
        command: "markdy.exportSnippetSvg",
        arguments: [snippetCode],
      });

      codeLenses.push(previewLens, exportLens);
    }

    return codeLenses;
  }
}

export function registerCodeLensProvider(context: vscode.ExtensionContext) {
  const provider = new MarkdyCodeLensProvider(context);

  const previewSnippetCmd = vscode.commands.registerCommand(
    "markdy.previewSnippet",
    async (code: string) => {
      const doc = await vscode.workspace.openTextDocument({
        language: "markdy",
        content: code,
      });
      await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
      MarkdyPreviewPanel.createOrShow(context.extensionUri, vscode.ViewColumn.Beside);
    }
  );

  const exportSnippetSvgCmd = vscode.commands.registerCommand(
    "markdy.exportSnippetSvg",
    async (code: string) => {
      const doc = await vscode.workspace.openTextDocument({
        language: "markdy",
        content: code,
      });
      await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
      MarkdyPreviewPanel.createOrShow(context.extensionUri, vscode.ViewColumn.Beside);
      setTimeout(() => {
        MarkdyPreviewPanel.currentPanel?.triggerSvgExport();
      }, 400);
    }
  );

  const selector: vscode.DocumentSelector = [
    { language: "markdown", scheme: "file" },
    { language: "markdown", scheme: "untitled" },
    { language: "mdx", scheme: "file" },
    { language: "mdx", scheme: "untitled" },
  ];

  const disposable = vscode.languages.registerCodeLensProvider(selector, provider);

  context.subscriptions.push(disposable, previewSnippetCmd, exportSnippetSvgCmd);
}
