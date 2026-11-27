import type { Box, DiagramType, EdgeKind, GroupBoundary, PositionedNode, RoutedEdge, ThemeTokens, TimedCue } from "@markdy/core";
import { allocatePortLanes, selectOptimalPorts } from "@markdy/core";
import {
  groupHeaderObstaclesForEdge,
  placeFlowLabel,
  polylineLength,
  routeOrthogonal,
  routeTreeEdgePoints,
  selfLoopPath,
  toPathD,
  wrapFlowLabelText,
  type OrthogonalPortSlots,
} from "./geometry/path.js";
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

  if (distance < fromRadius + toRadius) {
    // Overlapping circles (e.g. Venn diagrams): route forward across the intersection lens
    const midX = (fromCenter.x + toCenter.x) / 2;
    const midY = (fromCenter.y + toCenter.y) / 2;
    const overlap = fromRadius + toRadius - distance;
    const halfSpan = Math.max(24, Math.min(64, overlap * 0.5));
    return dedupePoints([
      { x: midX - ux * halfSpan, y: midY - uy * halfSpan },
      { x: midX + ux * halfSpan, y: midY + uy * halfSpan },
    ]);
  }

  return dedupePoints([
    { x: fromCenter.x + ux * fromRadius, y: fromCenter.y + uy * fromRadius },
    { x: toCenter.x - ux * toRadius, y: toCenter.y - uy * toRadius },
  ]);
}

function snapPortToNodeShape(node: PositionedNode, port: Point, neighbor: Point, _isSource: boolean): Point {
  if (!node.shape || node.shape === "card" || node.shape === "rounded" || node.shape === "terminal" || node.shape === "container") {
    return port;
  }
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  const hw = node.width / 2;
  const hh = node.height / 2;

  const facingRight = neighbor.x > port.x;
  const facingDown = neighbor.y > port.y;
  const isHoriz = Math.abs(port.y - neighbor.y) <= Math.abs(port.x - neighbor.x);

  if (node.shape === "diamond") {
    if (isHoriz) {
      const boundaryX = facingRight
        ? cx + hw * (1 - Math.min(1, Math.abs(port.y - cy) / hh))
        : cx - hw * (1 - Math.min(1, Math.abs(port.y - cy) / hh));
      return { x: Math.round(boundaryX * 10) / 10, y: port.y };
    } else {
      const boundaryY = facingDown
        ? cy + hh * (1 - Math.min(1, Math.abs(port.x - cx) / hw))
        : cy - hh * (1 - Math.min(1, Math.abs(port.x - cx) / hw));
      return { x: port.x, y: Math.round(boundaryY * 10) / 10 };
    }
  }

  if (node.shape === "circle") {
    const r = Math.min(node.width, node.height) / 2;
    if (isHoriz) {
      const dy = Math.abs(port.y - cy);
      const dx = dy <= r ? Math.sqrt(Math.max(0, r * r - dy * dy)) : 0;
      return { x: Math.round((facingRight ? cx + dx : cx - dx) * 10) / 10, y: port.y };
    } else {
      const dx = Math.abs(port.x - cx);
      const dy = dx <= r ? Math.sqrt(Math.max(0, r * r - dx * dx)) : 0;
      return { x: port.x, y: Math.round((facingDown ? cy + dy : cy - dy) * 10) / 10 };
    }
  }

  if (node.shape === "pill") {
    const r = node.height / 2;
    if (isHoriz) {
      const dy = Math.abs(port.y - cy);
      const dx = dy <= r ? Math.sqrt(Math.max(0, r * r - dy * dy)) : 0;
      const boundaryX = facingRight
        ? (node.x + node.width - r) + dx
        : (node.x + r) - dx;
      return { x: Math.round(boundaryX * 10) / 10, y: port.y };
    } else {
      const clampedX = Math.max(node.x + r, Math.min(node.x + node.width - r, port.x));
      return { x: clampedX, y: facingDown ? node.y + node.height : node.y };
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
  diagramType: DiagramType = "architecture",
  isVerticalTree = false,
  portSlots?: OrthogonalPortSlots,
  groupBoundaries: GroupBoundary[] = [],
): Point[] {
  if (from.shape === "circle" && to.shape === "circle") return circleBoundaryRoute(from, to);
  if (diagramType === "tree") {
    const treeRoute = routeTreeEdgePoints(from, to, lane, isVerticalTree, bounds);
    if (treeRoute) return snapRouteEndpointsToShapes(treeRoute, from, to);
  }
  const protectedHeaders = groupHeaderObstaclesForEdge(groupBoundaries, from.id, to.id);
  const raw = routeOrthogonal(boxRect(from), boxRect(to), routeObstacles, bounds, lane, portSlots, protectedHeaders);
  return snapRouteEndpointsToShapes(raw, from, to);
}

/** Allocates geometrically ordered source/target port slots for all edges sharing a node face. */
export function computePortSlotMap<T extends { from: string; to: string; id?: string }>(
  edges: T[],
  nodes: PositionedNode[],
  diagramType: DiagramType | string = "architecture",
): Map<T, OrthogonalPortSlots> {
  if (diagramType === "sequence" || diagramType === "tree" || edges.length === 0) {
    return new Map();
  }
  const boxes: Record<string, Box> = {};
  const nodeById = new Map<string, PositionedNode>();
  for (const n of nodes) {
    boxes[n.id] = { x: n.x, y: n.y, width: n.width, height: n.height };
    nodeById.set(n.id, n);
  }
  // Upward/backward multi-tier loopbacks route via outer side bypass corridors and should not displace forward spine ports
  const primaryEdges = edges.filter((edge) => {
    const s = nodeById.get(edge.from);
    const t = nodeById.get(edge.to);
    if (!s || !t || edge.from === edge.to) return false;
    const isUpwardMultiTier = s.y - (t.y + t.height) > 40 && Math.abs(t.x - s.x) <= (s.width + t.width) * 1.1;
    const isBackwardMultiTier = s.x - (t.x + t.width) > 40 && Math.abs(t.y - s.y) <= (s.height + t.height) * 1.1;
    if (!isUpwardMultiTier && !isBackwardMultiTier) return true;
    const hasBlocker = nodes.some((other) => {
      if (other.id === s.id || other.id === t.id) return false;
      if (isUpwardMultiTier) {
        return other.y + other.height > t.y + t.height && other.y < s.y &&
          other.x + other.width > Math.min(s.x, t.x) && other.x < Math.max(s.x + s.width, t.x + t.width);
      }
      return other.x + other.width > t.x + t.width && other.x < s.x &&
        other.y + other.height > Math.min(s.y, t.y) && other.y < Math.max(s.y + s.height, t.y + t.height);
    });
    return !hasBlocker;
  });

  const map = allocatePortLanes(primaryEdges, boxes);
  for (const edge of edges) {
    if (edge.from !== edge.to && !map.has(edge)) {
      map.set(edge, {});
    }
  }
  return map;
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

function styleEdgePlate(
  plate: SVGRectElement,
  shadow: SVGRectElement | undefined,
  color: string,
  theme: ThemeTokens,
  isDark: boolean,
): void {
  // Never set CSS `filter` on SVG <rect>; Chromium mis-composites sibling <tspan> labels during WAAPI opacity fades.
  plate.style.filter = "";
  const px = parseFloat(plate.getAttribute("x") ?? "0");
  const py = parseFloat(plate.getAttribute("y") ?? "0");
  if (theme.name === "doodle") {
    plate.setAttribute("rx", "7");
    plate.setAttribute("ry", "7");
    plate.setAttribute("fill", "#ffffff");
    plate.setAttribute("fill-opacity", "1");
    plate.setAttribute("stroke", "#18181b");
    plate.setAttribute("stroke-width", "1.5");
    if (shadow) {
      shadow.style.display = "";
      shadow.setAttribute("x", String(px + 2));
      shadow.setAttribute("y", String(py + 2));
      shadow.setAttribute("rx", "7");
      shadow.setAttribute("ry", "7");
      shadow.setAttribute("fill", "#18181b");
      shadow.setAttribute("fill-opacity", "1");
    }
  } else if (theme.name === "ink") {
    plate.setAttribute("rx", "4");
    plate.setAttribute("ry", "4");
    plate.setAttribute("fill", "#ffffff");
    plate.setAttribute("fill-opacity", "0.98");
    plate.setAttribute("stroke", "#1d4ed8");
    plate.setAttribute("stroke-width", "1");
    if (shadow) {
      shadow.style.display = "";
      shadow.setAttribute("x", String(px + 1.5));
      shadow.setAttribute("y", String(py + 1.5));
      shadow.setAttribute("rx", "4");
      shadow.setAttribute("ry", "4");
      shadow.setAttribute("fill", "rgba(29, 78, 216, 0.14)");
      shadow.setAttribute("fill-opacity", "1");
    }
  } else {
    plate.setAttribute("rx", "5");
    plate.setAttribute("ry", "5");
    plate.setAttribute("fill", theme.canvas ?? theme.surface ?? "#ffffff");
    plate.setAttribute("fill-opacity", isDark ? "0.88" : "0.94");
    plate.setAttribute("stroke", translucentColor(color, isDark ? "55" : "33"));
    plate.setAttribute("stroke-width", "1");
    if (shadow) shadow.style.display = "none";
  }
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
    runtime.path.removeAttribute("filter");
    if (runtime.kind !== "dependency") {
      runtime.path.style.filter = `drop-shadow(0 0 4px ${translucentColor(color, "44")})`;
    } else {
      runtime.path.style.filter = "";
    }
    runtime.dot.setAttribute("fill", color);
    runtime.dot.style.filter = `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color}88)`;
    if (runtime.labelPlate) {
      styleEdgePlate(runtime.labelPlate, runtime.labelShadow, color, theme, isDark);
    }
    if (runtime.label) {
      const nextFill = computeEdgeLabelColor(color, isDark);
      const nextHalo = theme.canvas ?? theme.surface ?? "#ffffff";
      runtime.label.setAttribute("fill", nextFill);
      runtime.label.setAttribute("stroke", nextHalo);
      runtime.label.querySelectorAll(".markdy-edge-label-line").forEach((lineEl) => {
        lineEl.setAttribute("fill", nextFill);
        lineEl.setAttribute("stroke", nextHalo);
      });
    }
  }
}

export interface EdgeRuntime {
  group: SVGGElement;
  path: SVGPathElement;
  labelGroup?: SVGGElement;
  label?: SVGElement;
  labelPlate?: SVGRectElement;
  labelShadow?: SVGRectElement;
  dot: SVGCircleElement;
  pathLen: number;
  points: Point[];
  labelRect?: Rect;
  kind: EdgeKind;
  color: string;
  drawReveal: boolean;
}

export type EdgeRuntimeMap = Map<string, EdgeRuntime>;

function parseHexRgb(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/i.test(clean)) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  if (/^[0-9a-f]{6}$/i.test(clean) || /^[0-9a-f]{8}$/i.test(clean)) {
    return [
      parseInt(clean.slice(0, 2), 16),
      parseInt(clean.slice(2, 4), 16),
      parseInt(clean.slice(4, 6), 16),
    ];
  }
  return null;
}

function mixHexColor(primaryHex: string, primaryRatio: number, targetRgb: [number, number, number]): string | null {
  const src = parseHexRgb(primaryHex);
  if (!src) return null;
  const inv = 1 - primaryRatio;
  const r = Math.round(src[0] * primaryRatio + targetRgb[0] * inv);
  const g = Math.round(src[1] * primaryRatio + targetRgb[1] * inv);
  const b = Math.round(src[2] * primaryRatio + targetRgb[2] * inv);
  return `#${[r, g, b].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, "0")).join("")}`;
}

function isDarkTheme(theme: ThemeTokens): boolean {
  if (theme.name === "paper" || theme.name === "editorial" || theme.name === "sketchy" || theme.name === "ink" || theme.name === "doodle") {
    return false;
  }
  const rgb = parseHexRgb(theme.canvas || theme.surface || "");
  if (rgb) {
    return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255 < 0.5;
  }
  return true;
}

function computeEdgeLabelColor(edgeColor: string, isDark: boolean): string {
  // SVG presentation attribute `fill="color-mix(...)"` fails to paint inside Chromium WAAPI groups; resolve concrete hex.
  const blended = isDark
    ? mixHexColor(edgeColor, 0.65, [0xf8, 0xfa, 0xfc])
    : mixHexColor(edgeColor, 0.75, [0x09, 0x0d, 0x16]);
  if (blended) return blended;
  return isDark
    ? `color-mix(in srgb, ${edgeColor} 65%, #f8fafc)`
    : `color-mix(in srgb, ${edgeColor} 75%, #090d16)`;
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
  diagramType: DiagramType = "architecture",
  isVerticalTree = false,
  portSlots?: OrthogonalPortSlots,
  groupBoundaries: GroupBoundary[] = [],
): EdgeRuntime {
  ensureDefs(svg, theme, sceneId);
  const color = theme.edges[kind] ?? theme.edges.request ?? theme.accent;
  const style = EDGE_STYLES[kind] ?? EDGE_STYLES.request;
  const isSelfLoop = from.id === to.id;
  const points = isSelfLoop
    ? dedupePoints(selfLoopPath(from, bounds))
    : dedupePoints(routeEdgePoints(from, to, routeObstacles, bounds, lane, diagramType, isVerticalTree, portSlots, groupBoundaries));
  const d = toPathD(points, 14, existingPaths);
  const len = polylineLength(points);

  const edgeId = `${from.id}_${to.id}`;
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("data-edge-id", edgeId);
  group.setAttribute("data-edge", edgeId);
  group.setAttribute("id", `edge-${edgeId}`);
  group.setAttribute("data-edge-kind", kind);
  group.setAttribute("class", `markdy-edge markdy-edge--${kind}`);

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  path.setAttribute("data-edge-path", edgeId);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", kind === "dependency" ? "1.5" : "2");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("class", `markdy-edge-path markdy-edge-path--${kind}`);
  path.style.opacity = "0";
  if (style.dash) path.setAttribute("stroke-dasharray", style.dash);
  if (style.marker !== "none") {
    path.setAttribute("marker-end", `url(#${sceneId}-arrow-${kind})`);
  }
  if (kind !== "dependency") {
    path.style.filter = `drop-shadow(0 0 4px ${translucentColor(color, "44")})`;
  }

  const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  dot.setAttribute("r", "4.5");
  dot.setAttribute("fill", color);
  dot.setAttribute("class", "markdy-edge-dot");
  dot.style.opacity = "0";
  dot.style.filter = `drop-shadow(0 0 4px ${color}) drop-shadow(0 0 10px ${color}bb) drop-shadow(0 0 18px ${color}66)`;

  group.append(path, dot);

  let labelGroup: SVGGElement | undefined;
  let labelEl: SVGElement | undefined;
  let labelRect: Rect | undefined;
  let labelShadow: SVGRectElement | undefined;
  if (label) {
    const isDark = isDarkTheme(theme);
    const labelColor = computeEdgeLabelColor(color, isDark);

    // Calculate available segment width along the route
    let longestSegLen = 0;
    for (let i = 0; i < points.length - 1; i++) {
      longestSegLen = Math.max(longestSegLen, Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y));
    }
    const isTreeVertical = diagramType === "tree" && isVerticalTree;
    const maxAvailW = isTreeVertical
      ? Math.max(48, Math.min(68, longestSegLen - 12))
      : Math.max(90, longestSegLen - 24);
    const lines = wrapFlowLabelText(label, maxAvailW);
    const maxChars = Math.max(...lines.map((l) => l.length));
    const textWidth = Math.max(36, maxChars * 6.6 + 8);
    const lineHeight = 13;
    const boxHeight = lines.length === 1 ? 18 : lines.length * lineHeight + 6;

    const padX = 6;
    const halfW = textWidth / 2;
    const plateW = textWidth + padX * 2;
    const placement = placeFlowLabel(points, plateW, labelObstacles, bounds, boxHeight + 4);
    labelRect = placement.rect;
    labelObstacles.push(inflateRect(labelRect, 8));
    labelGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    labelGroup.setAttribute("class", "markdy-edge-label-group");

    const shadow = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    labelShadow = shadow;
    shadow.setAttribute("class", "markdy-edge-plate-shadow");
    shadow.style.opacity = "0";
    const plate = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    plate.style.opacity = "0";
    plate.setAttribute("class", "markdy-edge-plate");
    plate.setAttribute("x", String(placement.x - halfW - padX));
    plate.setAttribute("y", String(placement.y - boxHeight / 2));
    plate.setAttribute("width", String(plateW));
    plate.setAttribute("height", String(boxHeight));
    shadow.setAttribute("width", String(plateW));
    shadow.setAttribute("height", String(boxHeight));
    styleEdgePlate(plate, shadow, color, theme, isDark);
    labelGroup.append(shadow, plate);

    const applyLabelPresentation = (el: SVGElement, cls: string): void => {
      el.setAttribute("class", cls);
      el.setAttribute("text-anchor", "middle");
      el.setAttribute("font-size", "10.5");
      el.setAttribute("font-weight", "500");
      el.setAttribute("letter-spacing", "0.02em");
      el.setAttribute("font-family", "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace");
      el.setAttribute("fill", labelColor);
      // Set paint-order and halo stroke directly on each <text>; Chromium ignores paint-order on parent <g>.
      el.setAttribute("paint-order", "stroke fill");
      el.setAttribute("stroke", theme.canvas ?? theme.surface ?? "#ffffff");
      el.setAttribute("stroke-width", "3.5px");
      el.setAttribute("stroke-linejoin", "round");
    };

    if (lines.length === 1) {
      const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
      applyLabelPresentation(textEl, "markdy-edge-label");
      textEl.setAttribute("x", String(placement.x));
      textEl.setAttribute("y", String(placement.y + 0.5));
      textEl.setAttribute("dominant-baseline", "middle");
      textEl.style.opacity = "0";
      textEl.textContent = lines[0];
      labelEl = textEl;
    } else {
      // Avoid <tspan> inside WAAPI/CSS-scaled SVG: Chromium leaves <tspan> unscaled at scene(1x).
      const multiGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      applyLabelPresentation(multiGroup, "markdy-edge-label");
      const startY = placement.y - ((lines.length - 1) * lineHeight) / 2 + 3.5;
      lines.forEach((lineText, idx) => {
        const lineEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
        applyLabelPresentation(lineEl, "markdy-edge-label-line");
        lineEl.setAttribute("x", String(placement.x));
        lineEl.setAttribute("y", String(startY + idx * lineHeight));
        lineEl.style.opacity = "0";
        lineEl.textContent = idx < lines.length - 1 ? `${lineText} ` : lineText;
        multiGroup.appendChild(lineEl);
      });
      labelEl = multiGroup;
    }

    labelGroup.appendChild(labelEl);
    group.appendChild(labelGroup);
    (labelEl as unknown as { __plate?: SVGRectElement }).__plate = plate;
  }

  svg.appendChild(group);
  return {
    group,
    path,
    labelGroup,
    label: labelEl,
    labelPlate: labelEl ? (labelEl as unknown as { __plate?: SVGRectElement }).__plate : undefined,
    labelShadow,
    dot,
    pathLen: len,
    points,
    labelRect,
    kind,
    color,
    drawReveal: style.dash.length === 0,
  };
}

function groupHeaderLabelObstacles(groupBoundaries: GroupBoundary[]): Rect[] {
  const rects: Rect[] = [];
  for (const gb of groupBoundaries) {
    if (!gb.label) continue;
    const labelW = Math.max(54, gb.label.length * 6.8 + 20);
    rects.push({
      x1: gb.x + 10,
      y1: gb.y + 6,
      x2: gb.x + 14 + labelW + 4,
      y2: gb.y + 32,
    });
  }
  return rects;
}

function edgePillLeaves(runtime: EdgeRuntime): SVGElement[] {
  const leaves: SVGElement[] = [];
  if (runtime.labelShadow) leaves.push(runtime.labelShadow);
  if (runtime.labelPlate) leaves.push(runtime.labelPlate);
  if (runtime.label) {
    if (runtime.label.tagName.toLowerCase() === "text") {
      leaves.push(runtime.label);
    } else {
      leaves.push(...Array.from(runtime.label.querySelectorAll<SVGElement>("text")));
    }
  }
  return leaves;
}

function edgeOpacityLeaves(runtime: EdgeRuntime): SVGElement[] {
  return [runtime.path, ...edgePillLeaves(runtime)];
}

function animateElementsOpacity(
  elements: SVGElement[],
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions,
): Animation[] {
  return elements.map((el) => el.animate(keyframes, options));
}

function setEdgeVisible(runtime: EdgeRuntime, visible: boolean): void {
  const opacity = visible ? "1" : "0";
  runtime.group.style.opacity = "";
  for (const leaf of edgeOpacityLeaves(runtime)) {
    leaf.style.opacity = opacity;
  }
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

export function nextEdgeLane(
  lanes: Map<string, number>,
  from: PositionedNode | string,
  to: PositionedNode | string,
): number {
  const fromId = typeof from === "string" ? from : from.id;
  const toId = typeof to === "string" ? to : to.id;
  const pair = [fromId, toId].sort().join("|");
  const keys = [`pair:${pair}`, `out:${fromId}`, `in:${toId}`];

  if (typeof from !== "string" && typeof to !== "string") {
    const ports = selectOptimalPorts(from, to);
    keys.push(`port:${fromId}:${ports.sourcePort}`, `port:${toId}:${ports.targetPort}`);
  }

  const lane = Math.max(...keys.map((key) => lanes.get(key) ?? 0));
  for (const key of keys) lanes.set(key, lane + 1);
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
  const { path, dot, pathLen, points } = runtime;
  if (runtime.drawReveal) {
    path.style.strokeDasharray = String(pathLen);
    path.style.strokeDashoffset = String(pathLen);
  }

  const drawMs = Math.min(260, durMs * 0.65);
  anims.push(
    ...animateElementsOpacity(
      [path],
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

  const pillLeaves = edgePillLeaves(runtime);
  if (pillLeaves.length > 0) {
    anims.push(
      ...animateElementsOpacity(
        pillLeaves,
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: 200, delay: startMs + 90, fill: "forwards", easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
      ),
    );
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

  if (runtime.labelPlate) {
    const baseStroke = runtime.labelPlate.getAttribute("stroke") ?? translucentColor(runtime.color, "22");
    anims.push(
      runtime.labelPlate.animate(
        [
          { stroke: baseStroke },
          { stroke: translucentColor(glowColor, "cc") },
          { stroke: baseStroke },
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

  const minX = Math.min(...selected.map((node) => node.x));
  const minY = Math.min(...selected.map((node) => node.y));
  const maxX = Math.max(...selected.map((node) => node.x + node.width));
  const maxY = Math.max(...selected.map((node) => node.y + node.height));
  const frameWidth = Math.max(1, maxX - minX + FRAME_PADDING * 2);
  const frameHeight = Math.max(1, maxY - minY + FRAME_PADDING * 2);
  const fitScale = Math.min(bounds.width / frameWidth, bounds.height / frameHeight);

  // Framing every node means "show the whole diagram", so fit all nodes within the canvas.
  const framesEveryNode = selected.length === nodes.length && nodes.every((node) => targets.has(node.id));
  if (framesEveryNode) {
    if (fitScale >= 1 && minX >= 0 && maxX <= bounds.width && minY >= 0 && maxY <= bounds.height) {
      return INITIAL_CAMERA_TRANSFORM;
    }
    const scale = Math.min(1, Math.max(0.4, fitScale));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const tx = Math.round((bounds.width / 2 - centerX * scale) * 10) / 10;
    const ty = Math.round((bounds.height / 2 - centerY * scale) * 10) / 10;
    return `translate(${tx}px, ${ty}px) scale(${Math.round(scale * 1000) / 1000})`;
  }

  const zoom = Number.isFinite(requestedZoom) && requestedZoom > 0 ? requestedZoom : DEFAULT_FRAME_ZOOM;
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
  isVerticalTree?: boolean,
  groupBoundaries: GroupBoundary[] = [],
): Animation[] {
  const isVertical = isVerticalTree ?? (bounds.height > bounds.width);
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
  const portSlotsByEdge = computePortSlotMap(edges, nodes, diagramType);

  for (const edge of diagramType === "sequence" ? [] : edges) {
    if (edge.structural || edgeRuntimes.has(edge.id)) continue;
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) continue;
    const routeObstacles = [...allNodeRects, ...edgeLabels.map((l) => inflateRect(l, 6))];
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
      [...allNodeRects, ...groupHeaderLabelObstacles(groupBoundaries), ...edgeLabels],
      bounds,
      lane,
      placedPaths,
      diagramType,
      isVertical,
      portSlotsByEdge.get(edge),
      groupBoundaries,
    );
    placedPaths.push(runtime.points);
    if (runtime.labelRect) edgeLabels.push(inflateRect(runtime.labelRect, 8));
    edgeRuntimes.set(edge.id, runtime);
  }

  // Title reveal at start
  anims.push(
    titleEl.animate(
      [{ opacity: 0, transform: "translateY(-6px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 420, delay: 0, fill: "forwards", easing: "ease-out" },
    ),
  );

  const shownNodeSet = new Set<string>();
  for (const cue of cues) {
    const startMs = cue.start * 1000;
    const durMs = cue.duration * 1000;

    if (cue.kind === "show") {
      cue.targets.forEach((id, idx) => {
        const el = nodeEls.get(id);
        const delay = startMs + (typeof cue.params.stagger === "number" ? cue.params.stagger * 1000 * idx : 0);
        if (el) {
          if (!shownNodeSet.has(id)) {
            shownNodeSet.add(id);
            anims.push(
              el.animate(
                [{ opacity: 0, transform: "translateY(10px) scale(0.98)" }, { opacity: 1, transform: "translateY(0) scale(1)" }],
                { duration: durMs, delay, fill: "both", easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
              ),
            );
          } else {
            anims.push(
              el.animate(
                [{ transform: "scale(1)" }, { transform: "scale(1.03)" }, { transform: "scale(1)" }],
                { duration: durMs, delay, fill: "none", easing: "ease-in-out" },
              ),
            );
          }
          return;
        }
        const runtime = edgeRuntimes.get(id);
        if (runtime) anims.push(...animateElementsOpacity(edgeOpacityLeaves(runtime), [{ opacity: 0 }, { opacity: 1 }], { duration: durMs, delay, fill: "forwards", easing: "cubic-bezier(0.16, 1, 0.3, 1)" }));
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
        if (runtime) anims.push(...animateElementsOpacity(edgeOpacityLeaves(runtime), [{ opacity: 1 }, { opacity: 0 }], { duration: durMs, delay: startMs, fill: "forwards" }));
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
      const labelObstacles = [...allNodeRects, ...groupHeaderLabelObstacles(groupBoundaries), ...placedLabels];
      const matchedEdge = cue.edgeId ? edgeById.get(cue.edgeId) : edges.find((edge) =>
        !edge.structural &&
        edge.from === seg.from &&
        edge.to === seg.to &&
        edge.kind === seg.op &&
        edge.label === seg.label
      );
      let runtime = matchedEdge ? edgeRuntimes.get(matchedEdge.id) : undefined;
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
          diagramType,
          isVertical,
          matchedEdge ? portSlotsByEdge.get(matchedEdge) : undefined,
          groupBoundaries,
        );
        placedPaths.push(runtime.points);
        if (runtime.labelRect) placedLabels.push(runtime.labelRect);
        if (matchedEdge) edgeRuntimes.set(matchedEdge.id, runtime);
      }
      anims.push(...animateEdgeReveal(runtime, startMs, durMs));
      // Auto-reveal nodes participating in this flow if not explicitly shown yet
      if (!shownNodeSet.has(seg.from)) {
        shownNodeSet.add(seg.from);
        const fromEl = nodeEls.get(seg.from);
        if (fromEl) {
          anims.push(
            fromEl.animate(
              [{ opacity: 0, transform: "translateY(8px) scale(0.98)" }, { opacity: 1, transform: "translateY(0) scale(1)" }],
              { duration: 320, delay: startMs, fill: "both", easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
            ),
          );
        }
      }

      if (!shownNodeSet.has(seg.to)) {
        shownNodeSet.add(seg.to);
        const toEl = nodeEls.get(seg.to);
        if (toEl) {
          // Reveal destination node exactly as the connection reaches it
          const arrivalDelay = startMs + Math.min(240, durMs * 0.65);
          anims.push(
            toEl.animate(
              [{ opacity: 0, transform: "translateY(8px) scale(0.98)" }, { opacity: 1, transform: "translateY(0) scale(1)" }],
              { duration: 300, delay: arrivalDelay, fill: "both", easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
            ),
          );
        }
      }

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

/** Renders top-level `edge` declarations as structural SVG paths, progressively revealed when endpoints enter. */
export function buildStructuralEdgeAnimations(
  edges: RoutedEdge[],
  nodes: PositionedNode[],
  theme: ThemeTokens,
  scene: HTMLElement,
  bounds: { width: number; height: number },
  edgeRuntimes: EdgeRuntimeMap = new Map(),
  sceneId = createEdgeSceneId(),
  diagramType: DiagramType = "architecture",
  cues: TimedCue[] = [],
  isVerticalTree?: boolean,
  groupBoundaries: GroupBoundary[] = [],
): Animation[] {
  const isVertical = isVerticalTree ?? (bounds.height > bounds.width);
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
  const groupHeaderObstacles = groupHeaderLabelObstacles(groupBoundaries);
  const laneByPair = new Map<string, number>();
  const portSlotsByEdge = computePortSlotMap(edges, nodes, diagramType);
  const svg = ensureEdgeLayer(scene);

  const anims: Animation[] = [];
  const nodeRevealTime = new Map<string, number>();

  for (const cue of cues) {
    const cueStartMs = cue.start * 1000;
    const durMs = cue.duration * 1000;
    if (cue.kind === "show") {
      cue.targets.forEach((id, idx) => {
        const stagger = typeof cue.params?.stagger === "number" ? cue.params.stagger * 1000 * idx : 0;
        const reveal = cueStartMs + stagger;
        if (!nodeRevealTime.has(id) || reveal < nodeRevealTime.get(id)!) {
          nodeRevealTime.set(id, reveal);
        }
      });
    } else if (cue.kind === "flow" && cue.segments?.[0] && diagramType !== "sequence") {
      const seg = cue.segments[0];
      if (!nodeRevealTime.has(seg.from) || cueStartMs < nodeRevealTime.get(seg.from)!) {
        nodeRevealTime.set(seg.from, cueStartMs);
      }
      const arrival = cueStartMs + Math.min(240, durMs * 0.65);
      if (!nodeRevealTime.has(seg.to) || arrival < nodeRevealTime.get(seg.to)!) {
        nodeRevealTime.set(seg.to, arrival);
      }
    }
  }

  for (const edge of structural) {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) continue;
    const routeObstacles = [...allNodeRects, ...placedLabels.map((l) => inflateRect(l, 4))];
    const lane = nextEdgeLane(laneByPair, edge.from, edge.to);
    const labelObstacles = [...allNodeRects, ...groupHeaderObstacles, ...placedLabels];
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
      diagramType,
      isVertical,
      portSlotsByEdge.get(edge),
      groupBoundaries,
    );
    placedPaths.push(runtime.points);
    if (runtime.labelRect) placedLabels.push(runtime.labelRect);
    edgeRuntimes.set(edge.id, runtime);

    const hasCues = cues.length > 0;
    const tFrom = nodeRevealTime.get(edge.from) ?? 0;
    const tTo = nodeRevealTime.get(edge.to) ?? 0;
    const revealDelay = Math.max(tFrom, tTo);

    if (hasCues) {
      anims.push(
        ...animateElementsOpacity(
          edgeOpacityLeaves(runtime),
          [{ opacity: 0 }, { opacity: 1 }],
          { duration: 240, delay: revealDelay, fill: "both", easing: "cubic-bezier(0.16, 1, 0.3, 1)" },
        ),
      );
    } else {
      setEdgeVisible(runtime, true);
    }
  }

  return anims;
}
