import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OG_PNG_PATH = path.join(rootDir, 'docs/images/mascot/og-markdy.png');
const MASCOT_PNG_PATH = path.join(rootDir, 'docs/images/mascot/markdy.png');
const ICON_SVG_PATH = path.join(rootDir, 'docs/images/mascot/icon.svg');

async function convert() {
  console.log('🔄 Converting and updating brand assets...');

  // 1. Copy icon.svg to website/public/
  const iconSvgContent = fs.readFileSync(ICON_SVG_PATH, 'utf-8');
  fs.writeFileSync(path.join(rootDir, 'website/public/icon.svg'), iconSvgContent);
  fs.writeFileSync(path.join(rootDir, 'website/public/favicon.svg'), iconSvgContent);
  console.log('✅ Updated website/public/icon.svg & favicon.svg with new hexagon M mark.');

  // 2. Launch browser to convert og-markdy.png to webp & optimized png
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // Convert OG Image (1200x630 social standard or 1600x900)
  const ogBase64 = `data:image/png;base64,${fs.readFileSync(OG_PNG_PATH).toString('base64')}`;
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body, html { width: 1200px; height: 630px; overflow: hidden; background: #000; }
          img { width: 1200px; height: 630px; object-fit: cover; }
        </style>
      </head>
      <body>
        <img src="${ogBase64}" />
      </body>
    </html>
  `, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 200));

  const ogWebpDocs = path.join(rootDir, 'docs/images/mascot/og-markdy.webp');
  const ogWebpPublic = path.join(rootDir, 'website/public/og-image.webp');
  const ogWebpPublicImgs = path.join(rootDir, 'website/public/images/og-markdy.webp');

  await page.screenshot({ path: ogWebpDocs, type: 'webp', quality: 95 });
  await page.screenshot({ path: ogWebpPublic, type: 'webp', quality: 95 });
  await page.screenshot({ path: ogWebpPublicImgs, type: 'webp', quality: 95 });
  console.log('✅ Generated og-image.webp and og-markdy.webp.');

  // Convert Mascot transparent image to webp
  const mascotBase64 = `data:image/png;base64,${fs.readFileSync(MASCOT_PNG_PATH).toString('base64')}`;
  await page.setViewport({ width: 600, height: 600, deviceScaleFactor: 1 });
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body, html { width: 600px; height: 600px; overflow: hidden; background: transparent; }
          img { width: 600px; height: 600px; object-fit: contain; }
        </style>
      </head>
      <body>
        <img src="${mascotBase64}" />
      </body>
    </html>
  `, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 200));

  const mascotWebpDocs = path.join(rootDir, 'docs/images/mascot/markdy.webp');
  const mascotWebpPublic = path.join(rootDir, 'website/public/images/mascot.webp');

  await page.screenshot({ path: mascotWebpDocs, type: 'webp', quality: 95, omitBackground: true });
  await page.screenshot({ path: mascotWebpPublic, type: 'webp', quality: 95, omitBackground: true });
  console.log('✅ Generated mascot.webp with transparent background.');

  await browser.close();
}

convert().catch(console.error);
