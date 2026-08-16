/**
 * packages/renderer-dom/src/export/inline-resources.ts
 *
 * Shared helpers that inline all external URL references inside a DOM subtree
 * as base64 data URIs.
 *
 * A `<foreignObject>`-wrapped SVG drawn to a canvas taints it whenever any
 * child node references an external URL (img src, CSS url(), etc.).  Inlining
 * every resource before serialisation prevents both:
 *   - canvas.toBlob()   → "Tainted canvases may not be exported."
 *   - ctx.getImageData  → "The canvas has been tainted by cross-origin data."
 */

const TRANSPARENT_PIXEL_DATA_URI =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
const RESOURCE_FETCH_TIMEOUT_MS = 3000;
const dataUriCache = new Map<string, Promise<string | null>>();

function shouldInlineUrl(url: string): boolean {
  const trimmed = url.trim();
  return !!trimmed && !trimmed.startsWith("data:") && !trimmed.startsWith("blob:") && !trimmed.startsWith("#");
}

/**
 * Fetch a URL and return a base64 data URI.
 * Returns null on failure so callers can silently skip unfetchable resources.
 */
export async function toDataUri(url: string): Promise<string | null> {
  if (dataUriCache.has(url)) return dataUriCache.get(url)!;

  const request = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RESOURCE_FETCH_TIMEOUT_MS);

  try {
    const resp = await fetch(url, { mode: "cors", credentials: "same-origin", signal: controller.signal });
    if (!resp.ok) return null;
    const arrayBuffer = await resp.arrayBuffer();
    const mimeType = resp.headers.get("Content-Type") || "application/octet-stream";
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );
    return `data:${mimeType};base64,${base64}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
  })();

  dataUriCache.set(url, request);
  return request;
}

/**
 * Replace every external URL inside a CSS value string with an inlined data URI.
 * Handles `url("…")`, `url('…')` and bare `url(…)` forms.
 */
export async function inlineCssUrls(cssValue: string): Promise<string> {
  const urlPattern = /url\(["']?([^"')]+)["']?\)/g;
  const matches: Array<{ full: string; src: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = urlPattern.exec(cssValue)) !== null) {
    const src = m[1];
    if (shouldInlineUrl(src)) {
      matches.push({ full: m[0], src });
    }
  }
  let result = cssValue;
  await Promise.all(
    matches.map(async ({ full, src }) => {
      try {
        const absoluteSrc = new URL(src, document.baseURI).href;
        const dataUri = await toDataUri(absoluteSrc);
        result = result.split(full).join(dataUri ? `url("${dataUri}")` : "none");
      } catch {
        result = result.split(full).join("none");
      }
    })
  );
  return result;
}

/**
 * Walk the DOM subtree of `root` and inline:
 *  - `<img>` src attributes
 *  - inline `style` attribute CSS url() references (backgrounds, masks, etc.)
 *
 * Operates on a clone — does NOT touch the live DOM.
 * All fetches are run concurrently for performance.
 */
export async function inlineExternalResources(root: Element): Promise<void> {
  const tasks: Promise<void>[] = [];

  // Inline <img> elements
  root.querySelectorAll<HTMLImageElement>("img").forEach((img) => {
    const src = img.getAttribute("src");
    if (src && shouldInlineUrl(src)) {
      tasks.push(
        Promise.resolve()
          .then(() => toDataUri(new URL(src, document.baseURI).href))
          .then((dataUri) => {
          img.setAttribute("src", dataUri || TRANSPARENT_PIXEL_DATA_URI);
        })
      );
    }
  });

  // Inline CSS url() references in inline style attributes
  const allEls = [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))];
  allEls.forEach((el) => {
    const style = el.getAttribute("style");
    if (style && style.includes("url(")) {
      tasks.push(
        inlineCssUrls(style).then((inlined) => {
          if (inlined !== style) el.setAttribute("style", inlined);
        })
      );
    }
  });

  await Promise.all(tasks);
}

/**
 * Inline resources inside a serialized SVG document after export code has
 * copied computed styles into the foreignObject subtree.
 */
export async function inlineSerializedSvgResources(svgXml: string): Promise<string> {
  const doc = new DOMParser().parseFromString(svgXml, "image/svg+xml");
  if (doc.querySelector("parsererror")) return svgXml;

  await inlineExternalResources(doc.documentElement);

  const serializer = new XMLSerializer();
  const serializedSvg = serializer.serializeToString(doc.documentElement);
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${serializedSvg}`;
}
