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
  border: 1px dashed var(--md-group-border, color-mix(in srgb, var(--md-border) 50%, transparent));
  border-radius: 16px;
  background: color-mix(in srgb, var(--md-surface-raised) 28%, transparent);
  box-shadow:
    0 8px 32px -8px var(--md-shadow, rgba(0, 0, 0, 0.25)),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  pointer-events: none;
  z-index: 40;
}
.markdy-group-boundary__label {
  position: absolute;
  left: 14px;
  top: 10px;
  padding: 3px 10px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--md-text);
  background: color-mix(in srgb, var(--md-surface-raised) 90%, transparent);
  border: 1px solid var(--md-group-border, color-mix(in srgb, var(--md-border) 60%, transparent));
  border-radius: 6px;
  font-family: var(--md-font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, monospace);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.16);
  display: inline-flex;
  align-items: center;
  gap: 6px;
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
