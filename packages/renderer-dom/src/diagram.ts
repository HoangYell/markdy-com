/**
 * Markdy diagram runtime — renders a RenderPlan via WAAPI.
 */
import { parseAndCompile, type BeatRange, type Diagnostic } from "@markdy/core";
import {
  buildCueAnimations,
  buildStructuralEdgeAnimations,
  createEdgeSceneId,
  type EdgeRuntimeMap,
} from "./edges.js";
import { mountAnnotations } from "./annotations.js";
import { mountConstellationLayer } from "./constellation.js";
import { mountGroupBoundaries } from "./groups.js";
import { createNodeEl, createTitleEl, ensureNodeStyles } from "./nodes.js";
import { mountSequenceLayer } from "./sequence.js";
import { mountTreeBuses } from "./tree.js";
import { applyThemeToScene, ensureSceneStyles } from "./theme.js";

const NORMAL_PLAYBACK_RATE = 4 / 5;
const DEFAULT_PLAYBACK_RATE = 1;
const MIN_VIEWPORT_ZOOM = 0.5;
const MAX_VIEWPORT_ZOOM = 3;
const VIEWPORT_ZOOM_STEP = 0.0015;
const DRAG_CLICK_THRESHOLD_PX = 4;

export interface DiagramOptions {
  container: HTMLElement;
  code: string;
  autoplay?: boolean;
  loop?: boolean;
  copyright?: boolean;
  /**
   * Maps node `image=`/`logo=` values to resolved URLs. Lets a host (Astro,
   * MDX) remap DSL asset references to CDN/data URLs. Values not present here
   * are used verbatim as the image `src`.
   */
  assets?: Record<string, string>;
  /** @deprecated Prefer sceneBoundaryProgress. */
  progressBar?: boolean;
  /** Show rainbow progress around scene boundary. Defaults to true. */
  sceneBoundaryProgress?: boolean;
  /** Playback speed multiplier. Defaults to 1, where 1 is Markdy's normal pace. */
  playbackRate?: number;
  /** Enable wheel zoom and drag pan on the rendered viewport. Defaults to false. */
  interactiveViewport?: boolean;
  onWarning?: (warning: Diagnostic) => void;
  onTimeUpdate?: (seconds: number, durationSeconds: number) => void;
  onPlayStateChange?: (playing: boolean) => void;
}

export interface Diagram {
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  setPlaybackRate(rate: number): void;
  playbackRate(): number;
  currentTime(): number;
  duration(): number;
  isPlaying(): boolean;
  beats(): BeatRange[];
  seekToBeat(name: string): void;
  destroy(): void;
}

export function createBeatCaptionLayer(doc: Document, beats: BeatRange[]): HTMLElement {
  const layer = doc.createElement("div");
  layer.className = "markdy-beat-caption-layer";
  for (const beat of beats) {
    if (!beat.label) continue;
    const caption = doc.createElement("div");
    caption.className = "markdy-beat-caption";
    caption.textContent = beat.label;
    caption.dataset.beat = beat.name;
    layer.appendChild(caption);
  }
  return layer;
}

function buildBeatCaptionAnimations(beats: BeatRange[], layer: HTMLElement): Animation[] {
  const anims: Animation[] = [];
  const captions = Array.from(layer.querySelectorAll<HTMLElement>(".markdy-beat-caption"));
  for (const beat of beats) {
    if (!beat.label) continue;
    const caption = captions.find((item) => item.dataset.beat === beat.name);
    if (!caption) continue;
    const startMs = beat.start * 1000;
    const durMs = Math.max((beat.end - beat.start) * 1000, 650);
    anims.push(
      caption.animate(
        [
          { opacity: 0, transform: "translateY(8px)" },
          { opacity: 1, transform: "translateY(0)", offset: 0.16 },
          { opacity: 1, transform: "translateY(0)", offset: 0.82 },
          { opacity: 0, transform: "translateY(-4px)" },
        ],
        { duration: durMs, delay: startMs, fill: "forwards", easing: "ease-out" },
      ),
    );
  }
  return anims;
}

export function createDiagram(opts: DiagramOptions): Diagram {
  const {
    container,
    code,
    autoplay = true,
    loop = true,
    copyright = true,
    assets,
    progressBar,
    sceneBoundaryProgress,
    playbackRate: initialPlaybackRate = DEFAULT_PLAYBACK_RATE,
    interactiveViewport = false,
    onWarning = (w) => console.warn(`[markdy] line ${w.line}: ${w.message}`),
    onTimeUpdate,
    onPlayStateChange,
  } = opts;

  const showSceneBoundaryProgress = sceneBoundaryProgress ?? progressBar ?? true;

  const { ast, plan } = parseAndCompile(code);
  for (const w of ast.diagnostics) {
    if (w.severity === "warning") onWarning(w);
  }

  const totalDurationMs = plan.duration * 1000;
  const durationSeconds = plan.duration;

  const viewport = document.createElement("div");
  Object.assign(viewport.style, {
    position: "relative",
    width: "100%",
    aspectRatio: `${plan.meta.width} / ${plan.meta.height}`,
    overflow: "hidden",
  });
  container.appendChild(viewport);

  let progressEl: HTMLElement | null = null;
  if (showSceneBoundaryProgress) {
    progressEl = document.createElement("div");
    Object.assign(progressEl.style, {
      position: "absolute",
      inset: "0",
      zIndex: "9999",
      pointerEvents: "none",
      borderRadius: "inherit",
    });
    viewport.appendChild(progressEl);
  }

  const tlAngle = (Math.atan2(-plan.meta.width / 2, plan.meta.height / 2) * 180) / Math.PI;
  const tlAngleNorm = ((tlAngle % 360) + 360) % 360;

  function updateProgressBar(pct: number): void {
    if (!progressEl) return;
    const deg = pct * 360;
    const rainbow = "hsl(0,90%,60%), hsl(45,90%,55%), hsl(90,80%,50%), hsl(180,80%,50%), hsl(270,80%,55%), hsl(330,90%,60%)";
    progressEl.style.background = `conic-gradient(from ${tlAngleNorm}deg, ${rainbow} ${deg}deg, transparent ${deg}deg)`;
    progressEl.style.mask = "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)";
    progressEl.style.webkitMask = progressEl.style.mask;
    progressEl.style.maskComposite = "exclude";
    (progressEl.style as unknown as Record<string, string>).webkitMaskComposite = "xor";
    progressEl.style.padding = "2px";
  }

  let badge: HTMLAnchorElement | null = null;
  if (copyright) {
    badge = document.createElement("a");
    badge.href = "https://markdy.com";
    badge.target = "_blank";
    badge.rel = "noopener noreferrer";
    badge.textContent = "Powered by Markdy";
    Object.assign(badge.style, {
      display: "block",
      textAlign: "right",
      fontSize: "10px",
      fontFamily: "system-ui, sans-serif",
      color: "#999",
      textDecoration: "none",
      padding: "3px 6px 0",
      opacity: "0.7",
    });
    if (container.parentNode) container.parentNode.insertBefore(badge, container.nextSibling);
    else container.appendChild(badge);
  }

  ensureSceneStyles(document);
  ensureNodeStyles(document);

  const viewportTransform = document.createElement("div");
  viewportTransform.className = "markdy-viewport-transform";
  Object.assign(viewportTransform.style, {
    position: "absolute",
    inset: "0",
    transformOrigin: "0 0",
    willChange: interactiveViewport ? "transform" : "auto",
  });
  viewport.appendChild(viewportTransform);

  const scene = document.createElement("div");
  scene.className = "markdy-scene-root";
  Object.assign(scene.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: `${plan.meta.width}px`,
    height: `${plan.meta.height}px`,
    overflow: "hidden",
    userSelect: "none",
    transformOrigin: "0 0",
  });
  applyThemeToScene(scene, plan.theme);
  viewportTransform.appendChild(scene);

  const sceneContent = document.createElement("div");
  sceneContent.className = "markdy-scene-content";
  Object.assign(sceneContent.style, { position: "absolute", inset: "0" });
  scene.appendChild(sceneContent);

  const titleEl = createTitleEl(plan.title);
  sceneContent.appendChild(titleEl);

  const cameraLayer = document.createElement("div");
  cameraLayer.className = "markdy-camera-layer";
  sceneContent.appendChild(cameraLayer);

  const structuralEdgeHost = document.createElement("div");
  structuralEdgeHost.className = "markdy-structural-edge-host";
  Object.assign(structuralEdgeHost.style, {
    position: "absolute",
    inset: "0",
    zIndex: "45",
    pointerEvents: "none",
  });
  cameraLayer.appendChild(structuralEdgeHost);

  const treeLayer = document.createElement("div");
  treeLayer.className = "markdy-tree-layer";
  cameraLayer.appendChild(treeLayer);
  mountTreeBuses(treeLayer, plan.treeBuses, plan.theme);

  const constellationLayer = document.createElement("div");
  constellationLayer.className = "markdy-constellation-layer";
  cameraLayer.appendChild(constellationLayer);
  if (plan.diagramType === "constellation") {
    mountConstellationLayer(
      constellationLayer,
      plan.nodes,
      plan.theme,
      { width: plan.meta.width, height: plan.meta.height },
    );
  }

  const groupLayer = document.createElement("div");
  groupLayer.className = "markdy-group-layer";
  Object.assign(groupLayer.style, {
    position: "absolute",
    inset: "0",
    zIndex: "48",
    pointerEvents: "none",
  });
  cameraLayer.appendChild(groupLayer);
  mountGroupBoundaries(groupLayer, plan.groupBoundaries, plan.theme);

  const sequenceLayer = document.createElement("div");
  sequenceLayer.className = "markdy-sequence-layer";
  cameraLayer.appendChild(sequenceLayer);

  const nodeLayer = document.createElement("div");
  nodeLayer.className = "markdy-scene-node-layer";
  Object.assign(nodeLayer.style, { position: "absolute", inset: "0", zIndex: "60" });
  cameraLayer.appendChild(nodeLayer);

  const annotationLayer = document.createElement("div");
  annotationLayer.className = "markdy-annotation-layer";
  cameraLayer.appendChild(annotationLayer);

  const captionLayer = createBeatCaptionLayer(document, plan.beats);
  sceneContent.appendChild(captionLayer);

  const nodeEls = new Map<string, HTMLElement>();
  for (const node of plan.nodes) {
    const el = createNodeEl(node, plan.theme, assets);
    nodeLayer.appendChild(el);
    nodeEls.set(node.id, el);
  }

  function scaleScene(): void {
    const s = viewport.clientWidth / plan.meta.width;
    scene.style.transform = `scale(${s})`;
  }
  scaleScene();
  const resizeObserver = new ResizeObserver(scaleScene);
  resizeObserver.observe(viewport);

  const edgeRuntimes: EdgeRuntimeMap = new Map();
  const edgeSceneId = createEdgeSceneId();
  const sequenceAnims = plan.diagramType === "sequence"
    ? mountSequenceLayer(
      sequenceLayer,
      plan.nodes,
      plan.sequenceMessages,
      plan.sequenceActivations,
      plan.theme,
      { width: plan.meta.width, height: plan.meta.height },
    )
    : [];
  const allAnims = [
    ...sequenceAnims,
    ...buildStructuralEdgeAnimations(
      plan.edges,
      plan.nodes,
      plan.theme,
      structuralEdgeHost,
      { width: plan.meta.width, height: plan.meta.height },
      edgeRuntimes,
      edgeSceneId,
      plan.diagramType,
    ),
    ...buildCueAnimations(plan.cues, nodeEls, plan.nodes, plan.theme, cameraLayer, titleEl, {
      width: plan.meta.width,
      height: plan.meta.height,
    }, plan.edges, edgeRuntimes, edgeSceneId, plan.diagramType),
    ...buildBeatCaptionAnimations(plan.beats, captionLayer),
  ];
  mountAnnotations(annotationLayer, plan.annotations, plan.nodes, plan.theme, {
    width: plan.meta.width,
    height: plan.meta.height,
  });
  for (const anim of allAnims) {
    anim.pause();
    anim.currentTime = 0;
  }

  let sceneMs = 0;
  let playbackRate = Number.isFinite(initialPlaybackRate) && initialPlaybackRate > 0 ? initialPlaybackRate : DEFAULT_PLAYBACK_RATE;
  let lastRafTs: number | null = null;
  let isPlaying = false;
  let rafId: number | null = null;

  let viewportScale = 1;
  let viewportPanX = 0;
  let viewportPanY = 0;
  let activePointerId: number | null = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragLastX = 0;
  let dragLastY = 0;
  let dragMoved = false;
  let suppressNextClick = false;

  function applyViewportTransform(): void {
    viewportTransform.style.transform = `translate(${viewportPanX}px, ${viewportPanY}px) scale(${viewportScale})`;
  }

  function handleViewportWheel(event: WheelEvent): void {
    event.preventDefault();

    const rect = viewport.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const nextScale = Math.min(MAX_VIEWPORT_ZOOM, Math.max(MIN_VIEWPORT_ZOOM, viewportScale * Math.exp(-event.deltaY * VIEWPORT_ZOOM_STEP)));
    if (nextScale === viewportScale) return;

    const sceneX = (pointerX - viewportPanX) / viewportScale;
    const sceneY = (pointerY - viewportPanY) / viewportScale;
    viewportScale = nextScale;
    viewportPanX = pointerX - sceneX * viewportScale;
    viewportPanY = pointerY - sceneY * viewportScale;
    applyViewportTransform();
  }

  function handleViewportPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || activePointerId !== null) return;
    activePointerId = event.pointerId;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragLastX = event.clientX;
    dragLastY = event.clientY;
    dragMoved = false;
    viewport.setPointerCapture(event.pointerId);
    viewport.style.cursor = "grabbing";
  }

  function handleViewportPointerMove(event: PointerEvent): void {
    if (event.pointerId !== activePointerId) return;

    const deltaX = event.clientX - dragLastX;
    const deltaY = event.clientY - dragLastY;
    const totalX = event.clientX - dragStartX;
    const totalY = event.clientY - dragStartY;
    if (!dragMoved && Math.hypot(totalX, totalY) >= DRAG_CLICK_THRESHOLD_PX) dragMoved = true;

    dragLastX = event.clientX;
    dragLastY = event.clientY;
    viewportPanX += deltaX;
    viewportPanY += deltaY;
    applyViewportTransform();
  }

  function handleViewportPointerEnd(event: PointerEvent): void {
    if (event.pointerId !== activePointerId) return;
    if (dragMoved) suppressNextClick = true;
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);
    activePointerId = null;
    dragMoved = false;
    viewport.style.cursor = interactiveViewport ? "grab" : "pointer";
  }

  function applyCurrentTime(): void {
    for (const anim of allAnims) anim.currentTime = sceneMs;
    onTimeUpdate?.(sceneMs / 1000, durationSeconds);
  }

  function rafTick(timestamp: number): void {
    if (lastRafTs !== null) sceneMs += (timestamp - lastRafTs) * playbackRate * NORMAL_PLAYBACK_RATE;
    lastRafTs = timestamp;

    if (totalDurationMs > 0 && sceneMs >= totalDurationMs) {
      if (loop) sceneMs = sceneMs % totalDurationMs;
      else {
        sceneMs = totalDurationMs;
        applyCurrentTime();
        isPlaying = false;
        onPlayStateChange?.(false);
        lastRafTs = null;
        rafId = null;
        return;
      }
    }

    applyCurrentTime();
    if (totalDurationMs > 0) updateProgressBar(sceneMs / totalDurationMs);
    rafId = requestAnimationFrame(rafTick);
  }

  const diagram: Diagram = {
    play() {
      if (isPlaying) return;
      isPlaying = true;
      onPlayStateChange?.(true);
      lastRafTs = null;
      rafId = requestAnimationFrame(rafTick);
    },
    pause() {
      if (!isPlaying) return;
      isPlaying = false;
      onPlayStateChange?.(false);
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      lastRafTs = null;
    },
    seek(seconds: number) {
      sceneMs = totalDurationMs > 0 ? Math.min(Math.max(seconds * 1000, 0), totalDurationMs) : Math.max(seconds * 1000, 0);
      applyCurrentTime();
      if (totalDurationMs > 0) updateProgressBar(sceneMs / totalDurationMs);
    },
    setPlaybackRate(rate: number) {
      if (!Number.isFinite(rate) || rate <= 0) return;
      playbackRate = rate;
    },
    playbackRate() {
      return playbackRate;
    },
    currentTime() {
      return sceneMs / 1000;
    },
    duration() {
      return durationSeconds;
    },
    isPlaying() {
      return isPlaying;
    },
    beats() {
      return plan.beats;
    },
    seekToBeat(name: string) {
      const beat = plan.beats.find((b) => b.name === name);
      if (beat) diagram.seek(beat.start);
    },
    destroy() {
      diagram.pause();
      for (const anim of allAnims) anim.cancel();
      resizeObserver.disconnect();
      if (progressEl?.parentNode === viewport) viewport.removeChild(progressEl);
      if (badge?.parentNode) badge.parentNode.removeChild(badge);
      if (viewport.parentNode === container) container.removeChild(viewport);
    },
  };

  viewport.style.cursor = interactiveViewport ? "grab" : "pointer";
  if (interactiveViewport) {
    viewport.style.touchAction = "none";
    viewport.addEventListener("wheel", handleViewportWheel, { passive: false });
    viewport.addEventListener("pointerdown", handleViewportPointerDown);
    viewport.addEventListener("pointermove", handleViewportPointerMove);
    viewport.addEventListener("pointerup", handleViewportPointerEnd);
    viewport.addEventListener("pointercancel", handleViewportPointerEnd);
  }
  viewport.addEventListener("click", () => {
    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }
    if (isPlaying) diagram.pause();
    else {
      if (!loop && sceneMs >= totalDurationMs) sceneMs = 0;
      diagram.play();
    }
  });

  if (autoplay) diagram.play();
  return diagram;
}
