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
import { exportDiagramAsVectorSvg, type SvgExportOptions } from "./svg-exporter.js";
import { inlineExternalResources } from "./inline-resources.js";

export interface PngExportOptions extends SvgExportOptions {
  pixelRatio?: number;
}

export async function exportDiagramAsPng(
  containerEl: HTMLElement,
  options: PngExportOptions = {}
): Promise<Blob> {
  const pixelRatio = options.pixelRatio || 2; // Default 2x for sharp retina output

  // Clone the container so we can mutate it freely without touching the live DOM
  const clonedContainer = containerEl.cloneNode(true) as HTMLElement;

  // Inline all external resources to prevent canvas taint
  await inlineExternalResources(clonedContainer);

  const svgXml = exportDiagramAsVectorSvg(clonedContainer, options);

  const blob = new Blob([svgXml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to rasterize SVG into Image for PNG export"));
    };
    img.src = url;
  });

  const width = img.naturalWidth || 800;
  const height = img.naturalHeight || 400;

  const canvas = document.createElement("canvas");
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(url);
    throw new Error("Could not get 2D canvas context for PNG export");
  }

  ctx.scale(pixelRatio, pixelRatio);
  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(url);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("Canvas toBlob failed for PNG export"));
    }, "image/png");
  });
}
