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
@keyframes markdy-star-twinkle {
  from { opacity: 0.24; transform: scale(0.85); }
  to { opacity: 0.9; transform: scale(1.15); }
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
}
.markdy-controls button {
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, transform 0.05s ease;
}
.markdy-controls button:hover:not([aria-pressed="true"]) {
  background: rgba(241, 245, 249, 1);
  color: #1e293b;
  border-color: rgba(100, 116, 139, 0.6);
}
.markdy-controls button:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 1px;
}
.markdy-controls button:active {
  transform: scale(0.96);
}
.markdy-footer a {
  transition: opacity 0.15s ease, color 0.15s ease;
}
.markdy-footer a:hover {
  opacity: 1 !important;
  color: #64748b !important;
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
