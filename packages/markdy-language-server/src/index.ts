import { ParseError, parse, type ParseWarning } from "@markdy/core";
import {
  type CompletionItem,
  CompletionItemKind,
  createConnection,
  DiagnosticSeverity,
  type DocumentSymbol,
  type Hover,
  type InitializeParams,
  type InitializeResult,
  type Position,
  ProposedFeatures,
  type Range,
  type SemanticTokens,
  SymbolKind,
  TextDocumentSyncKind,
  TextDocuments,
} from "vscode-languageserver/node.js";
import { TextDocument } from "vscode-languageserver-textdocument";

type ActorInfo = {
  name: string;
  type: string;
  line: number;
};

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

const UNIVERSAL_ACTIONS = [
  "enter",
  "exit",
  "move",
  "fade_in",
  "fade_out",
  "scale",
  "rotate",
  "shake",
  "say",
  "throw",
  "play",
];
const FIGURE_ACTIONS = [
  "punch",
  "kick",
  "wave",
  "nod",
  "jump",
  "bounce",
  "face",
  "rotate_part",
  "pose",
];
const SYSTEM_ACTIONS = ["request", "response", "emit"];

const KEYWORDS = [
  "scene",
  "actor",
  "asset",
  "var",
  "def",
  "seq",
  "preset",
  "import",
  "camera",
];
const SEMANTIC_TOKEN_TYPES = ["keyword", "variable", "method", "class"] as const;
const SEMANTIC_TOKEN_TYPE_INDEX = new Map(
  SEMANTIC_TOKEN_TYPES.map((type, i) => [type, i]),
);

const ACTION_DOCS: Record<string, string> = {
  enter: "Slide actor in from edge. Params: `from`, `dur`, `ease`.",
  exit: "Slide actor out to edge. Params: `to`, `dur`, `ease`.",
  move: "Move actor to coordinate. Params: `to=(x,y)`, `dur`, `ease`.",
  fade_in: "Fade actor opacity to 1. Params: `dur`, `ease`.",
  fade_out: "Fade actor opacity to 0. Params: `dur`, `ease`.",
  say: "Show a speech bubble. Params: `text`, `dur`.",
  play: "Expand sequence on actor. Params: `seqName, ...args`.",
  request: "Draw an outbound flow edge. Params: `to`, `label`, `dur`, `style`.",
  response: "Draw a return flow edge. Params: `to`, `label`, `dur`, `style`.",
  emit: "Draw async fire-and-forget flow edge. Params: `to`, `label`, `dur`, `style=fire_and_forget`.",
  pan: "Move camera center. Params: `to=(x,y)`, `dur`, `ease`.",
  zoom: "Change camera zoom. Params: `to`, `dur`, `ease`.",
  shake: "Shake actor/camera. Params: `intensity`, `dur`.",
};

function extractActors(text: string): ActorInfo[] {
  const actors: ActorInfo[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = /^actor\s+(\w+)\s*=\s*([\w.]+)\(/.exec(lines[i].trim());
    if (!m) continue;
    actors.push({ name: m[1], type: m[2], line: i });
  }
  return actors;
}

function getActionsForActorType(actorType: string): string[] {
  const out = [...UNIVERSAL_ACTIONS];
  if (actorType === "figure") out.push(...FIGURE_ACTIONS);
  if (actorType === "service" || actorType === "db" || actorType === "queue" || actorType === "client") {
    out.push(...SYSTEM_ACTIONS);
  }
  return out;
}

function lineRange(doc: TextDocument, lineNumber: number): Range {
  const line = Math.max(0, Math.min(lineNumber, doc.lineCount - 1));
  const text = doc.getText({
    start: { line, character: 0 },
    end: { line, character: 10000 },
  });
  return {
    start: { line, character: 0 },
    end: { line, character: Math.max(1, text.length) },
  };
}

function parseWarningsToDiagnostics(warnings: ParseWarning[], doc: TextDocument) {
  return warnings.map((w) => ({
    severity: DiagnosticSeverity.Warning,
    range: lineRange(doc, w.line - 1),
    message: w.message,
    source: "markdy",
  }));
}

function validateTextDocument(document: TextDocument): void {
  const text = document.getText();
  const diagnostics: Array<{
    severity: DiagnosticSeverity;
    range: Range;
    message: string;
    source: string;
  }> = [];

  try {
    const ast = parse(text);
    diagnostics.push(...parseWarningsToDiagnostics(ast.warnings, document));
  } catch (err) {
    if (err instanceof ParseError) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: lineRange(document, err.line - 1),
        message: err.message.replace(/^Line \d+:\s*/, ""),
        source: "markdy",
      });
    } else if (err instanceof Error) {
      diagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: lineRange(document, 0),
        message: err.message,
        source: "markdy",
      });
    }
  }

  connection.sendDiagnostics({ uri: document.uri, diagnostics });
}

function getLinePrefix(doc: TextDocument, position: Position): string {
  const lineStart = doc.offsetAt({ line: position.line, character: 0 });
  const at = doc.offsetAt(position);
  return doc.getText().slice(lineStart, at);
}

function toMethodCompletion(action: string): CompletionItem {
  return {
    label: action,
    kind: CompletionItemKind.Method,
    detail: "Markdy action",
    documentation: ACTION_DOCS[action] ?? undefined,
    insertText: `${action}()`,
  };
}

function getTokenAtPosition(doc: TextDocument, position: Position): string | null {
  const lineText = doc.getText({
    start: { line: position.line, character: 0 },
    end: { line: position.line, character: 10000 },
  });
  const idx = Math.min(position.character, lineText.length);
  const left = lineText.slice(0, idx).match(/[A-Za-z_][\w.]*$/)?.[0] ?? "";
  const rightMatch = lineText.slice(idx).match(/^[\w.]*/);
  const right = rightMatch ? rightMatch[0] : "";
  const token = `${left}${right}`;
  return token || null;
}

function pushSemanticToken(
  data: number[],
  state: { line: number; char: number },
  line: number,
  char: number,
  length: number,
  type: (typeof SEMANTIC_TOKEN_TYPES)[number],
): void {
  const tokenType = SEMANTIC_TOKEN_TYPE_INDEX.get(type);
  if (tokenType === undefined) return;
  const deltaLine = line - state.line;
  const deltaStart = deltaLine === 0 ? char - state.char : char;
  data.push(deltaLine, deltaStart, length, tokenType, 0);
  state.line = line;
  state.char = char;
}

function buildSemanticTokenData(document: TextDocument): number[] {
  const data: number[] = [];
  const cursor = { line: 0, char: 0 };
  const text = document.getText();
  const actors = new Set(extractActors(text).map((a) => a.name));
  const lines = text.split(/\r?\n/);
  for (let line = 0; line < lines.length; line++) {
    const content = lines[line];
    const head = content.trim();
    // Collected per-line and sorted by column before emitting: the LSP semantic
    // tokens data array is a delta encoding that requires tokens on the same
    // line to be emitted in strictly increasing column order.
    const tokens: Array<{ char: number; length: number; type: (typeof SEMANTIC_TOKEN_TYPES)[number] }> = [];

    for (const keyword of KEYWORDS) {
      if (head.startsWith(keyword) && !/\w/.test(head.charAt(keyword.length))) {
        const start = content.indexOf(keyword);
        if (start >= 0) tokens.push({ char: start, length: keyword.length, type: "keyword" });
      }
    }

    for (const name of actors) {
      const match = new RegExp(`\\b${name}\\b`).exec(content);
      if (match?.index !== undefined) {
        tokens.push({ char: match.index, length: name.length, type: "variable" });
      }
    }

    const actionMatch = /\.\s*([A-Za-z_]\w*)\s*\(/.exec(content);
    if (actionMatch?.index !== undefined) {
      const actionName = actionMatch[1];
      const actionStart = actionMatch.index + actionMatch[0].indexOf(actionName);
      tokens.push({ char: actionStart, length: actionName.length, type: "method" });
    }

    const defMatch = /^def\s+([A-Za-z_]\w*)/.exec(head);
    if (defMatch) {
      const start = content.indexOf(defMatch[1]);
      if (start >= 0) tokens.push({ char: start, length: defMatch[1].length, type: "class" });
    }

    tokens.sort((a, b) => a.char - b.char);
    for (const token of tokens) {
      pushSemanticToken(data, cursor, line, token.char, token.length, token.type);
    }
  }
  return data;
}

function buildDocumentSymbols(document: TextDocument): DocumentSymbol[] {
  const symbols: DocumentSymbol[] = [];
  const lines = document.getText().split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    const scene = /^scene\s+"([^"]+)"/.exec(raw);
    if (scene) {
      symbols.push({
        name: scene[1],
        detail: "scene",
        kind: SymbolKind.Namespace,
        range: lineRange(document, i),
        selectionRange: lineRange(document, i),
        children: [],
      });
      continue;
    }

    const actor = /^actor\s+(\w+)\s*=/.exec(raw);
    if (actor) {
      symbols.push({
        name: actor[1],
        detail: "actor",
        kind: SymbolKind.Variable,
        range: lineRange(document, i),
        selectionRange: lineRange(document, i),
        children: [],
      });
      continue;
    }
    const seq = /^seq\s+(\w+)/.exec(raw);
    if (seq) {
      symbols.push({
        name: seq[1],
        detail: "sequence",
        kind: SymbolKind.Function,
        range: lineRange(document, i),
        selectionRange: lineRange(document, i),
        children: [],
      });
      continue;
    }
    const def = /^def\s+(\w+)/.exec(raw);
    if (def) {
      symbols.push({
        name: def[1],
        detail: "template",
        kind: SymbolKind.Class,
        range: lineRange(document, i),
        selectionRange: lineRange(document, i),
        children: [],
      });
    }
  }
  return symbols;
}

connection.onInitialize((_params: InitializeParams): InitializeResult => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Incremental,
    completionProvider: {
      resolveProvider: false,
      triggerCharacters: [".", "@"],
    },
    hoverProvider: true,
    documentSymbolProvider: true,
    semanticTokensProvider: {
      full: true,
      legend: {
        tokenTypes: [...SEMANTIC_TOKEN_TYPES],
        tokenModifiers: [],
      },
    },
  },
}));

documents.onDidOpen((e) => validateTextDocument(e.document));
documents.onDidChangeContent((e) => validateTextDocument(e.document));
documents.onDidClose((e) => {
  // Clear diagnostics so stale errors/warnings don't linger in the client
  // after the document is closed.
  connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
});

connection.onCompletion((params): CompletionItem[] => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];

  const actors = extractActors(doc.getText());
  const actorByName = new Map(actors.map((a) => [a.name, a.type]));
  const prefix = getLinePrefix(doc, params.position);

  const actorAction = /(\w+)\.([A-Za-z_]*)$/.exec(prefix);
  if (actorAction) {
    const actorName = actorAction[1];
    const partial = actorAction[2] ?? "";
    const actorType = actorByName.get(actorName);
    if (!actorType) return [];
    return getActionsForActorType(actorType)
      .filter((a) => a.startsWith(partial))
      .map(toMethodCompletion);
  }

  const lineEventPrefix = /@[\d.+]*:\s*$/.test(prefix);
  if (lineEventPrefix) {
    return actors.map((a) => ({
      label: a.name,
      kind: CompletionItemKind.Variable,
      detail: `${a.type} actor`,
      insertText: `${a.name}.`,
    }));
  }

  const items: CompletionItem[] = [];
  for (const keyword of KEYWORDS) {
    items.push({
      label: keyword,
      kind: CompletionItemKind.Keyword,
      detail: "Markdy keyword",
    });
  }
  for (const actor of actors) {
    items.push({
      label: actor.name,
      kind: CompletionItemKind.Variable,
      detail: `${actor.type} actor`,
    });
  }
  return items;
});

connection.onHover((params): Hover | null => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;

  const token = getTokenAtPosition(doc, params.position);
  if (!token) return null;

  const actor = extractActors(doc.getText()).find((a) => a.name === token);
  if (actor) {
    return {
      contents: {
        kind: "markdown",
        value: `**${actor.name}**\n\nActor type: \`${actor.type}\``,
      },
    };
  }

  if (ACTION_DOCS[token]) {
    return {
      contents: {
        kind: "markdown",
        value: `**${token}**\n\n${ACTION_DOCS[token]}`,
      },
    };
  }

  if (KEYWORDS.includes(token)) {
    return {
      contents: {
        kind: "markdown",
        value: `Markdy keyword: \`${token}\``,
      },
    };
  }

  return null;
});

connection.onDocumentSymbol((params): DocumentSymbol[] => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];
  return buildDocumentSymbols(doc);
});

connection.languages.semanticTokens.on((params): SemanticTokens => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return { data: [] };
  return { data: buildSemanticTokenData(doc) };
});

documents.listen(connection);
connection.listen();
