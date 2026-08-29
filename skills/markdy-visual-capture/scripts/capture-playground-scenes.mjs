import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../..');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const RAW_OUTPUT_DIR = path.join(rootDir, 'tmp/raw-captures');
fs.mkdirSync(RAW_OUTPUT_DIR, { recursive: true });

async function run() {
  console.log('🚀 Launching headless Chrome for high-DPI playground capture...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: 1600,
    height: 1000,
    deviceScaleFactor: 2, // 2x crisp Retina output
  });

  console.log('🌐 Navigating to Markdy playground...');
  await page.goto('http://markdy.com/playground/', { waitUntil: 'networkidle2', timeout: 30000 });

  // Get available example scene keys
  const exampleKeys = await page.evaluate(() => {
    const select = document.querySelector('#quick-example-select');
    if (!select) return [];
    return Array.from(select.options).map(opt => ({
      value: opt.value,
      text: opt.textContent.trim(),
    }));
  });

  console.log(`📋 Found ${exampleKeys.length} playground scenes.`);

  // Switch to canvas-only clean view
  await page.evaluate(() => {
    const canvasBtn = document.querySelector('#view-canvas-btn');
    if (canvasBtn) canvasBtn.click();

    // Hide unnecessary editor header bars or floating popups if present
    const header = document.querySelector('header');
    if (header) header.style.display = 'none';
  });

  for (const item of exampleKeys) {
    console.log(`📸 Capturing scene: ${item.value} (${item.text})...`);
    await page.evaluate((val) => {
      const select = document.querySelector('#quick-example-select');
      if (select) {
        select.value = val;
        select.dispatchEvent(new Event('change'));
      }
    }, item.value);

    // Wait for parse & layout
    await new Promise(r => setTimeout(r, 600));

    // Scrub timeline to 80% progress
    await page.evaluate(() => {
      const range = document.querySelector('#timeline-range');
      if (range) {
        range.value = Math.floor((range.max || 100) * 0.8);
        range.dispatchEvent(new Event('input'));
      }
      const fitBtn = document.querySelector('#canvas-zoom-fit-btn');
      if (fitBtn) fitBtn.click();
    });

    await new Promise(r => setTimeout(r, 400));

    const canvasEl = await page.$('#diagram-stage') || await page.$('.diagram-canvas') || page;
    const outFilename = `scene-${item.value}.webp`;
    const outPath = path.join(RAW_OUTPUT_DIR, outFilename);

    await canvasEl.screenshot({ path: outPath, type: 'webp', quality: 95 });
    console.log(`✅ Saved raw capture: ${outFilename}`);
  }

  await browser.close();
  console.log(`🎉 Raw capture completed! Files in: ${RAW_OUTPUT_DIR}`);
}

run().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
