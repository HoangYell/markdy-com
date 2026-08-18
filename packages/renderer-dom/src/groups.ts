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
  border: 1px dashed var(--md-group-border, color-mix(in srgb, var(--md-border) 60%, transparent));
  border-radius: 14px;
  background: color-mix(in srgb, var(--md-surface-raised) 25%, transparent);
  pointer-events: none;
  z-index: 40;
}
.markdy-group-boundary__label {
  position: absolute;
  left: 14px;
  top: 10px;
  padding: 3px 8px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--md-text-muted);
  background: color-mix(in srgb, var(--md-surface-raised) 80%, transparent);
  border: 1px solid var(--md-group-border, color-mix(in srgb, var(--md-border) 50%, transparent));
  border-radius: 5px;
  font-family: var(--md-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  backdrop-filter: blur(4px);
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
  el.style.setProperty("--md-group-border", theme.hairline ?? theme.border);

  if (boundary.label) {
    const label = document.createElement("div");
    label.className = "markdy-group-boundary__label";
    label.textContent = boundary.label;
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
