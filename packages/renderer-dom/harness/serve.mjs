/**
 * Visual harness server for the diagram renderer.
 *
 * Serves a gallery page that renders every showcase/example scene with the
 * freshly built renderer so we can eyeball and screenshot visual quality
 * while iterating. Mirrors the CLI playground's import-map approach: the
 * browser loads `@markdy/core` and `@markdy/renderer-dom` from their built
 * `dist/` output, with no bundler step.
 *
 * Usage:
 *   pnpm --filter @markdy/renderer-dom run harness
 * (the package script builds core + renderer first, then runs this)
 */
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, "..", "..", "..");
const CORE_DIST = resolve(REPO_ROOT, "packages/core/dist");
const RENDERER_DIST = resolve(REPO_ROOT, "packages/renderer-dom/dist");
const EXAMPLE_DIRS = ["examples/showcase", "examples"];
const PORT = Number(process.env.HARNESS_PORT ?? 4321);

function contentType(path) {
  if (path.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (path.endsWith(".json")) return "application/json; charset=utf-8";
  if (path.endsWith(".html")) return "text/html; charset=utf-8";
  if (path.endsWith(".css")) return "text/css; charset=utf-8";
  return "application/octet-stream";
}

/** Serve a file from a dist dir, refusing path traversal outside it. */
async function servePackageFile(res, distDir, relativePath) {
  const safe = relativePath.replace(/^\/+/, "");
  const full = resolve(distDir, safe);
  if (full !== distDir && !full.startsWith(distDir + sep)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const body = await readFile(full);
    res.writeHead(200, { "content-type": contentType(full) }).end(body);
  } catch {
    res.writeHead(404).end("Not found");
  }
}

async function loadExamples() {
  const out = [];
  for (const dir of EXAMPLE_DIRS) {
    const full = join(REPO_ROOT, dir);
    let files = [];
    try {
      files = (await readdir(full)).filter((f) => f.endsWith(".markdy")).sort();
    } catch {
      continue;
    }
    for (const file of files) {
      const code = await readFile(join(full, file), "utf8");
      out.push({ id: `${dir}/${file}`, group: dir, name: file.replace(/\.markdy$/, ""), code });
    }
  }
  return out;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (url.pathname === "/") {
      const html = await readFile(join(HERE, "index.html"), "utf8");
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(html);
      return;
    }
    if (url.pathname === "/examples.json") {
      const body = JSON.stringify(await loadExamples());
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" }).end(body);
      return;
    }
    if (url.pathname.startsWith("/pkg/core/")) {
      await servePackageFile(res, CORE_DIST, url.pathname.slice("/pkg/core/".length));
      return;
    }
    if (url.pathname.startsWith("/pkg/renderer-dom/")) {
      await servePackageFile(res, RENDERER_DIST, url.pathname.slice("/pkg/renderer-dom/".length));
      return;
    }
    res.writeHead(404).end("Not found");
  } catch (error) {
    res.writeHead(500).end(error instanceof Error ? error.stack : String(error));
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Markdy visual harness → http://127.0.0.1:${PORT}`);
  console.log("Screenshot this page to compare renderer visual quality.");
});
