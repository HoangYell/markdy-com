import { describe, it, expect } from "vitest";
import { runCli, type CliIo } from "../src/index.js";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

function createMockIo(): { stdoutBuf: string[]; stderrBuf: string[]; io: CliIo } {
  const stdoutBuf: string[] = [];
  const stderrBuf: string[] = [];
  return {
    stdoutBuf,
    stderrBuf,
    io: {
      stdout: (msg) => stdoutBuf.push(msg),
      stderr: (msg) => stderrBuf.push(msg),
    },
  };
}

describe("@markdy/cli: Extended CLI Commands", () => {
  const testDir = join(tmpdir(), `markdy-cli-test-${Date.now()}`);

  it("imports a Mermaid flowchart to MarkdyScript via CLI", async () => {
    await mkdir(testDir, { recursive: true });
    const mmdPath = join(testDir, "flow.mmd");
    await writeFile(mmdPath, "flowchart LR\n  A[App] --> B[(Database)]", "utf8");

    const { stdoutBuf, stderrBuf, io } = createMockIo();
    const result = await runCli(["import", mmdPath], io);

    expect(result.exitCode).toBe(0);
    const output = stdoutBuf.join("\n");
    expect(output).toContain("scene \"flow\" theme=paper");
    expect(output).toContain("database B");
    expect(output).toContain("A -> B");

    await rm(testDir, { recursive: true, force: true });
  });

  it("diffs two Markdy architecture files and outputs a markdown summary table", async () => {
    await mkdir(testDir, { recursive: true });
    const file1 = join(testDir, "v1.markdy");
    const file2 = join(testDir, "v2.markdy");

    await writeFile(file1, 'scene \nlayout LR\nservice Old\nbeat main:\n  show Old', "utf8");
    await writeFile(file2, 'scene \nlayout LR\nservice New\nbeat main:\n  show New', "utf8");

    const { stdoutBuf, io } = createMockIo();
    const result = await runCli(["diff", file1, file2], io);

    expect(result.exitCode).toBe(0);
    const output = stdoutBuf.join("\n");
    expect(output).toContain("Markdy Architectural Diff Summary");
    expect(output).toContain("Nodes Added");

    await rm(testDir, { recursive: true, force: true });
  });

  it("generates a shareable playground URL via markdy share", async () => {
    await mkdir(testDir, { recursive: true });
    const file = join(testDir, "share.markdy");
    await writeFile(file, 'scene \nlayout LR\nservice API\nbeat main:\n  show API', "utf8");

    const { stdoutBuf, io } = createMockIo();
    const result = await runCli(["share", file], io);

    expect(result.exitCode).toBe(0);
    const url = stdoutBuf.join("\n");
    expect(url).toContain("https://markdy.com/playground/#code=~m");

    await rm(testDir, { recursive: true, force: true });
  });

  it("enforces architecture rules when --arch-rules is passed to markdy lint", async () => {
    await mkdir(testDir, { recursive: true });
    const file = join(testDir, "bad-arch.markdy");
    await writeFile(
      file,
      'scene \nlayout LR\nbrowser UI\ndatabase DB\nbeat main:\n  UI -> DB "bypass"',
      "utf8"
    );

    const { stderrBuf, io } = createMockIo();
    const result = await runCli(["lint", file, "--arch-rules"], io);

    expect(result.exitCode).toBe(1);
    const errOutput = stderrBuf.join("\n");
    expect(errOutput).toContain("ARCH_FAIL");
    expect(errOutput).toContain("No Direct Client DB Access");

    await rm(testDir, { recursive: true, force: true });
  });

  it("loads custom architecture configuration via --config in markdy lint", async () => {
    await mkdir(testDir, { recursive: true });
    const file = join(testDir, "arch-warn.markdy");
    const configFile = join(testDir, "markdy.config.json");

    await writeFile(
      file,
      'scene \nlayout LR\nbrowser UI\ndatabase DB\nbeat main:\n  UI -> DB "bypass"',
      "utf8"
    );
    await writeFile(
      configFile,
      JSON.stringify({
        extends: ["cleanArchitecture"],
        severityOverrides: {
          "no-presentation-to-database": "warning",
        },
      }),
      "utf8"
    );

    const { stderrBuf, stdoutBuf, io } = createMockIo();
    const result = await runCli(["lint", file, "--config", configFile], io);

    expect(result.exitCode).toBe(0);
    const errOutput = stderrBuf.join("\n");
    expect(errOutput).toContain("ARCH_WARN");

    await rm(testDir, { recursive: true, force: true });
  });
});
