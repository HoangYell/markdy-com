import { spawn } from "node:child_process";
import readline from "node:readline";

async function runMcpClient(targetUrl) {
  console.log(`\n🌐 Launching chrome-devtools-mcp to visit: ${targetUrl}...`);

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
    // 1. Initialize MCP connection
    console.log(" Initializing MCP session...");
    await sendRpc("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "markdy-devtools-client", version: "1.0.0" },
    });

    // 2. List tools
    const toolsRes = await sendRpc("tools/list");
    const toolNames = toolsRes.tools?.map((t) => t.name) || [];
    console.log(" Available Chrome DevTools Tools:", toolNames.join(", "));

    // 3. Navigate to target URL
    console.log(` Navigating page to ${targetUrl}...`);
    const navRes = await sendRpc("tools/call", {
      name: "navigate_page",
      arguments: { url: targetUrl },
    });
    console.log(" Navigation result:", JSON.stringify(navRes));

    // Wait 3 seconds for client scripts to hydrate
    await new Promise((r) => setTimeout(r, 3000));

    // 4. Take Snapshot
    if (toolNames.includes("take_snapshot")) {
      console.log("\n📸 Taking Accessibility / DOM Snapshot via Chrome DevTools MCP...");
      const snapshotRes = await sendRpc("tools/call", {
        name: "take_snapshot",
        arguments: {},
      });
      const snapshotText = snapshotRes.content?.[0]?.text || JSON.stringify(snapshotRes);
      console.log("--- Snapshot Preview (first 1500 chars) ---");
      console.log(snapshotText.slice(0, 1500));
      console.log("--- [Total snapshot length: " + snapshotText.length + " chars] ---");
    }

    // 5. Evaluate Page State & Interactive Elements
    if (toolNames.includes("evaluate_script")) {
      console.log("\n Inspecting Page State with evaluate_script...");
      const evalRes = await sendRpc("tools/call", {
        name: "evaluate_script",
        arguments: {
          function: `() => {
            const stage = document.getElementById('stage');
            const nodes = stage ? stage.querySelectorAll('.markdy-node').length : 0;
            const tryChips = document.querySelectorAll('.try-chip-btn').length;
            const themeChips = document.querySelectorAll('.theme-chip').length;
            const ingestionCards = document.querySelectorAll('.ingestion-card').length;
            const h1 = document.querySelector('h1')?.textContent?.trim();
            const errors = document.querySelectorAll('.parse-error').length;
            return {
              title: document.title,
              h1,
              stageFound: !!stage,
              initialRenderedNodes: nodes,
              interactiveTryChips: tryChips,
              themeChips,
              ingestionCards,
              parseErrors: errors
            };
          }`,
        },
      });
      console.log(" Page Analysis Result:", JSON.stringify(evalRes, null, 2));

      // Test clicking on type=layers layout chip
      console.log("\n🖱️ Testing Click on 'type=layers' layout engine chip...");
      const clickRes = await sendRpc("tools/call", {
        name: "evaluate_script",
        arguments: {
          function: `() => {
            const btn = document.querySelector('button.try-chip-btn[data-snippet*="type=layers"]');
            if (btn) {
              btn.click();
              return "Clicked 'type=layers' button successfully";
            }
            return "Button not found";
          }`,
        },
      });
      console.log(" Click trigger:", JSON.stringify(clickRes));

      await new Promise((r) => setTimeout(r, 1500));

      const afterClickEval = await sendRpc("tools/call", {
        name: "evaluate_script",
        arguments: {
          function: `() => {
            const stage = document.getElementById('stage');
            const nodes = stage ? Array.from(stage.querySelectorAll('.markdy-node')).map(n => n.textContent?.trim()) : [];
            const errors = stage ? stage.querySelectorAll('.parse-error').length : 0;
            return {
              renderedNodes: nodes,
              nodeCount: nodes.length,
              hasErrors: errors > 0
            };
          }`,
        },
      });
      console.log(" After 'type=layers' Click State in Stage:", JSON.stringify(afterClickEval, null, 2));
    }

    console.log("\n✅ Chrome DevTools MCP inspection completed successfully!");
  } catch (err) {
    console.error("❌ Error during Chrome DevTools MCP run:", err);
  } finally {
    mcp.kill();
  }
}

const target = process.argv[2] || "http://localhost:4322/";
runMcpClient(target).catch(console.error);
