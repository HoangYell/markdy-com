import { afterEach, describe, it, expect } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runCli, type CliIo } from "../src/index.js";

class BufferIo implements CliIo {
  readonly out: string[] = [];
  readonly err: string[] = [];
  stdout(message: string): void { this.out.push(message); }
  stderr(message: string): void { this.err.push(message); }
}

const tempDirs: string[] = [];
async function tempDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "markdy-cli-verify-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("markdy cli guide, recipe, and verify commands", () => {
  it("runs markdy guide without arguments to list catalog", async () => {
    const io = new BufferIo();
    const result = await runCli(["guide"], io, { openBrowser: async () => {} });
    expect(result.exitCode).toBe(0);
    expect(io.out.join("\n")).toContain("Markdy Architecture Recipe Catalog");
    expect(io.out.join("\n")).toContain("cache-aside");
  });

  it("runs markdy guide with scenario query to recommend architecture pattern", async () => {
    const io = new BufferIo();
    const result = await runCli(["guide", "Kafka", "streaming", "event-driven"], io, { openBrowser: async () => {} });
    expect(result.exitCode).toBe(0);
    expect(io.out.join("\n")).toContain("Recommended Architecture Pattern");
    expect(io.out.join("\n")).toContain("event-driven-eda");
  });

  it("runs markdy recipe to print canonical blueprint script", async () => {
    const io = new BufferIo();
    const result = await runCli(["recipe", "cache-aside"], io, { openBrowser: async () => {} });
    expect(result.exitCode).toBe(0);
    expect(io.out.join("\n")).toContain("scene \"Multi-Tier Cache-Aside Architecture\"");
    expect(io.out.join("\n")).toContain("cache RedisCluster");
  });

  it("runs markdy guide with --synthesize to generate custom architecture dynamically", async () => {
    const io = new BufferIo();
    const result = await runCli(["guide", "Next.js", "frontend", "with", "Redis", "cache", "--synthesize"], io, { openBrowser: async () => {} });
    expect(result.exitCode).toBe(0);
    expect(io.out.join("\n")).toContain("Dynamic Architecture Synthesis");
    expect(io.out.join("\n")).toContain("NextApp");
    expect(io.out.join("\n")).toContain("RedisCache");
  });

  it("runs markdy verify on a valid diagram scene", async () => {
    const dir = await tempDir();
    const file = join(dir, "valid.markdy");
    await writeFile(
      file,
      `scene "Valid Scene" theme=midnight\nlayout LR\nbrowser Client "Web"\nservice API "API"\n\nbeat main:\n  Client -> API "req"\n`,
      "utf8"
    );

    const io = new BufferIo();
    const result = await runCli(["verify", file], io, { openBrowser: async () => {} });
    expect(result.exitCode).toBe(0);
    expect(io.out.join("\n")).toContain("Markdy 9-Point Quality Gate");
    expect(io.out.join("\n")).toContain("PASSED");
    expect(io.out.join("\n")).toContain("sha256-");
  });

  it("runs markdy verify with JSON output format", async () => {
    const dir = await tempDir();
    const file = join(dir, "valid.markdy");
    await writeFile(
      file,
      `scene "Valid Scene" theme=midnight\nlayout LR\nbrowser Client "Web"\nservice API "API"\n\nbeat main:\n  Client -> API "req"\n`,
      "utf8"
    );

    const io = new BufferIo();
    const result = await runCli(["verify", file, "--json"], io, { openBrowser: async () => {} });
    expect(result.exitCode).toBe(0);
    const parsed = JSON.parse(io.out.join("\n"));
    expect(parsed.passed).toBe(true);
    expect(parsed.checks.length).toBe(12);
    expect(parsed.sha256Receipt).toBeDefined();
  });
});

