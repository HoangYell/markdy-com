import { useEffect, useRef } from "react";

type PlayerInstance = {
  destroy: () => void;
};

type CreatePlayerInput = {
  container: HTMLElement;
  code: string;
  assets: Record<string, string>;
  autoplay: boolean;
  loop: boolean;
  copyright: boolean;
  progressBar: boolean;
};

export type MarkdyPlayerProps = {
  code: string;
  width?: number | string;
  height?: number | string;
  bg?: string;
  assets?: Record<string, string>;
  autoplay?: boolean | string;
  loop?: boolean | string;
  copyright?: boolean | string;
  progressBar?: boolean | string;
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

function coerceBoolean(value: boolean | string | undefined, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return fallback;
}

function coerceNumber(value: number | string | undefined, fallback: number): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}

export function MarkdyPlayer({
  code,
  width = 800,
  height = 400,
  bg = "#ffffff",
  assets = {},
  autoplay = false,
  loop = false,
  copyright = false,
  progressBar = false,
  className,
  title = "Markdy animation",
  description,
}: MarkdyPlayerProps) {
  const resolvedWidth = coerceNumber(width, 800);
  const resolvedHeight = coerceNumber(height, 400);
  const resolvedAutoplay = coerceBoolean(autoplay, false);
  const resolvedLoop = coerceBoolean(loop, false);
  const resolvedCopyright = coerceBoolean(copyright, false);
  const resolvedProgressBar = coerceBoolean(progressBar, false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<PlayerInstance | null>(null);
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
            const createPlayer = renderer.createPlayer as (input: CreatePlayerInput) => PlayerInstance;
            root.innerHTML = "";
            playerRef.current = createPlayer({
              container: root,
              code,
              assets,
              autoplay: forceAutoplay || resolvedAutoplay,
              loop: resolvedLoop,
              copyright: resolvedCopyright,
              progressBar: resolvedProgressBar,
            });
            root.dataset.markdyInit = "done";
            root.removeAttribute("aria-busy");
          } catch (error) {
            hydratedRef.current = false;
            root.dataset.markdyInit = "error";
            root.removeAttribute("aria-busy");
            console.error("Failed to hydrate MarkdyPlayer", error);
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
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [assets, code, resolvedAutoplay, resolvedCopyright, resolvedLoop, resolvedProgressBar]);

  return (
    <div
      ref={rootRef}
      className={className}
      role="img"
      aria-label={title}
      aria-busy="true"
      style={{
        maxWidth: `${width}px`,
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
