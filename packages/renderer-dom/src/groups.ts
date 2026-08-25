import type { GroupBoundary, ThemeTokens } from "@markdy/core";

const STYLE_ID = "markdy-group-boundary-styles";

export function ensureGroupStyles(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.markdy-group-boundary {
  position: absolute;
  box-sizing: border-box;
  border: 1px solid var(--md-group-border, color-mix(in srgb, var(--md-border) 45%, transparent));
  border-radius: 16px;
  background: color-mix(in srgb, var(--md-surface-raised) 32%, transparent);
  box-shadow:
    0 4px 20px -4px var(--md-shadow, rgba(0, 0, 0, 0.25)),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  pointer-events: none;
  z-index: 40;
}
.markdy-group-boundary__label {
  position: absolute;
  left: 14px;
  top: 10px;
  padding: 4px 10px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--md-text);
  background: color-mix(in srgb, var(--md-surface-raised) 85%, transparent);
  border: 1px solid var(--md-group-border, color-mix(in srgb, var(--md-border) 50%, transparent));
  border-radius: 6px;
  font-family: var(--md-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
}
`;
  doc.head.appendChild(style);
}

export function createGroupBoundaryEl(
  boundary: GroupBoundary,
  theme: ThemeTokens,
  doc: Document = document,
): HTMLElement {
  const el = doc.createElement("div");
  el.className = "markdy-group-boundary";
  el.dataset.group = boundary.id;
  el.style.left = `${boundary.x}px`;
  el.style.top = `${boundary.y}px`;
  el.style.width = `${boundary.width}px`;
  el.style.height = `${boundary.height}px`;
  el.style.setProperty("--md-group-border", theme.border ?? theme.rule ?? "#cbd5e1");

  const displayLabel = boundary.label || boundary.id;
  if (displayLabel) {
    const label = doc.createElement("div");
    label.className = "markdy-group-boundary__label";
    label.textContent = displayLabel;
    el.appendChild(label);
  }
  return el;
}

export function mountGroupBoundaries(
  layer: HTMLElement,
  boundaries: GroupBoundary[],
  theme: ThemeTokens,
): void {
  ensureGroupStyles(layer.ownerDocument);
  for (const boundary of boundaries) {
    layer.appendChild(createGroupBoundaryEl(boundary, theme, layer.ownerDocument));
  }
}
