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
});
