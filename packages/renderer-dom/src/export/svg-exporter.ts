/**
 * packages/renderer-dom/src/export/svg-exporter.ts
 * Standalone Vector SVG & Figma-compatible design token asset export.
 * Zero external dependencies.
 */

export interface SvgExportOptions {
  includeThemeStyles?: boolean;
  transparentBackground?: boolean;
  scale?: number;
}

export function exportDiagramAsVectorSvg(
  containerEl: HTMLElement,
  options: SvgExportOptions = {}
): string {
  const svgEl = containerEl.querySelector("svg");
  if (!svgEl) throw new Error("No Markdy SVG element found in container");

  const clonedSvg = svgEl.cloneNode(true) as SVGSVGElement;
  const width = svgEl.getAttribute("width") || String(svgEl.clientWidth || 800);
  const height = svgEl.getAttribute("height") || String(svgEl.clientHeight || 400);

  clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clonedSvg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  clonedSvg.setAttribute("width", width);
  clonedSvg.setAttribute("height", height);
  clonedSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  if (options.transparentBackground) {
    const bgRect = clonedSvg.querySelector("rect");
    if (bgRect) bgRect.remove();
  }

  if (options.includeThemeStyles !== false) {
    const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
    styleEl.textContent = `
      text { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .markdy-node { transition: opacity 0.3s ease; }
    `;
    clonedSvg.insertBefore(styleEl, clonedSvg.firstChild);
  }

  const serializer = new XMLSerializer();
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n` + serializer.serializeToString(clonedSvg);
}
