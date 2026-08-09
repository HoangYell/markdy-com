import { afterEach, describe, it, expect } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runCli, type CliIo } from "../src/index.js";

class BufferIo implements CliIo {
  readonly out: string[] = [];
  readonly err: string[] = [];
  stdout(message: string): void { this.out.push(message); }
  stderr(message: string): void { this.err.push(message); }
}

const tempDirs: string[] = [];
async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "markdy-cli-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("markdy cli", () => {
  it("lints valid diagram scenes", async () => {
    const dir = await tempDir();
    const file = join(dir, "scene.markdy");
    await writeFile(file, `scene "Demo" theme=midnight\nbrowser Web\nservice API\n\nbeat main:\n  show $nodes\n  Web -> API "ping"\n`, "utf8");
    const io = new BufferIo();
    const result = await runCli(["lint", file], io, { openBrowser: async () => {} });
    expect(result.exitCode).toBe(0);
    expect(io.out.join("\n")).toContain(`OK   ${resolve(file)}`);
  });

  it("formats diagram scenes", async () => {
    const dir = await tempDir();
    const file = join(dir, "scene.markdy");
    await writeFile(file, `scene theme=midnight\nbrowser Web\nservice API\nbeat main:\n  show Web\n`, "utf8");
    const io = new BufferIo();
    const result = await runCli(["fmt", file, "--write"], io, { openBrowser: async () => {} });
    expect(result.exitCode).toBe(0);
    const formatted = await readFile(file, "utf8");
    expect(formatted).toContain("beat main:");
  });

  it("creates a diagram template with markdy new", async () => {
    const dir = await tempDir();
    const file = join(dir, "new.markdy");
    const io = new BufferIo();
    const result = await runCli(["new", file], io, { openBrowser: async () => {} });
    expect(result.exitCode).toBe(0);
    const content = await readFile(file, "utf8");
    expect(content).toContain("beat intro:");
    expect(content).toContain("service API");
  });

  it("formats idempotently and preserves response-edge direction", async () => {
    const dir = await tempDir();
    const file = join(dir, "flows.markdy");
    const source = `scene "Flows" theme=midnight\nclient Web\nservice API\n\nbeat main:\n  Web -> API "request"\n  API <- Web "response"\n`;
    await writeFile(file, source, "utf8");
    const io = new BufferIo();

    const first = await runCli(["fmt", file, "--write"], io, { openBrowser: async () => {} });
    expect(first.exitCode).toBe(0);
    const formatted = await readFile(file, "utf8");
    expect(formatted).toContain("API <- Web \"response\"");
    expect(formatted).not.toContain("__pos_");

    // A second format is a no-op: --check must pass on already-formatted output.
    const second = await runCli(["fmt", file, "--check"], new BufferIo(), { openBrowser: async () => {} });
    expect(second.exitCode).toBe(0);
  });

  it("formats frame cues and preserves node props", async () => {
    const dir = await tempDir();
    const file = join(dir, "story.markdy");
    await writeFile(file, `scene "Story" theme=paper\nservice API icon=server\nbeat main "Inspect API":\n  frame API zoom=1.2 dur=500ms\n`, "utf8");
    const io = new BufferIo();

    const result = await runCli(["fmt", file, "--write"], io, { openBrowser: async () => {} });
    expect(result.exitCode).toBe(0);
    const formatted = await readFile(file, "utf8");
    expect(formatted).toContain("service API icon=server");
    expect(formatted).toContain("beat main \"Inspect API\":");
    expect(formatted).toContain("frame API zoom=1.2 dur=0.5s");
  });
});
