import { describe, it, expect } from "vitest";
import { parseAndCompile, THEMES } from "@markdy/core";
import {
  buildCueAnimations,
  buildStructuralEdgeAnimations,
  computeFrameTransform,
  createEdgeRuntime,
  ensureEdgeLayer,
} from "../src/edges";
import { createBeatCaptionLayer } from "../src/diagram";
import { mountAnnotations } from "../src/annotations";
import { mountGroupBoundaries } from "../src/groups";
import { createNodeEl, ICON_REGISTRY } from "../src/nodes";
import { selfLoopPath } from "../src/geometry/path";
import { mountConstellationLayer } from "../src/constellation";
import { mountRadarLayer } from "../src/radar";
import { mountTimelineLayer } from "../src/timeline";
import { mountSequenceLayer } from "../src/sequence";

const SAMPLE = `
scene theme=midnight
browser Web
service API

beat main:
  show $nodes
  Web -> API "ping"
`;

describe("diagram render plan", () => {
  it("compiles cues for playback", () => {
    const { plan } = parseAndCompile(SAMPLE);
    expect(plan.nodes).toHaveLength(2);
    expect(plan.cues.length).toBeGreaterThan(0);
    expect(plan.theme.name).toBe("midnight");
  });

  it("renders node cards with label-first icons and preserved kind metadata", () => {
    const node = {
      id: "Web",
      kind: "browser",
      role: "client",
      label: "Browser",
      x: 0,
      y: 0,
      width: 168,
      height: 72,
      opacity: 0,
    };
    const theme = {
      roles: { client: "#38bdf8" },
      accent: "#38bdf8",
    } as any;
    const el = createNodeEl(node, theme);
    expect(el.querySelector(".markdy-node__label")?.textContent).toBe("Browser");
    expect(el.querySelector(".markdy-node__icon svg")).not.toBeNull();
    expect(el.dataset.kind).toBe("browser");
    expect(el.dataset.icon).toBe("browser");
    expect(el.title).toBe("Browser (browser)");
    expect(el.getAttribute("aria-label")).toBe("Browser (browser)");
  });

  it("uses role fallback icons for broad vocabulary families", () => {
    const theme = {
      roles: { code: "#a78bfa", distributed: "#22c55e" },
      accent: "#38bdf8",
    } as any;

    const codeNode = createNodeEl({
      id: "SDK",
      kind: "sdk",
      role: "code",
      label: "SDK",
      x: 0,
      y: 0,
      width: 168,
      height: 72,
      opacity: 0,
    }, theme);
    const distributedNode = createNodeEl({
      id: "Leader",
      kind: "leader",
      role: "distributed",
      label: "Leader",
      x: 0,
      y: 0,
      width: 168,
      height: 72,
      opacity: 0,
    }, theme);

    expect(codeNode.dataset.icon).toBe("code");
    expect(distributedNode.dataset.icon).toBe("distributed");
  });

  it("honors an explicit icon= override from node props", () => {
    const theme = { roles: { data: "#22c55e" }, accent: "#38bdf8" } as any;
    const el = createNodeEl({
      id: "Redis",
      kind: "cache",
      role: "data",
      label: "Redis",
      x: 0,
      y: 0,
      width: 168,
      height: 72,
      opacity: 0,
      props: { icon: "database" },
    }, theme);
    expect(el.dataset.icon).toBe("database");
  });

  it("applies declared style props to node CSS variables", () => {
    const theme = { roles: { data: "#22c55e" }, accent: "#38bdf8" } as any;
    const el = createNodeEl({
      id: "Primary",
      kind: "database",
      role: "data",
      label: "Primary",
      x: 0,
      y: 0,
      width: 168,
      height: 72,
      opacity: 0,
      style: { fill: "#f59e0b", stroke: "#92400e", text: "#111827", accent: "#ef4444" },
    }, theme);
    expect(el.style.getPropertyValue("--md-node-surface")).toBe("#f59e0b");
    expect(el.style.getPropertyValue("--md-node-surface-raised")).toBe("color-mix(in srgb, #f59e0b 90%, #ffffff 10%)");
    expect(el.style.getPropertyValue("--md-hairline")).toBe("#92400e");
    expect(el.style.getPropertyValue("--md-role-color")).toBe("#ef4444");
    expect(el.style.color).toBe("rgb(17, 24, 39)");
  });

  it("renders an <img> for image= and applies the assets override", () => {
    const theme = { roles: { data: "#22c55e" }, accent: "#38bdf8" } as any;
    const el = createNodeEl({
      id: "Store",
      kind: "bucket",
      role: "data",
      label: "Object Storage",
      x: 0,
      y: 0,
      width: 168,
      height: 72,
      opacity: 0,
      props: { image: "s3-logo", imageFit: "cover" },
    }, theme, { "s3-logo": "https://cdn.example/s3.svg" });
    const media = el.querySelector<HTMLElement>(".markdy-node__icon");
    const img = media?.querySelector("img");
    expect(media?.dataset.media).toBe("image");
    expect(media?.dataset.fit).toBe("cover");
    expect(img?.getAttribute("src")).toBe("https://cdn.example/s3.svg");
  });

  it("uses the raw image value when no asset override matches", () => {
    const theme = { roles: { data: "#22c55e" }, accent: "#38bdf8" } as any;
    const el = createNodeEl({
      id: "Logo",
      kind: "service",
      role: "compute",
      label: "API",
      x: 0,
      y: 0,
      width: 168,
      height: 72,
      opacity: 0,
      props: { logo: "/logos/api.svg" },
    }, theme);
    const img = el.querySelector<HTMLImageElement>(".markdy-node__icon img");
    expect(img?.getAttribute("src")).toBe("/logos/api.svg");
    expect(el.querySelector(".markdy-node__icon svg")).toBeNull();
  });

  it("computes deterministic camera transforms for frame cues", () => {
    const nodes = [
      { id: "A", kind: "service", role: "compute", label: "A", x: 100, y: 120, width: 168, height: 72, opacity: 1 },
      { id: "B", kind: "database", role: "data", label: "B", x: 520, y: 340, width: 168, height: 72, opacity: 1 },
    ];

    expect(computeFrameTransform(["A", "B"], nodes, { width: 1280, height: 720 }, 1)).toBe("translate(0px, 0px) scale(1)");
    expect(computeFrameTransform(["A", "B"], nodes, { width: 1280, height: 720 }, 1.4)).toBe("translate(0px, 0px) scale(1)");
    expect(computeFrameTransform(["A"], nodes, { width: 1280, height: 720 }, 1.25)).toBe("translate(410px, 165px) scale(1.25)");
    expect(computeFrameTransform(["Missing"], nodes, { width: 1280, height: 720 }, 1.25)).toBeUndefined();
  });

  it("builds beat captions only for labeled beats", () => {
    const layer = createBeatCaptionLayer(document, [
      { name: "intro", label: "Reveal the system", start: 0, end: 1 },
      { name: "silent", start: 1, end: 2 },
      { name: "finish", label: "Wrap up", start: 2, end: 3 },
    ]);
    const captions = layer.querySelectorAll(".markdy-beat-caption");
    expect(captions).toHaveLength(2);
    expect([...captions].map((c) => c.textContent)).toEqual(["Reveal the system", "Wrap up"]);
    expect([...captions].map((c) => (c as HTMLElement).dataset.beat)).toEqual(["intro", "finish"]);
  });

  it("renders shape metadata and editorial flat-card styling", () => {
    const el = createNodeEl({
      id: "Check",
      kind: "decision",
      role: "flow",
      label: "Valid?",
      x: 0,
      y: 0,
      width: 168,
      height: 72,
      opacity: 0,
      shape: "diamond",
      focal: true,
    }, THEMES.editorial);
    expect(el.dataset.shape).toBe("diamond");
    expect(el.dataset.focal).toBe("1");
    expect(el.querySelector(".markdy-node__icon")).toBeNull();
    expect(el.querySelector(".markdy-node__label")?.textContent).toBe("Valid?");
    expect(el.getAttribute("aria-label")).toBe("Valid? (decision)");
    expect(THEMES.editorial.flatCards).toBe(true);
    expect(THEMES.editorial.accent).toBe("#047857");
    expect(THEMES.editorial.spacing?.md).toBe(16);
  });

  it("mounts group boundaries and annotation callouts", () => {
    const groupLayer = document.createElement("div");
    mountGroupBoundaries(groupLayer, [{
      id: "backend",
      label: "Backend",
      x: 40,
      y: 120,
      width: 400,
      height: 200,
      memberIds: ["API"],
    }], THEMES.editorial);
    expect(groupLayer.querySelector(".markdy-group-boundary")).not.toBeNull();
    expect(groupLayer.querySelector(".markdy-group-boundary__label")?.textContent).toBe("Backend");

    const annLayer = document.createElement("div");
    mountAnnotations(annLayer, [{
      id: "a1",
      text: "Hot path",
      target: "API",
      position: "top-right",
      line: 1,
    }], [{
      id: "API",
      kind: "service",
      role: "compute",
      label: "API",
      x: 200,
      y: 200,
      width: 168,
      height: 72,
      opacity: 1,
    }], THEMES.editorial, { width: 1280, height: 720 });
    expect(annLayer.querySelector(".markdy-annotation")?.textContent).toBe("Hot path");
    expect(annLayer.querySelector("path")).not.toBeNull();
  });

  it("creates structural edge paths in the SVG layer", () => {
    const host = document.createElement("div");
    Object.assign(host.style, { position: "relative", width: "1280px", height: "720px" });
    const nodes = [
      { id: "A", kind: "service", role: "compute", label: "A", x: 100, y: 200, width: 168, height: 72, opacity: 1 },
      { id: "B", kind: "service", role: "compute", label: "B", x: 400, y: 200, width: 168, height: 72, opacity: 1 },
    ];
    const svg = ensureEdgeLayer(host);
    createEdgeRuntime(
      svg,
      nodes[0],
      nodes[1],
      "dependency",
      undefined,
      THEMES.editorial,
      "test-scene",
      [],
      [],
      { width: 1280, height: 720 },
      0,
    );
    expect(host.querySelector("svg path")).not.toBeNull();
    expect(host.querySelector("[data-edge-kind='dependency']")).not.toBeNull();
  });

  it("routes circle-to-circle edges between circular boundaries", () => {
    const host = document.createElement("div");
    const nodes = [
      { id: "A", kind: "service", role: "compute", label: "A", x: 100, y: 100, width: 136, height: 136, opacity: 1, shape: "circle" as const },
      { id: "B", kind: "service", role: "compute", label: "B", x: 300, y: 100, width: 136, height: 136, opacity: 1, shape: "circle" as const },
    ];
    const svg = ensureEdgeLayer(host);
    createEdgeRuntime(
      svg,
      nodes[0],
      nodes[1],
      "request",
      undefined,
      THEMES.editorial,
      "circle-route",
      [],
      [],
      { width: 600, height: 360 },
      0,
    );

    expect(host.querySelector<SVGPathElement>("g[data-edge-kind='request'] path")?.getAttribute("d")).toBe("M 236 168 L 300 168");
  });

  it("keeps structural edges visible and resolves `$edges` emphasis", () => {
    const host = document.createElement("div");
    const title = document.createElement("div");
    const nodes = [
      { id: "A", kind: "service", role: "compute", label: "A", x: 100, y: 200, width: 168, height: 72, opacity: 1 },
      { id: "B", kind: "service", role: "compute", label: "B", x: 400, y: 200, width: 168, height: 72, opacity: 1 },
    ];
    const edge = { id: "edge_1", kind: "dependency" as const, from: "A", to: "B", structural: true, selfLoop: false };
    const runtimes = new Map();
    expect(buildStructuralEdgeAnimations(
      [edge],
      nodes,
      THEMES.editorial,
      host,
      { width: 1280, height: 720 },
      runtimes,
      "test-edge",
    )).toEqual([]);
    expect(runtimes.get("edge_1")?.group.style.opacity).toBe("1");

    const fakeAnimate = () => ({ pause() {} }) as unknown as Animation;
    (title as unknown as { animate: typeof fakeAnimate }).animate = fakeAnimate;
    (runtimes.get("edge_1")!.path as unknown as { animate: typeof fakeAnimate }).animate = fakeAnimate;
    const animations = buildCueAnimations(
      [{
        start: 0,
        duration: 0.5,
        kind: "glow",
        targets: ["edge_1"],
        params: { color: "#047857", strength: 1 },
        beat: "main",
      }],
      new Map(),
      nodes,
      THEMES.editorial,
      host,
      title,
      { width: 1280, height: 720 },
      [edge],
      runtimes,
      "test-edge",
    );
    expect(animations.length).toBeGreaterThan(1);
    expect(runtimes.get("edge_1")?.path).toBeDefined();
  });

  it("renders sequence lifelines, messages, and activation spans", () => {
    const layer = document.createElement("div");
    const nodes = [
      { id: "Client", kind: "participant", role: "flow", label: "Client", x: 100, y: 124, width: 168, height: 72, opacity: 1 },
      { id: "API", kind: "participant", role: "flow", label: "API", x: 500, y: 124, width: 168, height: 72, opacity: 1 },
    ];
    const originalAnimate = (SVGElement.prototype as unknown as { animate?: unknown }).animate;
    (SVGElement.prototype as unknown as { animate: () => Animation }).animate = () => ({ pause() {} }) as unknown as Animation;
    let animations: Animation[];
    try {
      animations = mountSequenceLayer(
        layer,
        nodes,
        [{
          id: "sequence_1",
          from: "Client",
          to: "API",
          kind: "request",
          label: "request",
          y: 240,
          start: 0,
          duration: 0.5,
          beat: "main",
        }],
        [{
          id: "sequence_1_Client",
          participant: "Client",
          y: 222,
          height: 36,
          start: 0,
          duration: 0.5,
        }],
        THEMES.editorial,
        { width: 1280, height: 720 },
      );
    } finally {
      if (originalAnimate) {
        (SVGElement.prototype as unknown as { animate: unknown }).animate = originalAnimate;
      } else {
        delete (SVGElement.prototype as unknown as { animate?: unknown }).animate;
      }
    }
    expect(layer.querySelectorAll(".markdy-sequence-lifeline")).toHaveLength(2);
    expect(layer.querySelectorAll(".markdy-sequence-message")).toHaveLength(1);
    expect(layer.querySelectorAll(".markdy-sequence-activation")).toHaveLength(1);
    expect(animations.length).toBe(2);
  });

  it("renders deterministic nebula constellation decoration", () => {
    const layer = document.createElement("div");
    mountConstellationLayer(
      layer,
      [
        { id: "Core", kind: "service", role: "compute", label: "Core", x: 500, y: 300, width: 168, height: 72, opacity: 1, focal: true },
        { id: "North", kind: "service", role: "compute", label: "North", x: 200, y: 120, width: 168, height: 72, opacity: 1 },
        { id: "South", kind: "service", role: "compute", label: "South", x: 800, y: 480, width: 168, height: 72, opacity: 1 },
      ],
      THEMES.nebula,
      { width: 1280, height: 720 },
    );
    expect(layer.querySelectorAll(".markdy-constellation-star")).toHaveLength(28);
    expect(layer.querySelectorAll(".markdy-constellation-link")).toHaveLength(2);
    expect(layer.querySelector("circle[fill^='url(#md-constellation-']")).not.toBeNull();
  });

  it("exposes a read-only icon registry", () => {
    expect(ICON_REGISTRY.database).toBeDefined();
    expect(ICON_REGISTRY.security).toBeDefined();
  });

  it("routes self-loop edges with dedicated geometry", () => {
    const node = { id: "Loop", kind: "state", role: "flow", label: "Loop", x: 200, y: 200, width: 168, height: 72, opacity: 1 };
    const points = selfLoopPath(node);
    expect(points.length).toBeGreaterThan(3);
  });

  it("renders radar web axes, concentric rings, and benchmark polygon", () => {
    const layer = document.createElement("div");
    const nodes = [
      { id: "A", kind: "metric", role: "data", label: "Metric A", x: 500, y: 100, width: 140, height: 50, opacity: 1 },
      { id: "B", kind: "metric", role: "data", label: "Metric B", x: 750, y: 300, width: 140, height: 50, opacity: 1 },
      { id: "C", kind: "metric", role: "data", label: "Metric C", x: 650, y: 550, width: 140, height: 50, opacity: 1 },
      { id: "D", kind: "metric", role: "data", label: "Metric D", x: 350, y: 550, width: 140, height: 50, opacity: 1 },
      { id: "E", kind: "metric", role: "data", label: "Metric E", x: 250, y: 300, width: 140, height: 50, opacity: 1 },
    ];
    mountRadarLayer(layer, nodes, THEMES.default, { width: 1000, height: 700 });
    // 5 radial spoke lines
    expect(layer.querySelectorAll("line")).toHaveLength(5);
    // 3 concentric polygon rings + 1 benchmark area polygon = 4 polygons
    expect(layer.querySelectorAll("polygon")).toHaveLength(4);
  });

  it("renders milestone timeline horizontal track, vertical stems, and milestone pips", () => {
    const layer = document.createElement("div");
    const nodes = [
      { id: "M1", kind: "milestone", role: "flow", label: "v1.0", x: 100, y: 200, width: 140, height: 50, opacity: 1 },
      { id: "M2", kind: "milestone", role: "flow", label: "v2.0", x: 400, y: 440, width: 140, height: 50, opacity: 1, focal: true },
      { id: "M3", kind: "milestone", role: "flow", label: "v3.0", x: 700, y: 200, width: 140, height: 50, opacity: 1 },
    ];
    mountTimelineLayer(layer, nodes, THEMES.editorial, { width: 1000, height: 700 });
    // 1 baseline line + 3 vertical stem lines = 4 lines
    expect(layer.querySelectorAll("line")).toHaveLength(4);
    // 3 milestone circle pips
    expect(layer.querySelectorAll("circle")).toHaveLength(3);
  });

  it("snaps edge route endpoints to diamond node boundary", () => {
    const scene = document.createElement("div");
    const svg = ensureEdgeLayer(scene);
    const fromNode = {
      id: "Workload",
      kind: "decision",
      role: "flow",
      label: "Workload Type",
      x: 485,
      y: 100,
      width: 180,
      height: 76,
      opacity: 1,
      shape: "diamond" as const,
    };
    const toNode = {
      id: "IOBound",
      kind: "condition",
      role: "flow",
      label: "I/O-Bound",
      x: 240,
      y: 260,
      width: 180,
      height: 76,
      opacity: 1,
      shape: "diamond" as const,
    };
    const runtime = createEdgeRuntime(
      svg,
      fromNode,
      toNode,
      "request",
      "test",
      THEMES.editorial,
      "test-scene",
      [],
      [],
      { width: 1150, height: 650 },
      0,
    );
    expect(runtime.points.length).toBeGreaterThanOrEqual(2);
    const p0 = runtime.points[0];
    const cx = fromNode.x + fromNode.width / 2;
    const cy = fromNode.y + fromNode.height / 2;
    const hw = fromNode.width / 2;
    const hh = fromNode.height / 2;
    // p0 should satisfy the diamond boundary equation |x-cx|/hw + |y-cy|/hh ≈ 1
    const diamondEq = Math.abs(p0.x - cx) / hw + Math.abs(p0.y - cy) / hh;
    expect(Math.abs(diamondEq - 1)).toBeLessThan(0.05);
  });
});
