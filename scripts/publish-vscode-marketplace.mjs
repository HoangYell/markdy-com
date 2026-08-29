#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VSCODE_DIR = path.join(ROOT, "packages", "vscode");

console.log("📦 Packaging Markdy VS Code extension...");
execSync("pnpm run package", { cwd: VSCODE_DIR, stdio: "inherit" });

// Find the generated .vsix file
const files = fs.readdirSync(VSCODE_DIR);
const vsixFile = files.find((f) => f.endsWith(".vsix") && f.startsWith("markdy-vscode-"));

if (!vsixFile) {
  console.error("❌ No .vsix file found in packages/vscode!");
  process.exit(1);
}

const vsixPath = path.join(VSCODE_DIR, vsixFile);
const vsixStats = fs.statSync(vsixPath);
console.log(`✅ Packaged VSIX: ${vsixFile} (${(vsixStats.size / (1024 * 1024)).toFixed(2)} MB)`);

const vscePat = process.env.VSCE_PAT;

if (vscePat) {
  console.log("🔑 Publishing to VS Code Marketplace via VSCE_PAT...");
  execSync(`npx @vscode/vsce publish --no-dependencies -p ${vscePat}`, {
    cwd: VSCODE_DIR,
    stdio: "inherit",
  });
  console.log("🎉 Published successfully to VS Code Marketplace!");
  process.exit(0);
}

console.log("🌐 Publishing directly via your active Chrome publisher session...");

const vsixBuffer = fs.readFileSync(vsixPath);
const PORT = 45678;

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Content-Type", "application/octet-stream");
  res.end(vsixBuffer);
});

server.listen(PORT, "127.0.0.1", () => {
  const navOsa = `
  tell application "Google Chrome"
      tell front window
          set URL of active tab to "https://marketplace.visualstudio.com/manage/publishers/hoangyell"
      end tell
  end tell
  `;
  try {
    execSync("osascript", { input: navOsa });
  } catch (err) {
    console.error("❌ Failed to navigate Chrome:", err.message);
    server.close();
    process.exit(1);
  }

  setTimeout(() => {
    const jsCode = `
    (async function() {
        var newExtBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("New extension"));
        if (newExtBtn) newExtBtn.click();

        await new Promise(r => setTimeout(r, 400));
        var vsCodeItem = Array.from(document.querySelectorAll("[role=menuitem], button, a")).find(el => el.innerText.includes("Visual Studio Code"));
        if (vsCodeItem) vsCodeItem.click();

        await new Promise(r => setTimeout(r, 600));
        var res = await fetch("http://127.0.0.1:${PORT}/extension.vsix");
        var blob = await res.blob();
        var file = new File([blob], "${vsixFile}", { type: "application/octet-stream" });
        var dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        var input = document.querySelector("input[type=file]");
        if (input) {
            input.files = dataTransfer.files;
            input.dispatchEvent(new Event("change", { bubbles: true }));
            input.dispatchEvent(new Event("input", { bubbles: true }));
        }

        await new Promise(r => setTimeout(r, 800));
        var uploadBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.trim() === "Upload");
        if (uploadBtn) uploadBtn.click();

        return "SUCCESS";
    })()
    `;

    const escapedJs = jsCode.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const uploadOsa = `tell application "Google Chrome" to tell active tab of front window to execute javascript "${escapedJs}"`;

    try {
      execSync("osascript", { input: uploadOsa });
      console.log("🚀 VSIX upload submitted to Visual Studio Marketplace dashboard!");
      console.log("✨ Automated verification in progress. Extension will update globally in ~1-2 minutes.");
    } catch (err) {
      console.error("❌ Failed to trigger upload:", err.message);
    } finally {
      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 2000);
    }
  }, 3500);
});
