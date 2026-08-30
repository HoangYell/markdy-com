import type { DiagramType, EdgeKind, PositionedNode, RoutedEdge, ThemeTokens, TimedCue } from "@markdy/core";
import { placeFlowLabel, polylineLength, routeOrthogonal, selfLoopPath, toPathD, wrapFlowLabelText } from "./geometry/path.js";
import { boxRect, inflateRect, type Point, type Rect } from "./geometry/rect.js";

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

function circleBoundaryRoute(from: PositionedNode, to: PositionedNode): Point[] {
  const fromCenter = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
  const toCenter = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
  const dx = toCenter.x - fromCenter.x;
  const dy = toCenter.y - fromCenter.y;
  const distance = Math.hypot(dx, dy) || 1;
  const ux = dx / distance;
  const uy = dy / distance;
  const fromRadius = Math.min(from.width, from.height) / 2;
  const toRadius = Math.min(to.width, to.height) / 2;
  return dedupePoints([
    { x: fromCenter.x + ux * fromRadius, y: fromCenter.y + uy * fromRadius },
    { x: toCenter.x - ux * toRadius, y: toCenter.y - uy * toRadius },
  ]);
}

function snapPortToNodeShape(node: PositionedNode, port: Point, neighbor: Point, isSource: boolean): Point {
  if (!node.shape || node.shape === "card" || node.shape === "rounded" || node.shape === "terminal" || node.shape === "container") {
    return port;
  }
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  const hw = node.width / 2;
  const hh = node.height / 2;

  if (node.shape === "diamond") {
    const isVert = Math.abs(port.x - neighbor.x) < 0.01;
    const isHoriz = Math.abs(port.y - neighbor.y) < 0.01;
    if (isVert) {
      const goingDown = isSource ? neighbor.y > port.y : port.y > neighbor.y;
      const boundaryY = goingDown
        ? cy + hh * (1 - Math.min(1, Math.abs(port.x - cx) / hw))
        : cy - hh * (1 - Math.min(1, Math.abs(port.x - cx) / hw));
      return { x: port.x, y: Math.round(boundaryY * 10) / 10 };
    }
    if (isHoriz) {
      const goingRight = isSource ? neighbor.x > port.x : port.x > neighbor.x;
      const boundaryX = goingRight
        ? cx + hw * (1 - Math.min(1, Math.abs(port.y - cy) / hh))
        : cx - hw * (1 - Math.min(1, Math.abs(port.y - cy) / hh));
      return { x: Math.round(boundaryX * 10) / 10, y: port.y };
    }
  }

  if (node.shape === "circle") {
    const r = Math.min(node.width, node.height) / 2;
    const isVert = Math.abs(port.x - neighbor.x) < 0.01;
    const isHoriz = Math.abs(port.y - neighbor.y) < 0.01;
    if (isVert) {
      const goingDown = isSource ? neighbor.y > port.y : port.y > neighbor.y;
      return { x: cx, y: goingDown ? cy + r : cy - r };
    }
    if (isHoriz) {
      const goingRight = isSource ? neighbor.x > port.x : port.x > neighbor.x;
      return { x: goingRight ? cx + r : cx - r, y: cy };
    }
  }

  if (node.shape === "pill") {
    const r = node.height / 2;
    const isVert = Math.abs(port.x - neighbor.x) < 0.01;
    const isHoriz = Math.abs(port.y - neighbor.y) < 0.01;
    if (isHoriz) {
      const goingRight = isSource ? neighbor.x > port.x : port.x > neighbor.x;
      return { x: goingRight ? node.x + node.width : node.x, y: cy };
    }
    if (isVert) {
      const goingDown = isSource ? neighbor.y > port.y : port.y > neighbor.y;
      const clampedX = Math.max(node.x + r, Math.min(node.x + node.width - r, port.x));
      return { x: clampedX, y: goingDown ? node.y + node.height : node.y };
    }
  }

  return port;
}

function snapRouteEndpointsToShapes(points: Point[], from: PositionedNode, to: PositionedNode): Point[] {
  if (points.length < 2) return points;
  const out = [...points];
  out[0] = snapPortToNodeShape(from, out[0], out[1], true);
  out[out.length - 1] = snapPortToNodeShape(to, out[out.length - 1], out[out.length - 2], false);
  return dedupePoints(out);
}

function routeEdgePoints(
  from: PositionedNode,
  to: PositionedNode,
  routeObstacles: Rect[],
  bounds: { width: number; height: number },
  lane: number,
): Point[] {
  if (from.shape === "circle" && to.shape === "circle") return circleBoundaryRoute(from, to);
  const raw = routeOrthogonal(boxRect(from), boxRect(to), routeObstacles, bounds, lane);
  return snapRouteEndpointsToShapes(raw, from, to);
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

export function ensureDefs(svg: SVGSVGElement, theme: ThemeTokens, id: string): void {
  const key = `data-markdy-defs-${id}`;
  let defs = svg.querySelector<SVGDefsElement>(`defs[${key}='1']`);
  if (!defs) {
    defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.setAttribute(key, "1");
    svg.prepend(defs);
  } else {
    defs.replaceChildren();
  }

  for (const [kind, color] of Object.entries(theme.edges) as [EdgeKind, string][]) {
    const arrow = document.createElementNS("http://www.w3.org/2000/svg", "marker");
    arrow.setAttribute("id", `${id}-arrow-${kind}`);
    arrow.setAttribute("viewBox", "0 0 12 12");
    arrow.setAttribute("refX", "9.5");
    arrow.setAttribute("refY", "6");
    arrow.setAttribute("markerWidth", "8");
    arrow.setAttribute("markerHeight", "8");
    arrow.setAttribute("orient", "auto-start-reverse");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    if (kind === "response") {
      path.setAttribute("d", "M 2.5 2.5 L 9.5 6 L 2.5 9.5");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", color);
      path.setAttribute("stroke-width", "1.6");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
    } else if (kind === "event") {
      path.setAttribute("d", "M 6 2.5 A 3.5 3.5 0 1 1 6 9.5 A 3.5 3.5 0 1 1 6 2.5");
      path.setAttribute("fill", color);
    } else {
      path.setAttribute("d", "M 2 2.5 L 10 6 L 2 9.5 L 4 6 Z");
      path.setAttribute("fill", color);
    }
    arrow.appendChild(path);
    defs.appendChild(arrow);
  }

  const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
  filter.setAttribute("id", `${id}-sketchy`);
  filter.setAttribute("x", "-4%");
  filter.setAttribute("y", "-4%");
  filter.setAttribute("width", "108%");
  filter.setAttribute("height", "108%");
  const turb = document.createElementNS("http://www.w3.org/2000/svg", "feTurbulence");
  turb.setAttribute("type", "fractalNoise");
  turb.setAttribute("baseFrequency", "0.02");
  turb.setAttribute("numOctaves", "2");
  turb.setAttribute("seed", "4");
  turb.setAttribute("result", "noise");
  const disp = document.createElementNS("http://www.w3.org/2000/svg", "feDisplacementMap");
  disp.setAttribute("in", "SourceGraphic");
  disp.setAttribute("in2", "noise");
  disp.setAttribute("scale", "1.8");
  filter.appendChild(turb);
  filter.appendChild(disp);
  defs.appendChild(filter);
}

export function updateEdgeLayerTheme(
  svg: SVGSVGElement,
  edgeRuntimeMap: EdgeRuntimeMap,
  theme: ThemeTokens,
  sceneId: string,
): void {
  ensureDefs(svg, theme, sceneId);
  const isDark = isDarkTheme(theme);
  for (const runtime of edgeRuntimeMap.values()) {
    const color = theme.edges[runtime.kind];
    runtime.color = color;
    runtime.path.setAttribute("stroke", color);
    if (runtime.kind !== "dependency") {
      runtime.path.style.filter = `drop-shadow(0 0 4px ${translucentColor(color, "44")})`;
    }
    runtime.dot.setAttribute("fill", color);
    runtime.dot.style.filter = `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color}88)`;
    if (runtime.labelPlate) {
      runtime.labelPlate.setAttribute("fill", theme.canvas ?? theme.surface ?? "#ffffff");
      runtime.labelPlate.setAttribute("stroke", translucentColor(color, "28"));
    }
    if (runtime.label) {
      runtime.label.setAttribute("fill", computeEdgeLabelColor(color, isDark));
    }
  }
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

function isDarkTheme(theme: ThemeTokens): boolean {
  if (theme.name === "paper" || theme.name === "editorial" || theme.name === "sketchy") {
    return false;
  }
  const canvas = (theme.canvas || theme.surface || "").trim();
  if (canvas.startsWith("#")) {
    const hex = canvas.slice(1);
    const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.slice(0, 2), 16) || 0;
    const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.slice(2, 4), 16) || 0;
    const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.slice(4, 6), 16) || 0;
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  }
  return true;
}

function computeEdgeLabelColor(edgeColor: string, isDark: boolean): string {
  if (isDark) {
    return `color-mix(in srgb, ${edgeColor} 65%, #f8fafc)`;
  }
  return `color-mix(in srgb, ${edgeColor} 75%, #090d16)`;
}

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
  existingPaths: Point[][] = [],
): EdgeRuntime {
  ensureDefs(svg, theme, sceneId);
  const color = theme.edges[kind];
  const style = EDGE_STYLES[kind];
  const isSelfLoop = from.id === to.id;
  const points = isSelfLoop
    ? dedupePoints(selfLoopPath(from, bounds))
    : dedupePoints(routeEdgePoints(from, to, routeObstacles, bounds, lane));
  const d = toPathD(points, 14, existingPaths);
  const len = polylineLength(points);

  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("data-edge-kind", kind);
  group.setAttribute("class", `markdy-edge markdy-edge--${kind}`);
  group.style.opacity = "0";

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", kind === "dependency" ? "1.5" : "2");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("class", `markdy-edge-path markdy-edge-path--${kind}`);
  if (style.dash) path.setAttribute("stroke-dasharray", style.dash);
  if (style.marker !== "none") {
    path.setAttribute("marker-end", `url(#${sceneId}-arrow-${kind})`);
  }
  if (kind !== "dependency") {
    path.style.filter = `drop-shadow(0 0 4px ${translucentColor(color, "44")})`;
  }

  const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  dot.setAttribute("r", "4");
  dot.setAttribute("fill", color);
  dot.setAttribute("class", "markdy-edge-dot");
  dot.style.opacity = "0";
  dot.style.filter = `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color}88)`;

  group.append(path, dot);

  let labelEl: SVGTextElement | undefined;
  let labelRect: Rect | undefined;
  if (label) {
    const isDark = isDarkTheme(theme);
    const labelColor = computeEdgeLabelColor(color, isDark);

    // Calculate available segment width along the route
    let longestSegLen = 0;
    for (let i = 0; i < points.length - 1; i++) {
      longestSegLen = Math.max(longestSegLen, Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y));
    }
    const maxAvailW = Math.max(48, longestSegLen - 24);
    const lines = wrapFlowLabelText(label, maxAvailW);
    const maxChars = Math.max(...lines.map((l) => l.length));
    const textWidth = Math.max(36, maxChars * 6.6 + 8);
    const lineHeight = 13;
    const boxHeight = lines.length === 1 ? 18 : lines.length * lineHeight + 6;

    const placement = placeFlowLabel(points, textWidth, labelObstacles, bounds, boxHeight);
    labelRect = placement.rect;
    const plate = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const padX = 6;
    const halfW = textWidth / 2;
    plate.setAttribute("class", "markdy-edge-plate");
    plate.setAttribute("x", String(placement.x - halfW - padX));
    plate.setAttribute("y", String(placement.y - boxHeight / 2));
    plate.setAttribute("width", String(textWidth + padX * 2));
    plate.setAttribute("height", String(boxHeight));
    plate.setAttribute("rx", "4");
    plate.setAttribute("ry", "4");
    plate.setAttribute("fill", theme.canvas ?? theme.surface ?? "#ffffff");
    plate.setAttribute("fill-opacity", "0.85");
    plate.setAttribute("stroke", translucentColor(color, "28"));
    plate.setAttribute("stroke-width", "0.85");
    plate.style.opacity = "0";
    plate.style.filter = "none";
    group.appendChild(plate);

    const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
    labelEl = textEl;
    textEl.setAttribute("class", "markdy-edge-label");
    textEl.setAttribute("x", String(placement.x));
    textEl.setAttribute("text-anchor", "middle");
    textEl.setAttribute("font-size", "10.5");
    textEl.setAttribute("font-weight", "500");
    textEl.setAttribute("letter-spacing", "0.02em");
    textEl.setAttribute("font-family", "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace");
    textEl.setAttribute("fill", labelColor);

    if (lines.length === 1) {
      textEl.setAttribute("y", String(placement.y + 0.5));
      textEl.setAttribute("dominant-baseline", "middle");
      textEl.textContent = lines[0];
    } else {
      const startY = placement.y - ((lines.length - 1) * lineHeight) / 2 + 3.5;
      lines.forEach((lineText, idx) => {
        const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
        tspan.setAttribute("x", String(placement.x));
        tspan.setAttribute("y", String(startY + idx * lineHeight));
        tspan.setAttribute("text-anchor", "middle");
        tspan.textContent = idx < lines.length - 1 ? `${lineText} ` : lineText;
        textEl.appendChild(tspan);
      });
    }

    textEl.style.opacity = "0";
    group.appendChild(textEl);
    (textEl as unknown as { __plate?: SVGRectElement }).__plate = plate;
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
  if (visible) {
    runtime.path.classList.add("markdy-edge-path--flowing");
  } else {
    runtime.path.classList.remove("markdy-edge-path--flowing");
  }
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

function nextEdgeLane(
  lanes: Map<string, number>,
  from: PositionedNode | string,
  to: PositionedNode | string,
): number {
  const fromId = typeof from === "string" ? from : from.id;
  const toId = typeof to === "string" ? to : to.id;
  const pair = [fromId, toId].sort().join("|");
  const keys = [`pair:${pair}`, `out:${fromId}`, `in:${toId}`];

  if (typeof from !== "string" && typeof to !== "string") {
    const colFrom = Math.round(from.x / 80);
    const colTo = Math.round(to.x / 80);
    const corridorKey = colFrom !== colTo
      ? `corridor-x:${Math.min(colFrom, colTo)}-${Math.max(colFrom, colTo)}`
      : `corridor-y:${Math.round(from.y / 60)}-${Math.round(to.y / 60)}`;
    keys.push(corridorKey);
  }

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

  const drawMs = Math.min(260, durMs * 0.65);
  anims.push(
    group.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: 140, delay: startMs, fill: "forwards", easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
    ),
  );
  if (runtime.drawReveal) {
    anims.push(
      path.animate(
        [{ strokeDashoffset: pathLen }, { strokeDashoffset: 0 }],
        { duration: drawMs, delay: startMs, fill: "forwards", easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
      ),
    );
  }

  if (label) {
    anims.push(
      label.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: 200, delay: startMs + 90, fill: "forwards", easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
      ),
    );
    if (runtime.labelPlate) {
      anims.push(
        runtime.labelPlate.animate(
          [{ opacity: 0 }, { opacity: 1 }],
          { duration: 200, delay: startMs + 90, fill: "forwards", easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
        ),
      );
    }
  }

  if (points.length >= 2) {
    anims.push(
      dot.animate(dotTravelKeyframes(points), {
        duration: Math.max(drawMs, durMs),
        delay: startMs,
        fill: "forwards",
        easing: "cubic-bezier(0.2, 0.85, 0.4, 1)",
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
): Animation[] {
  const anims: Animation[] = [];
  const baseFilter = runtime.kind === "dependency"
    ? "none"
    : `drop-shadow(0 0 3px ${translucentColor(runtime.color, "33")})`;
  const glowColor = color ?? runtime.color;
  const radius = Math.max(4, Math.min(16, 5 + strength * 4));
  const peakFilter = `drop-shadow(0 0 ${radius}px ${translucentColor(glowColor)}) brightness(${1 + Math.min(strength, 2) * 0.08})`;

  anims.push(
    runtime.path.animate(
      [{ filter: baseFilter }, { filter: peakFilter }, { filter: baseFilter }],
      { duration: durMs, delay: startMs, fill: "none", easing: "ease-in-out" },
    ),
  );

  if (runtime.label) {
    anims.push(
      runtime.label.animate(
        [
          { filter: "none", opacity: 1 },
          { filter: `drop-shadow(0 0 4px ${translucentColor(glowColor, "88")}) brightness(1.25)`, opacity: 1 },
          { filter: "none", opacity: 1 },
        ],
        { duration: durMs, delay: startMs, fill: "none", easing: "ease-in-out" },
      ),
    );
  }

  if (runtime.labelPlate) {
    anims.push(
      runtime.labelPlate.animate(
        [
          { stroke: translucentColor(runtime.color, "22") },
          { stroke: translucentColor(glowColor, "88") },
          { stroke: translucentColor(runtime.color, "22") },
        ],
        { duration: durMs, delay: startMs, fill: "none", easing: "ease-in-out" },
      ),
    );
  }

  return anims;
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
  const placedPaths: Point[][] = [];

  for (const edge of diagramType === "sequence" ? [] : edges) {
    if (edge.structural || edgeRuntimes.has(edge.id)) continue;
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) continue;
    const routeObstacles = [...allNodeRects, ...edgeLabels.map((l) => inflateRect(l, 4))];
    const lane = nextEdgeLane(edgeLanes, from, to);
    const runtime = createEdgeRuntime(
      svg,
      from,
      to,
      edge.kind,
      edge.label,
      theme,
      sceneId,
      routeObstacles,
      [...allNodeRects, ...edgeLabels],
      bounds,
      lane,
      placedPaths,
    );
    placedPaths.push(runtime.points);
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
              [{ opacity: 0, transform: "translateY(10px) scale(0.98)" }, { opacity: 1, transform: "translateY(0) scale(1)" }],
              { duration: durMs, delay, fill: "forwards", easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
            ),
          );
          return;
        }
        const runtime = edgeRuntimes.get(id);
        if (runtime) anims.push(runtime.group.animate([{ opacity: 0 }, { opacity: 1 }], { duration: durMs, delay, fill: "forwards", easing: "cubic-bezier(0.16, 1, 0.3, 1)" }));
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
              { duration: durMs, delay: startMs, fill: "none", easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
            ),
          );
          continue;
        }
        const runtime = edgeRuntimes.get(id);
        if (runtime) anims.push(...animateEdgeEmphasis(runtime, startMs, durMs, strength, typeof cue.params.color === "string" ? cue.params.color : undefined));
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
              { duration: durMs, delay: startMs, fill: "none", easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
            ),
          );
          continue;
        }
        const runtime = edgeRuntimes.get(id);
        if (runtime) anims.push(...animateEdgeEmphasis(runtime, startMs, durMs, zoom, undefined));
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
          { duration: durMs, delay: startMs, fill: "forwards", easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
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
      const routeObstacles = [...allNodeRects, ...placedLabels.map((l) => inflateRect(l, 4))];
      const lane = nextEdgeLane(laneByPair, from, to);
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
        runtime = createEdgeRuntime(
          svg,
          from,
          to,
          seg.op,
          seg.label,
          theme,
          sceneId,
          routeObstacles,
          labelObstacles,
          bounds,
          lane,
          placedPaths,
        );
        placedPaths.push(runtime.points);
        if (runtime.labelRect) placedLabels.push(runtime.labelRect);
        if (edgeId) edgeRuntimes.set(edgeId, runtime);
      }
      anims.push(...animateEdgeReveal(runtime, startMs, durMs));

      // Destination arrival micro-pulse on target node
      const toEl = nodeEls.get(seg.to);
      if (toEl) {
        anims.push(
          toEl.animate(
            [
              { transform: "scale(1)", filter: "none" },
              { transform: "scale(1.02)", filter: `drop-shadow(0 0 8px ${translucentColor(runtime.color, "66")})` },
              { transform: "scale(1)", filter: "none" },
            ],
            { duration: 280, delay: startMs + durMs * 0.75, fill: "none", easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
          ),
        );
      }
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
  const placedPaths: Point[][] = [];
  const laneByPair = new Map<string, number>();
  const svg = ensureEdgeLayer(scene);

  for (const edge of structural) {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) continue;
    const routeObstacles = [...allNodeRects, ...placedLabels.map((l) => inflateRect(l, 4))];
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
      placedPaths,
    );
    placedPaths.push(runtime.points);
    if (runtime.labelRect) placedLabels.push(runtime.labelRect);
    setEdgeVisible(runtime, true);
    edgeRuntimes.set(edge.id, runtime);
  }

  return [];
}
