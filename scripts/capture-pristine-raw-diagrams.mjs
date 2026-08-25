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
  } catch {}
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
  throw new Error('Chrome executable could not be found.');
}

const CHROME_PATH = resolveChromePath();
const RAW_OUTPUT_DIR = resolve(rootDir, 'tmp/raw-captures');
fs.mkdirSync(RAW_OUTPUT_DIR, { recursive: true });

const CORE_DIST = resolve(rootDir, 'packages/core/dist');
const RENDERER_DIST = resolve(rootDir, 'packages/renderer-dom/dist');
const SHOWCASE_DIR = resolve(rootDir, 'examples/showcase');
const PORT = 4599;

const sceneFileMap = [
  { output: 'scene-url-shortener.webp', file: 'url-shortener-architecture.markdy' },
  { output: 'scene-kubernetes-cluster.webp', file: 'kubernetes-cluster-architecture.markdy' },
  { output: 'scene-lakehouse-medallion.webp', file: 'lakehouse-medallion-pipeline.markdy' },
  { output: 'scene-twitter-timeline.webp', file: 'twitter-timeline-service.markdy' },
  { output: 'scene-oauth-oidc-flow.webp', file: 'oauth-oidc-login-flow.markdy' },
  { output: 'scene-ecommerce-swimlanes.webp', file: 'cross-functional-swimlanes.markdy' },
  { output: 'scene-zero-trust-paved-road.webp', file: 'secure-paved-road-enforcement.markdy' },
  { output: 'scene-platform-pyramid.webp', file: 'enterprise-value-pyramid.markdy' },
  { output: 'scene-database-radar.webp', file: 'database-radar-benchmark.markdy' },
  { output: 'scene-strategic-quadrant.webp', file: 'strategic-decision-quadrant.markdy' },
  { output: 'scene-terminal-cli.webp', file: 'terminal-cli-architecture.markdy' },
  { output: 'scene-sketchy-whiteboard.webp', file: 'sketchy-whiteboard-flow.markdy' },
  { output: 'scene-nebula-constellation.webp', file: 'nebula-constellation.markdy' },
  { output: 'scene-cicd-pipeline.webp', file: 'cicd-delivery-pipeline.markdy' },
  { output: 'scene-fintech-governance.webp', file: 'fintech-governance-engine.markdy' },
  { output: 'scene-youtube-pipeline.webp', file: 'youtube-processing-pipeline.markdy' },
  { output: 'scene-engineering-roadmap.webp', file: 'engineering-gantt-roadmap.markdy' },
  { output: 'scene-osi-layers.webp', file: 'osi-abstraction-layers.markdy' },
  { output: 'scene-concurrency-fanin.webp', file: 'fanin-concurrency-bottleneck.markdy' },
  { output: 'scene-data-flywheel.webp', file: 'data-flywheel-loop.markdy' },
  { output: 'scene-editorial-api-platform.webp', file: 'editorial-architecture.markdy' },
  { output: 'scene-product-market-fit-venn.webp', file: 'product-market-fit-venn.markdy' },
  { output: 'scene-nested-security.webp', file: 'nested-security-perimeter.markdy' },
  { output: 'scene-oauth-pkce-sequence.webp', file: 'oauth-pkce-sequence.markdy' },
  { output: 'scene-concurrency-decision-flowchart.webp', file: 'concurrency-decision-flowchart.markdy' },
  { output: 'scene-consistent-hash-tree.webp', file: 'consistent-hash-tree.markdy' },
  { output: 'scene-distributed-2pc-state.webp', file: 'distributed-2pc-state.markdy' },
  { output: 'scene-platform-milestones.webp', file: 'platform-milestones-timeline.markdy' },
];

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="icon" href="data:,">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      background: transparent;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #stage {
      width: 1500px;
      height: 820px;
      position: relative;
      overflow: hidden;
    }
    .markdy-diagram {
      width: 100% !important;
      height: 100% !important;
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

    window.renderDiagram = async (code) => {
      const stage = document.getElementById('stage');
      stage.innerHTML = '';
      const diagram = createDiagram({
        container: stage,
        code,
        autoplay: false,
      });

      // Jump to 85% of total duration so all beats, flow edges, and glows are active
      if (diagram && typeof diagram.duration === 'function' && typeof diagram.seek === 'function') {
        const totalDur = diagram.duration();
        diagram.seek(Math.max(0, totalDur * 0.85));
      }

      await new Promise(r => setTimeout(r, 400));
      return true;
    };
  </script>
</head>
<body>
  <div id="stage"></div>
</body>
</html>
`;

async function main() {
  console.log('🚀 Launching capture server on port ' + PORT + '...');
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
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    } catch (e) {
      res.writeHead(500);
      res.end(String(e));
    }
  });

  await new Promise(r => server.listen(PORT, r));

  console.log('🌐 Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: 1500,
    height: 820,
    deviceScaleFactor: 2,
  });

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });

  for (const item of sceneFileMap) {
    const markdyPath = join(SHOWCASE_DIR, item.file);
    if (!fs.existsSync(markdyPath)) {
      console.warn(`⚠️ File not found: ${markdyPath}`);
      continue;
    }

    const code = fs.readFileSync(markdyPath, 'utf8');
    console.log(`📸 Rendering clean raw capture for: ${item.file} -> ${item.output}...`);

    await page.evaluate(async (src) => {
      await window.renderDiagram(src);
    }, code);

    await new Promise(r => setTimeout(r, 500));

    const stageEl = await page.$('#stage');
    const outPath = join(RAW_OUTPUT_DIR, item.output);
    await stageEl.screenshot({
      path: outPath,
      type: 'webp',
      quality: 95,
      omitBackground: false,
    });
    console.log(`✅ Saved clean raw capture: ${item.output}`);
  }

  await browser.close();
  server.close();
  console.log('🎉 Clean raw capture completed successfully!');
}

main().catch(err => {
  console.error('Fatal capture error:', err);
  process.exit(1);
});
