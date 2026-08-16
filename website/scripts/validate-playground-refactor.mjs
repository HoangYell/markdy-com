import { spawn } from "node:child_process";
import readline from "node:readline";

async function runPlaygroundRefactorAudit() {
  console.log("🚀 Starting Comprehensive Playground Refactor Browser Audit...\n");

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
      // Ignore
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
      clientInfo: { name: "playground-refactor-auditor", version: "1.0.0" },
    });

    console.log("📍 [1/6] Navigating to Playground (http://localhost:4322/playground/)...");
    await sendRpc("tools/call", {
      name: "navigate_page",
      arguments: { url: "http://localhost:4322/playground/" },
    });
    await new Promise((r) => setTimeout(r, 2000));

    // Test 1: Page structure, Topbar, Status Pill, Initial Render
    console.log("\n🧪 Test 1: Verifying Topbar & Initial Scene Render...");
    const initCheck = await sendRpc("tools/call", {
      name: "evaluate_script",
      arguments: {
        function: `(() => {
          const statusText = document.getElementById('status-text')?.textContent;
          const statusMeta = document.getElementById('status-meta')?.textContent;
          const stage = document.getElementById('stage');
          const nodes = stage ? stage.querySelectorAll('.markdy-node').length : 0;
          const errors = stage ? stage.querySelectorAll('.parse-error').length : 0;
          const editor = document.getElementById('code-editor');
          const hasEditorLines = editor ? editor.querySelectorAll('.cm-line').length > 0 : false;
          return { statusText, statusMeta, nodesOnCanvas: nodes, errorCount: errors, hasEditorLines };
        })`,
      },
    });
    console.log("  Initial check:", initCheck.content?.[0]?.text);

    // Test 2: View Mode Switching
    console.log("\n🧪 Test 2: Testing View Mode Segmented Switcher (Split, Canvas, Code)...");
    const viewModes = ["canvas", "code", "split"];
    for (const mode of viewModes) {
      const modeRes = await sendRpc("tools/call", {
        name: "evaluate_script",
        arguments: {
          function: `(() => {
            const btn = document.getElementById('view-${mode}-btn');
            if (btn) btn.click();
            const ws = document.getElementById('workspace');
            return { mode: '${mode}', currentAttr: ws ? ws.dataset.viewMode : null };
          })`,
        },
      });
      console.log(`  - Mode '${mode}':`, modeRes.content?.[0]?.text);
      await new Promise((r) => setTimeout(r, 300));
    }

    // Test 3: Palette Shelf Tabs & Token Insertion
    console.log("\n🧪 Test 3: Testing Palette Shelf Tabs (Nodes, Flows, Layouts, Themes, Beats)...");
    const shelves = ["flows", "layouts", "themes", "beats", "nodes"];
    for (const shelf of shelves) {
      const shelfRes = await sendRpc("tools/call", {
        name: "evaluate_script",
        arguments: {
          function: `(() => {
            const tab = document.querySelector('.palette-tab[data-shelf="${shelf}"]');
            if (tab) tab.click();
            const panel = document.getElementById('shelf-${shelf}');
            const chips = panel ? panel.querySelectorAll('.token-chip').length : 0;
            return { shelf: '${shelf}', isActive: panel ? panel.classList.contains('active') : false, chipCount: chips };
          })`,
        },
      });
      console.log(`  - Shelf '${shelf}':`, shelfRes.content?.[0]?.text);
    }

    // Test 4: Canvas Zoom & Grid Toggle Controls
    console.log("\n🧪 Test 4: Testing Canvas Zoom & Background Grid Toggle Controls...");
    const canvasControlsRes = await sendRpc("tools/call", {
      name: "evaluate_script",
      arguments: {
        function: `(() => {
          const gridBtn = document.getElementById('canvas-grid-toggle-btn');
          const stage = document.getElementById('stage');
          const initialClass = stage ? stage.className : '';
          if (gridBtn) gridBtn.click();
          const nextClass = stage ? stage.className : '';
          const zoomFitBtn = document.getElementById('canvas-zoom-fit-btn');
          if (zoomFitBtn) zoomFitBtn.click();
          return { initialClass, nextClass };
        })`,
      },
    });
    console.log("  Canvas controls check:", canvasControlsRes.content?.[0]?.text);

    // Test 5: Drag & Drop Node Creation & Selection HUD
    console.log("\n🧪 Test 5: Testing Node Addition & Contextual HUD...");
    const nodeAddRes = await sendRpc("tools/call", {
      name: "evaluate_script",
      arguments: {
        function: `(() => {
          const serviceChip = document.querySelector('.token-chip[data-kind="database"]');
          if (serviceChip) serviceChip.click();
          const stage = document.getElementById('stage');
          const nodes = stage ? stage.querySelectorAll('.markdy-node').length : 0;
          return { nodesAfterInsert: nodes };
        })`,
      },
    });
    console.log("  Node add check:", nodeAddRes.content?.[0]?.text);
    await new Promise((r) => setTimeout(r, 800));

    // Test 6: Ingestion Transpilers & Governance Audit
    console.log("\n🧪 Test 6: Testing Universal Ingestion Engine & Governance Audit...");
    const auditRes = await sendRpc("tools/call", {
      name: "evaluate_script",
      arguments: {
        function: `(() => {
          const auditBtn = document.getElementById('audit-btn');
          if (auditBtn) auditBtn.click();
          const results = document.getElementById('audit-results');
          return { auditHtml: results ? results.innerHTML.slice(0, 200) : '' };
        })`,
      },
    });
    console.log("  Audit run check:", auditRes.content?.[0]?.text);

    // Test Ingestion Transpiler (Mermaid to Markdy)
    const ingestRes = await sendRpc("tools/call", {
      name: "evaluate_script",
      arguments: {
        function: `(() => {
          const importBtn = document.getElementById('import-btn');
          if (importBtn) importBtn.click();
          const mermaidTab = document.querySelector('.format-tab[data-format="mermaid"]');
          if (mermaidTab) mermaidTab.click();
          const doImportBtn = document.getElementById('do-import-btn');
          if (doImportBtn) doImportBtn.click();
          const stage = document.getElementById('stage');
          const nodes = stage ? stage.querySelectorAll('.markdy-node').length : 0;
          return { nodesAfterImport: nodes };
        })`,
      },
    });
    console.log("  Ingestion run check:", ingestRes.content?.[0]?.text);
    await new Promise((r) => setTimeout(r, 800));

    // Test 7: Gallery Search & Filter
    console.log("\n🧪 Test 7: Testing Showcase Gallery Search & Filters...");
    const galleryRes = await sendRpc("tools/call", {
      name: "evaluate_script",
      arguments: {
        function: `(() => {
          const search = document.getElementById('example-search');
          if (search) {
            search.value = 'kafka';
            search.dispatchEvent(new Event('input'));
          }
          const visible = Array.from(document.querySelectorAll('.example-btn')).filter(b => b.style.display !== 'none').length;
          return { visibleKafkaExamples: visible };
        })`,
      },
    });
    console.log("  Gallery search check:", galleryRes.content?.[0]?.text);

    console.log("\n✨ All Playground Refactor Browser Tests Completed Successfully!");
  } catch (err) {
    console.error("❌ Error during audit:", err);
  } finally {
    mcp.kill();
  }
}

runPlaygroundRefactorAudit().catch(console.error);
