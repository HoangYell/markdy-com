#!/usr/bin/env tsx
/**
 * verify-examples — parses every shipped example and reports problems.
 *
 * For each file under `examples/` (top level) and `examples/presets/`:
 *   • The file must parse without throwing.
 *   • Feature examples that intentionally trigger warnings
 *     (`11-soft-warn-unknown`, `14-import-namespaced`) are allowed to emit
 *     them. All others must parse cleanly.
 *   • preset examples must be either a bare `preset <name>` or
 *     `preset <name>(args...)` call — the parser expands them inline.
 *
 * Baseline fixtures live in `packages/compat/fixtures/` and are covered by
 * the @markdy/compat gate (snapshot-tested), not by this script.
 *
 * This is a fast, CI-friendly sanity check that catches regressions in the
 * shipped examples when the grammar is extended.
 */

import { parse, type ParseWarning, type SceneAST } from "../packages/core/src/index.js";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

interface Failure {
  file: string;
  reason: string;
  detail?: string;
}

type ExpectWarnings = "none" | "allow-intentional" | "any";

const DIRS: Array<{ dir: string; expectWarnings: ExpectWarnings; expectChapters: boolean }> = [
  { dir: "examples",         expectWarnings: "allow-intentional", expectChapters: true },
  { dir: "examples/presets", expectWarnings: "any",  expectChapters: true },
];

async function list(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(join(ROOT, dir));
    return entries.filter((n) => n.endsWith(".markdy")).sort();
  } catch {
    return [];
  }
}

function describeWarnings(ws: ParseWarning[]): string {
  return ws.map((w) => `[${w.kind}] line ${w.line}: ${w.message}`).join("; ");
}

async function verify(): Promise<number> {
  const failures: Failure[] = [];
  let total = 0;

  for (const { dir, expectWarnings, expectChapters } of DIRS) {
    const files = await list(dir);
    for (const name of files) {
      total++;
      const full = join(ROOT, dir, name);
      const source = await readFile(full, "utf8");

      let ast: SceneAST;
      try {
        ast = parse(source);
      } catch (err) {
        failures.push({
          file: join(dir, name),
          reason: "parse-error",
          detail: err instanceof Error ? err.message : String(err),
        });
        continue;
      }

      if (expectWarnings === "none" && ast.warnings.length > 0) {
        failures.push({
          file: join(dir, name),
          reason: "unexpected-warnings",
          detail: describeWarnings(ast.warnings),
        });
      }

      // Intentional warnings are allowed in specific files by filename.
      if (expectWarnings === "allow-intentional") {
        const intentional = /soft-warn|import-namespaced/.test(name);
        if (!intentional && ast.warnings.length > 0) {
          failures.push({
            file: join(dir, name),
            reason: "unexpected-warnings",
            detail: describeWarnings(ast.warnings),
          });
        }
      }

      if (!expectChapters && ast.chapters.length > 0) {
        failures.push({
          file: join(dir, name),
          reason: "unexpected-chapters",
          detail: `${ast.chapters.length} chapter(s) in ${dir}`,
        });
      }
    }
  }

  if (failures.length === 0) {
    console.log(`verify-examples: PASS — ${total} file(s), 0 failures.`);
    return 0;
  }

  console.error(`verify-examples: FAIL — ${failures.length}/${total} failure(s):`);
  for (const f of failures) {
    console.error(`  • ${f.file}: ${f.reason}`);
    if (f.detail) console.error(`      ${f.detail}`);
  }
  return 1;
}

verify().then((code) => process.exit(code));
