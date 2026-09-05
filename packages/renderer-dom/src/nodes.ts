import { resolveVectorSymbol, type PositionedNode, type ThemeTokens } from "@markdy/core";

const STYLE_ID = "markdy-diagram-node-styles";

export function ensureNodeStyles(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.markdy-node {
  position: absolute;
  box-sizing: border-box;
  width: var(--md-node-w, 180px);
  height: var(--md-node-h, 76px);
  min-width: 140px;
  min-height: 64px;
  border-radius: 12px;
  background:
    linear-gradient(180deg,
      var(--md-node-surface-raised, color-mix(in srgb, var(--md-surface-raised) 92%, #ffffff 8%)),
      var(--md-node-surface, var(--md-surface)));
  color: var(--md-text);
  box-shadow:
    0 1px 3px color-mix(in srgb, var(--md-shadow, rgba(2, 6, 23, 0.35)) 35%, transparent),
    0 10px 24px -10px var(--md-shadow, rgba(2, 6, 23, 0.45)),
    inset 0 0 0 1px var(--md-hairline, color-mix(in srgb, var(--md-border) 50%, transparent)),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
  font-family: var(--md-font-node, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif);
  overflow: visible;
  opacity: 0;
  transform: translateY(8px);
  transition: box-shadow 0.25s ease, transform 0.25s ease;
}
.markdy-node[data-visible="1"] {
  opacity: 1;
  transform: translateY(0);
}
.markdy-node[data-focused="1"] {
  box-shadow:
    0 2px 6px rgba(2, 6, 23, 0.35),
    0 18px 38px -10px rgba(2, 6, 23, 0.7),
    inset 0 0 0 1.5px color-mix(in srgb, var(--md-accent) 80%, transparent),
    0 0 0 3px color-mix(in srgb, var(--md-accent) 24%, transparent);
}
.markdy-node[data-glow="1"] {
  box-shadow:
    0 2px 6px rgba(2, 6, 23, 0.35),
    0 0 0 1.5px color-mix(in srgb, var(--md-glow-color, var(--md-accent)) 70%, transparent),
    0 0 28px -2px color-mix(in srgb, var(--md-glow-color, var(--md-accent)) 55%, transparent),
    inset 0 0 18px -8px color-mix(in srgb, var(--md-glow-color, var(--md-accent)) 50%, transparent);
}
.markdy-node__rail { display: none; }
.markdy-node__type { display: none; }
.markdy-node__body {
  height: 100%;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  box-sizing: border-box;
}
.markdy-node__icon {
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--md-role-color, var(--md-accent)) 14%, transparent);
  color: var(--md-role-color, var(--md-accent));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--md-role-color, var(--md-accent)) 35%, transparent);
  transition: transform 0.2s ease;
}
.markdy-node__icon svg {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  stroke-width: 1.8;
  fill: none;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.markdy-node__icon[data-media="image"] {
  background: transparent;
  box-shadow: none;
  padding: 0;
  overflow: hidden;
}
.markdy-node__icon img {
  width: 26px;
  height: 26px;
  object-fit: contain;
  border-radius: 6px;
  display: block;
}
.markdy-node__icon[data-fit="cover"] img {
  object-fit: cover;
}
.markdy-node__content {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
}
.markdy-node__label {
  flex: 0 1 auto;
  min-width: 0;
  padding: 0;
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.24;
  color: var(--md-text);
  overflow-wrap: anywhere;
  word-break: break-word;
  text-wrap: pretty;
  white-space: pre-line;
}
.markdy-node__tech {
  align-self: flex-start;
  font-family: var(--md-font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
  font-size: 10px;
  font-weight: 500;
  line-height: 1.2;
  color: var(--md-text-muted, #94a3b8);
  background: color-mix(in srgb, var(--md-text, #ffffff) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--md-border, #475569) 55%, transparent);
  padding: 1.5px 6px;
  border-radius: 4px;
  letter-spacing: 0.01em;
  white-space: nowrap;
  max-width: 100%;
  box-sizing: border-box;
}
.markdy-node__value {
  flex: 0 0 auto;
  font-size: 16px;
  font-weight: 700;
  color: var(--md-ink, var(--md-text));
  font-variant-numeric: tabular-nums;
}
.markdy-node[data-visible="1"]:hover {
  transform: translateY(-2px);
  box-shadow:
    0 3px 8px color-mix(in srgb, var(--md-shadow, rgba(2, 6, 23, 0.35)) 45%, transparent),
    0 16px 32px -8px var(--md-shadow, rgba(2, 6, 23, 0.5)),
    inset 0 0 0 1px var(--md-hairline, color-mix(in srgb, var(--md-border) 60%, transparent)),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}
.markdy-node[data-role="client"] { border-radius: 14px 14px 10px 10px; }
.markdy-node[data-role="data"] { border-radius: 12px 12px 16px 16px; }
.markdy-scene-title {
  position: absolute;
  left: 56px;
  top: 32px;
  right: 56px;
  max-width: calc(100% - 112px);
  z-index: 130;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--md-text);
  opacity: 0;
  transform: translateY(-6px);
  font-family: var(--md-font-title, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif);
  pointer-events: none;
  word-break: break-word;
}
.markdy-scene-title[data-visible="1"] {
  opacity: 1;
  transform: translateY(0);
}
.markdy-node[data-shape="diamond"],
.markdy-node[data-shape="diamond"][data-visible="1"],
.markdy-node[data-shape="diamond"][data-focal="1"],
.markdy-node[data-shape="diamond"][data-focused="1"],
.markdy-node[data-shape="diamond"][data-glow="1"],
.markdy-scene-root .markdy-node[data-shape="diamond"],
.markdy-scene-root .markdy-node[data-shape="diamond"][data-visible="1"],
.markdy-scene-root .markdy-node[data-shape="diamond"][data-focal="1"],
.markdy-scene-root .markdy-node[data-shape="diamond"][data-focused="1"],
.markdy-scene-root .markdy-node[data-shape="diamond"][data-glow="1"],
.markdy-scene-root[data-flat="1"] .markdy-node[data-shape="diamond"],
.markdy-scene-root[data-flat="1"] .markdy-node[data-shape="diamond"][data-visible="1"],
.markdy-scene-root[data-flat="1"] .markdy-node[data-shape="diamond"][data-focal="1"],
.markdy-scene-root[data-markdy-theme="terminal"] .markdy-node[data-shape="diamond"],
.markdy-scene-root[data-markdy-theme="terminal"] .markdy-node[data-shape="diamond"][data-focal="1"],
.markdy-scene-root[data-markdy-theme="sketchy"] .markdy-node[data-shape="diamond"],
.markdy-scene-root[data-markdy-theme="sketchy"] .markdy-node[data-shape="diamond"][data-focal="1"],
.markdy-scene-root[data-markdy-theme="ink"] .markdy-node[data-shape="diamond"],
.markdy-scene-root[data-markdy-theme="ink"] .markdy-node[data-shape="diamond"][data-focal="1"],
.markdy-scene-root[data-markdy-theme="doodle"] .markdy-node[data-shape="diamond"],
.markdy-scene-root[data-markdy-theme="doodle"] .markdy-node[data-shape="diamond"][data-focal="1"],
.markdy-scene-root[data-markdy-theme="nebula"] .markdy-node[data-shape="diamond"],
.markdy-scene-root[data-markdy-theme="nebula"] .markdy-node[data-shape="diamond"][data-focal="1"] {
  border: none;
  box-shadow: none;
  background: transparent;
}
.markdy-node[data-shape="diamond"] {
  border-radius: 0;
  transform: rotate(0deg);
  clip-path: none;
  background: transparent;
  overflow: visible;
}
.markdy-node[data-shape="diamond"] .markdy-node__shape-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  overflow: visible;
  filter: drop-shadow(0 4px 16px var(--md-shadow, rgba(2, 6, 23, 0.28)));
}
.markdy-node[data-shape="diamond"] .markdy-node__diamond-polygon {
  fill: var(--md-node-surface, var(--md-surface));
  stroke: var(--md-hairline, rgba(255, 255, 255, 0.18));
  stroke-width: 1.5;
  stroke-linejoin: round;
  transition: stroke 0.2s ease, fill 0.2s ease, filter 0.2s ease;
}
.markdy-node[data-shape="diamond"] .markdy-node__diamond-facet {
  fill: none;
  stroke: rgba(255, 255, 255, 0.08);
  stroke-width: 1;
  stroke-linejoin: round;
  pointer-events: none;
}
.markdy-node[data-shape="diamond"][data-focal="1"] .markdy-node__diamond-polygon,
.markdy-node[data-shape="diamond"][data-focused="1"] .markdy-node__diamond-polygon {
  stroke: var(--md-accent);
  stroke-width: 2;
  filter: drop-shadow(0 0 6px var(--md-accent));
}
.markdy-node[data-shape="diamond"][data-glow="1"] .markdy-node__diamond-polygon {
  stroke: var(--md-glow-color, var(--md-accent));
  stroke-width: 2.2;
  filter: drop-shadow(0 0 10px var(--md-glow-color, var(--md-accent)));
}
.markdy-node[data-shape="diamond"]:hover .markdy-node__diamond-polygon {
  stroke: var(--md-role-color, var(--md-accent));
  filter: drop-shadow(0 0 8px color-mix(in srgb, var(--md-role-color, var(--md-accent)) 60%, transparent));
}
.markdy-node[data-shape="diamond"] .markdy-node__body {
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 14%;
  text-align: center;
  gap: 3px;
  position: relative;
  z-index: 2;
}
.markdy-node[data-shape="diamond"] .markdy-node__icon {
  width: 20px;
  height: 20px;
  margin-bottom: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--md-role-color, var(--md-accent));
  opacity: 0.95;
  filter: drop-shadow(0 0 4px color-mix(in srgb, var(--md-role-color, var(--md-accent)) 40%, transparent));
}
.markdy-node[data-shape="diamond"] .markdy-node__icon svg {
  width: 18px;
  height: 18px;
}
.markdy-node[data-shape="diamond"] .markdy-node__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.markdy-node[data-shape="diamond"] .markdy-node__label {
  flex: 0 1 auto;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.25;
  text-align: center;
  color: var(--md-text);
}
.markdy-node[data-shape="diamond"] .markdy-node__tech {
  align-self: center;
  font-size: 9px;
  padding: 1px 5px;
  margin-top: 2px;
}
.markdy-node[data-shape="pill"] {
  border-radius: 999px;
  min-height: 54px;
}
.markdy-node[data-shape="pill"] .markdy-node__body {
  justify-content: center;
  padding: 0 20px;
}
.markdy-node[data-shape="pill"] .markdy-node__label {
  text-align: center;
}
.markdy-node[data-shape="circle"],
.markdy-node[data-kind="dot"] {
  border-radius: 50%;
}
.markdy-node[data-shape="circle"] {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  background:
    radial-gradient(circle at 35% 35%,
      color-mix(in srgb, var(--md-role-color, var(--md-accent)) 16%, var(--md-surface) 84%),
      color-mix(in srgb, var(--md-role-color, var(--md-accent)) 6%, var(--md-surface) 94%));
  border: 1.5px solid color-mix(in srgb, var(--md-role-color, var(--md-accent)) 50%, transparent);
}
.markdy-node[data-shape="circle"] .markdy-node__body {
  flex-direction: column;
  justify-content: center;
  padding: 16px;
  gap: 8px;
  text-align: center;
}
.markdy-node[data-shape="circle"] .markdy-node__label {
  text-align: center;
}
.markdy-node[data-kind="dot"] {
  width: 64px;
  height: 64px;
}
.markdy-node[data-kind="matrix"] {
  background-image:
    linear-gradient(var(--md-hairline) 1px, transparent 1px),
    linear-gradient(90deg, var(--md-hairline) 1px, transparent 1px);
  background-size: 12px 12px;
}
.markdy-node[data-kind="track"] {
  border-left: 4px solid var(--md-role-color, var(--md-accent));
  border-radius: var(--md-radius-md, 8px);
}
.markdy-node[data-kind="token_strip"] {
  border-radius: 999px;
}
.markdy-node[data-is-container="1"] {
  background: color-mix(in srgb, var(--md-surface-raised) 25%, transparent);
  border: 1px solid color-mix(in srgb, var(--md-role-color, var(--md-accent)) 40%, var(--md-border) 60%);
  box-shadow: inset 0 0 0 1px var(--md-hairline), 0 4px 16px -4px var(--md-shadow, rgba(0,0,0,0.25));
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.markdy-node[data-is-container="1"] .markdy-node__body {
  align-items: flex-start;
  padding: 12px 16px;
}
.markdy-node[data-is-container="1"][data-focal="1"] {
  background: color-mix(in srgb, var(--md-accent-tint, var(--md-accent)) 16%, transparent);
  border: 1.5px solid color-mix(in srgb, var(--md-accent) 70%, transparent);
}
.markdy-node[data-shape="rounded"] {
  border-radius: 16px;
}
.markdy-node[data-shape="terminal"] {
  border-radius: 8px;
  font-family: var(--md-font-mono, ui-monospace, monospace);
  box-shadow: none;
  background: var(--md-node-surface, var(--md-surface));
}
.markdy-node[data-focal="1"] {
  box-shadow:
    0 2px 10px -2px var(--md-shadow, rgba(2, 6, 23, 0.18)),
    inset 0 0 0 1.5px var(--md-accent),
    0 0 0 1px color-mix(in srgb, var(--md-accent) 25%, transparent);
}
.markdy-scene-root[data-markdy-theme="nebula"] .markdy-node {
  border: 1px solid color-mix(in srgb, var(--md-role-color, var(--md-accent)) 34%, transparent);
  box-shadow:
    0 0 24px -14px color-mix(in srgb, var(--md-role-color, var(--md-accent)) 80%, transparent),
    inset 0 0 0 1px var(--md-hairline);
}
.markdy-scene-root[data-markdy-theme="nebula"] .markdy-node[data-focal="1"] {
  box-shadow:
    0 0 34px -8px color-mix(in srgb, var(--md-accent) 78%, transparent),
    inset 0 0 0 1.5px var(--md-accent);
}
.markdy-scene-root[data-flat="1"] .markdy-node {
  box-shadow: inset 0 0 0 1px var(--md-hairline, color-mix(in srgb, var(--md-border) 50%, transparent));
}
.markdy-scene-root[data-flat="1"] .markdy-node[data-visible="1"] {
  box-shadow: inset 0 0 0 1px var(--md-hairline, color-mix(in srgb, var(--md-border) 50%, transparent));
}
.markdy-scene-root[data-flat="1"] .markdy-node[data-focal="1"] {
  box-shadow: inset 0 0 0 1.5px var(--md-accent);
}
.markdy-node[data-kind="external"] {
  border: 1.2px dashed color-mix(in srgb, var(--md-ink, var(--md-text)) 30%, transparent);
  background: color-mix(in srgb, var(--md-ink, var(--md-text)) 3%, transparent);
  box-shadow: none;
}
.markdy-node[data-kind="optional"] {
  border: 1px dashed color-mix(in srgb, var(--md-ink, var(--md-text)) 20%, transparent);
  background: color-mix(in srgb, var(--md-ink, var(--md-text)) 2%, transparent);
  box-shadow: none;
  opacity: 0.7;
}
.markdy-scene-root[data-markdy-theme="terminal"] .markdy-node {
  background: var(--md-node-surface, #141414);
  border: 1px solid #2b2b2b;
  box-shadow: none;
  font-family: var(--md-font-mono, ui-monospace, monospace);
}
.markdy-scene-root[data-markdy-theme="terminal"] .markdy-node[data-focal="1"] {
  border-color: #ff5a36;
  box-shadow: 0 0 18px -8px rgba(255, 90, 54, 0.45);
}
.markdy-scene-root[data-markdy-theme="terminal"] .markdy-node[data-shape="diamond"] {
  filter: drop-shadow(0 0 1px #2b2b2b);
}
.markdy-scene-root[data-markdy-theme="terminal"] .markdy-node[data-shape="diamond"][data-focal="1"] {
  filter: drop-shadow(0 0 2px #ff5a36) drop-shadow(0 0 12px rgba(255, 90, 54, 0.35));
}
.markdy-scene-root[data-markdy-theme="sketchy"] .markdy-node {
  background: #ffffff;
  border: 1.5px solid #2d3142;
  box-shadow: 3px 3px 0 rgba(45, 49, 66, 0.10);
  border-radius: var(--md-radius-md, 4px);
}
.markdy-scene-root[data-markdy-theme="sketchy"] .markdy-node[data-shape="diamond"] {
  filter: drop-shadow(0 0 1px #2d3142) drop-shadow(3px 3px 0 rgba(45, 49, 66, 0.12));
}
.markdy-scene-root[data-markdy-theme="sketchy"] .markdy-node[data-focal="1"] {
  border-color: #eb6c36;
  background: rgba(235, 108, 54, 0.06);
  box-shadow: 3px 3px 0 rgba(235, 108, 54, 0.12);
}
.markdy-scene-root[data-markdy-theme="ink"] .markdy-node {
  background: #ffffff;
  border: 1.5px solid #1d4ed8;
  box-shadow:
    3px 3px 0 rgba(29, 78, 216, 0.12),
    0 4px 16px -2px rgba(29, 78, 216, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  border-radius: var(--md-radius-md, 6px);
}
.markdy-scene-root[data-markdy-theme="ink"] .markdy-node[data-visible="1"]:hover {
  transform: translate(-1px, -1px);
  box-shadow:
    4px 4px 0 rgba(29, 78, 216, 0.18),
    0 8px 24px -4px rgba(29, 78, 216, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}
.markdy-scene-root[data-markdy-theme="ink"] .markdy-node__icon {
  background: color-mix(in srgb, var(--md-role-color, var(--md-accent)) 10%, #ffffff);
  border: 1px solid color-mix(in srgb, var(--md-role-color, var(--md-accent)) 30%, transparent);
  border-radius: 6px;
  width: 30px;
  height: 30px;
}
.markdy-scene-root[data-markdy-theme="ink"] .markdy-node__tech {
  background: #eff6ff;
  color: #1e3a8a;
  border: 1px solid #bfdbfe;
  border-radius: 4px;
  font-weight: 600;
}
.markdy-scene-root[data-markdy-theme="ink"] .markdy-node[data-shape="diamond"] {
  filter: drop-shadow(0 0 1px #1d4ed8) drop-shadow(3px 3px 0 rgba(29, 78, 216, 0.12));
}
.markdy-scene-root[data-markdy-theme="ink"] .markdy-node[data-focal="1"] {
  border-color: #1d4ed8;
  background: linear-gradient(180deg, #ffffff 0%, #f0f7ff 100%);
  box-shadow:
    3px 3px 0 rgba(29, 78, 216, 0.25),
    0 8px 24px -4px rgba(29, 78, 216, 0.18),
    inset 0 1px 0 #ffffff;
}
.markdy-scene-root[data-markdy-theme="ink"] .markdy-node[data-focal="1"] .markdy-node__icon {
  background: rgba(29, 78, 216, 0.12);
  border-color: rgba(29, 78, 216, 0.40);
}
.markdy-scene-root[data-markdy-theme="ink"] .markdy-node[data-shape="diamond"][data-focal="1"] {
  filter: drop-shadow(0 0 1.5px #1d4ed8) drop-shadow(3px 3px 0 rgba(29, 78, 216, 0.25)) drop-shadow(0 6px 20px rgba(29, 78, 216, 0.16));
}
.markdy-scene-root[data-markdy-theme="doodle"] .markdy-node {
  background: #ffffff;
  border: 2px solid #18181b;
  border-radius: 255px 15px 225px 15px/15px 225px 15px 255px;
  box-shadow: 4px 4px 0 #18181b, 0 8px 16px -4px rgba(24, 24, 27, 0.08);
}
.markdy-scene-root[data-markdy-theme="doodle"] .markdy-node[data-visible="1"]:hover {
  transform: translate(-1.5px, -1.5px) rotate(-0.6deg);
  box-shadow: 5.5px 5.5px 0 #18181b, 0 10px 20px -4px rgba(24, 24, 27, 0.12);
}
.markdy-scene-root[data-markdy-theme="doodle"] .markdy-node__icon {
  background: color-mix(in srgb, var(--md-role-color, var(--md-accent)) 16%, #ffffff);
  border: 1.75px solid #18181b;
  border-radius: 50% 45% 55% 48% / 48% 55% 45% 50%;
  width: 30px;
  height: 30px;
  box-shadow: 1.5px 1.5px 0 #18181b;
}
.markdy-scene-root[data-markdy-theme="doodle"] .markdy-node__tech {
  background: #fef08a;
  color: #18181b;
  border: 1.5px solid #18181b;
  border-radius: 4px 8px 5px 7px;
  font-weight: 800;
  box-shadow: 2px 2px 0 #18181b;
  transform: rotate(-1.2deg);
}
.markdy-scene-root[data-markdy-theme="doodle"] .markdy-node[data-shape="diamond"] {
  filter: drop-shadow(0 0 1px #18181b) drop-shadow(4px 4px 0 #18181b);
}
.markdy-scene-root[data-markdy-theme="doodle"] .markdy-node[data-focal="1"] {
  border: 2.25px solid #18181b;
  background: linear-gradient(135deg, #ffffff 0%, #fff1f2 100%);
  box-shadow: 4.5px 4.5px 0 #f43f5e, 0 0 0 2px #18181b;
}
.markdy-scene-root[data-markdy-theme="doodle"] .markdy-node[data-focal="1"] .markdy-node__icon {
  background: #f43f5e;
  color: #ffffff;
  border-color: #18181b;
}
.markdy-scene-root[data-markdy-theme="doodle"] .markdy-node[data-shape="diamond"][data-focal="1"] {
  filter: drop-shadow(0 0 1.5px #18181b) drop-shadow(4.5px 4.5px 0 #f43f5e);
}
.markdy-scene-root[data-markdy-theme="nebula"] .markdy-node[data-shape="diamond"] {
  filter: drop-shadow(0 0 1px var(--md-hairline)) drop-shadow(0 0 18px -4px color-mix(in srgb, var(--md-role-color, var(--md-accent)) 60%, transparent));
}
.markdy-scene-root[data-markdy-theme="nebula"] .markdy-node[data-shape="diamond"][data-focal="1"] {
  filter: drop-shadow(0 0 2px var(--md-accent)) drop-shadow(0 0 24px -2px color-mix(in srgb, var(--md-accent) 70%, transparent));
}
`;
  doc.head.appendChild(style);
}

type SvgSpec = Array<[string, Record<string, string>]>;
export type IconSpec = SvgSpec;

const ICONS: Record<string, SvgSpec> = {
  compute: [
    ["rect", { x: "5", y: "5", width: "14", height: "14", rx: "3" }],
    ["path", { d: "M9 9h6v6H9zM9 2.5v2.5M15 2.5v2.5M9 19v2.5M15 19v2.5M2.5 9h2.5M2.5 15h2.5M19 9h2.5M19 15h2.5" }],
  ],
  laptop: [
    ["path", { d: "M3 19l18 0" }],
    ["path", { d: "M5 7a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v8a1 1 0 0 1 -1 1h-12a1 1 0 0 1 -1 -1l0 -8" }],
  ],
  phone: [
    ["path", { d: "M6 5a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2v-14" }],
    ["path", { d: "M10.5 18h3" }],
  ],
  user: [
    ["circle", { cx: "12", cy: "8", r: "3.4" }],
    ["path", { d: "M5.5 20a6.5 6.5 0 0 1 13 0" }],
  ],
  browser: [
    ["rect", { x: "3", y: "5", width: "18", height: "14", rx: "2.5" }],
    ["path", { d: "M3 9h18" }],
    ["path", { d: "M7 7h.01M10 7h.01" }],
  ],
  service: [
    ["path", { d: "M12 3 4.5 7.2 12 11.4l7.5-4.2L12 3Z" }],
    ["path", { d: "M4.5 12 12 16.2 19.5 12" }],
    ["path", { d: "M4.5 16.8 12 21l7.5-4.2" }],
  ],
  gateway: [
    ["circle", { cx: "5", cy: "12", r: "2" }],
    ["circle", { cx: "19", cy: "6", r: "2" }],
    ["circle", { cx: "19", cy: "18", r: "2" }],
    ["path", { d: "M7 12h4l5.5-5" }],
    ["path", { d: "M11 12l5.5 5" }],
  ],
  queue: [
    ["rect", { x: "5", y: "5", width: "14", height: "4", rx: "1.4" }],
    ["rect", { x: "5", y: "10", width: "14", height: "4", rx: "1.4" }],
    ["rect", { x: "5", y: "15", width: "14", height: "4", rx: "1.4" }],
  ],
  worker: [
    ["circle", { cx: "12", cy: "12", r: "3.2" }],
    ["path", { d: "M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1" }],
  ],
  database: [
    ["ellipse", { cx: "12", cy: "5.5", rx: "7", ry: "3" }],
    ["path", { d: "M5 5.5v10c0 1.7 3.1 3 7 3s7-1.3 7-3v-10" }],
    ["path", { d: "M5 10.5c0 1.7 3.1 3 7 3s7-1.3 7-3" }],
  ],
  storage: [
    ["path", { d: "M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z" }],
    ["path", { d: "M4 8.5 12 13l8-4.5" }],
    ["path", { d: "M12 13v7" }],
  ],
  cdn: [
    ["circle", { cx: "12", cy: "12", r: "8" }],
    ["path", { d: "M4 12h16M12 4c2.2 2.1 3.3 4.8 3.3 8S14.2 17.9 12 20M12 4c-2.2 2.1-3.3 4.8-3.3 8S9.8 17.9 12 20" }],
  ],
  cache: [
    ["path", { d: "M13 2 5 13h6l-1 9 9-13h-6l0-7Z" }],
  ],
  code: [
    ["path", { d: "m9 18-6-6 6-6" }],
    ["path", { d: "m15 6 6 6-6 6" }],
    ["path", { d: "m14 4-4 16" }],
  ],
  messaging: [
    ["path", { d: "M4 6h16v10H8l-4 4V6Z" }],
    ["path", { d: "M8 10h8M8 13h5" }],
  ],
  network: [
    ["circle", { cx: "6", cy: "7", r: "2" }],
    ["circle", { cx: "18", cy: "7", r: "2" }],
    ["circle", { cx: "12", cy: "18", r: "2" }],
    ["path", { d: "M8 8.5 11 16M16 8.5 13 16M8 7h8" }],
  ],
  platform: [
    ["rect", { x: "4", y: "5", width: "16", height: "14", rx: "2.5" }],
    ["path", { d: "M8 9h8M8 13h8M8 17h4" }],
  ],
  security: [
    ["path", { d: "M12 3 5 6v5c0 4.5 3 7.7 7 10 4-2.3 7-5.5 7-10V6l-7-3Z" }],
    ["path", { d: "M9.5 12.5 11.2 14 15 10" }],
  ],
  delivery: [
    ["path", { d: "M4 7h10" }],
    ["path", { d: "M4 12h16" }],
    ["path", { d: "M4 17h10" }],
    ["path", { d: "m16 7 4 5-4 5" }],
  ],
  observability: [
    ["path", { d: "M4 14s2.5-5 8-5 8 5 8 5-2.5 5-8 5-8-5-8-5Z" }],
    ["circle", { cx: "12", cy: "14", r: "2.5" }],
  ],
  distributed: [
    ["circle", { cx: "6", cy: "12", r: "2.5" }],
    ["circle", { cx: "18", cy: "6", r: "2.5" }],
    ["circle", { cx: "18", cy: "18", r: "2.5" }],
    ["path", { d: "M8.4 11 15.6 7M8.4 13 15.6 17" }],
  ],
  server: [
    ["rect", { x: "4", y: "4.5", width: "16", height: "6.5", rx: "2" }],
    ["rect", { x: "4", y: "13", width: "16", height: "6.5", rx: "2" }],
    ["path", { d: "M7.5 7.75h.01M7.5 16.25h.01" }],
    ["path", { d: "M11 7.75h6M11 16.25h6" }],
  ],
  scheduler: [
    ["circle", { cx: "12", cy: "12", r: "8" }],
    ["path", { d: "M12 7.5V12l3.2 2" }],
  ],
  key: [
    ["circle", { cx: "8.5", cy: "8.5", r: "3.6" }],
    ["path", { d: "M11.1 11.1 19 19" }],
    ["path", { d: "M16.4 16.4l1.8 1.8M18.2 13.6l1.8 1.8" }],
  ],
  pod: [
    ["path", { d: "M12 3 20 7.5v9L12 21 4 16.5v-9L12 3Z" }],
    ["path", { d: "M8.75 10.5h6.5v5h-6.5z" }],
  ],
  function: [
    ["rect", { x: "4", y: "4", width: "16", height: "16", rx: "4.5" }],
    ["path", { d: "M13.2 7.5 9.5 12.4h3.4L11 16.5" }],
  ],
  lock: [
    ["rect", { x: "5", y: "11", width: "14", height: "9", rx: "2.2" }],
    ["path", { d: "M8 11V8a4 4 0 0 1 8 0v3" }],
    ["path", { d: "M12 14.8v2.4" }],
  ],
  metrics: [
    ["path", { d: "M4 20h16" }],
    ["rect", { x: "5", y: "11", width: "2.6", height: "6", rx: "0.6" }],
    ["rect", { x: "10.7", y: "6.5", width: "2.6", height: "10.5", rx: "0.6" }],
    ["rect", { x: "16.4", y: "13", width: "2.6", height: "4", rx: "0.6" }],
  ],
  mobile: [
    ["rect", { x: "7", y: "3", width: "10", height: "18", rx: "2.6" }],
    ["path", { d: "M10.5 18h3" }],
  ],
  registry: [
    ["rect", { x: "3.5", y: "13", width: "7", height: "6", rx: "1" }],
    ["rect", { x: "13.5", y: "13", width: "7", height: "6", rx: "1" }],
    ["rect", { x: "8.5", y: "5", width: "7", height: "6", rx: "1" }],
  ],
  flow: [
    ["path", { d: "M5 12h14" }],
    ["path", { d: "m13 6 6 6-6 6" }],
  ],
  decision: [
    ["path", { d: "M12 3 21 12 12 21 3 12 12 3Z" }],
    ["path", { d: "M12 8v4" }],
    ["path", { d: "M12 16h.01" }],
  ],
  hub: [
    ["circle", { cx: "12", cy: "12", r: "7.5" }],
    ["circle", { cx: "12", cy: "12", r: "2.8" }],
  ],
  station: [
    ["rect", { x: "4", y: "4", width: "16", height: "16", rx: "4" }],
    ["circle", { cx: "12", cy: "12", r: "3" }],
  ],
  bronze: [
    ["rect", { x: "4", y: "5", width: "16", height: "5", rx: "1.5" }],
    ["rect", { x: "4", y: "14", width: "16", height: "5", rx: "1.5" }],
  ],
  silver: [
    ["path", { d: "M12 2 20 7v10l-8 5-8-5V7z" }],
  ],
  gold: [
    ["path", { d: "M12 2.5 15 8.5l6.5 1-4.7 4.6 1.1 6.4L12 17.5 6.1 20.5l1.1-6.4L2.5 9.5l6.5-1z" }],
  ],
  terminal: [
    ["rect", { x: "3", y: "4", width: "18", height: "16", rx: "2.5" }],
    ["path", { d: "m7 9 3 3-3 3M13 15h4" }],
  ],
  cloud: [
    ["path", { d: "M7 16a4 4 0 0 1-.88-7.9 5 5 0 0 1 9.76-1.1A4 4 0 0 1 17 16H7z" }],
  ],
  firewall: [
    ["path", { d: "M12 3v18M3 8h18M3 16h18M7.5 3v5M16.5 3v5M7.5 16v5M16.5 16v5M12 8v8" }],
  ],
  alert: [
    ["path", { d: "M12 3 2 20h20L12 3z" }],
    ["path", { d: "M12 9v4M12 17h.01" }],
  ],
  sync: [
    ["path", { d: "M20 11A8 8 0 0 0 5.6 6.4L3 9" }],
    ["path", { d: "M3 4v5h5M4 13a8 8 0 0 0 14.4 4.6L21 15" }],
    ["path", { d: "M21 20v-5h-5" }],
  ],
  search: [
    ["circle", { cx: "11", cy: "11", r: "6.5" }],
    ["path", { d: "m19 19-3.5-3.5" }],
  ],
  log: [
    ["rect", { x: "4", y: "3", width: "16", height: "18", rx: "2" }],
    ["path", { d: "M8 7h8M8 11h8M8 15h4" }],
  ],
  layers: [
    ["path", { d: "M12 2 2 7l10 5 10-5-10-5z" }],
    ["path", { d: "M2 17l10 5 10-5" }],
    ["path", { d: "M2 12l10 5 10-5" }],
  ],
  nested: [
    ["rect", { x: "3", y: "3", width: "18", height: "18", rx: "3" }],
    ["rect", { x: "7", y: "7", width: "10", height: "10", rx: "2" }],
  ],
};

/** Read-only monochrome glyph registry; callers can inspect or choose keys without injecting markup. */
export const ICON_REGISTRY: Readonly<Record<string, IconSpec>> = Object.freeze(ICONS);

export function iconKeyForNode(node: PositionedNode): string {
  const override = typeof node.props?.icon === "string" ? node.props.icon.toLowerCase() : undefined;
  if (override && ICONS[override]) return override;
  if (override && resolveVectorSymbol(override)) return override;
  if (node.kind === "api_gateway" || node.kind === "gateway" || node.kind === "load_balancer" || node.kind === "ingress") return "gateway";
  if (node.kind === "db" || node.kind === "database" || node.kind === "sql" || node.kind === "nosql" || node.kind === "warehouse") return "database";
  if (node.kind === "bucket" || node.kind === "object_store" || node.kind === "blob" || node.kind === "volume" || node.kind === "disk") return "storage";
  if (node.kind === "cdn" || node.kind === "dns" || node.kind === "internet") return "cdn";
  if (node.kind === "queue" || node.kind === "topic" || node.kind === "stream" || node.kind === "event_bus" || node.kind === "broker") return "queue";
  if (node.kind === "scheduler" || node.kind === "cron") return "scheduler";
  if (node.kind === "worker" || node.kind === "job" || node.kind === "batch") return "worker";
  if (node.kind === "function" || node.kind === "lambda") return "function";
  if (node.kind === "pod" || node.kind === "container" || node.kind === "sidecar") return "pod";
  if (node.kind === "secret" || node.kind === "key" || node.kind === "certificate" || node.kind === "vault") return "key";
  if (node.kind === "auth" || node.kind === "oauth" || node.kind === "oidc" || node.kind === "jwt" || node.kind === "lock") return "lock";
  if (node.kind === "firewall" || node.kind === "waf" || node.kind === "vpn" || node.kind === "bastion") return "security";
  if (node.kind === "proxy" || node.kind === "reverse_proxy" || node.kind === "router" || node.kind === "nat" || node.kind === "switch") return "gateway";
  if (node.kind === "monitor" || node.kind === "metrics" || node.kind === "dashboard" || node.kind === "slo" || node.kind === "probe") return "metrics";
  if (node.kind === "registry" || node.kind === "artifact") return "registry";
  if (node.kind === "mobile") return "mobile";
  if (node.kind === "laptop" || node.kind === "desktop") return node.kind;
  if (node.kind === "api" || node.kind === "service" || node.kind === "microservice" || node.kind === "backend" || node.kind === "server" || node.kind === "handler" || node.kind === "controller") return "server";
  if (node.kind === "browser" || node.kind === "web" || node.kind === "frontend" || node.kind === "app") return "browser";
  if (node.kind === "user" || node.kind === "client") return "user";
  if (node.kind === "cloud") return "cloud";
  if (node.kind === "firewall") return "firewall";
  if (node.kind === "alert" || node.kind === "alarm") return "alert";
  if (node.kind === "sync") return "sync";
  if (node.kind === "search") return "search";
  if (node.kind === "log" || node.kind === "audit") return "log";
  if (node.kind === "layers" || node.kind === "stack") return "layers";
  if (node.kind === "nested") return "nested";
  if (node.kind === "decision" || node.kind === "condition") return "decision";
  if (node.kind === "cache") return "cache";
  return ICONS[node.kind] ? node.kind : node.role;
}

function appendGlyph(doc: Document, wrap: HTMLElement, spec: SvgSpec): void {
  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke-width", "1.75");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  for (const [tag, attrs] of spec) {
    const child = doc.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [name, value] of Object.entries(attrs)) child.setAttribute(name, value);
    svg.appendChild(child);
  }
  wrap.appendChild(svg);
}

/** Resolve a node's `image=`/`logo=` value, applying host asset overrides. */
function resolveImageSrc(node: PositionedNode, assets?: Record<string, string>): string | undefined {
  const raw = node.props?.image ?? node.props?.logo;
  if (typeof raw !== "string" || raw.length === 0) return undefined;
  return assets?.[raw] ?? raw;
}

function createNodeMediaEl(doc: Document, node: PositionedNode, assets?: Record<string, string>): HTMLElement {
  const wrap = doc.createElement("div");
  wrap.className = "markdy-node__icon";
  wrap.setAttribute("aria-hidden", "true");

  const imgSrc = resolveImageSrc(node, assets);
  if (imgSrc) {
    wrap.dataset.media = "image";
    const fit = typeof node.props?.imageFit === "string" ? node.props.imageFit.toLowerCase() : "contain";
    wrap.dataset.fit = fit === "cover" ? "cover" : "contain";
    const img = doc.createElement("img");
    img.src = imgSrc;
    img.alt = "";
    img.decoding = "async";
    img.loading = "lazy";
    img.referrerPolicy = "no-referrer";
    // Fall back to the semantic glyph if the image fails to load.
    img.addEventListener("error", () => {
      wrap.removeAttribute("data-media");
      wrap.removeAttribute("data-fit");
      wrap.textContent = "";
      appendGlyph(doc, wrap, ICONS[iconKeyForNode(node)] ?? ICONS.service);
    });
    wrap.appendChild(img);
    return wrap;
  }

  const symbolKey = typeof node.props?.icon === "string" ? node.props.icon : typeof node.props?.symbol === "string" ? node.props.symbol : undefined;
  const vectorSymbol = symbolKey ? resolveVectorSymbol(symbolKey) : null;
  if (vectorSymbol) {
    wrap.dataset.vectorSymbol = vectorSymbol.name;
    const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", vectorSymbol.viewBox);
    svg.setAttribute("width", "26");
    svg.setAttribute("height", "26");
    if (vectorSymbol.brandColor) {
      svg.style.color = vectorSymbol.brandColor;
    }
    svg.innerHTML = vectorSymbol.svgPaths;
    wrap.appendChild(svg);
    return wrap;
  }

  appendGlyph(doc, wrap, ICONS[iconKeyForNode(node)] ?? ICONS.service);
  return wrap;
}

export function applyDeclaredNodeStyle(el: HTMLElement, style?: Record<string, unknown>): void {
  if (!style) return;
  const fill = typeof style.fill === "string" ? style.fill : undefined;
  const surface = typeof style.surface === "string" ? style.surface : fill;
  // Derive a slightly lighter top tone so custom fills keep the premium card gradient.
  const surfaceRaised =
    typeof style.surfaceRaised === "string"
      ? style.surfaceRaised
      : surface
        ? `color-mix(in srgb, ${surface} 90%, #ffffff 10%)`
        : undefined;
  const stroke = typeof style.stroke === "string" ? style.stroke : undefined;
  const text = typeof style.text === "string" ? style.text : undefined;
  const accent = typeof style.accent === "string" ? style.accent : undefined;

  if (surface) el.style.setProperty("--md-node-surface", surface);
  if (surfaceRaised) el.style.setProperty("--md-node-surface-raised", surfaceRaised);
  if (stroke) el.style.setProperty("--md-hairline", stroke);
  if (text) el.style.color = text;
  if (accent) el.style.setProperty("--md-role-color", accent);
}

export function createNodeEl(node: PositionedNode, theme: ThemeTokens, assets?: Record<string, string>): HTMLElement {
  const el = document.createElement("div");
  el.className = "markdy-node markdy-scene-node";
  el.dataset.node = node.id;
  el.dataset.nodeId = node.id;
  el.setAttribute("data-node-id", node.id);
  el.setAttribute("data-node", node.id);
  el.id = `node-${node.id}`;
  el.style.left = `${node.x}px`;
  el.style.top = `${node.y}px`;
  el.style.setProperty("--md-node-w", `${node.width}px`);
  el.style.setProperty("--md-node-h", `${node.height}px`);
  if (theme.flatCards) {
    el.style.setProperty("--md-shadow", "transparent");
  }
  if (theme.accentTint) el.style.setProperty("--md-accent-tint", theme.accentTint);
  const roleColor = theme.roles[node.role] ?? theme.accent;
  el.style.setProperty("--md-role-color", roleColor);
  applyDeclaredNodeStyle(el, node.style);
  const typeText = node.kind.replace(/_/g, " ");
  el.dataset.kind = node.kind;
  el.dataset.icon = iconKeyForNode(node);
  if (node.shape) el.dataset.shape = node.shape;
  if (node.focal) el.dataset.focal = "1";
  if (node.shape === "container") el.dataset.isContainer = "1";
  el.title = `${node.label} (${typeText})`;
  el.setAttribute("aria-label", el.title);

  if (node.shape === "diamond") {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "markdy-node__shape-svg");
    svg.setAttribute("viewBox", `0 0 ${node.width} ${node.height}`);
    svg.setAttribute("aria-hidden", "true");

    const hw = node.width / 2;
    const hh = node.height / 2;

    const bg = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    bg.setAttribute("points", `${hw},1.5 ${node.width - 1.5},${hh} ${hw},${node.height - 1.5} 1.5,${hh}`);
    bg.setAttribute("class", "markdy-node__diamond-polygon");
    svg.appendChild(bg);

    const facet = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    facet.setAttribute("points", `${hw},4 ${node.width - 4},${hh} ${hw},${node.height - 4} 4,${hh}`);
    facet.setAttribute("class", "markdy-node__diamond-facet");
    svg.appendChild(facet);

    el.prepend(svg);
  }

  const body = document.createElement("div");
  body.className = "markdy-node__body";
  body.append(createNodeMediaEl(document, node, assets));

  const content = document.createElement("div");
  content.className = "markdy-node__content";

  const label = document.createElement("div");
  label.className = "markdy-node__label";
  label.textContent = node.label;
  content.appendChild(label);

  const tech = node.props?.tech ?? node.props?.sub;
  if (tech !== undefined && tech !== null && String(tech).trim().length > 0) {
    const techEl = document.createElement("div");
    techEl.className = "markdy-node__tech";
    techEl.textContent = String(tech);
    content.appendChild(techEl);
  }

  body.append(content);

  const value = node.props?.value ?? node.props?.metric;
  if (value !== undefined && value !== null) {
    const valueEl = document.createElement("div");
    valueEl.className = "markdy-node__value";
    valueEl.textContent = String(value);
    body.appendChild(valueEl);
  }
  el.append(body);
  return el;
}

export function createTitleEl(title: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "markdy-scene-title";
  el.textContent = title;
  if (!title) {
    el.style.display = "none";
  }
  return el;
}
