/**
 * MarkdyScript 0.8 diagram language support for CodeMirror 6.
 */
import {
  BEAT_CUE_KEYWORDS,
  NODE_KINDS,
  TECHNICAL_NODE_TYPES,
  VISUAL_PRIMITIVE_TYPES,
  classifyTechnology,
} from "@markdy/core";
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
  "scene", "layout", "group", "beat", "style", "pattern", "use", "theme", "edge", "annotation",
  "LR", "RL", "TB", "BT",
  "midnight", "paper", "blueprint", "nebula", "editorial", "graphite", "terminal", "sketchy",
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


const COMMON_TECHS = [
  "postgres", "mysql", "mongodb", "redis", "memcached", "kafka", "rabbitmq",
  "sqs", "nginx", "envoy", "traefik", "kong", "aws", "gcp", "azure", "docker",
  "k8s", "lambda", "s3", "dynamodb", "graphql", "grpc", "stripe", "auth0",
  "cloudflare", "elasticsearch", "clickhouse", "snowflake", "neo4j", "vault"
];

function completions(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/[\w$.-]*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;

  const keywordOptions = Array.from(KEYWORDS).map((label) => ({
    label,
    type: "keyword" as const,
    boost: 2,
  }));

  const kindOptions = ALL_NODE_KINDS.map((label) => ({
    label,
    type: "type" as const,
    detail: "node kind",
    boost: 3,
  }));

  const techOptions = COMMON_TECHS.map((tech) => {
    const profile = classifyTechnology(tech);
    const capitalized = tech.charAt(0).toUpperCase() + tech.slice(1);
    return {
      label: tech,
      type: "class" as const,
      detail: `→ ${profile.kind}`,
      info: `Inserts semantic ${profile.kind} for ${tech}`,
      apply: `${profile.kind} ${capitalized} "${capitalized}"`,
      boost: 1,
    };
  });

  const options = [...keywordOptions, ...kindOptions, ...techOptions];
  return { from: word.from, options };
}

export const markdyLanguage = StreamLanguage.define(markdyParser);
export const markdyHighlight = syntaxHighlighting(highlight);
export const markdyCompletion = autocompletion({ override: [completions] });
export const markdyAutocomplete = markdyCompletion;
export const markdyHighlightLight = markdyHighlight;
export const markdyHighlightDark = markdyHighlight;
