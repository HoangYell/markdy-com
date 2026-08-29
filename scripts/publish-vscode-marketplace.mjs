#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VSCODE_DIR = path.join(ROOT, "packages", "vscode");

console.log("\n==================================================");
console.log("🚀  Markdy VS Code Extension Release Assistant");
console.log("==================================================\n");

// 1. Read metadata
const pkgJson = JSON.parse(fs.readFileSync(path.join(VSCODE_DIR, "package.json"), "utf8"));
const version = pkgJson.version;
const targetVsix = `markdy-vscode-${version}.vsix`;
const vsixPath = path.join(VSCODE_DIR, targetVsix);

// 2. Clean old .vsix files
for (const f of fs.readdirSync(VSCODE_DIR)) {
  if (f.endsWith(".vsix") && f !== targetVsix) {
    fs.rmSync(path.join(VSCODE_DIR, f), { force: true });
  }
}

// 3. Package extension
console.log(`📦 [1/4] Compiling & Packaging Markdy Extension (v${version})...`);
execSync("pnpm run package", { cwd: VSCODE_DIR, stdio: "inherit" });

if (!fs.existsSync(vsixPath)) {
  console.error(`❌ Packaging failed: ${vsixPath} not found.`);
  process.exit(1);
}

const stats = fs.statSync(vsixPath);
const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
console.log(`\n✅ [2/4] Bundle Ready: ${targetVsix} (${sizeMb} MB)`);

// 4. Copy path to macOS clipboard
try {
  execSync(`printf "%s" "${vsixPath}" | pbcopy`);
  console.log("📋 [3/4] Copied .vsix absolute path to clipboard!");
} catch (_) {}

// 5. Open Chrome to Marketplace and Reveal File in Finder
console.log("🌐 [4/4] Opening Marketplace Dashboard & Finder window...");

const dashboardUrl = "https://marketplace.visualstudio.com/manage/publishers/hoangyell";

try {
  // Open Dashboard in Chrome
  execSync(`open -a "Google Chrome" "${dashboardUrl}"`);
} catch (_) {
  try {
    execSync(`open "${dashboardUrl}"`);
  } catch (_) {}
}

try {
  // Reveal VSIX file in Finder
  execSync(`open -R "${vsixPath}"`);
} catch (_) {}

console.log("\n" + "=".repeat(50));
console.log(`🎉 Ready to Ship Markdy v${version}!`);
console.log("=".repeat(50));
console.log("\n👉 Smart 2-Click Steps:");
console.log(`   1. In the open Chrome window (${dashboardUrl}):`);
console.log("      • Click '...' next to Markdy -> select 'Update'");
console.log("        (or click 'New extension' -> 'Visual Studio Code')");
console.log(`   2. Drag '${targetVsix}' from the Finder window into the upload box.`);
console.log("   3. Click 'Upload' -> Done! 🚀\n");
console.log(`📁 File Location: ${vsixPath}`);
console.log("=".repeat(50) + "\n");
