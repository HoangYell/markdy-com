import { TECHNICAL_NODE_KINDS, VISUAL_PRIMITIVE_TYPES, type SceneAST, type ActorDef } from "@markdy/core";
import type { ActorState } from "./types.js";
import { stateFrom, tx, txCaption } from "./types.js";
import { createFigureEl } from "./figure.js";

const ARCHITECTURE_NODE_TYPES = new Set(Object.keys(TECHNICAL_NODE_KINDS));
const LEGACY_VISUAL_PRIMITIVE_TYPES = ["parking_map", "ascii_map", "game_scene", "byte_viz"] as const;
const VISUAL_PRIMITIVE_TYPE_SET = new Set<string>([
  ...VISUAL_PRIMITIVE_TYPES,
  ...LEGACY_VISUAL_PRIMITIVE_TYPES,
]);

const ARCHITECTURE_STYLE_ID = "markdy-architecture-node-styles";
const VISUAL_PRIMITIVE_STYLE_ID = "markdy-visual-primitive-styles";

function ensureVisualPrimitiveStyles(doc: Document): void {
  if (doc.getElementById(VISUAL_PRIMITIVE_STYLE_ID)) return;

  const style = doc.createElement("style");
  style.id = VISUAL_PRIMITIVE_STYLE_ID;
  style.textContent = `
.markdy-visual {
  --surface-a: rgba(15, 23, 42, 0.9);
  --accent: #38bdf8;
  --accent-2: #22c55e;
  position: relative;
  box-sizing: border-box;
  width: 390px;
  height: 250px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: 24px;
  color: #e5f3ff;
  background:
    radial-gradient(circle at 12% 0%, color-mix(in srgb, var(--accent) 32%, transparent), transparent 34%),
    radial-gradient(circle at 90% 15%, color-mix(in srgb, var(--accent-2) 26%, transparent), transparent 34%),
    linear-gradient(145deg, rgba(255, 255, 255, 0.13), rgba(255, 255, 255, 0.025) 32%, var(--surface-a));
  box-shadow:
    0 26px 70px rgba(2, 6, 23, 0.42),
    0 0 0 1px rgba(255, 255, 255, 0.06) inset,
    0 1px 0 rgba(255, 255, 255, 0.18) inset,
    0 0 44px color-mix(in srgb, var(--accent) 24%, transparent);
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  line-height: 1.2;
  isolation: isolate;
  contain: layout paint style;
  backdrop-filter: blur(16px) saturate(1.2);
  -webkit-backdrop-filter: blur(16px) saturate(1.2);
}
.markdy-visual,
.markdy-visual * {
  box-sizing: border-box;
}
.markdy-visual::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(90deg, transparent 0 48%, rgba(255, 255, 255, 0.09) 50%, transparent 52%) 0 0 / 34px 34px,
    linear-gradient(0deg, transparent 0 48%, rgba(255, 255, 255, 0.055) 50%, transparent 52%) 0 0 / 34px 34px;
  mask-image: linear-gradient(to bottom, rgba(0,0,0,0.85), transparent 82%);
  opacity: 0.48;
  animation: markdyGridDrift 7s linear infinite;
}
.markdy-visual::after {
  content: "";
  position: absolute;
  inset: -40% -20%;
  z-index: -1;
  background: conic-gradient(from 90deg, transparent, color-mix(in srgb, var(--accent) 20%, transparent), transparent 32%);
  opacity: 0.6;
  animation: markdyAurora 9s linear infinite;
}
.markdy-visual[data-tone="green"] { --accent: #22c55e; --accent-2: #38bdf8; }
.markdy-visual[data-tone="amber"] { --accent: #f59e0b; --accent-2: #22c55e; }
.markdy-visual[data-tone="purple"] { --accent: #a78bfa; --accent-2: #38bdf8; }
.markdy-visual[data-tone="rose"] { --accent: #fb7185; --accent-2: #f59e0b; }
.markdy-visual__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px 8px;
}
.markdy-visual__title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 15px;
  font-weight: 820;
  letter-spacing: 0.01em;
  color: #f8fafc;
}
.markdy-visual__pill {
  flex: 0 0 auto;
  border: 1px solid color-mix(in srgb, var(--accent) 42%, transparent);
  border-radius: 999px;
  padding: 4px 8px;
  color: #bae6fd;
  background: rgba(8, 47, 73, 0.54);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  box-shadow: 0 0 16px color-mix(in srgb, var(--accent) 22%, transparent);
}
.markdy-visual__body { position: absolute; inset: 48px 14px 14px; }
.markdy-visual--metric {
  width: 112px;
  height: 44px;
  border-radius: 14px;
}
.markdy-visual--grid {
  width: 190px;
  height: 92px;
  border-radius: 18px;
}
.markdy-visual--lane {
  width: 300px;
  height: 44px;
  border-radius: 999px;
}
.markdy-visual--marker {
  width: 50px;
  height: 24px;
  border-radius: 999px;
}
.markdy-visual--token_strip {
  width: 300px;
  height: 54px;
  border-radius: 16px;
}
.markdy-visual--glyph_card {
  width: 98px;
  height: 120px;
  border-radius: 22px;
}
.visual-panel__scan {
  position: absolute;
  left: 18px;
  top: 18px;
  width: 92px;
  height: 122px;
  border-radius: 24px;
  border: 1px solid color-mix(in srgb, var(--accent) 54%, transparent);
  background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 22%, transparent), transparent);
  box-shadow: 0 0 24px color-mix(in srgb, var(--accent) 28%, transparent);
  animation: markdyScanPulse 1.8s ease-in-out infinite;
}
.visual-panel__rails {
  position: absolute;
  left: 18px;
  right: 18px;
  bottom: 42px;
  height: 48px;
  border-radius: 999px;
  background:
    repeating-linear-gradient(90deg, rgba(226, 232, 240, 0.74) 0 18px, transparent 18px 34px) center / 100% 3px no-repeat,
    linear-gradient(90deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.88));
  box-shadow: 0 10px 28px rgba(2, 6, 23, 0.28) inset;
}
.visual-panel__pulse {
  position: absolute;
  left: 110px;
  right: 78px;
  bottom: 64px;
  height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, var(--accent-2), var(--accent), transparent);
  filter: drop-shadow(0 0 8px var(--accent-2));
  animation: markdyRouteFlow 1.5s linear infinite;
}
.visual-panel__cells {
  position: absolute;
  right: 18px;
  top: 22px;
  display: grid;
  grid-template-columns: repeat(4, 42px);
  gap: 7px;
}
.visual-panel__cell {
  height: 30px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.34);
  background: rgba(15, 23, 42, 0.7);
  box-shadow: 0 0 0 1px rgba(255,255,255,0.035) inset;
}
.visual-panel__cell:nth-child(3),
.visual-panel__cell:nth-child(6),
.visual-panel__cell:nth-child(8) {
  border-color: color-mix(in srgb, var(--accent-2) 78%, transparent);
  background: color-mix(in srgb, var(--accent-2) 35%, rgba(15, 23, 42, 0.7));
  animation: markdySlotGlow 1.7s ease-in-out infinite;
}
.visual-terminal__chrome {
  height: 28px;
  padding-left: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}
.visual-terminal__chrome span {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #ef4444;
  box-shadow: 14px 0 #f59e0b, 28px 0 #22c55e;
}
.visual-terminal__lines {
  position: absolute;
  left: 16px;
  right: 16px;
  top: 46px;
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 18px;
  line-height: 1.55;
  color: color-mix(in srgb, var(--accent-2) 62%, #f8fafc);
  text-shadow: 0 0 12px color-mix(in srgb, var(--accent-2) 38%, transparent);
}
.visual-terminal__line {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.visual-metric {
  height: 100%;
  padding: 7px 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
}
.visual-metric strong {
  flex: 0 0 auto;
  color: #f8fafc;
  font-size: 15px;
  line-height: 1;
}
.visual-metric span {
  min-width: 0;
  overflow: hidden;
  color: #94a3b8;
  font-size: 8px;
  font-weight: 840;
  letter-spacing: 0.08em;
  line-height: 1;
  text-overflow: ellipsis;
  text-transform: uppercase;
}
.visual-grid {
  position: absolute;
  inset: 10px;
  display: grid;
  gap: 7px;
}
.visual-grid__cell {
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(15, 23, 42, 0.74);
}
.visual-grid__cell.is-active {
  border-color: color-mix(in srgb, var(--accent-2) 78%, transparent);
  background: color-mix(in srgb, var(--accent-2) 35%, rgba(15, 23, 42, 0.74));
  box-shadow: 0 0 18px color-mix(in srgb, var(--accent-2) 26%, transparent);
}
.visual-lane {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background:
    repeating-linear-gradient(90deg, rgba(226, 232, 240, 0.76) 0 18px, transparent 18px 34px) center / 100% 3px no-repeat,
    linear-gradient(90deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.88));
  box-shadow: 0 10px 28px rgba(2, 6, 23, 0.28) inset, 0 0 18px color-mix(in srgb, var(--accent) 22%, transparent);
}
.visual-lane::after {
  content: "";
  position: absolute;
  left: 18%;
  right: 18%;
  top: 50%;
  height: 3px;
  border-radius: 999px;
  transform: translateY(-50%);
  background: linear-gradient(90deg, transparent, var(--accent-2), var(--accent), transparent);
  filter: drop-shadow(0 0 8px var(--accent-2));
  animation: markdyRouteFlow 1.5s linear infinite;
}
.visual-marker {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent), #818cf8);
  box-shadow: 0 0 18px color-mix(in srgb, var(--accent) 55%, transparent), 0 8px 18px rgba(2, 6, 23, 0.35);
}
.visual-marker::before,
.visual-marker::after {
  content: "";
  position: absolute;
  bottom: -3px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #020617;
  border: 2px solid #cbd5e1;
}
.visual-marker::before { left: 9px; }
.visual-marker::after { right: 9px; }
.visual-tokens {
  height: 100%;
  padding: 8px;
  display: flex;
  align-items: center;
  gap: 7px;
}
.visual-token {
  flex: 1 1 0;
  min-width: 0;
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 12px;
  padding: 8px 10px;
  background: rgba(2, 6, 23, 0.42);
  color: color-mix(in srgb, var(--accent) 45%, #f8fafc);
  font-family: "SFMono-Regular", Consolas, monospace;
  font-size: 12px;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.visual-glyph {
  height: 100%;
  display: grid;
  place-items: center;
  padding: 10px;
  text-align: center;
}
.visual-glyph strong {
  color: #f8fafc;
  font-size: 56px;
  line-height: 1;
}
.visual-glyph span {
  margin-top: 6px;
  color: #cbd5e1;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
@keyframes markdyGridDrift { to { background-position: 34px 34px, 34px 34px; } }
@keyframes markdyAurora { to { transform: rotate(1turn); } }
@keyframes markdyScanPulse { 50% { transform: translateX(18px); opacity: 0.72; } }
@keyframes markdySlotGlow { 50% { box-shadow: 0 0 20px color-mix(in srgb, var(--accent-2) 32%, transparent); } }
@keyframes markdyRouteFlow { to { filter: hue-rotate(70deg) drop-shadow(0 0 9px var(--accent)); } }
`;
  doc.head.appendChild(style);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toneArg(def: ActorDef, index: number, fallback = "cyan"): string {
  const tone = def.args[index]?.trim().toLowerCase() || fallback;
  return /^(cyan|green|amber|purple|rose)$/.test(tone) ? tone : fallback;
}

function parseGridSpec(spec: string | undefined): { cols: number; rows: number } {
  const match = /^(\d+)x(\d+)$/i.exec(spec?.trim() ?? "");
  const cols = match ? Number(match[1]) : 4;
  const rows = match ? Number(match[2]) : 2;
  return {
    cols: Math.min(Math.max(cols, 1), 8),
    rows: Math.min(Math.max(rows, 1), 4),
  };
}

function activeCellSet(value: string | undefined): Set<number> {
  return new Set(
    (value ?? "")
      .split(/[|\s]+/)
      .map((part) => Number(part.trim()))
      .filter((part) => Number.isInteger(part) && part > 0),
  );
}

function canonicalVisualType(type: string): string {
  switch (type) {
    case "surface": return "panel";
    case "stat": return "metric";
    case "matrix": return "grid";
    case "track": return "lane";
    case "dot": return "marker";
    case "chips": return "token_strip";
    case "glyph": return "glyph_card";
    case "parking_map":
    case "game_scene":
    case "byte_viz":
      return "panel";
    case "ascii_map":
      return "terminal";
    default: return type;
  }
}

function legacyVisualArgs(type: string, args: string[]): string[] {
  const label = args[0] || type.replace("_", " ");
  switch (type) {
    case "parking_map": return [label, "live ops", "cyan"];
    case "ascii_map": return [label, "[P1][P2][  ][EV]", "[IN]===LANE===[OUT]", "0101 0000 0100 0001", "green"];
    case "game_scene": return [label, "60 fps", "amber"];
    case "byte_viz": return [label, "UTF-8", "purple"];
    default: return args;
  }
}

function createVisualPrimitiveEl(type: string, def: ActorDef): HTMLElement {
  ensureVisualPrimitiveStyles(document);
  const visualType = canonicalVisualType(type);
  const args = legacyVisualArgs(type, def.args);
  const label = args[0] || type.replace("_", " ");
  const root = document.createElement("div");
  root.className = `markdy-visual markdy-visual--${visualType}`;
  root.dataset.visualType = visualType;
  root.setAttribute("role", "img");
  root.setAttribute("aria-label", label);

  if (visualType === "panel") {
    const tag = escapeHtml(args[1] || "live");
    root.dataset.tone = toneArg({ ...def, args }, 2);
    root.innerHTML = `
      <div class="markdy-visual__top"><div class="markdy-visual__title">${escapeHtml(label)}</div><div class="markdy-visual__pill">${tag}</div></div>
      <div class="markdy-visual__body">
        <div class="visual-panel__scan"></div>
        <div class="visual-panel__cells">${Array.from({ length: 8 }, () => '<span class="visual-panel__cell"></span>').join("")}</div>
        <div class="visual-panel__rails"></div>
        <div class="visual-panel__pulse"></div>
      </div>`;
  } else if (visualType === "terminal") {
    root.dataset.tone = toneArg({ ...def, args }, 4, "green");
    const lines = [args[1], args[2], args[3]]
      .filter((line): line is string => typeof line === "string" && line.length > 0)
      .map((line) => `<div class="visual-terminal__line">${escapeHtml(line)}</div>`)
      .join("");
    root.innerHTML = `
      <div class="markdy-visual__top"><div class="markdy-visual__title">${escapeHtml(label)}</div><div class="markdy-visual__pill">terminal</div></div>
      <div class="markdy-visual__body"><div class="visual-terminal__chrome"><span></span></div><div class="visual-terminal__lines">${lines}</div></div>`;
  } else if (visualType === "metric") {
    root.dataset.tone = toneArg({ ...def, args }, 2);
    root.innerHTML = `<div class="visual-metric"><strong>${escapeHtml(args[1] || "—")}</strong><span>${escapeHtml(label)}</span></div>`;
  } else if (visualType === "grid") {
    root.dataset.tone = toneArg({ ...def, args }, 3, "green");
    const { cols, rows } = parseGridSpec(args[1]);
    const active = activeCellSet(args[2]);
    root.innerHTML = `<div class="visual-grid" style="grid-template-columns: repeat(${cols}, 1fr);">${Array.from({ length: cols * rows }, (_, i) => `<span class="visual-grid__cell${active.has(i + 1) ? " is-active" : ""}"></span>`).join("")}</div>`;
  } else if (visualType === "lane") {
    root.dataset.tone = toneArg({ ...def, args }, 1);
    root.innerHTML = `<div class="visual-lane"></div>`;
  } else if (visualType === "marker") {
    root.dataset.tone = toneArg({ ...def, args }, 1);
    root.innerHTML = `<div class="visual-marker"></div>`;
  } else if (visualType === "token_strip") {
    root.dataset.tone = toneArg({ ...def, args }, 1, "purple");
    const tokens = (args[0] || "token").split("|").map((token) => token.trim()).filter(Boolean);
    root.innerHTML = `<div class="visual-tokens">${tokens.map((token) => `<span class="visual-token">${escapeHtml(token)}</span>`).join("")}</div>`;
  } else {
    root.dataset.tone = toneArg({ ...def, args }, 2, "purple");
    root.innerHTML = `<div class="visual-glyph"><div><strong>${escapeHtml(args[0] || "A")}</strong><span>${escapeHtml(args[1] || "glyph")}</span></div></div>`;
  }

  return root;
}

function ensureArchitectureStyles(doc: Document): void {
  if (doc.getElementById(ARCHITECTURE_STYLE_ID)) return;

  const style = doc.createElement("style");
  style.id = ARCHITECTURE_STYLE_ID;
  style.textContent = `
.markdy-arch-node {
  --markdy-node-accent: #38bdf8;
  --markdy-node-accent-2: #22c55e;
  --markdy-node-surface: rgba(15, 23, 42, 0.82);
  --markdy-node-border: rgba(148, 163, 184, 0.34);
  --markdy-node-glow: rgba(56, 189, 248, 0.24);
  position: relative;
  isolation: isolate;
  width: 184px;
  min-height: 88px;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 13px 14px;
  border: 1px solid var(--markdy-node-border);
  border-radius: 14px;
  color: #e5eefb;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.02) 34%, rgba(15, 23, 42, 0.88) 100%),
    radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--markdy-node-accent) 34%, transparent), transparent 42%),
    var(--markdy-node-surface);
  box-shadow:
    0 16px 34px rgba(2, 6, 23, 0.28),
    0 0 0 1px rgba(255, 255, 255, 0.04) inset,
    0 1px 0 rgba(255, 255, 255, 0.12) inset,
    0 0 28px var(--markdy-node-glow);
  overflow: hidden;
  contain: layout paint style;
  backdrop-filter: blur(14px) saturate(1.18);
  -webkit-backdrop-filter: blur(14px) saturate(1.18);
}
.markdy-arch-node::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(90deg, transparent 0 24%, rgba(255, 255, 255, 0.06) 50%, transparent 76%) -180px 0 / 180px 100% no-repeat,
    repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.055) 0 1px, transparent 1px 10px);
  opacity: 0.6;
}
.markdy-arch-node::after {
  content: "";
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 9px;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, var(--markdy-node-accent), var(--markdy-node-accent-2), transparent);
  opacity: 0.82;
  filter: drop-shadow(0 0 6px var(--markdy-node-accent));
}
.markdy-arch-node__icon {
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: 11px;
  background:
    radial-gradient(circle at 35% 25%, rgba(255, 255, 255, 0.28), transparent 42%),
    linear-gradient(145deg, var(--markdy-node-accent), color-mix(in srgb, var(--markdy-node-accent) 38%, #020617));
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.16) inset,
    0 10px 20px color-mix(in srgb, var(--markdy-node-accent) 25%, transparent);
}
.markdy-arch-node__icon::before,
.markdy-arch-node__icon::after {
  content: "";
  position: absolute;
  box-sizing: border-box;
  border-color: rgba(255, 255, 255, 0.9);
}
.markdy-arch-node__label {
  min-width: 0;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 15px;
  font-weight: 720;
  line-height: 1.08;
  color: #f8fafc;
  text-shadow: 0 1px 12px rgba(15, 23, 42, 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.markdy-arch-node__type {
  display: block;
  margin-top: 5px;
  font-size: 9px;
  font-weight: 740;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--markdy-node-accent) 70%, #e2e8f0);
  opacity: 0.86;
}
.markdy-arch-node[data-markdy-system-kind="compute"],
.markdy-arch-node[data-markdy-system-kind="code"] {
  --markdy-node-accent: #38bdf8;
  --markdy-node-accent-2: #818cf8;
}
.markdy-arch-node[data-markdy-system-kind="client"] {
  --markdy-node-accent: #f59e0b;
  --markdy-node-accent-2: #fb7185;
}
.markdy-arch-node[data-markdy-system-kind="data"] {
  --markdy-node-accent: #22c55e;
  --markdy-node-accent-2: #14b8a6;
}
.markdy-arch-node[data-markdy-system-kind="messaging"] {
  --markdy-node-accent: #a78bfa;
  --markdy-node-accent-2: #38bdf8;
}
.markdy-arch-node[data-markdy-system-kind="network"] {
  --markdy-node-accent: #60a5fa;
  --markdy-node-accent-2: #67e8f9;
}
.markdy-arch-node[data-markdy-system-kind="platform"] {
  --markdy-node-accent: #c084fc;
  --markdy-node-accent-2: #f472b6;
}
.markdy-arch-node[data-markdy-system-kind="security"] {
  --markdy-node-accent: #fb7185;
  --markdy-node-accent-2: #f59e0b;
}
.markdy-arch-node[data-markdy-system-kind="delivery"] {
  --markdy-node-accent: #facc15;
  --markdy-node-accent-2: #22c55e;
}
.markdy-arch-node[data-markdy-system-kind="observability"] {
  --markdy-node-accent: #2dd4bf;
  --markdy-node-accent-2: #38bdf8;
}
.markdy-arch-node[data-markdy-system-kind="flow"] {
  --markdy-node-accent: #e879f9;
  --markdy-node-accent-2: #a78bfa;
}
.markdy-arch-node[data-markdy-system-kind="distributed"] {
  --markdy-node-accent: #94a3b8;
  --markdy-node-accent-2: #38bdf8;
}
.markdy-arch-node[data-markdy-system-kind="data"] {
  border-radius: 18px 18px 24px 24px;
}
.markdy-arch-node[data-markdy-system-kind="network"] {
  border-radius: 999px;
}
.markdy-arch-node[data-markdy-system-kind="platform"] {
  border-radius: 10px;
}
.markdy-arch-node[data-markdy-system-kind="security"] {
  border-style: solid;
}
.markdy-arch-node[data-markdy-system-kind="compute"] .markdy-arch-node__icon::before,
.markdy-arch-node[data-markdy-system-kind="code"] .markdy-arch-node__icon::before {
  inset: 9px 7px;
  border-top: 3px solid rgba(255, 255, 255, 0.92);
  border-bottom: 3px solid rgba(255, 255, 255, 0.92);
}
.markdy-arch-node[data-markdy-system-kind="compute"] .markdy-arch-node__icon::after,
.markdy-arch-node[data-markdy-system-kind="code"] .markdy-arch-node__icon::after {
  inset: 14px 7px auto;
  border-top: 3px solid rgba(255, 255, 255, 0.92);
}
.markdy-arch-node[data-markdy-system-kind="client"] .markdy-arch-node__icon::before {
  left: 8px;
  right: 8px;
  top: 8px;
  height: 13px;
  border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 3px;
}
.markdy-arch-node[data-markdy-system-kind="client"] .markdy-arch-node__icon::after {
  left: 12px;
  right: 12px;
  bottom: 7px;
  border-top: 2px solid rgba(255, 255, 255, 0.92);
}
.markdy-arch-node[data-markdy-system-kind="data"] .markdy-arch-node__icon::before {
  inset: 7px 7px 9px;
  border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 50% / 16%;
}
.markdy-arch-node[data-markdy-system-kind="data"] .markdy-arch-node__icon::after {
  left: 8px;
  right: 8px;
  top: 12px;
  border-top: 2px solid rgba(255, 255, 255, 0.72);
}
.markdy-arch-node[data-markdy-system-kind="messaging"] .markdy-arch-node__icon::before {
  inset: 9px 8px;
  border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 999px;
}
.markdy-arch-node[data-markdy-system-kind="messaging"] .markdy-arch-node__icon::after {
  left: 13px;
  top: 9px;
  width: 8px;
  height: 14px;
  border-left: 2px solid rgba(255, 255, 255, 0.82);
  border-right: 2px solid rgba(255, 255, 255, 0.82);
}
.markdy-arch-node[data-markdy-system-kind="network"] .markdy-arch-node__icon::before {
  left: 7px;
  right: 7px;
  bottom: 9px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 999px;
}
.markdy-arch-node[data-markdy-system-kind="network"] .markdy-arch-node__icon::after {
  left: 10px;
  top: 7px;
  width: 13px;
  height: 13px;
  border-top: 2px solid rgba(255, 255, 255, 0.92);
  border-left: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 999px 0 0 0;
}
.markdy-arch-node[data-markdy-system-kind="platform"] .markdy-arch-node__icon::before {
  inset: 8px;
  border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 4px;
}
.markdy-arch-node[data-markdy-system-kind="platform"] .markdy-arch-node__icon::after {
  left: 10px;
  right: 10px;
  top: 14px;
  border-top: 2px solid rgba(255, 255, 255, 0.72);
}
.markdy-arch-node[data-markdy-system-kind="security"] .markdy-arch-node__icon::before {
  left: 9px;
  right: 9px;
  top: 7px;
  bottom: 7px;
  border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 10px 10px 14px 14px;
}
.markdy-arch-node[data-markdy-system-kind="security"] .markdy-arch-node__icon::after {
  left: 14px;
  right: 14px;
  top: 14px;
  border-top: 2px solid rgba(255, 255, 255, 0.82);
}
.markdy-arch-node[data-markdy-system-kind="delivery"] .markdy-arch-node__icon::before,
.markdy-arch-node[data-markdy-system-kind="observability"] .markdy-arch-node__icon::before,
.markdy-arch-node[data-markdy-system-kind="distributed"] .markdy-arch-node__icon::before {
  inset: 8px;
  border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 999px;
}
.markdy-arch-node[data-markdy-system-kind="delivery"] .markdy-arch-node__icon::after,
.markdy-arch-node[data-markdy-system-kind="observability"] .markdy-arch-node__icon::after,
.markdy-arch-node[data-markdy-system-kind="distributed"] .markdy-arch-node__icon::after {
  left: 15px;
  top: 7px;
  bottom: 7px;
  border-left: 2px solid rgba(255, 255, 255, 0.82);
}
.markdy-arch-node[data-markdy-system-kind="flow"] .markdy-arch-node__icon::before {
  inset: 8px;
  border: 2px solid rgba(255, 255, 255, 0.92);
  transform: rotate(45deg);
}
.markdy-arch-node[data-markdy-system-kind="flow"] .markdy-arch-node__icon::after {
  left: 14px;
  right: 14px;
  top: 15px;
  border-top: 2px solid rgba(255, 255, 255, 0.82);
}
`;
  doc.head.appendChild(style);
}

function isArchitectureNodeType(type: string): boolean {
  return ARCHITECTURE_NODE_TYPES.has(type);
}

function isVisualPrimitiveType(type: string): boolean {
  return VISUAL_PRIMITIVE_TYPE_SET.has(type);
}

function architectureTypeLabel(type: string): string {
  if (type === "db") return "database";
  if (type === "api") return "service";
  return type;
}

function architectureNodeKind(type: string): string {
  return TECHNICAL_NODE_KINDS[type as keyof typeof TECHNICAL_NODE_KINDS] ?? "compute";
}

// ---------------------------------------------------------------------------
// Actor element factory
// ---------------------------------------------------------------------------

export function createActorEl(
  name: string,
  def: ActorDef,
  assetDefs: SceneAST["assets"],
  assetOverrides: Record<string, string>,
): HTMLElement {
  let el: HTMLElement;

  switch (def.type) {
    case "sprite": {
      const assetName = def.args[0] ?? "";
      const assetDef = assetDefs[assetName];

      if (assetDef?.type === "icon") {
        const span = document.createElement("span");
        span.className = "iconify";
        span.style.display = "inline-block";
        span.style.fontSize = `${def.size ?? 32}px`;
        span.style.lineHeight = "1";
        span.dataset.icon = assetDef.value;
        span.setAttribute("aria-label", assetDef.value.split(":").pop() ?? "icon");
        el = span;
      } else {
        const img = document.createElement("img");
        img.src = assetOverrides[assetName] ?? assetDef?.value ?? "";
        img.alt = assetName;
        img.style.display = "block";
        img.style.maxWidth = "100%";
        img.style.maxHeight = "200px";
        img.style.objectFit = "contain";
        img.setAttribute("draggable", "false");
        el = img;
      }
      break;
    }

    case "text": {
      const div = document.createElement("div");
      div.textContent = def.args[0] ?? "";
      div.style.fontSize = `${def.size ?? 24}px`;
      div.style.fontFamily = "sans-serif";
      div.style.whiteSpace = "nowrap";
      div.style.userSelect = "none";
      div.style.pointerEvents = "none";
      // color inherits from scene element which sets a bg-contrasting color
      el = div;
      break;
    }

    case "caption": {
      // Full-width overlay ribbon. Visually heavier than a plain text actor:
      // centered horizontally, bold, slightly shadowed. Positioning math
      // (x = scene width / 2) is done at parse time via the `at top|bottom|center`
      // anchor; here we just translate(-50%, -50%) to center on that point.
      const div = document.createElement("div");
      div.textContent = def.args[0] ?? "";
      div.dataset.markdyCaption = def.anchor ?? "top";
      Object.assign(div.style, {
        fontSize: `${def.size ?? 32}px`,
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontWeight: "700",
        whiteSpace: "nowrap",
        textAlign: "center",
        lineHeight: "1.1",
        padding: "6px 14px",
        borderRadius: "4px",
        background: "rgba(0, 0, 0, 0.55)",
        color: "#fff",
        textShadow: "0 2px 6px rgba(0, 0, 0, 0.45)",
        userSelect: "none",
        pointerEvents: "none",
        // Center the caption on its (x, y) point (x = sceneWidth/2).
        // We combine translate-centering with the actor transform in the
        // dataset below so the player can re-apply on state changes.
      });
      el = div;
      break;
    }

    case "figure": {
      el = createFigureEl(def);
      break;
    }

    default: {
      // Visual primitives (canonical + friendly + legacy aliases) all share
      // one builder. Membership lives in VISUAL_PRIMITIVE_TYPE_SET so this
      // stays in sync with the vocabulary instead of a hand-listed switch.
      if (VISUAL_PRIMITIVE_TYPE_SET.has(def.type)) {
        el = createVisualPrimitiveEl(def.type, def);
        break;
      }

      if (!isArchitectureNodeType(def.type)) {
        const div = document.createElement("div");
        div.style.width  = "100px";
        div.style.height = "100px";
        div.style.background = "#999";
        div.style.boxSizing  = "border-box";
        el = div;
        break;
      }

      ensureArchitectureStyles(document);
      const card = document.createElement("div");
      card.className = "markdy-arch-node";
      card.dataset.markdySystemType = def.type;
      card.dataset.markdySystemKind = architectureNodeKind(def.type);
      card.setAttribute("role", "img");
      card.setAttribute("aria-label", `${architectureTypeLabel(def.type)} ${def.args[0] ?? name}`);

      const icon = document.createElement("span");
      icon.className = "markdy-arch-node__icon";
      icon.setAttribute("aria-hidden", "true");

      const label = document.createElement("div");
      label.className = "markdy-arch-node__label";
      label.textContent = def.args[0] ?? "";
      label.style.fontSize = `${def.size ?? 15}px`;

      const typeLabel = document.createElement("span");
      typeLabel.className = "markdy-arch-node__type";
      typeLabel.textContent = architectureTypeLabel(def.type);
      label.appendChild(typeLabel);

      card.appendChild(icon);
      card.appendChild(label);
      el = card;
      break;
    }
  }

  el.dataset.markdyActor = name;
  el.style.position = "absolute";
  el.style.left = "0";
  el.style.top = "0";
  el.style.transformOrigin = "center center";
  el.style.transform = def.type === "caption" ? txCaption(stateFrom(def)) : tx(stateFrom(def));
  el.style.opacity = String(def.opacity ?? 1);
  if (def.z !== undefined) el.style.zIndex = String(def.z);
  else if (def.type === "caption") el.style.zIndex = "100";
  else if (isVisualPrimitiveType(def.type)) el.style.zIndex = "25";
  else if (isArchitectureNodeType(def.type)) el.style.zIndex = "10";

  return el;
}
