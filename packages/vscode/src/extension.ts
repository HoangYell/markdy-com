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
    () => {
      MarkdyPreviewPanel.createOrShow(context.extensionUri, vscode.ViewColumn.Beside);
    }
  );

  const previewCmd = vscode.commands.registerCommand("markdy.showPreview", () => {
    MarkdyPreviewPanel.createOrShow(context.extensionUri, vscode.ViewColumn.Active);
  });

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

  // 3. Export Commands (SVG, PNG, GIF, Clipboard)
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

  context.subscriptions.push(previewToSideCmd, previewCmd, restartServerCmd);
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
