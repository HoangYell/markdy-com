/**
 * MarkdyScript 0.8 diagram language support for CodeMirror 6.
 */
import { BEAT_CUE_KEYWORDS, NODE_KINDS } from "@markdy/core";
import { StreamLanguage, type StreamParser, HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { autocompletion, type CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
import { tags, type Tag } from "@lezer/highlight";

const TOKEN_TAG: Record<string, Tag> = {
  keyword: tags.keyword,
  type: tags.typeName,
  string: tags.string,
  number: tags.number,
  comment: tags.comment,
  identifier: tags.variableName,
  operator: tags.operator,
  selector: tags.special(tags.variableName),
};

const KEYWORDS = new Set([
  "scene", "layout", "group", "beat", "style", "pattern", "use", "theme", "edge",
  "LR", "RL", "TB", "BT", "midnight", "paper",
  ...BEAT_CUE_KEYWORDS,
]);

const NODE_KIND_SET = new Set<string>(NODE_KINDS);

const markdyParser: StreamParser<null> = {
  startState: () => null,
  tokenTable: TOKEN_TAG,
  token(stream) {
    if (stream.match(/\/\/.*/)) return "comment";
    if (stream.match(/"([^"\\]|\\.)*"/)) return "string";
    if (stream.match(/(->|<-|~>|--)/)) return "operator";
    if (stream.match(/\$[\w]+/)) return "selector";
    if (stream.eatSpace()) return null;
    if (stream.match(/#[0-9a-fA-F]{3,8}\b/)) return "string";
    if (stream.match(/\d+(\.\d+)?(ms|s)?\b/)) return "number";
    if (stream.match(/[\w.-]+/)) {
      const word = stream.current();
      if (KEYWORDS.has(word)) return "keyword";
      if (NODE_KIND_SET.has(word.toLowerCase())) return "type";
      return "identifier";
    }
    stream.next();
    return null;
  },
  languageData: {
    commentTokens: { line: "//" },
    indentOnInput: /^\s*(beat|pattern)\b.*:\s*$/,
  },
};

const highlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#7c3aed", fontWeight: "bold" },
  { tag: tags.typeName, color: "#0891b2" },
  { tag: tags.string, color: "#059669" },
  { tag: tags.comment, color: "#94a3b8", fontStyle: "italic" },
  { tag: tags.operator, color: "#ea580c", fontWeight: "bold" },
  { tag: tags.special(tags.variableName), color: "#db2777" },
]);

function completions(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/[\w$.-]*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  const options = [
    ...KEYWORDS,
  ].map((label) => ({ label, type: "keyword" as const }));
  return { from: word.from, options };
}

export const markdyLanguage = StreamLanguage.define(markdyParser);
export const markdyHighlight = syntaxHighlighting(highlight);
export const markdyCompletion = autocompletion({ override: [completions] });
export const markdyAutocomplete = markdyCompletion;
export const markdyHighlightLight = markdyHighlight;
export const markdyHighlightDark = markdyHighlight;
