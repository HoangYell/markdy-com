import { describe, it, expect } from "vitest";
import { parseAndCompile } from "@markdy/core";
import { createNodeEl } from "../src/nodes";

const SAMPLE = `
scene "Test" theme=midnight
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
});
