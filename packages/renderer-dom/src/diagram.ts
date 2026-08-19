/**
 * Markdy diagram runtime — renders a RenderPlan via WAAPI.
 */
import {
  compressMarkdyToUrlHash,
  parseAndCompile,
  resolvePlayer,
  type BeatRange,
  type Diagnostic,
  type PlayerProgress,
} from "@markdy/core";
import {
  buildCueAnimations,
  buildStructuralEdgeAnimations,
  createEdgeSceneId,
  type EdgeRuntimeMap,
} from "./edges.js";
import { mountAnnotations } from "./annotations.js";
import { mountConstellationLayer } from "./constellation.js";
import { mountRadarLayer } from "./radar.js";
import { mountTimelineLayer } from "./timeline.js";
import { mountGroupBoundaries } from "./groups.js";
import { createNodeEl, createTitleEl, ensureNodeStyles } from "./nodes.js";
import { mountSequenceLayer } from "./sequence.js";
import { mountTreeBuses } from "./tree.js";
import { applyThemeToScene, ensureSceneStyles } from "./theme.js";

const NORMAL_PLAYBACK_RATE = 4 / 5;
const MIN_VIEWPORT_ZOOM = 0.5;
const MAX_VIEWPORT_ZOOM = 3;
const VIEWPORT_ZOOM_STEP = 0.0015;
const DRAG_CLICK_THRESHOLD_PX = 4;
const BEAT_NAV_EPSILON_S = 0.05;
const MARKDY_PLAYGROUND_URL = "https://markdy.com/playground/";

function encodeCodeForPlaygroundHash(code: string): string {
  return encodeURIComponent(btoa(encodeURIComponent(code)));
}

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
  progressBar?: boolean | string;
  /** Show rainbow progress around scene boundary, or specify a custom color/gradient. Defaults to true. */
  sceneBoundaryProgress?: boolean | string;
  /** Custom progress bar color or gradient. Defaults to rainbow. */
  progressColor?: string;
  /** @deprecated Prefer progressColor. */
  progressBarColor?: string;
  /** Playback speed multiplier. Defaults to 1, where 1 is Markdy's normal pace. */
  playbackRate?: number;
  /** Enable wheel zoom and drag pan on the rendered viewport. Defaults to false. */
  interactiveViewport?: boolean;
  /** Base URL for the Share control. Defaults to the Markdy playground. */
  shareUrl?: string;
  /** Show built-in playback and viewport controls. Also enables viewport interaction. Defaults to false. */
  controls?: boolean;
  onWarning?: (warning: Diagnostic) => void;
  onTimeUpdate?: (seconds: number, durationSeconds: number) => void;
  onPlayStateChange?: (playing: boolean) => void;
  onEnded?: () => void;
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
  nextBeat(): void;
  prevBeat(): void;
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
    assets,
    progressBar,
    sceneBoundaryProgress,
    progressColor,
    progressBarColor,
    playbackRate: initialPlaybackRate,
    controls: explicitControls,
    interactiveViewport: explicitInteractiveViewport,
    shareUrl,
    autoplay: explicitAutoplay,
    loop: explicitLoop,
    copyright: explicitCopyright,
    onWarning = (w) => console.warn(`[markdy] line ${w.line}: ${w.message}`),
    onTimeUpdate,
    onPlayStateChange,
    onEnded,
  } = opts;

  const { ast, plan } = parseAndCompile(code);
  for (const w of ast.diagnostics) {
    if (w.severity === "warning") onWarning(w);
  }

  const hostProgress: PlayerProgress | undefined =
    sceneBoundaryProgress === false || (sceneBoundaryProgress === undefined && progressBar === false)
      ? "none"
      : undefined;
  const hostProgressColor =
    progressColor ??
    progressBarColor ??
    (typeof sceneBoundaryProgress === "string" && sceneBoundaryProgress !== "true" && sceneBoundaryProgress !== "false"
      ? sceneBoundaryProgress
      : typeof progressBar === "string" && progressBar !== "true" && progressBar !== "false"
        ? progressBar
        : undefined);

  const player = resolvePlayer(plan.meta.player, {
    autoplay: explicitAutoplay,
    loop: explicitLoop,
    playbackRate: initialPlaybackRate,
    copyright: explicitCopyright,
    controls: explicitControls,
    interactiveViewport: explicitInteractiveViewport,
    progress: hostProgress,
    progressColor: hostProgressColor,
  });

  const { autoplay, loop } = player.playback;
  const {
    enabled: interactiveViewport,
    zoom: allowZoom,
    pan: allowPan,
    clickToPlay,
    doubleClickToReset,
    keyboard: keyboardShortcuts,
  } = player.interaction;
  const {
    enabled: showControls,
    play: playButton,
    restart: restartButton,
    prevBeat: prevBeatButton,
    nextBeat: nextBeatButton,
    seek: seekBar,
    speed: speedControls,
    speeds: speedOptions,
    fit: fitViewButton,
    resetView: resetViewButton,
    fullscreen: fullscreenButton,
    svg: svgButton,
    share: shareButton,
  } = player.controls;
  const copyright = player.chrome.badge;
  const progressMode = player.chrome.progress;
  const showProgress = progressMode !== "none";

  let playbackRate = player.playback.rate;

  const rawColor = player.chrome.progressColor;
  const customColor = rawColor && rawColor.trim() !== "rainbow" ? rawColor.trim() : null;
  const DEFAULT_RAINBOW =
    "hsl(0,90%,60%), hsl(45,90%,55%), hsl(90,80%,50%), hsl(180,80%,50%), hsl(270,80%,55%), hsl(330,90%,60%)";

  const totalDurationMs = plan.duration * 1000;
  const durationSeconds = plan.duration;

  const viewport = document.createElement("div");
  viewport.className = "markdy-viewport";
  Object.assign(viewport.style, {
    position: "relative",
    width: "100%",
    height: "100%",
    maxWidth: "100%",
    maxHeight: "100%",
    aspectRatio: `${plan.meta.width} / ${plan.meta.height}`,
    overflow: "hidden",
    boxSizing: "border-box",
  });
  container.appendChild(viewport);

  let progressEl: HTMLElement | null = null;
  if (showProgress) {
    progressEl = document.createElement("div");
    Object.assign(progressEl.style, {
      position: "absolute",
      ...(progressMode === "bar" ? { left: "0", right: "0", bottom: "0", height: "3px" } : { inset: "0" }),
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
    if (progressMode === "bar") {
      progressEl.style.background = customColor ?? "#2563eb";
      progressEl.style.transformOrigin = "left center";
      progressEl.style.transform = `scaleX(${pct})`;
      return;
    }
    const deg = pct * 360;
    const colorStops = customColor
      ? customColor.includes(",")
        ? customColor
        : `${customColor} 0deg, ${customColor}`
      : DEFAULT_RAINBOW;
    progressEl.style.background = `conic-gradient(from ${tlAngleNorm}deg, ${colorStops} ${deg}deg, transparent ${deg}deg)`;
    progressEl.style.mask = "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)";
    progressEl.style.webkitMask = progressEl.style.mask;
    progressEl.style.maskComposite = "exclude";
    (progressEl.style as unknown as Record<string, string>).webkitMaskComposite = "xor";
    progressEl.style.padding = "2px";
  }

  let footer: HTMLDivElement | null = null;
  function ensureFooter(): HTMLDivElement {
    if (footer) return footer;
    footer = document.createElement("div");
    footer.className = "markdy-footer";
    Object.assign(footer.style, {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "6px",
      width: "100%",
      boxSizing: "border-box",
      padding: "4px 6px 0",
    });
    if (container.parentNode) container.parentNode.insertBefore(footer, container.nextSibling);
    else container.appendChild(footer);
    return footer;
  }

  let badge: HTMLAnchorElement | null = null;
  if (copyright) {
    badge = document.createElement("a");
    badge.href = `${MARKDY_PLAYGROUND_URL}#code=${encodeCodeForPlaygroundHash(code)}`;
    badge.target = "_blank";
    badge.rel = "noopener noreferrer";
    badge.textContent = "Powered by Markdy";
    Object.assign(badge.style, {
      display: "inline-flex",
      alignItems: "center",
      textAlign: "right",
      fontSize: "10px",
      fontFamily: "system-ui, sans-serif",
      color: "#999",
      textDecoration: "none",
      padding: "0",
      opacity: "0.7",
      marginLeft: "auto",
    });
    ensureFooter().appendChild(badge);
  }

  ensureSceneStyles(document);
  ensureNodeStyles(document);

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
  viewport.appendChild(scene);

  const viewportTransform = document.createElement("div");
  viewportTransform.className = "markdy-viewport-transform";
  Object.assign(viewportTransform.style, {
    position: "absolute",
    inset: "0",
    transformOrigin: "0 0",
    willChange: interactiveViewport ? "transform" : "auto",
  });
  scene.appendChild(viewportTransform);

  const sceneContent = document.createElement("div");
  sceneContent.className = "markdy-scene-content";
  Object.assign(sceneContent.style, { position: "absolute", inset: "0" });
  viewportTransform.appendChild(sceneContent);

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
  } else if (plan.diagramType === "radar") {
    mountRadarLayer(
      constellationLayer,
      plan.nodes,
      plan.theme,
      { width: plan.meta.width, height: plan.meta.height },
    );
  } else if (plan.diagramType === "timeline") {
    mountTimelineLayer(
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

  let fitScale = 1;
  let sceneOffsetX = 0;
  let sceneOffsetY = 0;

  function computeContentBounds(): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
    if (!plan.nodes || plan.nodes.length === 0) {
      return { minX: 0, minY: 0, maxX: plan.meta.width, maxY: plan.meta.height, width: plan.meta.width, height: plan.meta.height };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of plan.nodes) {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + node.width);
      maxY = Math.max(maxY, node.y + node.height);
    }

    for (const gb of plan.groupBoundaries ?? []) {
      minX = Math.min(minX, gb.x);
      minY = Math.min(minY, gb.y);
      maxX = Math.max(maxX, gb.x + gb.width);
      maxY = Math.max(maxY, gb.y + gb.height);
    }

    for (const bus of plan.treeBuses ?? []) {
      minX = Math.min(minX, bus.parentX, ...(bus.childXs.length ? bus.childXs : [bus.parentX]));
      minY = Math.min(minY, bus.parentY, bus.branchY, bus.childY);
      maxX = Math.max(maxX, bus.parentX, ...(bus.childXs.length ? bus.childXs : [bus.parentX]));
      maxY = Math.max(maxY, bus.parentY, bus.branchY, bus.childY);
    }

    if (plan.title) {
      minY = Math.min(minY, 20);
    }

    const pad = 36;
    minX = Math.max(0, minX - pad);
    minY = Math.max(0, minY - pad);
    maxX = Math.min(plan.meta.width, maxX + pad);
    maxY = Math.min(plan.meta.height, maxY + pad);

    const width = Math.max(maxX - minX, 200);
    const height = Math.max(maxY - minY, 140);
    return { minX, minY, maxX, maxY, width, height };
  }

  function scaleScene(): void {
    const isBrowserLayout = (viewport.clientWidth || container.clientWidth || 0) > 0;
    if (!isBrowserLayout) {
      fitScale = 1;
      sceneOffsetX = 0;
      sceneOffsetY = 0;
      scene.style.left = "0px";
      scene.style.top = "0px";
      scene.style.transformOrigin = "0 0";
      scene.style.transform = "scale(1)";
      return;
    }

    const vWidth = viewport.clientWidth || container.clientWidth || plan.meta.width;
    const vHeight = viewport.clientHeight || container.clientHeight || (vWidth * plan.meta.height) / plan.meta.width;

    const canvasScaleX = vWidth / plan.meta.width;
    const canvasScaleY = vHeight / plan.meta.height;
    fitScale = Math.min(canvasScaleX, canvasScaleY);

    if (!Number.isFinite(fitScale) || fitScale <= 0) fitScale = 1;

    const scaledWidth = plan.meta.width * fitScale;
    const scaledHeight = plan.meta.height * fitScale;
    sceneOffsetX = (vWidth - scaledWidth) / 2;
    sceneOffsetY = (vHeight - scaledHeight) / 2;

    scene.style.left = `${sceneOffsetX}px`;
    scene.style.top = `${sceneOffsetY}px`;
    scene.style.transformOrigin = "0 0";
    scene.style.transform = `scale(${fitScale})`;
  }
  scaleScene();
  const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(scaleScene) : null;
  resizeObserver?.observe(viewport);
  if (container !== viewport) resizeObserver?.observe(container);

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
  let controlsPlayButton: HTMLButtonElement | null = null;
  let controlsRateButtons: HTMLButtonElement[] = [];
  let controlsSeekBar: HTMLInputElement | null = null;
  let controlsFitButton: HTMLButtonElement | null = null;
  let fitViewActive = false;

  function applyViewportTransform(): void {
    viewportTransform.style.transform = `translate(${viewportPanX}px, ${viewportPanY}px) scale(${viewportScale})`;
  }

  function resetViewportTransform(): void {
    releaseFitView();
    viewportScale = 1;
    viewportPanX = 0;
    viewportPanY = 0;
    applyViewportTransform();
  }

  /** Inline `!important` outranks cue animations, pinning the camera. */
  function releaseFitView(): void {
    if (!fitViewActive) return;
    fitViewActive = false;
    cameraLayer.style.removeProperty("transform");
  }

  function toggleFitView(): void {
    if (fitViewActive) {
      resetViewportTransform();
      syncControls();
      return;
    }

    const bounds = computeContentBounds();
    const scale = Math.min(plan.meta.width / bounds.width, plan.meta.height / bounds.height);
    viewportScale = Number.isFinite(scale) && scale > 0 ? scale : 1;
    viewportPanX = -bounds.minX * viewportScale + (plan.meta.width - bounds.width * viewportScale) / 2;
    viewportPanY = -bounds.minY * viewportScale + (plan.meta.height - bounds.height * viewportScale) / 2;
    applyViewportTransform();

    fitViewActive = true;
    cameraLayer.style.setProperty("transform", "none", "important");
    syncControls();
  }

  function handleViewportWheel(event: WheelEvent): void {
    event.preventDefault();

    const rect = viewport.getBoundingClientRect();
    const pointerX = (event.clientX - rect.left - sceneOffsetX) / fitScale;
    const pointerY = (event.clientY - rect.top - sceneOffsetY) / fitScale;
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
    if (!allowPan) return;
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

    const deltaX = (event.clientX - dragLastX) / fitScale;
    const deltaY = (event.clientY - dragLastY) / fitScale;
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

  function handleViewportDoubleClick(event: MouseEvent): void {
    event.preventDefault();
    suppressNextClick = false;
    resetViewportTransform();
  }

  function syncControls(): void {
    if (controlsPlayButton) {
      const playing = isPlaying;
      controlsPlayButton.textContent = playing ? "Pause" : "Play";
      const playLabel = playing ? "Pause diagram" : "Play diagram";
      controlsPlayButton.setAttribute("aria-label", playLabel);
      controlsPlayButton.title = playLabel;
    }
    for (const button of controlsRateButtons) {
      const rate = Number(button.dataset.rate ?? "1");
      const active = Math.abs(rate - playbackRate) < 0.001;
      button.setAttribute("aria-pressed", active ? "true" : "false");
    }
    if (controlsSeekBar) controlsSeekBar.value = String(sceneMs / 1000);
    if (controlsFitButton) {
      controlsFitButton.setAttribute("aria-pressed", fitViewActive ? "true" : "false");
    }
  }

  function emitPlayStateChange(playing: boolean): void {
    onPlayStateChange?.(playing);
    syncControls();
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
        emitPlayStateChange(false);
        lastRafTs = null;
        rafId = null;
        onEnded?.();
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
      emitPlayStateChange(true);
      lastRafTs = null;
      rafId = requestAnimationFrame(rafTick);
    },
    pause() {
      if (!isPlaying) return;
      isPlaying = false;
      emitPlayStateChange(false);
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
      syncControls();
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
    nextBeat() {
      const next = plan.beats.find((beat) => beat.start > sceneMs / 1000 + BEAT_NAV_EPSILON_S);
      if (next) diagram.seek(next.start);
    },
    prevBeat() {
      const current = sceneMs / 1000;
      let target = 0;
      for (const beat of plan.beats) {
        if (beat.start < current - BEAT_NAV_EPSILON_S) target = beat.start;
      }
      diagram.seek(target);
    },
    destroy() {
      diagram.pause();
      if (keyboardShortcuts && typeof window !== "undefined") {
        window.removeEventListener("keydown", handleKeyDown);
      }
      for (const anim of allAnims) anim.cancel();
      resizeObserver?.disconnect();
      if (progressEl?.parentNode === viewport) viewport.removeChild(progressEl);
      if (badge?.parentNode) badge.parentNode.removeChild(badge);
      if (footer?.parentNode) footer.parentNode.removeChild(footer);
      if (viewport.parentNode === container) container.removeChild(viewport);
    },
  };

  function togglePlayback(): void {
    if (isPlaying) diagram.pause();
    else {
      if (!loop && sceneMs >= totalDurationMs) sceneMs = 0;
      diagram.play();
    }
  }

  function makeControlButton(label: string, ariaLabel: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.setAttribute("aria-label", ariaLabel);
    button.title = ariaLabel;
    return button;
  }

  function mountPlayControl(toolbar: HTMLElement): void {
    if (!playButton) return;
    controlsPlayButton = makeControlButton("Play", "Play diagram");
    controlsPlayButton.className = "markdy-control-play";
    controlsPlayButton.addEventListener("click", togglePlayback);
    toolbar.appendChild(controlsPlayButton);
  }

  function mountBeatNavControls(toolbar: HTMLElement, position: "prev" | "next"): void {
    const wanted = position === "prev" ? prevBeatButton : nextBeatButton;
    if (!wanted || plan.beats.length < 2) return;
    const label = position === "prev" ? "Prev" : "Next";
    const button = makeControlButton(label, `${label === "Prev" ? "Previous" : "Next"} beat`);
    button.className = `markdy-control-${position}-beat`;
    button.addEventListener("click", () => (position === "prev" ? diagram.prevBeat() : diagram.nextBeat()));
    toolbar.appendChild(button);
  }

  function mountRestartControl(toolbar: HTMLElement): void {
    if (!restartButton) return;
    const button = makeControlButton("Restart", "Restart diagram");
    button.className = "markdy-control-restart";
    button.addEventListener("click", () => {
      diagram.seek(0);
      diagram.play();
    });
    toolbar.appendChild(button);
  }

  function mountSeekControl(toolbar: HTMLElement): void {
    if (!seekBar) return;
    controlsSeekBar = document.createElement("input");
    controlsSeekBar.className = "markdy-control-seek";
    controlsSeekBar.type = "range";
    controlsSeekBar.min = "0";
    controlsSeekBar.max = String(durationSeconds);
    controlsSeekBar.step = "0.01";
    controlsSeekBar.value = String(sceneMs / 1000);
    controlsSeekBar.setAttribute("aria-label", "Seek diagram timeline");
    controlsSeekBar.addEventListener("input", () => diagram.seek(Number(controlsSeekBar?.value ?? 0)));
    toolbar.appendChild(controlsSeekBar);
  }

  function mountSpeedControls(toolbar: HTMLElement): void {
    if (!speedControls) return;
    controlsRateButtons = speedOptions.map((rate) => {
      const button = makeControlButton(`${rate}x`, `Set playback speed to ${rate}x`);
      button.className = "markdy-control-rate";
      button.dataset.rate = String(rate);
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => diagram.setPlaybackRate(rate));
      toolbar.appendChild(button);
      return button;
    });
  }

  function flashControlLabel(button: HTMLButtonElement, message: string): void {
    const original = button.textContent ?? "";
    button.textContent = message;
    setTimeout(() => {
      button.textContent = original;
    }, 1400);
  }

  function downloadFile(filename: string, contents: string, type: string): void {
    const blob = new Blob([contents], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function mountSvgControl(toolbar: HTMLElement): void {
    if (!svgButton) return;
    const button = makeControlButton("SVG", "Export diagram as SVG");
    button.className = "markdy-control-svg";
    button.addEventListener("click", async () => {
      const resumeAt = sceneMs;
      const wasPlaying = isPlaying;
      try {
        // Export the settled frame so every revealed node is present.
        diagram.pause();
        diagram.seek(durationSeconds);
        const { exportDiagramAsVectorSvg } = await import("./export/svg-exporter.js");
        const svg = exportDiagramAsVectorSvg(container);
        const name = (plan.title || "markdy-diagram").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        downloadFile(`${name || "markdy-diagram"}.svg`, svg, "image/svg+xml");
      } catch (error) {
        onWarning({ severity: "warning", message: `SVG export failed: ${String(error)}`, line: 0 });
        flashControlLabel(button, "Failed");
      } finally {
        diagram.seek(resumeAt / 1000);
        if (wasPlaying) diagram.play();
      }
    });
    toolbar.appendChild(button);
  }

  function mountShareControl(toolbar: HTMLElement): void {
    if (!shareButton) return;
    const button = makeControlButton("Share", "Copy a share link for this diagram");
    button.className = "markdy-control-share";
    button.addEventListener("click", async () => {
      try {
        const hash = await compressMarkdyToUrlHash(code);
        const base = shareUrl ?? MARKDY_PLAYGROUND_URL;
        await navigator.clipboard.writeText(`${base}#code=${hash}`);
        flashControlLabel(button, "Copied");
      } catch (error) {
        onWarning({ severity: "warning", message: `Share link failed: ${String(error)}`, line: 0 });
        flashControlLabel(button, "Failed");
      }
    });
    toolbar.appendChild(button);
  }

  function mountFitControl(toolbar: HTMLElement): void {
    if (!fitViewButton) return;
    controlsFitButton = makeControlButton("Fit", "Fit all items in view and ignore camera zoom");
    controlsFitButton.className = "markdy-control-fit";
    controlsFitButton.setAttribute("aria-pressed", "false");
    controlsFitButton.addEventListener("click", toggleFitView);
    toolbar.appendChild(controlsFitButton);
  }

  function mountResetViewControl(toolbar: HTMLElement): void {
    if (!resetViewButton) return;
    const button = makeControlButton("Reset", "Reset diagram view");
    button.className = "markdy-control-reset-view";
    button.addEventListener("click", resetViewportTransform);
    toolbar.appendChild(button);
  }

  function mountFullscreenControl(toolbar: HTMLElement): void {
    if (!fullscreenButton) return;
    const button = makeControlButton("Full", "Toggle fullscreen view");
    button.className = "markdy-control-fullscreen";
    button.setAttribute("aria-pressed", "false");

    const host = container.parentElement ?? container;

    function syncFullscreenState(): void {
      const isFull =
        document.fullscreenElement === host ||
        document.fullscreenElement === container ||
        document.fullscreenElement === viewport;
      button.setAttribute("aria-pressed", isFull ? "true" : "false");
      button.title = isFull ? "Exit fullscreen" : "Toggle fullscreen view";
    }

    button.addEventListener("click", async () => {
      try {
        if (!document.fullscreenElement) {
          if (host.requestFullscreen) {
            await host.requestFullscreen();
          } else if ((host as any).webkitRequestFullscreen) {
            await (host as any).webkitRequestFullscreen();
          }
        } else {
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen();
          }
        }
      } catch (err) {
        onWarning({ severity: "warning", message: `Fullscreen toggle failed: ${String(err)}`, line: 0 });
      }
    });

    document.addEventListener("fullscreenchange", syncFullscreenState);
    toolbar.appendChild(button);
  }

  function handleKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target?.isContentEditable
    ) {
      return;
    }

    switch (event.key) {
      case "ArrowRight":
      case "PageDown":
        event.preventDefault();
        diagram.nextBeat();
        break;
      case "ArrowLeft":
      case "PageUp":
        event.preventDefault();
        diagram.prevBeat();
        break;
      case " ":
        event.preventDefault();
        togglePlayback();
        break;
      case "Home":
        event.preventDefault();
        diagram.seek(0);
        break;
      default:
    }
  }

  function mountControls(): void {
    const toolbar = document.createElement("div");
    toolbar.className = "markdy-controls";
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", "Diagram controls");
    Object.assign(toolbar.style, {
      position: "static",
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-start",
      maxWidth: "100%",
      padding: "0",
      border: "0",
      borderRadius: "0",
      background: "transparent",
      boxShadow: "none",
      backdropFilter: "none",
      transform: "none",
      pointerEvents: "auto",
    });
    for (const eventName of ["click", "dblclick", "pointerdown", "pointermove", "pointerup", "wheel"]) {
      toolbar.addEventListener(eventName, (event) => event.stopPropagation());
    }

    mountPlayControl(toolbar);
    mountBeatNavControls(toolbar, "prev");
    mountBeatNavControls(toolbar, "next");
    mountRestartControl(toolbar);
    mountSeekControl(toolbar);
    mountSpeedControls(toolbar);
    mountFitControl(toolbar);
    mountResetViewControl(toolbar);
    mountFullscreenControl(toolbar);
    mountSvgControl(toolbar);
    mountShareControl(toolbar);

    ensureFooter().insertBefore(toolbar, badge ?? null);
    syncControls();
  }

  viewport.style.cursor = interactiveViewport ? "grab" : "pointer";
  if (interactiveViewport) {
    viewport.style.touchAction = "none";
    if (allowZoom) viewport.addEventListener("wheel", handleViewportWheel, { passive: false });
    if (allowPan) {
      viewport.addEventListener("pointerdown", handleViewportPointerDown);
      viewport.addEventListener("pointermove", handleViewportPointerMove);
      viewport.addEventListener("pointerup", handleViewportPointerEnd);
      viewport.addEventListener("pointercancel", handleViewportPointerEnd);
    }
    if (doubleClickToReset) viewport.addEventListener("dblclick", handleViewportDoubleClick);
  }
  if (showControls) mountControls();
  if (clickToPlay) {
    viewport.addEventListener("click", () => {
      if (suppressNextClick) {
        suppressNextClick = false;
        return;
      }
      togglePlayback();
    });
  }

  if (keyboardShortcuts && typeof window !== "undefined") {
    window.addEventListener("keydown", handleKeyDown);
  }

  if (autoplay) diagram.play();
  return diagram;
}
