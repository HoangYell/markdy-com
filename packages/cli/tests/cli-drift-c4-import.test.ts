import { afterEach, describe, it, expect } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
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
  const dir = await mkdtemp(join(tmpdir(), "markdy-cli-c4-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("markdy cli c4, drift, and universal import commands", () => {
  it("runs markdy c4 to analyze hierarchical model", async () => {
    const dir = await tempDir();
    const file = join(dir, "system.markdy");
    await writeFile(
      file,
      `scene "Banking Architecture" theme=midnight\nlayout LR\nclient User "User" @c4=1\ngateway Edge "Edge" @c4=2\nservice Ledger "Ledger" @c4=3\n\nbeat main:\n  User -> Edge "Auth"\n  Edge -> Ledger "Post"\n`,
      "utf8"
    );

    const io = new BufferIo();
    const result = await runCli(["c4", file], io, { openBrowser: async () => {} });
    expect(result.exitCode).toBe(0);
    expect(io.out.join("\n")).toContain("C4 Architecture Model Hierarchy");
    expect(io.out.join("\n")).toContain("L1 System Context");
    expect(io.out.join("\n")).toContain("L2 Container Architecture");
  });

  it("runs markdy c4 with --level container to filter nodes", async () => {
    const dir = await tempDir();
    const file = join(dir, "system.markdy");
    await writeFile(
      file,
      `scene "Banking Architecture" theme=midnight\nlayout LR\nclient User "User" @c4=1\ngateway Edge "Edge" @c4=2\nservice Ledger "Ledger" @c4=3\n\nbeat main:\n  User -> Edge "Auth"\n  Edge -> Ledger "Post"\n`,
      "utf8"
    );

    const io = new BufferIo();
    const result = await runCli(["c4", file, "--level", "container"], io, { openBrowser: async () => {} });
    expect(result.exitCode).toBe(0);
    expect(io.out.join("\n")).toContain("C4 Level [CONTAINER]");
    expect(io.out.join("\n")).toContain("User, Edge");
  });

  it("runs markdy drift to verify repo synchronization", async () => {
    const dir = await tempDir();
    const srcDir = join(dir, "src", "orders");
    await mkdir(srcDir, { recursive: true });
    await writeFile(join(srcDir, "index.ts"), "export const order = {};\n", "utf8");

    const file = join(dir, "arch.markdy");
    await writeFile(
      file,
      `scene "Shop" theme=midnight\nlayout LR\nservice OrderSvc "Orders" @src="src/orders/index.ts#L1"\n`,
      "utf8"
    );

    const io = new BufferIo();
    const result = await runCli(["drift", file, "--repo", dir], io, { openBrowser: async () => {} });
    expect(result.exitCode).toBe(0);
    expect(io.out.join("\n")).toContain("Architecture Drift & Code Sync Report");
    expect(io.out.join("\n")).toContain("SYNCHRONIZED");
  });

  it("imports D2 diagram script directly via markdy import", async () => {
    const dir = await tempDir();
    const d2File = join(dir, "input.d2");
    await writeFile(
      d2File,
      `title: "D2 Mesh"\nclient: Browser\ngateway: Kong\nclient -> gateway: GET /api\n`,
      "utf8"
    );

    const io = new BufferIo();
    const result = await runCli(["import", d2File, "--from", "d2"], io, { openBrowser: async () => {} });
    expect(result.exitCode).toBe(0);
    expect(io.out.join("\n")).toContain('scene "D2 Mesh" theme=midnight');
    expect(io.out.join("\n")).toContain('client -> gateway "GET /api"');
  });

  it("imports PlantUML diagram directly via markdy import", async () => {
    const dir = await tempDir();
    const pumlFile = join(dir, "input.puml");
    await writeFile(
      pumlFile,
      `@startuml\ntitle PlantUML Mesh\nactor Client\nboundary Gateway\nClient -> Gateway : POST /api\n@enduml\n`,
      "utf8"
    );

    const io = new BufferIo();
    const result = await runCli(["import", pumlFile, "--from", "plantuml"], io, { openBrowser: async () => {} });
    expect(result.exitCode).toBe(0);
    expect(io.out.join("\n")).toContain('scene "PlantUML Mesh" theme=midnight');
    expect(io.out.join("\n")).toContain('Client -> Gateway "POST /api"');
  });
});
