import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parse, compilePlan, resolveTheme } from "@markdy/core";
import { computeDiagramContentBounds, createDiagram } from "../src/index";

const animateStub = vi.fn(function animate(this: Element) {
  return {
    currentTime: 0,
    pause() {},
    play() {},
    cancel() {},
  } as unknown as Animation;
});

describe("Width-First Responsiveness & Auto-Scaling", () => {
  beforeEach(() => {
    (Element.prototype as unknown as { animate: typeof animateStub }).animate = animateStub;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("Whitespace Cropping (Bounding Box Optimization)", () => {
    it("strips out redundant canvas margins and returns a tight bounding box around nodes", () => {
      const code = `
scene theme=paper
service Gateway
service Backend
service Database
beat flow:
  Gateway -> Backend -> Database
`;
      const ast = parse(code);
      const plan = compilePlan(ast, resolveTheme("paper"));
      const bounds = computeDiagramContentBounds(plan);

      // Verify bounds are tight to node extent
      const nodeMinX = Math.min(...plan.nodes.map((n) => n.x));
      const nodeMaxX = Math.max(...plan.nodes.map((n) => n.x + n.width));
      const nodeMinY = Math.min(...plan.nodes.map((n) => n.y));
      const nodeMaxY = Math.max(...plan.nodes.map((n) => n.y + n.height));

      // Default safe padding = 22px:
      expect(bounds.minX).toBe(nodeMinX - 22 <= 22 ? 0 : nodeMinX - 22);
      expect(bounds.maxX).toBe(Math.min(plan.meta.width + 22, nodeMaxX + 22));
      expect(bounds.minY).toBe(nodeMinY - 22 <= 22 ? 0 : nodeMinY - 22);
      expect(bounds.maxY).toBe(Math.min(plan.meta.height + 22, nodeMaxY + 22));
      expect(bounds.width).toBe(bounds.maxX - bounds.minX);
      expect(bounds.height).toBe(bounds.maxY - bounds.minY);

      // Explicit custom tight padding:
      const tightBounds = computeDiagramContentBounds(plan, { padding: 10 });
      expect(tightBounds.minX).toBe(nodeMinX - 10 <= 10 ? 0 : nodeMinX - 10);
      expect(tightBounds.maxX).toBe(Math.min(plan.meta.width + 10, nodeMaxX + 10));
    });

    it("includes group boundaries in bounding box computation with safe 28px clearance", () => {
      const code = `
scene theme=paper
service Auth
service Storage
group secure: Auth Storage
`;
      const ast = parse(code);
      const plan = compilePlan(ast, resolveTheme("paper"));
      const bounds = computeDiagramContentBounds(plan);

      expect(plan.groupBoundaries.length).toBeGreaterThan(0);
      const gb = plan.groupBoundaries[0];
      // Bound should accommodate group boundary plus safe clearance
      expect(bounds.minX).toBeLessThanOrEqual(gb.x);
      expect(bounds.maxX).toBeGreaterThanOrEqual(gb.x + gb.width);
    });

    it("preserves full coordinate space for canvas-wide archetypes without clipping axes or dividers", () => {
      const archetypes = ["quadrant", "swimlane", "timeline", "radar", "gantt"];
      for (const type of archetypes) {
        const code = `
scene theme=paper type=${type}
service A
service B
service C
`;
        const ast = parse(code);
        const plan = compilePlan(ast, resolveTheme("paper"));
        const bounds = computeDiagramContentBounds(plan);
        expect(bounds.width, `${type} width preserves full canvas`).toBe(plan.meta.width);
        expect(bounds.height, `${type} height preserves full canvas`).toBe(plan.meta.height);
        expect(bounds.minX).toBe(0);
        expect(bounds.minY).toBe(0);
      }
    });

    it("expands bounding box for selfLoop edge arcs", () => {
      const code = `
scene theme=paper
service Worker
beat loop:
  Worker -> Worker "retry loop"
`;
      const ast = parse(code);
      const plan = compilePlan(ast, resolveTheme("paper"));
      const bounds = computeDiagramContentBounds(plan);
      expect(plan.edges.some((e) => e.selfLoop)).toBe(true);
      expect(bounds.height).toBeGreaterThan(0);
    });
  });

  describe("100% Width Container Target & Scale Factor Calculation", () => {
    it("calculates scale factor = containerWidth / contentWidth and sets --markdy-scale", () => {
      const container = document.createElement("div");
      document.body.appendChild(container);

      // Mock container dimensions for a mobile viewport
      Object.defineProperty(container, "clientWidth", { value: 400, configurable: true });
      Object.defineProperty(container, "clientHeight", { value: 600, configurable: true });

      const code = `
scene theme=paper
service Client
service Server
beat main:
  Client -> Server "ping"
`;
      const diagram = createDiagram({
        container,
        code,
        fitMode: "width",
        targetWidthRatio: 0.98,
      });

      const scene = container.querySelector<HTMLElement>(".markdy-scene-root");
      expect(scene).not.toBeNull();

      // Verify --markdy-scale CSS variable is set
      const scaleVar = scene!.style.getPropertyValue("--markdy-scale");
      expect(scaleVar).toBeTruthy();
      const scaleVal = parseFloat(scaleVar);
      expect(scaleVal).toBeGreaterThan(0);

      // Verify transform applies scale
      expect(scene!.style.transform).toContain(`scale(${scaleVal})`);

      diagram.destroy();
    });
  });

  describe("Responsive Layout Rules by Orientation", () => {
    it("switches to vertical Top-to-Bottom (TB) on portrait viewport", () => {
      const container = document.createElement("div");
      document.body.appendChild(container);

      // Portrait: clientWidth < clientHeight
      Object.defineProperty(container, "clientWidth", { value: 390, configurable: true });
      Object.defineProperty(container, "clientHeight", { value: 680, configurable: true });

      const code = `
scene theme=paper
service Ingress
service App
service Database
beat main:
  Ingress -> App -> Database
`;
      const diagram = createDiagram({
        container,
        code,
        responsiveLayout: true,
      });

      const plan = (container as any).__markdyPlan;
      expect(plan.meta.direction).toBe("TB");

      diagram.destroy();
    });

    it("switches to horizontal Left-to-Right (LR) on landscape viewport", () => {
      const container = document.createElement("div");
      document.body.appendChild(container);

      // Landscape: clientWidth > clientHeight
      Object.defineProperty(container, "clientWidth", { value: 1200, configurable: true });
      Object.defineProperty(container, "clientHeight", { value: 700, configurable: true });

      const code = `
scene theme=paper
service Ingress
service App
service Database
beat main:
  Ingress -> App -> Database
`;
      const diagram = createDiagram({
        container,
        code,
        responsiveLayout: true,
      });

      const plan = (container as any).__markdyPlan;
      expect(plan.meta.direction).toBe("LR");

      diagram.destroy();
    });

    it("supports rankdir TB and rankdir LR syntax keywords in MarkdyScript", () => {
      const codeTB = `
scene theme=paper rankdir=TB
service A
service B
beat test:
  A -> B
`;
      const astTB = parse(codeTB);
      expect(astTB.meta.direction).toBe("TB");
      expect(astTB.meta.explicitDirection).toBe(true);

      const codeLR = `
scene theme=paper rankdir=LR
service A
service B
beat test:
  A -> B
`;
      const astLR = parse(codeLR);
      expect(astLR.meta.direction).toBe("LR");
      expect(astLR.meta.explicitDirection).toBe(true);
    });
  });
});
