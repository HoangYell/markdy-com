/**
 * packages/renderer-dom/src/export/png-exporter.ts
 * High-DPI raster PNG export with 2x retina scaling.
 * Zero external dependencies.
 *
 * Fix: Inline all external resources (images, fonts) as base64 data URIs
 * before drawing the SVG to canvas. A foreignObject-wrapped SVG taints the
 * canvas whenever it references any external URL, so every resource must be
 * inlined first.
 */
import {
  exportDiagramAsVectorSvg,
  exportLiveSceneAsPureVectorSvg,
  getDiagramSceneElement,
  prepareHtmlSceneForExport,
  type SvgExportOptions,
} from "./svg-exporter.js";
import { inlineExternalResources, inlineSerializedSvgResources } from "./inline-resources.js";

export interface PngExportOptions extends SvgExportOptions {
  pixelRatio?: number;
}

export async function exportDiagramAsPng(
  containerEl: HTMLElement,
  options: PngExportOptions = {}
): Promise<Blob> {
  const canvas = await rasterizeDiagramToCanvas(containerEl, options, options.pixelRatio || 2);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("Canvas toBlob failed for PNG export"));
    }, "image/png");
  });
}

export async function rasterizeDiagramToCanvas(
  containerEl: HTMLElement,
  options: SvgExportOptions = {},
  pixelRatio = 1,
): Promise<HTMLCanvasElement> {
  const pixelRatioForSvg = pixelRatio || 1;

  // 1. Generate 100% Pure Vector SVG capturing the live scene & animation states (No foreignObject)
  const svgXml = exportLiveSceneAsPureVectorSvg(containerEl, options);

  // 2. Inline any external resources (images/icons) to prevent any canvas taint
  const inlinedSvgXml = await inlineSerializedSvgResources(svgXml);

  // 3. Create SVG Blob URL
  const blob = new Blob([inlinedSvgXml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to rasterize SVG into Image for canvas export"));
    };
    img.src = url;
  });

  const width = img.naturalWidth || (containerEl.clientWidth || 800);
  const height = img.naturalHeight || (containerEl.clientHeight || 400);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * pixelRatioForSvg));
  canvas.height = Math.max(1, Math.round(height * pixelRatioForSvg));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(url);
    throw new Error("Could not get 2D canvas context for export");
  }

  ctx.scale(pixelRatioForSvg, pixelRatioForSvg);
  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(url);
  return canvas;
}
