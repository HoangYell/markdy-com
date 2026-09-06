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
  exportLiveSceneAsPureVectorSvg,
  getDiagramSceneElement,
  prepareHtmlSceneForExport,
  type PreparedHtmlSceneExport,
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
  preparedScene?: PreparedHtmlSceneExport,
): Promise<HTMLCanvasElement> {
  const pixelRatioForSvg = pixelRatio || 1;
  const scene = getDiagramSceneElement(containerEl);
  const captureHtml = options.mode === "foreignObject" && scene.tagName.toLowerCase() !== "svg";
  let svgXml: string;
  if (captureHtml) {
    const { clonedScene, scaledWidth, scaledHeight } = preparedScene ?? prepareHtmlSceneForExport(scene, options);
    clonedScene.removeAttribute("xmlns");
    clonedScene.style.insetBlock = "auto";
    clonedScene.style.insetInline = "auto";
    for (const element of [clonedScene, ...Array.from(clonedScene.querySelectorAll<HTMLElement>("*"))]) {
      element.style.animation = "none";
      element.style.transition = "none";
    }
    if (!preparedScene) await inlineExternalResources(clonedScene);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", String(scaledWidth));
    svg.setAttribute("height", String(scaledHeight));
    const content = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
    content.setAttribute("width", "100%");
    content.setAttribute("height", "100%");
    content.appendChild(clonedScene);
    svg.appendChild(content);
    svgXml = new XMLSerializer().serializeToString(svg);
  } else {
    svgXml = exportLiveSceneAsPureVectorSvg(containerEl, options);
  }

  // 2. Inline any external resources (images/icons) to prevent any canvas taint
  const inlinedSvgXml = captureHtml ? svgXml : await inlineSerializedSvgResources(svgXml);

  // 3. Create SVG Blob URL
  const blob = new Blob([inlinedSvgXml], { type: "image/svg+xml;charset=utf-8" });
  const url = captureHtml
    ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(inlinedSvgXml)}`
    : URL.createObjectURL(blob);

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

const FRAME_STYLE_PROPERTIES = [
  "opacity", "visibility", "transform", "transform-origin", "filter", "clip-path",
  "box-shadow", "text-shadow", "background-color", "color", "border-color",
  "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
  "fill", "fill-opacity", "stroke", "stroke-opacity", "stroke-width", "stroke-dasharray", "stroke-dashoffset",
  "offset-path", "offset-distance", "offset-rotate", "offset-anchor",
];
const FRAME_SVG_ATTRIBUTES = ["cx", "cy", "r", "x", "y", "d", "points", "transform"];

export function createDiagramFrameRasterizer(container: HTMLElement, options: SvgExportOptions) {
  const scene = getDiagramSceneElement(container);
  if (options.mode !== "foreignObject" || scene.tagName.toLowerCase() === "svg") {
    return (pixelRatio: number) => rasterizeDiagramToCanvas(container, options, pixelRatio);
  }
  let prepared: PreparedHtmlSceneExport | undefined;
  let sources: HTMLElement[] = [];
  let clones: HTMLElement[] = [];
  return async (pixelRatio: number) => {
    if (!prepared) {
      prepared = prepareHtmlSceneForExport(scene, options);
      sources = Array.from(scene.querySelectorAll<HTMLElement>("*"));
      clones = Array.from(prepared.clonedScene.querySelectorAll<HTMLElement>("*"));
      await inlineExternalResources(prepared.clonedScene);
    } else {
      if (scene.querySelectorAll("*").length !== sources.length || sources.some(source => !scene.contains(source))) {
        throw new Error("Scene changed during GIF export");
      }
      for (let index = 0; index < sources.length; index++) {
        const source = sources[index];
        const clone = clones[index];
        if (source.classList.contains("markdy-viewport-transform")) continue;
        const computed = getComputedStyle(source);
        for (const property of FRAME_STYLE_PROPERTIES) {
          clone.style.setProperty(property, computed.getPropertyValue(property));
        }
        if (source.namespaceURI === "http://www.w3.org/2000/svg") {
          for (const attribute of FRAME_SVG_ATTRIBUTES) {
            const value = source.getAttribute(attribute);
            if (value !== null) clone.setAttribute(attribute, value);
          }
        }
      }
    }
    return rasterizeDiagramToCanvas(container, options, pixelRatio, prepared);
  };
}
