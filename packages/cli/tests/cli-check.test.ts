import { describe, it, expect, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  runCli,
  type CliIo,
  extractDiagramsFromMarkdown,
  extractDiagramsFromHtml,
} from "../src/index.js";

class BufferIo implements CliIo {
  readonly out: string[] = [];
  readonly err: string[] = [];
  stdout(message: string): void {
    this.out.push(message);
  }
  stderr(message: string): void {
    this.err.push(message);
  }
}

const tempDirs: string[] = [];
async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "markdy-cli-check-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("@markdy/cli: markdy check subcommand", () => {
  it("extracts diagrams from markdown fences and MDX JSX tags", () => {
    const markdown = `# Architecture Docs

Here is a fenced block:
\`\`\`markdy
scene theme=paper
browser Client
service API
beat main:
  Client -> API "GET /"
\`\`\`

And here is an MDX component:
<Markdy
  code={\`
scene theme=midnight
layout LR
service Order
database DB
beat flow:
  Order -> DB "query"
\`}
  width={1280}
/>

And another JSX component:
<MarkdyDiagram code={"scene\\nservice Auth"} />
`;

    const diagrams = extractDiagramsFromMarkdown(markdown);
    expect(diagrams).toHaveLength(3);
    expect(diagrams[0].kind).toBe("fence");
    expect(diagrams[0].code).toContain("browser Client");
    expect(diagrams[1].kind).toBe("mdx-jsx");
    expect(diagrams[1].code).toContain("service Order");
    expect(diagrams[2].kind).toBe("mdx-jsx");
    expect(diagrams[2].code).toContain("service Auth");
  });

  it("extracts and decodes base64 diagrams from built HTML", () => {
    const markdyCode = "scene theme=paper\nservice API\nbeat main:\n  show API";
    const b64 = Buffer.from(markdyCode, "utf8").toString("base64");
    const html = `<!doctype html>
<html>
  <body>
    <div class="markdy-root" data-markdy-code-b64="${b64}"></div>
  </body>
</html>`;

    const diagrams = extractDiagramsFromHtml(html);
    expect(diagrams).toHaveLength(1);
    expect(diagrams[0].code).toBe(markdyCode);
  });

  it("validates valid .markdy and .mdx files via markdy check", async () => {
    const dir = await tempDir();
    const markdyFile = join(dir, "arch.markdy");
    await writeFile(
      markdyFile,
      'scene theme=paper\nlayout LR\nbrowser Client\nservice API\n\nbeat main:\n  Client -> API "ping"\n',
      "utf8",
    );

    const mdxFile = join(dir, "page.mdx");
    await writeFile(
      mdxFile,
      `# System Overview

<Markdy code={\`
scene theme=paper
layout LR
browser Client
service API

beat main:
  show $nodes
  Client -> API "GET /users"
\`} />
`,
      "utf8",
    );

    const io = new BufferIo();
    const result = await runCli(["check", dir], io);

    expect(result.exitCode).toBe(0);
    const stdout = io.out.join("\n");
    expect(stdout).toContain("OK");
    expect(stdout).toContain("arch.markdy");
    expect(stdout).toContain("page.mdx (1 diagram)");
    expect(stdout).toContain("markdy check: PASS — 2 file(s) scanned, 2 diagram(s) verified, 0 warnings.");
  });

  it("fails and reports exact mapped line numbers for invalid syntax in .mdx", async () => {
    const dir = await tempDir();
    const mdxFile = join(dir, "broken.mdx");
    await writeFile(
      mdxFile,
      `# Page Title
Some text...

<Markdy code={\`
scene theme=paper
layout LR
service API
Client -> API "invalid cue outside beat"
\`} />
`,
      "utf8",
    );

    const io = new BufferIo();
    const result = await runCli(["check", mdxFile], io);

    expect(result.exitCode).toBe(1);
    const stderr = io.err.join("\n");
    expect(stderr).toContain("FAIL");
    expect(stderr).toContain("broken.mdx");
    expect(stderr).toContain("CUE_OUTSIDE_BEAT");
    expect(stderr).toContain("Recommendation:");
  });

  it("validates built HTML output with --dist flag", async () => {
    const dir = await tempDir();
    const distDir = join(dir, "dist");
    await mkdir(distDir, { recursive: true });

    const validCode = "scene theme=paper\nservice API\nbeat main:\n  show API";
    const validB64 = Buffer.from(validCode, "utf8").toString("base64");
    await writeFile(
      join(distDir, "index.html"),
      `<html><body><div data-markdy-code-b64="${validB64}"></div></body></html>`,
      "utf8",
    );

    const io = new BufferIo();
    const result = await runCli(["check", "--dist", distDir], io);

    expect(result.exitCode).toBe(0);
    const stdout = io.out.join("\n");
    expect(stdout).toContain("OK");
    expect(stdout).toContain("index.html (1 compiled runtime diagram)");
    expect(stdout).toContain("markdy check: PASS");
  });

  it("outputs structured JSON when --json flag is passed", async () => {
    const dir = await tempDir();
    const markdyFile = join(dir, "scene.markdy");
    await writeFile(
      markdyFile,
      'scene theme=paper\nservice API\nbeat main:\n  show API',
      "utf8",
    );

    const io = new BufferIo();
    const result = await runCli(["check", markdyFile, "--json"], io);

    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(io.out.join("\n"));
    expect(parsed.summary.passed).toBe(true);
    expect(parsed.summary.filesScanned).toBe(1);
    expect(parsed.summary.diagramsVerified).toBe(1);
    expect(parsed.results[0].file).toBe(markdyFile);
  });
});
