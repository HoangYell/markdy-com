import * as vscode from "vscode";
import {
  transpileMermaidToMarkdy,
  transpileDockerComposeToMarkdy,
  transpileKubernetesManifestsToMarkdy,
  transpileTerraformStateToMarkdy,
  transpileDrawioToMarkdy,
} from "@markdy/compat";
import { MarkdyPreviewPanel } from "../preview/previewPanel";

async function openTranspiledDocument(code: string, context: vscode.ExtensionContext, titleHint = "Imported Diagram") {
  const doc = await vscode.workspace.openTextDocument({
    language: "markdy",
    content: code,
  });
  await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
  MarkdyPreviewPanel.createOrShow(context.extensionUri, vscode.ViewColumn.Beside);
  vscode.window.showInformationMessage(`Successfully imported and transpiled to Markdy (${titleHint})!`);
}

async function readFileOrPrompt(uri: vscode.Uri | undefined, promptTitle: string, placeholder: string): Promise<string | undefined> {
  if (uri && uri.fsPath) {
    try {
      const bytes = await vscode.workspace.fs.readFile(uri);
      return new TextDecoder().decode(bytes);
    } catch (err: any) {
      vscode.window.showErrorMessage(`Failed to read file: ${err.message || String(err)}`);
      return undefined;
    }
  }

  // Check clipboard first
  const clipboardText = await vscode.env.clipboard.readText();
  const initialValue = clipboardText.trim();

  const source = await vscode.window.showInputBox({
    title: promptTitle,
    prompt: `Paste ${placeholder} code or press Enter to use clipboard contents`,
    value: initialValue.length > 0 && initialValue.length < 500 ? initialValue : "",
    placeHolder: `Paste ${placeholder} content here...`,
    ignoreFocusOut: true,
  });

  if (!source && !initialValue) {
    return undefined;
  }

  return source || initialValue;
}

export function registerImportCommands(context: vscode.ExtensionContext) {
  // 1. Mermaid Transpiler
  const importMermaidCmd = vscode.commands.registerCommand("markdy.importMermaid", async (uri?: vscode.Uri) => {
    const source = await readFileOrPrompt(uri, "Import Mermaid Diagram", "Mermaid flowchart or sequence");
    if (!source) return;

    try {
      const result = transpileMermaidToMarkdy(source, "Mermaid Imported Architecture");
      await openTranspiledDocument(result.code, context, "Mermaid");
    } catch (err: any) {
      vscode.window.showErrorMessage(`Mermaid Import Error: ${err.message || String(err)}`);
    }
  });

  // 2. Docker Compose Transpiler
  const importDockerComposeCmd = vscode.commands.registerCommand("markdy.importDockerCompose", async (uri?: vscode.Uri) => {
    const source = await readFileOrPrompt(uri, "Import Docker Compose", "docker-compose.yml YAML");
    if (!source) return;

    try {
      const code = transpileDockerComposeToMarkdy(source, "Container Services Architecture");
      await openTranspiledDocument(code, context, "Docker Compose");
    } catch (err: any) {
      vscode.window.showErrorMessage(`Docker Compose Import Error: ${err.message || String(err)}`);
    }
  });

  // 3. Kubernetes Manifest Transpiler
  const importKubernetesCmd = vscode.commands.registerCommand("markdy.importKubernetes", async (uri?: vscode.Uri) => {
    const source = await readFileOrPrompt(uri, "Import Kubernetes Manifests", "Kubernetes Resource YAML");
    if (!source) return;

    try {
      const code = transpileKubernetesManifestsToMarkdy(source, "Kubernetes Cluster Architecture");
      await openTranspiledDocument(code, context, "Kubernetes");
    } catch (err: any) {
      vscode.window.showErrorMessage(`Kubernetes Import Error: ${err.message || String(err)}`);
    }
  });

  // 4. Terraform State Transpiler
  const importTerraformCmd = vscode.commands.registerCommand("markdy.importTerraform", async (uri?: vscode.Uri) => {
    const source = await readFileOrPrompt(uri, "Import Terraform State", "terraform.tfstate JSON");
    if (!source) return;

    try {
      const code = transpileTerraformStateToMarkdy(source, "Cloud Infrastructure Topology");
      await openTranspiledDocument(code, context, "Terraform");
    } catch (err: any) {
      vscode.window.showErrorMessage(`Terraform Import Error: ${err.message || String(err)}`);
    }
  });

  // 5. Draw.io XML Transpiler
  const importDrawioCmd = vscode.commands.registerCommand("markdy.importDrawio", async (uri?: vscode.Uri) => {
    const source = await readFileOrPrompt(uri, "Import Draw.io XML Graph", "Draw.io XML diagram");
    if (!source) return;

    try {
      const result = await transpileDrawioToMarkdy(source, "Draw.io Imported Architecture");
      await openTranspiledDocument(result.code, context, "Draw.io");
    } catch (err: any) {
      vscode.window.showErrorMessage(`Draw.io Import Error: ${err.message || String(err)}`);
    }
  });

  // 6. Universal Architecture Ingestion Wizard
  const importArchCmd = vscode.commands.registerCommand("markdy.importArchitecture", async () => {
    const choice = await vscode.window.showQuickPick(
      [
        { label: "⚡ Mermaid Diagram", description: "Flowcharts, sequence diagrams, state graphs (.mermaid, .mmd)", id: "mermaid" },
        { label: "🐳 Docker Compose", description: "Containerized microservice stacks (docker-compose.yml)", id: "compose" },
        { label: "☸️ Kubernetes Manifests", description: "Deployments, Services, Ingress, Pods (k8s YAML)", id: "k8s" },
        { label: "🏗️ Terraform State", description: "Provisioned cloud infrastructure (terraform.tfstate)", id: "terraform" },
        { label: "📐 Draw.io XML", description: "Exported Draw.io XML or uncompressed models (.drawio)", id: "drawio" },
      ],
      {
        placeHolder: "Select source format to transpile into animated MarkdyScript diagram",
      }
    );

    if (!choice) return;

    switch (choice.id) {
      case "mermaid":
        vscode.commands.executeCommand("markdy.importMermaid");
        break;
      case "compose":
        vscode.commands.executeCommand("markdy.importDockerCompose");
        break;
      case "k8s":
        vscode.commands.executeCommand("markdy.importKubernetes");
        break;
      case "terraform":
        vscode.commands.executeCommand("markdy.importTerraform");
        break;
      case "drawio":
        vscode.commands.executeCommand("markdy.importDrawio");
        break;
    }
  });

  context.subscriptions.push(
    importMermaidCmd,
    importDockerComposeCmd,
    importKubernetesCmd,
    importTerraformCmd,
    importDrawioCmd,
    importArchCmd
  );
}
