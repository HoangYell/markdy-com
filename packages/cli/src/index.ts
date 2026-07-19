import { PRESETS, PRESET_NAMES, parse, type ParseWarning, type SceneAST } from "@markdy/core";
import { createRequire } from "node:module";
import { basename, dirname, extname, join, resolve } from "node:path";
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
  ast: SceneAST;
  imports: Record<string, SceneAST>;
};

const DEFAULT_PORT = 4242;
const IMPORT_RE = /^import\s+"([^"]+)"\s+as\s+(\w+)\s*$/;
const MARKDY_EXT = ".markdy";
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function runCli(
  argv: string[],
  io: CliIo = defaultIo(),
  runtime: CliRuntime = defaultRuntime(),
): Promise<RunResult> {
  const parsed = parseArgv(argv);

  if (!parsed.command && hasFlag(parsed, "help")) {
    io.stdout(helpText());
    return { exitCode: 0 };
  }

  if (!parsed.command) {
    return launchPlayground(parsed, io, runtime);
  }

  const command = parsed.command;
  if (command === "--help" || command === "-h") {
    io.stdout(helpText());
    return { exitCode: 0 };
  }

  switch (command) {
    case "lint":
      return lintCommand(parsed, io);
    case "fmt":
      return fmtCommand(parsed, io);
    case "render":
      return renderCommand(parsed, io, runtime);
    case "explain":
      return explainCommand(parsed, io);
    case "new":
      return newCommand(parsed, io);
    case "docs":
      return docsCommand(parsed, io, runtime);
    case "ai":
      return aiCommand(parsed, io, runtime);
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
  const cache = new Map<string, LoadedScene>();
  let warningCount = 0;
  let errorCount = 0;

  for (const file of files) {
    try {
      const scene = await loadSceneFromFile(file, cache);
      io.stdout(`OK   ${file}`);
      warningCount += printWarnings(scene.ast.warnings, file, io);
    } catch (error) {
      errorCount++;
      io.stderr(`FAIL ${file}`);
      io.stderr(`     ${describeError(error)}`);
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
  const cache = new Map<string, LoadedScene>();
  let changed = 0;

  if (!write && !check && files.length > 1) {
    io.stderr("markdy fmt: pass exactly one file when printing to stdout, or use --write / --check");
    return { exitCode: 1 };
  }

  for (const file of files) {
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
    `Background: ${scene.ast.meta.bg}`,
    `Duration: ${scene.ast.meta.duration ?? 0}s`,
    `Actors: ${Object.keys(scene.ast.actors).length}`,
    `Events: ${scene.ast.events.length}`,
    `Chapters: ${scene.ast.chapters.length > 0 ? scene.ast.chapters.map((chapter) => chapter.name).join(", ") : "(none)"}`,
    `Imports: ${scene.ast.imports.length > 0 ? scene.ast.imports.map((item) => `${item.namespace} -> ${item.path}`).join(", ") : "(none)"}`,
    `Warnings: ${scene.ast.warnings.length}`,
  ];
  io.stdout(summary.join("\n"));
  if (scene.ast.warnings.length > 0) {
    printWarnings(scene.ast.warnings, scene.filePath, io);
  }
  return { exitCode: 0 };
}

async function newCommand(parsed: ParsedArgs, io: CliIo): Promise<RunResult> {
  const presetOrTarget = parsed.positionals[0];
  const second = parsed.positionals[1];
  const force = hasFlag(parsed, "force");

  let presetName = "basic";
  let target = "scene.markdy";

  if (presetOrTarget) {
    if (PRESET_NAMES.includes(presetOrTarget)) {
      presetName = presetOrTarget;
      target = second ?? target;
    } else {
      target = presetOrTarget;
    }
  }

  const resolvedTarget = resolve(target);
  const content = presetName === "basic" ? defaultSceneTemplate() : `preset ${presetName}\n`;

  if (!force && await exists(resolvedTarget)) {
    io.stderr(`markdy new: target already exists: ${resolvedTarget} (pass --force to overwrite)`);
    return { exitCode: 1 };
  }

  await writeFile(resolvedTarget, content, "utf8");
  io.stdout(`Created ${resolvedTarget}`);
  return { exitCode: 0 };
}

async function docsCommand(parsed: ParsedArgs, io: CliIo, runtime: CliRuntime): Promise<RunResult> {
  const docsUrl = "https://markdy.com";
  const links = [
    "Markdy docs",
    "  Website: https://markdy.com",
    "  Syntax:  https://github.com/HoangYell/markdy-com/blob/main/docs/SYNTAX.md",
    "  Agent:   https://github.com/HoangYell/markdy-com/blob/main/docs/AGENT.md",
    "  Tutorial:https://github.com/HoangYell/markdy-com/blob/main/docs/TUTORIAL.md",
  ];
  io.stdout(links.join("\n"));
  if (hasFlag(parsed, "open")) {
    await runtime.openBrowser(docsUrl);
  }
  return { exitCode: 0 };
}

async function aiCommand(parsed: ParsedArgs, io: CliIo, runtime: CliRuntime): Promise<RunResult> {
  const agentUrl = "https://github.com/HoangYell/markdy-com/blob/main/docs/AGENT.md";
  io.stdout(
    [
      "Share this with your AI agent:",
      agentUrl,
      "",
      "Starter prompt:",
      'Write a Markdy scene for a short explainer video. Use the AGENT.md grammar exactly and keep the result self-contained.',
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

async function launchPlayground(
  parsed: ParsedArgs,
  io: CliIo,
  runtime: CliRuntime,
  scene?: LoadedScene,
): Promise<RunResult> {
  const portFlag = getStringFlag(parsed, "port");
  const preferredPort = portFlag ? Number(portFlag) : DEFAULT_PORT;
  const code = scene?.source ?? PRESETS.explainer([]);
  const imports = scene?.imports ?? {};
  const sourcePath = scene?.filePath;
  const server = await startPreviewServer(code, imports, sourcePath, preferredPort);
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
  imports: Record<string, SceneAST>,
  sourcePath: string | undefined,
  preferredPort: number,
): Promise<Server> {
  const coreDist = resolvePackageDist("@markdy/core");
  const rendererDist = resolvePackageDist("@markdy/renderer-dom");
  const html = buildPlaygroundHtml(code, imports, sourcePath);

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
  if (!fullPath.startsWith(distDir)) {
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

  const imports = await resolveSceneImports(source, resolvedPath, cache, [...stack, resolvedPath]);
  const ast = parse(source, Object.keys(imports).length > 0 ? { imports } : undefined);
  const loaded: LoadedScene = { filePath: resolvedPath, source, ast, imports };
  cache.set(resolvedPath, loaded);
  return loaded;
}

async function resolveSceneImports(
  source: string,
  filePath: string,
  cache: Map<string, LoadedScene>,
  stack: string[],
): Promise<Record<string, SceneAST>> {
  const imports: Record<string, SceneAST> = {};

  for (const declaration of scanImports(source)) {
    const childPath = resolve(dirname(filePath), declaration.path);
    const child = await loadSceneFromFile(childPath, cache, stack);
    imports[declaration.namespace] = child.ast;
  }

  return imports;
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

function buildPlaygroundHtml(
  code: string,
  imports: Record<string, SceneAST>,
  sourcePath?: string,
): string {
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
      <div>Resolved imports: ${Object.keys(imports).length}</div>
    </header>
    <main>
      <section class="editor">
        <textarea id="code">${escapeHtml(code)}</textarea>
        <div class="actions">
          <button id="run" type="button">Run</button>
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
      import { createPlayer } from "@markdy/renderer-dom";

      const imports = ${JSON.stringify(imports)};
      const textarea = document.getElementById("code");
      const viewport = document.getElementById("viewport");
      const warnings = document.getElementById("warnings");
      const runButton = document.getElementById("run");
      const pauseButton = document.getElementById("pause");
      const playButton = document.getElementById("play");
      let player;

      function render() {
        warnings.innerHTML = "";
        viewport.innerHTML = "";
        player?.destroy?.();
        try {
          player = createPlayer({
            container: viewport,
            code: textarea.value,
            imports,
            onWarning(warning) {
              const item = document.createElement("li");
              item.textContent = \`line \${warning.line}: \${warning.message} (\${warning.kind})\`;
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
      pauseButton.addEventListener("click", () => player?.pause?.());
      playButton.addEventListener("click", () => player?.play?.());
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
      import { createPlayer } from "@markdy/renderer-dom";

      createPlayer({
        container: document.getElementById("app"),
        code: ${JSON.stringify(scene.source)},
        imports: ${JSON.stringify(scene.imports)},
        onWarning(warning) {
          console.warn(\`[markdy] line \${warning.line}: \${warning.message} (\${warning.kind})\`);
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
    "  markdy lint <file-or-dir> [--strict]",
    "  markdy fmt <file-or-dir> [--write | --check]",
    "  markdy render <file.markdy> [--out file.html] [--port 4242] [--no-open]",
    "  markdy explain <file.markdy> [--json]",
    "  markdy new [preset-name] [target.markdy] [--force]",
    "  markdy docs [--open]",
    "  markdy ai [--open]",
    "  markdy check-all [dir] [--strict]",
    "",
    `Built-in presets: ${PRESET_NAMES.join(", ")}`,
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
      const [rawKey, rawValue] = arg.slice(2).split("=", 2);
      if (rawValue !== undefined) {
        flags.set(rawKey, rawValue);
        continue;
      }

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
  return flag === "out" || flag === "port";
}

function hasFlag(parsed: ParsedArgs, name: string): boolean {
  return parsed.flags.get(name) === true;
}

function getStringFlag(parsed: ParsedArgs, name: string): string | undefined {
  const value = parsed.flags.get(name);
  return typeof value === "string" ? value : undefined;
}

function printWarnings(warnings: ParseWarning[], file: string, io: CliIo): number {
  for (const warning of warnings) {
    io.stderr(`WARN ${file}:${warning.line} ${warning.kind} ${warning.message}`);
  }
  return warnings.length;
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
    "scene width=960 height=540 fps=30 bg=#0d1117",
    "",
    'actor title = caption("hello, markdy") at top',
    "actor hero = figure(#c68642, m, 😎) at (480, 360)",
    "",
    '@0.0: title.fade_in(dur=0.4)',
    "@0.4: hero.enter(from=bottom, dur=0.5)",
    '@1.2: hero.say("ship it", dur=1.4)',
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
