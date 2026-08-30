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
    radial-gradient(circle at 50% 50%, var(--md-grid-minor) 1.2px, transparent 1.2px) 0 0 / 24px 24px,
    linear-gradient(var(--md-grid-major) 1px, transparent 1px) 0 0 / 120px 120px,
    linear-gradient(90deg, var(--md-grid-major) 1px, transparent 1px) 0 0 / 120px 120px;
  mask-image: radial-gradient(ellipse at 50% 48%, #000 65%, transparent 100%);
  opacity: 0.55;
}
.markdy-scene-root::after {
  z-index: 1;
  background:
    radial-gradient(ellipse at 50% -12%, color-mix(in srgb, var(--md-accent) 14%, transparent), transparent 50%),
    linear-gradient(180deg, transparent 0%, rgba(2, 6, 23, 0.04) 55%, var(--md-vignette) 100%);
  opacity: 0.68;
}
.markdy-scene-content { z-index: 2; }
.markdy-scene-root[data-markdy-theme="nebula"]::before {
  background:
    radial-gradient(circle at 18% 18%, color-mix(in srgb, var(--md-soft) 20%, transparent), transparent 36%),
    radial-gradient(circle at 84% 72%, color-mix(in srgb, var(--md-accent) 22%, transparent), transparent 40%),
    radial-gradient(circle at 50% 50%, var(--md-grid-minor) 1.5px, transparent 1.5px) 0 0 / 28px 28px;
  mask-image: radial-gradient(ellipse at 50% 50%, #000 70%, transparent 100%);
  opacity: 0.95;
}
.markdy-scene-root[data-markdy-theme="nebula"]::after {
  background:
    radial-gradient(ellipse at 50% 42%, color-mix(in srgb, var(--md-accent) 16%, transparent), transparent 56%),
    linear-gradient(180deg, transparent 0%, var(--md-vignette) 100%);
  opacity: 0.85;
}
.markdy-scene-root[data-markdy-theme="terminal"]::before {
  background:
    radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.08) 1px, transparent 1px) 0 0 / 20px 20px;
  mask-image: none;
  opacity: 0.45;
}
.markdy-scene-root[data-markdy-theme="terminal"]::after {
  background:
    radial-gradient(ellipse at 50% 0%, rgba(255, 90, 54, 0.1), transparent 52%),
    linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.55) 100%);
  opacity: 0.75;
}
.markdy-scene-root[data-markdy-theme="sketchy"]::before {
  background: none;
  opacity: 0;
}
.markdy-scene-root[data-markdy-theme="sketchy"]::after {
  background: none;
  opacity: 0;
}
.markdy-scene-root[data-markdy-theme="draft"]::before {
  background:
    radial-gradient(circle at 50% 50%, var(--md-grid-minor) 1.2px, transparent 1.2px) 0 0 / 24px 24px,
    linear-gradient(var(--md-grid-major) 1px, transparent 1px) 0 0 / 120px 120px,
    linear-gradient(90deg, var(--md-grid-major) 1px, transparent 1px) 0 0 / 120px 120px;
  mask-image: radial-gradient(ellipse at 50% 48%, #000 80%, transparent 100%);
  opacity: 0.85;
}
.markdy-scene-root[data-markdy-theme="draft"]::after {
  background:
    radial-gradient(ellipse at 50% -8%, color-mix(in srgb, var(--md-accent) 10%, transparent), transparent 52%),
    radial-gradient(ellipse at 50% 108%, rgba(40, 44, 55, 0.06), transparent 55%),
    linear-gradient(180deg, transparent 0%, rgba(220, 212, 196, 0.20) 70%, var(--md-vignette) 100%);
  opacity: 0.7;
}
.markdy-scene-root[data-markdy-theme="doodle"]::before {
  background:
    radial-gradient(circle at 50% 50%, rgba(24, 24, 27, 0.06) 1.5px, transparent 1.5px) 0 0 / 20px 20px;
  mask-image: none;
  opacity: 0.7;
}
.markdy-scene-root[data-markdy-theme="doodle"]::after {
  background:
    radial-gradient(ellipse at 85% 15%, rgba(244, 63, 94, 0.05), transparent 45%),
    radial-gradient(ellipse at 15% 85%, rgba(37, 99, 235, 0.05), transparent 45%);
  opacity: 0.6;
}
@keyframes markdy-star-twinkle {
  from { opacity: 0.24; transform: scale(0.85); }
  to { opacity: 0.9; transform: scale(1.15); }
}
@keyframes markdy-flow-dash {
  to { stroke-dashoffset: -32; }
}
.markdy-edge {
  transition: opacity 0.2s ease;
}
.markdy-edge-path--flowing {
  animation: markdy-flow-dash 1.1s linear infinite;
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
.markdy-scene-root[data-markdy-theme="draft"] .markdy-beat-caption {
  background: rgba(255, 255, 255, 0.96);
  border: 1.25px solid #282c37;
  color: #1a1f2c;
  box-shadow:
    2px 2px 0 rgba(40, 44, 55, 0.14),
    0 10px 24px -6px rgba(40, 44, 55, 0.12);
}
.markdy-scene-root[data-markdy-theme="doodle"] .markdy-beat-caption {
  background: #ffffff;
  border: 2px solid #18181b;
  color: #18181b;
  border-radius: 12px 16px 14px 10px;
  box-shadow: 3px 3px 0 #18181b;
  font-weight: 700;
}
.markdy-diagram-root {
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
}
.markdy-viewport {
  position: relative;
  width: 100%;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  box-sizing: border-box;
}
.markdy-footer {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  position: relative;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px 6px;
  color: var(--md-text, #f8fafc);
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border-top: none;
  z-index: 100;
  pointer-events: auto;
  flex-shrink: 0;
}
.markdy-controls {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex: 1 1 auto;
  width: auto;
  min-width: 0;
  gap: 8px;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: visible;
  scrollbar-width: none;
  -ms-overflow-style: none;
  -webkit-overflow-scrolling: touch;
  padding: 4px 4px 6px;
  margin: 0;
  position: relative;
  z-index: 10;
  pointer-events: auto;
}
.markdy-controls::-webkit-scrollbar {
  display: none;
}
.markdy-controls-group {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  position: relative;
  z-index: 5;
  pointer-events: auto;
}
.markdy-controls-playback {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.markdy-controls-timeline {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 180px;
  min-width: 110px;
  max-width: 340px;
}
.markdy-controls-tools {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  position: relative;
  z-index: 5;
  pointer-events: auto;
}
.markdy-control-divider {
  width: 1px;
  height: 14px;
  background: var(--md-divider, rgba(148, 163, 184, 0.2));
  margin: 0 2px;
  flex-shrink: 0;
}
.markdy-controls button {
  appearance: none;
  -webkit-appearance: none;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  border: 1px solid var(--md-control-border, rgba(148, 163, 184, 0.2));
  border-radius: 7px;
  background: var(--md-control-bg, rgba(255, 255, 255, 0.04));
  color: var(--md-control-text, #94a3b8);
  cursor: pointer;
  font: 600 11px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  height: 27px;
  min-width: 27px;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  white-space: nowrap;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  pointer-events: auto;
  isolation: isolate;
}
.markdy-controls button:hover:not([aria-pressed="true"]) {
  position: relative;
  z-index: 20;
  background: var(--md-control-hover-bg, rgba(255, 255, 255, 0.1));
  color: var(--md-control-hover-text, #f8fafc);
  border-color: var(--md-control-hover-border, rgba(148, 163, 184, 0.35));
  transform: translateY(-1px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.14);
}
.markdy-controls-tools button:hover:not([aria-pressed="true"]) {
  z-index: 25;
  border-color: var(--md-control-hover-border, rgba(148, 163, 184, 0.45));
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.16);
}
.markdy-controls button[aria-pressed="true"] {
  position: relative;
  z-index: 20;
  background: var(--accent, #10b981) !important;
  color: #ffffff !important;
  border-color: var(--accent, #10b981) !important;
  box-shadow: 0 0 10px var(--accent-glow, rgba(16, 185, 129, 0.4)) !important;
}
.markdy-controls button:focus-visible {
  position: relative;
  z-index: 30;
  outline: 2px solid var(--accent, #10b981);
  outline-offset: 2px;
}
.markdy-controls button:active {
  transform: translateY(0) scale(0.96);
}
.markdy-icon {
  display: inline-block;
  flex-shrink: 0;
  vertical-align: middle;
}
.markdy-control-play {
  background: var(--accent, #10b981) !important;
  color: #ffffff !important;
  border-color: var(--accent, #10b981) !important;
  padding: 0 10px !important;
  font-weight: 700 !important;
  box-shadow: 0 2px 8px var(--accent-glow, rgba(16, 185, 129, 0.35)) !important;
}
.markdy-control-play:hover {
  filter: brightness(1.08);
  box-shadow: 0 2px 12px var(--accent-glow, rgba(16, 185, 129, 0.55)) !important;
  transform: translateY(-1px) scale(1.02);
}
.markdy-badge {
  display: inline-flex;
  align-items: center;
  text-align: right;
  font-family: system-ui, sans-serif;
  font-size: 10px;
  font-weight: 400;
  color: var(--md-control-text, #94a3b8);
  text-decoration: none;
  padding: 0;
  opacity: 0.7;
  margin-left: auto;
  flex-shrink: 0;
  transition: opacity 0.15s ease, color 0.15s ease;
  white-space: nowrap;
}
.markdy-badge:hover {
  opacity: 1;
  color: var(--md-text, #f8fafc);
}
.markdy-speed-group {
  display: inline-flex;
  align-items: center;
  background: var(--md-segmented-bg, rgba(0, 0, 0, 0.18));
  border: 1px solid var(--md-control-border, rgba(148, 163, 184, 0.18));
  border-radius: 8px;
  padding: 2px;
  gap: 1px;
}
.markdy-speed-group .markdy-control-rate {
  border: none;
  background: transparent;
  border-radius: 5px;
  height: 22px;
  min-width: 25px;
  padding: 0 5px;
  font-size: 10px;
  font-weight: 700;
  color: var(--md-control-text, #94a3b8);
  box-shadow: none;
}
.markdy-speed-group .markdy-control-rate:hover:not([aria-pressed="true"]) {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
  transform: none;
}
.markdy-speed-group .markdy-control-rate[aria-pressed="true"] {
  background: var(--accent, #10b981) !important;
  color: #ffffff !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25) !important;
}
.markdy-control-time {
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 10px;
  font-weight: 600;
  color: var(--md-control-text, #94a3b8);
  white-space: nowrap;
  flex-shrink: 0;
  letter-spacing: -0.02em;
}
.markdy-btn-flashed {
  background: rgba(16, 185, 129, 0.2) !important;
  color: #10b981 !important;
  border-color: #10b981 !important;
}
/* ── Code panel overlay ───────────────────────────────────────────────── */
.markdy-code-panel-overlay {
  position: fixed;
  inset: 0;
  z-index: 100000;
  background: rgba(2, 6, 23, 0.65);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  box-sizing: border-box;
  opacity: 0;
  animation: markdy-fade-in 0.18s ease forwards;
}
.markdy-code-panel-overlay[data-closing="1"] {
  animation: markdy-fade-out 0.15s ease forwards;
}
@keyframes markdy-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes markdy-fade-out {
  from { opacity: 1; }
  to   { opacity: 0; }
}
.markdy-code-panel {
  position: relative;
  background: #0f172a;
  border: 1px solid rgba(71, 85, 105, 0.7);
  border-radius: 12px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.04);
  width: 100%;
  max-width: 780px;
  max-height: min(680px, 82vh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform: translateY(10px) scale(0.98);
  animation: markdy-panel-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.markdy-code-panel-overlay[data-closing="1"] .markdy-code-panel {
  animation: markdy-panel-out 0.15s ease forwards;
}
@keyframes markdy-panel-in {
  from { transform: translateY(12px) scale(0.97); opacity: 0; }
  to   { transform: translateY(0) scale(1);       opacity: 1; }
}
@keyframes markdy-panel-out {
  from { transform: translateY(0) scale(1);       opacity: 1; }
  to   { transform: translateY(8px) scale(0.98);  opacity: 0; }
}
.markdy-code-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 10px;
  border-bottom: 1px solid rgba(71, 85, 105, 0.4);
  flex-shrink: 0;
}
.markdy-code-panel__title {
  font: 600 12px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: #94a3b8;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.markdy-code-panel__actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.markdy-code-panel__copy,
.markdy-code-panel__playground,
.markdy-code-panel__close {
  appearance: none;
  border: 1px solid rgba(71, 85, 105, 0.55);
  border-radius: 6px;
  background: rgba(30, 41, 59, 0.8);
  color: #94a3b8;
  cursor: pointer;
  font: 600 10.5px/1.2 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  text-decoration: none;
  padding: 3px 9px;
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.markdy-code-panel__playground {
  background: var(--accent-light, rgba(16, 185, 129, 0.15));
  color: var(--accent, #10b981);
  border-color: var(--accent, #10b981);
  font-weight: 700;
}
.markdy-code-panel__playground:hover {
  background: var(--accent, #10b981);
  color: #ffffff;
  border-color: var(--accent, #10b981);
  transform: translateY(-1px);
}
.markdy-code-panel__copy:hover,
.markdy-code-panel__close:hover {
  background: rgba(51, 65, 85, 0.95);
  color: #e2e8f0;
  border-color: #64748b;
}
.markdy-code-panel__copy:focus-visible,
.markdy-code-panel__playground:focus-visible,
.markdy-code-panel__close:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 1px;
}
.markdy-code-panel__body {
  overflow-y: auto;
  flex: 1 1 auto;
  padding: 16px 20px;
  scrollbar-width: thin;
  scrollbar-color: rgba(71, 85, 105, 0.5) transparent;
}
.markdy-code-panel__body::-webkit-scrollbar {
  width: 5px;
}
.markdy-code-panel__body::-webkit-scrollbar-track {
  background: transparent;
}
.markdy-code-panel__body::-webkit-scrollbar-thumb {
  background: rgba(71, 85, 105, 0.5);
  border-radius: 9999px;
}
.markdy-code-panel__pre {
  margin: 0;
  font: 400 12.5px/1.65 "JetBrains Mono", ui-monospace, "Cascadia Code", "Fira Code", monospace;
  color: #e2e8f0;
  white-space: pre;
  tab-size: 2;
  overflow-x: auto;
}
/* Syntax tinting — purely decorative, lightweight regex-free colorization */
.markdy-code-panel__pre .t-keyword  { color: #7dd3fc; }
.markdy-code-panel__pre .t-string   { color: #86efac; }
.markdy-code-panel__pre .t-comment  { color: #64748b; font-style: italic; }
.markdy-code-panel__pre .t-edge     { color: #f9a8d4; }
.markdy-code-panel__pre .t-number   { color: #fcd34d; }
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
  background: linear-gradient(
    to right,
    var(--accent, #10b981) 0%,
    var(--accent, #10b981) var(--seek-pct, 0%),
    rgba(148, 163, 184, 0.35) var(--seek-pct, 0%),
    rgba(148, 163, 184, 0.35) 100%
  );
  border-radius: 9999px;
}
.markdy-control-seek::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  height: 13px;
  width: 13px;
  border-radius: 50%;
  background: var(--accent, #10b981);
  border: 2px solid #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  margin-top: -4.25px;
  cursor: grab;
  transition: transform 0.1s ease, box-shadow 0.15s ease;
}
.markdy-control-seek:hover::-webkit-slider-thumb {
  transform: scale(1.2);
  box-shadow: 0 0 8px var(--accent-glow, rgba(16, 185, 129, 0.6));
}
.markdy-control-seek:active::-webkit-slider-thumb {
  cursor: grabbing;
  transform: scale(1.2);
}
.markdy-control-seek::-moz-range-track {
  width: 100%;
  height: 4.5px;
  background: linear-gradient(
    to right,
    var(--accent, #10b981) 0%,
    var(--accent, #10b981) var(--seek-pct, 0%),
    rgba(148, 163, 184, 0.35) var(--seek-pct, 0%),
    rgba(148, 163, 184, 0.35) 100%
  );
  border-radius: 9999px;
}
.markdy-control-seek::-moz-range-thumb {
  height: 13px;
  width: 13px;
  border-radius: 50%;
  background: var(--accent, #10b981);
  border: 2px solid #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  cursor: grab;
  transition: transform 0.1s ease, box-shadow 0.15s ease;
}
.markdy-control-seek:hover::-moz-range-thumb {
  transform: scale(1.2);
  box-shadow: 0 0 8px var(--accent-glow, rgba(16, 185, 129, 0.6));
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
  background: var(--md-control-hover-bg, rgba(51, 65, 85, 0.95));
  color: var(--md-control-hover-text, #f8fafc);
  border-color: var(--md-control-hover-border, #94a3b8);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.25);
}
[data-markdy-theme="midnight"] .markdy-controls button[aria-pressed="true"],
[data-markdy-theme="blueprint"] .markdy-controls button[aria-pressed="true"],
[data-markdy-theme="terminal"] .markdy-controls button[aria-pressed="true"],
[data-markdy-theme="graphite"] .markdy-controls button[aria-pressed="true"],
[data-markdy-theme="nebula"] .markdy-controls button[aria-pressed="true"],
:root[data-theme="dark"] .markdy-controls button[aria-pressed="true"],
.theme-dark .markdy-controls button[aria-pressed="true"] {
  background: var(--accent, #3b82f6) !important;
  color: #ffffff !important;
  border-color: var(--accent, #3b82f6) !important;
  box-shadow: 0 0 10px var(--accent-glow, rgba(59, 130, 246, 0.5)) !important;
}
.markdy-footer a {
  transition: opacity 0.15s ease, color 0.15s ease;
}
.markdy-footer a:hover {
  opacity: 1 !important;
  color: #64748b !important;
}
/* Fullscreen & Fallback Pseudo-Fullscreen Views */
.markdy-diagram-root:fullscreen,
.markdy-diagram-root:-webkit-full-screen,
.markdy-diagram-root:-moz-full-screen,
.markdy-diagram-root:-ms-fullscreen,
.markdy-viewport:fullscreen,
.markdy-viewport:-webkit-full-screen,
.markdy-fullscreen-host,
.markdy--pseudo-fullscreen {
  position: fixed !important;
  inset: 0 !important;
  z-index: 999999 !important;
  width: 100vw !important;
  height: 100vh !important;
  max-width: 100vw !important;
  max-height: 100vh !important;
  background-color: var(--md-canvas, #0b101b) !important;
  box-sizing: border-box !important;
  display: flex !important;
  flex-direction: column !important;
  justify-content: space-between !important;
  align-items: center !important;
  padding: 16px 20px 12px !important;
  overflow: hidden !important;
}
.markdy-diagram-root:fullscreen .markdy-viewport,
.markdy-diagram-root:-webkit-full-screen .markdy-viewport,
.markdy-diagram-root:-moz-full-screen .markdy-viewport,
.markdy-diagram-root:-ms-fullscreen .markdy-viewport,
.markdy-fullscreen-host .markdy-viewport,
.markdy--pseudo-fullscreen .markdy-viewport {
  flex: 1 1 auto !important;
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: calc(100vh - 64px) !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}
.markdy-diagram-root:fullscreen .markdy-footer,
.markdy-diagram-root:-webkit-full-screen .markdy-footer,
.markdy-diagram-root:-moz-full-screen .markdy-footer,
.markdy-diagram-root:-ms-fullscreen .markdy-footer,
.markdy-fullscreen-host .markdy-footer,
.markdy--pseudo-fullscreen .markdy-footer {
  flex-shrink: 0 !important;
  width: 100% !important;
  max-width: 1400px !important;
  margin: 0 auto !important;
  padding: 8px 12px 4px !important;
}
@media (hover: none) and (pointer: coarse) {
  .markdy-controls {
    gap: 6px;
    padding: 6px 4px 8px;
  }
  .markdy-controls button {
    height: 32px;
    min-width: 32px;
    padding: 0 8px;
    font-size: 12px;
  }
  .markdy-speed-group .markdy-control-rate {
    height: 26px;
    min-width: 28px;
    font-size: 11px;
    padding: 0 6px;
  }
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

export function applyThemeVariables(element: HTMLElement, theme: ThemeTokens): void {
  element.style.setProperty("--md-canvas", theme.canvas);
  element.style.setProperty("--md-surface", theme.surface);
  element.style.setProperty("--md-surface-raised", theme.surfaceRaised);
  element.style.setProperty("--md-border", theme.border);
  element.style.setProperty("--md-text", theme.text);
  element.style.setProperty("--md-text-muted", theme.textMuted);
  element.style.setProperty("--md-paper", theme.paper ?? theme.canvas);
  element.style.setProperty("--md-ink", theme.ink ?? theme.text);
  element.style.setProperty("--md-muted", theme.muted ?? theme.textMuted);
  element.style.setProperty("--md-rule", theme.rule ?? theme.border);
  element.style.setProperty("--md-grid-minor", theme.gridMinor);
  element.style.setProperty("--md-grid-major", theme.gridMajor);
  element.style.setProperty("--md-vignette", theme.vignette);
  element.style.setProperty("--md-accent", theme.accent);
  element.style.setProperty("--accent", theme.accent);
  element.style.setProperty("--accent-glow", `color-mix(in srgb, ${theme.accent} 40%, transparent)`);
  element.style.setProperty("--accent-light", theme.accentTint ?? `color-mix(in srgb, ${theme.accent} 15%, transparent)`);
  if (theme.link) element.style.setProperty("--md-link", theme.link);
  if (theme.soft) element.style.setProperty("--md-soft", theme.soft);
  if (theme.accentTint) element.style.setProperty("--md-accent-tint", theme.accentTint);
  element.style.setProperty("--md-node-surface", theme.nodeSurface ?? theme.surface);
  element.style.setProperty("--md-node-surface-raised", theme.nodeSurfaceRaised ?? theme.surfaceRaised);
  element.style.setProperty("--md-hairline", theme.hairline ?? `color-mix(in srgb, ${theme.border} 50%, transparent)`);
  element.style.setProperty("--md-shadow", theme.shadow ?? "rgba(2, 6, 23, 0.55)");
  element.style.setProperty("--md-footer-bg", "transparent");
  element.style.setProperty("--md-footer-border", "transparent");
  element.style.setProperty("--md-control-bg", theme.surfaceRaised);
  element.style.setProperty("--md-control-border", theme.border);
  element.style.setProperty("--md-control-text", theme.textMuted);
  element.style.setProperty("--md-control-hover-bg", theme.canvas);
  element.style.setProperty("--md-control-hover-text", theme.text);
  element.style.setProperty("--md-control-hover-border", theme.accent);
  element.style.setProperty("--md-segmented-bg", `color-mix(in srgb, ${theme.surfaceRaised} 60%, transparent)`);
  element.style.setProperty("--md-divider", theme.border);
  if (theme.fonts?.title) element.style.setProperty("--md-font-title", theme.fonts.title);
  if (theme.fonts?.nodeName) element.style.setProperty("--md-font-node", theme.fonts.nodeName);
  if (theme.fonts?.mono) element.style.setProperty("--md-font-mono", theme.fonts.mono);
  if (theme.radiusMd) element.style.setProperty("--md-radius-md", `${theme.radiusMd}px`);
  if (theme.spacing) {
    for (const [key, value] of Object.entries(theme.spacing)) {
      element.style.setProperty(`--md-space-${key}`, `${value}px`);
    }
  }
  element.dataset.markdyTheme = theme.name;
  if (theme.flatCards) element.dataset.flat = "1";
}

export function applyThemeToScene(scene: HTMLElement, theme: ThemeTokens): void {
  applyThemeVariables(scene, theme);
  scene.style.background = theme.canvas;
  scene.style.color = theme.text;
}
