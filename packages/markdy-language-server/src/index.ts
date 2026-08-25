import {
  BEAT_CUE_KEYWORDS,
  NODE_KINDS,
  ParseError,
  parse,
  diagnoseMarkdyCode,
  PLAYER_FLAT_KEYS,
  PLAYER_GROUPS,
  getIntelliCodeCompletions,
  predictNextLineSuggestion,
  type Diagnostic,
  type IntelliCodeItemKind,
} from "@markdy/core";
import {
  CodeAction,
  CodeActionKind,
  CompletionItem,
  CompletionItemKind,
  InsertTextFormat,
  MarkupKind,
  createConnection,
  DiagnosticSeverity,
  type DocumentSymbol,
  ProposedFeatures,
  SymbolKind,
  TextDocumentSyncKind,
  TextDocuments,
} from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

function mapKindToLsp(kind: IntelliCodeItemKind): CompletionItemKind {
  switch (kind) {
    case "keyword":
    case "directive":
      return CompletionItemKind.Keyword;
    case "nodeKind":
      return CompletionItemKind.Class;
    case "node":
      return CompletionItemKind.Variable;
    case "group":
      return CompletionItemKind.Module;
    case "tech":
      return CompletionItemKind.Struct;
    case "flowOp":
      return CompletionItemKind.Operator;
    case "cue":
      return CompletionItemKind.Function;
    case "selector":
      return CompletionItemKind.Value;
    case "theme":
      return CompletionItemKind.Color;
    case "layout":
    case "diagramType":
      return CompletionItemKind.Enum;
    case "attribute":
      return CompletionItemKind.Property;
    case "snippet":
      return CompletionItemKind.Snippet;
    case "value":
      return CompletionItemKind.Value;
    default:
      return CompletionItemKind.Text;
  }
}

function parseDiagnostics(text: string): Diagnostic[] {
  const report = diagnoseMarkdyCode(text, { checkArchitecture: true });
  return report.issues.map((i) => ({
    severity: i.severity === "error" ? "error" : "warning",
    message: i.suggestion ? `${i.message} (💡 Suggestion: ${i.suggestion})` : i.message,
    line: i.line,
  }));
}

function buildDocumentSymbols(text: string): DocumentSymbol[] {
  const symbols: DocumentSymbol[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw || raw.startsWith("//")) continue;

    // Node symbol
    const nodeMatch = /^(\w[\w.-]*)\s+(\w[\w.-]*)(?:\s+"([^"]*)")?/i.exec(raw);
    if (
      nodeMatch &&
      !["scene", "layout", "group", "beat", "style", "pattern", "use", "var", "edge", "theme"].includes(nodeMatch[1].toLowerCase()) &&
      NODE_KINDS.has(nodeMatch[1].toLowerCase())
    ) {
      symbols.push({
        name: `${nodeMatch[2]} (${nodeMatch[1]})`,
        detail: nodeMatch[3] || nodeMatch[2],
        kind: SymbolKind.Class,
        range: { start: { line: i, character: 0 }, end: { line: i, character: raw.length } },
        selectionRange: { start: { line: i, character: 0 }, end: { line: i, character: raw.length } },
      });
      continue;
    }

    // Group symbol
    const groupMatch = /^group\s+([\w.-]+)(?:\s+"([^"]*)")?:/i.exec(raw);
    if (groupMatch) {
      symbols.push({
        name: `group: ${groupMatch[1]}`,
        detail: groupMatch[2] || groupMatch[1],
        kind: SymbolKind.Namespace,
        range: { start: { line: i, character: 0 }, end: { line: i, character: raw.length } },
        selectionRange: { start: { line: i, character: 0 }, end: { line: i, character: raw.length } },
      });
      continue;
    }

    // Beat symbol
    const beatMatch = /^beat\s+([\w.-]+)(?:\s+"([^"]*)")?:/i.exec(raw);
    if (beatMatch) {
      symbols.push({
        name: `beat: ${beatMatch[1]}`,
        detail: beatMatch[2] || beatMatch[1],
        kind: SymbolKind.Event,
        range: { start: { line: i, character: 0 }, end: { line: i, character: raw.length } },
        selectionRange: { start: { line: i, character: 0 }, end: { line: i, character: raw.length } },
      });
    }
  }
  return symbols;
}

connection.onInitialize(() => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Incremental,
    completionProvider: {
      triggerCharacters: [" ", ".", ":", "-", ">", "<", "~", "$", "=", "#"],
      resolveProvider: false,
    },
    codeActionProvider: true,
    documentSymbolProvider: true,
    hoverProvider: true,
  },
}));

connection.onCodeAction((params) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];
  const text = doc.getText();
  const report = diagnoseMarkdyCode(text, { checkArchitecture: true });

  const actions: CodeAction[] = [];

  for (const issue of report.issues) {
    if (issue.fix && Math.abs(issue.line - 1 - params.range.start.line) <= 1) {
      actions.push({
        title: `💡 Fix: ${issue.suggestion || issue.message}`,
        kind: CodeActionKind.QuickFix,
        isPreferred: true,
        edit: {
          changes: {
            [params.textDocument.uri]: [
              {
                range: {
                  start: { line: Math.max(0, issue.line - 1), character: 0 },
                  end: { line: Math.max(0, issue.line - 1), character: 120 },
                },
                newText: issue.fix.replacement,
              },
            ],
          },
        },
      });
    }
  }

  if (report.repairedCode && !report.isValid) {
    actions.push({
      title: "✨ Auto-Repair Entire Diagram (All Issues)",
      kind: CodeActionKind.SourceFixAll,
      edit: {
        changes: {
          [params.textDocument.uri]: [
            {
              range: {
                start: { line: 0, character: 0 },
                end: { line: doc.lineCount, character: 0 },
              },
              newText: report.repairedCode,
            },
          ],
        },
      },
    });
  }

  return actions;
});

documents.onDidChangeContent((change) => {
  const text = change.document.getText();
  const diagnostics = parseDiagnostics(text).map((d) => ({
    severity: d.severity === "error" ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
    range: {
      start: { line: Math.max(0, d.line - 1), character: 0 },
      end: { line: Math.max(0, d.line - 1), character: 120 },
    },
    message: d.message,
    source: "markdy",
  }));

  connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
});

connection.onCompletion((params) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];

  const text = doc.getText();
  const line = params.position.line;
  const col = params.position.character;

  const rawCompletions = getIntelliCodeCompletions(text, line, col);

  const completionItems: CompletionItem[] = rawCompletions.map((item, idx) => {
    const boost = item.boost ?? 5;
    const sortPrefix = (100 - boost).toString().padStart(3, "0");

    return {
      label: item.label,
      insertText: item.insertText,
      insertTextFormat: item.isSnippet ? InsertTextFormat.Snippet : InsertTextFormat.PlainText,
      kind: mapKindToLsp(item.kind),
      detail: item.detail,
      documentation: item.documentation
        ? { kind: MarkupKind.Markdown, value: item.documentation }
        : undefined,
      sortText: `${sortPrefix}_${item.label}`,
      filterText: item.filterText || item.label,
    };
  });

  return completionItems;
});

connection.onDocumentSymbol((params) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];
  return buildDocumentSymbols(doc.getText());
});

connection.onHover((params) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;
  const line = doc.getText().split(/\r?\n/)[params.position.line]?.trim() ?? "";

  if (line.startsWith("scene")) {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: "### `scene` Directive\nDeclares scene-level visual configurations like `theme=midnight`, `layout=LR`, `fps=60`, `speed=1.0`.",
      },
    };
  }
  if (line.startsWith("layout")) {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: "### `layout` Directive\nSets the primary layout direction (`LR` left-to-right, `TB` top-to-bottom, `RL`, `BT`) or topology type (`type=nested`, `type=medallion`).",
      },
    };
  }
  if (line.startsWith("group")) {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: "### `group` Subsystem Boundary\nDeclares a visual security perimeter or cluster enclosing member nodes: `group vpc \"Secure VPC\": Node1 Node2`.",
      },
    };
  }
  if (line.startsWith("beat")) {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: "### `beat` Kinetic Narrative Step\nNamed animation step choreographing flow activations, camera framing, and glows.",
      },
    };
  }
  if (line.startsWith("frame")) {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: "### `frame` Camera Cue\nDirects camera viewport to pan and zoom on specified group or nodes: `frame backend zoom=1.2 dur=600ms`.",
      },
    };
  }
  if (line.startsWith("glow") || line.startsWith("pulse") || line.startsWith("focus")) {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: "### `glow` / `pulse` Highlight Cue\nEmits kinetic light pulses on targeted nodes: `pulse OrderService color=#38bdf8`.",
      },
    };
  }
  if (line.includes("->")) {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: "### `->` Synchronous Request Flow\nRepresents a synchronous HTTP REST, gRPC, or RPC request between nodes.",
      },
    };
  }
  if (line.includes("<-")) {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: "### `<-` Synchronous Response Return\nRepresents a return response payload from target back to source.",
      },
    };
  }
  if (line.includes("~>")) {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: "### `~>` Asynchronous Event / Pub-Sub\nRepresents decoupled event streaming or message queue dispatch.",
      },
    };
  }
  if (line.includes("<->")) {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: "### `<->` Bidirectional Socket\nRepresents full-duplex WebSocket or mutual TLS streaming connection.",
      },
    };
  }
  if (line.includes("..>")) {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: "### `..>` Weak Dependency\nRepresents a dashed architectural reference or dependency link.",
      },
    };
  }
  return null;
});

documents.listen(connection);
connection.listen();
