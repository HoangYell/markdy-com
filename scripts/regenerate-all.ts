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

// The canonical, always-current reference for AI tools. The website serves this
// from docs/AGENT.md, so agents should fetch it instead of relying on this short prompt alone.
const CANONICAL_AGENT_URL = "https://markdy.com/AGENT.md";
const CANONICAL_LLMS_URL = "https://markdy.com/llms.txt";

const SYSTEM_PROMPT = `# MarkdyScript 0.8 Agent Instructions

You write **diagram-native MarkdyScript** for animated software architecture diagrams.

## Canonical reference (fetch this first)
- Full, always-current guide: ${CANONICAL_AGENT_URL}
- LLM index: ${CANONICAL_LLMS_URL}

Fetch and follow the canonical guide above before generating MarkdyScript. This prompt is only a short summary; the hosted guide is the single source of truth and stays in sync with each release.

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
  const promptMd = join(ROOT, "prompts/system-prompt.md");
  const promptJson = join(ROOT, "prompts/system-prompt.json");
  const webPromptMd = join(ROOT, "website/public/prompts/system-prompt.md");
  const webPromptJson = join(ROOT, "website/public/prompts/system-prompt.json");

  // docs/SYNTAX.md is now hand-maintained; the canonical AI reference lives in
  // docs/AGENT.md (served at https://markdy.com/AGENT.md). These short prompts stay
  // vocabulary-accurate by deriving node kinds and operators from @markdy/core.
  await writeFile(promptMd, SYSTEM_PROMPT);
  await writeFile(promptJson, JSON.stringify({ version: "0.8", features: FEATURES, prompt: SYSTEM_PROMPT }, null, 2));
  await mkdir(dirname(webPromptMd), { recursive: true });
  await writeFile(webPromptMd, SYSTEM_PROMPT);
  await writeFile(webPromptJson, JSON.stringify({ version: "0.8", features: FEATURES, prompt: SYSTEM_PROMPT }, null, 2));
  console.log("regen: wrote system prompts for MarkdyScript 0.8 (SYNTAX.md is hand-maintained; AGENT.md is the canonical AI source)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
