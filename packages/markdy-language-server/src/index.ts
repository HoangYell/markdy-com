import {
  BEAT_CUE_KEYWORDS,
  NODE_KINDS,
  ParseError,
  parse,
  type Diagnostic,
} from "@markdy/core";
import {
  CompletionItemKind,
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

const KEYWORDS = [
  "scene",
  "layout",
  "group",
  "beat",
  "style",
  "pattern",
  "use",
  "theme",
  "edge",
  "LR",
  "RL",
  "TB",
  "BT",
  "show",
  "hide",
  "glow",
  "focus",
  ...BEAT_CUE_KEYWORDS,
  ...NODE_KINDS,
];

function extractNodes(text: string): Array<{ name: string; kind: string; line: number }> {
  const nodes: Array<{ name: string; kind: string; line: number }> = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    const m = /^(\w[\w.-]*)\s+(\w[\w.-]*)/.exec(raw);
    if (!m) continue;
    if (["scene", "layout", "group", "beat", "style", "pattern", "edge", "use"].includes(m[1])) continue;
    if (NODE_KINDS.has(m[1].toLowerCase())) {
      nodes.push({ kind: m[1], name: m[2], line: i });
    }
  }
  return nodes;
}

function parseDiagnostics(text: string): Diagnostic[] {
  try {
    const ast = parse(text);
    return ast.diagnostics;
  } catch (error) {
    if (error instanceof ParseError) {
      return [{ severity: "error", message: error.message, line: error.line }];
    }
    return [{ severity: "error", message: String(error), line: 1 }];
  }
}

function buildDocumentSymbols(text: string): DocumentSymbol[] {
  const symbols: DocumentSymbol[] = [];
  const nodes = extractNodes(text);
  for (const node of nodes) {
    symbols.push({
      name: node.name,
      kind: SymbolKind.Class,
      range: { start: { line: node.line, character: 0 }, end: { line: node.line, character: 80 } },
      selectionRange: { start: { line: node.line, character: 0 }, end: { line: node.line, character: 80 } },
    });
  }
  return symbols;
}

connection.onInitialize(() => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Incremental,
    completionProvider: { triggerCharacters: [" ", ".", ":", "-", ">"] },
    documentSymbolProvider: true,
    hoverProvider: true,
  },
}));

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
  const nodes = extractNodes(doc.getText());
  const items = [
    ...KEYWORDS.map((label) => ({ label, kind: CompletionItemKind.Keyword })),
    ...nodes.map((n) => ({ label: n.name, kind: CompletionItemKind.Variable })),
    { label: "$nodes", kind: CompletionItemKind.Variable },
    { label: "$title", kind: CompletionItemKind.Variable },
  ];
  return items;
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
  if (line.startsWith("beat ")) return { contents: { kind: "markdown", value: "Named narrative beat with indented cues." } };
  if (line.includes("->")) return { contents: { kind: "markdown", value: "Request/call flow edge." } };
  return null;
});

documents.listen(connection);
connection.listen();
