import { useEffect, useRef } from "react";

type DiagramInstance = {
  destroy: () => void;
};

type CreateDiagramInput = {
  container: HTMLElement;
  code: string;
  assets?: Record<string, string>;
  autoplay?: boolean;
  loop?: boolean;
  copyright?: boolean;
  progressBar?: boolean | string;
  sceneBoundaryProgress?: boolean | string;
  progressColor?: string;
  playbackRate?: number;
  interactiveViewport?: boolean;
  controls?: boolean;
};

export type MarkdyDiagramProps = {
  code: string;
  width?: number | string;
  height?: number | string;
  bg?: string;
  assets?: Record<string, string>;
  autoplay?: boolean | string;
  loop?: boolean | string;
  copyright?: boolean | string;
  progressBar?: boolean | string;
  sceneBoundaryProgress?: boolean | string;
  progressColor?: string;
  progressBarColor?: string;
  playbackRate?: number | string;
  interactiveViewport?: boolean | string;
  controls?: boolean | string;
  className?: string;
  title?: string;
  description?: string;
};

function scheduleBackgroundTask(work: () => void): void {
  if (typeof window === "undefined") {
    return;
  }

  if ("requestIdleCallback" in window) {
    const requestIdleCallbackFn = window.requestIdleCallback as (
      cb: IdleRequestCallback,
      opts?: IdleRequestOptions,
    ) => number;
    requestIdleCallbackFn(() => work(), { timeout: 1500 });
    return;
  }

  globalThis.setTimeout(work, 0);
};

function coerceOptionalBoolean(value: boolean | string | undefined): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true" || value.toLowerCase() === "on") return true;
    if (value.toLowerCase() === "false" || value.toLowerCase() === "off") return false;
  }
  return undefined;
}

function coerceOptionalNumber(value: number | string | undefined): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
  }
  return undefined;
}

export function MarkdyDiagram({
  code,
  width = 800,
  height = 400,
  bg = "#ffffff",
  assets = {},
  autoplay,
  loop,
  copyright,
  progressBar,
  sceneBoundaryProgress,
  progressColor,
  progressBarColor,
  playbackRate,
  controls,
  interactiveViewport,
  className,
  title = "Markdy animation",
  description,
}: MarkdyDiagramProps) {
  const resolvedWidth = typeof width === "number" ? width : Number(width) || 800;
  const resolvedHeight = typeof height === "number" ? height : Number(height) || 400;
  const resolvedAutoplay = coerceOptionalBoolean(autoplay);
  const resolvedLoop = coerceOptionalBoolean(loop);
  const resolvedCopyright = coerceOptionalBoolean(copyright);
  const resolvedProgressBar =
    typeof progressBar === "string" && progressBar !== "true" && progressBar !== "false"
      ? progressBar
      : coerceOptionalBoolean(progressBar);
  const resolvedSceneBoundaryProgress =
    typeof sceneBoundaryProgress === "string" && sceneBoundaryProgress !== "true" && sceneBoundaryProgress !== "false"
      ? sceneBoundaryProgress
      : coerceOptionalBoolean(sceneBoundaryProgress);
  const resolvedProgressColor =
    typeof progressColor === "string"
      ? progressColor
      : typeof progressBarColor === "string"
        ? progressBarColor
        : typeof resolvedSceneBoundaryProgress === "string"
          ? resolvedSceneBoundaryProgress
          : typeof resolvedProgressBar === "string"
            ? resolvedProgressBar
            : undefined;
  const resolvedPlaybackRate = coerceOptionalNumber(playbackRate);
  const resolvedControls = coerceOptionalBoolean(controls);
  const resolvedInteractiveViewport = coerceOptionalBoolean(interactiveViewport);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const diagramRef = useRef<DiagramInstance | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const root = rootRef.current;
    if (!root || hydratedRef.current) return;

    let disposed = false;
    let observer: IntersectionObserver | null = null;

    const doHydrate = (forceAutoplay = false): void => {
      if (disposed || hydratedRef.current) return;
      hydratedRef.current = true;
      root.dataset.markdyInit = "hydrating";
      scheduleBackgroundTask(() => {
        void (async () => {
          try {
            const renderer = await import("@markdy/renderer-dom");
            if (disposed) return;
            const createDiagram = renderer.createDiagram as (input: CreateDiagramInput) => DiagramInstance;
            root.innerHTML = "";
            diagramRef.current = createDiagram({
              container: root,
              code,
              assets,
              autoplay: forceAutoplay ? true : resolvedAutoplay,
              loop: resolvedLoop,
              copyright: resolvedCopyright,
              progressBar: resolvedProgressBar,
              sceneBoundaryProgress: resolvedSceneBoundaryProgress,
              progressColor: resolvedProgressColor,
              playbackRate: resolvedPlaybackRate,
              interactiveViewport: resolvedInteractiveViewport,
              controls: resolvedControls,
            });
            root.dataset.markdyInit = "done";
            root.removeAttribute("aria-busy");
          } catch (error) {
            hydratedRef.current = false;
            root.dataset.markdyInit = "error";
            root.removeAttribute("aria-busy");
            console.error("Failed to hydrate MarkdyDiagram", error);
          }
        })();
      });
    };

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer?.unobserve(root);
          doHydrate(false);
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(root);
    root.dataset.markdyInit = "pending";

    const onClick = (event: MouseEvent): void => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest("[data-markdy-placeholder]")) return;
      observer?.unobserve(root);
      doHydrate(true);
    };

    root.addEventListener("click", onClick);

    return () => {
      disposed = true;
      observer?.disconnect();
      root.removeEventListener("click", onClick);
      diagramRef.current?.destroy();
      diagramRef.current = null;
    };
  }, [
    assets,
    code,
    resolvedAutoplay,
    resolvedCopyright,
    resolvedLoop,
    resolvedProgressBar,
    resolvedSceneBoundaryProgress,
    resolvedProgressColor,
    resolvedPlaybackRate,
    resolvedInteractiveViewport,
    resolvedControls,
  ]);

  return (
    <div
      ref={rootRef}
      className={className}
      role="img"
      aria-label={title}
      aria-busy="true"
      style={{
        maxWidth: typeof width === "number" ? `${width}px` : width,
        width: "100%",
        aspectRatio: `${resolvedWidth}/${resolvedHeight}`,
        overflow: "hidden",
      }}
    >
      <button
        data-markdy-placeholder="true"
        type="button"
        aria-label={`Play ${title}`}
        style={{
          width: "100%",
          height: "100%",
          background: bg,
          border: "none",
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            fontFamily: "sans-serif",
            fontSize: "12px",
            color: "#8a8a8a",
            letterSpacing: "0.04em",
            pointerEvents: "none",
          }}
        >
          ▶ markdy
        </span>
      </button>

      <noscript>
        <div
          style={{
            width: "100%",
            height: "100%",
            background: bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <p
            style={{
              fontFamily: "sans-serif",
              fontSize: "14px",
              color: "#666666",
              margin: 0,
              padding: "1rem",
              textAlign: "center",
            }}
          >
            {description ?? title}
          </p>
        </div>
      </noscript>
    </div>
  );
}
