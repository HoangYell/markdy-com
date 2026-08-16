import { spawn } from "node:child_process";
import readline from "node:readline";

async function runComprehensiveMcpAudit() {
  console.log("🚀 Starting Comprehensive Chrome DevTools MCP Feature & UI/UX Audit...\n");

  const mcp = spawn(
    "npx",
    ["-y", "chrome-devtools-mcp@latest", "--channel=stable", "--no-usage-statistics"],
    {
      stdio: ["pipe", "pipe", "inherit"],
    }
  );

  const rl = readline.createInterface({ input: mcp.stdout });

  let idCounter = 1;
  const pendingRequests = new Map();

  rl.on("line", (line) => {
    try {
      const msg = JSON.parse(line.trim());
      if (msg.id && pendingRequests.has(msg.id)) {
        const { resolve, reject } = pendingRequests.get(msg.id);
        pendingRequests.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    } catch {
      // Ignore non-json logs
    }
  });

  const sendRpc = (method, params = {}) => {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pendingRequests.set(id, { resolve, reject });
      const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
      mcp.stdin.write(payload);
    });
  };

  try {
    await sendRpc("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "markdy-comprehensive-auditor", version: "1.0.0" },
    });

    const results = {
      homepage: {},
      playground: {},
      layoutsTested: [],
      themesTested: [],
      ingestionTested: [],
      governanceAuditTested: false,
      diagnostics: [],
    };

    // ─────────────────────────────────────────────────────────────────
    // TEST 1: Homepage & All 17 Layouts + 8 Themes
    // ─────────────────────────────────────────────────────────────────
    console.log("📍 [1/3] Navigating to Homepage (http://localhost:4322/)...");
    await sendRpc("tools/call", {
      name: "navigate_page",
      arguments: { url: "http://localhost:4322/" },
    });
    await new Promise((r) => setTimeout(r, 2000));

    // Test each layout chip
    const layouts = [
      "architecture", "flowchart", "tree", "state", "sequence",
      "layers", "nested", "swimlane", "timeline", "gantt",
      "radar", "venn", "quadrant", "pyramid", "medallion", "flywheel", "constellation"
    ];

    console.log("\n🧪 Testing all 17 Layout Engine Try Chips...");
    for (const layout of layouts) {
      const testRes = await sendRpc("tools/call", {
        name: "evaluate_script",
        arguments: {
          function: `(() => {
            const btn = document.querySelector('button.try-chip-btn[data-snippet*="type=${layout}"], button.try-chip-btn[data-snippet*="Microservices Topology"]');
            if (!btn && '${layout}' === 'architecture') {
              const archBtn = document.querySelector('button.try-chip-btn[data-snippet*="Microservices Topology"]');
              if (archBtn) { archBtn.click(); }
            } else if (btn) {
              btn.click();
            }
            const stage = document.getElementById('stage');
            const nodes = stage ? stage.querySelectorAll('.markdy-node').length : 0;
            const errors = stage ? stage.querySelectorAll('.parse-error').length : 0;
            return { layout: '${layout}', nodeCount: nodes, hasErrors: errors > 0, errorText: errors > 0 ? stage.querySelector('.parse-error')?.textContent : null };
          })`,
        },
      });
      const parsedText = testRes.content?.[0]?.text;
      const match = parsedText?.match(/```json\s*([\s\S]*?)\s*```/);
      if (match) {
        const data = JSON.parse(match[1]);
        results.layoutsTested.push(data);
        const status = data.hasErrors ? `❌ ERR: ${data.errorText}` : `✅ OK (${data.nodeCount} nodes)`;
        console.log(`  - Layout '${layout}': ${status}`);
      }
    }

    // Test themes
    const themes = ["paper", "editorial", "terminal", "sketchy", "blueprint", "midnight", "graphite", "nebula"];
    console.log("\n🧪 Testing all 8 Visual Themes...");
    for (const theme of themes) {
      const testRes = await sendRpc("tools/call", {
        name: "evaluate_script",
        arguments: {
          function: `(() => {
            const btn = document.querySelector('.theme-chip button.try-chip-btn[data-snippet*="theme=${theme}"]');
            if (btn) btn.click();
            const stage = document.getElementById('stage');
            const nodes = stage ? stage.querySelectorAll('.markdy-node').length : 0;
            const errors = stage ? stage.querySelectorAll('.parse-error').length : 0;
            return { theme: '${theme}', nodeCount: nodes, hasErrors: errors > 0 };
          })`,
        },
      });
      const parsedText = testRes.content?.[0]?.text;
      const match = parsedText?.match(/```json\s*([\s\S]*?)\s*```/);
      if (match) {
        const data = JSON.parse(match[1]);
        results.themesTested.push(data);
        const status = data.hasErrors ? "❌ Error" : `✅ OK (${data.nodeCount} nodes)`;
        console.log(`  - Theme '${theme}': ${status}`);
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // TEST 2: Dedicated Playground (/playground/) & Governance Audit
    // ─────────────────────────────────────────────────────────────────
    console.log("\n📍 [2/3] Navigating to Dedicated Playground (http://localhost:4322/playground/)...");
    await sendRpc("tools/call", {
      name: "navigate_page",
      arguments: { url: "http://localhost:4322/playground/" },
    });
    await new Promise((r) => setTimeout(r, 2000));

    // Test Governance Audit Button
    console.log("🧪 Testing Governance Audit Panel in Playground...");
    const auditRes = await sendRpc("tools/call", {
      name: "evaluate_script",
      arguments: {
        function: `(() => {
          const auditBtn = document.getElementById('audit-btn');
          if (auditBtn) auditBtn.click();
          const auditPanel = document.getElementById('audit-panel');
          const results = document.getElementById('audit-results');
          return {
            auditPanelVisible: auditPanel ? !auditPanel.hidden : false,
            resultsHtml: results ? results.innerHTML.slice(0, 300) : ''
          };
        })`,
      },
    });
    console.log("  - Audit Panel Trigger Result:", auditRes.content?.[0]?.text);

    // Test Ingestion Modal in Playground
    console.log("\n🧪 Testing Ingestion Transpilers inside Playground Modal...");
    const ingestionFormats = ["mermaid", "compose", "k8s", "terraform", "drawio"];
    for (const fmt of ingestionFormats) {
      const ingRes = await sendRpc("tools/call", {
        name: "evaluate_script",
        arguments: {
          function: `(() => {
            const importBtn = document.getElementById('import-btn');
            if (importBtn) importBtn.click();
            const tab = document.querySelector('.format-tab[data-format="${fmt}"]');
            if (tab) tab.click();
            const doImportBtn = document.getElementById('do-import-btn');
            if (doImportBtn) doImportBtn.click();
            const stage = document.getElementById('stage');
            const nodes = stage ? stage.querySelectorAll('.markdy-node').length : 0;
            const errors = stage ? stage.querySelectorAll('.parse-error').length : 0;
            return { format: '${fmt}', nodeCount: nodes, hasErrors: errors > 0, errorText: errors > 0 ? stage.querySelector('.parse-error')?.textContent : null };
          })`,
        },
      });
      const parsedText = ingRes.content?.[0]?.text;
      const match = parsedText?.match(/```json\s*([\s\S]*?)\s*```/);
      if (match) {
        const data = JSON.parse(match[1]);
        results.ingestionTested.push(data);
        const status = data.hasErrors ? `❌ ERR: ${data.errorText}` : `✅ OK (${data.nodeCount} nodes)`;
        console.log(`  - Ingestion '${fmt}': ${status}`);
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // TEST 3: Documentation & LLM Reference Page (/docs/ and /agent/)
    // ─────────────────────────────────────────────────────────────────
    console.log("\n📍 [3/3] Navigating to Documentation (http://localhost:4322/docs/)...");
    await sendRpc("tools/call", {
      name: "navigate_page",
      arguments: { url: "http://localhost:4322/docs/" },
    });
    await new Promise((r) => setTimeout(r, 1500));

    const docsCheck = await sendRpc("tools/call", {
      name: "evaluate_script",
      arguments: {
        function: `(() => {
          const docCards = document.querySelectorAll('.doc-card').length;
          const links = Array.from(document.querySelectorAll('.doc-card')).map(a => ({ title: a.querySelector('h2')?.textContent, href: a.getAttribute('href') }));
          return { docCardsCount: docCards, sampleLinks: links.slice(0, 5) };
        })`,
      },
    });
    console.log("  - Docs Portal Check:", docsCheck.content?.[0]?.text);

    console.log("\n✨ Comprehensive Chrome DevTools MCP Audit Finished!");
  } catch (err) {
    console.error("❌ Error during audit:", err);
  } finally {
    mcp.kill();
  }
}

runComprehensiveMcpAudit().catch(console.error);
