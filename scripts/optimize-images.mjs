import puppeteer from 'puppeteer-core';
import * as chromeLauncher from 'chrome-launcher';
import fs from 'node:fs';

function resolveChromePath() {
  const installations = chromeLauncher.Launcher.getInstallations();
  if (installations && installations.length > 0) return installations[0];
  return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
}

async function optimizeImages() {
  const browser = await puppeteer.launch({
    executablePath: resolveChromePath(),
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });

  const page = await browser.newPage();
  await page.setContent('<html><body><canvas id="c"></canvas></body></html>');

  const targets = [
    {
      src: 'website/public/images/male-markdy.webp',
      out: 'website/public/images/male-markdy-sm.webp',
      width: 120,
      height: 120,
      quality: 0.88,
    },
    {
      src: 'website/public/images/3d-icon.webp',
      out: 'website/public/images/3d-icon-sm.webp',
      width: 48,
      height: 48,
      quality: 0.90,
    },
    {
      src: 'website/public/og-image.webp',
      out: 'website/public/hero-bg.webp',
      width: 1200,
      height: 630,
      quality: 0.78,
    },
  ];

  for (const t of targets) {
    const dataUrl = `data:image/webp;base64,${fs.readFileSync(t.src).toString('base64')}`;
    const resultBase64 = await page.evaluate(async (dataUrl, w, h, q) => {
      const img = new Image();
      img.src = dataUrl;
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
      });
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, w, h);
      return canvas.toDataURL('image/webp', q).split(',')[1];
    }, dataUrl, t.width, t.height, t.quality);

    fs.writeFileSync(t.out, Buffer.from(resultBase64, 'base64'));
    const beforeSize = (fs.statSync(t.src).size / 1024).toFixed(1);
    const afterSize = (fs.statSync(t.out).size / 1024).toFixed(1);
    console.log(`✓ Optimized ${t.out}: ${beforeSize} KB -> ${afterSize} KB`);
  }

  await browser.close();
}

optimizeImages().catch(console.error);
