import { spawn } from "node:child_process";

const WebSocket = globalThis.WebSocket;

const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 9222;
const TARGET_URL = "http://localhost:4322/";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForCdp(maxRetries = 20) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      if (res.ok) {
        const pages = await res.json();
        if (pages.length > 0) return pages[0];
      }
    } catch {
      // Retry
    }
    await sleep(200);
  }
  throw new Error("Could not connect to Chrome DevTools Protocol endpoint.");
}

async function runDevToolsAudit() {
  console.log("🚀 Launching Headless Chrome for DevTools Audit...");
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      "--headless=new",
      `--remote-debugging-port=${PORT}`,
      "--user-data-dir=/tmp/chrome-devtools-audit-profile",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  let ws;
  try {
    const page = await waitForCdp();
    console.log(" Connected to Chrome DevTools target:", page.title || page.url);

    ws = new WebSocket(page.webSocketDebuggerUrl);

    let idCounter = 1;
    const callbacks = new Map();

    const send = (method, params = {}) => {
      return new Promise((resolve, reject) => {
        const id = idCounter++;
        callbacks.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    };

    const consoleErrors = [];
    const consoleWarns = [];
    const exceptions = [];

    await new Promise((resolve) => ws.on("open", resolve));

    ws.on("message", (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id && callbacks.has(msg.id)) {
        const { resolve, reject } = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      } else if (msg.method === "Runtime.consoleAPICalled") {
        if (msg.params.type === "error") {
          consoleErrors.push(msg.params.args.map((a) => a.value || a.description).join(" "));
        } else if (msg.params.type === "warning") {
          consoleWarns.push(msg.params.args.map((a) => a.value || a.description).join(" "));
        }
      } else if (msg.method === "Runtime.exceptionThrown") {
        exceptions.push(msg.params.exceptionDetails.text + " " + (msg.params.exceptionDetails.exception?.description || ""));
      }
    });

    console.log(" Enabling DevTools domains (Page, Runtime, DOM, CSS)...");
    await send("Page.enable");
    await send("Runtime.enable");
    await send("DOM.enable");
    await send("CSS.enable");

    console.log(` Navigating to ${TARGET_URL}...`);
    await send("Page.navigate", { url: TARGET_URL });
    await sleep(2500);

    const evalInPage = async (expr) => {
      const res = await send("Runtime.evaluate", {
        expression: expr,
        returnByValue: true,
        awaitPromise: true,
      });
      return res.result?.value;
    };

    console.log("\n📊 --- Chrome DevTools Inspection Results ---");

    // 1. Check title & core headings
    const pageMeta = await evalInPage(`({
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.trim(),
      h2Count: document.querySelectorAll('h2').length,
      sections: Array.from(document.querySelectorAll('section')).map(s => s.id).filter(Boolean)
    })`);
    console.log(" Page Title:", pageMeta.title);
    console.log(" Main H1:", pageMeta.h1);
    console.log(" Core Section IDs Found:", pageMeta.sections);

    // 2. Test Playground initialization and rendering
    const playgroundState = await evalInPage(`(() => {
      const stage = document.getElementById('stage');
      const nodes = stage.querySelectorAll('.markdy-node');
      const edges = stage.querySelectorAll('svg.markdy-diagram-svg path');
      const errors = stage.querySelectorAll('.parse-error');
      return {
        stageExists: !!stage,
        nodeCount: nodes.length,
        hasErrors: errors.length > 0,
        errorText: errors[0]?.textContent || null,
      };
    })()`);
    console.log(" Playground Rendered Initial Nodes:", playgroundState.nodeCount, "| Has Errors:", playgroundState.hasErrors);

    // 3. Test clicking a layout engine chip (e.g. type=layers)
    console.log("\n Testing Layout Engine Try Chip (type=layers)...");
    await evalInPage(`(() => {
      const btn = document.querySelector('button.try-chip-btn[data-snippet*="type=layers"]');
      if (btn) btn.click();
    })()`);
    await sleep(1000);

    const afterLayersClick = await evalInPage(`(() => {
      const stage = document.getElementById('stage');
      const nodes = stage.querySelectorAll('.markdy-node');
      const errors = stage.querySelectorAll('.parse-error');
      return {
        nodeCount: nodes.length,
        hasErrors: errors.length > 0,
        errorText: errors[0]?.textContent || null,
      };
    })()`);
    console.log(" After 'type=layers' Click:", afterLayersClick);

    // 4. Test clicking a theme chip (e.g. theme=terminal)
    console.log("\n Testing Theme Preview Chip (theme=terminal)...");
    await evalInPage(`(() => {
      const btn = document.querySelector('.theme-chip button.try-chip-btn[data-snippet*="theme=terminal"]');
      if (btn) btn.click();
    })()`);
    await sleep(1000);

    const afterThemeClick = await evalInPage(`(() => {
      const stage = document.getElementById('stage');
      const nodes = stage.querySelectorAll('.markdy-node');
      const errors = stage.querySelectorAll('.parse-error');
      return {
        nodeCount: nodes.length,
        hasErrors: errors.length > 0,
        errorText: errors[0]?.textContent || null,
      };
    })()`);
    console.log(" After 'theme=terminal' Click:", afterThemeClick);

    // 5. Test clicking Universal Ingestion Transpiled Scene Preview
    console.log("\n Testing Ingestion Preview (Docker Compose)...");
    await evalInPage(`(() => {
      const btn = document.querySelector('.ingestion-try-btn[data-snippet*="Docker Compose"]');
      if (btn) btn.click();
    })()`);
    await sleep(1000);

    const afterIngestionClick = await evalInPage(`(() => {
      const stage = document.getElementById('stage');
      const nodes = stage.querySelectorAll('.markdy-node');
      const errors = stage.querySelectorAll('.parse-error');
      return {
        nodeCount: nodes.length,
        hasErrors: errors.length > 0,
        errorText: errors[0]?.textContent || null,
      };
    })()`);
    console.log(" After Docker Compose Transpile Preview Click:", afterIngestionClick);

    // 6. Check for horizontal layout overflow
    const overflowCheck = await evalInPage(`(() => {
      const docW = document.documentElement.scrollWidth;
      const winW = window.innerWidth;
      const elementsWithOverflow = [];
      document.querySelectorAll('*').forEach(el => {
        if (el.scrollWidth > winW + 5 && el.tagName !== 'PRE' && el.tagName !== 'CODE' && !el.classList.contains('ingestion-cmd-wrap')) {
          elementsWithOverflow.push(el.tagName + (el.className ? '.' + el.className : ''));
        }
      });
      return {
        docScrollWidth: docW,
        windowInnerWidth: winW,
        hasGlobalOverflow: docW > winW,
        overflowingElements: elementsWithOverflow.slice(0, 5)
      };
    })()`);
    console.log("\n📐 Layout & Viewport Geometry:", overflowCheck);

    // 7. Check runtime console errors and unhandled exceptions
    console.log("\n DevTools Console Audit:");
    console.log("  - Unhandled Exceptions:", exceptions.length > 0 ? exceptions : "None (0 errors)");
    console.log("  - Console Errors:", consoleErrors.length > 0 ? consoleErrors : "None (0 errors)");
    console.log("  - Console Warnings:", consoleWarns.length > 0 ? consoleWarns : "None (0 warnings)");

    console.log("\n🎉 Chrome DevTools Review Finished Successfully!");
  } finally {
    if (ws) ws.close();
    chromeProcess.kill();
  }
}

runDevToolsAudit().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
