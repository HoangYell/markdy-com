#!/usr/bin/env tsx
import { parse, type DiagramAST } from "../../core/src/index.js";
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(__dirname, "..");
const FIXTURES_DIR = join(PACKAGE_ROOT, "fixtures");
const SNAPSHOT_DIR = join(PACKAGE_ROOT, "snapshots");

type GateOptions = { update: boolean; verbose: boolean };
type Diff = { path: string; reason: string; detail?: string };

const INVARIANTS: Array<{ name: string; check: (ast: DiagramAST) => string | null }> = [
  {
    name: "no-errors",
    check: (ast) =>
      ast.diagnostics.every((d) => d.severity !== "error")
        ? null
        : `baseline programs must not emit errors; got ${JSON.stringify(ast.diagnostics)}`,
  },
];

async function listFixtures(): Promise<string[]> {
  if (!existsSync(FIXTURES_DIR)) throw new Error(`Expected fixtures dir not found: ${FIXTURES_DIR}`);
  const entries = await readdir(FIXTURES_DIR);
  return entries.filter((name) => name.endsWith(".markdy")).sort();
}

function snapshotPath(fileName: string): string {
  return join(SNAPSHOT_DIR, fileName.replace(/\.markdy$/, ".json"));
}

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
  const files = await listFixtures();
  const diffs: Diff[] = [];
  let updated = 0;

  if (!existsSync(SNAPSHOT_DIR)) await mkdir(SNAPSHOT_DIR, { recursive: true });

  for (const name of files) {
    const source = await readFile(join(FIXTURES_DIR, name), "utf8");
    let ast: DiagramAST;
    try {
      ast = parse(source);
    } catch (err) {
      diffs.push({ path: name, reason: "parse-error", detail: err instanceof Error ? err.message : String(err) });
      continue;
    }

    for (const inv of INVARIANTS) {
      const failure = inv.check(ast);
      if (failure) diffs.push({ path: name, reason: `invariant:${inv.name}`, detail: failure });
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
      diffs.push({ path: name, reason: "missing-snapshot", detail: `No snapshot at ${snapPath}. Run --update to create.` });
      continue;
    }

    const expected = await readFile(snapPath, "utf8");
    if (expected !== snapshot) {
      diffs.push({ path: name, reason: "ast-drift", detail: "AST changed" });
    } else if (opts.verbose) {
      console.log(`OK       ${name}`);
    }
  }

  if (opts.update) {
    console.log(`\ncompat-gate: wrote ${updated} snapshot(s).`);
    return 0;
  }

  if (diffs.length === 0) {
    console.log(`compat-gate: PASS — ${files.length} fixtures, 0 regressions.`);
    return 0;
  }

  console.error(`compat-gate: FAIL — ${diffs.length} regression(s):`);
  for (const d of diffs) diffs.length && console.error(`  • ${d.path}: ${d.reason}${d.detail ? `\n      ${d.detail}` : ""}`);
  console.error("\nIf this change is intentional, update the snapshots:\n  pnpm --filter @markdy/compat run gate:update");
  return 1;
}

const exitCode = await runGate({
  update: process.argv.includes("--update") || process.argv.includes("-u"),
  verbose: process.argv.includes("--verbose") || process.argv.includes("-v"),
});
process.exit(exitCode);
