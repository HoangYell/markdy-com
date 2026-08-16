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
import { exportDiagramAsVectorSvg, type SvgExportOptions } from "./svg-exporter.js";
import { inlineExternalResources } from "./inline-resources.js";

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

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

/**
 * Rasterize the current state of `container` into ImageData.
 *
 * We clone the container first so inlineExternalResources can mutate it freely
 * without affecting the live DOM or subsequent frame renders.
 */
async function rasterizeFrame(container: HTMLElement, pixelRatio: number, options: SvgExportOptions): Promise<ImageData> {
  // Clone so mutation doesn't bleed into subsequent frames
  const cloned = container.cloneNode(true) as HTMLElement;

  // Inline all external URLs → prevents canvas taint → getImageData won't throw
  await inlineExternalResources(cloned);

  const svg = exportDiagramAsVectorSvg(cloned, options);
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Failed to rasterize GIF frame"));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth * pixelRatio;
    canvas.height = image.naturalHeight * pixelRatio;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not create GIF canvas context");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return context.getImageData(0, 0, canvas.width, canvas.height);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function exportDiagramAsGif(
  container: HTMLElement,
  timeline: TimelineController,
  options: GifDiagramExportOptions = {},
): Promise<Blob> {
  const fps = Math.min(24, Math.max(1, Math.round(options.fps ?? 12)));
  const duration = timeline.duration();
  const frameCount = Math.max(1, Math.ceil(duration * fps));
  const delayMs = Math.max(20, Math.round(1000 / fps));
  const priorTime = timeline.currentTime();
  const wasPlaying = timeline.isPlaying();
  timeline.pause();

  try {
    const frames = [];
    for (let frame = 0; frame < frameCount; frame++) {
      timeline.seek(Math.min(duration, frame / fps));
      await nextFrame();
      frames.push({
        imageData: await rasterizeFrame(container, options.pixelRatio ?? 1, options),
        delayMs,
      });
    }
    // Keep the completed scene on screen long enough to read naturally.
    timeline.seek(duration);
    await nextFrame();
    frames.push({ imageData: await rasterizeFrame(container, options.pixelRatio ?? 1, options), delayMs: Math.max(delayMs, 800) });
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
