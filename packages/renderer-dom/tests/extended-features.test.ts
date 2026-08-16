import { describe, it, expect } from "vitest";
import {
  encodeGifSequence,
  exportDiagramAsVectorSvg,
  DiagramPresentationController,
} from "../src/index.js";
import { parse, compilePlan } from "@markdy/core";

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
      scene "Controller Test" theme=paper
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
});
