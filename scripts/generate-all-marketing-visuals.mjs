import puppeteer from 'puppeteer-core';
import * as chromeLauncher from 'chrome-launcher';
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

const MASCOT_PATH = resolve(rootDir, 'docs/images/mascot/markdy.png');
const ICON_3D_PATH = resolve(rootDir, 'docs/images/mascot/3d-icon.png');

const mascotBase64 = `data:image/png;base64,${fs.readFileSync(MASCOT_PATH).toString('base64')}`;
const icon3dBase64 = `data:image/png;base64,${fs.readFileSync(ICON_3D_PATH).toString('base64')}`;

const marketingCards = [
  {
    file: 'markdy-framework-integrations.webp',
    title: 'Astro, MDX & Next.js Framework Islands',
    badge1: '🟡 Astro & MDX Ready',
    badge2: '⚡ ~34kb Lazy Hydration',
    stickyNote: '🟡 <b>Drop-in Components:</b><br/>• Astro: <code>&lt;Markdy client:visible /&gt;</code><br/>• MDX: fenced <code>```markdy</code> blocks<br/>• React / Next.js component<br/>• ~34kb zero-bloat hydration! ⚡',
    explanation: '<b>Framework Integrations:</b><br/>Embed interactive, animated architecture diagrams directly inside Astro, MDX blog posts, or React web apps with zero configuration! 🟡⚡',
    htmlContent: `
      <div style="width: 100%; height: 100%; padding: 24px 28px; background: #fafafa; display: flex; flex-direction: column; justify-content: space-between;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-size: 11.5px; font-weight: 800; color: #047857; text-transform: uppercase; letter-spacing: 0.05em;">Modern Web Stack</span>
            <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 2px;">Framework Islands &amp; Native MDX Support</h2>
          </div>
          <span style="background: #dbeafe; color: #1d4ed8; font-size: 12px; font-weight: 800; padding: 6px 14px; border-radius: 999px;">Zero-Bloat Runtime</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 14px; flex: 1;">
          <!-- Astro Card -->
          <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 4px 10px rgba(0,0,0,0.03);">
            <div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 22px;">🚀</span>
                  <strong style="font-size: 15px; color: #0f172a;">Astro Island</strong>
                </div>
                <span style="font-size: 10.5px; font-weight: 700; background: #fef3c7; color: #b45309; padding: 2px 6px; border-radius: 4px;">@markdy/astro</span>
              </div>
              <div style="background: #0f172a; border-radius: 8px; padding: 12px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #f8fafc; line-height: 1.5;">
                <span style="color: #93c5fd;">import</span> Markdy <span style="color: #93c5fd;">from</span> <span style="color: #a7f3d0;">'@markdy/astro'</span>;<br/><br/>
                &lt;<span style="color: #f472b6;">Markdy</span><br/>
                &nbsp;&nbsp;code={diagramCode}<br/>
                &nbsp;&nbsp;<span style="color: #fbbf24;">client:visible</span><br/>
                /&gt;
              </div>
              <div style="margin-top: 12px; font-size: 11px; color: #475569; line-height: 1.6;">
                • <b>Lazy Hydration:</b> Loads only when visible<br/>
                • <b>Zero Bundle Bloat:</b> ~34kb runtime payload<br/>
                • <b>Static SSR Fallback:</b> Instant SVG paint
              </div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; font-size: 10.5px; color: #059669; font-weight: 700;">
              ✓ Official Astro Island Package
            </div>
          </div>

          <!-- MDX Card -->
          <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 4px 10px rgba(0,0,0,0.03);">
            <div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 22px;">📝</span>
                  <strong style="font-size: 15px; color: #0f172a;">MDX Codeblock</strong>
                </div>
                <span style="font-size: 10.5px; font-weight: 700; background: #e0f2fe; color: #0284c7; padding: 2px 6px; border-radius: 4px;">@markdy/mdx</span>
              </div>
              <div style="background: #0f172a; border-radius: 8px; padding: 12px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #f8fafc; line-height: 1.5;">
                \`\`\`<span style="color: #34d399;">markdy</span><br/>
                scene "Kafka Stream" theme=midnight<br/>
                service Producer<br/>
                queue Kafka<br/>
                beat main: Producer ~&gt; Kafka<br/>
                \`\`\`
              </div>
              <div style="margin-top: 12px; font-size: 11px; color: #475569; line-height: 1.6;">
                • <b>Remark / Rehype:</b> Fenced codeblock transpiler<br/>
                • <b>Nextra / Starlight / Docusaurus:</b> Drop-in ready<br/>
                • <b>Interactive Seekbar:</b> Built-in controls
              </div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; font-size: 10.5px; color: #059669; font-weight: 700;">
              ✓ Native Remark Plugin Included
            </div>
          </div>

          <!-- React Card -->
          <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 18px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 4px 10px rgba(0,0,0,0.03);">
            <div>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 22px;">⚛️</span>
                  <strong style="font-size: 15px; color: #0f172a;">React / Next.js</strong>
                </div>
                <span style="font-size: 10.5px; font-weight: 700; background: #ede9fe; color: #7c3aed; padding: 2px 6px; border-radius: 4px;">@markdy/react</span>
              </div>
              <div style="background: #0f172a; border-radius: 8px; padding: 12px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #f8fafc; line-height: 1.5;">
                <span style="color: #93c5fd;">import</span> { Diagram } <span style="color: #93c5fd;">from</span> <span style="color: #a7f3d0;">'@markdy/react'</span>;<br/><br/>
                &lt;<span style="color: #f472b6;">Diagram</span><br/>
                &nbsp;&nbsp;code={code}<br/>
                &nbsp;&nbsp;<span style="color: #fbbf24;">autoplay</span>={<span style="color: #a7f3d0;">true</span>}<br/>
                /&gt;
              </div>
              <div style="margin-top: 12px; font-size: 11px; color: #475569; line-height: 1.6;">
                • <b>Next.js App Router:</b> SSR &amp; Client Component<br/>
                • <b>Custom Events:</b> <code>onBeatChange</code>, <code>onSeek</code><br/>
                • <b>Theme Tokens:</b> CSS variable inheritance
              </div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; font-size: 10.5px; color: #059669; font-weight: 700;">
              ✓ Full TypeScript AST &amp; Hooks
            </div>
          </div>
        </div>
      </div>
    `
  },
  {
    file: 'markdy-governance-audit.webp',
    title: 'Architecture Governance & CI/CD Linter',
    badge1: '🛡️ Well-Architected Governance',
    badge2: '🔍 CI/CD Linting Rules',
    stickyNote: '🛡️ <b>Well-Architected Rules:</b><br/>• Layer isolation verification<br/>• Deadlock & cycle detection<br/>• Direct DB access warnings<br/>• Automatic PR visual diff review!',
    explanation: '<b>Architecture Governance:</b><br/>Run <code>markdy lint --arch-rules</code> in your GitHub Actions workflow to block architectural drift and enforce clean boundaries! 🛡️🔍',
    htmlContent: `
      <div style="width: 100%; height: 100%; padding: 24px; background: #090d16; display: flex; gap: 20px; color: #f8fafc;">
        <!-- Left: CLI Terminal -->
        <div style="flex: 1.25; background: #0f172a; border: 1px solid #334155; border-radius: 14px; padding: 18px; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; line-height: 1.5; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; gap: 6px; margin-bottom: 10px;">
              <div style="width: 10px; height: 10px; border-radius: 50%; background: #ef4444;"></div>
              <div style="width: 10px; height: 10px; border-radius: 50%; background: #f59e0b;"></div>
              <div style="width: 10px; height: 10px; border-radius: 50%; background: #10b981;"></div>
              <span style="color: #64748b; font-size: 10.5px; margin-left: 6px;">bash — markdy lint --arch-rules</span>
            </div>
            <div style="margin-bottom: 6px;">
              <span style="color: #94a3b8;">$</span> <strong style="color: #38bdf8;">npx markdy lint</strong> --arch-rules examples/showcase/*.markdy
            </div>
            <div style="color: #94a3b8; font-size: 10px; margin-bottom: 6px;">
              🔍 Scanning 28 architecture scene AST models...
            </div>
            <div style="color: #cbd5e1; border-top: 1px solid #1e293b; padding-top: 6px; font-size: 10px; line-height: 1.45;">
              <span style="color: #34d399;">✓ [PASS]</span> <span style="color: #ffffff; font-weight: 700;">rule/layer-isolation:</span> No direct Client -> DB bypass<br/>
              <span style="color: #34d399;">✓ [PASS]</span> <span style="color: #ffffff; font-weight: 700;">rule/cycle-detector:</span> 0 deadlock cycles across 28 scenes<br/>
              <span style="color: #34d399;">✓ [PASS]</span> <span style="color: #ffffff; font-weight: 700;">rule/security-perimeter:</span> Ingress traffic enforced via WAF<br/>
              <span style="color: #34d399;">✓ [PASS]</span> <span style="color: #ffffff; font-weight: 700;">rule/async-queue:</span> High-throughput writes buffered by Kafka<br/>
              <span style="color: #34d399;">✓ [PASS]</span> <span style="color: #ffffff; font-weight: 700;">rule/db-grounding:</span> All databases guarded by microservices<br/>
              <span style="color: #34d399;">✓ [PASS]</span> <span style="color: #ffffff; font-weight: 700;">rule/bounded-contexts:</span> Microservice domain boundaries clear<br/>
              <span style="color: #34d399;">✓ [PASS]</span> <span style="color: #ffffff; font-weight: 700;">rule/token-naming:</span> Semantic node roles conform to spec<br/>
              <span style="color: #34d399;">✓ [PASS]</span> <span style="color: #ffffff; font-weight: 700;">rule/timing-sanity:</span> All animation durations &gt; 0ms &amp; &lt; 30s<br/>
              <span style="color: #34d399;">✓ [PASS]</span> <span style="color: #ffffff; font-weight: 700;">rule/wcag-contrast:</span> 8 themes satisfy WCAG AAA standards
            </div>
          </div>
          <div style="background: #14532d; color: #86efac; padding: 6px 12px; border-radius: 6px; font-weight: 700; display: flex; justify-content: space-between; font-size: 10px;">
            <span>✨ Audit passed: 28/28 diagrams compliant (0 violations)</span>
            <span>Exit: 0</span>
          </div>
        </div>

        <!-- Right: GitHub PR Bot Review -->
        <div style="flex: 1; background: #ffffff; border-radius: 14px; padding: 18px; color: #1e293b; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 4px 14px rgba(0,0,0,0.15);">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">
              <span style="font-size: 20px;">🤖</span>
              <div>
                <strong style="font-size: 13.5px; color: #0f172a;">github-actions[bot]</strong>
                <span style="font-size: 11px; color: #64748b; margin-left: 6px;">automated PR review</span>
              </div>
            </div>
            <div style="font-size: 11.5px; line-height: 1.5; color: #334155;">
              <strong style="color: #047857;">Architecture Diff Summary:</strong><br/>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; margin: 6px 0; font-family: 'JetBrains Mono', monospace; font-size: 10px;">
                <span style="color: #15803d;">+ service ApiGateway "Kong Edge"</span><br/>
                <span style="color: #15803d;">+ cache Redis "Multi-AZ Cache"</span><br/>
                <span style="color: #0284c7;">~ beat main: added cache-aside fallback</span>
              </div>
              <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; background: #f8fafc; margin-top: 6px;">
                <strong style="font-size: 10.5px; color: #475569;">Topology Invariants Checked:</strong>
                <div style="display: flex; gap: 6px; margin-top: 4px; font-size: 10px;">
                  <span style="background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px;">✓ Layer Bounds</span>
                  <span style="background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px;">✓ 0 Deadlocks</span>
                  <span style="background: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px;">✓ WCAG AAA</span>
                </div>
              </div>
            </div>
          </div>
          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 8px 12px; font-size: 11px; color: #065f46; font-weight: 700; display: flex; align-items: center; gap: 6px;">
            <span>✅</span> All architecture governance checks approved for merge!
          </div>
        </div>
      </div>
    `
  }
];

function generateDecoratedHTML(meta) {
  const isDark = meta.htmlContent.includes('#090d16') || meta.htmlContent.includes('#0f172a');
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
    * { box-sizing: border-box; margin: 0; padding: 0; }
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
    .badge-pill.primary { color: #047857; }
    .badge-pill.secondary { color: #0369a1; }
    .window-card {
      position: relative;
      z-index: 20;
      width: 100%;
      height: calc(100% - 54px);
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid rgba(0, 0, 0, 0.08);
      box-shadow: 0 24px 60px -12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .window-titlebar {
      height: 38px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      align-items: center;
      padding: 0 16px;
      gap: 8px;
      flex-shrink: 0;
    }
    .traffic-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
    .traffic-red { background: #ef4444; }
    .traffic-yellow { background: #f59e0b; }
    .traffic-green { background: #10b981; }
    .window-title {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      font-weight: 700;
      color: #475569;
      background: #e2e8f0;
      padding: 2px 10px;
      border-radius: 4px;
      margin-left: 8px;
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
      background: ${isDark ? '#090d16' : '#ffffff'};
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sticky-note-container {
      position: absolute;
      bottom: 16px;
      left: 16px;
      z-index: 25;
      transform: rotate(-1.5deg);
    }
    .sticky-pin-icon {
      position: absolute;
      top: -14px;
      left: 14px;
      width: 34px;
      height: 34px;
      z-index: 30;
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.25));
      transform: rotate(-8deg);
    }
    .sticky-note-card {
      background: #fef08a;
      color: #713f12;
      padding: 14px 18px 14px 20px;
      border-radius: 12px;
      box-shadow: 0 10px 24px rgba(0,0,0,0.12), 0 2px 5px rgba(0,0,0,0.05);
      font-size: 13px;
      line-height: 1.45;
      max-width: 380px;
      border: 1px solid rgba(234,179,8,0.3);
    }
    .sticky-note-card b { color: #854d0e; }
    .mascot-wrapper {
      position: absolute;
      right: 0px;
      bottom: -10px;
      z-index: 30;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      pointer-events: none;
    }
    .mascot-bubble {
      background: #ffffff;
      border-radius: 14px;
      padding: 10px 14px;
      box-shadow: 0 10px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06);
      font-size: 12.5px;
      line-height: 1.4;
      color: #1e293b;
      max-width: 310px;
      margin-bottom: -10px;
      margin-right: 24px;
      position: relative;
      z-index: 35;
      transform: rotate(1deg);
    }
    .mascot-bubble::after {
      content: '';
      position: absolute;
      bottom: -9px;
      right: 50px;
      width: 0;
      height: 0;
      border-left: 9px solid transparent;
      border-right: 9px solid transparent;
      border-top: 9px solid #ffffff;
    }
    .bubble-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 10.5px;
      font-weight: 800;
      color: #047857;
      background: #d1fae5;
      padding: 1px 6px;
      border-radius: 999px;
      margin-bottom: 3px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .bubble-content b { color: #0f172a; }
    .bubble-content code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      background: #f1f5f9;
      padding: 1px 4px;
      border-radius: 3px;
    }
    .mascot-img {
      width: 230px;
      height: auto;
      filter: drop-shadow(0 12px 22px rgba(0,0,0,0.18));
      z-index: 32;
    }
    .wand-sparkles {
      position: absolute;
      right: 180px;
      bottom: 165px;
      pointer-events: none;
      z-index: 34;
    }
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="ambient-glow-1"></div>
  <div class="ambient-glow-2"></div>

  <header class="header-bar">
    <div class="brand-group">
      <img src="${icon3dBase64}" alt="Markdy" class="brand-icon" />
      <span class="brand-name">Markdy.com</span>
      <span class="brand-pill">Diagram as Code</span>
    </div>
    <div class="header-badges">
      <div class="badge-pill primary">${meta.badge1}</div>
      <div class="badge-pill secondary">${meta.badge2}</div>
    </div>
  </header>

  <main class="window-card">
    <div class="window-titlebar">
      <div class="traffic-dot traffic-red"></div>
      <div class="traffic-dot traffic-yellow"></div>
      <div class="traffic-dot traffic-green"></div>
      <span class="window-title">${meta.title}</span>
      <div class="window-status">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
        <span>Production Verified</span>
      </div>
    </div>

    <div class="diagram-viewport">
      ${meta.htmlContent}
    </div>

    <div class="sticky-note-container">
      <img src="${icon3dBase64}" alt="Pin" class="sticky-pin-icon" />
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
      <img src="${mascotBase64}" alt="Markdy Axolotl Mascot" class="mascot-img" />
      <div class="wand-sparkles">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" fill="#FBBF24" opacity="0.9"/>
        </svg>
      </div>
    </div>
  </main>
</body>
</html>
`;
}

async function main() {
  console.log('🎨 Generating pristine bespoke marketing visual cards...');
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
    height: 900,
    deviceScaleFactor: 2,
  });

  const OUTPUT_DOCS_DIR = resolve(rootDir, 'docs/images');
  const OUTPUT_PUBLIC_DIR = resolve(rootDir, 'website/public/images');

  for (const item of marketingCards) {
    console.log(`✨ Rendering bespoke visual: ${item.file}...`);
    const fullHtml = generateDecoratedHTML(item);
    await page.setContent(fullHtml, { waitUntil: 'load', timeout: 10000 }).catch(() => {});
    await page.evaluate(async () => {
      if (document.fonts) await document.fonts.ready;
    });
    await new Promise(r => setTimeout(r, 400));

    const docsPath = join(OUTPUT_DOCS_DIR, item.file);
    const publicPath = join(OUTPUT_PUBLIC_DIR, item.file);

    await page.screenshot({ path: docsPath, type: 'webp', quality: 95 });
    await page.screenshot({ path: publicPath, type: 'webp', quality: 95 });
    console.log(`✅ Saved bespoke visual: ${item.file}`);
  }

  await browser.close();
  console.log('🎉 All marketing visual cards generated pristinely!');
}

main().catch(err => {
  console.error('Fatal marketing visual generation error:', err);
  process.exit(1);
});
