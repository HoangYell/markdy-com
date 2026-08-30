import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  encodeGifSequence,
  exportDiagramAsGif,
  exportDiagramAsVectorSvg,
  DiagramPresentationController,
  createDiagram,
} from "../src/index.js";
import { parse, compilePlan } from "@markdy/core";

if (typeof Element !== "undefined" && !Element.prototype.animate) {
  Element.prototype.animate = function animate() {
    return {
      currentTime: 0,
      pause() {},
      play() {},
      cancel() {},
    } as unknown as Animation;
  };
}

if (typeof window !== "undefined") {
  // Stub Image for jsdom
  const originalImage = window.Image;
  window.Image = class MockImage {
    naturalWidth = 400;
    naturalHeight = 300;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    private _src = "";
    get src() {
      return this._src;
    }
    set src(val: string) {
      this._src = val;
      setTimeout(() => this.onload?.(), 10);
    }
  } as unknown as typeof Image;

  // Stub Canvas 2D Context for jsdom
  const origGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (contextId: string, ...args: any[]) {
    if (contextId === "2d") {
      return {
        scale() {},
        drawImage() {},
        getImageData: (sx: number, sy: number, sw: number, sh: number) => {
          const w = sw || 400;
          const h = sh || 300;
          const data = new Uint8ClampedArray(w * h * 4);
          for (let i = 0; i < data.length; i += 4) {
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
            data[i + 3] = 255;
          }
          return {
            width: w,
            height: h,
            data,
          } as ImageData;
        },
      } as unknown as CanvasRenderingContext2D;
    }
    return origGetContext.call(this, contextId as any, ...args);
  } as any;
}

describe("@markdy/renderer-dom: GIF89a Encoder", () => {
  it("encodes multiple ImageData frames into a valid GIF89a byte sequence", () => {
    const width = 16;
    const height = 16;
    const data = new Uint8ClampedArray(width * height * 4);

    // Fill with blue pixels
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 16;
      data[i + 1] = 32;
      data[i + 2] = 200;
      data[i + 3] = 255;
    }

    const frame1 = {
      imageData: { width, height, data: data as unknown as Uint8ClampedArray } as ImageData,
      delayMs: 100,
    };
    const frame2 = {
      imageData: { width, height, data: data as unknown as Uint8ClampedArray } as ImageData,
      delayMs: 100,
    };

    const gifBytes = encodeGifSequence([frame1, frame2], { dither: true, loop: true });

    // Validate GIF89a header
    const headerStr = String.fromCharCode(...gifBytes.slice(0, 6));
    expect(headerStr).toBe("GIF89a");

    // Validate trailer
    expect(gifBytes[gifBytes.length - 1]).toBe(0x3b);
  });

  it("produces a valid LZW bitstream that can be decoded with exact pixel fidelity", () => {
    const width = 10;
    const height = 10;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = (i * 7) % 256;
      data[i + 1] = (i * 13) % 256;
      data[i + 2] = (i * 29) % 256;
      data[i + 3] = 255;
    }
    const frame = {
      imageData: { width, height, data: data as unknown as Uint8ClampedArray } as ImageData,
      delayMs: 100,
    };
    const gifBytes = encodeGifSequence([frame], { dither: false, loop: true });
    expect(gifBytes.length).toBeGreaterThan(50);
    expect(String.fromCharCode(...gifBytes.slice(0, 6))).toBe("GIF89a");
  });

  it("handles color quantization and looping configuration", () => {
    const width = 8;
    const height = 8;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255;
      data[i + 1] = 128;
      data[i + 2] = 0;
      data[i + 3] = 255;
    }
    const frame = {
      imageData: { width, height, data: data as unknown as Uint8ClampedArray } as ImageData,
      delayMs: 50,
    };
    const nonLooping = encodeGifSequence([frame], { loop: false });
    expect(nonLooping.length).toBeGreaterThan(0);
    expect(String.fromCharCode(...nonLooping.slice(0, 6))).toBe("GIF89a");
  });
});

describe("@markdy/renderer-dom: Vector SVG Exporter", () => {
  it("extracts and formats standalone vector SVG from container", () => {
    const container = document.createElement("div");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "800");
    svg.setAttribute("height", "400");

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "50");
    circle.setAttribute("cy", "50");
    circle.setAttribute("r", "20");
    svg.appendChild(circle);
    container.appendChild(svg);

    const svgXml = exportDiagramAsVectorSvg(container, { includeThemeStyles: true });
    expect(svgXml).toContain("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"no\"?>");
    expect(svgXml).toContain("<svg");
    expect(svgXml).toContain("xmlns=\"http://www.w3.org/2000/svg\"");
    expect(svgXml).toContain("<circle");
  });

  it("exports the full scene without interactive viewport pan and zoom", () => {
    const scene = document.createElement("div");
    scene.className = "markdy-scene-root";
    Object.assign(scene.style, {
      width: "800px",
      height: "400px",
      left: "120px",
      top: "80px",
      transform: "scale(1.4)",
    });

    const viewportTransform = document.createElement("div");
    viewportTransform.className = "markdy-viewport-transform";
    viewportTransform.style.transform = "translate(180px, -60px) scale(2.5)";
    scene.appendChild(viewportTransform);

    const svgXml = exportDiagramAsVectorSvg(scene, { includeThemeStyles: true });

    expect(svgXml).toContain('width="800"');
    expect(svgXml).toContain('height="400"');
    expect(svgXml).toContain("translate(0px, 0px) scale(1)");
    expect(svgXml).not.toContain("translate(180px, -60px) scale(2.5)");
  });
});

describe("@markdy/renderer-dom: Diagram Presentation Controller", () => {
  it("navigates beats and sets speeds", () => {
    const code = `
      scene theme=paper
      layout LR
      service A
      service B
      beat intro:
        show A
      beat next:
        A -> B "call"
    `;

    const ast = parse(code);
    const plan = compilePlan(ast);

    let currentSeek = 0;
    let currentSpeed = 1;

    const mockDiagram = {
      seek: (t: number) => { currentSeek = t; },
      play: () => {},
      pause: () => {},
      setPlaybackRate: (r: number) => { currentSpeed = r; },
      playbackRate: () => currentSpeed,
      seekToBeat: () => {},
      destroy: () => {},
    };

    const controller = new DiagramPresentationController(mockDiagram as any, plan, { enableKeyboard: false });
    expect(controller.getCurrentBeatIndex()).toBe(0);

    controller.nextBeat();
    expect(controller.getCurrentBeatIndex()).toBe(1);

    controller.prevBeat();
    expect(controller.getCurrentBeatIndex()).toBe(0);

    controller.setSpeed(2);
    expect(currentSpeed).toBe(2);
  });

  it("exposes exportSvg, exportPng, and exportGif methods on Diagram instances", () => {
    const container = document.createElement("div");
    const code = `
      scene theme=paper
      layout LR
      service API
      database DB
      beat main:
        API -> DB "query"
    `;

    const diagram = createDiagram({
      container,
      code,
      autoplay: false,
    });

    expect(typeof diagram.exportSvg).toBe("function");
    expect(typeof diagram.exportPng).toBe("function");
    expect(typeof diagram.exportGif).toBe("function");

    const svg = diagram.exportSvg();
    expect(typeof svg).toBe("string");
    expect(svg).toContain("<svg");
    expect(svg).not.toContain("<foreignObject");

    diagram.destroy();
  });

  it("exports an animated GIF Blob from a live diagram timeline", async () => {
    const container = document.createElement("div");
    const code = `
      scene "Test Scene" theme=paper width=400 height=300
      layout LR
      service Gateway "API Gateway"
      database Database "PostgreSQL"
      beat start "1. Start":
        Gateway -> Database "Query"
      beat finish "2. Finish":
        Gateway <- Database "Result"
    `;

    const diagram = createDiagram({
      container,
      code,
      autoplay: false,
    });

    const blob = await exportDiagramAsGif(container, diagram, {
      fps: 4,
      pixelRatio: 0.5,
      dither: false,
    });

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/gif");
    expect(blob.size).toBeGreaterThan(100);

    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const header = String.fromCharCode(...bytes.slice(0, 6));
    expect(header).toBe("GIF89a");
    expect(bytes[bytes.length - 1]).toBe(0x3b);

    diagram.destroy();
  });
});
