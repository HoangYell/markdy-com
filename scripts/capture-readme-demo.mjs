import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import puppeteer from "puppeteer-core";
import { PNG } from "pngjs";
import { encodeGifSequence } from "../packages/renderer-dom/src/export/gif-encoder.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const baseUrl = process.argv[2] || "http://127.0.0.1:4337";
const exampleId = "url-shortener-architecture";
const source = await readFile(join(root, "examples/showcase", `${exampleId}.markdy`), "utf8");
const output = join(root, "docs/images/markdy-cache-aside.gif");
const previews = join(root, "tmp/readme-demo");
await mkdir(previews, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${baseUrl}/playground/?example=${exampleId}`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.querySelector(".markdy-node"));
  const selectedSource = await page.$eval(".cm-content", element => element.textContent);
  assert.ok(selectedSource.includes("Cache-Aside & Sharded Microservices"), "Deep link must load the demo scene");

  const timing = await page.evaluate(async ({ source, moduleUrl }) => {
    const { createDiagram } = await import(moduleUrl);
    const container = document.createElement("div");
    container.style.cssText = "width:1600px;height:900px;background:#fff;";
    document.body.replaceChildren(container);
    document.body.style.cssText = "margin:0;padding:0;overflow:hidden;background:#fff;";
    document.documentElement.setAttribute("data-theme", "light");
    window.readmeDiagram = createDiagram({
      container, code: source, autoplay: false, loop: false,
      controls: false, interactiveViewport: false, fitMode: "contain",
      sceneBoundaryProgress: false,
    });
    window.readmeDiagram.setTheme("paper");
    await document.fonts.ready;
    window.readmeDiagram.resize();
    const beats = window.readmeDiagram.beats();
    return { beats, duration: window.readmeDiagram.duration() };
  }, { source, moduleUrl: `/@fs${join(root, "packages/renderer-dom/src/index.ts")}` });

  const start = timing.beats.find(beat => beat.name === "read_cache_hit")?.start;
  const end = timing.beats.find(beat => beat.name === "finish")?.start;
  assert.ok(Number.isFinite(start) && end > start, "Cache hit and miss beats must exist");
  const frameCount = 100;
  const frames = [];
  for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
    const seconds = start + (end - start) * frameIndex / (frameCount - 1);
    await page.evaluate(async seconds => {
      window.readmeDiagram.seek(seconds);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }, seconds);
    const screenshot = await page.screenshot({ type: "png" });
    const imageData = PNG.sync.read(screenshot);
    frames.push({ imageData, delayMs: frameIndex === frameCount - 1 ? 1400 : 100 });
    if ([0, 50, 99].includes(frameIndex)) {
      await writeFile(join(previews, `frame-${frameIndex}.png`), screenshot);
    }
  }

  assert.notDeepEqual(frames[0].imageData.data, frames[50].imageData.data, "Demo must contain motion");
  const gif = encodeGifSequence(frames, { loop: true, diff: true });
  assert.ok(gif.byteLength < 6 * 1024 * 1024, "Keep the README animation below 6 MiB");
  await writeFile(output, gif);
  console.log(JSON.stringify({ output, frames: frameCount, bytes: gif.byteLength, start, end }));
} finally {
  await browser.close();
}