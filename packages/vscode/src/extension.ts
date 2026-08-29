import * as path from "path";
import * as vscode from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";
import { MarkdyPreviewPanel } from "./preview/previewPanel";
import { registerExportCommands } from "./commands/exportCommands";
import { registerImportCommands } from "./commands/importCommands";
import { registerTemplateCommands } from "./commands/templateCommands";
import { registerAiCommands } from "./commands/aiCommands";
import { registerShareCommands } from "./commands/shareCommands";
import { registerCodeLensProvider } from "./providers/codeLensProvider";

let client: LanguageClient | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log("Markdy extension is activating...");

  // 1. Language Server Setup
  const serverModule = context.asAbsolutePath(path.join("dist", "server.js"));
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: { execArgv: ["--nolazy", "--inspect=6009"] },
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: "file", language: "markdy" },
      { scheme: "untitled", language: "markdy" },
    ],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher("**/*.markdy"),
    },
  };

  client = new LanguageClient(
    "markdyLanguageServer",
    "Markdy Language Server",
    serverOptions,
    clientOptions
  );

  client.start();

  // 2. Preview Commands
  const previewToSideCmd = vscode.commands.registerCommand(
    "markdy.showPreviewToSide",
    async (uri?: vscode.Uri) => {
      let targetDoc: vscode.TextDocument | undefined;
      if (uri) {
        try {
          targetDoc = await vscode.workspace.openTextDocument(uri);
          await vscode.window.showTextDocument(targetDoc, vscode.ViewColumn.One, true);
        } catch (e) {
          console.error("Failed to open document for preview:", e);
        }
      }
      MarkdyPreviewPanel.createOrShow(context.extensionUri, vscode.ViewColumn.Beside, targetDoc);
    }
  );

  const previewCmd = vscode.commands.registerCommand(
    "markdy.showPreview",
    async (uri?: vscode.Uri) => {
      let targetDoc: vscode.TextDocument | undefined;
      if (uri) {
        try {
          targetDoc = await vscode.workspace.openTextDocument(uri);
          await vscode.window.showTextDocument(targetDoc, vscode.ViewColumn.One, true);
        } catch (e) {
          console.error("Failed to open document for preview:", e);
        }
      }
      MarkdyPreviewPanel.createOrShow(context.extensionUri, vscode.ViewColumn.Active, targetDoc);
    }
  );

  const restartServerCmd = vscode.commands.registerCommand(
    "markdy.restartServer",
    async () => {
      if (client) {
        await client.stop();
        await client.start();
        vscode.window.showInformationMessage("Markdy Language Server restarted.");
      }
    }
  );

  // 3. Export Commands (SVG, PNG, Clipboard)
  registerExportCommands(context);

  // 4. Ingestion / Transpilation Commands (Mermaid, Docker Compose, K8s, Terraform, Draw.io)
  registerImportCommands(context);

  // 5. Template Commands (Showcase QuickPick & New Diagram)
  registerTemplateCommands(context);

  // 6. AI Architecture Commands (Prompt Builder & Repair Bundle)
  registerAiCommands(context);

  // 7. Web Studio Sharing Commands (URL Hash & Browser Opener)
  registerShareCommands(context);

  // 8. Markdown & MDX CodeLens Provider
  registerCodeLensProvider(context);

  // 9. Status Bar Item for Quick Preview Toggle
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = "markdy.showPreviewToSide";
  statusBarItem.text = "$(play) Markdy Preview";
  statusBarItem.tooltip = "Open Markdy Live Animated Preview (Cmd+K V / Ctrl+K V)";

  const updateStatusBar = (editor: vscode.TextEditor | undefined) => {
    if (editor && (editor.document.languageId === "markdy" || editor.document.fileName.endsWith(".markdy") || editor.document.fileName.endsWith(".mdy"))) {
      statusBarItem.show();
    } else {
      statusBarItem.hide();
    }
  };

  updateStatusBar(vscode.window.activeTextEditor);
  const changeEditorSub = vscode.window.onDidChangeActiveTextEditor(updateStatusBar);

  context.subscriptions.push(previewToSideCmd, previewCmd, restartServerCmd, statusBarItem, changeEditorSub);
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
