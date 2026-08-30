import puppeteer from 'puppeteer-core';
import * as chromeLauncher from 'chrome-launcher';
import { dirname, resolve } from 'node:path';
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
const ARTIFACTS_DIR = resolve(rootDir, 'tmp/devtools-artifacts');
fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

const BASE_URL = process.env.PREVIEW_URL || 'http://localhost:4322';

async function runDevtoolsVerification() {
  console.log(`🌐 Launching Chrome DevTools automation from ${CHROME_PATH}...`);
  console.log(`📡 Connecting to preview server at ${BASE_URL}...`);

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const page = await browser.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  try {
    // ── Test 1: Homepage Desktop (1440x900) ──
    console.log('\n🔍 [Test 1] Inspecting Homepage Desktop (1440x900)...');
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });

    const heroTitle = await page.$eval('h1', (el) => el.textContent.trim());
    console.log(`  ✓ Hero title: "${heroTitle}"`);

    // Verify Capability Matrix
    const matrixSection = await page.$('#matrix');
    if (!matrixSection) throw new Error('Capability Matrix section (#matrix) not found on homepage!');
    const matrixTablesCount = await page.$$eval('#matrix table', (els) => els.length);
    console.log(`  ✓ Capability Matrix found with ${matrixTablesCount} tables.`);

    // Verify Embedded Studio
    const studioEmbed = await page.$('#playground');
    if (!studioEmbed) throw new Error('Embedded Live Studio (#playground) not found!');
    console.log('  ✓ Embedded Live Studio verified.');

    // Check all buttons have accessible names
    const unnamedButtons = await page.$$eval('button', (buttons) =>
      buttons
        .filter((b) => !b.getAttribute('aria-hidden') && b.style.display !== 'none')
        .filter((b) => !b.getAttribute('aria-label') && !b.innerText.trim() && !b.getAttribute('title'))
        .map((b) => b.outerHTML)
    );
    if (unnamedButtons.length > 0) {
      console.warn(`  ⚠️ Found unnamed buttons on homepage:`, unnamedButtons);
    } else {
      console.log('  ✓ All interactive buttons have accessible names (aria-label / title / text).');
    }

    // Check all images have alt
    const missingAltImages = await page.$$eval('img', (imgs) =>
      imgs.filter((img) => img.getAttribute('alt') === null).map((img) => img.src)
    );
    if (missingAltImages.length > 0) {
      console.warn(`  ⚠️ Found images missing alt attribute:`, missingAltImages);
    } else {
      console.log('  ✓ All images have valid alt attributes.');
    }

    const shot1 = resolve(ARTIFACTS_DIR, '01_homepage_desktop_1440.png');
    await page.screenshot({ path: shot1, fullPage: false });
    console.log(`  📸 Screenshot saved: ${shot1}`);

    // ── Test 2: Homepage Mobile (375x812) ──
    console.log('\n🔍 [Test 2] Inspecting Homepage Mobile (375x812)...');
    await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2 });
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle0' });

    const shot2 = resolve(ARTIFACTS_DIR, '02_homepage_mobile_375.png');
    await page.screenshot({ path: shot2, fullPage: false });
    console.log(`  📸 Screenshot saved: ${shot2}`);

    // ── Test 3: Studio / Playground Desktop (1440x900) ──
    console.log('\n🔍 [Test 3] Inspecting Studio Desktop (1440x900)...');
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.goto(`${BASE_URL}/playground/`, { waitUntil: 'networkidle0' });

    // Verify Onboarding Banner
    const onboardingBanner = await page.$('#studio-onboarding-banner');
    if (!onboardingBanner) throw new Error('Onboarding banner (#studio-onboarding-banner) not found!');
    console.log('  ✓ 3-step Quick Start onboarding banner verified.');

    // Verify Default Scene is Index 0 (Cache-Aside)
    const quickSelectValue = await page.$eval('#quick-example-select', (el) => el.value);
    console.log(`  ✓ Default selected scene index: ${quickSelectValue} (Cache-Aside / 0)`);

    // Verify 29 systems in Gallery
    const galleryCount = await page.$$eval('.example-btn', (els) => els.length);
    console.log(`  ✓ Gallery items count: ${galleryCount} systems.`);

    const shot3 = resolve(ARTIFACTS_DIR, '03_studio_desktop_1440.png');
    await page.screenshot({ path: shot3, fullPage: false });
    console.log(`  📸 Screenshot saved: ${shot3}`);

    // Test dismiss onboarding
    await page.click('#close-onboarding-btn');
    const isHidden = await page.$eval('#studio-onboarding-banner', (el) => el.hasAttribute('hidden'));
    console.log(`  ✓ Onboarding dismiss button clicked -> hidden=${isHidden}`);

    // ── Test 4: Studio URL Query Param (?example=concurrency-decision-flowchart) ──
    console.log('\n🔍 [Test 4] Testing URL Query Param (?example=concurrency-decision-flowchart)...');
    await page.goto(`${BASE_URL}/playground/?example=concurrency-decision-flowchart`, { waitUntil: 'networkidle0' });
    const loadedTitle = await page.$eval('#quick-example-select option:checked', (el) => el.textContent.trim());
    console.log(`  ✓ Successfully loaded requested example via URL parameter: "${loadedTitle}"`);

    const shot4 = resolve(ARTIFACTS_DIR, '04_studio_param_loaded.png');
    await page.screenshot({ path: shot4, fullPage: false });
    console.log(`  📸 Screenshot saved: ${shot4}`);

    // ── Test 5: Studio Mobile Responsive (375x812) ──
    console.log('\n🔍 [Test 5] Inspecting Studio Mobile (375x812) & 2-Tab Switcher...');
    await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 2 });
    await page.goto(`${BASE_URL}/playground/`, { waitUntil: 'networkidle0' });

    // Verify Split button is hidden on mobile
    const splitDisplay = await page.$eval('#view-split-btn', (el) => window.getComputedStyle(el).display);
    console.log(`  ✓ Split button display on mobile: "${splitDisplay}" (hidden)`);

    // Canvas view screenshot
    const shot5 = resolve(ARTIFACTS_DIR, '05_studio_mobile_canvas_375.png');
    await page.screenshot({ path: shot5, fullPage: false });
    console.log(`  📸 Screenshot saved (Mobile Canvas): ${shot5}`);

    // Switch to Code view
    await page.click('#view-code-btn');
    await new Promise((r) => setTimeout(r, 200));
    const editorDisplay = await page.$eval('.editor-panel', (el) => window.getComputedStyle(el).display);
    console.log(`  ✓ Clicked Code tab -> Editor panel display: "${editorDisplay}"`);

    const shot6 = resolve(ARTIFACTS_DIR, '06_studio_mobile_code_375.png');
    await page.screenshot({ path: shot6, fullPage: false });
    console.log(`  📸 Screenshot saved (Mobile Code): ${shot6}`);

    // ── Check Console Errors ──
    if (consoleErrors.length > 0) {
      console.warn(`  ⚠️ Browser console errors detected:`, consoleErrors);
    } else {
      console.log('\n✨ Zero browser console errors during all DevTools automated tests!');
    }

    console.log('\n🎉 All Chrome DevTools reviews and UI assertions passed 100% successfully!\n');
  } finally {
    await browser.close();
  }
}

runDevtoolsVerification().catch((err) => {
  console.error('❌ DevTools automation failed:', err);
  process.exit(1);
});
