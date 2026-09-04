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
// from AGENT.md, so agents should fetch it instead of relying on this short prompt alone.
const CANONICAL_AGENT_URL = "https://markdy.com/AGENT.md";
const CANONICAL_LLMS_URL = "https://markdy.com/llms.txt";

const SYSTEM_PROMPT = `# MarkdyScript Agent Instructions

> **AUTHORITATIVE SPECIFICATION**: Follow ${CANONICAL_AGENT_URL} as the single source of truth. Disregard outdated or conflicting syntax from prior conversations, cached documentation, or historical model memory.

You write **diagram-native MarkdyScript** for animated software architecture diagrams. Output self-contained, valid \`.markdy\` code blocks starting with \`scene\`.

## Canonical Reference (Fetch First)
- Canonical guide: ${CANONICAL_AGENT_URL}
- LLM index: ${CANONICAL_LLMS_URL}

## ⚡ The 4-Step Structural Blueprint
1. **Scene Directives**: \`scene theme=paper width=1280 height=720\` and \`layout LR\`
2. **Node Declarations**: \`<kind> <Id> ["Display Label"]\` (declare at top-level before beats)
3. **Groups (Optional/Reserved)**: \`group <id> "<Label>": <Node1> <Node2>\`
4. **Storyboard Beats**: \`beat <id> "<Caption>":\` containing indented flows and cues

## Closed Keyword Vocabularies
- **Themes**: \`paper\` (default), \`editorial\`, \`midnight\`, \`blueprint\`, \`graphite\`, \`nebula\`, \`sketchy\`, \`terminal\`, \`ink\`, \`doodle\`
- **Layouts**: \`LR\` (default), \`TB\`, \`RL\`, \`BT\`
- **Modes (\`type=\`)**: \`architecture\` (default), \`flowchart\`, \`tree\`, \`state\`, \`sequence\`, \`constellation\`, \`loop\`, \`flywheel\`, \`medallion\`, \`quadrant\`, \`swimlane\`, \`pyramid\`, \`radar\`, \`timeline\`, \`gantt\`, \`venn\`, \`layers\`, \`nested\`
- **Node Kinds**:
  - *Compute/API*: \`service\`, \`api\`, \`microservice\`, \`backend\`, \`worker\`, \`job\`, \`lambda\`
  - *Client/UI*: \`client\`, \`user\`, \`browser\`, \`mobile\`, \`frontend\`, \`app\`
  - *Data/Storage*: \`database\`, \`db\`, \`cache\`, \`warehouse\`, \`storage\`, \`bucket\`
  - *Messaging*: \`queue\`, \`topic\`, \`stream\`, \`event\`, \`bus\`, \`kafka\`
  - *Network*: \`gateway\`, \`api_gateway\`, \`load_balancer\`, \`cdn\`, \`cloud\`
  - *Platform*: \`container\`, \`cluster\`, \`pod\`, \`ingress\`
  - *Security*: \`auth\`, \`vault\`, \`secret\`, \`identity\`
- **Flow Operators**:
  - \`->\` = Forward call / request (determines layout rank)
  - \`<-\` = Return / response (excluded from rank — **prevents layout cycles!**)
  - \`~>\` = Asynchronous event / pub-sub
  - \`--\` = Structural dependency
- **Visual Cues**: \`show $nodes\`, \`hide\`, \`frame <targets> [zoom=1.15]\`, \`glow <targets> [color=#hex]\`, \`focus\`, \`&\` (parallel)

## 🚫 Critical Anti-Hallucination Rules
1. **Never use \`->\` for return responses**: Use \`A <- B "200 OK"\` instead of \`B -> A "200 OK"\` to avoid cyclical ranking overlap.
2. **Flows inside beats only**: Place all \`->\`, \`<-\`, \`~>\` actions inside named \`beat:\` blocks.
3. **Double quotes for multi-word labels**: Use \`service API "Order Gateway"\`, not unquoted words.
4. **Alphanumeric node IDs**: Identifiers must be single tokens without spaces (e.g. \`OrderService\`).

## Canonical Minimal Example
\`\`\`markdy
scene theme=paper width=1280 height=720
layout LR

browser Client "Web Browser"
gateway Gateway "API Gateway"
service OrderService "Order Service"
database OrdersDB "Orders DB"

beat main "Order Placement Flow":
  show $nodes stagger=40ms
  Client -> Gateway "POST /orders" -> OrderService "create_order"
  OrderService -> OrdersDB "INSERT order"
  OrderService <- OrdersDB "200 OK"
  Client <- Gateway "201 Created"
\`\`\`
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
