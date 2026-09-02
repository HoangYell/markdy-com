import {
  parse,
  compile,
  ParseError,
  validateArchitecture,
  resolveArchitectureConfig,
  diffDiagramASTs,
  compressMarkdyToUrlHash,
  diagnoseMarkdyCode,
  repairMarkdyCode,
  getIntelliCodeCompletions,
  predictNextLineSuggestion,
  getArchitectureSuggestions,
  recommendArchitecturePattern,
  synthesizeCustomRecipe,
  getArchitectureRecipe,
  listArchitectureRecipes,
  verifyDiagramQuality,
  analyzeC4Model,
  filterC4Hierarchy,
  generateC4Storyboard,
  exportC4LevelViews,
  validateC4Containment,
  detectArchitectureDrift,
  autoHealArchitectureDrift,
  type C4Level,
  type DiagramAST,
  type Diagnostic,
  type ArchitectureRule,
  type MarkdyConfig,
  type QualityGateReport,
  type QualityProfile,
} from "@markdy/core";
import { createRequire } from "node:module";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { formatScene } from "./format.js";

export interface CliIo {
  stdout(message: string): void;
  stderr(message: string): void;
}

export interface CliRuntime {
  openBrowser(url: string): Promise<void>;
}

export interface RunResult {
  exitCode: number;
  server?: Server;
}

type ParsedArgs = {
  command?: string;
  positionals: string[];
  flags: Map<string, string | boolean>;
};

type LoadedScene = {
  filePath: string;
  source: string;
  ast: DiagramAST;
};

const DEFAULT_PORT = 4242;
const IMPORT_RE = /^import\s+"([^"]+)"\s+as\s+(\w+)\s*$/;
const MARKDY_EXT = ".markdy";
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
type CompatModule = typeof import("@markdy/compat");
let compatModulePromise: Promise<CompatModule> | null = null;

function loadCompatModule(): Promise<CompatModule> {
  if (!compatModulePromise) {
    compatModulePromise = import("@markdy/compat");
  }
  return compatModulePromise;
}

export async function runCli(
  argv: string[],
  io: CliIo = defaultIo(),
  runtime: CliRuntime = defaultRuntime(),
): Promise<RunResult> {
  const parsed = parseArgv(argv);

  if (hasFlag(parsed, "help")) {
    io.stdout(helpText());
    return { exitCode: 0 };
  }

  if (!parsed.command) {
    return launchPlayground(parsed, io, runtime);
  }

  const command = parsed.command;

  switch (command) {
    case "lint":
      return lintCommand(parsed, io);
    case "fmt":
      return fmtCommand(parsed, io);
    case "render":
      return renderCommand(parsed, io, runtime);
    case "explain":
      return explainCommand(parsed, io);
    case "import":
      return importCommand(parsed, io);
    case "diff":
      return diffCommand(parsed, io);
    case "share":
      return shareCommand(parsed, io);
    case "new":
      return newCommand(parsed, io);
    case "docs":
      return docsCommand(parsed, io, runtime);
    case "ai":
      return aiCommand(parsed, io, runtime);
    case "suggest":
      return suggestCommand(parsed, io);
    case "guide":
      return guideCommand(parsed, io);
    case "recipe":
      return recipeCommand(parsed, io);
    case "verify":
    case "doctor":
      return verifyCommand(parsed, io);
    case "drift":
    case "sync":
      return driftCommand(parsed, io);
    case "c4":
      return c4Command(parsed, io);
    case "check":
      return checkCommand(parsed, io);
    case "check-all":
      return checkAllCommand(parsed, io);
    default:
      io.stderr(`Unknown command: ${command}\n\n${helpText()}`);
      return { exitCode: 1 };
  }
}

async function lintCommand(parsed: ParsedArgs, io: CliIo): Promise<RunResult> {
  const files = await collectSceneFiles(parsed.positionals);
  if (files.length === 0) {
    io.stderr("markdy lint: expected at least one .markdy file or directory");
    return { exitCode: 1 };
  }

  const strict = hasFlag(parsed, "strict");
  const checkArchRules = hasFlag(parsed, "arch-rules");
  const configPath = getStringFlag(parsed, "config");
  const cache = new Map<string, LoadedScene>();
  let warningCount = 0;
  let errorCount = 0;

  let customRules: ArchitectureRule[] | undefined;
  if (configPath) {
    try {
      const raw = await readFile(resolve(process.cwd(), configPath), "utf-8");
      const json = JSON.parse(raw);
      customRules = resolveArchitectureConfig(json);
    } catch (err) {
      io.stderr(`markdy lint: failed to read config "${configPath}": ${(err as Error).message}`);
      return { exitCode: 1 };
    }
  } else {
    for (const defaultName of [".markdyrc.json", "markdy.config.json", ".markdyrc"]) {
      try {
        const candidate = resolve(process.cwd(), defaultName);
        const raw = await readFile(candidate, "utf-8");
        const json = JSON.parse(raw);
        customRules = resolveArchitectureConfig(json);
        break;
      } catch {
        // ignore if not present
      }
    }
  }

  for (const file of files) {
    try {
      const scene = await loadSceneFromFile(file, cache);
      io.stdout(`OK   ${file}`);
      warningCount += printWarnings(scene.ast.diagnostics, file, io);

      if (checkArchRules || customRules) {
        const violations = validateArchitecture(scene.ast, customRules);
        for (const v of violations) {
          if (v.severity === "error") {
            errorCount++;
            io.stderr(`ARCH_FAIL ${file}:${v.line ?? 1} [${v.ruleName}] ${v.message}`);
          } else {
            warningCount++;
            io.stderr(`ARCH_WARN ${file}:${v.line ?? 1} [${v.ruleName}] ${v.message}`);
          }
        }
      }
    } catch (error) {
      errorCount++;
      io.stderr(`FAIL ${file}`);
      try {
        const raw = await readFile(file, "utf-8");
        const diag = diagnoseMarkdyCode(raw, { checkArchitecture: true });
        if (diag.issues.length > 0) {
          for (const iss of diag.issues) {
            io.stderr(`     Line ${iss.line}: [${iss.code}] ${iss.message}`);
            if (iss.suggestion) {
              io.stderr(`       💡 Recommendation: ${iss.suggestion}`);
            }
          }
        } else {
          io.stderr(`     ${describeError(error)}`);
        }
      } catch {
        io.stderr(`     ${describeError(error)}`);
      }
    }
  }

  if (strict && warningCount > 0) {
    io.stderr(`markdy lint: ${warningCount} warning(s) treated as failures.`);
    return { exitCode: 1 };
  }
  if (errorCount > 0) {
    io.stderr(`markdy lint: ${errorCount} file(s) failed.`);
    return { exitCode: 1 };
  }

  io.stdout(`markdy lint: PASS — ${files.length} file(s), ${warningCount} warning(s).`);
  return { exitCode: 0 };
}

async function fmtCommand(parsed: ParsedArgs, io: CliIo): Promise<RunResult> {
  const files = await collectSceneFiles(parsed.positionals);
  if (files.length === 0) {
    io.stderr("markdy fmt: expected at least one .markdy file or directory");
    return { exitCode: 1 };
  }

  const write = hasFlag(parsed, "write");
  const check = hasFlag(parsed, "check");
  const fix = hasFlag(parsed, "fix") || hasFlag(parsed, "repair");
  const cache = new Map<string, LoadedScene>();
  let changed = 0;

  if (!write && !check && !fix && files.length > 1) {
    io.stderr("markdy fmt: pass exactly one file when printing to stdout, or use --write / --check / --fix");
    return { exitCode: 1 };
  }

  for (const file of files) {
    let raw = "";
    try {
      raw = await readFile(file, "utf-8");
    } catch {
      // ignore
    }

    if (fix) {
      const repaired = repairMarkdyCode(raw);
      if (repaired.isFixed || repaired.changes.length > 0) {
        let finalOutput = repaired.repairedCode;
        try {
          const ast = parse(repaired.repairedCode);
          finalOutput = formatScene(ast);
        } catch {
          // keep repaired string
        }
        await writeFile(file, finalOutput, "utf8");
        changed++;
        io.stdout(`REPAIRED ${file} (${repaired.changes.length} fixes applied)`);
        continue;
      }
    }

    const scene = await loadSceneFromFile(file, cache);
    const formatted = formatScene(scene.ast);
    const isChanged = normalizeNewlines(scene.source) !== normalizeNewlines(formatted);

    if (write) {
      if (isChanged) {
        await writeFile(file, formatted, "utf8");
        changed++;
        io.stdout(`WROTE ${file}`);
      } else {
        io.stdout(`OK    ${file}`);
      }
      continue;
    }

    if (check) {
      if (isChanged) {
        changed++;
        io.stderr(`DIFF  ${file}`);
      } else {
        io.stdout(`OK    ${file}`);
      }
      continue;
    }

    io.stdout(formatted);
  }

  if (check) {
    if (changed > 0) {
      io.stderr(`markdy fmt: ${changed} file(s) need formatting.`);
      return { exitCode: 1 };
    }
    io.stdout(`markdy fmt: PASS — ${files.length} file(s) already formatted.`);
  }

  return { exitCode: 0 };
}

async function renderCommand(parsed: ParsedArgs, io: CliIo, runtime: CliRuntime): Promise<RunResult> {
  const file = parsed.positionals[0];
  if (!file) {
    io.stderr("markdy render: expected a .markdy input file");
    return { exitCode: 1 };
  }

  const scene = await loadSceneFromFile(file);
  const outPath = getStringFlag(parsed, "out");

  if (outPath) {
    const html = await buildStandaloneHtml(scene);
    const resolvedOut = resolve(outPath);
    await writeFile(resolvedOut, html, "utf8");
    io.stdout(`Wrote ${resolvedOut}`);
    return { exitCode: 0 };
  }

  return launchPlayground(parsed, io, runtime, scene);
}

async function explainCommand(parsed: ParsedArgs, io: CliIo): Promise<RunResult> {
  const file = parsed.positionals[0];
  if (!file) {
    io.stderr("markdy explain: expected a .markdy input file");
    return { exitCode: 1 };
  }

  const scene = await loadSceneFromFile(file);
  if (hasFlag(parsed, "json")) {
    io.stdout(stableStringify(scene.ast));
    return { exitCode: 0 };
  }

  const summary = [
    `File: ${scene.filePath}`,
    `Viewport: ${scene.ast.meta.width}×${scene.ast.meta.height} @ ${scene.ast.meta.fps}fps`,
    `Theme: ${scene.ast.meta.theme}`,
    `Duration: ${scene.ast.meta.duration ?? "(auto)"}`,
    `Nodes: ${Object.keys(scene.ast.nodes).length}`,
    `Beats: ${scene.ast.beats.map((b) => b.name).join(", ") || "(none)"}`,
    `Diagnostics: ${scene.ast.diagnostics.length}`,
  ];
  io.stdout(summary.join("\n"));
  if (scene.ast.diagnostics.length > 0) {
    printWarnings(scene.ast.diagnostics, scene.filePath, io);
  }
  return { exitCode: 0 };
}

async function guideCommand(parsed: ParsedArgs, io: CliIo): Promise<RunResult> {
  const query = parsed.positionals.join(" ").trim();
  const jsonMode = hasFlag(parsed, "json");
  const synthesizeMode = hasFlag(parsed, "synthesize");

  if (!query) {
    const recipes = listArchitectureRecipes();
    if (jsonMode) {
      io.stdout(JSON.stringify(recipes, null, 2));
    } else {
      io.stdout("Markdy Architecture Recipe Catalog:\n");
      for (const r of recipes) {
        io.stdout(`  • [${r.id}] ${r.name} (${r.category}) - ${r.description}`);
      }
      io.stdout('\nRun `markdy guide "<query>"` or `markdy recipe <id>` to view full blueprint code.');
    }
    return { exitCode: 0 };
  }

  if (synthesizeMode) {
    const synthesized = synthesizeCustomRecipe(query);
    if (jsonMode) {
      io.stdout(JSON.stringify(synthesized, null, 2));
    } else {
      io.stdout(`\n⚡ Dynamic Architecture Synthesis for: "${query}"`);
      io.stdout(`Pattern: ${synthesized.inferredPattern}`);
      io.stdout(`Components: ${synthesized.detectedComponents.map((c) => `${c.id} (${c.kind})`).join(", ")}`);
      io.stdout(`Rationale: ${synthesized.rationale}\n`);
      io.stdout("Synthesized MarkdyScript:\n");
      io.stdout(synthesized.markdyScript);
    }
    return { exitCode: 0 };
  }

  const recommendations = recommendArchitecturePattern(query);
  if (jsonMode) {
    io.stdout(JSON.stringify(recommendations, null, 2));
    return { exitCode: 0 };
  }

  const top = recommendations[0];
  io.stdout(`\n✨ Recommended Architecture Pattern: ${top.recipe.name} (${top.recipe.id})`);
  io.stdout(`Category: ${top.recipe.category} | Layout: ${top.recipe.recommendedLayout}`);
  io.stdout(`Rationale: ${top.rationale}\n`);
  io.stdout("Highlights:");
  for (const hl of top.recipe.highlights) {
    io.stdout(`  - ${hl}`);
  }
  io.stdout("\nCanonical Markdy Blueprint:\n");
  io.stdout(top.recipe.code);
  return { exitCode: 0 };
}

async function recipeCommand(parsed: ParsedArgs, io: CliIo): Promise<RunResult> {
  const recipeId = parsed.positionals[0];
  const jsonMode = hasFlag(parsed, "json");

  if (!recipeId) {
    return guideCommand(parsed, io);
  }

  const recipe = getArchitectureRecipe(recipeId);
  if (!recipe) {
    io.stderr(`markdy recipe: no recipe found for '${recipeId}'. Run 'markdy guide' to list available recipes.`);
    return { exitCode: 1 };
  }

  if (jsonMode) {
    io.stdout(JSON.stringify(recipe, null, 2));
  } else {
    io.stdout(recipe.code);
  }
  return { exitCode: 0 };
}

async function verifyCommand(parsed: ParsedArgs, io: CliIo): Promise<RunResult> {
  const file = parsed.positionals[0];
  if (!file) {
    io.stderr("markdy verify: expected a .markdy input file");
    return { exitCode: 1 };
  }

  const qualityFlag = getStringFlag(parsed, "quality");
  const profile: QualityProfile = qualityFlag === "showcase" ? "showcase" : "standard";
  const jsonMode = hasFlag(parsed, "json");

  const scene = await loadSceneFromFile(file);
  const report = verifyDiagramQuality(scene.ast, { profile });

  if (jsonMode) {
    io.stdout(JSON.stringify(report, null, 2));
    return { exitCode: report.passed ? 0 : 1 };
  }

  io.stdout("\n🔍 Markdy 9-Point Quality Gate & Viewport Verification");
  io.stdout(`File: ${scene.filePath}`);
  io.stdout(`Profile: ${report.qualityProfile.toUpperCase()} | SHA-256 Receipt: ${report.sha256Receipt}`);
  io.stdout(`Status: ${report.passed ? "✅ PASSED" : "❌ FAILED"} (Errors: ${report.errorCount}, Warnings: ${report.warningCount})\n`);

  io.stdout("Checks:");
  for (const check of report.checks) {
    const symbol = check.status === "pass" ? "✓" : check.status === "warn" ? "⚠" : "✗";
    io.stdout(`  ${symbol} [${check.id}] ${check.name}: ${check.message}`);
  }

  io.stdout("\nViewport Compliance:");
  for (const [vp, compliant] of Object.entries(report.viewportCompliance)) {
    io.stdout(`  • ${vp}: ${compliant ? "✓ PASS" : "✗ OVERFLOW"}`);
  }

  io.stdout("\nMetrics:");
  io.stdout(`  Nodes: ${report.metrics.nodeCount} | Edges: ${report.metrics.edgeCount} | Story Beats: ${report.metrics.beatCount}`);
  io.stdout(`  Estimated Dimensions: ${report.metrics.estimatedWidth}×${report.metrics.estimatedHeight} (Aspect Ratio: ${report.metrics.aspectRatio})`);
  io.stdout(`  Code Provenance Anchors: ${report.metrics.provenanceAnchorCount} | Vector Symbols: ${report.metrics.symbolCount}\n`);

  return { exitCode: report.passed ? 0 : 1 };
}

async function newCommand(parsed: ParsedArgs, io: CliIo): Promise<RunResult> {
  const target = parsed.positionals[0] ?? "scene.markdy";
  const force = hasFlag(parsed, "force");
  const resolvedTarget = resolve(target);
  const content = defaultSceneTemplate();

  if (!force && await exists(resolvedTarget)) {
    io.stderr(`markdy new: target already exists: ${resolvedTarget} (pass --force to overwrite)`);
    return { exitCode: 1 };
  }

  await writeFile(resolvedTarget, content, "utf8");
  io.stdout(`Created ${resolvedTarget}`);
  return { exitCode: 0 };
}

async function importCommand(parsed: ParsedArgs, io: CliIo): Promise<RunResult> {
  const inputFile = parsed.positionals[0];
  if (!inputFile) {
    io.stderr("markdy import: expected an input file (e.g. diagram.mmd, docker-compose.yml, manifests.yaml, terraform.tfstate)");
    return { exitCode: 1 };
  }

  const content = await readFile(resolve(inputFile), "utf8").catch((err) => {
    io.stderr(`markdy import: failed to read ${inputFile}: ${describeError(err)}`);
    return null;
  });
  if (content === null) return { exitCode: 1 };

  const formatFlag = getStringFlag(parsed, "from")?.toLowerCase();
  const ext = extname(inputFile).toLowerCase();
  const title = basename(inputFile, extname(inputFile));
  const compat = await loadCompatModule().catch((err) => {
    io.stderr(`markdy import: failed to load @markdy/compat: ${describeError(err)}`);
    return null;
  });
  if (!compat) return { exitCode: 1 };

  let markdyCode: string;

  if (formatFlag === "mermaid" || ext === ".mmd" || ext === ".mermaid") {
    markdyCode = compat.transpileMermaidToMarkdy(content, title).code;
  } else if (formatFlag === "d2" || ext === ".d2") {
    markdyCode = compat.transpileD2ToMarkdy(content).markdyScript;
  } else if (formatFlag === "plantuml" || formatFlag === "puml" || ext === ".puml" || ext === ".plantuml" || content.includes("@startuml")) {
    markdyCode = compat.transpilePlantUmlToMarkdy(content).markdyScript;
  } else if (formatFlag === "compose" || ((ext === ".yml" || ext === ".yaml") && (inputFile.includes("compose") || content.includes("services:")))) {
    markdyCode = compat.transpileDockerComposeToMarkdy(content, title);
  } else if (formatFlag === "k8s" || (content.includes("apiVersion:") && content.includes("kind:"))) {
    markdyCode = compat.transpileKubernetesManifestsToMarkdy(content, title);
  } else if (formatFlag === "terraform" || ext === ".tfstate" || (content.includes("terraform_version") || content.includes('"resources":'))) {
    markdyCode = compat.transpileTerraformStateToMarkdy(content, title);
  } else if (formatFlag === "drawio" || ext === ".drawio" || (ext === ".xml" && content.includes("<mxCell"))) {
    markdyCode = (await compat.transpileDrawioToMarkdy(content, title)).code;
  } else {
    markdyCode = compat.transpileMermaidToMarkdy(content, title).code;
  }

  const outPath = getStringFlag(parsed, "out");
  if (outPath) {
    const resolvedOut = resolve(outPath);
    await writeFile(resolvedOut, markdyCode, "utf8");
    io.stdout(`Wrote ${resolvedOut}`);
  } else {
    io.stdout(markdyCode);
  }

  return { exitCode: 0 };
}

async function diffCommand(parsed: ParsedArgs, io: CliIo): Promise<RunResult> {
  const file1 = parsed.positionals[0];
  const file2 = parsed.positionals[1];
  if (!file1 || !file2) {
    io.stderr("markdy diff: expected two .markdy files to compare (e.g. markdy diff before.markdy after.markdy)");
    return { exitCode: 1 };
  }

  const scene1 = await loadSceneFromFile(file1).catch((err) => {
    io.stderr(`markdy diff: ${describeError(err)}`);
    return null;
  });
  const scene2 = await loadSceneFromFile(file2).catch((err) => {
    io.stderr(`markdy diff: ${describeError(err)}`);
    return null;
  });
  if (!scene1 || !scene2) return { exitCode: 1 };

  const diffResult = diffDiagramASTs(scene1.ast, scene2.ast);

  if (hasFlag(parsed, "evolution")) {
    io.stdout(diffResult.evolutionMarkdyScript);
    return { exitCode: 0 };
  }

  io.stdout(diffResult.summaryMarkdown);
  return { exitCode: 0 };
}

async function collectRepoFiles(dir: string, baseDir: string = dir): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "dist" || entry.name === "build") {
      continue;
    }
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectRepoFiles(full, baseDir));
    } else if (entry.isFile()) {
      files.push(relative(baseDir, full).replace(/\\/g, "/"));
    }
  }
  return files;
}

async function driftCommand(parsed: ParsedArgs, io: CliIo): Promise<RunResult> {
  const file = parsed.positionals[0];
  if (!file) {
    io.stderr("markdy drift: expected a .markdy input file (e.g. markdy drift system.markdy)");
    return { exitCode: 1 };
  }

  const scene = await loadSceneFromFile(file).catch((err) => {
    io.stderr(`markdy drift: ${describeError(err)}`);
    return null;
  });
  if (!scene) return { exitCode: 1 };

  const repoRoot = resolve(getStringFlag(parsed, "repo") || process.cwd());
  const repoFiles = await collectRepoFiles(repoRoot);
  const report = detectArchitectureDrift(scene.ast, repoFiles);

  const fixMode = hasFlag(parsed, "fix");
  if (fixMode) {
    const healed = autoHealArchitectureDrift(scene.ast, report, repoFiles);
    await writeFile(scene.filePath, healed.healedMarkdyScript, "utf8");
    if (hasFlag(parsed, "json")) {
      io.stdout(JSON.stringify({ report, healed }, null, 2));
    } else {
      io.stdout(report.summaryMarkdown);
      io.stdout(`\n✅ Auto-healed ${healed.healedAnchorCount} broken anchor(s) and incorporated ${healed.addedServiceCount} orphan service(s) into ${file}`);
      for (const m of healed.healedMappings) {
        io.stdout(`  • ${m.nodeId}: \`${m.oldPath}\` → \`${m.newPath}\``);
      }
    }
    return { exitCode: 0 };
  }

  if (hasFlag(parsed, "json")) {
    io.stdout(JSON.stringify(report, null, 2));
    return { exitCode: report.isSynchronized ? 0 : 1 };
  }

  io.stdout(report.summaryMarkdown);
  if (report.healingMarkdySnippet) {
    io.stdout("\n✨ Suggested MarkdyScript Additions (Pass `--fix` to auto-apply):\n```markdy\n" + report.healingMarkdySnippet + "\n```\n");
  }

  return { exitCode: report.isSynchronized ? 0 : 1 };
}

async function c4Command(parsed: ParsedArgs, io: CliIo): Promise<RunResult> {
  const file = parsed.positionals[0];
  if (!file) {
    io.stderr("markdy c4: expected a .markdy input file (e.g. markdy c4 system.markdy)");
    return { exitCode: 1 };
  }

  const scene = await loadSceneFromFile(file).catch((err) => {
    io.stderr(`markdy c4: ${describeError(err)}`);
    return null;
  });
  if (!scene) return { exitCode: 1 };

  if (hasFlag(parsed, "storyboard")) {
    const storyboard = generateC4Storyboard(scene.ast);
    io.stdout(storyboard);
    return { exitCode: 0 };
  }

  if (hasFlag(parsed, "export-views")) {
    const views = exportC4LevelViews(scene.ast);
    const targetDir = getStringFlag(parsed, "out") || dirname(resolve(file));
    const base = basename(file, extname(file));

    for (const [lvl, exportData] of Object.entries(views)) {
      const outPath = join(targetDir, `${base}-L${exportData.levelNumber}-${lvl}.markdy`);
      await writeFile(outPath, exportData.markdyScript, "utf8");
      io.stdout(`  ✓ Exported C4 L${exportData.levelNumber} [${lvl.toUpperCase()}]: ${outPath} (${exportData.nodeCount} nodes, ${exportData.edgeCount} flows)`);
    }
    io.stdout(`\n📦 Successfully exported 4 C4 level blueprints to ${targetDir}`);
    return { exitCode: 0 };
  }

  const levelFlag = getStringFlag(parsed, "level") as C4Level | undefined;
  if (levelFlag) {
    const { visibleNodeIds } = filterC4Hierarchy(scene.ast, levelFlag);
    io.stdout(`C4 Level [${levelFlag.toUpperCase()}]: ${visibleNodeIds.length} nodes visible (${visibleNodeIds.join(", ")})`);
    return { exitCode: 0 };
  }

  const report = analyzeC4Model(scene.ast);
  if (hasFlag(parsed, "json")) {
    io.stdout(JSON.stringify(report, null, 2));
    return { exitCode: 0 };
  }

  io.stdout(report.summaryMarkdown);
  return { exitCode: 0 };
}

async function shareCommand(parsed: ParsedArgs, io: CliIo): Promise<RunResult> {
  const file = parsed.positionals[0];
  if (!file) {
    io.stderr("markdy share: expected a .markdy input file");
    return { exitCode: 1 };
  }

  const scene = await loadSceneFromFile(file).catch((err) => {
    io.stderr(`markdy share: ${describeError(err)}`);
    return null;
  });
  if (!scene) return { exitCode: 1 };

  const hash = await compressMarkdyToUrlHash(scene.source);
  const shareUrl = `https://markdy.com/playground/#code=${hash}`;
  io.stdout(shareUrl);
  return { exitCode: 0 };
}

async function docsCommand(parsed: ParsedArgs, io: CliIo, runtime: CliRuntime): Promise<RunResult> {
  const docsUrl = "https://markdy.com";
  const links = [
    "Markdy docs",
    "  Website:    https://markdy.com",
    "  Docs:       https://markdy.com/docs/",
    "  Agent:      https://markdy.com/AGENT.md",
    "  LLMs:       https://markdy.com/llms.txt",
    "  Playground: https://markdy.com/playground/",
    "  GitHub:     https://github.com/HoangYell/markdy-com",
  ];
  io.stdout(links.join("\n"));
  if (hasFlag(parsed, "open")) {
    await runtime.openBrowser(docsUrl);
  }
  return { exitCode: 0 };
}

async function aiCommand(parsed: ParsedArgs, io: CliIo, runtime: CliRuntime): Promise<RunResult> {
  const agentUrl = "https://markdy.com/AGENT.md";
  io.stdout(
    [
      "Share this with your AI agent:",
      agentUrl,
      "",
      "Starter prompt:",
      "Read the guide above, then write one complete MarkdyScript scene for a short explainer video. Use the current grammar exactly and keep the result self-contained.",
    ].join("\n"),
  );
  if (hasFlag(parsed, "open")) {
    await runtime.openBrowser(agentUrl);
  }
  return { exitCode: 0 };
}

async function checkAllCommand(parsed: ParsedArgs, io: CliIo): Promise<RunResult> {
  const root = resolve(parsed.positionals[0] ?? process.cwd());
  const files = await collectSceneFiles([root]);
  if (files.length === 0) {
    io.stderr(`markdy check-all: no .markdy files found under ${root}`);
    return { exitCode: 1 };
  }

  const result = await lintCommand(
    {
      command: "lint",
      positionals: files,
      flags: parsed.flags,
    },
    io,
  );

  if (result.exitCode === 0) {
    io.stdout(`markdy check-all: PASS — scanned ${files.length} file(s).`);
  }
  return result;
}

export type ExtractedDiagram = {
  code: string;
  line: number;
  kind: "markdy" | "fence" | "mdx-jsx";
};

export function extractDiagramsFromMarkdown(content: string): ExtractedDiagram[] {
  const diagrams: ExtractedDiagram[] = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");

  // 1. Scan for fenced code blocks: ```markdy ... ``` or ```markdyscript ... ```
  let inFence = false;
  let fenceStartLine = 0;
  let fenceBuffer: string[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const lineNo = idx + 1;
    const trimmed = line.trim();

    if (!inFence) {
      const match = trimmed.match(/^```+(markdy|markdyscript)\b/i);
      if (match) {
        inFence = true;
        fenceStartLine = lineNo + 1;
        fenceBuffer = [];
        continue;
      }
    } else {
      if (/^```+\s*$/.test(trimmed)) {
        inFence = false;
        diagrams.push({
          code: fenceBuffer.join("\n"),
          line: fenceStartLine,
          kind: "fence",
        });
        fenceBuffer = [];
        continue;
      }
      fenceBuffer.push(line);
    }
  }

  // 2. Scan for JSX / MDX <Markdy ... /> or <MarkdyDiagram ... /> components
  const jsxRegex = /<(?:Markdy|MarkdyDiagram)\b([\s\S]*?)(?:\/>|<\/(?:Markdy|MarkdyDiagram)>)/g;
  let jsxMatch: RegExpExecArray | null;

  while ((jsxMatch = jsxRegex.exec(content)) !== null) {
    const tagContent = jsxMatch[1];
    const tagStartIndex = jsxMatch.index;
    const lineBefore = content.slice(0, tagStartIndex).split("\n").length;

    // Look for code={`...`}
    const templateMatch = tagContent.match(/\bcode=\{\s*`([\s\S]*?)`\s*\}/);
    if (templateMatch) {
      const offsetLines = tagContent.slice(0, tagContent.indexOf(templateMatch[0])).split("\n").length - 1;
      diagrams.push({
        code: templateMatch[1],
        line: lineBefore + offsetLines,
        kind: "mdx-jsx",
      });
      continue;
    }

    // Look for code={"..."} or code={'...'}
    const stringExprMatch = tagContent.match(/\bcode=\{\s*(?:"([^"]*)"|'([^']*)')\s*\}/);
    if (stringExprMatch) {
      const val = stringExprMatch[1] ?? stringExprMatch[2] ?? "";
      const offsetLines = tagContent.slice(0, tagContent.indexOf(stringExprMatch[0])).split("\n").length - 1;
      diagrams.push({
        code: val.replace(/\\n/g, "\n"),
        line: lineBefore + offsetLines,
        kind: "mdx-jsx",
      });
      continue;
    }

    // Look for code="..." or code='...'
    const rawStringMatch = tagContent.match(/\bcode=(?:"([^"]*)"|'([^']*)')/);
    if (rawStringMatch) {
      const val = rawStringMatch[1] ?? rawStringMatch[2] ?? "";
      const offsetLines = tagContent.slice(0, tagContent.indexOf(rawStringMatch[0])).split("\n").length - 1;
      diagrams.push({
        code: val.replace(/\\n/g, "\n"),
        line: lineBefore + offsetLines,
        kind: "mdx-jsx",
      });
      continue;
    }
  }

  return diagrams;
}

export function extractDiagramsFromHtml(content: string): ExtractedDiagram[] {
  const diagrams: ExtractedDiagram[] = [];
  const b64Regex = /\bdata-markdy-code-b64=(?:"([^"]+)"|'([^']+)')/g;
  let match: RegExpExecArray | null;

  while ((match = b64Regex.exec(content)) !== null) {
    const b64 = match[1] ?? match[2];
    const startIndex = match.index;
    const line = content.slice(0, startIndex).split("\n").length;
    try {
      const decoded = Buffer.from(b64, "base64").toString("utf8");
      diagrams.push({
        code: decoded,
        line,
        kind: "markdy",
      });
    } catch {
      // ignore invalid base64 decode, validation step will flag
    }
  }

  const legacyRegex = /\bdata-markdy-code=(?:"([^"]+)"|'([^']+)')/g;
  while ((match = legacyRegex.exec(content)) !== null) {
    const raw = match[1] ?? match[2];
    const startIndex = match.index;
    const line = content.slice(0, startIndex).split("\n").length;
    const unescaped = raw
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
    diagrams.push({
      code: unescaped,
      line,
      kind: "markdy",
    });
  }

  return diagrams;
}

async function collectAllCheckFiles(
  inputs: string[],
  distDir?: string,
): Promise<{ markdyFiles: string[]; markdownFiles: string[]; htmlFiles: string[] }> {
  const markdyFiles = new Set<string>();
  const markdownFiles = new Set<string>();
  const htmlFiles = new Set<string>();

  const candidates = inputs.length > 0 ? inputs : (distDir ? [] : [process.cwd()]);

  for (const candidate of candidates) {
    const resolved = resolve(candidate);
    const info = await stat(resolved).catch(() => null);
    if (!info) continue;

    if (info.isDirectory()) {
      await walkCheckDirectory(resolved, markdyFiles, markdownFiles, htmlFiles);
      continue;
    }

    if (info.isFile()) {
      const ext = extname(resolved).toLowerCase();
      if (ext === ".markdy") markdyFiles.add(resolved);
      else if (ext === ".md" || ext === ".mdx") markdownFiles.add(resolved);
      else if (ext === ".html" || ext === ".htm") htmlFiles.add(resolved);
    }
  }

  if (distDir) {
    const resolvedDist = resolve(distDir);
    const info = await stat(resolvedDist).catch(() => null);
    if (info && info.isDirectory()) {
      await walkHtmlFiles(resolvedDist, htmlFiles);
    } else if (info && info.isFile()) {
      htmlFiles.add(resolvedDist);
    }
  }

  return {
    markdyFiles: [...markdyFiles].sort(),
    markdownFiles: [...markdownFiles].sort(),
    htmlFiles: [...htmlFiles].sort(),
  };
}

async function walkCheckDirectory(
  root: string,
  markdyFiles: Set<string>,
  markdownFiles: Set<string>,
  htmlFiles: Set<string>,
): Promise<void> {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);

  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "dist") {
      continue;
    }
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      await walkCheckDirectory(fullPath, markdyFiles, markdownFiles, htmlFiles);
      continue;
    }
    if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (ext === ".markdy") markdyFiles.add(fullPath);
      else if (ext === ".md" || ext === ".mdx") markdownFiles.add(fullPath);
      else if (ext === ".html" || ext === ".htm") htmlFiles.add(fullPath);
    }
  }
}

async function walkHtmlFiles(root: string, htmlFiles: Set<string>): Promise<void> {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      await walkHtmlFiles(fullPath, htmlFiles);
      continue;
    }
    if (entry.isFile() && (entry.name.endsWith(".html") || entry.name.endsWith(".htm"))) {
      htmlFiles.add(fullPath);
    }
  }
}

async function checkCommand(parsed: ParsedArgs, io: CliIo): Promise<RunResult> {
  const distDir = getStringFlag(parsed, "dist");
  const { markdyFiles, markdownFiles, htmlFiles } = await collectAllCheckFiles(
    parsed.positionals,
    distDir,
  );

  const totalFiles = markdyFiles.length + markdownFiles.length + htmlFiles.length;
  if (totalFiles === 0) {
    io.stderr("markdy check: expected at least one .markdy, .md, .mdx, or HTML file, or pass --dist <dir>");
    return { exitCode: 1 };
  }

  const strict = hasFlag(parsed, "strict");
  const checkArchRules = hasFlag(parsed, "arch-rules");
  const configPath = getStringFlag(parsed, "config");
  const jsonOutput = hasFlag(parsed, "json");

  let customRules: ArchitectureRule[] | undefined;
  if (configPath) {
    try {
      const raw = await readFile(resolve(process.cwd(), configPath), "utf-8");
      const json = JSON.parse(raw);
      customRules = resolveArchitectureConfig(json);
    } catch (err) {
      io.stderr(`markdy check: failed to read config "${configPath}": ${(err as Error).message}`);
      return { exitCode: 1 };
    }
  } else {
    for (const defaultName of [".markdyrc.json", "markdy.config.json", ".markdyrc"]) {
      try {
        const candidate = resolve(process.cwd(), defaultName);
        const raw = await readFile(candidate, "utf-8");
        const json = JSON.parse(raw);
        customRules = resolveArchitectureConfig(json);
        break;
      } catch {
        // ignore if not present
      }
    }
  }

  let totalDiagrams = 0;
  let errorCount = 0;
  let warningCount = 0;
  const jsonResults: Array<{
    file: string;
    diagrams: number;
    errors: Array<{ line: number; message: string; suggestion?: string }>;
    warnings: Array<{ line: number; message: string }>;
  }> = [];

  // 1. Process .markdy files
  for (const file of markdyFiles) {
    totalDiagrams++;
    const fileErrors: Array<{ line: number; message: string; suggestion?: string }> = [];
    const fileWarnings: Array<{ line: number; message: string }> = [];

    try {
      const source = await readFile(file, "utf-8");
      const ast = parse(source);
      compile(ast);

      for (const w of ast.diagnostics.filter((d) => d.severity === "warning")) {
        warningCount++;
        fileWarnings.push({ line: w.line, message: w.message });
        if (!jsonOutput) io.stderr(`WARN ${file}:${w.line} ${w.message}`);
      }

      if (checkArchRules || customRules) {
        const violations = validateArchitecture(ast, customRules);
        for (const v of violations) {
          if (v.severity === "error") {
            errorCount++;
            fileErrors.push({ line: v.line ?? 1, message: `[${v.ruleName}] ${v.message}` });
            if (!jsonOutput) io.stderr(`ARCH_FAIL ${file}:${v.line ?? 1} [${v.ruleName}] ${v.message}`);
          } else {
            warningCount++;
            fileWarnings.push({ line: v.line ?? 1, message: `[${v.ruleName}] ${v.message}` });
            if (!jsonOutput) io.stderr(`ARCH_WARN ${file}:${v.line ?? 1} [${v.ruleName}] ${v.message}`);
          }
        }
      }

      if (fileErrors.length === 0 && !jsonOutput) {
        io.stdout(`OK   ${file}`);
      }
    } catch (error) {
      errorCount++;
      const errLine = (error instanceof ParseError && error.line) ? error.line : 1;
      const diag = await readFile(file, "utf-8")
        .then((raw) => diagnoseMarkdyCode(raw, { checkArchitecture: true }))
        .catch(() => null);

      if (diag && diag.issues.length > 0) {
        for (const iss of diag.issues) {
          fileErrors.push({ line: iss.line, message: iss.message, suggestion: iss.suggestion });
          if (!jsonOutput) {
            io.stderr(`FAIL ${file}:${iss.line} [${iss.code}] ${iss.message}`);
            if (iss.suggestion) io.stderr(`       💡 Recommendation: ${iss.suggestion}`);
          }
        }
      } else {
        const msg = describeError(error);
        fileErrors.push({ line: errLine, message: msg });
        if (!jsonOutput) io.stderr(`FAIL ${file}:${errLine} ${msg}`);
      }
    }

    jsonResults.push({ file, diagrams: 1, errors: fileErrors, warnings: fileWarnings });
  }

  // 2. Process .md and .mdx files
  for (const file of markdownFiles) {
    const fileErrors: Array<{ line: number; message: string; suggestion?: string }> = [];
    const fileWarnings: Array<{ line: number; message: string }> = [];
    let fileDiagramCount = 0;

    try {
      const content = await readFile(file, "utf-8");
      const diagrams = extractDiagramsFromMarkdown(content);
      fileDiagramCount = diagrams.length;
      totalDiagrams += diagrams.length;

      for (let dIdx = 0; dIdx < diagrams.length; dIdx++) {
        const diagram = diagrams[dIdx];
        const lineOffset = diagram.line;

        try {
          const ast = parse(diagram.code);
          compile(ast);

          for (const w of ast.diagnostics.filter((d) => d.severity === "warning")) {
            warningCount++;
            const mappedLine = lineOffset + w.line - 1;
            fileWarnings.push({ line: mappedLine, message: w.message });
            if (!jsonOutput) io.stderr(`WARN ${file}:${mappedLine} ${w.message}`);
          }

          if (checkArchRules || customRules) {
            const violations = validateArchitecture(ast, customRules);
            for (const v of violations) {
              const mappedLine = lineOffset + (v.line ?? 1) - 1;
              if (v.severity === "error") {
                errorCount++;
                fileErrors.push({ line: mappedLine, message: `[${v.ruleName}] ${v.message}` });
                if (!jsonOutput) io.stderr(`ARCH_FAIL ${file}:${mappedLine} [${v.ruleName}] ${v.message}`);
              } else {
                warningCount++;
                fileWarnings.push({ line: mappedLine, message: `[${v.ruleName}] ${v.message}` });
                if (!jsonOutput) io.stderr(`ARCH_WARN ${file}:${mappedLine} [${v.ruleName}] ${v.message}`);
              }
            }
          }
        } catch (error) {
          errorCount++;
          const diag = diagnoseMarkdyCode(diagram.code, { checkArchitecture: true });
          if (diag.issues.length > 0) {
            for (const iss of diag.issues) {
              const mappedLine = lineOffset + iss.line - 1;
              fileErrors.push({ line: mappedLine, message: iss.message, suggestion: iss.suggestion });
              if (!jsonOutput) {
                io.stderr(`FAIL ${file}:${mappedLine} [${iss.code}] ${iss.message}`);
                if (iss.suggestion) io.stderr(`       💡 Recommendation: ${iss.suggestion}`);
              }
            }
          } else {
            const relLine = (error instanceof ParseError && error.line) ? error.line : 1;
            const mappedLine = lineOffset + relLine - 1;
            const msg = describeError(error);
            fileErrors.push({ line: mappedLine, message: msg });
            if (!jsonOutput) io.stderr(`FAIL ${file}:${mappedLine} ${msg}`);
          }
        }
      }

      if (fileErrors.length === 0 && !jsonOutput) {
        const desc = fileDiagramCount === 1 ? "1 diagram" : `${fileDiagramCount} diagrams`;
        io.stdout(`OK   ${file} (${desc})`);
      }
    } catch (err) {
      errorCount++;
      const msg = describeError(err);
      fileErrors.push({ line: 1, message: msg });
      if (!jsonOutput) io.stderr(`FAIL ${file}:1 ${msg}`);
    }

    jsonResults.push({ file, diagrams: fileDiagramCount, errors: fileErrors, warnings: fileWarnings });
  }

  // 3. Process HTML files (e.g. from --dist or directly passed)
  for (const file of htmlFiles) {
    const fileErrors: Array<{ line: number; message: string; suggestion?: string }> = [];
    const fileWarnings: Array<{ line: number; message: string }> = [];
    let fileDiagramCount = 0;

    try {
      const content = await readFile(file, "utf-8");
      const diagrams = extractDiagramsFromHtml(content);
      fileDiagramCount = diagrams.length;
      totalDiagrams += diagrams.length;

      for (let dIdx = 0; dIdx < diagrams.length; dIdx++) {
        const diagram = diagrams[dIdx];
        const lineNo = diagram.line;

        try {
          const ast = parse(diagram.code);
          compile(ast);

          for (const w of ast.diagnostics.filter((d) => d.severity === "warning")) {
            warningCount++;
            fileWarnings.push({ line: lineNo, message: w.message });
            if (!jsonOutput) io.stderr(`WARN ${file}:${lineNo} ${w.message}`);
          }
        } catch (error) {
          errorCount++;
          const msg = describeError(error);
          fileErrors.push({ line: lineNo, message: msg });
          if (!jsonOutput) io.stderr(`FAIL ${file}:${lineNo} (compiled AST decode): ${msg}`);
        }
      }

      if (fileErrors.length === 0 && !jsonOutput) {
        const desc = fileDiagramCount === 1 ? "1 compiled runtime diagram" : `${fileDiagramCount} compiled runtime diagrams`;
        io.stdout(`OK   ${file} (${desc})`);
      }
    } catch (err) {
      errorCount++;
      const msg = describeError(err);
      fileErrors.push({ line: 1, message: msg });
      if (!jsonOutput) io.stderr(`FAIL ${file}:1 ${msg}`);
    }

    jsonResults.push({ file, diagrams: fileDiagramCount, errors: fileErrors, warnings: fileWarnings });
  }

  if (jsonOutput) {
    io.stdout(
      JSON.stringify(
        {
          summary: {
            filesScanned: totalFiles,
            diagramsVerified: totalDiagrams,
            errors: errorCount,
            warnings: warningCount,
            passed: errorCount === 0 && (!strict || warningCount === 0),
          },
          results: jsonResults,
        },
        null,
        2,
      ),
    );
    return { exitCode: (errorCount > 0 || (strict && warningCount > 0)) ? 1 : 0 };
  }

  if (strict && warningCount > 0) {
    io.stderr(`markdy check: ${warningCount} warning(s) treated as failures.`);
    return { exitCode: 1 };
  }

  if (errorCount > 0) {
    io.stderr(`markdy check: ${errorCount} error(s) across ${totalFiles} file(s).`);
    return { exitCode: 1 };
  }

  io.stdout(`markdy check: PASS — ${totalFiles} file(s) scanned, ${totalDiagrams} diagram(s) verified, 0 warnings.`);
  return { exitCode: 0 };
}

async function suggestCommand(parsed: ParsedArgs, io: CliIo): Promise<RunResult> {
  const file = parsed.positionals[0];
  if (!file) {
    io.stderr("markdy suggest: expected a .markdy input file");
    return { exitCode: 1 };
  }

  const scene = await loadSceneFromFile(file).catch((err) => {
    io.stderr(`markdy suggest: ${describeError(err)}`);
    return null;
  });
  if (!scene) return { exitCode: 1 };

  const lineFlag = getStringFlag(parsed, "line");
  const colFlag = getStringFlag(parsed, "col");
  const lines = scene.source.split(/\r?\n/);
  const targetLine = lineFlag ? Number(lineFlag) - 1 : Math.max(0, lines.length - 1);
  const targetCol = colFlag ? Number(colFlag) : (lines[targetLine]?.length ?? 0);

  const completions = getIntelliCodeCompletions(scene.source, targetLine, targetCol);
  const nextLinePrediction = predictNextLineSuggestion(scene.source, targetLine);
  const archRecommendations = getArchitectureSuggestions(scene.source);

  if (hasFlag(parsed, "json")) {
    io.stdout(
      JSON.stringify(
        {
          file,
          cursor: { line: targetLine + 1, column: targetCol },
          topCompletions: completions.slice(0, 10),
          nextLinePrediction,
          architectureRecommendations: archRecommendations,
        },
        null,
        2
      )
    );
    return { exitCode: 0 };
  }

  const out: string[] = [];
  out.push(`💡 Markdy IntelliCode Analysis: ${file}`);
  out.push(`- Cursor Line: ${targetLine + 1}, Column: ${targetCol}`);

  if (nextLinePrediction) {
    out.push(`\n🔮 Predictive Next-Line Suggestion:`);
    out.push(`  → ${nextLinePrediction.text.trim()} (${nextLinePrediction.description})`);
  }

  if (archRecommendations.length > 0) {
    out.push(`\n🛡️ Proactive Architectural Suggestions (${archRecommendations.length}):`);
    for (const rec of archRecommendations) {
      out.push(`  - [${rec.title}] ${rec.desc}`);
      out.push(`    Action: ${rec.actionLabel}`);
    }
  } else {
    out.push(`\n✓ Architecture topology is well-structured with clear layer boundaries.`);
  }

  if (completions.length > 0) {
    out.push(`\n✨ Top Autocompletions at Cursor:`);
    for (const item of completions.slice(0, 8)) {
      out.push(`  - ${item.label.padEnd(20)} [${item.kind}] ${item.detail || ""}`);
    }
  }

  io.stdout(out.join("\n"));
  return { exitCode: 0 };
}

async function launchPlayground(
  parsed: ParsedArgs,
  io: CliIo,
  runtime: CliRuntime,
  scene?: LoadedScene,
): Promise<RunResult> {
  const portFlag = getStringFlag(parsed, "port");
  const preferredPort = portFlag ? Number(portFlag) : DEFAULT_PORT;
  const code = scene?.source ?? defaultSceneTemplate();
  const sourcePath = scene?.filePath;
  const server = await startPreviewServer(code, sourcePath, preferredPort);
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : preferredPort;
  const url = `http://127.0.0.1:${port}`;

  io.stdout(`Markdy playground ready at ${url}`);
  if (!hasFlag(parsed, "no-open")) {
    await runtime.openBrowser(url);
  }

  return { exitCode: 0, server };
}

async function startPreviewServer(
  code: string,
  sourcePath: string | undefined,
  preferredPort: number,
): Promise<Server> {
  const coreDist = resolvePackageDist("@markdy/core");
  const rendererDist = resolvePackageDist("@markdy/renderer-dom");
  const html = buildPlaygroundHtml(code, sourcePath);

  const server = createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      if (requestUrl.pathname === "/") {
        sendText(response, 200, html, "text/html; charset=utf-8");
        return;
      }

      if (requestUrl.pathname.startsWith("/pkg/core/")) {
        await servePackageFile(response, coreDist, requestUrl.pathname.slice("/pkg/core/".length));
        return;
      }

      if (requestUrl.pathname.startsWith("/pkg/renderer-dom/")) {
        await servePackageFile(response, rendererDist, requestUrl.pathname.slice("/pkg/renderer-dom/".length));
        return;
      }

      sendText(response, 404, "Not found", "text/plain; charset=utf-8");
    } catch (error) {
      sendText(response, 500, describeError(error), "text/plain; charset=utf-8");
    }
  });

  await new Promise<void>((resolvePromise, rejectPromise) => {
    server.once("error", rejectPromise);
    server.listen(preferredPort, "127.0.0.1", () => {
      server.off("error", rejectPromise);
      resolvePromise();
    });
  }).catch(async () => {
    await new Promise<void>((resolvePromise, rejectPromise) => {
      server.once("error", rejectPromise);
      server.listen(0, "127.0.0.1", () => {
        server.off("error", rejectPromise);
        resolvePromise();
      });
    });
  });

  return server;
}

async function servePackageFile(response: ServerResponse, distDir: string, relativePath: string): Promise<void> {
  const safePath = relativePath.replace(/^\/+/, "");
  const fullPath = resolve(distDir, safePath);
  if (fullPath !== distDir && !fullPath.startsWith(distDir + sep)) {
    sendText(response, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }

  const body = await readFile(fullPath);
  sendBuffer(response, 200, body, contentType(fullPath));
}

async function loadSceneFromFile(
  filePath: string,
  cache: Map<string, LoadedScene> = new Map(),
  stack: string[] = [],
): Promise<LoadedScene> {
  const resolvedPath = resolve(filePath);
  const cached = cache.get(resolvedPath);
  if (cached) return cached;

  if (stack.includes(resolvedPath)) {
    const chain = [...stack, resolvedPath].map((entry) => basename(entry)).join(" -> ");
    throw new Error(`Import cycle detected: ${chain}`);
  }

  const source = await readFile(resolvedPath, "utf8").catch((error) => {
    throw new Error(`Unable to read ${resolvedPath}: ${describeError(error)}`);
  });

  const ast = parse(source);
  const loaded: LoadedScene = { filePath: resolvedPath, source, ast };
  cache.set(resolvedPath, loaded);
  return loaded;
}

async function resolveSceneImports(): Promise<Record<string, never>> {
  return {};
}

function scanImports(source: string): Array<{ path: string; namespace: string }> {
  const imports: Array<{ path: string; namespace: string }> = [];
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("import ")) continue;
    const match = IMPORT_RE.exec(trimmed);
    if (!match) continue;
    imports.push({ path: match[1], namespace: match[2] });
  }
  return imports;
}

async function collectSceneFiles(inputs: string[]): Promise<string[]> {
  const candidates = inputs.length > 0 ? inputs : [process.cwd()];
  const out = new Set<string>();

  for (const candidate of candidates) {
    const resolved = resolve(candidate);
    const info = await stat(resolved).catch(() => null);
    if (!info) continue;

    if (info.isDirectory()) {
      for (const file of await walkMarkdyFiles(resolved)) {
        out.add(file);
      }
      continue;
    }

    if (info.isFile() && extname(resolved) === MARKDY_EXT) {
      out.add(resolved);
    }
  }

  return [...out].sort();
}

async function walkMarkdyFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "dist") {
      continue;
    }
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkMarkdyFiles(fullPath));
      continue;
    }
    if (entry.isFile() && extname(entry.name) === MARKDY_EXT) {
      files.push(fullPath);
    }
  }

  return files;
}

function buildPlaygroundHtml(code: string, sourcePath?: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Markdy Playground</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #0d1117;
        color: #e6edf3;
      }
      header {
        padding: 16px 20px;
        border-bottom: 1px solid #30363d;
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: center;
      }
      main {
        display: grid;
        grid-template-columns: minmax(320px, 460px) 1fr;
        min-height: calc(100vh - 66px);
      }
      textarea {
        width: 100%;
        height: 100%;
        border: 0;
        resize: none;
        padding: 20px;
        background: #010409;
        color: #c9d1d9;
        font: 14px/1.55 ui-monospace, SFMono-Regular, SFMono-Regular, Menlo, Consolas, monospace;
      }
      .editor {
        border-right: 1px solid #30363d;
        display: flex;
        flex-direction: column;
      }
      .preview {
        padding: 20px;
        overflow: auto;
      }
      .actions {
        display: flex;
        gap: 8px;
        padding: 12px 20px;
        border-top: 1px solid #30363d;
        background: #0d1117;
      }
      button {
        border: 1px solid #30363d;
        border-radius: 8px;
        background: #161b22;
        color: #e6edf3;
        padding: 8px 12px;
        cursor: pointer;
      }
      #warnings {
        margin: 0 0 16px;
        padding: 0;
        list-style: none;
      }
      #warnings li {
        margin-bottom: 8px;
        padding: 10px 12px;
        border-radius: 8px;
        background: rgba(255, 183, 77, 0.12);
        color: #ffd38a;
      }
      #viewport {
        max-width: 960px;
        margin: 0 auto;
      }
      code { color: #8b949e; }
    </style>
    <script type="importmap">
      {
        "imports": {
          "@markdy/core": "/pkg/core/index.js",
          "@markdy/renderer-dom": "/pkg/renderer-dom/index.js"
        }
      }
    </script>
  </head>
  <body>
    <header>
      <div>
        <strong>Markdy Playground</strong>
        <div><code>${escapeHtml(sourcePath ?? "scratch scene")}</code></div>
      </div>
      <div>MarkdyScript 0.8 diagram playground</div>
    </header>
    <main>
      <section class="editor">
        <textarea id="code">${escapeHtml(code)}</textarea>
        <div class="actions">
          <button id="run" type="button">Run</button>
          <button id="paste" type="button">Paste</button>
          <button id="copy" type="button">Copy</button>
          <button id="pause" type="button">Pause</button>
          <button id="play" type="button">Play</button>
        </div>
      </section>
      <section class="preview">
        <ul id="warnings"></ul>
        <div id="viewport"></div>
      </section>
    </main>
    <script type="module">
      import { createDiagram } from "@markdy/renderer-dom";

      const textarea = document.getElementById("code");
      const viewport = document.getElementById("viewport");
      const warnings = document.getElementById("warnings");
      const runButton = document.getElementById("run");
      const pasteButton = document.getElementById("paste");
      const copyButton = document.getElementById("copy");
      const pauseButton = document.getElementById("pause");
      const playButton = document.getElementById("play");
      let diagram;

      function render() {
        warnings.innerHTML = "";
        viewport.innerHTML = "";
        diagram?.destroy?.();
        try {
          diagram = createDiagram({
            container: viewport,
            code: textarea.value,
            onWarning(warning) {
              const item = document.createElement("li");
              item.textContent = \`line \${warning.line}: \${warning.message}\`;
              warnings.appendChild(item);
            }
          });
        } catch (error) {
          const item = document.createElement("li");
          item.textContent = error instanceof Error ? error.message : String(error);
          warnings.appendChild(item);
        }
      }

      runButton.addEventListener("click", render);
      pasteButton?.addEventListener("click", async () => {
        let text = "";
        try {
          if (navigator.clipboard && navigator.clipboard.readText) {
            text = await navigator.clipboard.readText();
          } else {
            text = prompt("Paste MarkdyScript code here:") || "";
          }
        } catch {
          const fallback = prompt("Paste MarkdyScript code here:");
          if (fallback !== null) text = fallback;
        }
        if (text && text.trim()) {
          textarea.value = text;
          render();
          const orig = pasteButton.textContent;
          pasteButton.textContent = "Pasted!";
          setTimeout(() => { pasteButton.textContent = orig; }, 1800);
        }
      });
      copyButton?.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(textarea.value);
          const orig = copyButton.textContent;
          copyButton.textContent = "Copied!";
          setTimeout(() => { copyButton.textContent = orig; }, 1800);
        } catch {}
      });
      pauseButton.addEventListener("click", () => diagram?.pause?.());
      playButton.addEventListener("click", () => diagram?.play?.());
      render();
    </script>
  </body>
</html>`;
}

export async function buildStandaloneHtml(scene: LoadedScene): Promise<string> {
  const version = await getPackageVersion();
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(basename(scene.filePath))} — Markdy</title>
    <style>
      body {
        margin: 0;
        padding: 24px;
        background: #0d1117;
        color: #e6edf3;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      main {
        max-width: 980px;
        margin: 0 auto;
      }
      #app {
        max-width: 960px;
        margin: 0 auto;
      }
    </style>
  </head>
  <body>
    <main>
      <div id="app"></div>
    </main>
    <script type="importmap">
      {
        "imports": {
          "@markdy/core": "https://esm.sh/@markdy/core@${version}",
          "@markdy/renderer-dom": "https://esm.sh/@markdy/renderer-dom@${version}"
        }
      }
    </script>
    <script type="module">
      import { createDiagram } from "@markdy/renderer-dom";

      createDiagram({
        container: document.getElementById("app"),
        code: ${JSON.stringify(scene.source)},
        onWarning(warning) {
          console.warn(\`[markdy] line \${warning.line}: \${warning.message}\`);
        }
      });
    </script>
  </body>
</html>`;
}

function helpText(): string {
  return [
    "markdy — MarkdyScript command-line tools",
    "",
    "Usage:",
    "  markdy",
    "  markdy check [file-or-dir] [--dist <dir>] [--strict] [--arch-rules] [--json]",
    "  markdy lint <file-or-dir> [--strict] [--arch-rules]",
    "  markdy fmt <file-or-dir> [--write | --check]",
    "  markdy render <file.markdy> [--out file.html] [--port 4242] [--no-open]",
    "  markdy verify <file.markdy> [--quality showcase] [--json]",
    "  markdy guide [scenario-query] [--json]",
    "  markdy recipe <recipe-id> [--json]",
    "  markdy explain <file.markdy> [--json]",
    "  markdy import <file> [--from compose|k8s|terraform|mermaid] [--out scene.markdy]",
    "  markdy diff <before.markdy> <after.markdy> [--evolution]",
    "  markdy share <file.markdy>",
    "  markdy suggest <file.markdy> [--line <n>] [--col <n>] [--json]",
    "  markdy new [target.markdy] [--force]",
    "  markdy docs [--open]",
    "  markdy ai [--open]",
    "  markdy check-all [dir] [--strict] [--arch-rules]",
  ].join("\n");
}

function parseArgv(argv: string[]): ParsedArgs {
  const flags = new Map<string, string | boolean>();
  const positionals: string[] = [];
  let command: string | undefined;

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (!command && !arg.startsWith("-")) {
      command = arg;
      continue;
    }

    if (arg.startsWith("--")) {
      const body = arg.slice(2);
      const eqIndex = body.indexOf("=");
      if (eqIndex !== -1) {
        flags.set(body.slice(0, eqIndex), body.slice(eqIndex + 1));
        continue;
      }
      const rawKey = body;

      const next = argv[index + 1];
      if (next && !next.startsWith("-") && expectsValue(rawKey)) {
        flags.set(rawKey, next);
        index++;
      } else {
        flags.set(rawKey, true);
      }
      continue;
    }

    if (arg.startsWith("-")) {
      const short = arg.slice(1);
      if (short === "w") flags.set("write", true);
      else if (short === "c") flags.set("check", true);
      else if (short === "j") flags.set("json", true);
      else if (short === "s") flags.set("strict", true);
      else if (short === "f") flags.set("force", true);
      else if (short === "o") {
        const next = argv[index + 1];
        if (!next || next.startsWith("-")) throw new Error("Expected a value after -o");
        flags.set("out", next);
        index++;
      } else if (short === "p") {
        const next = argv[index + 1];
        if (!next || next.startsWith("-")) throw new Error("Expected a value after -p");
        flags.set("port", next);
        index++;
      } else if (short === "h") {
        flags.set("help", true);
      } else {
        flags.set(short, true);
      }
      continue;
    }

    positionals.push(arg);
  }

  return { command, positionals, flags };
}

function expectsValue(flag: string): boolean {
  return (
    flag === "out" ||
    flag === "port" ||
    flag === "config" ||
    flag === "dist" ||
    flag === "from" ||
    flag === "line" ||
    flag === "col" ||
    flag === "quality" ||
    flag === "level" ||
    flag === "repo" ||
    flag === "theme" ||
    flag === "format"
  );
}

function hasFlag(parsed: ParsedArgs, name: string): boolean {
  return parsed.flags.get(name) === true;
}

function getStringFlag(parsed: ParsedArgs, name: string): string | undefined {
  const value = parsed.flags.get(name);
  return typeof value === "string" ? value : undefined;
}

function printWarnings(warnings: Diagnostic[], file: string, io: CliIo): number {
  for (const warning of warnings.filter((w) => w.severity === "warning")) {
    io.stderr(`WARN ${file}:${warning.line} ${warning.message}`);
  }
  return warnings.filter((w) => w.severity === "warning").length;
}

function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  const walk = (current: unknown): unknown => {
    if (current === null || typeof current !== "object") return current;
    if (seen.has(current as object)) return "[circular]";
    seen.add(current as object);
    if (Array.isArray(current)) return current.map(walk);
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(current as Record<string, unknown>).sort()) {
      sorted[key] = walk((current as Record<string, unknown>)[key]);
    }
    return sorted;
  };
  return `${JSON.stringify(walk(value), null, 2)}\n`;
}

function normalizeNewlines(value: string): string {
  return value.replace(/\r\n/g, "\n");
}

async function getPackageVersion(): Promise<string> {
  const pkg = JSON.parse(await readFile(join(PACKAGE_ROOT, "package.json"), "utf8")) as { version: string };
  return pkg.version;
}

function resolvePackageDist(packageName: "@markdy/core" | "@markdy/renderer-dom"): string {
  const require = createRequire(import.meta.url);
  const packageJson = require.resolve(`${packageName}/package.json`);
  return join(dirname(packageJson), "dist");
}

function contentType(path: string): string {
  if (path.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (path.endsWith(".d.ts")) return "text/plain; charset=utf-8";
  if (path.endsWith(".json")) return "application/json; charset=utf-8";
  if (path.endsWith(".css")) return "text/css; charset=utf-8";
  return "application/octet-stream";
}

function sendText(response: ServerResponse, status: number, body: string, type: string): void {
  response.writeHead(status, { "content-type": type });
  response.end(body);
}

function sendBuffer(response: ServerResponse, status: number, body: Buffer, type: string): void {
  response.writeHead(status, { "content-type": type });
  response.end(body);
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function defaultSceneTemplate(): string {
  return [
    'scene theme=paper',
    "layout LR",
    "",
    "browser Client",
    "service API",
    "database DB",
    "",
    "beat intro:",
    "  show $nodes",
    '  Client -> API "GET /health" -> DB "lookup"',
    "",
  ].join("\n");
}

function defaultIo(): CliIo {
  return {
    stdout(message) {
      process.stdout.write(`${message}\n`);
    },
    stderr(message) {
      process.stderr.write(`${message}\n`);
    },
  };
}

function defaultRuntime(): CliRuntime {
  return {
    async openBrowser(url: string) {
      const command =
        process.platform === "darwin"
          ? "open"
          : process.platform === "win32"
            ? "cmd"
            : "xdg-open";
      const args =
        process.platform === "win32"
          ? ["/c", "start", "", url]
          : [url];
      const child = spawn(command, args, {
        detached: true,
        stdio: "ignore",
      });
      child.unref();
    },
  };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  runCli(process.argv.slice(2)).then(({ exitCode }) => {
    process.exitCode = exitCode;
  }).catch((error) => {
    process.stderr.write(`${describeError(error)}\n`);
    process.exitCode = 1;
  });
}
