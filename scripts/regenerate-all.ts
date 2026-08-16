#!/usr/bin/env tsx
import { writeFile, mkdir, readFile, readdir } from "node:fs/promises";
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
  {
    id: "modes",
    name: "diagram modes",
    summary: "Choose architecture, flowchart, tree, state, or sequence composition.",
    example: 'scene "Signal" theme=nebula type=constellation',
  },
  {
    id: "visuals",
    name: "visual primitives",
    summary: "Add structural edges, annotations, zones, and semantic surface primitives.",
    example: 'annotation "Hot path" target=API position=top-right',
  },
];

// The canonical, always-current reference for AI tools. The website serves this
// from docs/AGENT.md, so agents should fetch it instead of relying on this short prompt alone.
const CANONICAL_AGENT_URL = "https://markdy.com/AGENT.md";
const CANONICAL_LLMS_URL = "https://markdy.com/llms.txt";

const SYSTEM_PROMPT = `# MarkdyScript Agent Instructions

> **AUTHORITATIVE SPECIFICATION**: Follow ${CANONICAL_AGENT_URL} as the single source of truth. Disregard outdated or conflicting syntax from prior conversations, cached documentation, or historical model memory.

You write **diagram-native MarkdyScript** for animated software architecture diagrams: declarative scenes made of nodes, groups, beats, flow operators, and cues.

## Canonical reference (fetch this first)
- Authoritative guide: ${CANONICAL_AGENT_URL}
- LLM index: ${CANONICAL_LLMS_URL}

Fetch and follow the canonical guide above before generating MarkdyScript. This prompt is only a short summary; the hosted guide is the single source of truth and stays in sync with each release.

## Rules
- Use \`scene\`, node kinds, \`group\`, \`beat\`, flow operators, and optional \`pattern\`/\`use\`.
- Use architecture node declarations directly: \`service API\`, \`database DB\`, \`queue Events\`.
- Prefer concise beats over pixel coordinates.
- Default theme: \`paper\`. Default layout: \`LR\`.
- Optional modes: \`architecture\`, \`flowchart\`, \`tree\`, \`state\`, \`sequence\`, and \`constellation\`.
- Use \`theme=editorial\` for flat documentation scenes or \`theme=nebula\` for radial/surreal scenes; other themes are \`paper\`, \`midnight\`, \`blueprint\`, and \`graphite\`.

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

async function updateDocsMetadata(version: string, specVersion: string, nowIso: string, today: string) {
  const docsDir = join(ROOT, "docs");
  const files = await readdir(docsDir);

  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    const filePath = join(docsDir, file);
    let content = await readFile(filePath, "utf8");

    content = content.replace(/(>\s*-\s*\*\*Current Version\*\*:\s*)v?[^\n\r]+/gi, `$1v${version}`);
    content = content.replace(/(>\s*-\s*\*\*Specification Version\*\*:\s*)[^\n\r]+/gi, `$1${specVersion}`);
    content = content.replace(/(>\s*-\s*\*\*Time Updated\*\*:\s*)[^\n\r]+/gi, `$1${nowIso}`);
    content = content.replace(/(>\s*-\s*\*\*Last Updated\*\*:\s*)[^\n\r]+/gi, `$1${today}`);

    await writeFile(filePath, content, "utf8");
  }
}

async function main() {
  const pkgJsonRaw = await readFile(join(ROOT, "package.json"), "utf8");
  const pkgJson = JSON.parse(pkgJsonRaw);
  const version = pkgJson.version || "0.8.26";
  const specVersion = version.split(".").slice(0, 2).join(".") + ".x";
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const nowIso = now.toISOString();

  const promptMd = join(ROOT, "prompts/system-prompt.md");
  const promptJson = join(ROOT, "prompts/system-prompt.json");
  const webPromptMd = join(ROOT, "website/public/prompts/system-prompt.md");
  const webPromptJson = join(ROOT, "website/public/prompts/system-prompt.json");

  await writeFile(promptMd, SYSTEM_PROMPT);
  await writeFile(promptJson, JSON.stringify({ version, specVersion, features: FEATURES, prompt: SYSTEM_PROMPT }, null, 2));
  await mkdir(dirname(webPromptMd), { recursive: true });
  await writeFile(webPromptMd, SYSTEM_PROMPT);
  await writeFile(webPromptJson, JSON.stringify({ version, specVersion, features: FEATURES, prompt: SYSTEM_PROMPT }, null, 2));

  await updateDocsMetadata(version, specVersion, nowIso, today);

  console.log(`regen: synchronized metadata for Markdy v${version} (spec: ${specVersion}, date: ${today})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
