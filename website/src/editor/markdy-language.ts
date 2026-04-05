/**
 * MarkdyScript language support for CodeMirror 6.
 *
 * Provides syntax highlighting via StreamLanguage and autocompletion
 * for keywords, actions, parameters, and parameter values.
 */

import {
  StreamLanguage,
  type StreamParser,
} from "@codemirror/language";
import {
  type CompletionContext,
  type CompletionResult,
  type Completion,
  autocompletion,
} from "@codemirror/autocomplete";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

/* ── Token types mapped to Lezer tags ──────────────────────────────── */

const TOKEN_TAG: Record<string, any> = {
  keyword:    tags.keyword,
  type:       tags.typeName,
  action:     tags.function(tags.variableName),
  number:     tags.number,
  string:     tags.string,
  comment:    tags.comment,
  time:       tags.meta,
  variable:   tags.special(tags.variableName),
  varRef:     tags.special(tags.string),
  identifier: tags.variableName,
  operator:   tags.operator,
  paren:      tags.paren,
  property:   tags.propertyName,
  color:      tags.color,
  punctuation: tags.punctuation,
};

/* ── StreamParser for MarkdyScript ─────────────────────────────────── */

const KEYWORDS = new Set([
  "scene", "actor", "asset", "var", "def", "seq",
]);

const ACTOR_TYPES = new Set([
  "figure", "text", "sprite", "box", "image", "icon",
]);

const ACTIONS = new Set([
  "enter", "move", "fade_in", "fade_out", "scale", "rotate",
  "shake", "say", "throw", "play", "punch", "kick",
  "rotate_part", "face",
]);

const PARAMS = new Set([
  "from", "to", "dur", "ease", "intensity", "side", "part",
  "width", "height", "fps", "bg", "duration",
  "scale", "rotate", "opacity", "size",
]);

interface MarkdyState {
  inString: boolean;
  inBlockComment: boolean;
  context: "top" | "var" | "block";
}

function mkState(): MarkdyState {
  return { inString: false, inBlockComment: false, context: "top" };
}

export const markdyStreamParser: StreamParser<MarkdyState> = {
  startState: mkState,
  token(stream, state): string | null {
    // ── Whitespace ───────────────────────────────────────────────
    if (stream.eatSpace()) return null;

    // ── Comment ─────────────────────────────────────────────────
    if (stream.match("#")) {
      stream.skipToEnd();
      return "comment";
    }

    // ── Variable reference ${...} ───────────────────────────────
    if (stream.match(/\$\{[^}]*\}/)) {
      return "varRef";
    }

    // ── $ (self reference in seq) ───────────────────────────────
    if (stream.match("$.")) {
      return "variable";
    }

    // ── Time marker @1.0: or @+0.3: ────────────────────────────
    if (stream.match(/@\+?[0-9]+(\.[0-9]+)?/)) {
      // eat optional colon
      stream.eat(":");
      return "time";
    }

    // ── Quoted string ───────────────────────────────────────────
    if (stream.match(/"[^"]*"/)) {
      return "string";
    }

    // ── Hex color ───────────────────────────────────────────────
    if (stream.match(/#[0-9a-fA-F]{3,8}\b/)) {
      return "color";
    }

    // ── Numbers ─────────────────────────────────────────────────
    if (stream.match(/[0-9]+(\.[0-9]+)?/)) {
      return "number";
    }

    // ── Operators & punctuation ─────────────────────────────────
    if (stream.match(/[=,]/)) return "operator";
    if (stream.match(/[(){}]/)) return "paren";

    // ── Dot (method call) ───────────────────────────────────────
    if (stream.eat(".")) {
      // Try to match an action name after the dot
      const actionMatch = stream.match(/[a-zA-Z_][a-zA-Z0-9_]*/);
      if (actionMatch) {
        const name = typeof actionMatch === "string" ? actionMatch : actionMatch[0];
        if (name && ACTIONS.has(name)) return "action";
        return "property";
      }
      return "punctuation";
    }

    // ── Words (keywords, types, identifiers) ────────────────────
    const wordMatch = stream.match(/[a-zA-Z_][a-zA-Z0-9_]*/);
    if (wordMatch) {
      const word = typeof wordMatch === "string" ? wordMatch : wordMatch[0];
      if (word && KEYWORDS.has(word)) return "keyword";
      if (word && ACTOR_TYPES.has(word)) return "type";
      if (word && ACTIONS.has(word)) return "action";
      if (word && PARAMS.has(word)) {
        // Check if followed by = (parameter name context)
        if (stream.peek() === "=") return "property";
      }
      if (word === "at") return "keyword";
      return "identifier";
    }

    // ── Emoji (consume multi-byte) ──────────────────────────────
    stream.next();
    return null;
  },
  languageData: {
    commentTokens: { line: "#" },
  },
};

/* ── Language instance ─────────────────────────────────────────────── */

export const markdyLanguage = StreamLanguage.define(markdyStreamParser);

/* ── Light theme highlight style ───────────────────────────────────── */

export const markdyHighlightLight = HighlightStyle.define([
  { tag: tags.keyword,                             color: "#8250df", fontWeight: "600" },
  { tag: tags.typeName,                            color: "#0550ae" },
  { tag: tags.function(tags.variableName),         color: "#116329", fontWeight: "500" },
  { tag: tags.number,                              color: "#953800" },
  { tag: tags.string,                              color: "#0a3069" },
  { tag: tags.comment,                             color: "#6e7781", fontStyle: "italic" },
  { tag: tags.meta,                                color: "#cf222e", fontWeight: "600" },
  { tag: tags.special(tags.variableName),          color: "#8250df" },
  { tag: tags.special(tags.string),                color: "#0550ae", fontWeight: "500" },
  { tag: tags.variableName,                        color: "#24292f" },
  { tag: tags.operator,                            color: "#cf222e" },
  { tag: tags.paren,                               color: "#6e7781" },
  { tag: tags.propertyName,                        color: "#0550ae" },
  { tag: tags.color,                               color: "#953800" },
  { tag: tags.punctuation,                         color: "#57606a" },
]);

/* ── Dark theme highlight style ────────────────────────────────────── */

export const markdyHighlightDark = HighlightStyle.define([
  { tag: tags.keyword,                             color: "#d2a8ff", fontWeight: "600" },
  { tag: tags.typeName,                            color: "#79c0ff" },
  { tag: tags.function(tags.variableName),         color: "#7ee787", fontWeight: "500" },
  { tag: tags.number,                              color: "#ffa657" },
  { tag: tags.string,                              color: "#a5d6ff" },
  { tag: tags.comment,                             color: "#8b949e", fontStyle: "italic" },
  { tag: tags.meta,                                color: "#ff7b72", fontWeight: "600" },
  { tag: tags.special(tags.variableName),          color: "#d2a8ff" },
  { tag: tags.special(tags.string),                color: "#79c0ff", fontWeight: "500" },
  { tag: tags.variableName,                        color: "#c9d1d9" },
  { tag: tags.operator,                            color: "#ff7b72" },
  { tag: tags.paren,                               color: "#8b949e" },
  { tag: tags.propertyName,                        color: "#79c0ff" },
  { tag: tags.color,                               color: "#ffa657" },
  { tag: tags.punctuation,                         color: "#8b949e" },
]);

/* ── Autocompletion ────────────────────────────────────────────────── */

const keywordCompletions: Completion[] = [
  { label: "scene",  type: "keyword", detail: "scene declaration", info: "scene width=800 height=400 fps=30 bg=#fafafa" },
  { label: "actor",  type: "keyword", detail: "actor declaration", info: "actor name = type(args) at (x, y)" },
  { label: "asset",  type: "keyword", detail: "asset declaration", info: "asset name = image(\"path\") | icon(\"id\")" },
  { label: "var",    type: "keyword", detail: "variable",          info: "var name = value" },
  { label: "def",    type: "keyword", detail: "template",          info: "def name(params) { ... }" },
  { label: "seq",    type: "keyword", detail: "sequence",          info: "seq name(params) { ... }" },
  { label: "at",     type: "keyword", detail: "position",          info: "at (x, y)" },
];

const typeCompletions: Completion[] = [
  { label: "figure", type: "type", detail: "stick figure",    info: "figure(skin, gender, face)" },
  { label: "text",   type: "type", detail: "text label",      info: 'text("content")' },
  { label: "sprite", type: "type", detail: "image sprite",    info: "sprite(assetName)" },
  { label: "box",    type: "type", detail: "grey box",        info: "box()" },
  { label: "image",  type: "type", detail: "image asset",     info: 'image("path/to/img.png")' },
  { label: "icon",   type: "type", detail: "icon asset",      info: 'icon("set:name")' },
];

const actionCompletions: Completion[] = [
  { label: "enter",       type: "function", detail: "slide in",       info: "enter(from=left, dur=0.8)" },
  { label: "move",        type: "function", detail: "translate",      info: "move(to=(x,y), dur=1.0, ease=out)" },
  { label: "fade_in",     type: "function", detail: "appear",         info: "fade_in(dur=0.5)" },
  { label: "fade_out",    type: "function", detail: "disappear",      info: "fade_out(dur=0.4)" },
  { label: "scale",       type: "function", detail: "resize",         info: "scale(to=1.5, dur=0.4)" },
  { label: "rotate",      type: "function", detail: "spin",           info: "rotate(to=90, dur=0.5)" },
  { label: "shake",       type: "function", detail: "oscillate",      info: "shake(intensity=5, dur=0.5)" },
  { label: "say",         type: "function", detail: "speech bubble",  info: 'say("text", dur=1.0)' },
  { label: "throw",       type: "function", detail: "projectile",     info: "throw(asset, to=actor, dur=0.8)" },
  { label: "play",        type: "function", detail: "run sequence",   info: "play(seqName, key=value)" },
  { label: "punch",       type: "function", detail: "figure only",    info: "punch(side=right, dur=0.3)" },
  { label: "kick",        type: "function", detail: "figure only",    info: "kick(side=left, dur=0.35)" },
  { label: "rotate_part", type: "function", detail: "figure only",    info: "rotate_part(part=arm_right, to=90, dur=0.4)" },
  { label: "face",        type: "function", detail: "figure only",    info: 'face("😎")' },
];

const paramCompletions: Completion[] = [
  { label: "from=",      type: "property", detail: "direction",    apply: "from=" },
  { label: "to=",        type: "property", detail: "target",       apply: "to=" },
  { label: "dur=",       type: "property", detail: "duration (s)", apply: "dur=" },
  { label: "ease=",      type: "property", detail: "easing",       apply: "ease=" },
  { label: "intensity=", type: "property", detail: "shake px",     apply: "intensity=" },
  { label: "side=",      type: "property", detail: "left|right",   apply: "side=" },
  { label: "part=",      type: "property", detail: "body part",    apply: "part=" },
  { label: "width=",     type: "property", detail: "scene width",  apply: "width=" },
  { label: "height=",    type: "property", detail: "scene height", apply: "height=" },
  { label: "fps=",       type: "property", detail: "frames/sec",   apply: "fps=" },
  { label: "bg=",        type: "property", detail: "background",   apply: "bg=" },
  { label: "opacity",    type: "property", detail: "0-1",          apply: "opacity " },
  { label: "scale",      type: "property", detail: "factor",       apply: "scale " },
  { label: "size",       type: "property", detail: "font px",      apply: "size " },
];

const valueCompletions: Record<string, Completion[]> = {
  "from=": [
    { label: "left",   type: "constant" },
    { label: "right",  type: "constant" },
    { label: "top",    type: "constant" },
    { label: "bottom", type: "constant" },
  ],
  "ease=": [
    { label: "linear", type: "constant" },
    { label: "in",     type: "constant" },
    { label: "out",    type: "constant" },
    { label: "inout",  type: "constant" },
  ],
  "side=": [
    { label: "left",  type: "constant" },
    { label: "right", type: "constant" },
  ],
  "part=": [
    { label: "head",      type: "constant" },
    { label: "face",      type: "constant" },
    { label: "body",      type: "constant" },
    { label: "arm_left",  type: "constant" },
    { label: "arm_right", type: "constant" },
    { label: "leg_left",  type: "constant" },
    { label: "leg_right", type: "constant" },
  ],
};

const genderCompletions: Completion[] = [
  { label: "m", type: "constant", detail: "male" },
  { label: "f", type: "constant", detail: "female" },
];

function markdyCompletion(context: CompletionContext): CompletionResult | null {
  // Get the line up to cursor
  const line = context.state.doc.lineAt(context.pos);
  const textBefore = line.text.slice(0, context.pos - line.from);

  // After a parameter name with = (value completions)
  for (const [param, values] of Object.entries(valueCompletions)) {
    const paramName = param.replace("=", "");
    const re = new RegExp(`${paramName}=([a-z]*)$`);
    const m = textBefore.match(re);
    if (m) {
      return {
        from: context.pos - (m[1]?.length ?? 0),
        options: values,
      };
    }
  }

  // After a dot — suggest actions
  const dotMatch = textBefore.match(/\.([a-z_]*)$/);
  if (dotMatch) {
    return {
      from: context.pos - dotMatch[1].length,
      options: actionCompletions,
    };
  }

  // Inside parentheses — suggest parameters
  const parenMatch = textBefore.match(/\(([^)]*,\s*)?([a-z_]*)$/);
  if (parenMatch && textBefore.includes("(")) {
    // Check if we're in a figure() call — suggest gender
    const figureMatch = textBefore.match(/figure\s*\([^,]*,\s*([a-z]*)$/);
    if (figureMatch) {
      return {
        from: context.pos - figureMatch[1].length,
        options: genderCompletions,
      };
    }

    return {
      from: context.pos - (parenMatch[2]?.length ?? 0),
      options: paramCompletions,
    };
  }

  // After = on an actor line — suggest types
  const actorTypeMatch = textBefore.match(/actor\s+\w+\s*=\s*([a-z]*)$/);
  if (actorTypeMatch) {
    return {
      from: context.pos - actorTypeMatch[1].length,
      options: typeCompletions,
    };
  }

  // After = on an asset line — suggest image/icon
  const assetTypeMatch = textBefore.match(/asset\s+\w+\s*=\s*([a-z]*)$/);
  if (assetTypeMatch) {
    return {
      from: context.pos - assetTypeMatch[1].length,
      options: typeCompletions.filter(c => c.label === "image" || c.label === "icon"),
    };
  }

  // Start of line — suggest keywords and time markers
  const wordMatch = textBefore.match(/^([a-z]*)$/);
  if (wordMatch) {
    return {
      from: context.pos - wordMatch[1].length,
      options: keywordCompletions,
    };
  }

  // Explicit completion request (Ctrl+Space)
  if (context.explicit) {
    const lastWord = textBefore.match(/([a-zA-Z_]*)$/);
    return {
      from: context.pos - (lastWord ? lastWord[1].length : 0),
      options: [
        ...keywordCompletions,
        ...typeCompletions,
        ...actionCompletions,
        ...paramCompletions,
      ],
    };
  }

  return null;
}

export const markdyAutocomplete = autocompletion({
  override: [markdyCompletion],
  activateOnTyping: true,
  icons: true,
});

/* ── Bundled language support ──────────────────────────────────────── */

export function markdySupport() {
  return [
    markdyLanguage,
    markdyAutocomplete,
  ];
}
