import type { ThemeTokens } from "@markdy/core";

const SCENE_STYLE_ID = "markdy-scene-ambience-styles";

export function ensureSceneStyles(doc: Document): void {
  if (doc.getElementById(SCENE_STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = SCENE_STYLE_ID;
  style.textContent = `
.markdy-scene-root {
  isolation: isolate;
}
.markdy-scene-root::before,
.markdy-scene-root::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.markdy-scene-root::before {
  z-index: 0;
  background:
    linear-gradient(var(--md-grid-minor) 1px, transparent 1px) 0 0 / 32px 32px,
    linear-gradient(90deg, var(--md-grid-minor) 1px, transparent 1px) 0 0 / 32px 32px,
    linear-gradient(var(--md-grid-major) 1px, transparent 1px) 0 0 / 160px 160px,
    linear-gradient(90deg, var(--md-grid-major) 1px, transparent 1px) 0 0 / 160px 160px;
  mask-image: radial-gradient(ellipse at 50% 42%, #000 55%, transparent 100%);
  opacity: 0.5;
}
.markdy-scene-root::after {
  z-index: 1;
  background:
    radial-gradient(ellipse at 50% -8%, color-mix(in srgb, var(--md-accent) 10%, transparent), transparent 46%),
    linear-gradient(180deg, transparent 0%, rgba(2, 6, 23, 0.05) 62%, var(--md-vignette) 100%);
  opacity: 0.62;
}
.markdy-scene-content { z-index: 2; }
.markdy-scene-root[data-markdy-theme="nebula"]::before {
  background:
    radial-gradient(circle at 18% 18%, color-mix(in srgb, var(--md-soft) 16%, transparent), transparent 32%),
    radial-gradient(circle at 84% 72%, color-mix(in srgb, var(--md-accent) 18%, transparent), transparent 36%),
    linear-gradient(var(--md-grid-minor) 1px, transparent 1px) 0 0 / 32px 32px,
    linear-gradient(90deg, var(--md-grid-minor) 1px, transparent 1px) 0 0 / 32px 32px;
  mask-image: none;
  opacity: 0.9;
}
.markdy-scene-root[data-markdy-theme="nebula"]::after {
  background:
    radial-gradient(ellipse at 50% 42%, color-mix(in srgb, var(--md-accent) 12%, transparent), transparent 56%),
    linear-gradient(180deg, transparent 0%, var(--md-vignette) 100%);
  opacity: 0.8;
}
.markdy-scene-root[data-markdy-theme="terminal"]::before {
  background:
    radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.06) 1px, transparent 1px) 0 0 / 22px 22px;
  mask-image: none;
  opacity: 0.4;
}
.markdy-scene-root[data-markdy-theme="terminal"]::after {
  background:
    radial-gradient(ellipse at 50% 0%, rgba(255, 90, 54, 0.08), transparent 50%),
    linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.5) 100%);
  opacity: 0.7;
}
.markdy-scene-root[data-markdy-theme="sketchy"]::before {
  background: none;
  opacity: 0;
}
.markdy-scene-root[data-markdy-theme="sketchy"]::after {
  background: none;
  opacity: 0;
}
@keyframes markdy-star-twinkle {
  from { opacity: 0.24; transform: scale(0.85); }
  to { opacity: 0.9; transform: scale(1.15); }
}
@keyframes markdy-flow-dash {
  to { stroke-dashoffset: -24; }
}
.markdy-edge {
  transition: opacity 0.2s ease;
}
.markdy-edge-path--flowing {
  animation: markdy-flow-dash 1.2s linear infinite;
}
.markdy-edge-path {
  transition: stroke 0.2s ease, stroke-width 0.2s ease, filter 0.2s ease;
}
.markdy-edge-plate {
  transition: opacity 0.2s ease, fill-opacity 0.2s ease, stroke 0.2s ease;
  pointer-events: none;
}
.markdy-edge-label {
  user-select: none;
  -webkit-user-select: none;
  pointer-events: none;
  transition: fill 0.2s ease, opacity 0.2s ease, filter 0.2s ease;
}
.markdy-constellation-star {
  transform-box: fill-box;
  transform-origin: center;
  animation: markdy-star-twinkle 5s ease-in-out infinite alternate;
}
.markdy-camera-layer {
  position: absolute;
  inset: 0;
  overflow: visible;
  transform-origin: 0 0;
  transform: translate(0px, 0px) scale(1);
}
.markdy-scene-node-layer {
  position: absolute;
  inset: 0;
  overflow: visible;
}
.markdy-beat-caption-layer {
  position: absolute;
  left: 44px;
  right: 44px;
  bottom: 30px;
  z-index: 140;
  display: grid;
  justify-items: center;
  align-items: end;
  pointer-events: none;
}
.markdy-beat-caption {
  grid-area: 1 / 1;
  max-width: min(720px, 100%);
  padding: 10px 16px;
  border-radius: 999px;
  color: var(--md-text);
  background: color-mix(in srgb, var(--md-surface-raised) 88%, transparent);
  backdrop-filter: blur(6px);
  box-shadow:
    0 14px 32px -20px var(--md-shadow, rgba(2, 6, 23, 0.55)),
    inset 0 0 0 1px var(--md-hairline, color-mix(in srgb, var(--md-border) 50%, transparent));
  font: 600 14px/1.3 Inter, ui-sans-serif, system-ui, sans-serif;
  text-align: center;
  opacity: 0;
  transform: translateY(8px);
  will-change: opacity, transform;
}
.markdy-footer {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  width: 100%;
  box-sizing: border-box;
}
.markdy-controls {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 2.5px;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
}
.markdy-controls::-webkit-scrollbar {
  display: none;
}
@media (max-width: 640px) {
  .markdy-controls {
    flex-wrap: wrap;
    justify-content: center;
    gap: 3px;
  }
}
.markdy-controls button {
  appearance: none;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  border: 1px solid var(--md-control-border, rgba(148, 163, 184, 0.45));
  border-radius: 5px;
  background: var(--md-control-bg, rgba(248, 250, 252, 0.92));
  color: var(--md-control-text, #334155);
  cursor: pointer;
  font: 600 10px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  padding: 2.5px 5.5px;
  min-height: 23px;
  min-width: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}
.markdy-controls button:hover:not([aria-pressed="true"]) {
  background: var(--md-control-hover-bg, #ffffff);
  color: var(--md-control-hover-text, #0f172a);
  border-color: var(--md-control-hover-border, #94a3b8);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
}
.markdy-controls button[aria-pressed="true"] {
  background: #0f172a !important;
  color: #ffffff !important;
  border-color: #0f172a !important;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.25) !important;
}
.markdy-controls button:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 1px;
}
.markdy-controls button:active {
  transform: scale(0.95);
}
.markdy-control-play::before { content: "▶"; font-size: 7.5px; margin-right: 1px; }
.markdy-control-play[aria-label*="Pause"]::before,
.markdy-control-play[title*="Pause"]::before { content: "⏸"; font-size: 7.5px; margin-right: 1px; }
.markdy-control-restart::before { content: "↺"; font-size: 10px; font-weight: 700; margin-right: 1px; }
.markdy-control-prev-beat::before { content: "⏮"; font-size: 7.5px; margin-right: 1px; }
.markdy-control-next-beat::before { content: "⏭"; font-size: 7.5px; margin-right: 1px; }
.markdy-control-fit::before { content: "⛶"; font-size: 8.5px; margin-right: 1px; }
.markdy-control-reset-view::before { content: "⊙"; font-size: 8.5px; margin-right: 1px; }
.markdy-control-fullscreen::before { content: "⛶"; font-size: 8.5px; margin-right: 1px; }
.markdy-control-svg::before { content: "📥"; font-size: 8.5px; margin-right: 1px; }
.markdy-control-share::before { content: "🔗"; font-size: 8.5px; margin-right: 1px; }
.markdy-control-rate {
  font-family: "JetBrains Mono", monospace, system-ui;
  font-size: 9px;
  font-weight: 600;
  padding: 2px 4.5px;
  min-width: 18px;
  min-height: 21px;
}
.markdy-control-seek {
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  cursor: pointer;
  height: 20px;
  width: clamp(35px, 5vw, 65px);
  min-width: 35px;
  max-width: 70px;
  margin: 0 1px;
}
.markdy-control-seek:focus {
  outline: none;
}
.markdy-control-seek::-webkit-slider-runnable-track {
  width: 100%;
  height: 4.5px;
  background: rgba(148, 163, 184, 0.35);
  border-radius: 9999px;
  transition: background 0.15s ease;
}
.markdy-control-seek:hover::-webkit-slider-runnable-track {
  background: rgba(148, 163, 184, 0.55);
}
.markdy-control-seek::-webkit-slider-thumb {
  -webkit-appearance: none;
  height: 13px;
  width: 13px;
  border-radius: 50%;
  background: #2563eb;
  border: 2px solid #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  margin-top: -4.25px;
  cursor: grab;
  transition: transform 0.1s ease, background 0.15s ease;
}
.markdy-control-seek:active::-webkit-slider-thumb {
  cursor: grabbing;
  transform: scale(1.2);
  background: #1d4ed8;
}
.markdy-control-seek::-moz-range-track {
  width: 100%;
  height: 4.5px;
  background: rgba(148, 163, 184, 0.35);
  border-radius: 9999px;
}
.markdy-control-seek::-moz-range-thumb {
  height: 13px;
  width: 13px;
  border-radius: 50%;
  background: #2563eb;
  border: 2px solid #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  cursor: grab;
}

[data-markdy-theme="midnight"] .markdy-controls button,
[data-markdy-theme="blueprint"] .markdy-controls button,
[data-markdy-theme="terminal"] .markdy-controls button,
[data-markdy-theme="graphite"] .markdy-controls button,
[data-markdy-theme="nebula"] .markdy-controls button,
:root[data-theme="dark"] .markdy-controls button,
.theme-dark .markdy-controls button {
  background: var(--md-control-bg, rgba(30, 41, 59, 0.85));
  border-color: var(--md-control-border, rgba(71, 85, 105, 0.55));
  color: var(--md-control-text, #cbd5e1);
}
[data-markdy-theme="midnight"] .markdy-controls button:hover:not([aria-pressed="true"]),
[data-markdy-theme="blueprint"] .markdy-controls button:hover:not([aria-pressed="true"]),
[data-markdy-theme="terminal"] .markdy-controls button:hover:not([aria-pressed="true"]),
[data-markdy-theme="graphite"] .markdy-controls button:hover:not([aria-pressed="true"]),
[data-markdy-theme="nebula"] .markdy-controls button:hover:not([aria-pressed="true"]),
:root[data-theme="dark"] .markdy-controls button:hover:not([aria-pressed="true"]),
.theme-dark .markdy-controls button:hover:not([aria-pressed="true"]) {
  background: rgba(51, 65, 85, 0.95);
  color: #f8fafc;
  border-color: #94a3b8;
}
[data-markdy-theme="midnight"] .markdy-controls button[aria-pressed="true"],
[data-markdy-theme="blueprint"] .markdy-controls button[aria-pressed="true"],
[data-markdy-theme="terminal"] .markdy-controls button[aria-pressed="true"],
[data-markdy-theme="graphite"] .markdy-controls button[aria-pressed="true"],
[data-markdy-theme="nebula"] .markdy-controls button[aria-pressed="true"],
:root[data-theme="dark"] .markdy-controls button[aria-pressed="true"],
.theme-dark .markdy-controls button[aria-pressed="true"] {
  background: #3b82f6 !important;
  color: #ffffff !important;
  border-color: #3b82f6 !important;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.5) !important;
}
.markdy-footer a {
  transition: opacity 0.15s ease, color 0.15s ease;
}
.markdy-footer a:hover {
  opacity: 1 !important;
  color: #64748b !important;
}
@media (prefers-reduced-motion: reduce) {
  .markdy-node,
  .markdy-beat-caption,
  .markdy-constellation-star,
  .markdy-edge-path,
  .markdy-edge-path--flowing {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    animation: none !important;
  }
  .markdy-node { opacity: 1 !important; transform: none !important; }
  .markdy-constellation-star { animation: none !important; opacity: 0.7 !important; }
  .markdy-edge-path--flowing { animation: none !important; }
}
@media print {
  .markdy-node { opacity: 1 !important; transform: none !important; }
  .markdy-scene-root::before, .markdy-scene-root::after { display: none !important; }
}
`;
  doc.head.appendChild(style);
}

export function applyThemeToScene(scene: HTMLElement, theme: ThemeTokens): void {
  scene.style.background = theme.canvas;
  scene.style.color = theme.text;
  scene.style.setProperty("--md-canvas", theme.canvas);
  scene.style.setProperty("--md-surface", theme.surface);
  scene.style.setProperty("--md-surface-raised", theme.surfaceRaised);
  scene.style.setProperty("--md-border", theme.border);
  scene.style.setProperty("--md-text", theme.text);
  scene.style.setProperty("--md-text-muted", theme.textMuted);
  scene.style.setProperty("--md-paper", theme.paper ?? theme.canvas);
  scene.style.setProperty("--md-ink", theme.ink ?? theme.text);
  scene.style.setProperty("--md-muted", theme.muted ?? theme.textMuted);
  scene.style.setProperty("--md-rule", theme.rule ?? theme.border);
  scene.style.setProperty("--md-grid-minor", theme.gridMinor);
  scene.style.setProperty("--md-grid-major", theme.gridMajor);
  scene.style.setProperty("--md-vignette", theme.vignette);
  scene.style.setProperty("--md-accent", theme.accent);
  if (theme.link) scene.style.setProperty("--md-link", theme.link);
  if (theme.soft) scene.style.setProperty("--md-soft", theme.soft);
  if (theme.accentTint) scene.style.setProperty("--md-accent-tint", theme.accentTint);
  scene.style.setProperty("--md-node-surface", theme.nodeSurface ?? theme.surface);
  scene.style.setProperty("--md-node-surface-raised", theme.nodeSurfaceRaised ?? theme.surfaceRaised);
  scene.style.setProperty("--md-hairline", theme.hairline ?? `color-mix(in srgb, ${theme.border} 50%, transparent)`);
  scene.style.setProperty("--md-shadow", theme.shadow ?? "rgba(2, 6, 23, 0.55)");
  if (theme.fonts?.title) scene.style.setProperty("--md-font-title", theme.fonts.title);
  if (theme.fonts?.nodeName) scene.style.setProperty("--md-font-node", theme.fonts.nodeName);
  if (theme.fonts?.mono) scene.style.setProperty("--md-font-mono", theme.fonts.mono);
  if (theme.radiusMd) scene.style.setProperty("--md-radius-md", `${theme.radiusMd}px`);
  if (theme.spacing) {
    for (const [key, value] of Object.entries(theme.spacing)) {
      scene.style.setProperty(`--md-space-${key}`, `${value}px`);
    }
  }
  scene.dataset.markdyTheme = theme.name;
  if (theme.flatCards) scene.dataset.flat = "1";
}
