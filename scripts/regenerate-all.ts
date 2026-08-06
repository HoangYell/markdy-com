#!/usr/bin/env tsx
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { NODE_KINDS, EDGE_OPERATORS } from "../packages/core/src/index.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const FEATURES = [
  {
    id: "scene",
    name: "scene",
    summary: "Declare canvas, title, theme, and defaults.",
    example: 'scene "Checkout" theme=paper',
  },
  {
    id: "nodes",
    name: "nodes",
    summary: "Declare architecture nodes with kind, id, and optional label.",
    example: 'service API "Checkout API"',
  },
  {
    id: "beats",
    name: "beats",
    summary: "Group narrative cues into named beats.",
    example: 'beat create:\n  Browser -> API "POST /checkout"',
  },
  {
    id: "flows",
    name: "flow operators",
    summary: "Chain request, response, event, and dependency edges.",
    example: 'API -> DB "persist" & API ~> Queue "enqueue"',
  },
];

const SYNTAX_ADDENDUM = `
## MarkdyScript 0.8 — Diagram-Native Grammar

MarkdyScript is now diagram-first. Declare nodes, groups, and beats — the engine handles layout, routing, timing, and rendering.

### Scene

\`\`\`markdy
scene "URL Shortener" theme=paper
layout LR
\`\`\`

### Nodes

\`\`\`markdy
browser Browser
service API "API Gateway"
database UrlDB "URL Store"
\`\`\`

Supported node kinds include: ${[...NODE_KINDS].slice(0, 12).join(", ")}, and more.

### Groups

\`\`\`markdy
group storage: Redis UrlDB
\`\`\`

### Beats and flows

\`\`\`markdy
beat create:
  show $nodes stagger=60ms
  Browser -> API "POST /shorten" -> Shortener
  Shortener ~> Redis "warm cache"
  Browser <- Shortener "short.ly/a7"
\`\`\`

Flow operators:
${Object.entries(EDGE_OPERATORS).map(([op, kind]) => `- \`${op}\` — ${kind}`).join("\n")}

### Patterns

\`\`\`markdy
pattern lookup(client, store):
  $client -> $store "lookup"
  $client <- $store "result"

beat main:
  use lookup(API, DB)
\`\`\`

### Themes

- \`paper\` — light documentation canvas (default)
- \`midnight\` — dark developer canvas
- \`blueprint\` — technical blueprint canvas
- \`graphite\` — restrained dark graphite canvas
`;

const SYSTEM_PROMPT = `# MarkdyScript 0.8 Agent Instructions

You write **diagram-native MarkdyScript** for animated software architecture diagrams.

## Rules
- Use \`scene\`, node kinds, \`group\`, \`beat\`, flow operators, and optional \`pattern\`/\`use\`.
- Use architecture node declarations directly: \`service API\`, \`database DB\`, \`queue Events\`.
- Prefer concise beats over pixel coordinates.
- Default theme: \`paper\`. Default layout: \`LR\`.

## Minimal example

\`\`\`markdy
scene "Request path" theme=paper
layout LR

browser Client
service API
database DB

beat main:
  show $nodes
  Client -> API "GET /items" -> DB "query"
  Client <- API "200 OK"
\`\`\`

## Node kinds
${[...NODE_KINDS].slice(0, 20).join(", ")}, ...

## Flow operators
${Object.entries(EDGE_OPERATORS).map(([op, k]) => `- ${op} = ${k}`).join("\n")}
`;

async function main() {
  const syntaxPath = join(ROOT, "docs/SYNTAX.md");
  const promptMd = join(ROOT, "prompts/system-prompt.md");
  const promptJson = join(ROOT, "prompts/system-prompt.json");
  const webPromptMd = join(ROOT, "website/public/prompts/system-prompt.md");
  const webPromptJson = join(ROOT, "website/public/prompts/system-prompt.json");

  await writeFile(syntaxPath, `# MarkdyScript Syntax Reference\n\n${SYNTAX_ADDENDUM}`);
  await writeFile(promptMd, SYSTEM_PROMPT);
  await writeFile(promptJson, JSON.stringify({ version: "0.8", features: FEATURES, prompt: SYSTEM_PROMPT }, null, 2));
  await mkdir(dirname(webPromptMd), { recursive: true });
  await writeFile(webPromptMd, SYSTEM_PROMPT);
  await writeFile(webPromptJson, JSON.stringify({ version: "0.8", features: FEATURES, prompt: SYSTEM_PROMPT }, null, 2));
  console.log("regen: wrote SYNTAX.md and system prompts for MarkdyScript 0.8");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
