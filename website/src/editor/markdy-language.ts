/**
 * MarkdyScript 1.0 diagram language support for CodeMirror 6.
 * Full IntelliCode, Context-Aware Autocompletion & Inline Ghost-Text Suggestions.
 */
import {
  BEAT_CUE_KEYWORDS,
  NODE_KINDS,
  TECHNICAL_NODE_TYPES,
  VISUAL_PRIMITIVE_TYPES,
  getIntelliCodeCompletions,
  predictNextLineSuggestion,
  type IntelliCodeItem,
  type GhostTextSuggestion,
} from "@markdy/core";
import { StreamLanguage, type StreamParser, HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { autocompletion, snippet, type CompletionContext, type CompletionResult, type Completion } from "@codemirror/autocomplete";
import { tags, type Tag } from "@lezer/highlight";
import {
  EditorView,
  Decoration,
  type DecorationSet,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
  keymap,
  type KeyBinding,
} from "@codemirror/view";
import { StateField, StateEffect, type Extension, type Transaction } from "@codemirror/state";

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
  "scene", "layout", "group", "beat", "style", "pattern", "use", "theme", "edge", "annotation", "var",
  "LR", "RL", "TB", "BT",
  "midnight", "paper", "blueprint", "nebula", "editorial", "graphite", "terminal", "sketchy", "draft", "doodle",
  "architecture", "flowchart", "tree", "state", "sequence", "constellation", "loop", "flywheel",
  "medallion", "quadrant", "swimlane", "pyramid", "radar", "timeline", "gantt", "venn", "layers", "nested",
  ...BEAT_CUE_KEYWORDS,
]);

const ALL_NODE_KINDS = Array.from(
  new Set([
    ...NODE_KINDS,
    ...TECHNICAL_NODE_TYPES,
    ...VISUAL_PRIMITIVE_TYPES,
  ])
);

const NODE_KIND_SET = new Set<string>(ALL_NODE_KINDS);

const markdyParser: StreamParser<null> = {
  startState: () => null,
  tokenTable: TOKEN_TAG,
  token(stream) {
    if (stream.match(/\/\/.*/)) return "comment";
    if (stream.match(/"([^"\\]|\\.)*"/)) return "string";
    if (stream.match(/(->|<-|~>|<->|\.\.>|--)/)) return "operator";
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

function mapKindToCmType(kind: string): string {
  switch (kind) {
    case "keyword":
    case "directive":
      return "keyword";
    case "nodeKind":
      return "class";
    case "node":
      return "variable";
    case "group":
      return "namespace";
    case "tech":
      return "type";
    case "flowOp":
      return "operator";
    case "cue":
      return "function";
    case "selector":
      return "constant";
    case "theme":
      return "color";
    case "layout":
    case "diagramType":
      return "enum";
    case "attribute":
      return "property";
    case "snippet":
      return "text";
    default:
      return "text";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CodeMirror 6 Autocompletion Provider
// ─────────────────────────────────────────────────────────────────────────────

function completions(context: CompletionContext): CompletionResult | null {
  const doc = context.state.doc;
  const docText = doc.toString();
  const pos = context.pos;
  const line = doc.lineAt(pos);
  const lineNo = line.number - 1;
  const col = pos - line.from;

  const word = context.matchBefore(/[\w$.-><~]*/);
  if (!word && !context.explicit) return null;

  const rawItems: IntelliCodeItem[] = getIntelliCodeCompletions(docText, lineNo, col);
  if (rawItems.length === 0) return null;

  const options: Completion[] = rawItems.map((item) => {
    const cmType = mapKindToCmType(item.kind);

    if (item.isSnippet) {
      return snippet(item.insertText)({
        label: item.label,
        detail: item.detail,
        info: item.documentation,
        type: cmType,
        boost: item.boost ?? 5,
      });
    }

    return {
      label: item.label,
      apply: item.insertText,
      detail: item.detail,
      info: item.documentation,
      type: cmType,
      boost: item.boost ?? 5,
    };
  });

  return {
    from: word ? word.from : pos,
    options,
    validFor: /^[\w$.-><~]*$/,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline Ghost-Text Auto-Suggestion (IntelliCode)
// ─────────────────────────────────────────────────────────────────────────────

class GhostTextWidget extends WidgetType {
  constructor(public readonly text: string, public readonly hint?: string) {
    super();
  }

  toDOM(): HTMLElement {
    const span = document.createElement("span");
    span.className = "cm-ghost-text";
    span.textContent = this.text;
    span.setAttribute("aria-hidden", "true");

    const badge = document.createElement("span");
    badge.className = "cm-ghost-text-hint";
    badge.textContent = "Tab ⇥";
    span.appendChild(badge);

    return span;
  }

  override eq(other: GhostTextWidget): boolean {
    return this.text === other.text;
  }
}

export const setGhostSuggestionEffect = StateEffect.define<GhostTextSuggestion | null>();

export const ghostSuggestionField = StateField.define<GhostTextSuggestion | null>({
  create() {
    return null;
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setGhostSuggestionEffect)) {
        return effect.value;
      }
    }
    if (tr.docChanged || tr.selection) {
      return null; // Cleared upon user edit or cursor move until recomputed
    }
    return value;
  },
});

const ghostViewPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet = Decoration.none;
    debounceTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(view: EditorView) {
      this.debounceTimer = setTimeout(() => {
        this.computeGhost(view);
      }, 150);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet) {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => {
          this.computeGhost(update.view);
        }, 120);
      }

      const suggestion = update.state.field(ghostSuggestionField);
      if (!suggestion) {
        this.decorations = Decoration.none;
      } else {
        const head = update.state.selection.main.head;
        const widget = Decoration.widget({
          widget: new GhostTextWidget(suggestion.text, suggestion.description),
          side: 1,
        });
        this.decorations = Decoration.set([widget.range(head)]);
      }
    }

    computeGhost(view: EditorView) {
      if (!view || !view.dom || !view.dom.parentElement) return;
      const state = view.state;
      const head = state.selection.main.head;
      const line = state.doc.lineAt(head);
      const lineNo = line.number - 1;
      const lineText = line.text;
      const currentSuggestion = state.field(ghostSuggestionField);

      // Only show ghost text if at the end of current line or on empty line
      if (head < line.to && lineText.trim().length > 0) {
        if (currentSuggestion !== null) {
          view.dispatch({ effects: setGhostSuggestionEffect.of(null) });
        }
        return;
      }

      const docText = state.doc.toString();
      const suggestion = predictNextLineSuggestion(docText, lineNo);

      if (suggestion && suggestion.text.trim().length > 0) {
        let displayGhost = suggestion.text;
        if (lineText.length > 0 && !displayGhost.startsWith("\n") && !displayGhost.startsWith(" ")) {
          displayGhost = " " + displayGhost;
        }
        if (
          !currentSuggestion ||
          currentSuggestion.text !== displayGhost ||
          currentSuggestion.type !== suggestion.type
        ) {
          view.dispatch({
            effects: setGhostSuggestionEffect.of({
              ...suggestion,
              text: displayGhost,
            }),
          });
        }
      } else {
        if (currentSuggestion !== null) {
          view.dispatch({ effects: setGhostSuggestionEffect.of(null) });
        }
      }
    }

    destroy() {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

export const acceptInlineSuggestion: KeyBinding = {
  key: "Tab",
  run(view: EditorView): boolean {
    const suggestion = view.state.field(ghostSuggestionField);
    if (!suggestion) return false;

    const head = view.state.selection.main.head;
    const textToInsert = suggestion.insertText || suggestion.text;

    view.dispatch({
      changes: { from: head, insert: textToInsert },
      selection: { anchor: head + textToInsert.length },
      effects: setGhostSuggestionEffect.of(null),
    });
    return true;
  },
};

export const dismissInlineSuggestion: KeyBinding = {
  key: "Escape",
  run(view: EditorView): boolean {
    const suggestion = view.state.field(ghostSuggestionField);
    if (suggestion) {
      view.dispatch({ effects: setGhostSuggestionEffect.of(null) });
      return true;
    }
    return false;
  },
};

export const markdyInlineSuggestionKeymap = keymap.of([
  acceptInlineSuggestion,
  { key: "Alt-ArrowRight", run: acceptInlineSuggestion.run },
  { key: "Mod-ArrowRight", run: acceptInlineSuggestion.run },
  dismissInlineSuggestion,
]);

export const markdyInlineSuggestion: Extension = [
  ghostSuggestionField,
  ghostViewPlugin,
  markdyInlineSuggestionKeymap,
];

export const markdyLanguage = StreamLanguage.define(markdyParser);
export const markdyHighlight = syntaxHighlighting(highlight);
export const markdyCompletion = autocompletion({ override: [completions], defaultKeymap: true });
export const markdyAutocomplete = markdyCompletion;
export const markdyHighlightLight = markdyHighlight;
export const markdyHighlightDark = markdyHighlight;
