import puppeteer from 'puppeteer-core';
import * as chromeLauncher from 'chrome-launcher';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve, extname } from 'node:path';
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

// Clean out tmp/raw-captures completely to prevent any recursive nesting
if (fs.existsSync(RAW_OUTPUT_DIR)) {
  fs.rmSync(RAW_OUTPUT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(RAW_OUTPUT_DIR, { recursive: true });

const DIST_DIR = resolve(rootDir, 'website/dist');
const CORE_DIST = resolve(rootDir, 'packages/core/dist');
const RENDERER_DIST = resolve(rootDir, 'packages/renderer-dom/dist');
const SHOWCASE_DIR = resolve(rootDir, 'examples/showcase');
const PORT = 4699;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const diagramFileMap = [
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

const renderDiagramHtml = `
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
  console.log('🚀 Starting unified raw capture server on port ' + PORT + '...');
  const server = createServer(async (req, res) => {
    try {
      const cleanUrl = req.url.split('?')[0];
      if (cleanUrl === '/__render_diagram__') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        return res.end(renderDiagramHtml);
      }
      if (cleanUrl.startsWith('/core/')) {
        const filePath = join(CORE_DIST, cleanUrl.replace('/core/', ''));
        const content = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        return res.end(content);
      }
      if (cleanUrl.startsWith('/renderer/')) {
        const filePath = join(RENDERER_DIST, cleanUrl.replace('/renderer/', ''));
        const content = await readFile(filePath);
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        return res.end(content);
      }

      let staticPath = join(DIST_DIR, cleanUrl === '/' ? 'index.html' : cleanUrl);
      if (fs.existsSync(staticPath) && fs.statSync(staticPath).isDirectory()) {
        staticPath = join(staticPath, 'index.html');
      }
      if (!fs.existsSync(staticPath)) {
        staticPath = join(DIST_DIR, cleanUrl + '.html');
      }
      if (fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()) {
        const ext = extname(staticPath);
        const mime = MIME_TYPES[ext] || 'application/octet-stream';
        const content = await readFile(staticPath);
        res.writeHead(200, { 'Content-Type': mime });
        return res.end(content);
      }

      res.writeHead(404);
      res.end('Not Found');
    } catch (e) {
      res.writeHead(500);
      res.end(String(e));
    }
  });

  await new Promise(r => server.listen(PORT, r));

  console.log('🌐 Launching headless Chrome for 2x Retina pristine capture...');
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
    width: 1600,
    height: 1000,
    deviceScaleFactor: 2,
  });

  // 1. Capture Website UI Features
  console.log('📸 Capturing Website UI Feature Sections...');

  // A. AI Agent Prompt Hub
  console.log('  -> Capturing markdy-ai-agent-workflow.webp from #ai-gen...');
  await page.goto(`http://localhost:${PORT}/#ai-gen`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    // Hide navigation bar and footer for clean card screenshot
    const nav = document.querySelector('nav');
    if (nav) nav.style.display = 'none';
  });
  await new Promise(r => setTimeout(r, 600));
  const aiGenEl = await page.$('#ai-gen') || await page.$('.ai-prompt-section') || await page.$('section:has(#prompt-title)') || page;
  await aiGenEl.screenshot({
    path: join(RAW_OUTPUT_DIR, 'markdy-ai-agent-workflow.webp'),
    type: 'webp',
    quality: 95,
  });
  console.log('  ✅ Saved clean markdy-ai-agent-workflow.webp');

  // B. Split Code & Visual Playground Studio
  console.log('  -> Capturing markdy-split-editor.webp & markdy-studio-hero.webp...');
  await page.goto(`http://localhost:${PORT}/playground/`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    const nav = document.querySelector('nav');
    if (nav) nav.style.display = 'none';
    const header = document.querySelector('.playground-header');
    if (header) header.style.display = 'none';
  });
  await new Promise(r => setTimeout(r, 800));
  const studioEl = await page.$('.playground-main') || await page.$('.playground-body') || await page.$('#app') || page;
  await studioEl.screenshot({
    path: join(RAW_OUTPUT_DIR, 'markdy-split-editor.webp'),
    type: 'webp',
    quality: 95,
  });
  await studioEl.screenshot({
    path: join(RAW_OUTPUT_DIR, 'markdy-studio-hero.webp'),
    type: 'webp',
    quality: 95,
  });
  console.log('  ✅ Saved clean markdy-split-editor.webp & markdy-studio-hero.webp');

  // C. Mermaid vs Markdy Comparison
  console.log('  -> Capturing markdy-vs-mermaid-comparison.webp...');
  await page.goto(`http://localhost:${PORT}/#comparison`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));
  const compEl = await page.$('#comparison') || await page.$('.comparison-section') || page;
  await compEl.screenshot({
    path: join(RAW_OUTPUT_DIR, 'markdy-vs-mermaid-comparison.webp'),
    type: 'webp',
    quality: 95,
  });
  console.log('  ✅ Saved clean markdy-vs-mermaid-comparison.webp');

  // D. Themes Showcase
  console.log('  -> Capturing markdy-themes-showcase.webp...');
  await page.goto(`http://localhost:${PORT}/#themes`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));
  const themesEl = await page.$('#themes') || await page.$('.themes-section') || page;
  await themesEl.screenshot({
    path: join(RAW_OUTPUT_DIR, 'markdy-themes-showcase.webp'),
    type: 'webp',
    quality: 95,
  });
  console.log('  ✅ Saved clean markdy-themes-showcase.webp');

  // E. Universal Ingestion
  console.log('  -> Capturing markdy-universal-ingestion.webp...');
  await page.goto(`http://localhost:${PORT}/#ingestion`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));
  const ingestEl = await page.$('#ingestion') || await page.$('.ingestion-section') || page;
  await ingestEl.screenshot({
    path: join(RAW_OUTPUT_DIR, 'markdy-universal-ingestion.webp'),
    type: 'webp',
    quality: 95,
  });
  console.log('  ✅ Saved clean markdy-universal-ingestion.webp');

  // F. Framework Integrations
  console.log('  -> Capturing markdy-framework-integrations.webp...');
  await page.goto(`http://localhost:${PORT}/#frameworks`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));
  const frameEl = await page.$('#frameworks') || await page.$('.frameworks-section') || page;
  await frameEl.screenshot({
    path: join(RAW_OUTPUT_DIR, 'markdy-framework-integrations.webp'),
    type: 'webp',
    quality: 95,
  });
  console.log('  ✅ Saved clean markdy-framework-integrations.webp');

  // G. Governance & Audit
  console.log('  -> Capturing markdy-governance-audit.webp...');
  await page.goto(`http://localhost:${PORT}/#governance`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));
  const govEl = await page.$('#governance') || await page.$('.governance-section') || page;
  await govEl.screenshot({
    path: join(RAW_OUTPUT_DIR, 'markdy-governance-audit.webp'),
    type: 'webp',
    quality: 95,
  });
  console.log('  ✅ Saved clean markdy-governance-audit.webp');

  // 2. Capture Pure Architecture Diagrams
  console.log('📸 Capturing 28 Pure Architecture Diagrams from @markdy/renderer-dom...');
  await page.setViewport({
    width: 1500,
    height: 820,
    deviceScaleFactor: 2,
  });
  await page.goto(`http://localhost:${PORT}/__render_diagram__`, { waitUntil: 'networkidle0' });

  for (const item of diagramFileMap) {
    const markdyPath = join(SHOWCASE_DIR, item.file);
    if (!fs.existsSync(markdyPath)) {
      console.warn(`⚠️ File not found: ${markdyPath}`);
      continue;
    }

    const code = fs.readFileSync(markdyPath, 'utf8');
    console.log(`  -> Rendering clean raw capture: ${item.file} -> ${item.output}...`);

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
    console.log(`  ✅ Saved clean raw capture: ${item.output}`);
  }

  await browser.close();
  server.close();
  console.log('🎉 All raw captures generated with zero nesting!');
}

main().catch(err => {
  console.error('Fatal capture error:', err);
  process.exit(1);
});
