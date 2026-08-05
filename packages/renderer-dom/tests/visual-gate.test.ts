import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseAndCompile, resolveTheme } from "@markdy/core";
import { createNodeEl, ensureNodeStyles } from "../src/nodes";
import { applyThemeToScene } from "../src/theme";

/**
 * Browser-free visual regression gate. Renders every shipped scene's nodes
 * through the real DOM builder and locks a compact "visual signature" plus a
 * set of no-cheap invariants (no ugly border/rail, every node has a glyph or
 * image and a label). Guards the Phase 1–5 renderer quality work.
 */

const REPO_ROOT = join(__dirname, "..", "..", "..");
const SCENE_DIRS = ["examples/showcase", "examples"];

function loadScenes(): { name: string; code: string }[] {
  const scenes: { name: string; code: string }[] = [];
  for (const dir of SCENE_DIRS) {
    const full = join(REPO_ROOT, dir);
    for (const file of readdirSync(full).filter((f) => f.endsWith(".markdy")).sort()) {
      scenes.push({ name: `${dir}/${file}`, code: readFileSync(join(full, file), "utf8") });
    }
  }
  return scenes;
}

const SCENES = loadScenes();

describe("renderer visual gate", () => {
  it("finds shipped scenes to guard", () => {
    expect(SCENES.length).toBeGreaterThan(0);
  });

  it("node styles keep the premium contract (no cheap border/rail)", () => {
    ensureNodeStyles(document);
    const css = document.getElementById("markdy-diagram-node-styles")?.textContent ?? "";
    // The visible 1px card border and left color rail were the "cheap" signals.
    expect(css).not.toContain("border: 1px solid var(--md-border)");
    expect(css).toContain(".markdy-node__rail { display: none; }");
    // Hairline is drawn via an inset ring, not a border.
    expect(css).toContain("inset 0 0 0 1px var(--md-hairline");
    // Icon plate + image media paths both exist.
    expect(css).toContain(".markdy-node__icon");
    expect(css).toContain('.markdy-node__icon[data-media="image"]');
  });

  it("applies node/hairline/shadow theme tokens to the scene", () => {
    const scene = document.createElement("div");
    applyThemeToScene(scene, resolveTheme("midnight"));
    expect(scene.style.getPropertyValue("--md-node-surface")).not.toBe("");
    expect(scene.style.getPropertyValue("--md-hairline")).not.toBe("");
    expect(scene.style.getPropertyValue("--md-shadow")).not.toBe("");
  });

  it("every node in every scene renders a glyph/image and a label", () => {
    for (const scene of SCENES) {
      const { plan } = parseAndCompile(scene.code);
      expect(plan.nodes.length, `${scene.name} has nodes`).toBeGreaterThan(0);
      for (const node of plan.nodes) {
        const el = createNodeEl(node, plan.theme);
        const media = el.querySelector(".markdy-node__icon");
        const hasGlyph = !!media?.querySelector("svg") || !!media?.querySelector("img");
        const label = el.querySelector(".markdy-node__label")?.textContent ?? "";
        expect(hasGlyph, `${scene.name}:${node.id} has a glyph/image`).toBe(true);
        expect(label.length, `${scene.name}:${node.id} has a label`).toBeGreaterThan(0);
        expect(el.querySelector(".markdy-node__rail"), `${scene.name}:${node.id} has no rail`).toBeNull();
      }
    }
  });

  it("matches the locked visual signature for every scene", () => {
    const signature: Record<string, { id: string; kind: string; role: string; icon: string }[]> = {};
    for (const scene of SCENES) {
      const { plan } = parseAndCompile(scene.code);
      signature[scene.name] = plan.nodes.map((node) => {
        const el = createNodeEl(node, plan.theme);
        return { id: node.id, kind: node.kind, role: node.role, icon: el.dataset.icon ?? "" };
      });
    }
    expect(signature).toMatchSnapshot();
  });
});
