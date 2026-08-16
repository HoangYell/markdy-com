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

/**
 * CSS animations (including WAAPI) do not survive cloneNode(). Copy the
 * browser's resolved styles into the clone so a serialized export matches the
 * frame the user is actually seeing.
 */
function copyRenderedStyles(source: HTMLElement, clone: HTMLElement): void {
  if (typeof window === "undefined" || typeof window.getComputedStyle !== "function") return;

  const sourceElements = [source, ...Array.from(source.querySelectorAll<HTMLElement>("*"))];
  const cloneElements = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("*"))];
  for (let index = 0; index < Math.min(sourceElements.length, cloneElements.length); index++) {
    const computed = window.getComputedStyle(sourceElements[index]);
    const target = cloneElements[index].style;
    for (let propertyIndex = 0; propertyIndex < computed.length; propertyIndex++) {
      const property = computed.item(propertyIndex);
      target.setProperty(property, computed.getPropertyValue(property), computed.getPropertyPriority(property));
    }
  }
}

export function exportDiagramAsVectorSvg(
  containerEl: HTMLElement,
  options: SvgExportOptions = {}
): string {
  const sceneEl = (
    containerEl.classList?.contains("markdy-scene-root")
      ? containerEl
      : containerEl.querySelector(".markdy-scene-root") ||
        containerEl.querySelector("svg") ||
        (containerEl.tagName?.toLowerCase() === "svg" ? containerEl : null)
  ) as HTMLElement;

  if (!sceneEl) throw new Error("No Markdy scene element found in container");

  if (sceneEl.tagName?.toLowerCase() === "svg") {
    const clonedSvg = sceneEl.cloneNode(true) as SVGSVGElement;
    if (!clonedSvg.getAttribute("xmlns")) {
      clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    }
    const serializer = new XMLSerializer();
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${serializer.serializeToString(clonedSvg)}`;
  }

  const clonedScene = sceneEl.cloneNode(true) as HTMLElement;
  copyRenderedStyles(sceneEl, clonedScene);
  
  const widthStr = clonedScene.style.width || String(sceneEl.clientWidth || 800);
  const heightStr = clonedScene.style.height || String(sceneEl.clientHeight || 400);
  
  // Clean 'px' or '%' if present and parse
  let width = parseFloat(widthStr);
  let height = parseFloat(heightStr);
  
  if (isNaN(width)) width = 800;
  if (isNaN(height)) height = 400;

  const scale = options.scale || 1;
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;

  clonedScene.style.transform = `scale(${scale})`;
  clonedScene.style.transformOrigin = "0 0";
  clonedScene.style.position = "relative";
  clonedScene.style.left = "0px";
  clonedScene.style.top = "0px";
  clonedScene.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");

  if (options.transparentBackground) {
    clonedScene.style.background = "transparent";
  }

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
  svg.setAttribute("width", String(scaledWidth));
  svg.setAttribute("height", String(scaledHeight));
  svg.setAttribute("viewBox", `0 0 ${scaledWidth} ${scaledHeight}`);

  if (options.includeThemeStyles !== false) {
    const styleEl = document.createElementNS("http://www.w3.org/2000/svg", "style");
    let combinedStyles = `
      foreignObject { width: 100%; height: 100%; }
      .markdy-node { transition: opacity 0.3s ease; }
    `;
    
    if (typeof document !== "undefined") {
      const styles = document.querySelectorAll("style[id^='markdy-']");
      for (let i = 0; i < styles.length; i++) {
        combinedStyles += styles[i].textContent + "\n";
      }
    }
    
    styleEl.textContent = combinedStyles;
    svg.appendChild(styleEl);
  }

  const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
  foreignObject.setAttribute("width", "100%");
  foreignObject.setAttribute("height", "100%");
  
  foreignObject.appendChild(clonedScene);
  svg.appendChild(foreignObject);

  const serializer = new XMLSerializer();
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n` + serializer.serializeToString(svg);
}
