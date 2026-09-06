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
import { getDiagramSceneElement, type SvgExportOptions } from "./svg-exporter.js";
import { createDiagramFrameRasterizer } from "./png-exporter.js";

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
  maxFrames?: number;
  maxWidth?: number;
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
const DEFAULT_GIF_PIXEL_RATIO = 1;
const DEFAULT_GIF_FPS = 12;
const MAX_GIF_FRAMES = 120;
const MAX_GIF_PIXELS = 48 * 1024 * 1024;

function positiveOption(value: number | undefined, fallback: number, name: string): number {
  const resolved = value ?? fallback;
  if (!Number.isFinite(resolved) || resolved <= 0) throw new RangeError(`${name} must be a positive finite number`);
  return resolved;
}

/**
 * Rasterize the current state of `container` into ImageData.
 *
 * We clone the container first so inlineExternalResources can mutate it freely
 * without affecting the live DOM or subsequent frame renders.
 */
async function rasterizeFrame(capture: (pixelRatio: number) => Promise<HTMLCanvasElement>, pixelRatio: number): Promise<ImageData> {
  const canvas = await capture(pixelRatio);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create GIF canvas context");
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

export async function exportDiagramAsGif(
  container: HTMLElement,
  timeline: TimelineController,
  options: GifDiagramExportOptions = {},
): Promise<Blob> {
  const requestedFps = Math.min(30, positiveOption(options.fps, DEFAULT_GIF_FPS, "fps"));
  const maxFrames = Math.floor(positiveOption(options.maxFrames, MAX_GIF_FRAMES, "maxFrames"));
  if (maxFrames < 2) throw new RangeError("maxFrames must be at least 2");
  const maxWidth = positiveOption(options.maxWidth, 1600, "maxWidth");
  const requestedPixelRatio = positiveOption(options.pixelRatio, DEFAULT_GIF_PIXEL_RATIO, "pixelRatio");
  const scale = positiveOption(options.scale, 1, "scale");
  const rawDuration = timeline.duration();
  const duration = Math.max(Number.isFinite(rawDuration) ? rawDuration : 1, 0.1);
  const frameCount = Math.min(maxFrames - 1, Math.max(1, Math.ceil(duration * requestedFps)));
  const totalFrames = frameCount + 1;
  const holdEndMs = Math.max(20, options.holdEndMs ?? 1400);
  if (!Number.isFinite(holdEndMs)) throw new RangeError("holdEndMs must be finite");
  const scene = getDiagramSceneElement(container);
  const width = (scene.clientWidth || parseFloat(scene.style.width) || 800) * scale;
  const height = (scene.clientHeight || parseFloat(scene.style.height) || 400) * scale;
  const pixelRatio = Math.min(requestedPixelRatio, maxWidth / width, Math.sqrt(MAX_GIF_PIXELS / (width * height * totalFrames)));
  const captureOptions = { ...options, mode: options.mode ?? "foreignObject" } satisfies SvgExportOptions;
  const capture = createDiagramFrameRasterizer(container, captureOptions);
  const priorTime = timeline.currentTime();
  const wasPlaying = timeline.isPlaying();
  timeline.pause();

  try {
    await container.ownerDocument.fonts?.ready;
    const frames = [];

    for (let frame = 0; frame < frameCount; frame++) {
      timeline.seek(duration * frame / frameCount);
      await nextFrame();
      const imageData = await rasterizeFrame(capture, pixelRatio);
      const delayMs = 10 * (Math.round((frame + 1) * duration * 100 / frameCount) - Math.round(frame * duration * 100 / frameCount));
      frames.push({
        imageData,
        delayMs,
      });
      options.onProgress?.(frames.length / totalFrames, frames.length, totalFrames);
    }

    // Keep the completed scene on screen long enough to read naturally before looping.
    timeline.seek(duration);
    await nextFrame();
    const finalImageData = await rasterizeFrame(capture, pixelRatio);
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
