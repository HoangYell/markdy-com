import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { exportDiagramAsGif, type TimelineController } from "../src/export/gif-exporter.js";
import { encodeGifSequence } from "../src/export/gif-encoder.js";
import { rasterizeDiagramToCanvas } from "../src/export/png-exporter.js";

vi.mock("../src/export/gif-encoder.js", () => ({ encodeGifSequence: vi.fn(() => new Uint8Array([71, 73, 70])) }));
vi.mock("../src/export/png-exporter.js", () => {
  const rasterizeDiagramToCanvas = vi.fn();
  return {
    rasterizeDiagramToCanvas,
    createDiagramFrameRasterizer: (container: HTMLElement, options: unknown) =>
      (pixelRatio: number) => rasterizeDiagramToCanvas(container, options, pixelRatio),
  };
});

function timeline(duration = 2, playing = false): TimelineController {
  return {
    duration: () => duration,
    currentTime: () => 0.75,
    isPlaying: () => playing,
    seek: vi.fn(), pause: vi.fn(), play: vi.fn(),
  };
}

let container: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    queueMicrotask(() => callback(0));
    return 1;
  });
  container = document.createElement("div");
  container.className = "markdy-scene-root";
  container.style.cssText = "width:800px;height:400px";
  vi.mocked(rasterizeDiagramToCanvas).mockResolvedValue({
    width: 2, height: 2,
    getContext: () => ({ getImageData: () => ({ width: 2, height: 2, data: new Uint8ClampedArray(16) }) }),
  } as unknown as HTMLCanvasElement);
});
afterEach(() => vi.unstubAllGlobals());

describe("GIF timeline capture", () => {
  it("bounds long recordings and preserves their timeline duration and final hold", async () => {
    const controller = timeline(300);
    const onProgress = vi.fn();
    await exportDiagramAsGif(container, controller, { maxFrames: 10, fps: 30, onProgress });
    const frames = vi.mocked(encodeGifSequence).mock.calls[0][0];
    expect(frames).toHaveLength(10);
    expect(frames.reduce((total, frame) => total + frame.delayMs, 0)).toBe(301400);
    expect(controller.seek).toHaveBeenNthCalledWith(10, 300);
    expect(controller.seek).toHaveBeenLastCalledWith(0.75);
    expect(onProgress).toHaveBeenLastCalledWith(1, 10, 10);
  });

  it("captures the styled DOM by default and honors explicit pure-vector mode", async () => {
    await exportDiagramAsGif(container, timeline(), { maxFrames: 2 });
    expect(rasterizeDiagramToCanvas).toHaveBeenLastCalledWith(container, expect.objectContaining({ mode: "foreignObject" }), 1);
    await exportDiagramAsGif(container, timeline(), { maxFrames: 2, mode: "pure" });
    expect(rasterizeDiagramToCanvas).toHaveBeenLastCalledWith(container, expect.objectContaining({ mode: "pure" }), 1);
  });

  it("limits output width and cumulative frame pixels", async () => {
    await exportDiagramAsGif(container, timeline(), { maxFrames: 2, pixelRatio: 4, maxWidth: 1000 });
    expect(vi.mocked(rasterizeDiagramToCanvas).mock.lastCall?.[2]).toBe(1.25);
    container.style.cssText = "width:4000px;height:2000px";
    await exportDiagramAsGif(container, timeline(100), { maxFrames: 120, pixelRatio: 4 });
    const ratio = vi.mocked(rasterizeDiagramToCanvas).mock.lastCall![2]!;
    expect(4000 * 2000 * ratio ** 2 * 120).toBeLessThanOrEqual(48 * 1024 * 1024 + 1);
  });

  it("restores playback after a successful recording", async () => {
    const controller = timeline(2, true);
    await exportDiagramAsGif(container, controller, { maxFrames: 2 });
    expect(controller.pause).toHaveBeenCalledOnce();
    expect(controller.seek).toHaveBeenLastCalledWith(0.75);
    expect(controller.play).toHaveBeenCalledOnce();
  });

  it("restores playback if rasterization fails", async () => {
    const controller = timeline(2, true);
    vi.mocked(rasterizeDiagramToCanvas).mockRejectedValueOnce(new Error("Image failed"));
    await expect(exportDiagramAsGif(container, controller)).rejects.toThrow("Image failed");
    expect(controller.seek).toHaveBeenLastCalledWith(0.75);
    expect(controller.play).toHaveBeenCalledOnce();
    expect(encodeGifSequence).not.toHaveBeenCalled();
  });

  it("rejects invalid capture options before pausing playback", async () => {
    const controller = timeline();
    for (const options of [{ maxFrames: 1 }, { fps: NaN }, { pixelRatio: 0 }, { maxWidth: Infinity }]) {
      await expect(exportDiagramAsGif(container, controller, options)).rejects.toThrow(RangeError);
    }
    expect(controller.pause).not.toHaveBeenCalled();
  });
});