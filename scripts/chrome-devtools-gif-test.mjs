import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import puppeteer from "puppeteer-core";

const root = fileURLToPath(new URL("../", import.meta.url));
const baseUrl = process.argv[2] || "http://127.0.0.1:4337";
const output = join(root, "tmp/gif-export");
await mkdir(output, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});

async function openExportMenu(page) {
  for (const selector of ["#open-export-btn", "#canvas-export-btn"]) {
    const button = await page.$(selector);
    if (button && await button.isVisible()) {
      await button.click();
      return;
    }
  }
  throw new Error("No visible export button");
}

const page = await browser.newPage();
try {
  page.on("pageerror", error => console.error(error.message));
  const session = await page.createCDPSession();
  await session.send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: output });
  for (const width of [1440, 390]) {
    await page.setViewport({ width, height: 1000 });
    await page.goto(`${baseUrl}/playground/?example=url-shortener-architecture`, { waitUntil: "networkidle0" });
    await page.waitForSelector(".markdy-node");
    const expectedDuration = await page.evaluate(async root => {
      const { createDiagram } = await import(`/@fs${root}/packages/renderer-dom/src/index.ts`);
      const source = window.__MARKDY_PLAYGROUND_EXAMPLES.find(example => example.id === "url-shortener-architecture").code;
      const container = document.createElement("div");
      const diagram = createDiagram({ container, code: source, autoplay: false });
      const duration = diagram.duration();
      diagram.destroy();
      const originalCreateObjectURL = URL.createObjectURL.bind(URL);
      URL.createObjectURL = blob => {
        if (blob.type === "image/gif") window.testGifBlob = blob;
        return originalCreateObjectURL(blob);
      };
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: async text => { window.testGifClipboard = text; } },
      });
      return duration * 1000 + 1400;
    }, root);
    await openExportMenu(page);
    await page.select("#gif-quality-select", "compact");
    await page.click("#export-gif-btn");
    const busy = await page.evaluate(() => ["export-gif-btn", "copy-gif-btn", "gif-quality-select"].every(id => document.getElementById(id).disabled));
    assert.ok(busy, "Both GIF actions and quality selection must lock during capture");
    await page.waitForFunction(() => !document.getElementById("export-gif-btn").disabled, { timeout: 120000 });
    assert.ok(await page.evaluate(() => Boolean(window.testGifBlob)), await page.$eval("body", element => element.innerText.slice(-500)));
    const result = await page.evaluate(async () => {
      const bytes = new Uint8Array(await window.testGifBlob.arrayBuffer());
      const decoder = new ImageDecoder({ data: bytes, type: "image/gif" });
      await decoder.tracks.ready;
      const frameCount = decoder.tracks.selectedTrack.frameCount;
      let durationMs = 0;
      let initialPixels;
      let changedPixels = 0;
      const previews = [];
      let imageWidth = 0;
      let imageHeight = 0;
      for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
        const { image } = await decoder.decode({ frameIndex });
        durationMs += image.duration / 1000;
        imageWidth = image.displayWidth;
        imageHeight = image.displayHeight;
        if ([0, Math.floor(frameCount / 2), frameCount - 1].includes(frameIndex)) {
          const canvas = document.createElement("canvas");
          canvas.width = imageWidth;
          canvas.height = imageHeight;
          const context = canvas.getContext("2d");
          context.drawImage(image, 0, 0);
          const pixels = context.getImageData(0, 0, imageWidth, imageHeight).data;
          if (!initialPixels) initialPixels = pixels;
          else for (let pixel = 0; pixel < pixels.length; pixel += 4) {
            if (pixels[pixel] !== initialPixels[pixel] || pixels[pixel + 1] !== initialPixels[pixel + 1] || pixels[pixel + 2] !== initialPixels[pixel + 2]) changedPixels++;
          }
          previews.push(canvas.toDataURL());
        }
        image.close();
      }
      decoder.close();
      return { frameCount, durationMs, imageWidth, imageHeight, changedPixels, bytes: Array.from(bytes), previews };
    });
    assert.ok(result.frameCount > 1 && result.frameCount <= 60);
    assert.ok(result.imageWidth <= 800);
    assert.ok(result.changedPixels > 1000, "GIF must contain visible animation");
    assert.ok(Math.abs(result.durationMs - expectedDuration) <= 20, `Expected ${expectedDuration}ms, got ${result.durationMs}ms`);
    await writeFile(join(output, `playground-${width}.gif`), new Uint8Array(result.bytes));
    for (const [index, preview] of result.previews.entries()) {
      await writeFile(join(output, `playground-${width}-frame-${index}.png`), Buffer.from(preview.split(",")[1], "base64"));
    }
    await openExportMenu(page);
    await page.$eval("#gif-quality-select", element => element.scrollIntoView({ block: "center" }));
    await page.screenshot({ path: join(output, `playground-${width}.png`) });
    assert.equal(await page.$eval("#export-modal", element => element.scrollWidth > element.clientWidth), false);
    if (width === 1440) {
      await page.click("#copy-gif-btn");
      await page.waitForFunction(() => window.testGifClipboard?.startsWith("data:image/gif;base64,"), { timeout: 120000 });
      assert.equal(await page.$eval("#export-gif-btn", element => element.disabled), false);
    }
    console.log(JSON.stringify({ viewport: width, frames: result.frameCount, durationMs: result.durationMs, width: result.imageWidth, height: result.imageHeight, changedPixels: result.changedPixels, bytes: result.bytes.length }));
  }
  console.log("PASS: desktop/mobile download, clipboard export, timing, frame budget, and animated pixels");
} catch (error) {
  console.error(await page.evaluate(() => ({
    fonts: document.fonts.status,
    busy: document.getElementById("export-gif-btn")?.disabled,
    clipboardMock: String(navigator.clipboard?.writeText),
    message: document.body.innerText.slice(-600),
  })));
  throw error;
} finally {
  await browser.close();
}