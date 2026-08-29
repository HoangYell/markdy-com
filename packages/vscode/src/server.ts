import {
  BEAT_CUE_KEYWORDS,
  NODE_KINDS,
  ParseError,
  parse,
  formatScene,
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
  type FoldingRange,
  FoldingRangeKind,
  ProposedFeatures,
  SymbolKind,
  TextDocumentSyncKind,
  TextDocuments,
  type TextEdit,
} from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

function mapKindToLsp(kind: IntelliCodeItemKind): CompletionItemKind {
  switch (kind) {
    case "keyword":
    case "directive":
      return CompletionItemKind.Keyword;
    case "node_kind":
      return CompletionItemKind.Class;
    case "node_ref":
      return CompletionItemKind.Variable;
    case "flow_op":
      return CompletionItemKind.Operator;
    case "beat_cue":
      return CompletionItemKind.Function;
    case "theme":
    case "layout":
    case "prop_key":
    case "prop_val":
    default:
      return CompletionItemKind.Property;
  }
}

function parseDiagnostics(code: string): Diagnostic[] {
  try {
    parse(code);
    return [];
  } catch (err: any) {
    if (err instanceof ParseError) {
      return [
        {
          line: err.line || 1,
          column: err.column || 1,
          message: err.message,
          severity: "error",
        },
      ];
    }
    return [
      {
        line: 1,
        column: 1,
        message: err.message || String(err),
        severity: "error",
      },
    ];
  }
}

function buildDocumentSymbols(text: string): DocumentSymbol[] {
  const lines = text.split(/\r?\n/);
  const symbols: DocumentSymbol[] = [];

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw || raw.startsWith("#")) continue;

    // Scene symbol
    const sceneMatch = /^scene(?:\s+"([^"]*)")?/i.exec(raw);
    if (sceneMatch) {
      symbols.push({
        name: `scene: ${sceneMatch[1] || "Untitled Scene"}`,
        kind: SymbolKind.Package,
        range: { start: { line: i, character: 0 }, end: { line: i, character: raw.length } },
        selectionRange: { start: { line: i, character: 0 }, end: { line: i, character: raw.length } },
      });
      continue;
    }

    // Node symbol
    const nodeMatch = /^(browser|client|mobile|gateway|service|worker|database|cache|queue|topic|storage|bucket|actor|stat|badge|cloud|mesh|external)\s+([\w.-]+)(?:\s+"([^"]*)")?/i.exec(raw);
    if (nodeMatch) {
      symbols.push({
        name: `${nodeMatch[1]}: ${nodeMatch[2]}`,
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

function buildFoldingRanges(text: string): FoldingRange[] {
  const lines = text.split(/\r?\n/);
  const ranges: FoldingRange[] = [];

  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // 1. Comment block folding
    if (trimmed.startsWith("#")) {
      const startLine = i;
      while (i + 1 < lines.length && lines[i + 1].trim().startsWith("#")) {
        i++;
      }
      if (i > startLine) {
        ranges.push({
          startLine,
          endLine: i,
          kind: FoldingRangeKind.Comment,
        });
      }
      i++;
      continue;
    }

    // 2. Block header folding: `beat ...:`, `group ...:`, `player:`
    const isBlockHeader = /^(beat\s+[\w.-]+|group\s+[\w.-]+|player)\b.*:$/i.test(trimmed);
    if (isBlockHeader) {
      const startLine = i;
      let lastContentLine = i;
      i++;
      while (i < lines.length) {
        const nextRaw = lines[i];
        const nextTrimmed = nextRaw.trim();

        if (!nextTrimmed) {
          i++;
          continue;
        }

        const isIndented = /^\s+/.test(nextRaw);
        if (!isIndented) {
          break;
        }

        lastContentLine = i;
        i++;
      }

      if (lastContentLine > startLine) {
        ranges.push({
          startLine,
          endLine: lastContentLine,
          kind: FoldingRangeKind.Region,
        });
      }
      continue;
    }

    i++;
  }

  return ranges;
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
    documentFormattingProvider: true,
    foldingRangeProvider: true,
  },
}));

connection.onDocumentFormatting((params): TextEdit[] => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];
  const text = doc.getText();
  try {
    const ast = parse(text);
    const formatted = formatScene(ast);
    if (formatted === text) return [];
    return [
      {
        range: {
          start: { line: 0, character: 0 },
          end: { line: doc.lineCount, character: 0 },
        },
        newText: formatted,
      },
    ];
  } catch {
    return [];
  }
});

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

connection.onFoldingRanges((params) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];
  return buildFoldingRanges(doc.getText());
});

documents.listen(connection);
connection.listen();
