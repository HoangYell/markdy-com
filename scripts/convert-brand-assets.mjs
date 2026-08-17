import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const MASCOT_DIR = path.join(rootDir, 'docs/images/mascot');
const PUBLIC_IMGS_DIR = path.join(rootDir, 'website/public/images');
const ICON_SVG_PATH = path.join(MASCOT_DIR, 'icon.svg');

async function convertImage(page, inputPath, outputs, { width, height, transparent = true }) {
  if (!fs.existsSync(inputPath)) {
    console.warn(`File not found: ${inputPath}`);
    return;
  }
  const base64 = `data:image/png;base64,${fs.readFileSync(inputPath).toString('base64')}`;
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body, html { width: ${width}px; height: ${height}px; overflow: hidden; background: ${transparent ? 'transparent' : '#000'}; }
          img { width: 100%; height: 100%; object-fit: contain; }
        </style>
      </head>
      <body>
        <img src="${base64}" />
      </body>
    </html>
  `, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 150));

  for (const out of outputs) {
    const outDir = path.dirname(out);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    await page.screenshot({ path: out, type: 'webp', quality: 95, omitBackground: transparent });
    console.log(`✅ Saved: ${path.relative(rootDir, out)}`);
  }
}

async function convert() {
  console.log('🔄 Converting and updating all brand assets...');

  // 1. Copy icon.svg to website/public/
  if (fs.existsSync(ICON_SVG_PATH)) {
    const iconSvgContent = fs.readFileSync(ICON_SVG_PATH, 'utf-8');
    fs.writeFileSync(path.join(rootDir, 'website/public/icon.svg'), iconSvgContent);
    fs.writeFileSync(path.join(rootDir, 'website/public/favicon.svg'), iconSvgContent);
    console.log('✅ Updated website/public/icon.svg & favicon.svg with vector hexagon M mark.');
  }

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // 2. Convert OG Image (1200x630)
  await convertImage(
    page,
    path.join(MASCOT_DIR, 'og-markdy.png'),
    [
      path.join(MASCOT_DIR, 'og-markdy.webp'),
      path.join(rootDir, 'website/public/og-image.webp'),
      path.join(PUBLIC_IMGS_DIR, 'og-markdy.webp'),
    ],
    { width: 1200, height: 630, transparent: false }
  );

  // 3. Convert transparent Mascot (markdy.png)
  await convertImage(
    page,
    path.join(MASCOT_DIR, 'markdy.png'),
    [
      path.join(MASCOT_DIR, 'markdy.webp'),
      path.join(PUBLIC_IMGS_DIR, 'mascot.webp'),
    ],
    { width: 800, height: 800, transparent: true }
  );

  // 4. Convert 3D Brand Wordmark (markdy-com.png)
  await convertImage(
    page,
    path.join(MASCOT_DIR, 'markdy-com.png'),
    [
      path.join(MASCOT_DIR, 'markdy-com.webp'),
      path.join(PUBLIC_IMGS_DIR, 'markdy-com.webp'),
    ],
    { width: 1200, height: 400, transparent: true }
  );

  // 5. Convert Action Mascot Ads (male-markdy-ads.png)
  await convertImage(
    page,
    path.join(MASCOT_DIR, 'male-markdy-ads.png'),
    [
      path.join(MASCOT_DIR, 'male-markdy-ads.webp'),
      path.join(PUBLIC_IMGS_DIR, 'male-markdy-ads.webp'),
    ],
    { width: 1200, height: 800, transparent: true }
  );

  // 6. Convert Character Mascot (male-markdy.png)
  await convertImage(
    page,
    path.join(MASCOT_DIR, 'male-markdy.png'),
    [
      path.join(MASCOT_DIR, 'male-markdy.webp'),
      path.join(PUBLIC_IMGS_DIR, 'male-markdy.webp'),
    ],
    { width: 800, height: 800, transparent: true }
  );

  // 7. Convert 3D Hexagon Icon (3d-icon.png)
  await convertImage(
    page,
    path.join(MASCOT_DIR, '3d-icon.png'),
    [
      path.join(MASCOT_DIR, '3d-icon.webp'),
      path.join(PUBLIC_IMGS_DIR, '3d-icon.webp'),
    ],
    { width: 400, height: 400, transparent: true }
  );

  await browser.close();
  console.log('🎉 All brand assets successfully converted and synchronized!');
}

convert().catch(console.error);
