/**
 * packages/renderer-dom/src/export/gif-exporter.ts
 * Browser-side animated GIF export for a Markdy timeline.
 *
 * Fix: Inline all external resources (images, CSS url()) as base64 data URIs
 * before drawing each frame to canvas. A foreignObject-wrapped SVG taints the
 * canvas whenever it references any external URL, which causes getImageData to
 * throw "The canvas has been tainted by cross-origin data."
 */
import { encodeGifSequence } from "./gif-encoder.js";
import type { SvgExportOptions } from "./svg-exporter.js";
import { rasterizeDiagramToCanvas } from "./png-exporter.js";

export interface TimelineController {
  seek(seconds: number): void;
  currentTime(): number;
  duration(): number;
  isPlaying(): boolean;
  play(): void;
  pause(): void;
}

export interface GifDiagramExportOptions extends SvgExportOptions {
  fps?: number;
  pixelRatio?: number;
  loop?: boolean;
}

const nextFrame = () => new Promise<void>((resolve) => {
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    resolve();
  };
  const fallback = setTimeout(finish, 80);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    clearTimeout(fallback);
    finish();
  }));
});
const DEFAULT_GIF_PIXEL_RATIO = 0.3;
const MAX_GIF_FRAMES = 24;

/**
 * Rasterize the current state of `container` into ImageData.
 *
 * We clone the container first so inlineExternalResources can mutate it freely
 * without affecting the live DOM or subsequent frame renders.
 */
async function rasterizeFrame(container: HTMLElement, pixelRatio: number, options: SvgExportOptions): Promise<ImageData> {
  const canvas = await rasterizeDiagramToCanvas(container, options, pixelRatio);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create GIF canvas context");
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

export async function exportDiagramAsGif(
  container: HTMLElement,
  timeline: TimelineController,
  options: GifDiagramExportOptions = {},
): Promise<Blob> {
  const requestedFps = Math.min(24, Math.max(1, Math.round(options.fps ?? 12)));
  const duration = timeline.duration();
  const fps = Math.min(requestedFps, MAX_GIF_FRAMES / Math.max(duration, 0.001));
  const frameCount = Math.max(1, Math.ceil(duration * fps));
  const delayMs = Math.max(20, Math.round(1000 / fps));
  const pixelRatio = options.pixelRatio ?? DEFAULT_GIF_PIXEL_RATIO;
  const priorTime = timeline.currentTime();
  const wasPlaying = timeline.isPlaying();
  timeline.pause();

  try {
    const frames = [];
    timeline.seek(duration);
    await nextFrame();
    frames.push({ imageData: await rasterizeFrame(container, pixelRatio, options), delayMs: Math.max(delayMs, 800) });

    for (let frame = 0; frame < frameCount; frame++) {
      timeline.seek(Math.min(duration, frame / fps));
      await nextFrame();
      frames.push({
        imageData: await rasterizeFrame(container, pixelRatio, options),
        delayMs,
      });
    }
    // Keep the completed scene on screen long enough to read naturally.
    timeline.seek(duration);
    await nextFrame();
    frames.push({ imageData: await rasterizeFrame(container, pixelRatio, options), delayMs: Math.max(delayMs, 800) });
    const encoded = encodeGifSequence(frames, { dither: true, loop: options.loop ?? true });
    // Copy into an ArrayBuffer-backed view: TS permits the encoder's generic
    // ArrayBufferLike view to include SharedArrayBuffer, which Blob does not.
    const bytes = new Uint8Array(encoded.byteLength);
    bytes.set(encoded);
    return new Blob([bytes.buffer], { type: "image/gif" });
  } finally {
    timeline.seek(priorTime);
    if (wasPlaying) timeline.play();
  }
}
