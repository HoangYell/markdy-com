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
    (Element.prototype as unknown as { animate: typeof animateStub }).animate = animateStub;
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
});
