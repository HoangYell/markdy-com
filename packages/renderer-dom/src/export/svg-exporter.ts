/**
 * packages/renderer-dom/src/export/svg-exporter.ts
 * Standalone Pure Vector SVG & Figma-compatible design token asset export.
 * Zero external dependencies.
 *
 * Produces 100% native vector SVG elements (<rect>, <path>, <text>, <g>, <marker>)
 * that open cleanly in macOS Preview, Figma, Illustrator, GitHub, and all browsers.
 */

import {
  parseAndCompile,
  resolveTheme,
  resolveVectorSymbol,
  type EdgeKind,
  type GroupBoundary,
  type PositionedNode,
  type RenderPlan,
  type RoutedEdge,
  type SequenceMessage,
  type ThemeTokens,
  type TreeBus,
} from "@markdy/core";
import {
  placeFlowLabel,
  polylineLength,
  routeOrthogonal,
  selfLoopPath,
  toPathD,
  wrapFlowLabelText,
} from "../geometry/path.js";
import { boxRect, inflateRect, type Point, type Rect } from "../geometry/rect.js";
import { ICON_REGISTRY, iconKeyForNode, type IconSpec } from "../nodes.js";
import { nextEdgeLane } from "../edges.js";

export interface SvgExportOptions {
  includeThemeStyles?: boolean;
  transparentBackground?: boolean;
  scale?: number;
  mode?: "pure" | "foreignObject";
  nodeStates?: Map<string, { opacity: number; transform?: string }>;
  edgeStates?: Map<string, { opacity: number; strokeDashoffset?: string }>;
  sequenceMessageStates?: Map<string, { opacity: number }>;
  sequenceActivationStates?: Map<number, { opacity: number }>;
  flowDots?: { x: number; y: number; r: number; fill: string; opacity: number }[];
  activeCaption?: { text: string; opacity: number };
  cameraTransform?: string;
}

export interface PreparedHtmlSceneExport {
  sceneEl: HTMLElement;
  clonedScene: HTMLElement;
  width: number;
  height: number;
  scaledWidth: number;
  scaledHeight: number;
}

function copyRenderedStyles(source: HTMLElement, clone: HTMLElement): void {
  if (typeof window === "undefined" || typeof window.getComputedStyle !== "function") return;

  const sourceElements = [source, ...Array.from(source.querySelectorAll<HTMLElement>("*"))];
  const cloneElements = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>("*"))];
  for (let index = 0; index < Math.min(sourceElements.length, cloneElements.length); index++) {
    const computed = window.getComputedStyle(sourceElements[index]);
    const target = cloneElements[index].style;
    for (let propertyIndex = 0; propertyIndex < computed.length; propertyIndex++) {
      const property = computed.item(propertyIndex);
      target.setProperty(property, computed.getPropertyValue(property), computed.getPropertyPriority(property));
    }
  }
}

function normalizeExportViewport(scene: HTMLElement): void {
  scene.querySelectorAll<HTMLElement>(".markdy-viewport-transform").forEach((viewportTransform) => {
    viewportTransform.style.transform = "translate(0px, 0px) scale(1)";
    viewportTransform.style.transformOrigin = "0 0";
    viewportTransform.style.willChange = "auto";
  });
}

export function getDiagramSceneElement(containerEl: HTMLElement): HTMLElement {
  const sceneEl = (
    containerEl.classList?.contains("markdy-scene-root")
      ? containerEl
      : containerEl.querySelector(".markdy-scene-root") ||
        containerEl.querySelector("svg") ||
        (containerEl.tagName?.toLowerCase() === "svg" ? containerEl : null)
  ) as HTMLElement | null;

  if (!sceneEl) throw new Error("No Markdy scene element found in container");
  return sceneEl;
}

export function prepareHtmlSceneForExport(
  sceneEl: HTMLElement,
  options: SvgExportOptions = {}
): PreparedHtmlSceneExport {
  const clonedScene = sceneEl.cloneNode(true) as HTMLElement;
  copyRenderedStyles(sceneEl, clonedScene);
  normalizeExportViewport(clonedScene);

  const widthStr = clonedScene.style.width || String(sceneEl.clientWidth || 800);
  const heightStr = clonedScene.style.height || String(sceneEl.clientHeight || 400);

  let width = parseFloat(widthStr);
  let height = parseFloat(heightStr);

  if (isNaN(width)) width = 800;
  if (isNaN(height)) height = 400;

  const scale = options.scale || 1;
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;

  clonedScene.style.transform = `scale(${scale})`;
  clonedScene.style.transformOrigin = "0 0";
  clonedScene.style.position = "relative";
  clonedScene.style.left = "0px";
  clonedScene.style.top = "0px";
  clonedScene.style.margin = "0";
  clonedScene.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");

  if (options.transparentBackground) {
    clonedScene.style.background = "transparent";
  }

  return { sceneEl, clonedScene, width, height, scaledWidth, scaledHeight };
}

function escapeXml(str: unknown): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

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
): Point[] {
  if (from.shape === "circle" && to.shape === "circle") return circleBoundaryRoute(from, to);
  const raw = routeOrthogonal(boxRect(from), boxRect(to), routeObstacles, bounds, lane);
  return snapRouteEndpointsToShapes(raw, from, to);
}

function isDarkTheme(theme: ThemeTokens): boolean {
  if (theme.name === "paper" || theme.name === "editorial" || theme.name === "sketchy" || theme.name === "ink" || theme.name === "doodle") {
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
  return isDark ? "#f8fafc" : "#0f172a";
}

const EDGE_STYLES: Record<EdgeKind, { dash: string; marker: string }> = {
  request: { dash: "", marker: "arrow" },
  response: { dash: "6 4", marker: "arrow-open" },
  event: { dash: "2 6", marker: "dot" },
  dependency: { dash: "4 4", marker: "none" },
};

function wrapNodeLabel(label: string, maxWidthPx: number, fontSize = 13.5): string[] {
  if (!label) return [];
  const avgCharWidth = fontSize * 0.52;
  const maxChars = Math.max(10, Math.floor(maxWidthPx / avgCharWidth));

  if (label.length <= maxChars) return [label];

  const words = label.trim().split(/\s+/);
  if (words.length <= 1) return [label];

  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) {
      current = word;
    } else if ((current + " " + word).length <= maxChars) {
      current += " " + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines;
}

export function renderPureVectorSvg(plan: RenderPlan, options: SvgExportOptions = {}): string {
  const width = plan.meta.width;
  const height = plan.meta.height;
  const theme = plan.theme || resolveTheme(plan.meta?.theme || "paper");
  const isDark = isDarkTheme(theme);

  const canvasBg = options.transparentBackground ? "none" : (theme.canvas || (isDark ? "#0b0f19" : "#f6f8fc"));
  const surface = theme.surface || (isDark ? "#141c2e" : "#ffffff");
  const surfaceRaised = theme.surfaceRaised || (isDark ? "#1e293b" : "#f1f5f9");
  const border = theme.border || (isDark ? "#334155" : "#cbd5e1");
  const textColor = theme.text || (isDark ? "#f8fafc" : "#0f172a");
  const textMuted = theme.textMuted || (isDark ? "#94a3b8" : "#64748b");
  const accent = theme.accent || "#2563eb";

  const bounds = { width, height };
  const routeObstacles: Rect[] = [
    ...plan.nodes.map((n) => inflateRect(boxRect(n), 12)),
    ...(plan.groupBoundaries ?? []).map((gb) => boxRect(gb)),
  ];
  const labelObstacles: Rect[] = plan.nodes.map((n) => inflateRect(boxRect(n), 6));
  const existingPaths: Point[][] = [];

  let svg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <!-- Embedded Typography & Anti-Aliasing -->
    <style>
      text {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, sans-serif;
        text-rendering: geometricPrecision;
        -webkit-font-smoothing: antialiased;
      }
      .markdy-svg-text {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, Roboto, "Helvetica Neue", Arial, sans-serif;
        text-rendering: geometricPrecision;
        -webkit-font-smoothing: antialiased;
      }
      .markdy-svg-mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        text-rendering: geometricPrecision;
        -webkit-font-smoothing: antialiased;
      }
    </style>

    <!-- Drop Shadow Filter -->
    <filter id="markdy-node-shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#020617" flood-opacity="${isDark ? '0.45' : '0.12'}"/>
      <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#020617" flood-opacity="${isDark ? '0.25' : '0.08'}"/>
    </filter>

    <!-- Grid Patterns -->
    <pattern id="markdy-grid-minor" width="32" height="32" patternUnits="userSpaceOnUse">
      <path d="M 32 0 L 0 0 0 32" fill="none" stroke="${theme.gridMinor || (isDark ? '#334155' : '#e2e8f0')}" stroke-width="1" stroke-opacity="0.5"/>
    </pattern>
    <pattern id="markdy-grid-major" width="160" height="160" patternUnits="userSpaceOnUse">
      <path d="M 160 0 L 0 0 0 160" fill="none" stroke="${theme.gridMajor || (isDark ? '#475569' : '#cbd5e1')}" stroke-width="1.2" stroke-opacity="0.6"/>
    </pattern>

    <!-- Arrowhead Markers -->
    <marker id="arrow-request" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M 1.5 1.6 L 9 5 L 1.5 8.4 L 3.4 5 Z" fill="${theme.edges?.request || accent}"/>
    </marker>
    <marker id="arrow-response" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <path d="M 1.5 1.6 L 9 5 L 1.5 8.4" fill="none" stroke="${theme.edges?.response || textMuted}" stroke-width="1.4"/>
    </marker>
    <marker id="arrow-event" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <circle cx="5" cy="5" r="3" fill="${theme.edges?.event || accent}"/>
    </marker>
  </defs>

  <!-- Background -->
  ${options.transparentBackground ? "" : `
  <rect width="100%" height="100%" fill="${canvasBg}"/>
  <rect width="100%" height="100%" fill="url(#markdy-grid-minor)"/>
  <rect width="100%" height="100%" fill="url(#markdy-grid-major)"/>
  `}
`;

  // Title
  if (plan.title) {
    svg += `
  <!-- Diagram Title -->
  <g class="markdy-title-layer">
    <text x="48" y="44" class="markdy-svg-text" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif" font-size="22" font-weight="700" fill="${textColor}" dominant-baseline="central" letter-spacing="-0.02em">${escapeXml(plan.title)}</text>
  </g>
`;
  }

  const cameraTransformAttr = options.cameraTransform && options.cameraTransform !== "none"
    ? ` transform="${escapeXml(options.cameraTransform)}"`
    : "";

  svg += `  <!-- Main Scene Content -->\n  <g class="markdy-camera-layer"${cameraTransformAttr}>\n`;

  // Group Boundaries
  if (plan.groupBoundaries && plan.groupBoundaries.length > 0) {
    svg += `  <!-- Group Boundaries -->\n  <g class="markdy-groups-layer">\n`;
    for (const gb of plan.groupBoundaries) {
      svg += `    <g id="group-${escapeXml(gb.id)}" transform="translate(${gb.x}, ${gb.y})">
      <rect width="${gb.width}" height="${gb.height}" rx="16" fill="${surfaceRaised}" fill-opacity="${isDark ? '0.28' : '0.45'}" stroke="${border}" stroke-width="1.2" stroke-dasharray="5 5"/>
`;
      if (gb.label) {
        const labelText = gb.label.toUpperCase();
        const labelW = Math.max(54, labelText.length * 6.8 + 20);
        svg += `      <rect x="14" y="10" width="${labelW}" height="20" rx="6" fill="${surfaceRaised}" fill-opacity="0.95" stroke="${border}" stroke-width="1"/>
      <text x="${14 + labelW / 2}" y="20" class="markdy-svg-mono" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, monospace" font-size="10" font-weight="700" letter-spacing="0.1em" fill="${textColor}" text-anchor="middle" dominant-baseline="central">${escapeXml(labelText)}</text>
`;
      }
      svg += `    </g>\n`;
    }
    svg += `  </g>\n`;
  }

  // Tree Buses
  if (plan.treeBuses && plan.treeBuses.length > 0) {
    svg += `  <!-- Tree Buses -->\n  <g class="markdy-tree-layer">\n`;
    const busStroke = theme.edges?.dependency ?? theme.border ?? "#64748b";
    for (const bus of plan.treeBuses) {
      bus.childXs.forEach((childX, idx) => {
        const targetY = bus.childYs ? (bus.childYs[idx] ?? bus.childY) : bus.childY;
        let d: string;
        if (Math.abs(childX - bus.parentX) < 1) {
          d = toPathD([
            { x: bus.parentX, y: bus.parentY },
            { x: childX, y: targetY },
          ], 12);
        } else {
          const branchY = bus.childYs ? (bus.parentY + targetY) / 2 : bus.branchY;
          d = toPathD([
            { x: bus.parentX, y: bus.parentY },
            { x: bus.parentX, y: branchY },
            { x: childX, y: branchY },
            { x: childX, y: targetY },
          ], 12);
        }
        svg += `    <path d="${d}" fill="none" stroke="${busStroke}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>\n`;
      });
    }
    svg += `  </g>\n`;
  }

  // Sequence Layer (if sequence diagram)
  if (plan.diagramType === "sequence") {
    svg += `  <!-- Sequence Layer -->\n  <g class="markdy-sequence-layer">\n`;
    const nodeById = new Map(plan.nodes.map((node) => [node.id, node]));
    const centerX = (id: string): number => {
      const node = nodeById.get(id);
      return node ? node.x + node.width / 2 : 0;
    };
    const lifelineStroke = theme.edges?.dependency ?? theme.rule ?? theme.border ?? "#64748b";

    // 1. Participant Lifelines
    for (const node of plan.nodes) {
      const x = centerX(node.id);
      const y1 = node.y + node.height;
      const y2 = Math.max(y1 + 40, height - 36);
      svg += `    <line class="markdy-sequence-lifeline" x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${lifelineStroke}" stroke-width="1.5" stroke-dasharray="5 5" opacity="0.85"/>\n`;
      svg += `    <circle class="markdy-sequence-lifeline-cap" cx="${x}" cy="${y2}" r="2.5" fill="${lifelineStroke}" opacity="0.85"/>\n`;
    }

    // 2. Activations
    if (plan.sequenceActivations) {
      plan.sequenceActivations.forEach((activation, idx) => {
        const x = centerX(activation.participant);
        const actState = options.sequenceActivationStates?.get(idx);
        const actOpacity = actState !== undefined ? actState.opacity : (options.sequenceActivationStates ? 0 : 0.9);
        if (actOpacity > 0.001) {
          const opacityAttr = actOpacity < 0.999 ? `opacity="${actOpacity}"` : "";
          svg += `    <rect class="markdy-sequence-activation" x="${x - 6}" y="${activation.y}" width="12" height="${activation.height}" rx="4" fill="${accent}" ${opacityAttr}/>\n`;
        }
      });
    }

    // 3. Sequence Messages
    if (plan.sequenceMessages) {
      for (const msg of plan.sequenceMessages) {
        const fromX = centerX(msg.from);
        const toX = centerX(msg.to);
        const msgColor = theme.edges?.[msg.kind] || accent;
        const markerAttr = msg.kind === "response" ? 'marker-end="url(#arrow-response)"' : 'marker-end="url(#arrow-request)"';
        const dashAttr = msg.kind === "response" ? 'stroke-dasharray="6 4"' : msg.kind === "event" ? 'stroke-dasharray="2 6"' : "";

        const msgState = options.sequenceMessageStates?.get(msg.id);
        const msgOpacity = msgState !== undefined ? msgState.opacity : 1;
        if (msgOpacity <= 0.001) continue;
        const opacityAttr = msgOpacity < 0.999 ? `opacity="${msgOpacity}"` : "";

        svg += `    <g class="markdy-sequence-message" data-message="${escapeXml(msg.id)}" ${opacityAttr}>
      <line x1="${fromX}" y1="${msg.y}" x2="${toX}" y2="${msg.y}" stroke="${msgColor}" stroke-width="2" stroke-linecap="round" ${dashAttr} ${markerAttr}/>
`;
        if (msg.label) {
          const midX = (fromX + toX) / 2;
          const msgPlateW = msg.label.length * 6.8 + 16;
          const plateFill = theme.labelPlate ?? theme.surface ?? (isDark ? "#1e293b" : "#ffffff");
          const plateStroke = theme.hairline ?? theme.border ?? (isDark ? "#334155" : "#cbd5e1");
          svg += `      <rect x="${midX - msgPlateW / 2}" y="${msg.y - 12}" width="${msgPlateW}" height="24" rx="6" fill="${plateFill}" fill-opacity="0.96" stroke="${plateStroke}" stroke-width="1"/>
      <text x="${midX}" y="${msg.y}" class="markdy-svg-mono" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" font-weight="500" fill="${textColor}" text-anchor="middle" dominant-baseline="central">${escapeXml(msg.label)}</text>\n`;
        }
        svg += `    </g>\n`;
      }
    }
    svg += `  </g>\n`;
  }

  // Edges & Flows (only for non-sequence diagrams)
  if (plan.diagramType !== "sequence" && plan.edges && plan.edges.length > 0) {
    svg += `  <!-- Edge Connections -->\n  <g class="markdy-edges-layer">\n`;
    const nodeMap = new Map(plan.nodes.map((n) => [n.id, n]));
    const laneByPair = new Map<string, number>();

    plan.edges.forEach((edge, index) => {
      const from = nodeMap.get(edge.from);
      const to = nodeMap.get(edge.to);
      if (!from || !to) return;

      const edgeState = edge.id ? options.edgeStates?.get(edge.id) : undefined;
      const edgeOpacity = edgeState ? edgeState.opacity : 1;
      if (edgeOpacity <= 0.001) return;

      const color = theme.edges?.[edge.kind] || accent;
      const style = EDGE_STYLES[edge.kind] || EDGE_STYLES.request;
      const isSelfLoop = from.id === to.id;
      const lane = nextEdgeLane(laneByPair, from, to);
      const points = isSelfLoop
        ? dedupePoints(selfLoopPath(from, bounds))
        : dedupePoints(routeEdgePoints(from, to, routeObstacles, bounds, lane));

      const d = toPathD(points, 14, existingPaths);
      existingPaths.push(points);

      const markerAttr =
        style.marker === "arrow"
          ? 'marker-end="url(#arrow-request)"'
          : style.marker === "arrow-open"
          ? 'marker-end="url(#arrow-response)"'
          : style.marker === "dot"
          ? 'marker-end="url(#arrow-event)"'
          : "";
      const dashAttr = style.dash ? `stroke-dasharray="${style.dash}"` : "";
      const dashOffsetAttr = edgeState?.strokeDashoffset && edgeState.strokeDashoffset !== "0px" && edgeState.strokeDashoffset !== "0"
        ? `stroke-dashoffset="${escapeXml(edgeState.strokeDashoffset)}"`
        : "";
      const opacityAttr = edgeOpacity < 0.999 ? `opacity="${edgeOpacity}"` : "";

      svg += `    <g id="edge-${escapeXml(edge.id || `flow_${index}`)}" class="markdy-edge" ${opacityAttr}>
      <path d="${d}" fill="none" stroke="${color}" stroke-width="${edge.kind === 'dependency' ? '1.5' : '2'}" stroke-linecap="round" stroke-linejoin="round" ${dashAttr} ${dashOffsetAttr} ${markerAttr}/>
`;

      // Edge Label
      if (edge.label) {
        let longestSegLen = 0;
        for (let i = 0; i < points.length - 1; i++) {
          longestSegLen = Math.max(longestSegLen, Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y));
        }
        const maxAvailW = Math.max(48, longestSegLen - 24);
        const lines = wrapFlowLabelText(edge.label, maxAvailW);
        const maxChars = Math.max(...lines.map((l) => l.length));
        const textWidth = Math.max(36, maxChars * 6.6 + 8);
        const lineHeight = 13;
        const boxHeight = lines.length === 1 ? 18 : lines.length * lineHeight + 6;

        const placement = placeFlowLabel(points, textWidth, labelObstacles, bounds, boxHeight);
        labelObstacles.push(inflateRect(placement.rect, 4));
        const padX = 6;
        const halfW = textWidth / 2;
        const labelX = placement.x - halfW - padX;
        const labelY = placement.y - boxHeight / 2;
        const labelColor = computeEdgeLabelColor(color, isDark);

        svg += `      <!-- Edge Label -->
      <rect x="${labelX}" y="${labelY}" width="${textWidth + padX * 2}" height="${boxHeight}" rx="4" fill="${canvasBg}" stroke="${border}" stroke-width="1"/>
`;
        if (lines.length === 1) {
          svg += `      <text x="${placement.x}" y="${placement.y}" class="markdy-svg-mono" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="10.5" font-weight="500" fill="${labelColor}" text-anchor="middle" dominant-baseline="central">${escapeXml(lines[0])}</text>\n`;
        } else {
          lines.forEach((lineText, idx) => {
            const lineY = placement.y - ((lines.length - 1) * lineHeight) / 2 + idx * lineHeight;
            svg += `      <text x="${placement.x}" y="${lineY}" class="markdy-svg-mono" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="10.5" font-weight="500" fill="${labelColor}" text-anchor="middle" dominant-baseline="central">${escapeXml(lineText)}</text>\n`;
          });
        }
      }

      svg += `    </g>\n`;
    });
    svg += `  </g>\n`;
  }

  // Nodes Layer
  svg += `  <!-- Node Cards -->\n  <g class="markdy-nodes-layer">\n`;
  for (const node of plan.nodes) {
    const nodeState = options.nodeStates?.get(node.id);
    const nodeOpacity = nodeState ? nodeState.opacity : 1;
    if (nodeOpacity <= 0.001) continue;

    const roleColor = (theme.roles && theme.roles[node.role]) || accent;
    const iconKey = iconKeyForNode(node);
    const glyphSpec = ICON_REGISTRY[iconKey] || ICON_REGISTRY.service;
    const isDiamond = node.shape === "diamond";
    const isCircle = node.shape === "circle";
    const isPill = node.shape === "pill";

    const transformStr = nodeState?.transform && nodeState.transform !== "none"
      ? `translate(${node.x}, ${node.y}) ${nodeState.transform}`
      : `translate(${node.x}, ${node.y})`;
    const opacityAttr = nodeOpacity < 0.999 ? `opacity="${nodeOpacity}"` : "";

    svg += `    <g id="node-${escapeXml(node.id)}" transform="${escapeXml(transformStr)}" ${opacityAttr}>
`;

    // Shape background rendering
    if (isDiamond) {
      const hw = node.width / 2;
      const hh = node.height / 2;
      svg += `      <polygon points="${hw},1.5 ${node.width - 1.5},${hh} ${hw},${node.height - 1.5} 1.5,${hh}" fill="${surface}" stroke="${border}" stroke-width="1.5" stroke-linejoin="round" filter="url(#markdy-node-shadow)"/>
      <polygon points="${hw},3.5 ${node.width - 3.5},${hh} ${hw},${node.height - 3.5} 3.5,${hh}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1" stroke-linejoin="round"/>\n`;
    } else if (isCircle) {
      const r = Math.min(node.width, node.height) / 2;
      svg += `      <circle cx="${node.width / 2}" cy="${node.height / 2}" r="${r}" fill="${surface}" stroke="${border}" stroke-width="1" filter="url(#markdy-node-shadow)"/>\n`;
    } else if (isPill) {
      svg += `      <rect width="${node.width}" height="${node.height}" rx="${node.height / 2}" fill="${surface}" stroke="${border}" stroke-width="1" filter="url(#markdy-node-shadow)"/>\n`;
    } else {
      // Standard Card / Container / Rounded / Terminal
      const rx = node.shape === "terminal" ? "8" : node.shape === "rounded" ? "16" : "12";
      svg += `      <rect width="${node.width}" height="${node.height}" rx="${rx}" fill="${surface}" stroke="${border}" stroke-width="1" filter="url(#markdy-node-shadow)"/>
      <rect x="0.5" y="0.5" width="${node.width - 1}" height="${node.height - 1}" rx="${parseFloat(rx) - 0.5}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
`;
    }

    const hasTech = Boolean(node.props?.tech || node.props?.sub);
    const techText = String(node.props?.tech || node.props?.sub || "");
    const value = node.props?.value ?? node.props?.metric;
    const valText = value !== undefined && value !== null ? String(value) : "";
    const valWidth = valText ? valText.length * 9.5 + 16 : 0;
    const iconSize = 26;

    // Node contents rendering based on shape
    if (isDiamond) {
      // Diamond: Centered column with icon above label, inside the diamond's widest center
      const centerX = node.width / 2;
      const availTextWidth = Math.max(40, node.width * 0.62);
      const lines = wrapNodeLabel(node.label, availTextWidth, 12);
      const diamondIconSize = 18;
      const iconX = (node.width - diamondIconSize) / 2;
      const iconY = node.height / 2 - (hasTech ? 26 : lines.length > 1 ? 22 : 18);

      const symbolKey = typeof node.props?.icon === "string" ? node.props.icon : typeof node.props?.symbol === "string" ? node.props.symbol : undefined;
      const vectorSymbol = symbolKey ? resolveVectorSymbol(symbolKey) : null;
      const rawImage = node.props?.image ?? node.props?.logo;

      if (typeof rawImage === "string" && rawImage.length > 0) {
        svg += `      <image href="${escapeXml(rawImage)}" x="${iconX}" y="${iconY}" width="${diamondIconSize}" height="${diamondIconSize}" preserveAspectRatio="xMidYMid meet"/>\n`;
      } else if (vectorSymbol) {
        const symColor = vectorSymbol.brandColor || roleColor;
        svg += `      <g transform="translate(${iconX}, ${iconY}) scale(${diamondIconSize / 24})" fill="currentColor" color="${symColor}">
        ${vectorSymbol.svgPaths}
      </g>\n`;
      } else {
        svg += `      <g transform="translate(${iconX}, ${iconY}) scale(${diamondIconSize / 24})" fill="none" stroke="${roleColor}" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">\n`;
        if (glyphSpec) {
          for (const [tag, attrs] of glyphSpec) {
            const attrStr = Object.entries(attrs).map(([k, v]) => `${k}="${escapeXml(v)}"`).join(" ");
            svg += `        <${tag} ${attrStr} />\n`;
          }
        }
        svg += `      </g>\n`;
      }

      const textCenterY = node.height / 2 + (hasTech ? 4 : lines.length > 1 ? 8 : 7);
      if (lines.length === 1) {
        svg += `      <text x="${centerX}" y="${textCenterY}" class="markdy-svg-text" font-size="12" font-weight="600" fill="${textColor}" text-anchor="middle" dominant-baseline="central">${escapeXml(lines[0])}</text>\n`;
      } else {
        const startY = textCenterY - ((lines.length - 1) * 14) / 2;
        lines.forEach((l, idx) => {
          svg += `      <text x="${centerX}" y="${startY + idx * 14}" class="markdy-svg-text" font-size="12" font-weight="600" fill="${textColor}" text-anchor="middle" dominant-baseline="central">${escapeXml(l)}</text>\n`;
        });
      }

      if (hasTech) {
        const techBadgeW = Math.min(availTextWidth, techText.length * 6 + 10);
        const techBadgeY = textCenterY + (lines.length * 7) + 6;
        svg += `      <rect x="${centerX - techBadgeW / 2}" y="${techBadgeY}" width="${techBadgeW}" height="14" rx="3" fill="${textColor}" fill-opacity="${isDark ? '0.08' : '0.05'}" stroke="${border}" stroke-width="0.75"/>
      <text x="${centerX}" y="${techBadgeY + 7}" class="markdy-svg-mono" font-size="8.5" font-weight="500" fill="${textMuted}" text-anchor="middle" dominant-baseline="central">${escapeXml(techText)}</text>\n`;
      }
    } else if (isCircle) {
      // Circle: Centered column with icon above label
      const centerX = node.width / 2;
      const availTextWidth = Math.max(40, node.width * 0.72);
      const lines = wrapNodeLabel(node.label, availTextWidth, 11.5);
      const circleIconSize = 20;
      const iconX = (node.width - circleIconSize) / 2;
      const iconY = node.height / 2 - 20;

      const circleSymbolKey = typeof node.props?.icon === "string" ? node.props.icon : typeof node.props?.symbol === "string" ? node.props.symbol : undefined;
      const circleVectorSymbol = circleSymbolKey ? resolveVectorSymbol(circleSymbolKey) : null;

      const rawImage = node.props?.image ?? node.props?.logo;
      if (typeof rawImage === "string" && rawImage.length > 0) {
        svg += `      <!-- Centered Custom Image -->
      <image href="${escapeXml(rawImage)}" x="${iconX}" y="${iconY}" width="${circleIconSize}" height="${circleIconSize}" preserveAspectRatio="xMidYMid meet"/>\n`;
      } else if (circleVectorSymbol) {
        const symColor = circleVectorSymbol.brandColor || roleColor;
        svg += `      <!-- Centered Vector Symbol: ${escapeXml(circleVectorSymbol.name)} -->
      <g transform="translate(${iconX}, ${iconY}) scale(${circleIconSize / 24})" fill="currentColor" color="${symColor}">
        ${circleVectorSymbol.svgPaths}
      </g>\n`;
      } else {
        svg += `      <!-- Centered Icon Glyph -->
      <g transform="translate(${iconX}, ${iconY}) scale(${circleIconSize / 24})" fill="none" stroke="${roleColor}" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">
`;
        if (glyphSpec) {
          for (const [tag, attrs] of glyphSpec) {
            const attrStr = Object.entries(attrs).map(([k, v]) => `${k}="${escapeXml(v)}"`).join(" ");
            svg += `        <${tag} ${attrStr} />\n`;
          }
        }
        svg += `      </g>\n`;
      }

      const textCenterY = node.height / 2 + 10;
      if (lines.length === 1) {
        svg += `      <text x="${centerX}" y="${textCenterY}" class="markdy-svg-text" font-size="11.5" font-weight="600" fill="${textColor}" text-anchor="middle" dominant-baseline="central">${escapeXml(lines[0])}</text>\n`;
      } else {
        const startY = textCenterY - ((lines.length - 1) * 13) / 2;
        lines.forEach((l, idx) => {
          svg += `      <text x="${centerX}" y="${startY + idx * 13}" class="markdy-svg-text" font-size="11" font-weight="600" fill="${textColor}" text-anchor="middle" dominant-baseline="central">${escapeXml(l)}</text>\n`;
        });
      }
    } else {
      // Standard Card, Container, Rounded, Terminal, Pill
      const iconX = 16;
      const iconY = (node.height - iconSize) / 2;

      const cardSymbolKey = typeof node.props?.icon === "string" ? node.props.icon : typeof node.props?.symbol === "string" ? node.props.symbol : undefined;
      const cardVectorSymbol = cardSymbolKey ? resolveVectorSymbol(cardSymbolKey) : null;

      const rawImage = node.props?.image ?? node.props?.logo;
      if (typeof rawImage === "string" && rawImage.length > 0) {
        svg += `      <!-- Node Custom Image -->
      <image href="${escapeXml(rawImage)}" x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" preserveAspectRatio="xMidYMid meet"/>\n`;
      } else if (cardVectorSymbol) {
        const symColor = cardVectorSymbol.brandColor || roleColor;
        svg += `      <!-- Native Vector Symbol: ${escapeXml(cardVectorSymbol.name)} -->
      <g transform="translate(${iconX}, ${iconY}) scale(${iconSize / 24})" fill="currentColor" color="${symColor}">
        ${cardVectorSymbol.svgPaths}
      </g>\n`;
      } else {
        // Frameless Icon Glyph
        svg += `      <!-- Frameless Icon Glyph -->
      <g transform="translate(${iconX}, ${iconY}) scale(${iconSize / 24})" fill="none" stroke="${roleColor}" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">
`;
        if (glyphSpec) {
          for (const [tag, attrs] of glyphSpec) {
            const attrStr = Object.entries(attrs).map(([k, v]) => `${k}="${escapeXml(v)}"`).join(" ");
            svg += `        <${tag} ${attrStr} />\n`;
          }
        }
        svg += `      </g>\n`;
      }

      const textStartX = 54;
      const availTextWidth = node.width - textStartX - (valWidth > 0 ? valWidth + 14 : 14);
      const lines = wrapNodeLabel(node.label, availTextWidth, 13.5);

      if (hasTech) {
        const lineHeight = 14;
        const totalTextH = (lines.length - 1) * lineHeight;
        const totalContentH = totalTextH + 26;
        const startY = Math.round(node.height / 2 - totalContentH / 2 + 6);
        if (lines.length === 1) {
          svg += `      <!-- Label -->
      <text x="${textStartX}" y="${startY}" class="markdy-svg-text" font-size="13" font-weight="600" letter-spacing="-0.01em" fill="${textColor}" dominant-baseline="central">${escapeXml(lines[0])}</text>\n`;
        } else {
          svg += `      <!-- Label -->
      <text class="markdy-svg-text" font-size="12.5" font-weight="600" letter-spacing="-0.01em" fill="${textColor}">
`;
          lines.forEach((l, idx) => {
            svg += `        <tspan x="${textStartX}" y="${startY + idx * lineHeight}" dominant-baseline="central">${escapeXml(l)}</tspan>\n`;
          });
          svg += `      </text>\n`;
        }

        const techBadgeW = Math.min(availTextWidth, techText.length * 6.2 + 12);
        const techBadgeY = startY + (lines.length - 1) * lineHeight + 12;
        svg += `      <!-- Tech Badge -->
      <rect x="${textStartX}" y="${techBadgeY}" width="${techBadgeW}" height="16" rx="4" fill="${textColor}" fill-opacity="${isDark ? '0.08' : '0.05'}" stroke="${border}" stroke-width="0.75"/>
      <text x="${textStartX + 6}" y="${techBadgeY + 8}" class="markdy-svg-mono" font-size="9.5" font-weight="500" fill="${textMuted}" dominant-baseline="central">${escapeXml(techText)}</text>\n`;
      } else {
        if (lines.length === 1) {
          svg += `      <!-- Label -->
      <text x="${textStartX}" y="${Math.round(node.height / 2)}" class="markdy-svg-text" font-size="13.5" font-weight="600" letter-spacing="-0.01em" fill="${textColor}" dominant-baseline="central">${escapeXml(lines[0])}</text>\n`;
        } else {
          const lineHeight = 16;
          const totalTextH = (lines.length - 1) * lineHeight;
          const startY = Math.round(node.height / 2 - totalTextH / 2);
          svg += `      <!-- Label -->\n`;
          lines.forEach((l, idx) => {
            svg += `      <text x="${textStartX}" y="${startY + idx * lineHeight}" class="markdy-svg-text" font-size="13.5" font-weight="600" letter-spacing="-0.01em" fill="${textColor}" dominant-baseline="central">${escapeXml(l)}</text>\n`;
          });
        }
      }
    }

    if (valText) {
      svg += `      <!-- Metric Value -->
      <text x="${node.width - 16}" y="${Math.round(node.height / 2)}" class="markdy-svg-text" font-size="15" font-weight="700" fill="${textColor}" text-anchor="end" dominant-baseline="central">${escapeXml(valText)}</text>\n`;
    }

    svg += `    </g>\n`;
  }
  svg += `  </g>\n`;

  // Flow Particles (moving dots along edges)
  if (options.flowDots && options.flowDots.length > 0) {
    svg += `  <!-- Flow Particles -->\n  <g class="markdy-flow-particles">\n`;
    for (const dot of options.flowDots) {
      if (dot.opacity > 0.001) {
        svg += `    <circle cx="${dot.x}" cy="${dot.y}" r="${dot.r}" fill="${dot.fill}" opacity="${dot.opacity}"/>\n`;
      }
    }
    svg += `  </g>\n`;
  }

  // Close Camera Layer
  svg += `  </g>\n`;

  // Live Beat Caption (if active during timeline playback)
  if (options.activeCaption && options.activeCaption.opacity > 0.01 && options.activeCaption.text) {
    const capX = width / 2;
    const capY = height - 32;
    const capW = options.activeCaption.text.length * 7.5 + 28;
    svg += `  <!-- Live Beat Caption -->\n  <g class="markdy-live-caption" opacity="${options.activeCaption.opacity}">\n`;
    svg += `    <rect x="${capX - capW / 2}" y="${capY - 13}" width="${capW}" height="26" rx="13" fill="${surfaceRaised}" stroke="${border}" stroke-width="1" filter="url(#markdy-node-shadow)"/>\n`;
    svg += `    <text x="${capX}" y="${capY}" class="markdy-svg-text" font-size="12" font-weight="600" fill="${textColor}" text-anchor="middle" dominant-baseline="central">${escapeXml(options.activeCaption.text)}</text>\n`;
    svg += `  </g>\n`;
  }

  // Watermark
  svg += `
  <!-- Watermark -->
  <g class="markdy-watermark" transform="translate(${width - 120}, ${height - 18})">
    <text class="markdy-svg-text" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif" font-size="10" font-weight="500" fill="${textMuted}" opacity="0.7" dominant-baseline="central">Powered by Markdy</text>
  </g>
</svg>`;

  return svg;
}

/**
 * Serialize a live diagram container into Pure Vector SVG without foreignObject,
 * capturing the active animated states (opacity, transforms, stroke offsets).
 */
export function exportLiveSceneAsPureVectorSvg(
  containerEl: HTMLElement,
  options: SvgExportOptions = {}
): string {
  const sceneEl = (
    containerEl.classList?.contains("markdy-scene-root")
      ? containerEl
      : containerEl.querySelector(".markdy-scene-root") || containerEl
  ) as HTMLElement;

  const rootEl = (
    containerEl.classList?.contains("markdy-diagram-root")
      ? containerEl
      : containerEl.closest?.(".markdy-diagram-root") || containerEl
  ) as HTMLElement;

  const storedPlan = (rootEl as any).__markdyPlan || (sceneEl as any).__markdyPlan || (containerEl as any).__markdyPlan;
  const storedCode = (rootEl as any).__markdyCode || (sceneEl as any).__markdyCode || (containerEl as any).__markdyCode;

  let plan: RenderPlan | null = storedPlan ?? null;
  if (!plan && storedCode && typeof storedCode === "string") {
    try {
      plan = parseAndCompile(storedCode).plan;
    } catch {
      plan = null;
    }
  }

  if (plan) {
    const nodeStates = new Map<string, { opacity: number; transform?: string }>();
    const edgeStates = new Map<string, { opacity: number; strokeDashoffset?: string }>();
    const sequenceMessageStates = new Map<string, { opacity: number }>();
    const sequenceActivationStates = new Map<number, { opacity: number }>();
    const flowDots: { x: number; y: number; r: number; fill: string; opacity: number }[] = [];
    let activeCaption: { text: string; opacity: number } | undefined;
    let cameraTransform: string | undefined;

    if (typeof window !== "undefined" && typeof window.getComputedStyle === "function") {
      const cameraEl = sceneEl.querySelector(".markdy-camera-layer") as HTMLElement | null;
      if (cameraEl) {
        const comp = window.getComputedStyle(cameraEl);
        if (comp.transform && comp.transform !== "none") {
          cameraTransform = comp.transform;
        }
      }

      // 1. Nodes live state
      for (const node of plan.nodes) {
        const nodeEl = sceneEl.querySelector(`[data-node="${node.id}"], [data-node-id="${node.id}"], #node-${node.id}`) as HTMLElement | null;
        if (nodeEl) {
          const comp = window.getComputedStyle(nodeEl);
          const opacity = comp.display === "none" || comp.visibility === "hidden" ? 0 : parseFloat(comp.opacity || "1");
          nodeStates.set(node.id, {
            opacity: isNaN(opacity) ? 1 : opacity,
            transform: comp.transform && comp.transform !== "none" ? comp.transform : undefined,
          });
        }
      }

      // 2. Edges live state
      for (const edge of plan.edges) {
        const edgeId = edge.id;
        if (edgeId) {
          const edgeEl = sceneEl.querySelector(`[data-edge-id="${edgeId}"], [data-edge="${edgeId}"], #edge-${edgeId}`) as SVGElement | null;
          if (edgeEl) {
            const comp = window.getComputedStyle(edgeEl);
            const opacity = comp.display === "none" || comp.visibility === "hidden" ? 0 : parseFloat(comp.opacity || "1");
            const pathEl = edgeEl.querySelector(".markdy-edge-path") as SVGPathElement | null;
            const pathComp = pathEl ? window.getComputedStyle(pathEl) : comp;
            edgeStates.set(edgeId, {
              opacity: isNaN(opacity) ? 1 : opacity,
              strokeDashoffset: pathComp.strokeDashoffset && pathComp.strokeDashoffset !== "0px" ? pathComp.strokeDashoffset : undefined,
            });
          }
        }
      }

      // 3. Sequence Messages live state
      const seqMsgEls = sceneEl.querySelectorAll<SVGElement>(".markdy-sequence-message, [data-message], [data-message-id]");
      seqMsgEls.forEach((msgEl) => {
        const msgId = msgEl.getAttribute("data-message") || msgEl.getAttribute("data-message-id");
        if (msgId) {
          const comp = window.getComputedStyle(msgEl);
          const opacity = comp.display === "none" || comp.visibility === "hidden" ? 0 : parseFloat(comp.opacity || "1");
          sequenceMessageStates.set(msgId, {
            opacity: isNaN(opacity) ? 1 : opacity,
          });
        }
      });

      // 4. Sequence Activations live state
      const seqActEls = sceneEl.querySelectorAll<SVGRectElement>(".markdy-sequence-activation");
      seqActEls.forEach((actEl, idx) => {
        const indexAttr = actEl.getAttribute("data-activation-index");
        const actIndex = indexAttr ? parseInt(indexAttr, 10) : idx;
        const comp = window.getComputedStyle(actEl);
        const opacity = comp.display === "none" || comp.visibility === "hidden" ? 0 : parseFloat(comp.opacity || "1");
        sequenceActivationStates.set(actIndex, {
          opacity: isNaN(opacity) ? 0 : opacity,
        });
      });

      // 5. Flow Dots (particles)
      const dotEls = sceneEl.querySelectorAll<SVGCircleElement>(".markdy-edge-dot, .markdy-sequence-pulse");
      dotEls.forEach((dotEl) => {
        const comp = window.getComputedStyle(dotEl);
        const opacity = comp.display === "none" || comp.visibility === "hidden" ? 0 : parseFloat(comp.opacity || "0");
        if (opacity > 0.01) {
          const transform = comp.transform;
          let tx = 0;
          let ty = 0;
          if (transform && transform !== "none") {
            const matrixMatch = transform.match(/matrix\(([^)]+)\)/);
            if (matrixMatch) {
              const parts = matrixMatch[1].split(",").map(Number);
              tx = parts[4] || 0;
              ty = parts[5] || 0;
            } else {
              const translateMatch = transform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
              if (translateMatch) {
                tx = parseFloat(translateMatch[1]) || 0;
                ty = parseFloat(translateMatch[2]) || 0;
              }
            }
          }
          const cx = parseFloat(dotEl.getAttribute("cx") || "0") + tx;
          const cy = parseFloat(dotEl.getAttribute("cy") || "0") + ty;
          const r = parseFloat(dotEl.getAttribute("r") || "4.5");
          const fill = comp.fill || dotEl.getAttribute("fill") || "#38bdf8";
          flowDots.push({ x: cx, y: cy, r, fill, opacity });
        }
      });

      // 6. Active Beat Caption
      const capEls = sceneEl.querySelectorAll<HTMLElement>(".markdy-beat-caption");
      for (const capEl of Array.from(capEls)) {
        const comp = window.getComputedStyle(capEl);
        const opacity = comp.display === "none" || comp.visibility === "hidden" ? 0 : parseFloat(comp.opacity || "0");
        if (opacity > 0.05 && capEl.textContent) {
          activeCaption = {
            text: capEl.textContent.trim(),
            opacity,
          };
          break;
        }
      }

      return renderPureVectorSvg(plan, {
        ...options,
        nodeStates,
        edgeStates,
        sequenceMessageStates,
        sequenceActivationStates,
        flowDots,
        activeCaption,
        cameraTransform,
      });
    }

    return renderPureVectorSvg(plan, {
      ...options,
      nodeStates,
      edgeStates,
      cameraTransform,
    });
  }

  // Fallback: If no plan is stored, render static pure vector SVG from target
  return exportDiagramAsVectorSvg(containerEl, { ...options, mode: "pure" });
}

/**
 * Main Vector SVG Export Function
 * Accepts a MarkdyScript code string, a RenderPlan, or an HTMLElement container.
 */
export function exportDiagramAsVectorSvg(
  target: HTMLElement | string | RenderPlan,
  options: SvgExportOptions = {}
): string {
  // If a raw MarkdyScript string was passed
  if (typeof target === "string") {
    const { plan } = parseAndCompile(target);
    return renderPureVectorSvg(plan, options);
  }

  // If a RenderPlan object was passed
  if (typeof target === "object" && target !== null && "meta" in target && "nodes" in target) {
    return renderPureVectorSvg(target as RenderPlan, options);
  }

  // If an HTMLElement was passed
  if (typeof HTMLElement !== "undefined" && target instanceof HTMLElement) {
    // Check if the container stored its Markdy code or plan (also check parent roots)
    const rootEl = (
      target.classList?.contains("markdy-diagram-root")
        ? target
        : target.closest?.(".markdy-diagram-root") || target
    ) as HTMLElement;

    const storedCode = (rootEl as any).__markdyCode || (target as any).__markdyCode;
    if (storedCode && typeof storedCode === "string") {
      const { plan } = parseAndCompile(storedCode);
      return renderPureVectorSvg(plan, options);
    }
    const storedPlan = (rootEl as any).__markdyPlan || (target as any).__markdyPlan;
    if (storedPlan && typeof storedPlan === "object" && "meta" in storedPlan) {
      return renderPureVectorSvg(storedPlan, options);
    }

    // If an SVG element itself was passed
    if (target.tagName?.toLowerCase() === "svg") {
      const clonedSvg = target.cloneNode(true) as SVGSVGElement;
      if (!clonedSvg.getAttribute("xmlns")) {
        clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      }
      const serializer = new XMLSerializer();
      return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n${serializer.serializeToString(clonedSvg)}`;
    }
  }

  // Fallback if mode is explicitly foreignObject or no plan available
  const sceneEl = (
    typeof HTMLElement !== "undefined" && target instanceof HTMLElement
      ? target.querySelector(".markdy-scene-root") || target
      : null
  ) as HTMLElement | null;

  if (sceneEl) {
    const { clonedScene, scaledWidth, scaledHeight } = prepareHtmlSceneForExport(sceneEl, options);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("width", String(scaledWidth));
    svg.setAttribute("height", String(scaledHeight));
    svg.setAttribute("viewBox", `0 0 ${scaledWidth} ${scaledHeight}`);

    const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
    foreignObject.setAttribute("width", "100%");
    foreignObject.setAttribute("height", "100%");
    foreignObject.appendChild(clonedScene);
    svg.appendChild(foreignObject);

    const serializer = new XMLSerializer();
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n` + serializer.serializeToString(svg);
  }

  throw new Error("Could not export diagram: invalid target or missing Markdy script.");
}
