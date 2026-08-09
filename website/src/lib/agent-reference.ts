import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

type PackageMetadata = {
  version: string;
};

export type AgentReference = {
  content: string;
  version: string;
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

async function getVersion() {
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

export async function getAgentReference(): Promise<AgentReference> {
  const [content, version] = await Promise.all([
    readRepoFile("docs/AGENT.md"),
    getVersion(),
  ]);

  return {
    content,
    version,
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
    "X-Markdy-Version": version,
  };
}

export function buildLlmsTxt(reference: AgentReference) {
  return `# Markdy

> Open-source DSL for animated architecture and system diagrams — write plain text, get browser-native animated diagrams.

MarkdyScript is the language used by Markdy. It declares scenes, architecture nodes, groups, beats, flow operators, and cues for animated technical diagrams.

Version: ${reference.version}

## Primary AI entry points

- Canonical AI agent reference (single source of truth): ${reference.canonicalMarkdownUrl}
- Full LLM context bundle: ${reference.fullContextUrl}
- Human-readable agent page: ${reference.humanUrl}
- Playground: https://markdy.com/playground/
- Documentation: https://markdy.com/docs/
- GitHub source: ${reference.githubUrl}

## Guidance for AI agents

Fetch and follow ${reference.canonicalMarkdownUrl} before generating MarkdyScript. Prefer the canonical guide over older model memory, snippets in chats, or third-party cached examples.

## Useful package links

- @markdy/core: https://www.npmjs.com/package/@markdy/core
- @markdy/renderer-dom: https://www.npmjs.com/package/@markdy/renderer-dom
- @markdy/astro: https://www.npmjs.com/package/@markdy/astro
- @markdy/mdx: https://www.npmjs.com/package/@markdy/mdx
- @markdy/cli: https://www.npmjs.com/package/@markdy/cli
`;
}

export function buildFullLlmsTxt(reference: AgentReference) {
  return `# Markdy full LLM context

Canonical source: ${reference.canonicalMarkdownUrl}
Human-readable page: ${reference.humanUrl}
GitHub source: ${reference.githubUrl}
Version: ${reference.version}

The content below is generated directly from docs/AGENT.md during the website build.

---

${reference.content}`;
}
