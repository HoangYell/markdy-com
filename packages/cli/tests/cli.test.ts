import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { runCli, type CliIo } from "../src/index.js";

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
  const dir = await mkdtemp(join(tmpdir(), "markdy-cli-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("markdy cli", () => {
  it("resolves imported namespaces during lint", async () => {
    const dir = await tempDir();
    const child = join(dir, "characters.markdy");
    const main = join(dir, "main.markdy");

    await writeFile(
      child,
      [
        "var skin = #c68642",
        "def fighter(face) {",
        "  figure(${skin}, m, ${face})",
        "}",
        "",
      ].join("\n"),
      "utf8",
    );

    await writeFile(
      main,
      [
        'import "./characters.markdy" as chars',
        "scene width=800 height=400",
        "actor hero = chars.fighter(😎) at (400, 200)",
        "@0.0: hero.enter(from=left, dur=0.4)",
        "",
      ].join("\n"),
      "utf8",
    );

    const io = new BufferIo();
    const result = await runCli(["lint", main], io, { openBrowser: async () => {} });

    expect(result.exitCode).toBe(0);
    expect(io.out.join("\n")).toContain(`OK   ${resolve(main)}`);
    expect(io.err).toEqual([]);
  });

  it("checks and writes canonical formatting", async () => {
    const dir = await tempDir();
    const file = join(dir, "scene.markdy");

    await writeFile(
      file,
      [
        "scene width=800 height=400",
        'actor hero = figure(#c68642, m, 😎) at (100, 100)',
        "@0: hero.enter(from=left,dur=0.4)",
        "",
      ].join("\n"),
      "utf8",
    );

    const checkIo = new BufferIo();
    const check = await runCli(["fmt", file, "--check"], checkIo, { openBrowser: async () => {} });
    expect(check.exitCode).toBe(1);

    const writeIo = new BufferIo();
    const write = await runCli(["fmt", file, "--write"], writeIo, { openBrowser: async () => {} });
    expect(write.exitCode).toBe(0);

    const contents = await readFile(file, "utf8");
    expect(contents).toContain("scene width=800 height=400 fps=30");
    expect(contents).toContain("@0: hero.enter(from=left, dur=0.4)");
  });

  it("creates new starter scenes", async () => {
    const dir = await tempDir();
    const target = join(dir, "demo.markdy");
    const io = new BufferIo();

    const result = await runCli(["new", "explainer", target], io, { openBrowser: async () => {} });

    expect(result.exitCode).toBe(0);
    const contents = await readFile(target, "utf8");
    expect(contents).toBe("preset explainer\n");
  });

  it("writes standalone render html", async () => {
    const dir = await tempDir();
    const scenePath = join(dir, "scene.markdy");
    const outPath = join(dir, "scene.html");

    await writeFile(
      scenePath,
      [
        "scene width=800 height=400",
        'actor hero = figure(#c68642, m, 😎) at (100, 100)',
        "@0.0: hero.enter(from=left, dur=0.4)",
        "",
      ].join("\n"),
      "utf8",
    );

    const io = new BufferIo();
    const result = await runCli(["render", scenePath, "--out", outPath], io, { openBrowser: async () => {} });

    expect(result.exitCode).toBe(0);
    const html = await readFile(outPath, "utf8");
    expect(html).toContain("https://esm.sh/@markdy/core@0.7.14");
    expect(html).toContain("createPlayer");
  });
});
