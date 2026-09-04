import puppeteer from 'puppeteer-core';
import * as chromeLauncher from 'chrome-launcher';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

function resolveChromePath() {
  const customWrapper = '/home/ya/bin/google-chrome';
  if (fs.existsSync(customWrapper)) {
    return customWrapper;
  }
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }
  const defaultPaths = [
    '/home/ya/bin/google-chrome',
    '/home/ya/bin/chromium',
    '/snap/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ];
  for (const p of defaultPaths) {
    if (fs.existsSync(p)) return p;
  }
  try {
    const installations = chromeLauncher.Launcher.getInstallations();
    if (installations && installations.length > 0) {
      return installations[0];
    }
  } catch {}
  throw new Error('Chrome executable could not be found.');
}

const CHROME_PATH = resolveChromePath();
const EVIDENCE_DIR = resolve(rootDir, 'docs/images/evidence');
const MASCOT_DIR = resolve(rootDir, 'docs/images/mascot');
const CORE_DIST = resolve(rootDir, 'packages/core/dist');
const RENDERER_DIST = resolve(rootDir, 'packages/renderer-dom/dist');
const PORT = 4699;

const evidenceCards = [
  {
    file: '01-route-pathfinder-card.webp',
    sourceFile: 'examples/26-route-and-reach-share-cards.markdy',
    seekPercent: 0.45,
    title: 'Client → Database Active Route Pathfinder',
    badge1: '🔀 Active Route Pathfinder',
    badge2: '⚡ Dynamic Port Multiplexing',
    tag: 'route-pathfinder // hop-telemetry',
    theme: 'midnight',
    stickyNote: '🔀 <b>Active Route Pathfinder:</b><br/>• Path: Client ➔ Envoy ➔ Router ➔ Redis/DB<br/>• Measures exact 3-hop transit distance<br/>• Highlights mTLS protocol & dims inactive topology ⚡',
    explanation: '<b>Active Route Pathfinder:</b><br/>Isolates the live network pathway from client ingress down to persistence with real-time protocol telemetry! 🔀✨',
  },
  {
    file: '02-blast-radius-reach-card.webp',
    sourceFile: 'examples/24-blast-radius-impact-lens.markdy',
    seekPercent: 0.65,
    title: 'Blast Radius & Cascading Failure Isolation Lens',
    badge1: '💥 Blast Radius Impact Lens',
    badge2: '🛡️ Outage Cascade Isolation',
    tag: 'blast-radius // impact-lens',
    theme: 'midnight',
    stickyNote: '💥 <b>Failure Propagation:</b><br/>• Fault Origin: <code>Data Transformer</code><br/>• Cascading Impact: Buffer & Warehouse<br/>• Prevents cascading outages across services 🛡️',
    explanation: '<b>Blast Radius Lens:</b><br/>Instantly projects cascading service impact and upstream caller dependencies when an outage occurs! 💥🛡️',
  },
  {
    file: '03-zero-trust-enclave-blueprint.webp',
    sourceFile: 'examples/27-zero-trust-mesh-blueprint.markdy',
    seekPercent: 0.60,
    title: 'Zero-Trust Security Mesh & AWS Nitro Enclave',
    badge1: '🛡️ Zero-Trust Security Mesh',
    badge2: '🔒 AWS Nitro Enclave + Vault',
    tag: 'zero-trust // nitro-enclave',
    theme: 'blueprint',
    stickyNote: '🛡️ <b>Defense in Depth:</b><br/>• Perimeter WAF ➔ Keycloak OIDC JWT token<br/>• Open Policy Agent (OPA) RBAC checks<br/>• AWS Nitro Enclave + HashiCorp Vault secrets 🔒',
    explanation: '<b>Zero-Trust Security Mesh:</b><br/>End-to-end cryptographic identity attestation with isolated hardware enclave execution and immutable audit trails! 🛡️💎',
  },
  {
    file: '04-event-driven-cqrs-lakehouse.webp',
    sourceFile: 'examples/28-event-driven-cqrs-lakehouse.markdy',
    seekPercent: 0.60,
    title: 'Event-Driven CQRS & Medallion Lakehouse Pipeline',
    badge1: '📊 Medallion Lakehouse Tiers',
    badge2: '📬 Kafka & Spark Streaming',
    tag: 'cqrs-eda // medallion-lakehouse',
    theme: 'midnight',
    stickyNote: '📊 <b>Streaming Lakehouse:</b><br/>• Command API ➔ Kafka event streaming bus<br/>• Spark cleans Bronze logs into Delta Silver<br/>• Snowflake Gold tier powers real-time BI 🏆',
    explanation: '<b>Event-Driven CQRS Lakehouse:</b><br/>Decouples high-throughput command writes from dimensional analytics with automated Medallion data pipelines! 📊✨',
  },
  {
    file: '05-agentic-react-ai-orchestrator.webp',
    sourceFile: 'examples/29-agentic-react-tool-orchestrator.markdy',
    seekPercent: 0.60,
    title: 'Autonomous ReAct AI Agent Orchestration Loop',
    badge1: '🤖 Autonomous ReAct Agent',
    badge2: '🛠️ Model Context Protocol (MCP)',
    tag: 'react-agent // mcp-tools',
    theme: 'nebula',
    stickyNote: '🤖 <b>Agentic Reasoning Loop:</b><br/>• Developer prompt ➔ ReAct thought formulation<br/>• Qdrant Vector RAG context retrieval<br/>• Model inference ➔ MCP Tool execution (K8s) 🚀',
    explanation: '<b>Agentic AI Orchestrator:</b><br/>Visualize the complete ReAct thought-plan-action loop with vector context memory and Model Context Protocol (MCP) execution! 🤖🧠',
  },
  {
    file: '06-active-active-failover-consensus.webp',
    sourceFile: 'examples/30-active-active-failover-consensus.markdy',
    seekPercent: 0.60,
    title: 'Active-Active Multi-Region Resilient Quorum',
    badge1: '🌐 Active-Active Multi-Region',
    badge2: '⚖️ Raft Consensus Witness',
    tag: 'active-active // raft-consensus',
    theme: 'paper',
    stickyNote: '🌐 <b>Multi-Region Resilience:</b><br/>• Route53 Latency GeoDNS ➔ US-East & EU-West<br/>• Aurora Multi-Master bi-directional sync<br/>• Raft witness auto-triggers instant failover ⚖️',
    explanation: '<b>Active-Active Multi-Region Quorum:</b><br/>Zero single-point-of-failure multi-region architecture with sub-second failover consensus and live replication! 🌐🛡️',
  },
];

function generateCardHtml(cardIndex) {
  const meta = evidenceCards[cardIndex];
  const markdyPath = resolve(rootDir, meta.sourceFile);
  const code = fs.readFileSync(markdyPath, 'utf8');

  const isDarkTheme = meta.theme === 'midnight' || meta.theme === 'blueprint' || meta.theme === 'nebula' || meta.theme === 'graphite' || meta.theme === 'terminal';
  const glowColor1 = meta.theme === 'nebula' ? '#ec4899' : (meta.theme === 'blueprint' ? '#3b82f6' : '#10b981');
  const glowColor2 = meta.theme === 'nebula' ? '#8b5cf6' : (meta.theme === 'blueprint' ? '#06b6d4' : '#38bdf8');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${meta.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 1600px; height: 900px; overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, ui-sans-serif, sans-serif, "Noto Color Emoji";
      background: radial-gradient(ellipse at 50% 25%, #ffffff 0%, #faf8f5 55%, #f2eee6 100%);
      color: #0f172a; position: relative; -webkit-font-smoothing: antialiased; padding: 20px 24px;
    }
    .ambient-glow-1 {
      position: absolute; width: 540px; height: 540px; border-radius: 50%;
      background: ${glowColor1}; filter: blur(140px); opacity: 0.14; top: -80px; right: 140px; pointer-events: none;
    }
    .ambient-glow-2 {
      position: absolute; width: 540px; height: 540px; border-radius: 50%;
      background: ${glowColor2}; filter: blur(140px); opacity: 0.12; bottom: -100px; left: 140px; pointer-events: none;
    }
    .bg-grid {
      position: absolute; inset: 0;
      background-image: radial-gradient(rgba(0,0,0,0.035) 1.5px, transparent 1.5px);
      background-size: 24px 24px; pointer-events: none;
    }
    .header-bar {
      display: flex; justify-content: space-between; align-items: center;
      height: 42px; margin-bottom: 12px; position: relative; z-index: 10;
    }
    .brand-group { display: flex; align-items: center; gap: 10px; }
    .brand-icon { width: 32px; height: 32px; filter: drop-shadow(0 3px 6px rgba(16,185,129,0.3)); }
    .brand-name { font-size: 20px; font-weight: 800; letter-spacing: -0.02em; color: #064e3b; }
    .brand-pill {
      font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
      background: rgba(16,185,129,0.12); color: #047857; padding: 3px 10px; border-radius: 999px;
      border: 1px solid rgba(16,185,129,0.2);
    }
    .header-badges { display: flex; align-items: center; gap: 10px; }
    .badge-pill {
      font-size: 12px; font-weight: 700; padding: 5px 12px; border-radius: 8px;
      background: #ffffff; border: 1px solid rgba(0,0,0,0.08); box-shadow: 0 2px 6px rgba(0,0,0,0.04);
      display: flex; align-items: center; gap: 6px;
    }
    .badge-pill.primary { color: #047857; background: #ecfdf5; border-color: rgba(16,185,129,0.25); }
    .badge-pill.secondary { color: #0284c7; }
    .main-stage { position: relative; width: 100%; height: 804px; z-index: 10; }
    .window-card {
      width: 100%; height: 100%; background: #ffffff; border-radius: 16px;
      box-shadow: 0 20px 45px -10px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.07);
      display: flex; flex-direction: column; overflow: hidden; position: relative;
    }
    .window-titlebar {
      height: 38px; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
      display: flex; align-items: center; padding: 0 14px; gap: 7px;
    }
    .traffic-dot { width: 10px; height: 10px; border-radius: 50%; }
    .dot-red { background: #ff5f56; }
    .dot-yellow { background: #ffbd2e; }
    .dot-green { background: #27c93f; }
    .window-tag {
      margin-left: 10px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px; font-weight: 700; color: #475569; background: #e2e8f0;
      padding: 2px 10px; border-radius: 4px;
    }
    .window-status {
      margin-left: auto; font-size: 11px; font-weight: 700; color: #059669;
      background: #d1fae5; padding: 2px 10px; border-radius: 999px;
      display: flex; align-items: center; gap: 5px;
    }
    .diagram-viewport {
      flex: 1; position: relative; background: ${isDarkTheme ? '#0b1120' : '#ffffff'};
      overflow: hidden; display: flex; align-items: center; justify-content: center;
      padding: 24px 28px 28px 28px;
    }
    #stage { width: 100%; height: 100%; position: relative; }
    .markdy-diagram { width: 100% !important; height: 100% !important; }
    .sticky-note-container {
      position: absolute; bottom: 24px; left: 24px; z-index: 40; transform: rotate(-1deg);
    }
    .sticky-pin-icon {
      position: absolute; top: -14px; left: 14px; width: 34px; height: 34px;
      z-index: 45; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.25)); transform: rotate(-8deg);
    }
    .sticky-note-card {
      background: #fef08a; color: #713f12; padding: 14px 18px 14px 20px; border-radius: 12px;
      box-shadow: 0 10px 24px rgba(0,0,0,0.12), 0 2px 5px rgba(0,0,0,0.05);
      font-size: 13px; line-height: 1.45; max-width: 390px; border: 1px solid rgba(234,179,8,0.3);
    }
    .sticky-note-card b { color: #854d0e; }
    .mascot-wrapper {
      position: absolute; right: 24px; bottom: 16px; z-index: 40;
      display: flex; flex-direction: column; align-items: flex-end; pointer-events: none;
    }
    .mascot-bubble {
      background: #ffffff; border-radius: 14px; padding: 10px 14px;
      box-shadow: 0 10px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06);
      font-size: 12.5px; line-height: 1.4; color: #1e293b; max-width: 320px;
      margin-bottom: 2px; margin-right: 20px; position: relative; z-index: 45; transform: rotate(1deg);
    }
    .mascot-bubble::after {
      content: ""; position: absolute; bottom: -9px; right: 50px; width: 0; height: 0;
      border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 10px solid #ffffff;
    }
    .mascot-img {
      width: 148px; height: auto; filter: drop-shadow(0 15px 25px rgba(0,0,0,0.15)); margin-right: 12px;
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
</head>
<body>
  <div class="ambient-glow-1"></div>
  <div class="ambient-glow-2"></div>
  <div class="bg-grid"></div>

  <div class="header-bar">
    <div class="brand-group">
      <img src="/images/3d-icon.webp" class="brand-icon" alt="Markdy" />
      <span class="brand-name">Markdy</span>
      <span class="brand-pill">Architecture Intelligence</span>
    </div>
    <div class="header-badges">
      <div class="badge-pill primary">
        <span>${meta.badge1}</span>
      </div>
      <div class="badge-pill secondary">
        <span>${meta.badge2}</span>
      </div>
    </div>
  </div>

  <div class="main-stage">
    <div class="window-card">
      <div class="window-titlebar">
        <div class="traffic-dot dot-red"></div>
        <div class="traffic-dot dot-yellow"></div>
        <div class="traffic-dot dot-green"></div>
        <span class="window-tag">${meta.tag}</span>
        <div class="window-status">
          <span style="font-size: 8px;">●</span> Live Engine Rendered
        </div>
      </div>
      <div class="diagram-viewport">
        <div id="stage"></div>
      </div>
    </div>

    <div class="sticky-note-container">
      <svg class="sticky-pin-icon" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="18" cy="18" r="14" fill="#ef4444" stroke="#ffffff" stroke-width="2.5"/>
        <circle cx="15" cy="15" r="4" fill="#fca5a5"/>
        <path d="M18 28L18 34" stroke="#991b1b" stroke-width="2.5" stroke-linecap="round"/>
      </svg>
      <div class="sticky-note-card">
        ${meta.stickyNote}
      </div>
    </div>

    <div class="mascot-wrapper">
      <div class="mascot-bubble">
        ${meta.explanation}
      </div>
      <img src="/images/markdy.webp" class="mascot-img" alt="Markdy Mascot" />
    </div>
  </div>

  <script type="module">
    import { createDiagram } from "@markdy/renderer-dom";
    const markdyCode = ${JSON.stringify(code)};
    const stage = document.getElementById("stage");
    const d = createDiagram({
      container: stage,
      code: markdyCode,
      autoplay: false,
      sceneBoundaryProgress: false,
      progressBar: false,
    });
    if (d && typeof d.duration === "function" && typeof d.seek === "function") {
      d.seek(d.duration() * ${meta.seekPercent});
    }
    window.__markdyDone = true;
  </script>
</body>
</html>`;
}

async function main() {
  console.log(`🚀 Starting direct showcase render server on port ${PORT}...`);
  const server = createServer(async (req, res) => {
    try {
      const cleanUrl = req.url.split('?')[0];
      if (cleanUrl.startsWith('/card/')) {
        const idx = parseInt(cleanUrl.replace('/card/', ''), 10);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(generateCardHtml(idx));
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
      } else if (cleanUrl.startsWith('/images/')) {
        const filename = cleanUrl.replace('/images/', '');
        const imgPath = join(MASCOT_DIR, filename);
        res.writeHead(200, { 'Content-Type': 'image/webp' });
        res.end(await readFile(imgPath));
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    } catch (err) {
      res.writeHead(500);
      res.end(String(err));
    }
  });

  await new Promise(r => server.listen(PORT, r));
  await mkdir(EVIDENCE_DIR, { recursive: true });

  console.log('🌐 Launching Headless Chromium via:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 2 });

  for (let i = 0; i < evidenceCards.length; i++) {
    const card = evidenceCards[i];
    console.log(`🎨 Rendering Pristine Showcase Card [${i + 1}/${evidenceCards.length}]: ${card.title}...`);

    await page.goto(`http://localhost:${PORT}/card/${i}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__markdyDone === true, { timeout: 8000 });
    await new Promise(r => setTimeout(r, 250));

    const outPath = join(EVIDENCE_DIR, card.file);
    await page.screenshot({
      path: outPath,
      type: 'webp',
      quality: 95,
    });

    const stats = fs.statSync(outPath);
    console.log(`✅ Saved High-DPI Evidence Card: ${card.file} (${Math.round(stats.size / 1024)} KB)`);
  }

  await browser.close();
  server.close();
  console.log('🎉 All 6 Authentic Compiler-Rendered Visual Evidence Cards generated successfully in docs/images/evidence/!');
}

main().catch(err => {
  console.error('Fatal error generating PR evidence:', err);
  process.exit(1);
});
