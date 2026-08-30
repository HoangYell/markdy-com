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

export interface SvgExportOptions {
  includeThemeStyles?: boolean;
  transparentBackground?: boolean;
  scale?: number;
  mode?: "pure" | "foreignObject";
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
      if (lines.length === 2) break;
    }
  }
  if (current && lines.length < 3) {
    lines.push(current);
  }
  return lines;
}

export function renderPureVectorSvg(plan: RenderPlan, options: SvgExportOptions = {}): string {
  const width = plan.meta.width;
  const height = plan.meta.height;
  const theme = plan.theme;
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
    <text x="44" y="44" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Roboto, sans-serif" font-size="20" font-weight="700" fill="${textColor}" letter-spacing="-0.02em">${escapeXml(plan.title)}</text>
  </g>
`;
  }

  // Group Boundaries
  if (plan.groupBoundaries && plan.groupBoundaries.length > 0) {
    svg += `  <!-- Group Boundaries -->\n  <g class="markdy-groups-layer">\n`;
    for (const gb of plan.groupBoundaries) {
      svg += `    <g id="group-${escapeXml(gb.id)}" transform="translate(${gb.x}, ${gb.y})">
      <rect width="${gb.width}" height="${gb.height}" rx="14" fill="${surface}" fill-opacity="${isDark ? '0.2' : '0.4'}" stroke="${border}" stroke-width="1.5" stroke-dasharray="6 6"/>
`;
      if (gb.label) {
        const labelW = Math.max(48, gb.label.length * 7.5 + 20);
        svg += `      <rect x="12" y="10" width="${labelW}" height="22" rx="4" fill="${surfaceRaised}" fill-opacity="0.95" stroke="${border}" stroke-width="1"/>
      <text x="22" y="25" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif" font-size="11" font-weight="600" fill="${textColor}">${escapeXml(gb.label)}</text>
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
      for (const childX of bus.childXs) {
        let d: string;
        if (Math.abs(childX - bus.parentX) < 1) {
          d = toPathD([
            { x: bus.parentX, y: bus.parentY },
            { x: childX, y: bus.childY },
          ], 12);
        } else {
          d = toPathD([
            { x: bus.parentX, y: bus.parentY },
            { x: bus.parentX, y: bus.branchY },
            { x: childX, y: bus.branchY },
            { x: childX, y: bus.childY },
          ], 12);
        }
        svg += `    <path d="${d}" fill="none" stroke="${busStroke}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>\n`;
      }
    }
    svg += `  </g>\n`;
  }

  // Sequence Layer (if sequence diagram)
  if (plan.diagramType === "sequence" && plan.sequenceMessages) {
    svg += `  <!-- Sequence Messages -->\n  <g class="markdy-sequence-layer">\n`;
    for (const msg of plan.sequenceMessages) {
      const fromNode = plan.nodes.find((n) => n.id === msg.from);
      const toNode = plan.nodes.find((n) => n.id === msg.to);
      if (!fromNode || !toNode) continue;
      const fromX = fromNode.x + fromNode.width / 2;
      const toX = toNode.x + toNode.width / 2;
      const msgColor = theme.edges?.[msg.kind] || accent;
      const markerAttr = msg.kind === "response" ? 'marker-end="url(#arrow-response)"' : 'marker-end="url(#arrow-request)"';
      const dashAttr = msg.kind === "response" ? 'stroke-dasharray="6 4"' : "";

      svg += `    <g class="markdy-seq-msg">
      <line x1="${fromX}" y1="${msg.y}" x2="${toX}" y2="${msg.y}" stroke="${msgColor}" stroke-width="2" ${dashAttr} ${markerAttr}/>
`;
      if (msg.label) {
        const midX = (fromX + toX) / 2;
        svg += `      <text x="${midX}" y="${msg.y - 8}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="11" font-weight="500" fill="${textColor}" text-anchor="middle">${escapeXml(msg.label)}</text>\n`;
      }
      svg += `    </g>\n`;
    }
    svg += `  </g>\n`;
  }

  // Edges & Flows
  if (plan.edges && plan.edges.length > 0) {
    svg += `  <!-- Edge Connections -->\n  <g class="markdy-edges-layer">\n`;
    const nodeMap = new Map(plan.nodes.map((n) => [n.id, n]));

    plan.edges.forEach((edge, index) => {
      const from = nodeMap.get(edge.from);
      const to = nodeMap.get(edge.to);
      if (!from || !to) return;

      const color = theme.edges?.[edge.kind] || accent;
      const style = EDGE_STYLES[edge.kind] || EDGE_STYLES.request;
      const isSelfLoop = from.id === to.id;
      const points = isSelfLoop
        ? dedupePoints(selfLoopPath(from, bounds))
        : dedupePoints(routeEdgePoints(from, to, routeObstacles, bounds, index));

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

      svg += `    <g id="edge-${escapeXml(edge.id || `flow_${index}`)}" class="markdy-edge">
      <path d="${d}" fill="none" stroke="${color}" stroke-width="${edge.kind === 'dependency' ? '1.5' : '2'}" stroke-linecap="round" stroke-linejoin="round" ${dashAttr} ${markerAttr}/>
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
        const padX = 6;
        const halfW = textWidth / 2;
        const labelX = placement.x - halfW - padX;
        const labelY = placement.y - boxHeight / 2;
        const labelColor = computeEdgeLabelColor(color, isDark);

        svg += `      <!-- Edge Label -->
      <rect x="${labelX}" y="${labelY}" width="${textWidth + padX * 2}" height="${boxHeight}" rx="4" fill="${canvasBg}" stroke="${border}" stroke-width="1"/>
`;
        if (lines.length === 1) {
          svg += `      <text x="${placement.x}" y="${placement.y + 0.5}" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="10.5" font-weight="500" fill="${labelColor}" text-anchor="middle" dominant-baseline="middle">${escapeXml(lines[0])}</text>\n`;
        } else {
          const startY = placement.y - ((lines.length - 1) * lineHeight) / 2 + 3.5;
          lines.forEach((lineText, idx) => {
            svg += `      <text x="${placement.x}" y="${startY + idx * lineHeight}" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="10.5" font-weight="500" fill="${labelColor}" text-anchor="middle">${escapeXml(lineText)}</text>\n`;
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
    const roleColor = (theme.roles && theme.roles[node.role]) || accent;
    const iconKey = iconKeyForNode(node);
    const glyphSpec = ICON_REGISTRY[iconKey] || ICON_REGISTRY.service;

    svg += `    <g id="node-${escapeXml(node.id)}" transform="translate(${node.x}, ${node.y})">
`;

    // Shape rendering
    if (node.shape === "diamond") {
      const hw = node.width / 2;
      const hh = node.height / 2;
      svg += `      <polygon points="${hw},0 ${node.width},${hh} ${hw},${node.height} 0,${hh}" fill="${surface}" stroke="${border}" stroke-width="1" filter="url(#markdy-node-shadow)"/>\n`;
    } else if (node.shape === "circle") {
      const r = Math.min(node.width, node.height) / 2;
      svg += `      <circle cx="${node.width / 2}" cy="${node.height / 2}" r="${r}" fill="${surface}" stroke="${border}" stroke-width="1" filter="url(#markdy-node-shadow)"/>\n`;
    } else if (node.shape === "pill") {
      svg += `      <rect width="${node.width}" height="${node.height}" rx="${node.height / 2}" fill="${surface}" stroke="${border}" stroke-width="1" filter="url(#markdy-node-shadow)"/>\n`;
    } else {
      // Standard Card
      svg += `      <rect width="${node.width}" height="${node.height}" rx="12" fill="${surface}" stroke="${border}" stroke-width="1" filter="url(#markdy-node-shadow)"/>
      <rect x="0.5" y="0.5" width="${node.width - 1}" height="${node.height - 1}" rx="11.5" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
`;
    }

    // Frameless Icon Glyph (26px)
    const iconSize = 26;
    const iconX = 16;
    const iconY = (node.height - iconSize) / 2;
    svg += `      <!-- Frameless Icon Glyph -->
      <g transform="translate(${iconX}, ${iconY}) scale(${iconSize / 24})" fill="none" stroke="${roleColor}" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round">
`;
    if (glyphSpec) {
      for (const [tag, attrs] of glyphSpec) {
        const attrStr = Object.entries(attrs)
          .map(([k, v]) => `${k}="${escapeXml(v)}"`)
          .join(" ");
        svg += `        <${tag} ${attrStr} />\n`;
      }
    }
    svg += `      </g>\n`;

    // Text Label Wrapping & Alignment
    const hasTech = Boolean(node.props?.tech || node.props?.sub);
    const textStartX = 54;
    const availTextWidth = node.width - textStartX - 14;
    const lines = wrapNodeLabel(node.label, availTextWidth, 13.5);

    if (hasTech) {
      const techText = String(node.props?.tech || node.props?.sub);
      const labelY = lines.length === 1 ? node.height / 2 - 4 : node.height / 2 - 12;
      svg += `      <!-- Label -->
      <text x="${textStartX}" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, sans-serif" font-size="13" font-weight="600" letter-spacing="-0.01em" fill="${textColor}">
`;
      if (lines.length === 1) {
        svg += `        <tspan x="${textStartX}" y="${labelY}">${escapeXml(lines[0])}</tspan>\n`;
      } else {
        lines.forEach((l, idx) => {
          svg += `        <tspan x="${textStartX}" y="${labelY + idx * 15}">${escapeXml(l)}</tspan>\n`;
        });
      }
      svg += `      </text>\n`;
      const techBadgeW = Math.min(availTextWidth, techText.length * 6.2 + 12);
      const techBadgeY = node.height / 2 + 6;
      svg += `      <!-- Tech Badge -->
      <rect x="${textStartX}" y="${techBadgeY}" width="${techBadgeW}" height="16" rx="4" fill="${textColor}" fill-opacity="${isDark ? '0.08' : '0.05'}" stroke="${border}" stroke-width="0.75"/>
      <text x="${textStartX + 6}" y="${techBadgeY + 11.5}" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" font-size="9.5" font-weight="500" fill="${textMuted}">${escapeXml(techText)}</text>\n`;
    } else {
      svg += `      <!-- Label -->
      <text x="${textStartX}" font-family="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Inter, sans-serif" font-size="13.5" font-weight="600" letter-spacing="-0.01em" fill="${textColor}">
`;
      if (lines.length === 1) {
        svg += `        <tspan x="${textStartX}" y="${node.height / 2 + 4.5}">${escapeXml(lines[0])}</tspan>\n`;
      } else if (lines.length === 2) {
        const startY = (node.height - 17) / 2 + 1;
        svg += `        <tspan x="${textStartX}" y="${startY}">${escapeXml(lines[0])}</tspan>
        <tspan x="${textStartX}" y="${startY + 17}">${escapeXml(lines[1])}</tspan>\n`;
      } else {
        const startY = (node.height - 32) / 2;
        svg += `        <tspan x="${textStartX}" y="${startY}">${escapeXml(lines[0])}</tspan>
        <tspan x="${textStartX}" y="${startY + 16}">${escapeXml(lines[1])}</tspan>
        <tspan x="${textStartX}" y="${startY + 32}">${escapeXml(lines[2])}</tspan>\n`;
      }
      svg += `      </text>\n`;
    }

    svg += `    </g>\n`;
  }
  svg += `  </g>\n`;

  // Watermark
  svg += `
  <!-- Watermark -->
  <g class="markdy-watermark" transform="translate(${width - 120}, ${height - 18})">
    <text font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif" font-size="10" font-weight="500" fill="${textMuted}" opacity="0.7">Powered by Markdy</text>
  </g>
</svg>`;

  return svg;
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
    // Check if the container stored its Markdy code or plan
    const storedCode = (target as any).__markdyCode;
    if (storedCode && typeof storedCode === "string") {
      const { plan } = parseAndCompile(storedCode);
      return renderPureVectorSvg(plan, options);
    }
    const storedPlan = (target as any).__markdyPlan;
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

  // Fallback if none of the above matched
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
