import type { DiagramType, EdgeKind, PositionedNode, RoutedEdge, ThemeTokens, TimedCue } from "@markdy/core";
import { placeFlowLabel, polylineLength, routeOrthogonal, selfLoopPath, toPathD } from "./geometry/path.js";
import { boxRect, type Point, type Rect } from "./geometry/rect.js";

const EDGE_LAYER_ATTR = "data-markdy-edge-layer";

const EDGE_STYLES: Record<EdgeKind, { dash: string; marker: string }> = {
  request: { dash: "", marker: "arrow" },
  response: { dash: "6 4", marker: "arrow-open" },
  event: { dash: "2 6", marker: "dot" },
  dependency: { dash: "4 4", marker: "none" },
};

const INITIAL_CAMERA_TRANSFORM = "translate(0px, 0px) scale(1)";
const DEFAULT_FRAME_ZOOM = 1.18;
const MAX_FRAME_ZOOM = 1.75;
const FRAME_PADDING = 88;

let edgeSceneCounter = 0;

export function createEdgeSceneId(): string {
  edgeSceneCounter += 1;
  return `md-scene-${edgeSceneCounter}`;
}

/** Drops consecutive duplicate points so path data and dot offsets stay valid. */
function dedupePoints(points: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (!last || Math.abs(last.x - p.x) > 0.01 || Math.abs(last.y - p.y) > 0.01) out.push(p);
  }
  return out.length >= 2 ? out : points;
}

export function ensureEdgeLayer(scene: HTMLElement): SVGSVGElement {
  const existing = scene.querySelector<SVGSVGElement>(`svg[${EDGE_LAYER_ATTR}='1']`);
  if (existing) return existing;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute(EDGE_LAYER_ATTR, "1");
  Object.assign(svg.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    overflow: "visible",
    pointerEvents: "none",
    zIndex: "95",
  });
  scene.appendChild(svg);
  return svg;
}

function ensureDefs(svg: SVGSVGElement, theme: ThemeTokens, id: string): void {
  const key = `data-markdy-defs-${id}`;
  if (svg.querySelector(`defs[${key}='1']`)) return;
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.setAttribute(key, "1");

  for (const [kind, color] of Object.entries(theme.edges) as [EdgeKind, string][]) {
    const arrow = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    arrow.setAttribute("id", `${id}-arrow-${kind}`);
    arrow.setAttribute("viewBox", "0 0 10 10");
    arrow.setAttribute("refX", "8.5");
    arrow.setAttribute("refY", "5");
    arrow.setAttribute("markerWidth", "7");
    arrow.setAttribute("markerHeight", "7");
    arrow.setAttribute("orient", "auto-start-reverse");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    if (kind === "response") {
      path.setAttribute("d", "M 1.5 1.6 L 9 5 L 1.5 8.4");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", color);
      path.setAttribute("stroke-width", "1.4");
    } else if (kind === "event") {
      path.setAttribute("d", "M 5 2 A 3 3 0 1 1 5 8 A 3 3 0 1 1 5 2");
      path.setAttribute("fill", color);
    } else {
      path.setAttribute("d", "M 1.5 1.6 L 9 5 L 1.5 8.4 L 3.4 5 Z");
      path.setAttribute("fill", color);
    }
    arrow.appendChild(path);
    defs.appendChild(arrow);
  }
  svg.prepend(defs);
}

export interface EdgeRuntime {
  group: SVGGElement;
  path: SVGPathElement;
  label?: SVGTextElement;
  labelPlate?: SVGRectElement;
  dot: SVGCircleElement;
  pathLen: number;
  points: Point[];
  labelRect?: Rect;
  kind: EdgeKind;
  color: string;
  drawReveal: boolean;
}

export type EdgeRuntimeMap = Map<string, EdgeRuntime>;

export function createEdgeRuntime(
  svg: SVGSVGElement,
  from: PositionedNode,
  to: PositionedNode,
  kind: EdgeKind,
  label: string | undefined,
  theme: ThemeTokens,
  sceneId: string,
  routeObstacles: Rect[],
  labelObstacles: Rect[],
  bounds: { width: number; height: number },
  lane: number,
): EdgeRuntime {
  ensureDefs(svg, theme, sceneId);
  const color = theme.edges[kind];
  const style = EDGE_STYLES[kind];
  const isSelfLoop = from.id === to.id;
  const points = isSelfLoop
    ? dedupePoints(selfLoopPath(from))
    : dedupePoints(routeOrthogonal(boxRect(from), boxRect(to), routeObstacles, bounds, lane));
  const d = toPathD(points);
  const len = polylineLength(points);

  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("data-edge-kind", kind);
  group.style.opacity = "0";

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", kind === "dependency" ? "1.5" : "2");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-linecap", "round");
  if (style.dash) path.setAttribute("stroke-dasharray", style.dash);
  if (style.marker !== "none") {
    path.setAttribute("marker-end", `url(#${sceneId}-arrow-${kind})`);
  }
  if (kind !== "dependency") {
    path.style.filter = `drop-shadow(0 0 3px ${translucentColor(color, "33")})`;
  }

  const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  dot.setAttribute("r", "3.5");
  dot.setAttribute("fill", color);
  dot.style.opacity = "0";
  dot.style.filter = `drop-shadow(0 0 4px ${color}aa)`;

  group.append(path, dot);

  let labelEl: SVGTextElement | undefined;
  let labelRect: Rect | undefined;
  if (label) {
    const textWidth = label.length * 6.6 + 10;
    const placement = placeFlowLabel(points, textWidth, labelObstacles, bounds);
    labelRect = placement.rect;
    const plate = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const padX = 7;
    const halfW = textWidth / 2;
    plate.setAttribute("x", String(placement.x - halfW - padX));
    plate.setAttribute("y", String(placement.y - 9));
    plate.setAttribute("width", String(textWidth + padX * 2));
    plate.setAttribute("height", "18");
    plate.setAttribute("rx", "6");
    plate.setAttribute("fill", theme.labelPlate ?? theme.surface);
    plate.setAttribute("fill-opacity", "0.9");
    plate.setAttribute("stroke", theme.hairline ?? `color-mix(in srgb, ${theme.border} 60%, transparent)`);
    plate.setAttribute("stroke-width", "1");
    plate.style.opacity = "0";
    group.appendChild(plate);
    labelEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
    labelEl.setAttribute("x", String(placement.x));
    labelEl.setAttribute("y", String(placement.y));
    labelEl.setAttribute("text-anchor", "middle");
    labelEl.setAttribute("dominant-baseline", "middle");
    labelEl.setAttribute("font-size", "11");
    labelEl.setAttribute("font-family", "ui-monospace, SFMono-Regular, Menlo, monospace");
    labelEl.setAttribute("fill", theme.text);
    labelEl.textContent = label;
    labelEl.style.opacity = "0";
    group.appendChild(labelEl);
    // Reveal the plate together with the label text.
    (labelEl as unknown as { __plate?: SVGRectElement }).__plate = plate;
  }

  svg.appendChild(group);
  return {
    group,
    path,
    label: labelEl,
    labelPlate: labelEl ? (labelEl as unknown as { __plate?: SVGRectElement }).__plate : undefined,
    dot,
    pathLen: len,
    points,
    labelRect,
    kind,
    color,
    drawReveal: style.dash.length === 0,
  };
}

function setEdgeVisible(runtime: EdgeRuntime, visible: boolean): void {
  runtime.group.style.opacity = visible ? "1" : "0";
  if (runtime.label) runtime.label.style.opacity = visible ? "1" : "0";
  if (runtime.labelPlate) runtime.labelPlate.style.opacity = visible ? "1" : "0";
}

function translucentColor(color: string, alpha = "aa"): string {
  const value = color.trim();
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    return `#${value.slice(1).split("").map((char) => char + char).join("")}${alpha}`;
  }
  if (/^#[0-9a-f]{6}$/i.test(value)) return `${value}${alpha}`;
  if (/^#[0-9a-f]{8}$/i.test(value)) return value;
  return `color-mix(in srgb, ${value} 67%, transparent)`;
}

function nextEdgeLane(lanes: Map<string, number>, from: string, to: string): number {
  const pair = [from, to].sort().join("|");
  const keys = [`pair:${pair}`, `out:${from}`, `in:${to}`];
  const lane = Math.max(...keys.map((key) => lanes.get(key) ?? 0));
  for (const key of keys) lanes.set(key, (lanes.get(key) ?? 0) + 1);
  return lane;
}

/** Keyframes that walk the dot along the polyline at constant speed. */
function dotTravelKeyframes(points: Point[]): Keyframe[] {
  const total = polylineLength(points);
  const frames: Keyframe[] = [];
  let acc = 0;
  let lastOffset = -1;
  points.forEach((p, i) => {
    if (i > 0) acc += Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y);
    let offset = total > 0 ? acc / total : i === points.length - 1 ? 1 : 0;
    if (offset <= lastOffset) offset = Math.min(1, lastOffset + 0.0001);
    lastOffset = offset;
    frames.push({
      offset,
      transform: `translate(${p.x}px, ${p.y}px)`,
      opacity: i === 0 || i === points.length - 1 ? 0 : 1,
    });
  });
  return frames;
}

export function animateEdgeReveal(runtime: EdgeRuntime, startMs: number, durMs: number): Animation[] {
  const anims: Animation[] = [];
  const { path, dot, label, group, pathLen, points } = runtime;
  if (runtime.drawReveal) {
    path.style.strokeDasharray = String(pathLen);
    path.style.strokeDashoffset = String(pathLen);
  }

  const drawMs = Math.min(220, durMs * 0.5);
  anims.push(group.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 120, delay: startMs, fill: "forwards" }));
  if (runtime.drawReveal) {
    anims.push(
      path.animate(
        [{ strokeDashoffset: pathLen }, { strokeDashoffset: 0 }],
        { duration: drawMs, delay: startMs, fill: "forwards", easing: "ease-out" },
      ),
    );
  }

  if (label) {
    anims.push(label.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, delay: startMs + 80, fill: "forwards" }));
    if (runtime.labelPlate) {
      anims.push(runtime.labelPlate.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, delay: startMs + 80, fill: "forwards" }));
    }
  }

  if (points.length >= 2) {
    anims.push(
      dot.animate(dotTravelKeyframes(points), {
        duration: Math.max(drawMs, durMs),
        delay: startMs,
        fill: "forwards",
        easing: "ease-in-out",
      }),
    );
  }
  return anims;
}

function animateEdgeEmphasis(
  runtime: EdgeRuntime,
  startMs: number,
  durMs: number,
  strength: number,
  color?: string,
): Animation {
  const baseFilter = runtime.kind === "dependency"
    ? "none"
    : `drop-shadow(0 0 3px ${translucentColor(runtime.color, "33")})`;
  const glowColor = color ?? runtime.color;
  const radius = Math.max(4, Math.min(16, 5 + strength * 4));
  const peakFilter = `drop-shadow(0 0 ${radius}px ${translucentColor(glowColor)}) brightness(${1 + Math.min(strength, 2) * 0.08})`;
  return runtime.path.animate(
    [{ filter: baseFilter }, { filter: peakFilter }, { filter: baseFilter }],
    { duration: durMs, delay: startMs, fill: "none", easing: "ease-in-out" },
  );
}

export function computeFrameTransform(
  targetIds: string[],
  nodes: PositionedNode[],
  bounds: { width: number; height: number },
  requestedZoom = DEFAULT_FRAME_ZOOM,
): string | undefined {
  const targets = new Set(targetIds);
  const selected = nodes.filter((node) => targets.has(node.id));
  if (selected.length === 0) return undefined;

  // Framing every node means "show the whole diagram", so reset the camera.
  const framesEveryNode = selected.length === nodes.length && nodes.every((node) => targets.has(node.id));
  if (framesEveryNode) return INITIAL_CAMERA_TRANSFORM;

  const zoom = Number.isFinite(requestedZoom) && requestedZoom > 0 ? requestedZoom : DEFAULT_FRAME_ZOOM;

  const minX = Math.min(...selected.map((node) => node.x));
  const minY = Math.min(...selected.map((node) => node.y));
  const maxX = Math.max(...selected.map((node) => node.x + node.width));
  const maxY = Math.max(...selected.map((node) => node.y + node.height));
  const frameWidth = Math.max(1, maxX - minX + FRAME_PADDING * 2);
  const frameHeight = Math.max(1, maxY - minY + FRAME_PADDING * 2);
  const fitScale = Math.min(bounds.width / frameWidth, bounds.height / frameHeight);
  const scale = Math.max(1, Math.min(zoom, fitScale, MAX_FRAME_ZOOM));
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const tx = Math.round((bounds.width / 2 - centerX * scale) * 10) / 10;
  const ty = Math.round((bounds.height / 2 - centerY * scale) * 10) / 10;
  return `translate(${tx}px, ${ty}px) scale(${Math.round(scale * 1000) / 1000})`;
}

export function buildCueAnimations(
  cues: TimedCue[],
  nodeEls: Map<string, HTMLElement>,
  nodes: PositionedNode[],
  theme: ThemeTokens,
  scene: HTMLElement,
  titleEl: HTMLElement,
  bounds: { width: number; height: number },
  edges: RoutedEdge[] = [],
  edgeRuntimes: EdgeRuntimeMap = new Map(),
  sceneId = createEdgeSceneId(),
  diagramType: DiagramType = "architecture",
): Animation[] {
  const anims: Animation[] = [];
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const rectById = new Map(nodes.map((n) => [n.id, boxRect(n)]));
  const allNodeRects = [...rectById.values()];
  const placedLabels: Rect[] = [];
  const laneByPair = new Map<string, number>();
  const svg = ensureEdgeLayer(scene);
  let cameraTransform = scene.style.transform || INITIAL_CAMERA_TRANSFORM;
  scene.style.transformOrigin = "0 0";
  scene.style.transform = cameraTransform;

  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const edgeRects = [...allNodeRects];
  const edgeRectById = new Map(nodes.map((node) => [node.id, boxRect(node)]));
  const edgeLabels: Rect[] = [];
  const edgeLanes = new Map<string, number>();
  for (const edge of diagramType === "sequence" ? [] : edges) {
    if (edge.structural || edgeRuntimes.has(edge.id)) continue;
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) continue;
    const routeObstacles = [...edgeRectById.entries()]
      .filter(([id]) => id !== from.id && id !== to.id)
      .map(([, rect]) => rect);
    const lane = nextEdgeLane(edgeLanes, edge.from, edge.to);
    const runtime = createEdgeRuntime(
      svg,
      from,
      to,
      edge.kind,
      edge.label,
      theme,
      sceneId,
      routeObstacles,
      [...edgeRects, ...edgeLabels],
      bounds,
      lane,
    );
    if (runtime.labelRect) edgeLabels.push(runtime.labelRect);
    edgeRuntimes.set(edge.id, runtime);
  }

  // Title reveal at start
  anims.push(
    titleEl.animate(
      [{ opacity: 0, transform: "translateY(-6px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 420, delay: 0, fill: "forwards", easing: "ease-out" },
    ),
  );

  for (const cue of cues) {
    const startMs = cue.start * 1000;
    const durMs = cue.duration * 1000;

    if (cue.kind === "show") {
      cue.targets.forEach((id, idx) => {
        const el = nodeEls.get(id);
        const delay = startMs + (typeof cue.params.stagger === "number" ? cue.params.stagger * 1000 * idx : 0);
        if (el) {
          anims.push(
            el.animate(
              [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }],
              { duration: durMs, delay, fill: "forwards", easing: "ease-out" },
            ),
          );
          return;
        }
        const runtime = edgeRuntimes.get(id);
        if (runtime) anims.push(runtime.group.animate([{ opacity: 0 }, { opacity: 1 }], { duration: durMs, delay, fill: "forwards", easing: "ease-out" }));
      });
      continue;
    }

    if (cue.kind === "hide") {
      for (const id of cue.targets) {
        const el = nodeEls.get(id);
        if (el) {
          anims.push(el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: durMs, delay: startMs, fill: "forwards" }));
          continue;
        }
        const runtime = edgeRuntimes.get(id);
        if (runtime) anims.push(runtime.group.animate([{ opacity: 1 }, { opacity: 0 }], { duration: durMs, delay: startMs, fill: "forwards" }));
      }
      continue;
    }

    if (cue.kind === "glow") {
      const strength = typeof cue.params.strength === "number" ? cue.params.strength : 1;
      const peak = 1 + 0.12 * strength;
      for (const id of cue.targets) {
        const el = nodeEls.get(id);
        if (el) {
          if (cue.params.color) el.style.setProperty("--md-glow-color", String(cue.params.color));
          const glowColor = translucentColor(String(cue.params.color ?? "var(--md-accent)"));
          anims.push(
            el.animate(
              [
                { filter: "brightness(1)" },
                { filter: `drop-shadow(0 0 ${Math.max(4, 4 + strength * 5)}px ${glowColor}) brightness(${peak})` },
                { filter: "brightness(1)" },
              ],
              { duration: durMs, delay: startMs, fill: "none", easing: "ease-in-out" },
            ),
          );
          continue;
        }
        const runtime = edgeRuntimes.get(id);
        if (runtime) anims.push(animateEdgeEmphasis(runtime, startMs, durMs, strength, typeof cue.params.color === "string" ? cue.params.color : undefined));
      }
      continue;
    }

    if (cue.kind === "focus") {
      const zoom = typeof cue.params.zoom === "number" && cue.params.zoom > 0 ? cue.params.zoom : 1.03;
      for (const id of cue.targets) {
        const el = nodeEls.get(id);
        if (el) {
          anims.push(
            el.animate(
              [
                { transform: "scale(1)", filter: "none" },
                { transform: `scale(${zoom})`, filter: "drop-shadow(0 0 7px var(--md-accent))" },
                { transform: "scale(1)", filter: "none" },
              ],
              { duration: durMs, delay: startMs, fill: "none", easing: "ease-in-out" },
            ),
          );
          continue;
        }
        const runtime = edgeRuntimes.get(id);
        if (runtime) anims.push(animateEdgeEmphasis(runtime, startMs, durMs, zoom, undefined));
      }
      continue;
    }

    if (cue.kind === "frame") {
      const frameTargets = cue.targets.flatMap((id) => {
        const edge = edgeById.get(id);
        return edge ? [edge.from, edge.to] : [id];
      });
      const nextTransform = computeFrameTransform(
        frameTargets,
        nodes,
        bounds,
        typeof cue.params.zoom === "number" ? cue.params.zoom : DEFAULT_FRAME_ZOOM,
      );
      if (!nextTransform) continue;
      anims.push(
        scene.animate(
          [{ transform: cameraTransform }, { transform: nextTransform }],
          { duration: durMs, delay: startMs, fill: "forwards", easing: "ease-in-out" },
        ),
      );
      cameraTransform = nextTransform;
      continue;
    }

    if (cue.kind === "flow" && cue.segments?.[0] && diagramType !== "sequence") {
      const seg = cue.segments[0];
      const from = nodeById.get(seg.from);
      const to = nodeById.get(seg.to);
      if (!from || !to) continue;
      const routeObstacles: Rect[] = [];
      for (const [id, rect] of rectById) {
        if (id !== seg.from && id !== seg.to) routeObstacles.push(rect);
      }
      const lane = nextEdgeLane(laneByPair, seg.from, seg.to);
      const labelObstacles = [...allNodeRects, ...placedLabels];
      const edgeId = cue.edgeId ?? edges.find((edge) =>
        !edge.structural &&
        edge.from === seg.from &&
        edge.to === seg.to &&
        edge.kind === seg.op &&
        edge.label === seg.label
      )?.id;
      let runtime = edgeId ? edgeRuntimes.get(edgeId) : undefined;
      if (!runtime) {
        runtime = createEdgeRuntime(svg, from, to, seg.op, seg.label, theme, sceneId, routeObstacles, labelObstacles, bounds, lane);
        if (runtime.labelRect) placedLabels.push(runtime.labelRect);
        if (edgeId) edgeRuntimes.set(edgeId, runtime);
      }
      anims.push(...animateEdgeReveal(runtime, startMs, durMs));
    }
  }

  for (const a of anims) a.pause();
  return anims;
}

/** Renders top-level `edge` declarations as static SVG paths (revealed at t=0). */
export function buildStructuralEdgeAnimations(
  edges: RoutedEdge[],
  nodes: PositionedNode[],
  theme: ThemeTokens,
  scene: HTMLElement,
  bounds: { width: number; height: number },
  edgeRuntimes: EdgeRuntimeMap = new Map(),
  sceneId = createEdgeSceneId(),
  diagramType: DiagramType = "architecture",
): Animation[] {
  const structural = edges.filter((e) =>
    e.structural &&
    diagramType !== "sequence" &&
    !(diagramType === "tree" && !e.label)
  );
  if (structural.length === 0) return [];

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const rectById = new Map(nodes.map((n) => [n.id, boxRect(n)]));
  const allNodeRects = [...rectById.values()];
  const placedLabels: Rect[] = [];
  const laneByPair = new Map<string, number>();
  const svg = ensureEdgeLayer(scene);

  for (const edge of structural) {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) continue;
    const routeObstacles: Rect[] = [];
    for (const [id, rect] of rectById) {
      if (id !== edge.from && id !== edge.to) routeObstacles.push(rect);
    }
    const lane = nextEdgeLane(laneByPair, edge.from, edge.to);
    const labelObstacles = [...allNodeRects, ...placedLabels];
    const runtime = createEdgeRuntime(
      svg,
      from,
      to,
      edge.kind,
      edge.label,
      theme,
      sceneId,
      routeObstacles,
      labelObstacles,
      bounds,
      lane,
    );
    if (runtime.labelRect) placedLabels.push(runtime.labelRect);
    setEdgeVisible(runtime, true);
    edgeRuntimes.set(edge.id, runtime);
  }

  return [];
}
