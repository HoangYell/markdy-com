#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VSCODE_DIR = path.join(ROOT, "packages", "vscode");

console.log("📦 Packaging VS Code extension...");
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
console.log(`✅ Found VSIX: ${vsixFile} (${(vsixStats.size / (1024 * 1024)).toFixed(2)} MB)`);

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

console.log("🌐 VSCE_PAT not found in environment. Using direct Chrome dashboard upload...");

const b64 = fs.readFileSync(vsixPath).toString("base64");

const jsCode = `
(function() {
    var newExtBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.includes("New extension"));
    if (newExtBtn) {
        newExtBtn.click();
        setTimeout(function() {
            var vsCodeItem = Array.from(document.querySelectorAll("[role=menuitem], button, a")).find(el => el.innerText.includes("Visual Studio Code"));
            if (vsCodeItem) vsCodeItem.click();

            setTimeout(function() {
                var base64Data = "${b64}";
                var byteCharacters = atob(base64Data);
                var byteNumbers = new Array(byteCharacters.length);
                for (var i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                var byteArray = new Uint8Array(byteNumbers);
                var blob = new Blob([byteArray], { type: "application/octet-stream" });
                var file = new File([blob], "${vsixFile}", { type: "application/octet-stream" });
                var dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                var input = document.querySelector("input[type=file]");
                if (!input) return;
                input.files = dataTransfer.files;
                input.dispatchEvent(new Event("change", { bubbles: true }));
                input.dispatchEvent(new Event("input", { bubbles: true }));

                setTimeout(function() {
                    var uploadBtn = Array.from(document.querySelectorAll("button")).find(b => b.innerText.trim() === "Upload");
                    if (uploadBtn) uploadBtn.click();
                }, 1000);
            }, 1000);
        }, 500);
    }
    return "UPLOAD_INITIATED";
})()
`;

const escapedJs = jsCode.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

const osaScript = `
tell application "Google Chrome"
    tell front window
        set URL of active tab to "https://marketplace.visualstudio.com/manage/publishers/hoangyell"
        delay 3
        tell active tab
            execute javascript "${escapedJs}"
        end tell
    end tell
end tell
`;

try {
  execSync("osascript", { input: osaScript, stdio: "inherit" });
  console.log("🚀 VSIX upload submitted to Visual Studio Marketplace dashboard in Chrome!");
} catch (err) {
  console.error("❌ Failed to communicate with Chrome:", err.message);
  process.exit(1);
}
