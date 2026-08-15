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
});
