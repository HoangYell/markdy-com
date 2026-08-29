import * as vscode from "vscode";
import { analyzeAndBuildRepairPrompt } from "@markdy/core";

export function registerAiCommands(context: vscode.ExtensionContext) {
  const generateAiPromptCmd = vscode.commands.registerCommand("markdy.generateAiPrompt", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage("Please open an active .markdy document first.");
      return;
    }

    const doc = editor.document;
    const code = doc.getText();

    const userObjective = await vscode.window.showInputBox({
      title: "AI Architecture Prompt Generator",
      prompt: "Describe what you want the AI to design, refactor, or animate in this diagram:",
      placeHolder: "e.g., Add Redis caching between Gateway and AuthService with async Kafka billing event...",
      ignoreFocusOut: true,
    });

    const bundle = analyzeAndBuildRepairPrompt(code);

    let prompt = `You are an expert software systems architect and MarkdyScript engineer.\n\n`;
    if (userObjective && userObjective.trim()) {
      prompt += `### User Objective:\n${userObjective.trim()}\n\n`;
    }

    prompt += `### Current MarkdyScript Code:\n\`\`\`markdy\n${code}\n\`\`\`\n\n`;

    if (!bundle.isValid) {
      if (bundle.syntaxErrors.length > 0) {
        prompt += `### Detected Syntax Issues:\n${bundle.syntaxErrors.map((e) => `- ${e}`).join("\n")}\n\n`;
      }
      if (bundle.archViolations.length > 0) {
        prompt += `### Detected Architecture Governance Warnings:\n${bundle.archViolations.map((v) => `- ${v.message}`).join("\n")}\n\n`;
      }
    }

    prompt += `### Authoritative Markdy Rules (AGENT.md):\n`;
    prompt += `1. Nodes must be declared with a valid kind (e.g. \`service Svc "Name"\`, \`database DB "Name"\`, \`queue Q "Name"\`, \`gateway Gw "Name"\`, \`browser Client "Name"\`, \`pod Pod "Name"\`).\n`;
    prompt += `2. Flow operators: \`->\` (sync request), \`<-\` (response), \`~>\` (async event), \`<->\` (bidirectional), \`..>\` (dependency).\n`;
    prompt += `3. Narrative animation beats use \`beat <name> "Title":\` followed by 2-space indented cues (\`show $nodes stagger=60ms\`, \`frame <targets> zoom=1.2\`, \`pulse <target> color=#hex\`).\n`;
    prompt += `4. Avoid architectural anti-patterns (clients must not directly query databases; decouple with services/gateways).\n`;
    prompt += `5. Return only valid, runnable MarkdyScript enclosed in a single \`\`\`markdy code block.\n`;

    await vscode.env.clipboard.writeText(prompt);
    vscode.window.showInformationMessage(
      "AI Architecture Prompt copied to clipboard! Paste into Claude, Cursor, Copilot, or ChatGPT."
    );
  });

  context.subscriptions.push(generateAiPromptCmd);
}
