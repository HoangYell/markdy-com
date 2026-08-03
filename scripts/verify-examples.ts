#!/usr/bin/env tsx
import { parse } from "../packages/core/src/index.js";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIRS = ["examples", "examples/showcase"];

async function verify(): Promise<number> {
  const failures: string[] = [];
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
      } catch (error) {
        failures.push(`${dir}/${file}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  if (failures.length) {
    console.error(`verify-examples: FAIL — ${failures.length} problem(s):`);
    for (const f of failures) console.error(`  • ${f}`);
    return 1;
  }

  console.log(`verify-examples: PASS — ${total} example file(s).`);
  return 0;
}

verify().then((code) => process.exit(code));
