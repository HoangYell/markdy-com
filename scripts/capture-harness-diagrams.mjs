import puppeteer from 'puppeteer-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ARTIFACTS_DIR = '/Users/yell/.gemini/antigravity/brain/f9d709c9-d36b-47e2-929a-c619518dba5f';
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

const CORE_DIST = resolve(rootDir, 'packages/core/dist');
const RENDERER_DIST = resolve(rootDir, 'packages/renderer-dom/dist');
const PORT = 4324;

const diagrams = [
  {
    name: 'url-shortener-architecture',
    file: 'examples/showcase/url-shortener-architecture.markdy',
  },
  {
    name: 'test-a-simple-flow',
    code: `
scene theme=midnight width=1280 height=720
layout LR

user Client
gateway ApiGateway
service BackendService
db Database

beat flow:
  show $nodes
  Client -> ApiGateway "HTTPS Request"
  ApiGateway -> BackendService "gRPC Call"
  BackendService -> Database "SQL Query"
    `,
  },
  {
    name: 'test-b-branching',
    code: `
scene theme=paper width=1280 height=720
layout LR

user Client
gateway Gateway
service ServiceA
service ServiceB
service ServiceC
db Database
cache Cache
queue Queue

group services: ServiceA ServiceB ServiceC
group storage: Database Cache Queue

beat flow:
  show $nodes
  Client -> Gateway "dispatch"
  Gateway -> ServiceA "branch A"
  Gateway -> ServiceB "branch B"
  Gateway -> ServiceC "branch C"
  ServiceA -> Database "write"
  ServiceB -> Cache "lookup"
  ServiceC -> Queue "publish"
    `,
  },
  {
    name: 'editorial-architecture',
    file: 'examples/showcase/editorial-architecture.markdy',
  },
  {
    name: 'kubernetes-cluster-architecture',
    file: 'examples/showcase/kubernetes-cluster-architecture.markdy',
  },
  {
    name: 'fintech-governance-engine',
    file: 'examples/showcase/fintech-governance-engine.markdy',
  },
];

for (const diag of diagrams) {
  if (!diag.code && diag.file) {
    diag.code = await readFile(resolve(rootDir, diag.file), 'utf8');
  }
}

function contentType(path) {
  if (path.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (path.endsWith('.json')) return 'application/json; charset=utf-8';
  if (path.endsWith('.html')) return 'text/html; charset=utf-8';
  if (path.endsWith('.css')) return 'text/css; charset=utf-8';
  return 'application/octet-stream';
}

async function servePackageFile(res, distDir, relativePath) {
  const safe = relativePath.replace(/^\/+/, '');
  const full = resolve(distDir, safe);
  try {
    const body = await readFile(full);
    res.writeHead(200, { 'content-type': contentType(full) }).end(body);
  } catch {
    res.writeHead(404).end('Not found');
  }
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    if (url.pathname === '/pkg/core/index.js') {
      await servePackageFile(res, CORE_DIST, 'index.js');
      return;
    }
    if (url.pathname === '/pkg/renderer-dom/index.js') {
      await servePackageFile(res, RENDERER_DIST, 'index.js');
      return;
    }
    if (url.pathname === '/render') {
      const idx = Number(url.searchParams.get('idx') ?? 0);
      const diag = diagrams[idx] ?? diagrams[0];
      const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script type="importmap">
    {
      "imports": {
        "@markdy/core": "/pkg/core/index.js",
        "@markdy/renderer-dom": "/pkg/renderer-dom/index.js"
      }
    }
  </script>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: #080c16;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
    }
    #stage {
      width: 1280px;
      height: 760px;
      position: relative;
    }
  </style>
</head>
<body>
  <div id="stage"></div>
  <script type="module">
    import { createDiagram } from "@markdy/renderer-dom";
    const code = ${JSON.stringify(diag.code)};
    const stage = document.getElementById('stage');
    window.__diagram = createDiagram({
      container: stage,
      code: code,
      autoplay: false,
      loop: false,
      sceneBoundaryProgress: false,
      copyright: false,
    });
    // Scrub to final frame so all edges and nodes are revealed
    const dur = window.__diagram.duration();
    window.__diagram.seek(dur > 0 ? dur : 1);
    window.__RENDER_READY__ = true;
  </script>
</body>
</html>`;
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html);
      return;
    }
    res.writeHead(404).end('Not found');
  } catch (err) {
    res.writeHead(500).end(String(err));
  }
});

await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));

const browser = await puppeteer.launch({
  executablePath: CHROME_PATH,
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 760, deviceScaleFactor: 2 });

for (let i = 0; i < diagrams.length; i++) {
  const diag = diagrams[i];
  await page.goto(`http://127.0.0.1:${PORT}/render?idx=${i}`, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.__RENDER_READY__ === true);
  await new Promise((r) => setTimeout(r, 400));

  const stageEl = await page.$('#stage');
  const outPath = join(ARTIFACTS_DIR, `${diag.name}.png`);
  if (stageEl) {
    await stageEl.screenshot({ path: outPath });
  } else {
    await page.screenshot({ path: outPath });
  }
  console.log(`Saved screenshot: ${outPath}`);
}

await browser.close();
server.close();
console.log('Finished capturing all diagrams successfully!');
