import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDiagram, detectHostTheme } from "../src/index.js";

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

describe("Host Theme Detection & Multi-Framework Embed Compatibility", () => {
  let container: HTMLElement;

  beforeEach(() => {
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-mode");
    document.documentElement.removeAttribute("data-bs-theme");
    document.documentElement.removeAttribute("data-color-mode");
    document.body.className = "";
    document.body.removeAttribute("data-theme");

    container = document.createElement("div");
    container.id = "test-markdy-container";
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it("detects Tailwind CSS dark mode (<html class='dark'>)", () => {
    document.documentElement.className = "dark";
    expect(detectHostTheme(container)).toBe("nebula");
  });

  it("detects Tailwind CSS light mode (<html class='light'>)", () => {
    document.documentElement.className = "light";
    expect(detectHostTheme(container)).toBe("paper");
  });

  it("defaults to paper theme when host environment is neutral or light with no dark indicators", () => {
    expect(detectHostTheme(container)).toBe("paper");
  });

  it("detects Docusaurus & Starlight dark mode (<html data-theme='dark'>)", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    expect(detectHostTheme(container)).toBe("nebula");
  });

  it("detects Bootstrap 5.3 dark mode (<html data-bs-theme='dark'>)", () => {
    document.documentElement.setAttribute("data-bs-theme", "dark");
    expect(detectHostTheme(container)).toBe("nebula");
  });

  it("detects GitHub Markdown color mode (<html data-color-mode='dark'>)", () => {
    document.documentElement.setAttribute("data-color-mode", "dark");
    expect(detectHostTheme(container)).toBe("nebula");
  });

  it("detects scoped dark containers inside light pages (<div class='dark'>)", () => {
    document.documentElement.className = "light";
    const darkParent = document.createElement("div");
    darkParent.className = "dark dark-card";
    document.body.appendChild(darkParent);
    darkParent.appendChild(container);

    expect(detectHostTheme(container)).toBe("nebula");
    darkParent.remove();
  });

  it("detects VS Code webview theme classes (<body class='vscode-dark'>)", () => {
    document.body.className = "vscode-dark";
    expect(detectHostTheme(container)).toBe("nebula");
  });

  it("creates a diagram that automatically mounts with the detected host theme", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    const diagram = createDiagram({
      container,
      code: `scene "Embed Architecture" theme=auto\nlayout LR\nservice API "API Gateway"`,
    });

    const scene = container.querySelector(".markdy-scene-root") as HTMLElement;
    expect(scene.dataset.markdyTheme).toBe("nebula");

    diagram.destroy();
  });

  it("honors custom fixed themes even when embedded inside dark/light sites", () => {
    document.documentElement.setAttribute("data-theme", "dark");
    const diagram = createDiagram({
      container,
      code: `scene "Embed Architecture" theme=terminal\nlayout LR\nservice API "API Gateway"`,
    });

    const scene = container.querySelector(".markdy-scene-root") as HTMLElement;
    expect(scene.dataset.markdyTheme).toBe("terminal");

    diagram.destroy();
  });

  it("detects configurable default themes via argument", () => {
    document.documentElement.className = "light";
    expect(detectHostTheme(container, { light: "doodle", dark: "midnight" })).toBe("doodle");

    document.documentElement.className = "dark";
    expect(detectHostTheme(container, { light: "doodle", dark: "midnight" })).toBe("midnight");
  });

  it("detects configurable default themes via container data attributes", () => {
    container.setAttribute("data-markdy-theme-light", "doodle");
    container.setAttribute("data-markdy-theme-dark", "dracula");

    document.documentElement.className = "light";
    expect(detectHostTheme(container)).toBe("doodle");

    document.documentElement.className = "dark";
    expect(detectHostTheme(container)).toBe("dracula");
  });

  it("detects configurable default themes via window.__MARKDY_DEFAULT_THEMES__", () => {
    (window as any).__MARKDY_DEFAULT_THEMES__ = { light: "doodle", dark: "matrix" };
    try {
      document.documentElement.className = "light";
      expect(detectHostTheme(container)).toBe("doodle");

      document.documentElement.className = "dark";
      expect(detectHostTheme(container)).toBe("matrix");
    } finally {
      delete (window as any).__MARKDY_DEFAULT_THEMES__;
    }
  });

  it("creates a diagram with script defaultThemes (theme: light=doodle dark=nebula)", () => {
    document.documentElement.className = "light";
    const diagramLight = createDiagram({
      container,
      code: `scene "Embed Architecture"\ntheme: light=doodle dark=nebula\nlayout LR\nservice API "API Gateway"`,
    });
    const sceneLight = container.querySelector(".markdy-scene-root") as HTMLElement;
    expect(sceneLight.dataset.markdyTheme).toBe("doodle");
    diagramLight.destroy();

    document.documentElement.className = "dark";
    const diagramDark = createDiagram({
      container,
      code: `scene "Embed Architecture"\ntheme: light=doodle dark=nebula\nlayout LR\nservice API "API Gateway"`,
    });
    const sceneDark = container.querySelector(".markdy-scene-root") as HTMLElement;
    expect(sceneDark.dataset.markdyTheme).toBe("nebula");
    diagramDark.destroy();
  });

  it("creates a diagram with options.defaultThemes (default doodle for light, nebula for dark)", () => {
    document.documentElement.className = "light";
    const diagram = createDiagram({
      container,
      code: `scene "Embed Architecture"\nlayout LR\nservice API "API Gateway"`,
      defaultThemes: { light: "doodle", dark: "nebula" },
    });
    const scene = container.querySelector(".markdy-scene-root") as HTMLElement;
    expect(scene.dataset.markdyTheme).toBe("doodle");
    diagram.destroy();
  });
});
