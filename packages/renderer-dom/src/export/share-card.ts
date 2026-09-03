/**
 * packages/renderer-dom/src/export/share-card.ts
 * High-Impact 1200x630 Contextual Share Card Export Pipeline for Markdy.
 * Clean-room re-engineered OpenGraph & Presentation Share Card synthesis.
 * Zero external dependencies.
 */

import {
  exportLiveSceneAsPureVectorSvg,
  type SvgExportOptions,
} from "./svg-exporter.js";
import { inlineSerializedSvgResources } from "./inline-resources.js";

export interface ShareCardOptions extends SvgExportOptions {
  title?: string;
  subtitle?: string;
  variant?: "standard" | "route" | "reach";
  theme?: "midnight" | "paper" | "blueprint" | "graphite" | "editorial" | "nebula" | "terminal";
  pixelRatio?: number;
}

export interface RouteCardOptions extends ShareCardOptions {
  from: string;
  to: string;
  hops?: number;
  protocol?: string;
}

export interface ReachCardOptions extends ShareCardOptions {
  rootId: string;
  direction: "upstream" | "downstream" | "both";
  impactedNodeCount?: number;
  edgeCount?: number;
  maxDepth?: number;
}

const THEME_CARD_STYLES: Record<string, { bg: string; cardBg: string; text: string; muted: string; border: string; accent: string }> = {
  midnight: {
    bg: "#070d18",
    cardBg: "#0e1a2c",
    text: "#f4f7fb",
    muted: "#93a4bb",
    border: "#28384f",
    accent: "#38bdf8",
  },
  paper: {
    bg: "#f6f8fc",
    cardBg: "#ffffff",
    text: "#0f1c2e",
    muted: "#475569",
    border: "#cbd5e1",
    accent: "#0284c7",
  },
  blueprint: {
    bg: "#0a1a3a",
    cardBg: "#10214a",
    text: "#eaf1ff",
    muted: "#9fb6e0",
    border: "#2c477f",
    accent: "#5ba3ff",
  },
  graphite: {
    bg: "#111317",
    cardBg: "#191c22",
    text: "#eef1f5",
    muted: "#9aa3b1",
    border: "#343a45",
    accent: "#2dd4bf",
  },
  editorial: {
    bg: "#fafafa",
    cardBg: "#ffffff",
    text: "#0f172a",
    muted: "#475569",
    border: "#e2e8f0",
    accent: "#047857",
  },
  nebula: {
    bg: "#090b1a",
    cardBg: "#111735",
    text: "#eef2ff",
    muted: "#a5b4fc",
    border: "rgba(167, 139, 250, 0.28)",
    accent: "#c4b5fd",
  },
  terminal: {
    bg: "#0a0a0a",
    cardBg: "#141414",
    text: "#f5f5f5",
    muted: "#888888",
    border: "#2b2b2b",
    accent: "#4ade80",
  },
};

function escapeXml(str: string): string {
  return str.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case '"': return "&quot;";
      case "'": return "&apos;";
      default: return c;
    }
  });
}

/**
 * Wraps pure vector SVG within a high-density 1200x630 OpenGraph / Social Share Card.
 */
export function renderShareCardSvg(
  diagramSvgXml: string,
  options: ShareCardOptions = {}
): string {
  const themeKey = options.theme || "midnight";
  const colors = THEME_CARD_STYLES[themeKey] || THEME_CARD_STYLES.midnight;
  const title = options.title || "Architecture System Map";
  const variant = options.variant || "standard";

  let badgeText = "MARKDY SYSTEM MAP";
  let badgeColor = colors.accent;
  let telemetryLine = "";

  if (variant === "route") {
    const routeOpt = options as RouteCardOptions;
    badgeText = "ROUTE PATHFINDER";
    badgeColor = "#38bdf8";
    const hops = routeOpt.hops ?? 2;
    const protocol = routeOpt.protocol ? ` • ${escapeXml(routeOpt.protocol)}` : "";
    telemetryLine = `Active Route: ${escapeXml(routeOpt.from || "Origin")} → ${escapeXml(routeOpt.to || "Destination")} • ${hops} hops${protocol}`;
  } else if (variant === "reach") {
    const reachOpt = options as ReachCardOptions;
    badgeText = "BLAST RADIUS LENS";
    badgeColor = reachOpt.direction === "upstream" ? "#a78bfa" : "#22c55e";
    const dir = reachOpt.direction ? reachOpt.direction.toUpperCase() : "DOWNSTREAM";
    const count = reachOpt.impactedNodeCount ?? 3;
    const depth = reachOpt.maxDepth ?? 2;
    telemetryLine = `Root: ${escapeXml(reachOpt.rootId || "Origin")} • Direction: ${dir} • ${count} Impacted Nodes • Depth: ${depth}`;
  }

  // Parse width & height from inner SVG
  const vbMatch = diagramSvgXml.match(/viewBox="([^"]+)"/);
  let vbWidth = 1000;
  let vbHeight = 500;
  if (vbMatch) {
    const parts = vbMatch[1].split(/\s+/).map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      vbWidth = parts[2];
      vbHeight = parts[3];
    }
  }

  // Calculate inner diagram viewport scaling inside 1200x630 card
  const canvasW = 1200;
  const canvasH = 630;
  const availW = 1120;
  const availH = 460;
  const scale = Math.min(availW / vbWidth, availH / vbHeight, 1.2);
  const targetW = vbWidth * scale;
  const targetH = vbHeight * scale;
  const targetX = (canvasW - targetW) / 2;
  const targetY = 110 + (availH - targetH) / 2;

  // Clean inner SVG tags to embed cleanly without redundant nested root <svg> tags
  const cleanedInnerSvg = diagramSvgXml
    .replace(/^<\?xml[^>]*\?>/i, "")
    .replace(/^<!DOCTYPE[^>]*>/i, "")
    .trim();

  const innerContent = cleanedInnerSvg
    .replace(/^<svg[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <style>
      .card-title { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 22px; font-weight: 700; fill: ${colors.text}; }
      .card-badge { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; fill: ${badgeColor}; }
      .card-telemetry { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 13px; font-weight: 500; fill: ${colors.muted}; }
      .card-footer { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; font-weight: 600; fill: ${colors.muted}; }
    </style>
    <pattern id="cardGrid" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="${colors.border}" stroke-width="0.75" stroke-opacity="0.35"/>
    </pattern>
    <filter id="cardGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="16" stdDeviation="28" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
  </defs>

  <!-- Background Canvas -->
  <rect width="1200" height="630" fill="${colors.bg}"/>
  <rect width="1200" height="630" fill="url(#cardGrid)"/>

  <!-- Main Card Container Panel -->
  <rect x="30" y="30" width="1140" height="570" rx="16" fill="${colors.cardBg}" stroke="${colors.border}" stroke-width="1.5" filter="url(#cardGlow)"/>

  <!-- Card Header -->
  <g transform="translate(60, 72)">
    <!-- Badge Capsule -->
    <rect x="0" y="0" width="${badgeText.length * 8.5 + 24}" height="24" rx="12" fill="${colors.border}" fill-opacity="0.5"/>
    <text x="12" y="16" class="card-badge">${escapeXml(badgeText)}</text>
    
    <!-- Title -->
    <text x="${badgeText.length * 8.5 + 40}" y="18" class="card-title">${escapeXml(title)}</text>
  </g>

  <!-- Telemetry Bar (if present) -->
  ${telemetryLine ? `
  <g transform="translate(60, 110)">
    <text x="0" y="0" class="card-telemetry">${telemetryLine}</text>
  </g>` : ""}

  <!-- Embedded Scaled Diagram -->
  <g transform="translate(${targetX}, ${targetY})">
    <svg width="${targetW}" height="${targetH}" viewBox="0 0 ${vbWidth} ${vbHeight}">
      ${innerContent}
    </svg>
  </g>

  <!-- Card Footer -->
  <g transform="translate(60, 574)">
    <circle cx="6" cy="-4" r="4" fill="${colors.accent}"/>
    <text x="18" y="0" class="card-footer">markdy.com • Deterministic Vector Verification</text>
  </g>
</svg>`;
}

/**
 * Exports the live diagram container as a 1200x630 Share Card PNG Blob.
 */
export async function exportDiagramAsShareCard(
  containerEl: HTMLElement,
  options: ShareCardOptions = {}
): Promise<Blob> {
  const pixelRatio = options.pixelRatio || 2;
  const rawSvg = exportLiveSceneAsPureVectorSvg(containerEl, options);
  const cardSvg = renderShareCardSvg(rawSvg, options);
  const inlinedSvg = await inlineSerializedSvgResources(cardSvg);

  const blob = new Blob([inlinedSvg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load Share Card SVG for rasterization"));
    };
    img.src = url;
  });

  const canvas = document.createElement("canvas");
  canvas.width = 1200 * pixelRatio;
  canvas.height = 630 * pixelRatio;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    URL.revokeObjectURL(url);
    throw new Error("Could not get 2D canvas context for Share Card export");
  }

  ctx.scale(pixelRatio, pixelRatio);
  ctx.drawImage(img, 0, 0, 1200, 630);
  URL.revokeObjectURL(url);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => {
      if (b) resolve(b);
      else reject(new Error("Canvas toBlob failed for Share Card PNG"));
    }, "image/png");
  });
}

/**
 * Exports a focused message route as a 1200x630 Route Share Card PNG Blob.
 */
export async function exportRouteShareCard(
  containerEl: HTMLElement,
  route: RouteCardOptions,
  options: ShareCardOptions = {}
): Promise<Blob> {
  return exportDiagramAsShareCard(containerEl, {
    ...options,
    ...route,
    variant: "route",
  });
}

/**
 * Exports an upstream or downstream blast radius subgraph as a 1200x630 Reach Share Card PNG Blob.
 */
export async function exportReachShareCard(
  containerEl: HTMLElement,
  reach: ReachCardOptions,
  options: ShareCardOptions = {}
): Promise<Blob> {
  return exportDiagramAsShareCard(containerEl, {
    ...options,
    ...reach,
    variant: "reach",
  });
}
