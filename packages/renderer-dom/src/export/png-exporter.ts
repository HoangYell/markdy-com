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
import html2canvas from "html2canvas";
import {
  exportDiagramAsVectorSvg,
  getDiagramSceneElement,
  prepareHtmlSceneForExport,
  type SvgExportOptions,
} from "./svg-exporter.js";
import { inlineExternalResources, inlineSerializedSvgResources } from "./inline-resources.js";

export interface PngExportOptions extends SvgExportOptions {
  pixelRatio?: number;
}

function cssColorComponentToByte(value: string): number {
  const trimmed = value.trim();
  const numeric = trimmed.endsWith("%") ? Number.parseFloat(trimmed) / 100 : Number.parseFloat(trimmed);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(Math.min(1, Math.max(0, numeric)) * 255);
}

function cssAlphaToNumber(value: string | undefined): number {
  if (!value) return 1;
  const trimmed = value.trim();
  const numeric = trimmed.endsWith("%") ? Number.parseFloat(trimmed) / 100 : Number.parseFloat(trimmed);
  if (!Number.isFinite(numeric)) return 1;
  return Math.min(1, Math.max(0, numeric));
}

function normalizeCssColorFunctions(cssValue: string): string {
  return cssValue.replace(/color\(\s*[-a-z0-9]+\s+([^)]*)\)/gi, (_match, rawComponents: string) => {
    const [rawChannels, rawAlpha] = String(rawComponents).split("/");
    const channels = rawChannels.trim().split(/\s+/);
    if (channels.length < 3) return "rgba(0, 0, 0, 0)";
    const red = cssColorComponentToByte(channels[0]);
    const green = cssColorComponentToByte(channels[1]);
    const blue = cssColorComponentToByte(channels[2]);
    const alpha = cssAlphaToNumber(rawAlpha);
    return alpha >= 1 ? `rgb(${red}, ${green}, ${blue})` : `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  });
}

function sanitizeHtml2CanvasStyles(root: HTMLElement): void {
  [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))].forEach((element) => {
    const style = element.getAttribute("style");
    if (style?.includes("color(")) {
      element.setAttribute("style", normalizeCssColorFunctions(style));
    }
  });
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
  const sceneEl = getDiagramSceneElement(containerEl);

  if (sceneEl.tagName?.toLowerCase() !== "svg") {
    const { clonedScene, scaledWidth, scaledHeight } = prepareHtmlSceneForExport(sceneEl, options);
    await inlineExternalResources(clonedScene);
    sanitizeHtml2CanvasStyles(clonedScene);

    const host = document.createElement("div");
    Object.assign(host.style, {
      position: "fixed",
      left: "-100000px",
      top: "0",
      width: `${scaledWidth}px`,
      height: `${scaledHeight}px`,
      overflow: "hidden",
      pointerEvents: "none",
      zIndex: "-1",
    });
    host.setAttribute("aria-hidden", "true");
    host.appendChild(clonedScene);
    document.body.appendChild(host);

    try {
      await document.fonts?.ready;
      return await html2canvas(clonedScene, {
        allowTaint: false,
        backgroundColor: options.transparentBackground ? null : undefined,
        height: scaledHeight,
        imageTimeout: 3000,
        logging: false,
        onclone: (clonedDocument, clonedElement) => {
          clonedDocument.querySelectorAll("style, link[rel='stylesheet']").forEach((styleNode) => styleNode.remove());
          sanitizeHtml2CanvasStyles(clonedElement as HTMLElement);
        },
        scale: pixelRatio,
        useCORS: true,
        width: scaledWidth,
      });
    } finally {
      host.remove();
    }
  }

  const pixelRatioForSvg = pixelRatio || 1;

  // Clone the container so we can mutate it freely without touching the live DOM
  const clonedContainer = containerEl.cloneNode(true) as HTMLElement;

  // Inline all external resources to prevent canvas taint
  await inlineExternalResources(clonedContainer);

  const svgXml = await inlineSerializedSvgResources(exportDiagramAsVectorSvg(clonedContainer, options));

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
  canvas.width = width * pixelRatioForSvg;
  canvas.height = height * pixelRatioForSvg;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(url);
    throw new Error("Could not get 2D canvas context for PNG export");
  }

  ctx.scale(pixelRatioForSvg, pixelRatioForSvg);
  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(url);
  return canvas;
}
