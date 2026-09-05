import { describe, it, expect } from "vitest";
import { parse, compilePlan } from "@markdy/core";
import {
  exportDiagramAsVectorSvg,
  renderPureVectorSvg,
  createDiagram,
  exportDiagramAsPng,
} from "../src/index.js";

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

  // Stub Canvas 2D Context and toBlob for jsdom
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

  HTMLCanvasElement.prototype.toBlob = function (callback: BlobCallback, type?: string) {
    const blob = new Blob(["mock-png-data"], { type: type || "image/png" });
    setTimeout(() => callback(blob), 0);
  };
}

describe("SVG Export Alignment & Typography", () => {
  it("includes embedded typography style in defs for consistent standalone rendering", () => {
    const code = `
      scene "Architecture Overview" theme=paper
      layout LR
      service API "API Gateway"
    `;
    const plan = compilePlan(parse(code));
    const svg = renderPureVectorSvg(plan);

    expect(svg).toContain("<style>");
    expect(svg).toContain(".markdy-svg-text");
    expect(svg).toContain(".markdy-svg-mono");
    expect(svg).toContain("dominant-baseline=\"central\"");
  });

  it("applies dominant-baseline central to diagram title and watermark", () => {
    const code = `
      scene "Microservices Architecture" theme=paper
      layout LR
      service API
    `;
    const plan = compilePlan(parse(code));
    const svg = renderPureVectorSvg(plan);

    expect(svg).toMatch(/<text[^>]+class="markdy-svg-text"[^>]+dominant-baseline="central"[^>]*>Microservices Architecture<\/text>/);
    expect(svg).toMatch(/<text[^>]+class="markdy-svg-text"[^>]+dominant-baseline="central"[^>]*>Powered by Markdy<\/text>/);
  });

  it("centers text horizontally and vertically for diamond node shape without icon", () => {
    const code = `
      scene theme=paper
      layout LR
      decision Auth "Is Valid?" shape=diamond
    `;
    const plan = compilePlan(parse(code));
    const svg = renderPureVectorSvg(plan);

    // Diamond should NOT have frameless icon glyph
    expect(svg).toContain('<g id="node-Auth"');
    expect(svg).toContain('<polygon points="');
    expect(svg).toMatch(/<text[^>]+text-anchor="middle"[^>]+dominant-baseline="central"[^>]*>Is Valid\?<\/text>/);
  });

  it("centers icon above label for circle node shape", () => {
    const code = `
      scene theme=paper
      layout LR
      hub Hub "Central Hub" shape=circle
    `;
    const plan = compilePlan(parse(code));
    const svg = renderPureVectorSvg(plan);

    expect(svg).toContain('<g id="node-Hub"');
    expect(svg).toContain('<circle cx="');
    expect(svg).toMatch(/<text[^>]+text-anchor="middle"[^>]+dominant-baseline="central"[^>]*>Central Hub<\/text>/);
  });

  it("aligns single-line and multi-line edge labels with dominant-baseline central", () => {
    const code = `
      scene theme=paper
      layout LR
      service A "Service A"
      service B "Service B"
      service C "Service C"
      beat main:
        A -> B "Single line label"
        B -> C "Multi line label with several words to wrap"
    `;
    const plan = compilePlan(parse(code));
    const svg = renderPureVectorSvg(plan);

    expect(svg).toContain('dominant-baseline="central"');
    // Check all edge text elements have dominant-baseline="central"
    const textMatches = svg.match(/<text[^>]*class="markdy-svg-mono"[^>]*>[^<]+<\/text>/g) || [];
    expect(textMatches.length).toBeGreaterThan(0);
    for (const textEl of textMatches) {
      expect(textEl).toContain('dominant-baseline="central"');
    }
  });

  it("centers sequence message plates and message labels", () => {
    const code = `
      scene "Sequence Flow" type=sequence theme=paper
      user Client
      service Server
      beat main:
        Client -> Server "POST /checkout"
        Client <- Server "200 OK"
    `;
    const plan = compilePlan(parse(code));
    const svg = renderPureVectorSvg(plan);

    expect(svg).toContain('class="markdy-sequence-layer"');
    expect(svg).toMatch(/<text[^>]+text-anchor="middle"[^>]+dominant-baseline="central"[^>]*>POST \/checkout<\/text>/);
    expect(svg).toMatch(/<text[^>]+text-anchor="middle"[^>]+dominant-baseline="central"[^>]*>200 OK<\/text>/);
  });

  it("handles nodes with tech badges and metric values properly", () => {
    const code = `
      scene theme=paper
      layout LR
      database DB "Orders Database" tech="PostgreSQL" value="99.9%"
    `;
    const plan = compilePlan(parse(code));
    const svg = renderPureVectorSvg(plan);

    expect(svg).toMatch(/<text[^>]+class="markdy-svg-text"[^>]+dominant-baseline="central"[^>]*>Orders Database<\/text>/);
    expect(svg).toMatch(/<text[^>]+class="markdy-svg-mono"[^>]+dominant-baseline="central"[^>]*>PostgreSQL<\/text>/);
    expect(svg).toMatch(/<text[^>]+class="markdy-svg-text"[^>]+dominant-baseline="central"[^>]*>99\.9%<\/text>/);
  });

  it("exports high-DPI PNG blob from container", async () => {
    const container = document.createElement("div");
    const code = `
      scene theme=paper
      layout LR
      service API "API Gateway"
      database DB "Main DB"
      beat main:
        API -> DB "SQL query"
    `;
    const diagram = createDiagram({
      container,
      code,
      autoplay: false,
    });

    const blob = await exportDiagramAsPng(container, { pixelRatio: 2 });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/png");

    diagram.destroy();
  });

  it("renders multi-line node labels completely without trimming or truncation in SVG export", () => {
    const code = `
      scene theme=paper
      layout LR
      service Svc "This is a very long service description that wraps across multiple lines and must never be trimmed or truncated"
    `;
    const plan = compilePlan(parse(code));
    const svg = renderPureVectorSvg(plan);

    expect(svg).toContain("This is a very long");
    expect(svg).toContain("multiple lines and must never be");
    expect(svg).toContain("trimmed or truncated");
    expect(svg).not.toContain("...");
  });
});
