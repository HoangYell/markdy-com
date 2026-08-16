import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

type PackageMetadata = {
  version: string;
};

export type AgentReference = {
  content: string;
  version: string;
  status: string;
  specVersion: string;
  timeUpdated: string;
  lastUpdated: string;
  canonicalMarkdownUrl: string;
  humanUrl: string;
  llmsUrl: string;
  fullContextUrl: string;
  githubUrl: string;
};

const canonicalMarkdownUrl = "https://markdy.com/AGENT.md";
const humanUrl = "https://markdy.com/agent/";
const llmsUrl = "https://markdy.com/llms.txt";
const fullContextUrl = "https://markdy.com/llms-full.txt";
const githubUrl = "https://github.com/HoangYell/markdy-com/blob/main/docs/AGENT.md";

export async function getProjectVersion() {
  const packageJson = JSON.parse(await readRepoFile("package.json")) as PackageMetadata;
  return packageJson.version;
}

let repoRootPromise: Promise<string> | undefined;

async function readRepoFile(relativePath: string) {
  return readFile(join(await getRepoRoot(), relativePath), "utf8");
}

async function getRepoRoot() {
  repoRootPromise ??= findRepoRoot();
  return repoRootPromise;
}

async function findRepoRoot() {
  const candidates = [process.cwd(), join(process.cwd(), "..")];

  for (const candidate of candidates) {
    if (await fileExists(join(candidate, "docs", "AGENT.md"))) {
      return candidate;
    }
  }

  throw new Error(`Unable to locate Markdy repository root from ${process.cwd()}`);
}

async function fileExists(path: string) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (!isMissingFileError(error)) {
      throw error;
    }
    return false;
  }
}

function isMissingFileError(error: unknown) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function extractHeaderMetadata(content: string) {
  const statusMatch = content.match(/\*\*Status\*\*:\s*([^\n\r]+)/i);
  const specVersionMatch = content.match(/\*\*Specification Version\*\*:\s*([^\n\r]+)/i);
  const timeUpdatedMatch = content.match(/\*\*Time Updated\*\*:\s*([^\n\r]+)/i);
  const lastUpdatedMatch = content.match(/\*\*Last Updated\*\*:\s*([^\n\r]+)/i);

  return {
    status: statusMatch ? statusMatch[1].trim() : "Active & Canonical",
    specVersion: specVersionMatch ? specVersionMatch[1].trim() : "0.8.x",
    timeUpdated: timeUpdatedMatch ? timeUpdatedMatch[1].trim() : (lastUpdatedMatch ? lastUpdatedMatch[1].trim() : "2026-08-16"),
    lastUpdated: lastUpdatedMatch ? lastUpdatedMatch[1].trim() : "2026-08-16",
  };
}

export async function getAgentReference(): Promise<AgentReference> {
  const [content, version] = await Promise.all([
    readRepoFile("docs/AGENT.md"),
    getProjectVersion(),
  ]);

  const meta = extractHeaderMetadata(content);

  return {
    content,
    version,
    status: meta.status,
    specVersion: meta.specVersion,
    timeUpdated: meta.timeUpdated,
    lastUpdated: meta.lastUpdated,
    canonicalMarkdownUrl,
    humanUrl,
    llmsUrl,
    fullContextUrl,
    githubUrl,
  };
}

export function textHeaders(contentType: string, version: string) {
  return {
    "Content-Type": `${contentType}; charset=utf-8`,
    "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "X-Markdy-Version": version,
  };
}

export function buildLlmsTxt(reference: AgentReference) {
  return `# Markdy

> Open-source diagram-native DSL for animated architecture and system diagrams — write semantic nodes, groups, beats, flows, and cues to get browser-native motion diagrams.

MarkdyScript is the language used by Markdy. It declares scenes, semantic architecture nodes, groups, beats, flow operators, and cues for animated technical diagrams.

## Authoritative Specification (Fetch First)
The canonical single source of truth for MarkdyScript syntax is:
**${reference.canonicalMarkdownUrl}**

When generating MarkdyScript:
1. Always follow ${reference.canonicalMarkdownUrl}.
2. Do not invent undocumented syntax or rely on older cached model memory.
3. Treat deprecated syntax as invalid.

Current Version: ${reference.version}
Time Updated: ${reference.timeUpdated}
Specification: ${reference.specVersion}

## Core Docs

- [Canonical AI Agent Reference](${reference.canonicalMarkdownUrl}): Single source of truth for current MarkdyScript syntax, node kinds, flow operators, beats, cues, patterns, validation rules, and AI-generation guidance.
- [Full LLM Context Bundle](${reference.fullContextUrl}): Complete text bundle generated from docs/AGENT.md for tools that prefer one fetch.
- [Human-Readable Agent Guide](${reference.humanUrl}): Crawlable HTML mirror of the canonical AI reference.
- [Documentation](${new URL("/docs/", reference.humanUrl).toString()}): Human documentation hub for MarkdyScript tutorials, syntax, examples, and integrations.
- [Playground](${new URL("/playground/", reference.humanUrl).toString()}): Browser workspace for testing and validating MarkdyScript scenes.

## Optional

- [GitHub Source](${reference.githubUrl}): Repository copy of the maintained docs/AGENT.md source.
- [@markdy/core](https://www.npmjs.com/package/@markdy/core): Parser and diagram compiler package.
- [@markdy/renderer-dom](https://www.npmjs.com/package/@markdy/renderer-dom): Browser renderer package.
- [@markdy/astro](https://www.npmjs.com/package/@markdy/astro): Astro integration package.
- [@markdy/mdx](https://www.npmjs.com/package/@markdy/mdx): MDX integration package.
- [@markdy/cli](https://www.npmjs.com/package/@markdy/cli): CLI validation, formatting, rendering, and preview package.
`;
}

export function buildFullLlmsTxt(reference: AgentReference) {
  return `# Markdy full LLM context

Canonical source: ${reference.canonicalMarkdownUrl}
Human-readable page: ${reference.humanUrl}
GitHub source: ${reference.githubUrl}
Current Version: ${reference.version}
Time Updated: ${reference.timeUpdated}
Last Updated: ${reference.lastUpdated}
Status: ${reference.status}
Specification Version: ${reference.specVersion}

The content below is generated directly from docs/AGENT.md during the website build.

---

${reference.content}`;
}
