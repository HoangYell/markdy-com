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
.markdy-scene-root[data-markdy-theme="doodle"] .markdy-group-boundary {
  border: 2px dashed #18181b;
  border-radius: 20px 24px 18px 22px / 22px 18px 24px 20px;
  background: rgba(254, 240, 138, 0.08);
  box-shadow: 3px 3px 0 rgba(24, 24, 27, 0.08);
}
.markdy-scene-root[data-markdy-theme="doodle"] .markdy-group-boundary__label {
  border: 1.5px solid #18181b;
  border-radius: 6px;
  box-shadow: 2px 2px 0 #18181b;
  background: #fef08a;
  color: #18181b;
  font-weight: 800;
  transform: rotate(-0.8deg);
}
.markdy-scene-root[data-markdy-theme="ink"] .markdy-group-boundary {
  border: 1.5px dashed #1d4ed8;
  border-radius: 8px;
  background: rgba(239, 246, 255, 0.45);
  box-shadow: 2px 2px 0 rgba(29, 78, 216, 0.08);
}
.markdy-scene-root[data-markdy-theme="ink"] .markdy-group-boundary__label {
  border: 1.25px solid #1d4ed8;
  border-radius: 4px;
  box-shadow: 1.5px 1.5px 0 rgba(29, 78, 216, 0.12);
  background: #ffffff;
  color: #1e3a8a;
  font-weight: 600;
}

/* Cloud Vendor & Architecture Bounding Containers */
.markdy-group-boundary[data-vendor="aws"],
.markdy-group-boundary[data-vendor="aws-vpc"] {
  border: 1.5px solid #8c4fff !important;
  border-radius: 8px !important;
  background: rgba(140, 79, 255, 0.04) !important;
}
.markdy-group-boundary[data-vendor="aws"] .markdy-group-boundary__label,
.markdy-group-boundary[data-vendor="aws-vpc"] .markdy-group-boundary__label {
  border-color: #8c4fff !important;
  color: #8c4fff !important;
}

.markdy-group-boundary[data-vendor="aws-private"] {
  border: 1.5px dashed #00a4a6 !important;
  border-radius: 6px !important;
  background: rgba(0, 164, 166, 0.03) !important;
}
.markdy-group-boundary[data-vendor="aws-private"] .markdy-group-boundary__label {
  border-color: #00a4a6 !important;
  color: #00a4a6 !important;
}

.markdy-group-boundary[data-vendor="aws-public"] {
  border: 1.5px dashed #7aa116 !important;
  border-radius: 6px !important;
  background: rgba(122, 161, 22, 0.03) !important;
}
.markdy-group-boundary[data-vendor="aws-public"] .markdy-group-boundary__label {
  border-color: #7aa116 !important;
  color: #7aa116 !important;
}

.markdy-group-boundary[data-vendor="gcp"] {
  border: 1.5px solid #4285f4 !important;
  border-radius: 8px !important;
  background: rgba(66, 133, 244, 0.04) !important;
}
.markdy-group-boundary[data-vendor="gcp"] .markdy-group-boundary__label {
  border-color: #4285f4 !important;
  color: #4285f4 !important;
}

.markdy-group-boundary[data-vendor="azure"] {
  border: 1.5px solid #0078d4 !important;
  border-radius: 8px !important;
  background: rgba(0, 120, 212, 0.04) !important;
}
.markdy-group-boundary[data-vendor="azure"] .markdy-group-boundary__label {
  border-color: #0078d4 !important;
  color: #0078d4 !important;
}

.markdy-group-boundary[data-vendor="tooling"] {
  border: 1.5px solid #0284c7 !important;
  border-radius: 8px !important;
  background: rgba(2, 132, 199, 0.04) !important;
}
.markdy-group-boundary[data-vendor="tooling"] .markdy-group-boundary__label {
  border-color: #0284c7 !important;
  color: #0284c7 !important;
}

/* CAD Engineered Paper Theme Group Style */
.markdy-scene-root[data-markdy-theme="cad"] .markdy-group-boundary {
  border: 1.5px solid #cbd5e1;
  border-radius: 8px;
  background: rgba(241, 245, 249, 0.45);
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
.markdy-scene-root[data-markdy-theme="cad"] .markdy-group-boundary__label {
  top: 8px;
  left: 10px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #334155;
  font-weight: 600;
  font-size: 11px;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
  letter-spacing: 0.02em;
  text-transform: none;
}
.markdy-scene-root[data-markdy-theme="cad-dark"] .markdy-group-boundary {
  border: 1.5px solid #475569;
  border-radius: 8px;
  background: rgba(30, 41, 59, 0.45);
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}
.markdy-scene-root[data-markdy-theme="cad-dark"] .markdy-group-boundary__label {
  top: 8px;
  left: 10px;
  border: 1px solid #475569;
  background: #1e293b;
  color: #f1f5f9;
  font-weight: 600;
  font-size: 11px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  letter-spacing: 0.02em;
  text-transform: none;
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

  // Detect Cloud Vendor / Architecture container roles
  const rawId = boundary.id.toLowerCase();
  const rawLabel = (boundary.label || "").toLowerCase();
  const rawKind = String(boundary.props?.kind || boundary.props?.vendor || "").toLowerCase();

  let vendor: string | null = null;
  if (rawKind.includes("vpc") || rawId.includes("vpc") || rawLabel.includes("vpc")) {
    vendor = "aws-vpc";
  } else if (rawKind.includes("private") || rawId.includes("private") || rawLabel.includes("private")) {
    vendor = "aws-private";
  } else if (rawKind.includes("public") || rawId.includes("public") || rawLabel.includes("public")) {
    vendor = "aws-public";
  } else if (rawKind.includes("aws") || rawId.includes("aws") || rawLabel.includes("aws")) {
    vendor = "aws";
  } else if (rawKind.includes("gcp") || rawId.includes("gcp") || rawLabel.includes("gcp") || rawLabel.includes("google cloud")) {
    vendor = "gcp";
  } else if (rawKind.includes("azure") || rawId.includes("azure") || rawLabel.includes("azure")) {
    vendor = "azure";
  } else if (rawKind.includes("tooling") || rawId.includes("tooling") || rawKind.includes("monorepo") || rawId.includes("monorepo") || rawLabel.includes("monorepo")) {
    vendor = "tooling";
  }

  if (vendor) {
    el.dataset.vendor = vendor;
  }

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
