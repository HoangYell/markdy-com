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
scene "Smoke" theme=paper
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

    expect(diagram.duration()).toBeGreaterThan(0);
    expect(diagram.beats().map((b) => b.name)).toEqual(["intro", "trace", "finish"]);
    expect(animateStub).toHaveBeenCalled();

    // Seeking through the timeline must not throw with the stubbed animations.
    expect(() => diagram.seek(diagram.duration() / 2)).not.toThrow();
    diagram.destroy();
    expect(container.querySelector(".markdy-scene-root")).toBeNull();
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
    const halfSpeedButton = [...footer!.querySelectorAll<HTMLButtonElement>(".markdy-control-rate")].find((button) => button.dataset.rate === "0.5")!;
    const resetButton = footer?.querySelector<HTMLButtonElement>(".markdy-control-reset-view")!;

    expect(container.querySelector(".markdy-controls")).toBeNull();
    expect(footer).not.toBeNull();
    expect(toolbar).not.toBeNull();
    expect(footer?.style.justifyContent).toBe("space-between");
    expect(toolbar?.style.justifyContent).toBe("flex-start");
    playButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(diagram.isPlaying()).toBe(true);
    expect(playButton.textContent).toBe("Pause");

    halfSpeedButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(diagram.playbackRate()).toBe(0.5);
    expect(halfSpeedButton.getAttribute("aria-pressed")).toBe("true");

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

  it("aligns controls on left and copyright badge on right when both are present", () => {
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
    const badge = footer?.querySelector<HTMLAnchorElement>("a") ?? null;

    expect(footer).not.toBeNull();
    expect(toolbar).not.toBeNull();
    expect(badge).not.toBeNull();
    expect(footer?.style.justifyContent).toBe("space-between");
    expect(toolbar?.style.justifyContent).toBe("flex-start");
    expect(badge?.style.marginLeft).toBe("auto");
    expect(footer?.firstElementChild).toBe(toolbar);
    expect(footer?.lastElementChild).toBe(badge);

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
      code: `scene "Custom" theme=paper progressColor="#3b82f6"\nservice A\nbeat b1:\n  show A\n`,
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

scene "Self Contained" theme=paper
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
});
