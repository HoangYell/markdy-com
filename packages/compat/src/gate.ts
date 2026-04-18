#!/usr/bin/env tsx
/**
 * compat-gate — MarkdyScript's backwards-compatibility heartbeat.
 *
 * What this does
 * --------------
 * For every `.markdy` file under `examples/v1/` (the canonical catalogue of
 * pre-v2 syntactic patterns), the gate:
 *
 *   1. Parses the source with the *current* parser.
 *   2. Compares the resulting AST against a snapshot on disk
 *      (`packages/compat/snapshots/<basename>.json`).
 *   3. Also verifies a handful of invariants that must never regress:
 *        • `ast.warnings.length === 0`   (legacy programs must not warn)
 *        • `ast.chapters.length === 0`   (no implicit chapters)
 *        • `ast.imports.length === 0`    (no implicit imports)
 *
 * Why it matters
 * --------------
 * This is the single guard that keeps the "every v1 file parses
 * identically, forever" invariant honest as new syntax lands. Every PR
 * runs it in CI. If a future change would cause even one example to
 * parse differently, the gate fails loud and the merge is blocked.
 *
 * Updating snapshots
 * ------------------
 * When a v1 example is added or legitimately changed, run:
 *     pnpm --filter @markdy/compat run gate:update
 * Review the diff with `git diff packages/compat/snapshots/` and commit.
 */

import { parse, type SceneAST } from "../../core/src/index.js";
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..", "..");
const EXAMPLES_DIR = join(ROOT, "examples", "v1");
const SNAPSHOT_DIR = join(ROOT, "packages", "compat", "snapshots");

type GateOptions = { update: boolean; verbose: boolean };

type Diff = { path: string; reason: string; detail?: string };

const INVARIANTS: Array<{ name: string; check: (ast: SceneAST) => string | null }> = [
  {
    name: "no-warnings",
    check: (ast) =>
      ast.warnings.length === 0
        ? null
        : `legacy programs must not emit warnings; got ${ast.warnings.length}: ${JSON.stringify(ast.warnings)}`,
  },
  {
    name: "no-chapters",
    check: (ast) =>
      ast.chapters.length === 0
        ? null
        : `legacy programs have no chapters; got ${ast.chapters.length}`,
  },
  {
    name: "no-imports",
    check: (ast) =>
      ast.imports.length === 0
        ? null
        : `legacy programs have no imports; got ${ast.imports.length}`,
  },
];

async function listExamples(): Promise<string[]> {
  if (!existsSync(EXAMPLES_DIR)) {
    throw new Error(`Expected examples dir not found: ${EXAMPLES_DIR}`);
  }
  const entries = await readdir(EXAMPLES_DIR);
  return entries.filter((name) => name.endsWith(".markdy")).sort();
}

function snapshotPath(fileName: string): string {
  return join(SNAPSHOT_DIR, fileName.replace(/\.markdy$/, ".json"));
}

/**
 * Deterministic, order-insensitive AST snapshot for stable diffs.
 * Keys are sorted; arrays keep their order (event order is meaningful).
 */
function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  const walk = (v: unknown): unknown => {
    if (v === null || typeof v !== "object") return v;
    if (seen.has(v as object)) return "[circular]";
    seen.add(v as object);
    if (Array.isArray(v)) return v.map(walk);
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(v as Record<string, unknown>).sort()) {
      sorted[key] = walk((v as Record<string, unknown>)[key]);
    }
    return sorted;
  };
  return `${JSON.stringify(walk(value), null, 2)}\n`;
}

async function runGate(opts: GateOptions): Promise<number> {
  const files = await listExamples();
  const diffs: Diff[] = [];
  let updated = 0;

  if (!existsSync(SNAPSHOT_DIR)) {
    await mkdir(SNAPSHOT_DIR, { recursive: true });
  }

  for (const name of files) {
    const full = join(EXAMPLES_DIR, name);
    const source = await readFile(full, "utf8");

    let ast: SceneAST;
    try {
      ast = parse(source);
    } catch (err) {
      diffs.push({
        path: name,
        reason: "parse-error",
        detail: err instanceof Error ? err.message : String(err),
      });
      continue;
    }

    for (const inv of INVARIANTS) {
      const failure = inv.check(ast);
      if (failure) {
        diffs.push({ path: name, reason: `invariant:${inv.name}`, detail: failure });
      }
    }

    const snapshot = stableStringify(ast);
    const snapPath = snapshotPath(name);

    if (opts.update) {
      await writeFile(snapPath, snapshot);
      updated++;
      if (opts.verbose) console.log(`UPDATED ${name}`);
      continue;
    }

    if (!existsSync(snapPath)) {
      diffs.push({
        path: name,
        reason: "missing-snapshot",
        detail: `No snapshot at ${snapPath}. Run --update to create.`,
      });
      continue;
    }

    const expected = await readFile(snapPath, "utf8");
    if (expected !== snapshot) {
      diffs.push({
        path: name,
        reason: "ast-drift",
        detail: firstDiffLine(expected, snapshot),
      });
    } else if (opts.verbose) {
      console.log(`OK       ${name}`);
    }
  }

  if (opts.update) {
    console.log(`\ncompat-gate: wrote ${updated} snapshot(s).`);
    return 0;
  }

  if (diffs.length === 0) {
    console.log(`compat-gate: PASS — ${files.length} v1 examples, 0 regressions.`);
    return 0;
  }

  console.error(`compat-gate: FAIL — ${diffs.length} regression(s):`);
  for (const d of diffs) {
    console.error(`  • ${d.path}: ${d.reason}`);
    if (d.detail) console.error(`      ${d.detail}`);
  }
  console.error("");
  console.error("If this change is intentional, update the snapshots:");
  console.error("  pnpm --filter @markdy/compat run gate:update");
  return 1;
}

function firstDiffLine(expected: string, actual: string): string {
  const a = expected.split("\n");
  const b = actual.split("\n");
  const limit = Math.max(a.length, b.length);
  for (let i = 0; i < limit; i++) {
    if (a[i] !== b[i]) {
      return `line ${i + 1}: expected ${JSON.stringify(a[i] ?? "")}, got ${JSON.stringify(b[i] ?? "")}`;
    }
  }
  return `length differs (expected ${a.length}, got ${b.length})`;
}

function parseArgs(): GateOptions {
  const argv = process.argv.slice(2);
  return {
    update: argv.includes("--update") || argv.includes("-u"),
    verbose: argv.includes("--verbose") || argv.includes("-v"),
  };
}

const exitCode = await runGate(parseArgs());
process.exit(exitCode);
