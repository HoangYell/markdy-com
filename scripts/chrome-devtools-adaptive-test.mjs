import puppeteer from 'puppeteer-core';
import * as chromeLauncher from 'chrome-launcher';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

function resolveChromePath() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  try {
    const installations = chromeLauncher.Launcher.getInstallations();
    if (installations && installations.length > 0) {
      return installations[0];
    }
  } catch {
    // continue to fallback list
  }
  const defaultPaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  for (const p of defaultPaths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Chrome executable could not be found. Please set CHROME_PATH environment variable.');
}

const CHROME_PATH = resolveChromePath();
const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || resolve(rootDir, 'tmp/devtools-artifacts');
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

const CORE_DIST = resolve(rootDir, 'packages/core/dist');
const RENDERER_DIST = resolve(rootDir, 'packages/renderer-dom/dist');
const PORT = Number(process.env.PORT) || 4399;

const testCases = [
  {
    name: '01_compact_auto_sized',
    description: 'Compact 2-node flow without width/height',
    code: `
scene "Compact Microflow" theme=paper
service Client
service Server

beat main:
  Client -> Server "request"
  Client <- Server "response"
`,
  },
  {
    name: '02_dense_horizontal_pipeline',
    description: 'Dense 8-rank architecture auto-sized',
    code: `
scene "8-Stage Delivery Pipeline" theme=midnight layout LR
service Ingress
service Auth
service Router
service ServiceA
service ServiceB
service Processor
service Aggregator
database DataLake

beat pipeline:
  Ingress -> Auth -> Router -> ServiceA -> ServiceB -> Processor -> Aggregator -> DataLake
`,
  },
  {
    name: '03_vertical_flowchart',
    description: 'Vertical flowchart with 5 tiers',
    code: `
scene "Order Validation Engine" theme=editorial layout TB type=flowchart
start Begin "Submit Order"
service Validate "Validate Schema"
service Inventory "Reserve Stock"
service Charge "Process Payment"
end Finish "Order Completed"

beat flow:
  Begin -> Validate -> Inventory -> Charge -> Finish
`,
  },
  {
    name: '04_sequence_flow',
    description: 'Multi-turn sequence diagram',
    code: `
scene "OAuth2 Authorization Flow" theme=blueprint type=sequence
client Browser
gateway AuthServer "Identity Provider"
service Api "Resource Server"
database TokenStore

beat auth:
  Browser -> AuthServer "1. /authorize"
  AuthServer -> TokenStore "2. lookup client"
  AuthServer <- TokenStore "3. client valid"
  Browser <- AuthServer "4. auth code"
  Browser -> Api "5. exchange token"
  Api -> AuthServer "6. verify code"
  Api <- AuthServer "7. access token"
  Browser <- Api "8. user profile"
`,
  },
  {
    name: '05_explicit_override',
    description: 'Diagram with explicit width=1600 height=900',
    code: `
scene "Explicitly Sized Canvas" width=1600 height=900 theme=graphite
service Gateway
service Cache
service Database

group storage: Cache Database

beat main:
  Gateway -> Cache "lookup" & Gateway -> Database "fallback"
`,
  }
];

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="icon" href="data:,">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #090d16;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 32px;
      display: flex;
      flex-direction: column;
      gap: 32px;
      align-items: center;
    }
    .diagram-container {
      width: 1200px;
      height: 680px;
      background: #111827;
      border: 1px solid #374151;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }
    .stage {
      width: 100%;
      height: 100%;
      position: relative;
    }
  </style>
  <script type="importmap">
    {
      "imports": {
        "@markdy/core": "/core/index.js",
        "@markdy/renderer-dom": "/renderer/index.js"
      }
    }
  </script>
  <script type="module">
    import { parseAndCompile } from '@markdy/core';
    import { createDiagram } from '@markdy/renderer-dom';

    window.renderMarkdyDiagram = (containerId, code) => {
      const el = document.getElementById(containerId);
      el.innerHTML = '';
      const { ast, plan } = parseAndCompile(code);
      const diagram = createDiagram({ container: el, code, autoplay: true });
      return {
        metaWidth: plan.meta.width,
        metaHeight: plan.meta.height,
        aspectRatio: plan.meta.width / plan.meta.height,
        nodes: plan.nodes.map(n => ({ id: n.id, x: n.x, y: n.y, width: n.width, height: n.height })),
        nodeCount: plan.nodes.length,
      };
    };
  </script>
</head>
<body>
  <div class="diagram-container">
    <div id="stage" class="stage"></div>
  </div>
</body>
</html>
`;

async function runBrowserTests() {
  console.log('🚀 Starting local server...');
  const server = createServer(async (req, res) => {
    try {
      const cleanUrl = req.url.split('?')[0];
      if (cleanUrl === '/favicon.ico') {
        res.writeHead(204);
        return res.end();
      }
      if (cleanUrl === '/' || cleanUrl === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(htmlContent);
      } else if (cleanUrl.startsWith('/core/')) {
        const filePath = join(CORE_DIST, cleanUrl.replace('/core/', ''));
        const content = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(content);
      } else if (cleanUrl.startsWith('/renderer/')) {
        const filePath = join(RENDERER_DIST, cleanUrl.replace('/renderer/', ''));
        const content = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(content);
      } else if (cleanUrl.endsWith('.js')) {
        const rendererFile = join(RENDERER_DIST, cleanUrl.replace('/', ''));
        if (fs.existsSync(rendererFile)) {
          const content = await readFile(rendererFile);
          res.writeHead(200, { 'Content-Type': 'application/javascript' });
          return res.end(content);
        }
        res.writeHead(404);
        res.end('Not found');
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    } catch (e) {
      console.error('Server error handling:', req.url, e);
      res.writeHead(500);
      res.end(String(e));
    }
  });

  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`📡 Local server listening on http://localhost:${PORT}`);

  console.log('🌐 Launching Chrome DevTools automation...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--no-zygote',
      '--disable-software-rasterizer',
      '--headless=new',
    ],
    timeout: 60000,
    defaultViewport: { width: 1400, height: 900, deviceScaleFactor: 2 },
  });

  const page = await browser.newPage();
  page.on('console', (msg) => console.log('  [Browser console]:', msg.text()));
  page.on('pageerror', (err) => console.log('  [Browser error]:', err.message));
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle0' });

  const results = [];

  for (const tc of testCases) {
    console.log(`\n🔍 Testing: ${tc.name} (${tc.description})`);
    const metrics = await page.evaluate((code) => {
      return window.renderMarkdyDiagram('stage', code);
    }, tc.code);

    // Wait for autoplay animations to reveal cards and flow
    await new Promise((r) => setTimeout(r, 600));

    // Capture screenshot
    const screenshotPath = join(ARTIFACTS_DIR, `${tc.name}.png`);
    const stageEl = await page.$('.diagram-container');
    await stageEl.screenshot({ path: screenshotPath });

    // Verify DOM bounding boxes in Chrome
    const domMetrics = await page.evaluate(() => {
      const viewport = document.querySelector('.markdy-viewport');
      const scene = document.querySelector('.markdy-scene');
      const nodeEls = Array.from(document.querySelectorAll('.markdy-node'));
      
      const vRect = viewport ? viewport.getBoundingClientRect() : null;
      const sRect = scene ? scene.getBoundingClientRect() : null;

      return {
        viewportRendered: !!viewport,
        sceneRendered: !!scene,
        nodeElCount: nodeEls.length,
        viewportWidth: vRect?.width,
        viewportHeight: vRect?.height,
        sceneTransform: scene?.style.transform,
      };
    });

    console.log(`  ✓ Meta dimensions: ${metrics.metaWidth} × ${metrics.metaHeight} (aspect: ${(metrics.aspectRatio).toFixed(2)})`);
    console.log(`  ✓ DOM Nodes rendered: ${domMetrics.nodeElCount} / ${metrics.nodeCount}`);
    console.log(`  ✓ Viewport size in container: ${Math.round(domMetrics.viewportWidth)} × ${Math.round(domMetrics.viewportHeight)} px`);
    console.log(`  ✓ Scene transform: ${domMetrics.sceneTransform}`);
    console.log(`  📸 Screenshot saved: ${screenshotPath}`);

    results.push({
      test: tc.name,
      metaWidth: metrics.metaWidth,
      metaHeight: metrics.metaHeight,
      aspectRatio: metrics.aspectRatio,
      domMetrics,
    });
  }

  await browser.close();
  server.close();
  console.log('\n🎉 All Chrome DevTools browser verification tests completed successfully!');
}

runBrowserTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
