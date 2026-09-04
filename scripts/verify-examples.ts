#!/usr/bin/env tsx
import { parse } from "../packages/core/src/index.js";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIRS = ["examples", "examples/showcase"];

async function verify(): Promise<number> {
  const failures: string[] = [];
  const warnings: string[] = [];
  let total = 0;

  for (const dir of DIRS) {
    const fullDir = join(ROOT, dir);
    const files = (await readdir(fullDir)).filter((f) => f.endsWith(".markdy")).sort();
    for (const file of files) {
      total++;
      const source = await readFile(join(fullDir, file), "utf8");
      try {
        const ast = parse(source);
        const errors = ast.diagnostics.filter((d) => d.severity === "error");
        if (errors.length) failures.push(`${dir}/${file}: ${errors.map((e) => e.message).join("; ")}`);
        for (const w of ast.diagnostics.filter((d) => d.severity === "warning")) {
          warnings.push(`${dir}/${file}:${w.line} ${w.message}`);
        }
      } catch (error) {
        failures.push(`${dir}/${file}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  // Also verify all markdy code blocks inside AGENT.md
  try {
    const agentMd = await readFile(join(ROOT, "AGENT.md"), "utf8");
    const codeBlockRegex = /```markdy\n([\s\S]*?)```/g;
    let match: RegExpExecArray | null;
    let blockIdx = 0;
    while ((match = codeBlockRegex.exec(agentMd)) !== null) {
      blockIdx++;
      total++;
      const code = match[1].trim();
      try {
        const ast = parse(code);
        const errors = ast.diagnostics.filter((d) => d.severity === "error");
        if (errors.length) failures.push(`AGENT.md block #${blockIdx}: ${errors.map((e) => e.message).join("; ")}`);
        for (const w of ast.diagnostics.filter((d) => d.severity === "warning")) {
          warnings.push(`AGENT.md block #${blockIdx}:${w.line} ${w.message}`);
        }
      } catch (error) {
        failures.push(`AGENT.md block #${blockIdx}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } catch (error) {
    failures.push(`AGENT.md read: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Shipped examples are curated: they must parse cleanly with zero warnings so
  // the reference diagnostics stay meaningful and copy-paste friendly.
  if (failures.length || warnings.length) {
    const problems = [...failures, ...warnings];
    console.error(`verify-examples: FAIL — ${problems.length} problem(s):`);
    for (const p of problems) console.error(`  • ${p}`);
    return 1;
  }

  console.log(`verify-examples: PASS — ${total} example file(s) & documentation blocks, 0 warnings.`);
  return 0;
}

verify().then((code) => process.exit(code));
