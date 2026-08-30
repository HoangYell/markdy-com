import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDiagram } from "../src/index";

/**
 * jsdom does not implement the Web Animations API or ResizeObserver, so we
 * stub just enough to assemble a real diagram and drive its timeline. This
 * guards the createDiagram wiring (camera layer, captions, cue animations)
 * that the pure unit tests do not touch.
 */
const animateStub = vi.fn(function animate(this: Element) {
  return {
    currentTime: 0,
    pause() {},
    play() {},
    cancel() {},
  } as unknown as Animation;
});

let animationFrameCallbacks: FrameRequestCallback[] = [];

function pointerEvent(type: string, props: { pointerId?: number; clientX: number; clientY: number; button?: number }): Event {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperties(event, {
    pointerId: { value: props.pointerId ?? 1 },
    clientX: { value: props.clientX },
    clientY: { value: props.clientY },
    button: { value: props.button ?? 0 },
  });
  return event;
}

const SCENE = `
scene theme=paper
layout LR

browser Web
service API
database DB

group backend: API DB

beat intro "Reveal the system":
  show $nodes stagger=60ms

beat trace "Follow the request":
  frame backend zoom=1.2 dur=400ms
  Web -> API "GET /items" -> DB "query"
  Web <- API "200 OK"

beat finish:
  glow backend color=#22c55e
  frame $nodes dur=400ms
`;

describe("createDiagram integration", () => {
  beforeEach(() => {
    animationFrameCallbacks = [];
    (Element.prototype as unknown as { animate: typeof animateStub }).animate = animateStub;
    (HTMLElement.prototype as unknown as { setPointerCapture: (pointerId: number) => void }).setPointerCapture = vi.fn();
    (HTMLElement.prototype as unknown as { releasePointerCapture: (pointerId: number) => void }).releasePointerCapture = vi.fn();
    (HTMLElement.prototype as unknown as { hasPointerCapture: (pointerId: number) => boolean }).hasPointerCapture = vi.fn(() => true);
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      animationFrameCallbacks.push(callback);
      return animationFrameCallbacks.length;
    }));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    animateStub.mockClear();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    delete (Element.prototype as unknown as { animate?: unknown }).animate;
    delete (HTMLElement.prototype as unknown as { setPointerCapture?: unknown }).setPointerCapture;
    delete (HTMLElement.prototype as unknown as { releasePointerCapture?: unknown }).releasePointerCapture;
    delete (HTMLElement.prototype as unknown as { hasPointerCapture?: unknown }).hasPointerCapture;
    vi.unstubAllGlobals();
    delete (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver;
  });

  it("assembles a camera layer, node cards, and beat captions", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const diagram = createDiagram({ container, code: SCENE, autoplay: false, copyright: false });

    expect(container.querySelector(".markdy-camera-layer")).not.toBeNull();
    expect(container.querySelectorAll(".markdy-node")).toHaveLength(3);

    const captions = container.querySelectorAll(".markdy-beat-caption");
    expect([...captions].map((c) => c.textContent)).toEqual(["Reveal the system", "Follow the request"]);

    // Nodes live inside the camera layer so frame cues move them together.
    const camera = container.querySelector(".markdy-camera-layer")!;
    expect(camera.querySelectorAll(".markdy-node")).toHaveLength(3);
    const structuralEdges = camera.querySelector<HTMLElement>(".markdy-structural-edge-host")!;
    const groups = camera.querySelector<HTMLElement>(".markdy-group-layer")!;
    const nodes = camera.querySelector<HTMLElement>(".markdy-scene-node-layer")!;
    expect(Number(groups.style.zIndex)).toBeLessThan(Number(structuralEdges.style.zIndex));
    expect(Number(structuralEdges.style.zIndex)).toBeLessThan(Number(nodes.style.zIndex));

    expect(diagram.duration()).toBeGreaterThan(0);
    expect(diagram.beats().map((b) => b.name)).toEqual(["intro", "trace", "finish"]);
    expect(animateStub).toHaveBeenCalled();

    // Seeking through the timeline must not throw with the stubbed animations.
    expect(() => diagram.seek(diagram.duration() / 2)).not.toThrow();
    diagram.destroy();
    expect(container.querySelector(".markdy-scene-root")).toBeNull();
  });

  it("renders when ResizeObserver is unavailable", () => {
    delete (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver;
    const container = document.createElement("div");
    document.body.appendChild(container);

    const diagram = createDiagram({ container, code: SCENE, autoplay: false, copyright: false });

    expect(container.querySelector(".markdy-camera-layer")).not.toBeNull();
    expect(container.querySelectorAll(".markdy-node")).toHaveLength(3);
    expect(() => diagram.destroy()).not.toThrow();
  });

  it("defaults playback to normalized 1x and falls back to 1x for invalid initial rates", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const diagram = createDiagram({ container, code: SCENE, autoplay: false, copyright: false });
    expect(diagram.playbackRate()).toBe(1);
    diagram.destroy();

    const invalidRateDiagram = createDiagram({ container, code: SCENE, autoplay: false, copyright: false, playbackRate: -1 });
    expect(invalidRateDiagram.playbackRate()).toBe(1);
    invalidRateDiagram.destroy();
  });

  it("treats normalized 1x as Markdy's normal pace", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const diagram = createDiagram({ container, code: SCENE, autoplay: false, copyright: false });

    diagram.play();
    animationFrameCallbacks[0](1000);
    animationFrameCallbacks[1](2000);
    expect(diagram.currentTime()).toBeCloseTo(4 / 5);

    diagram.seek(0);
    diagram.setPlaybackRate(0.5);
    animationFrameCallbacks = [];
    diagram.pause();
    diagram.play();
    animationFrameCallbacks[0](1000);
    animationFrameCallbacks[1](2000);
    expect(diagram.currentTime()).toBeCloseTo(0.4);

    diagram.destroy();
  });

  it("keeps click-to-pause but suppresses the click produced by dragging the interactive viewport", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const diagram = createDiagram({
      container,
      code: SCENE,
      autoplay: false,
      copyright: false,
      interactiveViewport: true,
    });
    const viewport = container.firstElementChild as HTMLElement;

    viewport.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(diagram.isPlaying()).toBe(true);

    viewport.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(diagram.isPlaying()).toBe(false);

    viewport.dispatchEvent(pointerEvent("pointerdown", { clientX: 20, clientY: 20 }));
    viewport.dispatchEvent(pointerEvent("pointermove", { clientX: 40, clientY: 25 }));
    viewport.dispatchEvent(pointerEvent("pointerup", { clientX: 40, clientY: 25 }));
    viewport.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(diagram.isPlaying()).toBe(false);
    expect(container.querySelector<HTMLElement>(".markdy-scene-root")?.style.transform).not.toContain("translate");
    expect(container.querySelector<HTMLElement>(".markdy-viewport-transform")?.style.transform).toContain("translate(20px, 5px)");

    viewport.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, cancelable: true }));
    expect(container.querySelector<HTMLElement>(".markdy-viewport-transform")?.style.transform).toBe("translate(0px, 0px) scale(1)");

    diagram.destroy();
  });

  it("mounts optional controls for playback, speed, and viewport reset", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const diagram = createDiagram({
      container,
      code: SCENE,
      autoplay: false,
      copyright: false,
      controls: true,
    });
    const viewport = container.firstElementChild as HTMLElement;
    const footer = document.body.querySelector<HTMLElement>(".markdy-footer");
    const toolbar = footer?.querySelector<HTMLElement>(".markdy-controls") ?? null;
    const playButton = footer?.querySelector<HTMLButtonElement>(".markdy-control-play")!;
    const restartButton = footer?.querySelector<HTMLButtonElement>(".markdy-control-restart")!;
    const quarterSpeedButton = [...footer!.querySelectorAll<HTMLButtonElement>(".markdy-control-rate")].find((button) => button.dataset.rate === "0.25")!;
    const resetButton = footer?.querySelector<HTMLButtonElement>(".markdy-control-reset-view")!;

    expect(container.querySelector(".markdy-controls")).not.toBeNull();
    expect(footer).not.toBeNull();
    expect(toolbar).not.toBeNull();
    expect(footer?.style.justifyContent).toBe("space-between");
    expect(toolbar?.style.justifyContent).toBe("flex-start");
    playButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(diagram.isPlaying()).toBe(true);
    expect(playButton.textContent).toBe("Pause");

    quarterSpeedButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(diagram.playbackRate()).toBe(0.25);
    expect(quarterSpeedButton.getAttribute("aria-pressed")).toBe("true");

    viewport.dispatchEvent(pointerEvent("pointerdown", { clientX: 20, clientY: 20 }));
    viewport.dispatchEvent(pointerEvent("pointermove", { clientX: 40, clientY: 25 }));
    viewport.dispatchEvent(pointerEvent("pointerup", { clientX: 40, clientY: 25 }));
    viewport.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(diagram.isPlaying()).toBe(true);
    expect(container.querySelector<HTMLElement>(".markdy-viewport-transform")?.style.transform).toContain("translate(20px, 5px)");
    resetButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(container.querySelector<HTMLElement>(".markdy-viewport-transform")?.style.transform).toBe("translate(0px, 0px) scale(1)");

    diagram.seek(1);
    restartButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(diagram.currentTime()).toBe(0);
    expect(diagram.isPlaying()).toBe(true);

    diagram.destroy();
  });

  it("matches footer colors to light and dark scene themes", () => {
    const lightContainer = document.createElement("div");
    const darkContainer = document.createElement("div");
    document.body.append(lightContainer, darkContainer);

    const lightDiagram = createDiagram({ container: lightContainer, code: SCENE, controls: true, copyright: false });
    const darkDiagram = createDiagram({
      container: darkContainer,
      code: SCENE.replace("theme=paper", "theme=midnight"),
      controls: true,
      copyright: false,
    });

    const footers = document.body.querySelectorAll<HTMLElement>(".markdy-footer");
    const lightFooter = footers[0];
    const darkFooter = footers[1];

    expect(lightFooter.dataset.markdyTheme).toBe("paper");
    expect(lightFooter.style.getPropertyValue("--md-footer-bg")).toBe("transparent");
    expect(lightFooter.style.getPropertyValue("--md-control-text")).toBe("#475569");
    expect(darkFooter.dataset.markdyTheme).toBe("midnight");
    expect(darkFooter.style.getPropertyValue("--md-footer-bg")).toBe("transparent");
    expect(darkFooter.style.getPropertyValue("--md-control-text")).toBe("#93a4bb");

    lightDiagram.destroy();
    darkDiagram.destroy();
  });

  it("dynamically switches theme via diagram.setTheme and player theme toggle button", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    let switchedTheme = "";
    container.addEventListener("markdy-theme-switch", ((e: CustomEvent) => {
      switchedTheme = e.detail?.theme;
    }) as EventListener);

    const diagram = createDiagram({
      container,
      code: SCENE,
      autoplay: false,
      copyright: false,
      controls: true,
    });

    const sceneRoot = container.querySelector<HTMLElement>(".markdy-scene-root")!;
    expect(sceneRoot.dataset.markdyTheme).toBe("paper");

    // Test programmatic setTheme
    diagram.setTheme("midnight");
    expect(sceneRoot.dataset.markdyTheme).toBe("midnight");
    expect(sceneRoot.style.getPropertyValue("--md-canvas")).toBe("#070d18");

    // Test player theme toggle button
    const footer = document.body.querySelector<HTMLElement>(".markdy-footer");
    const themeBtn = footer?.querySelector<HTMLButtonElement>(".markdy-control-theme");
    expect(themeBtn).not.toBeNull();

    themeBtn!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(switchedTheme).toBeTruthy();
    expect(["paper", "editorial", "sketchy", "doodle"]).toContain(sceneRoot.dataset.markdyTheme);

    diagram.destroy();
    container.remove();
  });

  it("dynamically switches theme on sequence diagrams via setTheme", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const seqCode = `scene type=sequence theme=paper
client Client
service Backend
beat b1:
  Client -> Backend "Login request"
`;
    const diagram = createDiagram({ container, code: seqCode, autoplay: false, copyright: false });
    const sceneRoot = container.querySelector<HTMLElement>(".markdy-scene-root")!;
    expect(sceneRoot.dataset.markdyTheme).toBe("paper");

    diagram.setTheme("midnight");
    expect(sceneRoot.dataset.markdyTheme).toBe("midnight");
    expect(sceneRoot.style.getPropertyValue("--md-canvas")).toBe("#070d18");

    diagram.destroy();
    container.remove();
  });

  it("mounts controls and the Powered by Markdy link in the footer", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const diagram = createDiagram({
      container,
      code: SCENE,
      autoplay: false,
      copyright: true,
      controls: true,
    });
    const footer = document.body.querySelector<HTMLElement>(".markdy-footer");
    const toolbar = footer?.querySelector<HTMLElement>(".markdy-controls") ?? null;
    const badge = footer?.querySelector<HTMLAnchorElement>("a.markdy-badge") ?? null;

    expect(footer).not.toBeNull();
    expect(toolbar).not.toBeNull();
    expect(badge).not.toBeNull();
    expect(badge?.textContent).toBe("Powered by Markdy");
    await vi.waitFor(() => expect(badge?.href).toMatch(/^https:\/\/markdy\.com\/playground\/#code=~m.+/));
    expect(badge?.target).toBe("_blank");
    expect(footer?.style.flexWrap).toBe("nowrap");
    expect(footer?.firstElementChild).toBe(toolbar);
    expect(footer?.lastElementChild).toBe(badge);

    const fullButton = toolbar?.querySelector<HTMLButtonElement>(".markdy-control-fullscreen");
    expect(fullButton).not.toBeNull();
    expect(fullButton?.getAttribute("aria-pressed")).toBe("false");

    diagram.destroy();
  });

  it("keeps only the linked Markdy badge in the footer by default", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const diagram = createDiagram({ container, code: SCENE, autoplay: false });
    const footer = document.body.querySelector<HTMLElement>(".markdy-footer");
    const badge = footer?.querySelector<HTMLAnchorElement>(".markdy-badge");

    expect(footer).not.toBeNull();
    expect(footer?.querySelector(".markdy-controls")).toBeNull();
    expect(badge?.textContent).toBe("Powered by Markdy");
    await vi.waitFor(() => expect(badge?.href).toMatch(/^https:\/\/markdy\.com\/playground\/#code=~m.+/));

    diagram.destroy();
  });

  it("renders default rainbow progress bar and supports custom color defined in code or options", () => {
    const container1 = document.createElement("div");
    document.body.appendChild(container1);
    const diagram1 = createDiagram({
      container: container1,
      code: SCENE,
      autoplay: false,
      copyright: false,
    });
    const progressEl1 = container1.firstElementChild?.querySelector<HTMLElement>("div[style*='z-index: 9999']") ?? null;
    expect(progressEl1).not.toBeNull();
    diagram1.seek(1);
    expect(progressEl1?.style.background).toContain("conic-gradient");
    expect(progressEl1?.style.background).toContain("rgb(245, 61, 61)");
    diagram1.destroy();

    const container2 = document.createElement("div");
    document.body.appendChild(container2);
    const diagram2 = createDiagram({
      container: container2,
      code: `scene theme=paper progressColor="#3b82f6"\nservice A\nbeat b1:\n  show A\n`,
      autoplay: false,
      copyright: false,
    });
    const progressEl2 = container2.firstElementChild?.querySelector<HTMLElement>("div[style*='z-index: 9999']") ?? null;
    expect(progressEl2).not.toBeNull();
    diagram2.seek(0.5);
    expect(progressEl2?.style.background).toContain("rgb(59, 130, 246)");
    diagram2.destroy();

    const container3 = document.createElement("div");
    document.body.appendChild(container3);
    const diagram3 = createDiagram({
      container: container3,
      code: SCENE,
      autoplay: false,
      copyright: false,
      progressColor: "#ec4899, #8b5cf6",
    });
    const progressEl3 = container3.firstElementChild?.querySelector<HTMLElement>("div[style*='z-index: 9999']") ?? null;
    expect(progressEl3).not.toBeNull();
    diagram3.seek(0.5);
    expect(progressEl3?.style.background).toContain("rgb(236, 72, 153)");
    expect(progressEl3?.style.background).toContain("rgb(139, 92, 246)");
    diagram3.destroy();
  });

  it("activates controls, interactivity, and playback settings declared directly in MarkdyScript", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const code = `
controls true
interactive true
autoplay false
loop false
speed 2

scene theme=paper
service A
beat b1:
  show A
`;
    const diagram = createDiagram({
      container,
      code,
    });

    const footer = document.body.querySelector<HTMLElement>(".markdy-footer");
    const toolbar = footer?.querySelector<HTMLElement>(".markdy-controls") ?? null;
    expect(toolbar).not.toBeNull();
    expect(diagram.playbackRate()).toBe(2);
    expect(diagram.isPlaying()).toBe(false);

    diagram.destroy();

    // Verify explicit option overrides in-script directive
    const container2 = document.createElement("div");
    document.body.appendChild(container2);
    const diagram2 = createDiagram({
      container: container2,
      code,
      controls: false,
    });
    const footer2 = document.body.querySelector<HTMLElement>(".markdy-footer");
    const toolbar2 = footer2?.querySelector<HTMLElement>(".markdy-controls") ?? null;
    expect(toolbar2).toBeNull();
    diagram2.destroy();
  });

  it("applies granular player controls without coupling interaction behavior", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const diagram = createDiagram({
      container,
      code: `
player:
  playback:
    autoplay false
  chrome:
    badge false
    progress bar
  controls:
    play true
    restart false
    seek true
    speed false
    reset_view false
  interaction:
    zoom false
    pan true
    click_to_play false

scene theme=paper
service A
beat b1:
  show A
`,
    });

    const viewport = container.firstElementChild as HTMLElement;
    const footer = document.body.querySelector<HTMLElement>(".markdy-footer");
    const seek = footer?.querySelector<HTMLInputElement>(".markdy-control-seek") ?? null;
    expect(footer?.querySelector(".markdy-control-play")).not.toBeNull();
    expect(footer?.querySelector(".markdy-control-restart")).toBeNull();
    expect(footer?.querySelector(".markdy-control-rate")).toBeNull();
    expect(footer?.querySelector(".markdy-control-reset-view")).toBeNull();
    expect(seek).not.toBeNull();

    viewport.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(diagram.isPlaying()).toBe(false);
    viewport.dispatchEvent(pointerEvent("pointerdown", { clientX: 20, clientY: 20 }));
    viewport.dispatchEvent(pointerEvent("pointermove", { clientX: 40, clientY: 25 }));
    viewport.dispatchEvent(pointerEvent("pointerup", { clientX: 40, clientY: 25 }));
    expect(container.querySelector<HTMLElement>(".markdy-viewport-transform")?.style.transform).toContain("translate(20px, 5px)");

    seek!.value = "0.5";
    seek!.dispatchEvent(new Event("input", { bubbles: true }));
    expect(diagram.currentTime()).toBe(0.5);
    const progress = viewport.querySelector<HTMLElement>("div[style*='z-index: 9999']");
    expect(progress?.style.height).toBe("3px");
    expect(progress?.style.transform).toContain("scaleX");
    diagram.destroy();
  });

  it("turns a player group off when every affordance in it is false", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const diagram = createDiagram({
      container,
      code: `
player:
  playback:
    autoplay false
  chrome:
    badge false
  controls:
    play false
    restart false
    prev_beat false
    next_beat false
    seek false
    speed false
    fit false
    reset_view false
    fullscreen false
    svg false
    share false
  interaction:
    zoom false
    pan false
    double_click_to_reset false

scene theme=paper
service A
beat b1:
  show A
`,
    });

    const viewport = container.firstElementChild as HTMLElement;
    expect(document.body.querySelector(".markdy-controls")).toBeNull();
    expect(viewport.style.cursor).toBe("pointer");

    viewport.dispatchEvent(pointerEvent("pointerdown", { clientX: 20, clientY: 20 }));
    viewport.dispatchEvent(pointerEvent("pointermove", { clientX: 60, clientY: 40 }));
    viewport.dispatchEvent(pointerEvent("pointerup", { clientX: 60, clientY: 40 }));
    expect(container.querySelector<HTMLElement>(".markdy-viewport-transform")?.style.transform).not.toContain("translate(40px");

    // click-to-play stays independent of viewport gestures
    viewport.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(diagram.isPlaying()).toBe(true);
    diagram.destroy();
  });

  it("fits every item in view and pins the camera against zoom cues", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const diagram = createDiagram({
      container,
      code: `
player:
  playback:
    autoplay false
  chrome:
    badge false
  controls:
    play false
    restart false
    seek false
    speed false
    fit true
    reset_view false

scene theme=paper
service A
service B
beat b1:
  show A
  frame A zoom=1.18
`,
    });

    const cameraLayer = container.querySelector<HTMLElement>(".markdy-camera-layer")!;
    const transformLayer = container.querySelector<HTMLElement>(".markdy-viewport-transform")!;
    const fitButton = document.body.querySelector<HTMLButtonElement>(".markdy-control-fit")!;

    expect(fitButton).not.toBeNull();
    expect(fitButton.getAttribute("aria-pressed")).toBe("false");

    fitButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(fitButton.getAttribute("aria-pressed")).toBe("true");
    // Camera zoom cues are outranked while fitted.
    expect(cameraLayer.style.getPropertyPriority("transform")).toBe("important");
    expect(cameraLayer.style.transform).toBe("none");
    expect(transformLayer.style.transform).toMatch(/translate\(.+\) scale\(.+\)/);

    fitButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(fitButton.getAttribute("aria-pressed")).toBe("false");
    expect(cameraLayer.style.transform).toBe("");
    expect(transformLayer.style.transform).toBe("translate(0px, 0px) scale(1)");

    diagram.destroy();
  });

  it("navigates beats from the toolbar, keyboard, and custom speed options", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const diagram = createDiagram({
      container,
      code: `
player:
  playback:
    autoplay false
  chrome:
    badge false
  controls:
    prev_beat true
    next_beat true
    seek false
    fit false
    speed true
    speeds "0.25 1 3"
  interaction:
    keyboard true

scene theme=paper
service A
service B
beat one:
  show A
beat two:
  show B
`,
    });

    const footer = document.body.querySelector<HTMLElement>(".markdy-footer")!;
    const nextButton = footer.querySelector<HTMLButtonElement>(".markdy-control-next-beat")!;
    const prevButton = footer.querySelector<HTMLButtonElement>(".markdy-control-prev-beat")!;
    const rates = [...footer.querySelectorAll<HTMLButtonElement>(".markdy-control-rate")].map((b) => b.dataset.rate);

    expect(rates).toEqual(["0.25", "1", "3"]);

    const secondBeat = diagram.beats()[1];
    expect(secondBeat.start).toBeGreaterThan(0);

    nextButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(diagram.currentTime()).toBeCloseTo(secondBeat.start);

    prevButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(diagram.currentTime()).toBe(0);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(diagram.currentTime()).toBeCloseTo(secondBeat.start);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    expect(diagram.isPlaying()).toBe(true);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Home", bubbles: true }));
    expect(diagram.currentTime()).toBe(0);

    diagram.destroy();
    // Listeners are removed with the diagram.
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(diagram.currentTime()).toBe(0);
  });

  it("leaves keyboard shortcuts off unless the scene opts in", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const diagram = createDiagram({ container, code: SCENE, autoplay: false, copyright: false });

    window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    expect(diagram.isPlaying()).toBe(false);

    diagram.destroy();
  });

  it("omits speed controls when the script offers only one speed", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const diagram = createDiagram({
      container,
      code: `
player:
  controls:
    speed true
    speeds "0.25"
  chrome:
    badge false

scene theme=paper
service A
beat one:
  show A
`,
    });

    expect(document.body.querySelector(".markdy-footer")).toBeNull();
    expect(document.body.querySelector(".markdy-control-rate")).toBeNull();

    diagram.destroy();
  });

  it("copies a share link from the toolbar", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });

    const diagram = createDiagram({
      container,
      code: `
player:
  playback:
    autoplay false
  chrome:
    badge false
  controls:
    play false
    restart false
    seek false
    speed false
    fit false
    reset_view false
    svg true
    share true

scene theme=paper
service A
beat b1:
  show A
`,
      shareUrl: "https://example.test/studio/",
    });

    const footer = document.body.querySelector<HTMLElement>(".markdy-footer")!;
    expect(footer.querySelector(".markdy-control-svg")).not.toBeNull();
    const shareControl = footer.querySelector<HTMLButtonElement>(".markdy-control-share")!;

    shareControl.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toMatch(/^https:\/\/example\.test\/studio\/#code=/);

    diagram.destroy();
  });

  it("mounts and destroys diagrams across all supported diagram archetypes without throwing", () => {
    const archetypes = [
      "architecture",
      "flowchart",
      "tree",
      "sequence",
      "state",
      "constellation",
      "loop",
      "flywheel",
      "medallion",
      "quadrant",
      "swimlane",
      "pyramid",
      "radar",
      "timeline",
      "gantt",
      "venn",
      "layers",
      "nested",
    ];

    for (const dtype of archetypes) {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const code = `
scene type=${dtype} theme=paper width=1000 height=700
service A "Node Alpha" focal=true
service B "Node Beta"
service C "Node Gamma"

beat main:
  show $nodes
  A -> B "flow" -> C
`;
      const diagram = createDiagram({
        container,
        code,
        autoplay: false,
        controls: false,
      });

      expect(container.querySelector(".markdy-scene-root")).not.toBeNull();
      expect(container.querySelectorAll(".markdy-node").length).toBeGreaterThan(0);
      expect(() => diagram.seek(0.5)).not.toThrow();
      expect(() => diagram.destroy()).not.toThrow();
      container.remove();
    }
  });

  it("mounts and destroys diagrams across all 9 registered themes cleanly", () => {
    const themes = ["midnight", "paper", "blueprint", "graphite", "editorial", "nebula", "terminal", "sketchy", "doodle"];

    for (const themeName of themes) {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const code = `
scene theme=${themeName} width=900 height=600
service API "API Gateway" focal=true
database DB "PostgreSQL"

beat main:
  show $nodes
  API -> DB "query"
`;
      const diagram = createDiagram({
        container,
        code,
        autoplay: false,
        controls: false,
      });

      const sceneRoot = container.querySelector<HTMLElement>(".markdy-scene-root");
      expect(sceneRoot).not.toBeNull();
      expect(sceneRoot?.dataset.markdyTheme).toBe(themeName);
      expect(() => diagram.seek(1)).not.toThrow();
      expect(() => diagram.destroy()).not.toThrow();
      container.remove();
    }
  });

  it("mounts a code button that opens a panel containing the raw MarkdyScript source", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const CODE_WITH_CODE_BTN = `\
player:
  controls:
    code true

scene theme=paper
layout LR

browser Web
service API "<img data-test=unsafe>"
`;

    const diagram = createDiagram({
      container,
      code: CODE_WITH_CODE_BTN,
      autoplay: false,
      copyright: false,
    });

    const footer = document.body.querySelector<HTMLElement>(".markdy-footer");
    const codeBtn = footer?.querySelector<HTMLButtonElement>(".markdy-control-code");

    expect(codeBtn).not.toBeNull();
    expect(codeBtn?.getAttribute("aria-haspopup")).toBe("dialog");

    // Clicking the button should insert a dialog overlay into the body.
    codeBtn!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    const overlay = document.body.querySelector<HTMLElement>(".markdy-code-panel-overlay");
    expect(overlay).not.toBeNull();
    expect(overlay?.getAttribute("role")).toBe("dialog");

    const pre = overlay?.querySelector<HTMLElement>(".markdy-code-panel__pre");
    expect(pre).not.toBeNull();
    expect(pre?.textContent).toContain("scene");
    expect(pre?.textContent).toContain("<img data-test=unsafe>");
    expect(pre?.querySelector("img")).toBeNull();

    const closeBtn = overlay?.querySelector<HTMLButtonElement>(".markdy-code-panel__close");
    expect(closeBtn).not.toBeNull();

    diagram.destroy();
    expect(document.body.querySelector(".markdy-code-panel-overlay")).toBeNull();
    container.remove();
  });

  it("code button is OFF by default when controls=true", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const diagram = createDiagram({
      container,
      code: SCENE,
      autoplay: false,
      copyright: false,
      controls: true,
    });

    const footer = document.body.querySelector<HTMLElement>(".markdy-footer");
    const codeBtn = footer?.querySelector<HTMLButtonElement>(".markdy-control-code");
    // The code button must NOT appear unless explicitly opted in.
    expect(codeBtn).toBeNull();

    diagram.destroy();
    container.remove();
  });

  it("ensures markdy-controls-tools buttons have proper stacking context, event isolation, and CSS hover styles", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const diagram = createDiagram({
      container,
      code: SCENE,
      autoplay: false,
      copyright: false,
      controls: {
        playback: true,
        fit: true,
        resetView: true,
        fullscreen: true,
        theme: true,
        svg: true,
        share: true,
        code: true,
        speed: [0.5, 1, 2],
      },
      interactiveViewport: true,
      clickToPlay: true,
    });

    const viewport = container.querySelector<HTMLElement>(".markdy-viewport")!;
    const footer = container.querySelector<HTMLElement>(".markdy-footer")!;
    const toolbar = footer.querySelector<HTMLElement>(".markdy-controls")!;
    const toolsGroup = footer.querySelector<HTMLElement>(".markdy-controls-tools")!;

    expect(viewport).not.toBeNull();
    expect(viewport.style.flex).toContain("1 1 auto");
    expect(viewport.style.minHeight).toBe("0px");

    expect(footer).not.toBeNull();
    expect(footer.style.zIndex).toBe("100");
    expect(footer.style.pointerEvents).toBe("auto");

    expect(toolsGroup).not.toBeNull();
    const fitBtn = toolsGroup.querySelector<HTMLButtonElement>(".markdy-control-fit")!;
    const themeBtn = toolsGroup.querySelector<HTMLButtonElement>(".markdy-control-theme")!;
    const svgBtn = toolsGroup.querySelector<HTMLButtonElement>(".markdy-control-svg")!;
    const codeBtn = toolsGroup.querySelector<HTMLButtonElement>(".markdy-control-code")!;

    expect(fitBtn).not.toBeNull();
    expect(themeBtn).not.toBeNull();
    expect(svgBtn).not.toBeNull();
    expect(codeBtn).not.toBeNull();

    // Clicking tools button must not toggle diagram playback or trigger viewport drag
    expect(diagram.isPlaying()).toBe(false);
    fitBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(diagram.isPlaying()).toBe(false);

    // Verify seek() synchronizes slider and time display while paused
    diagram.seek(1.5);
    const timeEl = footer.querySelector<HTMLElement>(".markdy-control-time");
    const seekInput = footer.querySelector<HTMLInputElement>(".markdy-control-seek");
    expect(timeEl?.textContent).toContain("1.5s");
    expect(seekInput?.value).toBe("1.5");

    // Verify Code button accessibility
    expect(codeBtn.getAttribute("aria-expanded")).toBe("false");
    codeBtn.click();
    expect(codeBtn.getAttribute("aria-expanded")).toBe("true");
    const codeOverlay = document.body.querySelector<HTMLElement>(".markdy-code-panel-overlay");
    expect(codeOverlay).not.toBeNull();
    const closeBtn = codeOverlay?.querySelector<HTMLButtonElement>(".markdy-code-panel__close");
    closeBtn?.click();
    expect(codeBtn.getAttribute("aria-expanded")).toBe("false");

    // Verify injected style rules
    const styleEl = document.getElementById("markdy-scene-ambience-styles");
    expect(styleEl).not.toBeNull();
    const cssText = styleEl?.textContent ?? "";
    expect(cssText).toContain(".markdy-viewport");
    expect(cssText).toContain(".markdy-controls-tools");
    expect(cssText).toContain(".markdy-controls button:hover:not([aria-pressed=\"true\"])");
    expect(cssText).toContain(".markdy-controls-tools button:hover:not([aria-pressed=\"true\"])");
    expect(cssText).toContain("@media (hover: none) and (pointer: coarse)");

    diagram.destroy();
    container.remove();
  });

  it("renders and animates all connection lines properly in doodle theme", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const code = `
scene "How to Use Markdy" theme=doodle
layout LR

user Dev "Developer"
service Claude "Claude Code (AI)"
repo WebApp "Website Project"
browser Diagram "Interactive Diagram"

beat reveal "Overview":
  show $nodes stagger=40ms

beat step1 "1. Install Packages":
  Dev -> WebApp "npm i @markdy/core @markdy/renderer-dom"
  glow WebApp color=#38bdf8

beat step2 "2. Prompt AI with AGENT.md":
  Dev -> Claude "Prompt: Follow https://markdy.com/AGENT.md..."
  glow Claude color=#a855f7

beat step3 "3. Embed Script":
  Claude -> WebApp "paste .markdy script"
  glow WebApp color=#f59e0b

beat step4 "4. Render Diagram":
  WebApp -> Diagram "render interactive SVG"
  glow Diagram color=#10b981
`;

    const diagram = createDiagram({
      container,
      code,
      autoplay: false,
    });

    const svg = container.querySelector<SVGSVGElement>("svg[data-markdy-edge-layer='1']");
    expect(svg).not.toBeNull();

    const paths = Array.from(svg!.querySelectorAll<SVGPathElement>(".markdy-edge-path"));
    expect(paths.length).toBe(4);

    for (const path of paths) {
      expect(path.getAttribute("stroke")).toBeTruthy();
      expect(path.getAttribute("stroke-width")).toBe("2");
      expect(path.getAttribute("filter")).toBeNull();
    }

    // Step to step1 and verify edge group becomes visible
    diagram.nextBeat(); // reveal
    diagram.nextBeat(); // step1
    const edgeGroups = Array.from(svg!.querySelectorAll<SVGGElement>(".markdy-edge"));
    expect(edgeGroups.length).toBe(4);

    diagram.destroy();
    container.remove();
  });
});
