import {
  BEAT_CUE_KEYWORDS,
  DIAGRAM_TYPES,
  EDGE_OPERATORS,
  NODE_KINDS,
  PLAYER_FLAT_KEYS,
  PLAYER_GROUPS,
  ParseError,
  parse,
  type Diagnostic,
} from "@markdy/core";
import {
  CompletionItem,
  CompletionItemKind,
  DiagnosticSeverity,
  type DocumentSymbol,
  ProposedFeatures,
  SymbolKind,
  TextDocumentSyncKind,
  TextDocuments,
  createConnection,
} from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

const KEYWORDS = [
  "scene",
  "layout",
  "player",
  ...PLAYER_GROUPS,
  ...PLAYER_FLAT_KEYS,
  "var",
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
  "frame",
  ...BEAT_CUE_KEYWORDS,
  ...NODE_KINDS,
  ...DIAGRAM_TYPES,
];

function extractNodes(text: string): Array<{ name: string; kind: string; line: number }> {
  const nodes: Array<{ name: string; kind: string; line: number }> = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    const m = /^(\w[\w.-]*)\s+(\w[\w.-]*)/.exec(raw);
    if (!m) continue;
    if (
      [
        "scene",
        "layout",
        "controls",
        "interactive",
        "interactiveViewport",
        "autoplay",
        "loop",
        "copyright",
        "speed",
        "playbackRate",
        "progressColor",
        "var",
        "group",
        "beat",
        "style",
        "pattern",
        "edge",
        "use",
      ].includes(m[1])
    ) {
      continue;
    }
    if (NODE_KINDS.has(m[1].toLowerCase())) {
      nodes.push({ kind: m[1], name: m[2], line: i });
    }
  }
  return nodes;
}

function parseDiagnostics(text: string): Diagnostic[] {
  try {
    const ast = parse(text);
    return ast.diagnostics || [];
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
      detail: node.kind,
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
    completionProvider: { triggerCharacters: [" ", ".", ":", "-", ">", "$"] },
    documentSymbolProvider: true,
    hoverProvider: true,
  },
}));

documents.onDidChangeContent((change) => {
  const text = change.document.getText();
  const rawDiagnostics = parseDiagnostics(text);
  const diagnostics = rawDiagnostics.map((d) => {
    const line = Math.max(0, (d.line ?? 1) - 1);
    return {
      severity: d.severity === "error" ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
      range: {
        start: { line, character: 0 },
        end: { line, character: 120 },
      },
      message: d.message,
      source: "markdy",
    };
  });

  connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
});

connection.onCompletion((params) => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];
  const nodes = extractNodes(doc.getText());
  const items: CompletionItem[] = [
    ...KEYWORDS.map((label) => ({ label, kind: CompletionItemKind.Keyword })),
    ...nodes.map((n) => ({ label: n.name, detail: `Node (${n.kind})`, kind: CompletionItemKind.Variable })),
    { label: "$nodes", detail: "All diagram nodes selector", kind: CompletionItemKind.Variable },
    { label: "$title", detail: "Scene title element selector", kind: CompletionItemKind.Variable },
    { label: "$edges", detail: "All diagram edges selector", kind: CompletionItemKind.Variable },
    ...Object.keys(EDGE_OPERATORS).map((op) => ({
      label: op,
      detail: `Flow edge operator (${EDGE_OPERATORS[op]})`,
      kind: CompletionItemKind.Operator,
    })),
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
  if (line.startsWith("beat ")) {
    return { contents: { kind: "markdown", value: "**Markdy Beat**: Named narrative stage with timed animation cues." } };
  }
  if (line.startsWith("frame ")) {
    return { contents: { kind: "markdown", value: "**Markdy Frame Cue**: Camera cue that smooth-zooms and frames selected nodes or groups." } };
  }
  if (line.startsWith("scene ")) {
    return { contents: { kind: "markdown", value: "**Markdy Scene**: Declares canvas dimensions, layout direction, theme, and playback settings." } };
  }
  if (line.startsWith("group ")) {
    return { contents: { kind: "markdown", value: "**Markdy Group**: Logical cluster boundary grouping multiple nodes." } };
  }
  if (line.includes("->")) {
    return { contents: { kind: "markdown", value: "**Request Flow (`->`)**: Directed request/call flow edge with animated packet reveal." } };
  }
  if (line.includes("<-")) {
    return { contents: { kind: "markdown", value: "**Response Flow (`<-`)**: Directed response/acknowledgment flow edge." } };
  }
  if (line.includes("~>")) {
    return { contents: { kind: "markdown", value: "**Async Event Flow (`~>`)**: Asynchronous pub/sub or event-stream flow edge." } };
  }
  if (line.includes("--")) {
    return { contents: { kind: "markdown", value: "**Dependency Edge (`--`)**: Static structural connection or dependency line." } };
  }
  return null;
});

documents.listen(connection);
connection.listen();
