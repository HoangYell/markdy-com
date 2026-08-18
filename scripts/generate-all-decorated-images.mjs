import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MASCOT_PATH = path.join(rootDir, 'docs/images/mascot/markdy.png');
const ICON_3D_PATH = path.join(rootDir, 'docs/images/mascot/3d-icon.png');

const mascotBase64 = `data:image/png;base64,${fs.readFileSync(MASCOT_PATH).toString('base64')}`;
const icon3dBase64 = `data:image/png;base64,${fs.readFileSync(ICON_3D_PATH).toString('base64')}`;

const OUTPUT_DOCS_DIR = path.join(rootDir, 'docs/images');
const OUTPUT_PUBLIC_DIR = path.join(rootDir, 'website/public/images');

// Backup raw captures directory so we can read from raw captures
const RAW_DIR = path.join(rootDir, 'tmp/raw-captures');
fs.mkdirSync(RAW_DIR, { recursive: true });

// Copy current webp files to RAW_DIR if not already backed up
const files = fs.readdirSync(OUTPUT_PUBLIC_DIR).filter(f => f.endsWith('.webp') && !f.startsWith('test-'));
for (const file of files) {
  const dest = path.join(RAW_DIR, file);
  if (!fs.existsSync(dest)) {
    fs.copyFileSync(path.join(OUTPUT_PUBLIC_DIR, file), dest);
  }
}

const scenesMetadata = [
  {
    file: 'scene-url-shortener.webp',
    title: 'URL Shortener Architecture (Cache-Aside)',
    sceneTag: 'scene theme=paper',
    stickyNote: '📌 <b>How it works:</b><br/><b>1.</b> Check Redis cache (<b>0.5ms</b>) ⚡<br/><b>2.</b> Cache miss? Query DB (<b>50ms</b>) + warm cache 🔥',
    explanation: '<b>URL Shortener Architecture:</b><br/>When a visitor opens <code>short.ly/a7</code>, the API Gateway queries in-memory <b>Redis cache</b> first. If found, it returns a <b>301 redirect</b> in under 2ms! 🚀',
    badge1: '⚡ Cache-Aside Pattern',
    badge2: '🎯 99.4% Cache Hit Ratio',
  },
  {
    file: 'scene-kubernetes-cluster.webp',
    title: 'Kubernetes Cloud Native Platform Blueprint',
    sceneTag: 'scene theme=blueprint',
    stickyNote: '☸️ <b>K8s Orchestration:</b><br/>• Ingress terminates SSL & routes paths<br/>• HPA auto-scales stateless pods<br/>• StatefulSet guards persistent DB 💾',
    explanation: '<b>Kubernetes Cluster Blueprint:</b><br/>Traffic enters at the <b>Ingress Controller</b>, load balances across auto-scaling <b>Pods</b>, and writes to <b>PostgreSQL StatefulSet</b> with persistent volumes! 🛡️',
    badge1: '☸️ Kubernetes Cloud Native',
    badge2: '📦 Auto-scaling Pods',
  },
  {
    file: 'scene-lakehouse-medallion.webp',
    title: 'Lakehouse Medallion Data Pipeline',
    sceneTag: 'scene theme=editorial type=medallion',
    stickyNote: '📊 <b>3-Stage Pipeline:</b><br/>🥉 <b>Bronze:</b> Raw event streams<br/>🥈 <b>Silver:</b> Cleaned & deduplicated<br/>🥇 <b>Gold:</b> Business aggregate KPIs 🏆',
    explanation: '<b>Lakehouse Medallion Pipeline:</b><br/>Raw streaming logs land in the <b>Bronze layer</b>, Spark cleans them into <b>Silver tables</b>, and aggregates produce <b>Gold insights</b> for BI & AI models! ✨',
    badge1: '🥉 ➔ 🥈 ➔ 🥇 Medallion Tiers',
    badge2: '📊 Real-time ETL Engine',
  },
  {
    file: 'scene-twitter-timeline.webp',
    title: 'Twitter Timeline Fan-Out Architecture',
    sceneTag: 'scene theme=midnight',
    stickyNote: '⚡ <b>High Concurrency:</b><br/>• Kafka decouples write spikes<br/>• Workers fan-out to Redis caches<br/>• Home feeds load in &lt;10ms!',
    explanation: '<b>Twitter Timeline Fan-Out:</b><br/>When an author tweets, <b>Kafka</b> streams the event to workers who push the tweet into each active follower\'s <b>Redis timeline cache</b>! 🐦⚡',
    badge1: '🐦 500M Tweets / Day',
    badge2: '⚡ Sub-10ms Feed Reads',
  },
  {
    file: 'scene-oauth-oidc-flow.webp',
    title: 'OAuth2 & OIDC Authentication Flow',
    sceneTag: 'scene theme=midnight type=sequence',
    stickyNote: '🔐 <b>Auth Handshake:</b><br/><b>1.</b> Redirect with Auth Code<br/><b>2.</b> Backend exchanges Code for JWT<br/><b>3.</b> Verified session cookie stored!',
    explanation: '<b>OAuth2 / OIDC Auth Flow:</b><br/>The browser initiates login, the <b>Identity Provider</b> returns an auth code, and the backend securely exchanges it for <b>JWT access tokens</b>! 🛡️',
    badge1: '🔐 Zero-Trust Auth',
    badge2: '🎟️ JWT Token Exchange',
  },
  {
    file: 'scene-ecommerce-swimlanes.webp',
    title: 'E-Commerce Checkout Cross-Functional Swimlanes',
    sceneTag: 'scene theme=paper type=swimlane',
    stickyNote: '🛍️ <b>Cross-Functional Flow:</b><br/>Frontend ➔ Gateway ➔ Orders ➔ Payments ➔ Fulfillment',
    explanation: '<b>E-Commerce Swimlanes:</b><br/>Separating frontend, microservices, and third-party payment gateways into <b>horizontal swimlanes</b> makes team boundaries crystal clear! 🛒',
    badge1: '🛍️ Checkout Architecture',
    badge2: '💳 Stripe / Payment Gateway',
  },
  {
    file: 'scene-zero-trust-paved-road.webp',
    title: 'Zero-Trust Secure Paved Road & Perimeter',
    sceneTag: 'scene theme=paper',
    stickyNote: '🛡️ <b>Security Perimeter:</b><br/>• WAF & mTLS mutual auth<br/>• Policy engine checks every RPC<br/>• Automated audit telemetry',
    explanation: '<b>Zero-Trust Paved Road:</b><br/>Every request is authenticated at the perimeter by <b>WAF + Envoy Proxy</b>, with fine-grained RBAC policy enforcement at every microservice hop! 🔒',
    badge1: '🛡️ Zero-Trust Security',
    badge2: '🔑 mTLS & RBAC Guard',
  },
  {
    file: 'scene-platform-pyramid.webp',
    title: 'Platform Engineering Value Pyramid',
    sceneTag: 'scene theme=editorial type=pyramid',
    stickyNote: '📐 <b>Tier Stack:</b><br/>• Top: Golden Developer Paths<br/>• Mid: Observability & CI/CD<br/>• Base: Multi-Cloud Infrastructure',
    explanation: '<b>Platform Value Pyramid:</b><br/>A strong infrastructure foundation enables self-service developer portals and automated golden paths that 10x shipping velocity! 🚀',
    badge1: '📐 Value Pyramid',
    badge2: '🛠️ Self-Service Developer Platform',
  },
  {
    file: 'scene-database-radar.webp',
    title: 'Distributed Database Radar Benchmark',
    sceneTag: 'scene theme=paper type=radar',
    stickyNote: '📈 <b>Benchmark Axes:</b><br/>• Read/Write Latency<br/>• Linear Scalability<br/>• Global Consistency (CAP)',
    explanation: '<b>Database Radar Benchmark:</b><br/>Compare distributed databases across latency, consistency, availability, and operational overhead in a <b>multi-axis polygon radar</b>! 📊',
    badge1: '📈 Multi-Axis Benchmark',
    badge2: '🗄️ CockroachDB vs Redis vs PostgreSQL',
  },
  {
    file: 'scene-strategic-quadrant.webp',
    title: 'Strategic Technology Decision Quadrant',
    sceneTag: 'scene theme=editorial type=quadrant',
    stickyNote: '🧭 <b>2x2 Decision Matrix:</b><br/>• High Impact / Low Effort = Quick Wins<br/>• High Impact / High Effort = Strategic Bets',
    explanation: '<b>Strategic 2x2 Quadrant:</b><br/>Categorize architecture proposals into Adopt, Trial, Assess, and Hold quadrants with automatic proximity layout! 🎯',
    badge1: '🧭 Strategic Tech Radar',
    badge2: '🎯 2x2 Decision Matrix',
  },
  {
    file: 'scene-terminal-cli.webp',
    title: 'Terminal Infrastructure CLI Topology',
    sceneTag: 'scene theme=terminal',
    stickyNote: '💻 <b>Cyberpunk CLI Theme:</b><br/>• Monospace font stack<br/>• Dark TUI background<br/>• Neon green & amber glows',
    explanation: '<b>Terminal / TUI Theme:</b><br/>Perfect for DevOps engineers and CLI lovers! High-contrast monospace design with glowing server nodes and status probes! 💻🟢',
    badge1: '💻 Hacker / TUI Theme',
    badge2: '⚡ Monospace Topology',
  },
  {
    file: 'scene-sketchy-whiteboard.webp',
    title: 'Hand-Drawn Whiteboard Product Discovery',
    sceneTag: 'scene theme=sketchy',
    stickyNote: '✏️ <b>Organic Hand-Drawn:</b><br/>• Organic displacement filter<br/>• Soft hand-drawn strokes<br/>• Great for RFC brainstorming!',
    explanation: '<b>Sketchy Whiteboard Theme:</b><br/>Gives your architecture diagrams an organic, hand-drawn Excalidraw feel while retaining 100% diagram-as-code editability! ✏️🎨',
    badge1: '✏️ Hand-Drawn Theme',
    badge2: '🎨 Whiteboard Brainstorming',
  },
  {
    file: 'scene-nebula-constellation.webp',
    title: 'Nebula Radial Signal Constellation',
    sceneTag: 'scene theme=nebula type=constellation',
    stickyNote: '🌌 <b>Deep Space Theme:</b><br/>• Radial orbit rings<br/>• Signal halo emitters<br/>• Constellation twinkling stars',
    explanation: '<b>Nebula Constellation:</b><br/>Focal-node layout with radial orbit geometry and pulsating signal halos — ideal for IoT telemetry and AI neural networks! 🌌✨',
    badge1: '🌌 Nebula Deep Space',
    badge2: '📡 Radial Telemetry Map',
  },
  {
    file: 'scene-cicd-pipeline.webp',
    title: 'GitOps CI/CD Delivery Pipeline',
    sceneTag: 'scene theme=paper',
    stickyNote: '🚀 <b>Continuous Delivery:</b><br/>Code ➔ Unit Tests ➔ Security Scan ➔ Staging ➔ Production Canary',
    explanation: '<b>GitOps CI/CD Pipeline:</b><br/>Automate the release path from GitHub pull request to production canary deployments with progressive reveal beats! 🚢',
    badge1: '🚀 Automated Delivery',
    badge2: '🛡️ Security & Canary Gate',
  },
  {
    file: 'scene-fintech-governance.webp',
    title: 'Fintech Real-Time Transaction Engine',
    sceneTag: 'scene theme=paper',
    stickyNote: '💳 <b>Anti-Fraud Engine:</b><br/>• 50ms ML risk scoring<br/>• Ledger double-entry validation<br/>• Real-time webhook notifications',
    explanation: '<b>Fintech Governance Engine:</b><br/>Animate transactions traveling through API gateways, fraud detection ML models, and ACID ledger databases! 💳🛡️',
    badge1: '💳 High-Assurance Fintech',
    badge2: '⚡ Sub-50ms Risk Scoring',
  },
  {
    file: 'scene-youtube-pipeline.webp',
    title: 'Video Transcoding & CDN Pipeline',
    sceneTag: 'scene theme=paper',
    stickyNote: '📹 <b>Media Processing:</b><br/>Upload ➔ Chunking ➔ Distributed Transcoding ➔ Multi-bitrate CDN',
    explanation: '<b>Video Transcoding Pipeline:</b><br/>Shows how raw 4K video uploads are split into chunks, transcoded in parallel, and cached across global Edge CDNs! 🎬🌐',
    badge1: '📹 Video Transcoding',
    badge2: '🌐 Global Edge CDN',
  },
  {
    file: 'scene-engineering-roadmap.webp',
    title: 'Engineering Gantt & Phase Roadmap',
    sceneTag: 'scene theme=paper type=gantt',
    stickyNote: '📅 <b>Schedule Tracking:</b><br/>• Horizontal phase bars<br/>• Span & milestone tracking<br/>• Critical path highlighting',
    explanation: '<b>Gantt Phase Roadmap:</b><br/>Track quarterly engineering milestones, API refactors, and compliance audits with proportional task spans! 📅✨',
    badge1: '📅 Gantt Schedule Engine',
    badge2: '🎯 Milestone Tracking',
  },
  {
    file: 'scene-osi-layers.webp',
    title: 'OSI & Abstraction Layer Stack',
    sceneTag: 'scene theme=editorial type=layers',
    stickyNote: '🥞 <b>Full-Width Bands:</b><br/>Application ➔ Transport ➔ Network ➔ Data Link ➔ Physical',
    explanation: '<b>Layer Stack Engine:</b><br/>Render stacked horizontal bands for network OSI models, CSS cascade layers, and system memory abstractions! 🥞',
    badge1: '🥞 Stacked Layer Bands',
    badge2: '🌐 Network & System Models',
  },
  {
    file: 'scene-concurrency-fanin.webp',
    title: 'Fan-In Queue & Concurrency Bottleneck',
    sceneTag: 'scene theme=paper',
    stickyNote: '⚠️ <b>Bottleneck Analysis:</b><br/>10,000 producer requests ➔ Queue buffer ➔ Worker concurrency limit',
    explanation: '<b>Concurrency Bottleneck:</b><br/>Visualize queue saturation, worker starvation, and deadlocks with built-in architecture diagnostic rules! 🚦',
    badge1: '⚠️ Queue Saturation Analysis',
    badge2: '⚡ Concurrency Throttling',
  },
  {
    file: 'scene-data-flywheel.webp',
    title: 'AI Compounding Data Flywheel',
    sceneTag: 'scene theme=paper type=flywheel',
    stickyNote: '🔄 <b>Compounding Loop:</b><br/>User Data ➔ Model Training ➔ Better Features ➔ More Users!',
    explanation: '<b>Compounding Data Flywheel:</b><br/>A circular closed-loop engine with tangential flow paths that illustrates self-reinforcing AI flywheel mechanics! 🔄🤖',
    badge1: '🔄 Circular Compounding Loop',
    badge2: '🤖 AI Feedback Flywheel',
  },
  {
    file: 'scene-editorial-api-platform.webp',
    title: 'Multi-Tier API Platform Architecture',
    sceneTag: 'scene theme=editorial',
    stickyNote: '📰 <b>Editorial Theme:</b><br/>Warm cream paper, serif typography, and elegant card styling.',
    explanation: '<b>Editorial API Platform:</b><br/>Styled with warm serif headings and ink accents, built for technical blog posts, whitepapers, and pitch decks! 📰🖋️',
    badge1: '📰 Publication Theme',
    badge2: '🖋️ Serif Typography',
  },
  {
    file: 'scene-product-market-fit-venn.webp',
    title: 'Product-Market Fit 3-Circle Venn',
    sceneTag: 'scene theme=editorial type=venn',
    stickyNote: '🎯 <b>The Sweet Spot:</b><br/>Desirability ∩ Feasibility ∩ Viability = Product-Market Fit!',
    explanation: '<b>3-Circle Venn Diagram:</b><br/>Automatic proximity scaling and compounding opacity tints highlight the intersection sweet spot! 🎯✨',
    badge1: '🎯 3-Circle Venn Engine',
    badge2: '💡 Concept Intersection',
  },
  {
    file: 'scene-nested-security.webp',
    title: 'Nested Defense-in-Depth Security',
    sceneTag: 'scene theme=paper type=nested',
    stickyNote: '🏰 <b>Concentric Security:</b><br/>Public Internet ➔ DMZ Perimeter ➔ Private VPC ➔ Secure Enclave',
    explanation: '<b>Nested Containment Engine:</b><br/>Renders concentric rounded perimeters with stepped insets for defense-in-depth security architectures! 🏰🛡️',
    badge1: '🏰 Defense in Depth',
    badge2: '🔒 Concentric Security Enclave',
  },
  {
    file: 'markdy-studio-hero.webp',
    title: 'Markdy Live Interactive Studio',
    sceneTag: 'scene theme=paper',
    stickyNote: '🎬 <b>Interactive Features:</b><br/>• Monaco Code Editor<br/>• Live WAAPI Canvas<br/>• Scannable Timeline<br/>• Parsed Node AST Inspector',
    explanation: '<b>Markdy Interactive Studio:</b><br/>Type MarkdyScript in the editor and watch your architecture diagram render, lay itself out, and animate instantly! 🪄💻',
    badge1: '🎬 Live Interactive Studio',
    badge2: '⚡ WAAPI Timeline Engine',
  },
  {
    file: 'markdy-split-editor.webp',
    title: 'MarkdyScript Code-to-Diagram Studio',
    sceneTag: 'scene theme=paper',
    stickyNote: '💡 <b>Diagram-as-Code:</b><br/>Write simple text on the left, get an animated interactive diagram on the right!',
    explanation: '<b>Code-to-Visual Workflow:</b><br/>Declare semantic nodes, beats, and flows. Markdy compiles layout and routes collision-free orthogonal edges automatically! 🪄',
    badge1: '💡 Text-to-Diagram DSL',
    badge2: '📐 Auto-Layout & Edge Routing',
  },
  {
    file: 'markdy-vs-mermaid-comparison.webp',
    title: 'Mermaid vs Markdy Side-by-Side Comparison',
    sceneTag: 'scene theme=paper',
    stickyNote: '⚔️ <b>Static vs Dynamic:</b><br/>• Mermaid: Static SVG chart<br/>• Markdy: Animated 60fps seekable story',
    explanation: '<b>Mermaid vs Markdy:</b><br/>Mermaid is great for static docs; Markdy brings architecture to life with choreography, camera zooms, and beats! 🥊✨',
    badge1: '⚔️ Architectural Showdown',
    badge2: '🎬 Browser-Native 60fps Motion',
  },
  {
    file: 'markdy-themes-showcase.webp',
    title: '8 Built-in Semantic Themes',
    sceneTag: 'scene theme=paper',
    stickyNote: '🎨 <b>8 Built-in Themes:</b><br/>Paper, Editorial, Midnight, Blueprint, Terminal, Graphite, Nebula, Sketchy',
    explanation: '<b>8 Semantic Themes:</b><br/>Switch themes instantly with a single attribute! Every theme features tailored typography, node glyphs, and WCAG AAA contrast! 🎨',
    badge1: '🎨 8 Aesthetic Themes',
    badge2: '♿ WCAG AAA Accessible',
  },
  {
    file: 'markdy-ai-agent-workflow.webp',
    title: 'AI Agent Prompting & Workflow Hub',
    sceneTag: 'scene theme=paper',
    stickyNote: '🤖 <b>Supported AI Agents:</b><br/>• Cursor IDE (Composer)<br/>• Claude Desktop (MCP)<br/>• Google Antigravity<br/>• GitHub Copilot',
    explanation: '<b>AI Agent Integration:</b><br/>AI coding models love Markdy\'s strict single-line grammar! Feed it <code>AGENT.md</code> and prompt in plain English! 🤖🪄',
    badge1: '🤖 AI-Native Architecture',
    badge2: '🔌 Official MCP Server',
  },
  {
    file: 'markdy-universal-ingestion.webp',
    title: 'Universal Ingestion Transpilers',
    sceneTag: 'scene theme=paper',
    stickyNote: '🪄 <b>1-Command Ingestion:</b><br/>• Mermaid (.mmd)<br/>• Draw.io (.drawio / .xml)<br/>• Docker Compose<br/>• Kubernetes Manifests<br/>• Terraform State (.tfstate)',
    explanation: '<b>Universal Ingestion Transpilers:</b><br/>Easily migrate your existing Mermaid charts, Draw.io files, Docker Compose, or K8s manifests into animated MarkdyScript scenes! 🪄',
    badge1: '🪄 Universal Transpilers',
    badge2: '🔄 Mermaid, Draw.io & K8s',
  },
  {
    file: 'markdy-framework-integrations.webp',
    title: 'Astro, MDX & Next.js Framework Islands',
    sceneTag: 'scene theme=paper',
    stickyNote: '🟡 <b>Drop-in Components:</b><br/>• Astro: &lt;Markdy client:visible /&gt;<br/>• MDX: fenced ```markdy blocks<br/>• Zero bundle bloat (~34kb)',
    explanation: '<b>Framework Integrations:</b><br/>Embed animated architecture diagrams inside Astro, MDX, React, or Web Components with lazy hydration on scroll! 🟡⚡',
    badge1: '🟡 Astro & MDX Ready',
    badge2: '⚡ ~34kb Lazy Hydration',
  },
  {
    file: 'markdy-governance-audit.webp',
    title: 'Architecture Governance & Linting Audit',
    sceneTag: 'scene theme=paper',
    stickyNote: '🛡️ <b>Well-Architected Rules:</b><br/>• Layer isolation check<br/>• Cycle & deadlock detection<br/>• Gateway bypass warnings',
    explanation: '<b>Architecture Governance Audit:</b><br/>Run <code>markdy lint --arch-rules</code> in CI/CD to catch structural anti-patterns before merging pull requests! 🛡️🔍',
    badge1: '🛡️ Well-Architected Governance',
    badge2: '🔍 CI/CD Linting Rules',
  },
  {
    file: 'scene-editorial-api-platform.webp',
    title: 'Enterprise API Platform Architecture',
    sceneTag: 'scene theme=editorial',
    stickyNote: '📰 <b>Editorial Style:</b><br/>Structured gateway, microservices, and database clustering in warm cream aesthetics.',
    explanation: '<b>Enterprise API Platform:</b><br/>Multi-tier gateway routing requests to auth, user, and inventory microservices with distributed database caching! 🏛️⚡',
    badge1: '🏛️ Enterprise API Gateway',
    badge2: '⚡ High-Throughput Microservices',
  },
];

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

    /* Ambient soft background glows */
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

    /* Header Bar */
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

    /* Main Container (occupies almost the full screen) */
    .main-stage {
      position: relative;
      width: 100%;
      height: 804px;
      z-index: 10;
    }

    /* Large Dominant Diagram Window */
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

    /* Larger Sticky Note at Bottom-Left Pinned by 3D Icon */
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

    /* Mascot Overlapping Bottom-Right Corner Naturally */
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

    /* Speech bubble positioned neatly above mascot */
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

    /* Small cute sparkles near mascot wand */
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

  <!-- Header Bar -->
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

  <!-- Main Stage with Large Dominant Window -->
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

    <!-- Larger Sticky Note at Bottom-Left Pinned by 3D Icon -->
    <div class="sticky-note-container">
      <img src="${icon3dBase64}" class="sticky-pin-icon" alt="3D Pin" />
      <div class="sticky-note-card">
        ${meta.stickyNote}
      </div>
    </div>

    <!-- Mascot at Bottom-Right Corner -->
    <div class="mascot-wrapper">
      <div class="mascot-bubble">
        <div class="bubble-badge">✨ Markdy Explains</div>
        <div class="bubble-content">
          ${meta.explanation}
        </div>
      </div>
      <img src="${mascotBase64}" class="mascot-img" alt="Markdy Mascot" />
    </div>

    <!-- Subtle sparkles near the wand tip only -->
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

async function run() {
  console.log(`🎨 Generating ${scenesMetadata.length} cute, decorated landscape images...`);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: 1600,
    height: 900,
    deviceScaleFactor: 2, // 2x crisp Retina output
  });

  for (const meta of scenesMetadata) {
    console.log(`✨ Decorating ${meta.file}...`);
    const html = generateHTML(meta);
    if (!html) continue;

    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 400));

    const outWebpDocs = path.join(OUTPUT_DOCS_DIR, meta.file);
    const outWebpPublic = path.join(OUTPUT_PUBLIC_DIR, meta.file);

    await page.screenshot({ path: outWebpDocs, type: 'webp', quality: 95 });
    fs.copyFileSync(outWebpDocs, outWebpPublic);

    console.log(`✅ Saved cute landscape image: ${meta.file}`);
  }

  await browser.close();
  console.log('🎉 All images decorated with Mascot, wand sparkles, sticky notes, and landscape frames!');
}

run().catch(err => {
  console.error('Fatal error during image decoration:', err);
  process.exit(1);
});
