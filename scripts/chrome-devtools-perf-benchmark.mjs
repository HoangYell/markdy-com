#!/usr/bin/env node

/**
 * Markdy Autonomous Chrome DevTools Performance & Frame-Budget Benchmark
 * Measures compilation, layout computation, DOM mount latency, and memory footprint.
 */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

const PORT = 4499;

function resolveChromePath() {
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const defaultPaths = [
    '/home/ya/.local/bin/google-chrome',
    '/home/ya/bin/google-chrome',
    '/home/ya/.local/share/chrome-standalone/opt/google/chrome/chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium'
  ];
  for (const p of defaultPaths) {
    if (fs.existsSync(p)) return p;
  }
  return '/home/ya/.local/bin/google-chrome';
}

const CHROME_PATH = resolveChromePath();
const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || resolve(rootDir, 'tmp/perf-artifacts');
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

const CORE_DIST = resolve(rootDir, 'packages/core/dist');
const RENDERER_DIST = resolve(rootDir, 'packages/renderer-dom/dist');

// Performance Budgets (Sub-frame & High-Throughput Standards)
const BUDGETS = {
  maxCompileMs: 20,       // AST compilation budget (sub-frame)
  maxMountMs: 50,         // DOM mount budget (complex multi-rank layouts)
  maxTotalRenderMs: 60,   // Full pipeline budget
  maxHeapMB: 25,          // JS Heap used budget (< 25MB)
  maxDomNodes: 900        // Cumulative DOM node count
};

const testCases = [
  {
    name: '01_compact_auto_sized',
    description: 'Compact 2-node flow without width/height',
    code: `
scene "Payment Authorization" theme=tokyo-night
client Client
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
    body { background: #090d16; padding: 32px; display: flex; justify-content: center; }
    .diagram-container { width: 1200px; height: 680px; position: relative; }
    .stage { width: 100%; height: 100%; position: relative; }
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

    window.benchmarkDiagram = (containerId, code) => {
      const el = document.getElementById(containerId);
      el.innerHTML = '';

      const t0 = performance.now();
      const { ast, plan } = parseAndCompile(code);
      const t1 = performance.now();

      const diagram = createDiagram({ container: el, code, autoplay: false });
      const t2 = performance.now();

      return {
        compileMs: t1 - t0,
        mountMs: t2 - t1,
        totalMs: t2 - t0,
        nodeCount: plan.nodes.length,
        metaWidth: plan.meta.width,
        metaHeight: plan.meta.height
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

async function runPerfBenchmark() {
  console.log('🚀 Starting Markdy Performance Benchmark Server...');
  const server = createServer(async (req, res) => {
    try {
      const cleanUrl = req.url.split('?')[0];
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
        res.end();
      }
    } catch (err) {
      res.writeHead(500);
      res.end(err.message);
    }
  });

  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`📡 Benchmark server listening on http://localhost:${PORT}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--window-size=1600,1000'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 });

  const client = await page.target().createCDPSession();
  await client.send('Performance.enable');

  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle0' });

  // JIT warm-up pass to eliminate initial V8 module cold-start latency
  console.log('🔥 Warming up V8 JIT compiler...');
  await page.evaluate(() => {
    window.benchmarkDiagram('stage', 'scene "Warmup" service A service B beat main: A -> B');
  });

  console.log(`\n⚡ Evaluating Performance Budgets:`);
  console.log(`   Budgets: Compile <= ${BUDGETS.maxCompileMs}ms | Mount <= ${BUDGETS.maxMountMs}ms | Total <= ${BUDGETS.maxTotalRenderMs}ms | Heap <= ${BUDGETS.maxHeapMB}MB\n`);

  const results = [];
  const budgetViolations = [];

  for (const tc of testCases) {
    // Run benchmark in page
    const clientMetricsBefore = await client.send('Performance.getMetrics');
    const bench = await page.evaluate((code) => {
      return window.benchmarkDiagram('stage', code);
    }, tc.code);

    const clientMetricsAfter = await client.send('Performance.getMetrics');
    const metricMap = {};
    for (const m of clientMetricsAfter.metrics) {
      metricMap[m.name] = m.value;
    }

    const heapUsedMB = (metricMap.JSHeapUsedSize || 0) / (1024 * 1024);
    const domNodes = metricMap.Nodes || 0;
    const layoutDurationMs = (metricMap.LayoutDuration || 0) * 1000;

    console.log(`📊 ${tc.name} (${tc.description})`);
    console.log(`   ⚡ Compile:   ${bench.compileMs.toFixed(2)} ms (budget: <= ${BUDGETS.maxCompileMs} ms)`);
    console.log(`   ⚡ Mount:     ${bench.mountMs.toFixed(2)} ms (budget: <= ${BUDGETS.maxMountMs} ms)`);
    console.log(`   ⚡ Total:     ${bench.totalMs.toFixed(2)} ms (budget: <= ${BUDGETS.maxTotalRenderMs} ms)`);
    console.log(`   💾 JS Heap:   ${heapUsedMB.toFixed(2)} MB (budget: <= ${BUDGETS.maxHeapMB} MB)`);
    console.log(`   🌳 DOM Nodes: ${domNodes} nodes (budget: <= ${BUDGETS.maxDomNodes})`);

    // Budget checks
    if (bench.compileMs > BUDGETS.maxCompileMs) {
      budgetViolations.push({ test: tc.name, metric: 'compileMs', actual: bench.compileMs, budget: BUDGETS.maxCompileMs });
    }
    if (bench.mountMs > BUDGETS.maxMountMs) {
      budgetViolations.push({ test: tc.name, metric: 'mountMs', actual: bench.mountMs, budget: BUDGETS.maxMountMs });
    }
    if (bench.totalMs > BUDGETS.maxTotalRenderMs) {
      budgetViolations.push({ test: tc.name, metric: 'totalMs', actual: bench.totalMs, budget: BUDGETS.maxTotalRenderMs });
    }
    if (heapUsedMB > BUDGETS.maxHeapMB) {
      budgetViolations.push({ test: tc.name, metric: 'heapUsedMB', actual: heapUsedMB, budget: BUDGETS.maxHeapMB });
    }
    if (domNodes > BUDGETS.maxDomNodes) {
      budgetViolations.push({ test: tc.name, metric: 'domNodes', actual: domNodes, budget: BUDGETS.maxDomNodes });
    }

    results.push({
      test: tc.name,
      ...bench,
      heapUsedMB,
      domNodes,
      layoutDurationMs
    });
    console.log('');
  }

  await browser.close();
  server.close();

  const reportFile = join(ARTIFACTS_DIR, 'perf-benchmark-report.json');
  fs.writeFileSync(reportFile, JSON.stringify({ timestamp: new Date().toISOString(), budgets: BUDGETS, results }, null, 2));
  console.log(`📁 Benchmark report written to: ${reportFile}`);

  if (budgetViolations.length > 0) {
    console.error(`\n❌ [PERFORMANCE BUDGET GATE FAILED] ${budgetViolations.length} budget violation(s) detected!`);
    budgetViolations.forEach(v => console.error(`   - ${v.test}: ${v.metric} = ${v.actual} exceeds budget ${v.budget}`));
    process.exit(1);
  }

  console.log(`\n🎉 ALL PERFORMANCE BUDGETS PASSED! Markdy renders in sub-frame speed (60fps ready)! 🚀`);
}

runPerfBenchmark().catch((err) => {
  console.error('Fatal error during performance benchmark:', err);
  process.exit(1);
});
