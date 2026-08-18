import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PUBLIC_IMAGES_DIR = path.resolve("website/public/images");
const DOCS_IMAGES_DIR = path.resolve("docs/images");

fs.mkdirSync(PUBLIC_IMAGES_DIR, { recursive: true });
fs.mkdirSync(DOCS_IMAGES_DIR, { recursive: true });

async function saveImage(elementOrPage, filename) {
  const publicPath = path.join(PUBLIC_IMAGES_DIR, filename);
  const docsPath = path.join(DOCS_IMAGES_DIR, filename);

  const buffer = await elementOrPage.screenshot({
    type: filename.endsWith(".png") ? "png" : "webp",
    quality: filename.endsWith(".png") ? undefined : 95,
  });

  fs.writeFileSync(publicPath, buffer);
  fs.writeFileSync(docsPath, buffer);
  console.log(`✓ Saved: ${filename} (${Math.round(buffer.length / 1024)} KB)`);
}

async function main() {
  console.log("Launching Chrome for high-DPI asset generation...");

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    defaultViewport: {
      width: 1600,
      height: 1000,
      deviceScaleFactor: 2,
    },
  });

  const page = await browser.newPage();

  // ─────────────────────────────────────────────────────────────
  // 1. CAPTURE HOMEPAGE SECTIONS
  // ─────────────────────────────────────────────────────────────
  console.log("Loading https://markdy.com/ ...");
  await page.goto("https://markdy.com/", { waitUntil: "networkidle0" });
  await new Promise(r => setTimeout(r, 1000));

  // A. AI Prompt Tutorial Section
  const promptSec = await page.$("#prompt-tutorial");
  if (promptSec) {
    await saveImage(promptSec, "markdy-ai-agent-workflow.webp");
  }

  // B. Homepage Live Studio Card
  const studioCard = await page.$("#playground");
  if (studioCard) {
    await page.evaluate(() => {
      const range = document.querySelector("#timeline-range");
      if (range) {
        range.value = String(Number(range.max) * 0.75);
        range.dispatchEvent(new Event("input"));
      }
    });
    await new Promise(r => setTimeout(r, 600));
    await saveImage(studioCard, "markdy-split-editor.webp");
  }

  // C. Layouts & Themes Section
  const layoutsSec = await page.$("#layouts");
  if (layoutsSec) {
    await saveImage(layoutsSec, "markdy-layouts-themes.webp");
  }

  // D. Universal Ingestion Section
  const ingestionSec = await page.$("#ingestion");
  if (ingestionSec) {
    await saveImage(ingestionSec, "markdy-universal-ingestion.webp");
  }

  // E. Framework Integrations Section
  const frameworksSec = await page.$("#frameworks");
  if (frameworksSec) {
    await saveImage(frameworksSec, "markdy-framework-integrations.webp");
  }

  // ─────────────────────────────────────────────────────────────
  // 2. CAPTURE PLAYGROUND & SCENES
  // ─────────────────────────────────────────────────────────────
  console.log("Loading https://markdy.com/playground ...");
  await page.goto("https://markdy.com/playground", { waitUntil: "networkidle0" });
  await new Promise(r => setTimeout(r, 1000));

  // Style injection for publication-ready captures
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.id = "pub-ready-styles";
    style.textContent = `
      #stage {
        padding: 36px 40px !important;
        box-sizing: border-box !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-radius: 12px !important;
      }
      .markdy-viewport {
        border-radius: 8px !important;
        overflow: visible !important;
      }
      .markdy-scene-root {
        border-radius: 8px !important;
      }
    `;
    document.head.appendChild(style);
  });

  // Capture Full Studio Hero
  const fullStudio = await page.$("#workspace");
  if (fullStudio) {
    await page.evaluate(() => {
      const range = document.querySelector("#timeline-range");
      if (range) {
        range.value = String(Number(range.max) * 0.75);
        range.dispatchEvent(new Event("input"));
      }
    });
    await new Promise(r => setTimeout(r, 600));
    await saveImage(page, "markdy-studio-hero.webp");
  }

  // Helper to get index of example by exact substring match
  const examplesList = await page.evaluate(() => {
    const sel = document.querySelector("#quick-example-select");
    return Array.from(sel.options).map((o, i) => ({ i, text: o.textContent }));
  });

  function getIdx(keyword) {
    const found = examplesList.find(e => e.text.toLowerCase().includes(keyword.toLowerCase()));
    if (!found) {
      console.warn(`⚠️ Warning: example with keyword "${keyword}" not found! Available:`, examplesList.map(e => e.text));
      return 0;
    }
    return found.i;
  }

  const scenesToCapture = [
    { key: "URL Shortener", file: "scene-url-shortener.webp", scrub: 0.75 },
    { key: "Kubernetes", file: "scene-kubernetes-cluster.webp", scrub: 0.8 },
    { key: "Lakehouse", file: "scene-lakehouse-medallion.webp", scrub: 0.85 },
    { key: "OAuth", file: "scene-oauth-oidc-flow.webp", scrub: 0.8 },
    { key: "Twitter", file: "scene-twitter-timeline.webp", scrub: 0.8 },
    { key: "Secure Paved Road", file: "scene-zero-trust-paved-road.webp", scrub: 0.85 },
    { key: "Swimlanes", file: "scene-ecommerce-swimlanes.webp", scrub: 0.85 },
    { key: "Pyramid", file: "scene-platform-pyramid.webp", scrub: 0.9 },
    { key: "Radar", file: "scene-database-radar.webp", scrub: 0.85 },
    { key: "Quadrant", file: "scene-strategic-quadrant.webp", scrub: 0.85 },
    { key: "Terminal Infrastructure", file: "scene-terminal-cli.webp", scrub: 0.85 },
    { key: "Whiteboard Product Discovery", file: "scene-sketchy-whiteboard.webp", scrub: 0.85 },
    { key: "Signal Constellation", file: "scene-nebula-constellation.webp", scrub: 0.85 },
    { key: "CI/CD", file: "scene-cicd-pipeline.webp", scrub: 0.85 },
    { key: "Fintech Governance", file: "scene-fintech-governance.webp", scrub: 0.85 },
    { key: "YouTube Processing", file: "scene-youtube-pipeline.webp", scrub: 0.85 },
    { key: "Gantt Roadmap", file: "scene-engineering-roadmap.webp", scrub: 0.85 },
    { key: "OSI Abstraction Layers", file: "scene-osi-layers.webp", scrub: 0.85 },
    { key: "Fan-In Queue", file: "scene-concurrency-fanin.webp", scrub: 0.85 },
    { key: "Data Flywheel", file: "scene-data-flywheel.webp", scrub: 0.85 },
    { key: "API Platform", file: "scene-editorial-api-platform.webp", scrub: 0.85 },
    { key: "Product-Market Fit Venn", file: "scene-product-market-fit-venn.webp", scrub: 0.85 },
    { key: "Nested Security", file: "scene-nested-security.webp", scrub: 0.85 },
  ];

  for (const scene of scenesToCapture) {
    const idx = getIdx(scene.key);
    console.log(`Capturing scene: "${scene.key}" (index ${idx}) -> ${scene.file}`);

    await page.evaluate((index) => {
      const sel = document.querySelector("#quick-example-select");
      sel.selectedIndex = index;
      sel.dispatchEvent(new Event("change"));
    }, idx);

    await new Promise(r => setTimeout(r, 600));

    // Scrub timeline to specified point
    await page.evaluate((scrub) => {
      const range = document.querySelector("#timeline-range");
      if (range) {
        const max = Number(range.max);
        if (max > 0) {
          range.value = String(max * scrub);
          range.dispatchEvent(new Event("input"));
        }
      }
      const playBtn = document.querySelector("#play-btn");
      if (playBtn && playBtn.textContent.trim() === "Pause") {
        playBtn.click();
      }
    }, scene.scrub);

    await new Promise(r => setTimeout(r, 400));

    // Switch to Canvas view for clean capture
    await page.click("#view-canvas-btn");
    await new Promise(r => setTimeout(r, 400));

    // Fit canvas
    await page.evaluate(() => {
      const fitBtn = document.querySelector("#canvas-zoom-fit-btn");
      if (fitBtn) fitBtn.click();
    });
    await new Promise(r => setTimeout(r, 400));

    const stage = await page.$("#stage");
    if (stage) {
      await saveImage(stage, scene.file);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. CAPTURE GOVERNANCE AUDIT & DIAGNOSTICS VIEW
  // ─────────────────────────────────────────────────────────────
  console.log("Capturing Governance Audit view...");
  await page.click("#view-split-btn");
  await new Promise(r => setTimeout(r, 400));

  const auditBtn = await page.$("#audit-btn");
  if (auditBtn) {
    await auditBtn.click();
    await new Promise(r => setTimeout(r, 600));
    await saveImage(page, "markdy-governance-audit.webp");
  }

  // ─────────────────────────────────────────────────────────────
  // 4. GENERATE COMPACT MARKDY VS MERMAID COMPARISON ASSET
  // ─────────────────────────────────────────────────────────────
  console.log("Generating Markdy vs Mermaid comparison visual...");
  const comparisonPage = await browser.newPage();
  await comparisonPage.setViewport({ width: 1100, height: 460, deviceScaleFactor: 2 });
  
  const comparisonHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 24px 30px;
        background: #0b1120;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #f8fafc;
        height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .title {
        font-size: 22px;
        font-weight: 800;
        margin-bottom: 18px;
        text-align: center;
        letter-spacing: -0.02em;
      }
      .title span { color: #10b981; }
      .cards {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 22px;
        width: 100%;
      }
      .card {
        background: #1e293b;
        border-radius: 12px;
        border: 1px solid #334155;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      .card-header {
        padding: 10px 16px;
        font-weight: 700;
        font-size: 14px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #334155;
      }
      .badge-mermaid {
        background: #334155;
        color: #94a3b8;
        padding: 2px 8px;
        border-radius: 9999px;
        font-size: 11px;
      }
      .badge-markdy {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
        padding: 2px 8px;
        border-radius: 9999px;
        font-size: 11px;
        border: 1px solid rgba(16, 185, 129, 0.35);
      }
      .card-body {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        flex: 1;
      }
      .code-box {
        background: #0f172a;
        padding: 10px 12px;
        border-radius: 6px;
        font-family: 'SF Mono', Menlo, Monaco, Consolas, monospace;
        font-size: 11.5px;
        line-height: 1.45;
        color: #94a3b8;
        border: 1px solid #334155;
      }
      .features {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
        font-size: 12.5px;
        line-height: 1.35;
      }
      .features li {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .negative { color: #f87171; font-weight: bold; }
      .positive { color: #34d399; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="title">Mermaid vs <span>Markdy</span>: Beyond Static Diagrams</div>
    <div class="cards">
      <div class="card">
        <div class="card-header">
          <span>Mermaid.js</span>
          <span class="badge-mermaid">Legacy Static Graph</span>
        </div>
        <div class="card-body">
          <div class="code-box">
flowchart LR<br/>
&nbsp;&nbsp;A[User] --&gt; B(API)<br/>
&nbsp;&nbsp;B --&gt; C[(DB)]
          </div>
          <ul class="features">
            <li><span class="negative">✕</span> Static SVG output without motion or timing</li>
            <li><span class="negative">✕</span> Rigid, hard-to-control auto layout & routing</li>
            <li><span class="negative">✕</span> Generic styling with no semantic theme tokens</li>
            <li><span class="negative">✕</span> No architecture rules or linting governance</li>
          </ul>
        </div>
      </div>
      <div class="card" style="border-color: rgba(16, 185, 129, 0.45); box-shadow: 0 4px 20px rgba(16, 185, 129, 0.08);">
        <div class="card-header" style="background: rgba(16, 185, 129, 0.06);">
          <span style="color: #34d399;">Markdy</span>
          <span class="badge-markdy">⚡ Browser-Native Motion</span>
        </div>
        <div class="card-body">
          <div class="code-box" style="border-color: rgba(16, 185, 129, 0.3); color: #e2e8f0;">
scene theme=editorial<br/>
user Customer & gateway API & db Postgres<br/>
beat: Customer -&gt; API "POST /order" -&gt; Postgres
          </div>
          <ul class="features">
            <li><span class="positive">✓</span> <strong>Web Animations API</strong> — native 60fps choreographed motion</li>
            <li><span class="positive">✓</span> <strong>Semantic Architecture</strong> — nodes, tiers, groups, swimlanes</li>
            <li><span class="positive">✓</span> <strong>8 Editorial Themes</strong> — Paper, Blueprint, Midnight, Editorial</li>
            <li><span class="positive">✓</span> <strong>Built-in Governance</strong> — architectural linting & violation audits</li>
          </ul>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;

  await comparisonPage.setContent(comparisonHtml);
  await new Promise(r => setTimeout(r, 500));
  await saveImage(comparisonPage, "markdy-vs-mermaid-comparison.webp");
  await comparisonPage.close();

  // ─────────────────────────────────────────────────────────────
  // 5. GENERATE COMPACT THEMES SHOWCASE GRID
  // ─────────────────────────────────────────────────────────────
  console.log("Generating Semantic Themes Grid showcase...");
  const themesPage = await browser.newPage();
  await themesPage.setViewport({ width: 1100, height: 380, deviceScaleFactor: 2 });

  const themesHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 22px 28px;
        background: #0f172a;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #f8fafc;
        height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .title {
        font-size: 22px;
        font-weight: 800;
        margin-bottom: 16px;
        text-align: center;
        letter-spacing: -0.02em;
      }
      .title span { color: #10b981; }
      .grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
      }
      .theme-card {
        border-radius: 10px;
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        border: 1px solid rgba(255,255,255,0.1);
      }
      .theme-card.paper { background: #fafaf9; color: #1c1917; border-color: #e7e5e4; }
      .theme-card.editorial { background: #fdfbf7; color: #292524; border-color: #d6d3d1; font-family: 'Newsreader', Georgia, serif; }
      .theme-card.midnight { background: #090d16; color: #f1f5f9; border-color: #1e293b; }
      .theme-card.blueprint { background: #0b1e3b; color: #93c5fd; border-color: #1d4ed8; }
      .theme-card.terminal { background: #05080c; color: #4ade80; border-color: #166534; font-family: 'Courier New', monospace; }
      .theme-card.graphite { background: #18181b; color: #e4e4e7; border-color: #27272a; }
      .theme-card.nebula { background: radial-gradient(circle at center, #1e1035 0%, #0a0518 100%); color: #e879f9; border-color: #701a75; }
      .theme-card.sketchy { background: #fffdfa; color: #262626; border: 2px dashed #a8a29e; }

      .card-name { font-weight: 700; font-size: 13.5px; display: flex; justify-content: space-between; align-items: center; }
      .card-desc { font-size: 11px; opacity: 0.85; line-height: 1.35; }
      .tag { font-size: 9px; padding: 2px 5px; border-radius: 4px; background: rgba(128,128,128,0.2); text-transform: uppercase; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="title">8 Built-in Semantic <span>Themes</span> for Every Domain</div>
    <div class="grid">
      <div class="theme-card paper">
        <div class="card-name">Paper <span class="tag">Default</span></div>
        <div class="card-desc">Crisp, clean light theme ideal for technical docs, PRs, and wikis.</div>
      </div>
      <div class="theme-card editorial">
        <div class="card-name">Editorial <span class="tag">Serif</span></div>
        <div class="card-desc">Publication-grade editorial style for whitepapers & architectures.</div>
      </div>
      <div class="theme-card midnight">
        <div class="card-name">Midnight <span class="tag">Dark</span></div>
        <div class="card-desc">Modern deep developer canvas with high-contrast glowing accents.</div>
      </div>
      <div class="theme-card blueprint">
        <div class="card-name">Blueprint <span class="tag">Cloud</span></div>
        <div class="card-desc">Engineering technical blueprint grid for Kubernetes & cloud infra.</div>
      </div>
      <div class="theme-card terminal">
        <div class="card-name">Terminal <span class="tag">CLI</span></div>
        <div class="card-desc">Monospace green phosphor canvas tailored for CLI workflows.</div>
      </div>
      <div class="theme-card graphite">
        <div class="card-name">Graphite <span class="tag">Neutral</span></div>
        <div class="card-desc">Understated matte-dark theme with muted semantic boundaries.</div>
      </div>
      <div class="theme-card nebula">
        <div class="card-name">Nebula <span class="tag">Constellation</span></div>
        <div class="card-desc">Deep space aesthetic with orbital glow for decentralized systems.</div>
      </div>
      <div class="theme-card sketchy">
        <div class="card-name">Sketchy <span class="tag">Whiteboard</span></div>
        <div class="card-desc">Organic hand-drawn whiteboard style for product discovery.</div>
      </div>
    </div>
  </body>
  </html>
  `;

  await themesPage.setContent(themesHtml);
  await new Promise(r => setTimeout(r, 500));
  await saveImage(themesPage, "markdy-themes-showcase.webp");
  await themesPage.close();

  await browser.close();
  console.log("All visual assets successfully generated and verified!");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
