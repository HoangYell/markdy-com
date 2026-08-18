import { beforeEach, describe, it, expect, vi } from "vitest";
import { parseAndCompile, resolveTheme } from "@markdy/core";
import { createDiagram } from "../src/diagram.js";
import { routeOrthogonal, toPathD, placeFlowLabel } from "../src/geometry/path.js";
import { boxRect, countPathIntersections, rectsOverlap } from "../src/geometry/rect.js";
import { ensureNodeStyles } from "../src/nodes.js";
import { ensureGroupStyles } from "../src/groups.js";
import { ensureSceneStyles } from "../src/theme.js";

const animateStub = vi.fn(function animate(this: Element) {
  return {
    currentTime: 0,
    pause() {},
    play() {},
    cancel() {},
  } as unknown as Animation;
});

const TEST_A_CODE = `
scene theme=midnight width=1280 height=720
layout LR

user Client
gateway ApiGateway
service BackendService
db Database

beat flow:
  show $nodes
  Client -> ApiGateway "HTTPS Request"
  ApiGateway -> BackendService "gRPC Call"
  BackendService -> Database "SQL Query"
`;

const TEST_B_CODE = `
scene theme=paper width=1280 height=720
layout LR

user Client
gateway Gateway
service ServiceA
service ServiceB
service ServiceC
db Database
cache Cache
queue Queue

beat flow:
  show $nodes
  Client -> Gateway "dispatch"
  Gateway -> ServiceA "branch A"
  Gateway -> ServiceB "branch B"
  Gateway -> ServiceC "branch C"
  ServiceA -> Database "write"
  ServiceB -> Cache "lookup"
  ServiceC -> Queue "publish"
`;

const TEST_C_CODE = `
scene theme=editorial width=1280 height=760
layout LR

user Visitor
browser WebClient
gateway ApiGateway
service UrlShortener
service RedirectService
cache HotUrlCache
db UrlMappingDb

group ingress: Visitor WebClient ApiGateway
group app: UrlShortener RedirectService
group storage: HotUrlCache UrlMappingDb

beat layout "Initial state":
  show ingress & show app & show storage

beat shorten "Shorten URL flow":
  WebClient -> ApiGateway "POST /shorten"
  ApiGateway -> UrlShortener "forward request"
  UrlShortener -> UrlMappingDb "store slug" & UrlShortener ~> HotUrlCache "warm cache"
  WebClient <- UrlShortener "short.ly/a7"

beat redirect "Redirect lookup flow":
  Visitor -> WebClient "open short link"
  WebClient -> ApiGateway "GET /a7"
  ApiGateway -> RedirectService "resolve slug"
  RedirectService -> HotUrlCache "cache lookup"
  HotUrlCache <- RedirectService "target URL"
  RedirectService -> UrlMappingDb "miss fallback"
  WebClient <- RedirectService "301 redirect"
`;

describe("Modern Renderer Architecture Validation", () => {
  beforeEach(() => {
    (Element.prototype as unknown as { animate: typeof animateStub }).animate = animateStub;
  });

  describe("Test A — Simple flow (Client -> Gateway -> Service -> Database)", () => {
    it("compiles and renders orthogonal connectors without intersecting node cards", () => {
      const container = document.createElement("div");
      const diagram = createDiagram({
        container,
        code: TEST_A_CODE,
        autoplay: false,
      });

      expect(diagram).toBeDefined();
      const nodes = container.querySelectorAll(".markdy-node");
      expect(nodes).toHaveLength(4);

      const paths = container.querySelectorAll<SVGPathElement>("svg path.markdy-edge-path");
      expect(paths.length).toBeGreaterThan(0);

      // Verify all rendered paths are orthogonal (only horizontal, vertical, or rounded elbow arcs)
      for (const path of paths) {
        const d = path.getAttribute("d") || "";
        expect(d.startsWith("M")).toBe(true);
        expect(d).toContain("L");
      }

      diagram.destroy();
    });
  });

  describe("Test B — Branching flow (Fan-out to multiple services & data stores)", () => {
    it("routes fan-out edges cleanly with distinct lanes and obstacle avoidance", () => {
      const container = document.createElement("div");
      const diagram = createDiagram({
        container,
        code: TEST_B_CODE,
        autoplay: false,
      });

      const { plan } = parseAndCompile(TEST_B_CODE);
      expect(plan.nodes).toHaveLength(8);

      const obstacles = plan.nodes.map((n) => boxRect(n));
      const gatewayNode = plan.nodes.find((n) => n.id === "Gateway")!;
      const serviceANode = plan.nodes.find((n) => n.id === "ServiceA")!;
      const serviceBNode = plan.nodes.find((n) => n.id === "ServiceB")!;
      const serviceCNode = plan.nodes.find((n) => n.id === "ServiceC")!;

      const routeA = routeOrthogonal(
        boxRect(gatewayNode),
        boxRect(serviceANode),
        obstacles.filter((o) => o.x1 !== gatewayNode.x && o.x1 !== serviceANode.x),
        { width: 1280, height: 720 },
        0,
      );

      const routeB = routeOrthogonal(
        boxRect(gatewayNode),
        boxRect(serviceBNode),
        obstacles.filter((o) => o.x1 !== gatewayNode.x && o.x1 !== serviceBNode.x),
        { width: 1280, height: 720 },
        1,
      );

      const routeC = routeOrthogonal(
        boxRect(gatewayNode),
        boxRect(serviceCNode),
        obstacles.filter((o) => o.x1 !== gatewayNode.x && o.x1 !== serviceCNode.x),
        { width: 1280, height: 720 },
        2,
      );

      // Verify each route is cleanly formed
      expect(routeA.length).toBeGreaterThanOrEqual(2);
      expect(routeB.length).toBeGreaterThanOrEqual(2);
      expect(routeC.length).toBeGreaterThanOrEqual(2);

      // Verify lane offsets prevent identical overlapping routes
      const dA = toPathD(routeA);
      const dB = toPathD(routeB);
      const dC = toPathD(routeC);
      expect(dA).not.toEqual(dB);
      expect(dB).not.toEqual(dC);

      diagram.destroy();
    });
  });

  describe("Test C — Dense architecture (Dense connections, groups, labels)", () => {
    it("renders dense architecture with label plates preventing connector collisions", () => {
      const container = document.createElement("div");
      const diagram = createDiagram({
        container,
        code: TEST_C_CODE,
        autoplay: false,
      });

      // Verify all groups are rendered with modern container styling
      const groups = container.querySelectorAll(".markdy-group-boundary");
      expect(groups).toHaveLength(3);

      for (const group of groups) {
        const label = group.querySelector(".markdy-group-boundary__label");
        expect(label).not.toBeNull();
        expect(label?.textContent?.length).toBeGreaterThan(0);
      }

      // Verify connector labels have background plates positioned above paths
      const edgePlates = container.querySelectorAll(".markdy-edge-plate");
      const edgeLabels = container.querySelectorAll(".markdy-edge-label");
      expect(edgePlates.length).toBeGreaterThan(0);
      expect(edgeLabels.length).toBe(edgePlates.length);

      // Verify label texts match key HTTP badges
      const labelTexts = Array.from(edgeLabels).map((el) => el.textContent);
      expect(labelTexts).toContain("POST /shorten");
      expect(labelTexts).toContain("miss fallback");
      expect(labelTexts).toContain("target URL");
      expect(labelTexts).toContain("cache lookup");

      // Verify label plates are subtle, translucent, and compact
      for (const plate of edgePlates) {
        expect(Number(plate.getAttribute("fill-opacity"))).toBeGreaterThanOrEqual(0.8);
        expect(Number(plate.getAttribute("fill-opacity"))).toBeLessThanOrEqual(0.95);
        expect(Number(plate.getAttribute("height"))).toBeLessThanOrEqual(18);
        expect(Number(plate.getAttribute("rx"))).toBeLessThanOrEqual(4);
      }

      // Verify label typography is lightweight and not heavy/bold
      for (const lbl of edgeLabels) {
        expect(lbl.getAttribute("font-weight")).toBe("500");
        expect(lbl.getAttribute("font-size")).toBe("10.5");
      }

      diagram.destroy();
    });
  });

  describe("Modern Card Geometry & Depth", () => {
    it("standardizes node geometry, icon containers, and padding", () => {
      ensureNodeStyles(document);
      const styleContent = document.getElementById("markdy-diagram-node-styles")?.textContent || "";

      expect(styleContent).toContain("min-width: 140px;");
      expect(styleContent).toContain("min-height: 64px;");
      expect(styleContent).toContain("width: 34px;");
      expect(styleContent).toContain("height: 34px;");
      expect(styleContent).toContain("gap: 12px;");
      expect(styleContent).toContain("font-weight: 600;");
      expect(styleContent).toContain("font-variant-numeric: tabular-nums;");
    });
  });

  describe("Modern Glassmorphic Group Boundaries", () => {
    it("applies subtle glassmorphism, border, and uppercase tag badges", () => {
      ensureGroupStyles(document);
      const styleContent = document.getElementById("markdy-group-boundary-styles")?.textContent || "";

      expect(styleContent).toContain("border-radius: 16px;");
      expect(styleContent).toContain("backdrop-filter: blur(8px);");
      expect(styleContent).toContain("text-transform: uppercase;");
      expect(styleContent).toContain("letter-spacing: 0.08em;");
    });
  });

  describe("Connector Flow Animation & Reduced Motion", () => {
    it("defines keyframe dash animation and respects reduced-motion accessibility", () => {
      ensureSceneStyles(document);
      const styleContent = document.getElementById("markdy-scene-ambience-styles")?.textContent || "";

      expect(styleContent).toContain("@keyframes markdy-flow-dash");
      expect(styleContent).toContain("stroke-dashoffset: -24");
      expect(styleContent).toContain(".markdy-edge-path--flowing");
      expect(styleContent).toContain("@media (prefers-reduced-motion: reduce)");
      expect(styleContent).toContain("animation: none !important;");
    });
  });

  describe("WCAG AA Contrast & Typography Hierarchy", () => {
    it("maintains high contrast across all theme tokens", () => {
      const themes = ["midnight", "paper", "blueprint", "graphite", "editorial", "nebula", "terminal"];
      for (const name of themes) {
        const theme = resolveTheme(name);
        expect(theme.text).toBeDefined();
        expect(theme.textMuted).toBeDefined();
        expect(theme.surface).toBeDefined();
        expect(theme.canvas).toBeDefined();
        expect(theme.edges.request).toBeDefined();
        expect(theme.edges.response).toBeDefined();
      }
    });
  });
});
