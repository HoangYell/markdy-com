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
  dither?: boolean;
  diff?: boolean;
  holdEndMs?: number;
  onProgress?: (progress: number, currentFrame: number, totalFrames: number) => void;
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
const DEFAULT_GIF_PIXEL_RATIO = 2.0;
const DEFAULT_GIF_FPS = 20;
const MAX_GIF_FRAMES = 96;

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
  const requestedFps = Math.min(30, Math.max(1, Math.round(options.fps ?? DEFAULT_GIF_FPS)));
  const rawDuration = timeline.duration();
  const duration = Math.max(Number.isFinite(rawDuration) ? rawDuration : 1, 0.1);
  const fps = Math.min(requestedFps, Math.max(6, Math.round(MAX_GIF_FRAMES / duration)));
  const frameCount = Math.max(1, Math.ceil(duration * fps));
  const delayMs = Math.max(20, Math.round(1000 / fps));
  const pixelRatio = options.pixelRatio ?? DEFAULT_GIF_PIXEL_RATIO;
  const holdEndMs = Math.max(delayMs, options.holdEndMs ?? 1400);
  const priorTime = timeline.currentTime();
  const wasPlaying = timeline.isPlaying();
  timeline.pause();

  try {
    const frames = [];
    const totalFrames = frameCount + 1;

    for (let frame = 0; frame < frameCount; frame++) {
      timeline.seek(Math.min(duration, frame / fps));
      await nextFrame();
      const imageData = await rasterizeFrame(container, pixelRatio, options);
      frames.push({
        imageData,
        delayMs,
      });
      options.onProgress?.(frames.length / totalFrames, frames.length, totalFrames);
    }

    // Keep the completed scene on screen long enough to read naturally before looping.
    timeline.seek(duration);
    await nextFrame();
    const finalImageData = await rasterizeFrame(container, pixelRatio, options);
    frames.push({
      imageData: finalImageData,
      delayMs: holdEndMs,
    });
    options.onProgress?.(1, totalFrames, totalFrames);

    const encoded = encodeGifSequence(frames, {
      dither: options.dither ?? false,
      loop: options.loop ?? true,
      diff: options.diff ?? true,
    });
    // Copy into an ArrayBuffer-backed view: TS permits the encoder's generic
    // ArrayBufferLike view to include SharedArrayBuffer, which Blob does not.
    const bytes = new Uint8Array(encoded.byteLength);
    bytes.set(encoded);
    return new Blob([bytes], { type: "image/gif" });
  } finally {
    timeline.seek(priorTime);
    if (wasPlaying) timeline.play();
  }
}
