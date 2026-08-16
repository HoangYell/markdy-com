import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../..');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MASCOT_PATH = path.join(rootDir, 'docs/images/mascot/markdy.png');
const ICON_3D_PATH = path.join(rootDir, 'docs/images/mascot/3d-icon.png');

const mascotBase64 = `data:image/png;base64,${fs.readFileSync(MASCOT_PATH).toString('base64')}`;
const icon3dBase64 = `data:image/png;base64,${fs.readFileSync(ICON_3D_PATH).toString('base64')}`;

const OUTPUT_DOCS_DIR = path.join(rootDir, 'docs/images');
const OUTPUT_PUBLIC_DIR = path.join(rootDir, 'website/public/images');
const RAW_DIR = path.join(rootDir, 'tmp/raw-captures');

function generateHTML(meta) {
  const rawFilePath = path.join(RAW_DIR, meta.file);
  if (!fs.existsSync(rawFilePath)) {
    console.error(`Raw file not found: ${rawFilePath}`);
    return '';
  }
  const diagramBase64 = `data:image/webp;base64,${fs.readFileSync(rawFilePath).toString('base64')}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${meta.title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      width: 1600px;
      height: 900px;
      overflow: hidden;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background: radial-gradient(ellipse at 50% 25%, #ffffff 0%, #faf8f5 55%, #f2eee6 100%);
      color: #0f172a;
      position: relative;
      -webkit-font-smoothing: antialiased;
      padding: 20px 24px;
    }

    .ambient-glow-1 {
      position: absolute;
      width: 500px;
      height: 500px;
      border-radius: 50%;
      background: #10b981;
      filter: blur(140px);
      opacity: 0.12;
      top: -80px;
      right: 150px;
      pointer-events: none;
    }
    .ambient-glow-2 {
      position: absolute;
      width: 500px;
      height: 500px;
      border-radius: 50%;
      background: #38bdf8;
      filter: blur(140px);
      opacity: 0.1;
      bottom: -100px;
      left: 150px;
      pointer-events: none;
    }

    .bg-grid {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(rgba(0,0,0,0.035) 1.5px, transparent 1.5px);
      background-size: 24px 24px;
      pointer-events: none;
    }

    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      height: 42px;
      margin-bottom: 12px;
      position: relative;
      z-index: 10;
    }

    .brand-group {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-icon {
      width: 32px;
      height: 32px;
      filter: drop-shadow(0 3px 6px rgba(16,185,129,0.3));
    }
    .brand-name {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #064e3b;
    }
    .brand-pill {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      background: rgba(16,185,129,0.12);
      color: #047857;
      padding: 3px 10px;
      border-radius: 999px;
      border: 1px solid rgba(16,185,129,0.2);
    }

    .header-badges {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .badge-pill {
      font-size: 12px;
      font-weight: 700;
      padding: 5px 12px;
      border-radius: 8px;
      background: #ffffff;
      border: 1px solid rgba(0,0,0,0.08);
      box-shadow: 0 2px 6px rgba(0,0,0,0.04);
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .badge-pill.primary {
      color: #047857;
      background: #ecfdf5;
      border-color: rgba(16,185,129,0.25);
    }
    .badge-pill.secondary {
      color: #0284c7;
    }

    .main-stage {
      position: relative;
      width: 100%;
      height: 804px;
      z-index: 10;
    }

    .window-card {
      width: 100%;
      height: 100%;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 20px 45px -10px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.07);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      position: relative;
    }

    .window-titlebar {
      height: 38px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      padding: 0 14px;
      gap: 7px;
    }
    .traffic-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .dot-red { background: #ff5f56; }
    .dot-yellow { background: #ffbd2e; }
    .dot-green { background: #27c93f; }

    .window-tag {
      margin-left: 10px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 700;
      color: #475569;
      background: #e2e8f0;
      padding: 2px 10px;
      border-radius: 4px;
    }

    .window-status {
      margin-left: auto;
      font-size: 11px;
      font-weight: 700;
      color: #059669;
      background: #d1fae5;
      padding: 2px 10px;
      border-radius: 999px;
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .diagram-viewport {
      flex: 1;
      position: relative;
      background: #ffffff;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 14px 16px 16px 16px;
    }

    .diagram-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: center;
    }

    .sticky-note-container {
      position: absolute;
      bottom: 20px;
      left: 20px;
      z-index: 25;
      transform: rotate(-1.5deg);
    }

    .sticky-pin-icon {
      position: absolute;
      top: -16px;
      left: 16px;
      width: 38px;
      height: 38px;
      z-index: 30;
      filter: drop-shadow(0 6px 10px rgba(0,0,0,0.25));
      transform: rotate(-8deg);
    }

    .sticky-note-card {
      background: #fef08a;
      color: #713f12;
      padding: 16px 20px 16px 22px;
      border-radius: 14px;
      box-shadow: 0 12px 28px rgba(0,0,0,0.13), 0 2px 6px rgba(0,0,0,0.06);
      font-size: 14px;
      line-height: 1.5;
      max-width: 440px;
      border: 1px solid rgba(234,179,8,0.3);
      position: relative;
    }

    .sticky-note-card b {
      color: #854d0e;
    }

    .mascot-wrapper {
      position: absolute;
      right: -10px;
      bottom: -15px;
      z-index: 30;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      pointer-events: none;
    }

    .mascot-bubble {
      background: #ffffff;
      border-radius: 16px;
      padding: 12px 16px;
      box-shadow: 0 12px 30px rgba(0,0,0,0.13), 0 0 0 1px rgba(0,0,0,0.06);
      font-size: 13px;
      line-height: 1.45;
      color: #1e293b;
      max-width: 340px;
      margin-bottom: -15px;
      margin-right: 30px;
      position: relative;
      z-index: 35;
      transform: rotate(1deg);
    }
    .mascot-bubble::after {
      content: '';
      position: absolute;
      bottom: -10px;
      right: 60px;
      width: 0;
      height: 0;
      border-left: 10px solid transparent;
      border-right: 10px solid transparent;
      border-top: 10px solid #ffffff;
    }
    .bubble-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 800;
      color: #047857;
      background: #d1fae5;
      padding: 1px 6px;
      border-radius: 999px;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .bubble-content b {
      color: #0f172a;
    }
    .bubble-content code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11.5px;
      background: #f1f5f9;
      padding: 1px 4px;
      border-radius: 3px;
    }

    .mascot-img {
      width: 290px;
      height: auto;
      filter: drop-shadow(0 15px 25px rgba(0,0,0,0.18));
      z-index: 32;
    }

    .wand-sparkles {
      position: absolute;
      right: 230px;
      bottom: 210px;
      pointer-events: none;
      z-index: 34;
    }
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="ambient-glow-1"></div>
  <div class="ambient-glow-2"></div>

  <div class="header-bar">
    <div class="brand-group">
      <img src="${icon3dBase64}" class="brand-icon" alt="Markdy" />
      <span class="brand-name">Markdy<span style="color:#10b981;">.com</span></span>
      <span class="brand-pill">Diagram as Code</span>
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
        <span class="traffic-dot dot-red"></span>
        <span class="traffic-dot dot-yellow"></span>
        <span class="traffic-dot dot-green"></span>
        <span class="window-tag">${meta.sceneTag}</span>
        <span class="window-status">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          Live Diagram
        </span>
      </div>
      <div class="diagram-viewport">
        <img src="${diagramBase64}" class="diagram-img" alt="${meta.title}" />
      </div>
    </div>

    <div class="sticky-note-container">
      <img src="${icon3dBase64}" class="sticky-pin-icon" alt="3D Pin" />
      <div class="sticky-note-card">
        ${meta.stickyNote}
      </div>
    </div>

    <div class="mascot-wrapper">
      <div class="mascot-bubble">
        <div class="bubble-badge">✨ Markdy Explains</div>
        <div class="bubble-content">
          ${meta.explanation}
        </div>
      </div>
      <img src="${mascotBase64}" class="mascot-img" alt="Markdy Mascot" />
    </div>

    <svg class="wand-sparkles" width="60" height="60" viewBox="0 0 60 60" fill="none">
      <circle cx="30" cy="30" r="14" fill="#fef08a" opacity="0.4" filter="blur(4px)"/>
      <circle cx="30" cy="30" r="4" fill="#ffffff"/>
      <path d="M 20 15 q 3 3 3 7 q 0 -4 3 -7 q -3 0 -3 -4 q 0 4 -3 4 Z" fill="#f59e0b" />
      <path d="M 42 22 q 2 2 2 5 q 0 -3 2 -5 q -2 0 -2 -3 q 0 3 -2 3 Z" fill="#10b981" />
    </svg>
  </div>
</body>
</html>
`;
}

export async function decorateScenes(metadataList) {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: 1600,
    height: 900,
    deviceScaleFactor: 2,
  });

  for (const meta of metadataList) {
    const html = generateHTML(meta);
    if (!html) continue;

    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 400));

    const outWebpDocs = path.join(OUTPUT_DOCS_DIR, meta.file);
    const outWebpPublic = path.join(OUTPUT_PUBLIC_DIR, meta.file);

    await page.screenshot({ path: outWebpDocs, type: 'webp', quality: 95 });
    fs.copyFileSync(outWebpDocs, outWebpPublic);
    console.log(`✅ Saved: ${meta.file}`);
  }

  await browser.close();
}
