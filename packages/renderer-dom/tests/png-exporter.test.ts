import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDiagramFrameRasterizer, rasterizeDiagramToCanvas } from "../src/export/png-exporter.js";
import { inlineExternalResources } from "../src/export/inline-resources.js";

vi.mock("../src/export/inline-resources.js", () => ({
  inlineExternalResources: vi.fn(async () => {}),
  inlineSerializedSvgResources: vi.fn(async (source: string) => source),
}));

let captured: Document[];
let scene: HTMLDivElement;
beforeEach(() => {
  captured = [];
  vi.clearAllMocks();
  vi.stubGlobal("Image", class {
    naturalWidth = 0;
    naturalHeight = 0;
    onload: (() => void) | null = null;
    set src(value: string) {
      const source = decodeURIComponent(value.slice(value.indexOf(",") + 1));
      const svg = new DOMParser().parseFromString(source, "image/svg+xml");
      captured.push(svg);
      this.naturalWidth = Number(svg.documentElement.getAttribute("width"));
      this.naturalHeight = Number(svg.documentElement.getAttribute("height"));
      queueMicrotask(() => this.onload?.());
    }
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ scale: vi.fn(), drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
  scene = document.createElement("div");
  scene.className = "markdy-scene-root";
  scene.style.cssText = "width:320px;height:180px;position:absolute;top:60px;left:20px;inset-block-start:60px;background:rgb(240, 245, 250)";
  const node = document.createElement("div");
  node.style.cssText = "opacity:0;transform:scale(0.5);box-shadow:0 2px 8px black";
  node.textContent = "API Gateway";
  scene.appendChild(node);
  document.body.appendChild(scene);
});
afterEach(() => {
  scene.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("DOM raster capture", () => {
  it("normalizes the export root without retaining logical viewport offsets", async () => {
    const canvas = await rasterizeDiagramToCanvas(scene, { mode: "foreignObject" });
    const clone = captured[0].querySelector<HTMLElement>(".markdy-scene-root")!;
    expect(captured[0].querySelector("parsererror")).toBeNull();
    expect([canvas.width, canvas.height]).toEqual([320, 180]);
    expect(clone.style.insetBlock).toBe("auto");
    expect(clone.style.insetInline).toBe("auto");
    expect(scene.style.insetBlockStart).toBe("60px");
    expect(clone.textContent).toBe("API Gateway");
  });

  it("updates animation styles while reusing inlined resources", async () => {
    const capture = createDiagramFrameRasterizer(scene, { mode: "foreignObject" });
    await capture(1);
    const node = scene.firstElementChild as HTMLElement;
    node.style.opacity = "1";
    node.style.transform = "scale(1)";
    await capture(1);
    const initial = captured[0].querySelector<HTMLElement>(".markdy-scene-root > div")!;
    const updated = captured[1].querySelector<HTMLElement>(".markdy-scene-root > div")!;
    expect(initial.style.opacity).toBe("0");
    expect(updated.style.opacity).toBe("1");
    expect(updated.style.transform).toBe("scale(1)");
    expect(updated.style.boxShadow).toBe(initial.style.boxShadow);
    expect(updated.style.animation).toBe("none");
    expect(inlineExternalResources).toHaveBeenCalledOnce();
  });

  it("rejects replaced nodes even when the DOM element count stays unchanged", async () => {
    const capture = createDiagramFrameRasterizer(scene, { mode: "foreignObject" });
    await capture(1);
    scene.firstElementChild!.replaceWith(document.createElement("div"));
    await expect(capture(1)).rejects.toThrow("Scene changed during GIF export");
  });
});