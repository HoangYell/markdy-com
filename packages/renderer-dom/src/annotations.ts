import type { AnnotationDecl, PositionedNode, ThemeTokens } from "@markdy/core";

const STYLE_ID = "markdy-annotation-styles";

export function ensureAnnotationStyles(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.markdy-annotation-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 150;
}
.markdy-annotation {
  position: absolute;
  max-width: 220px;
  font-family: var(--md-font-title, Georgia, "Times New Roman", serif);
  font-size: 14px;
  font-style: italic;
  color: var(--md-text);
  line-height: 1.4;
  letter-spacing: 0.01em;
  opacity: 0;
  transform: translateY(6px);
  transition: opacity 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.markdy-annotation[data-visible="1"] {
  opacity: 1;
  transform: none;
}
.markdy-annotation[data-intent="accent"] {
  color: var(--md-accent);
}
.markdy-annotation[data-intent="muted"] {
  color: var(--md-text-muted);
}
.markdy-annotation__leader {
  position: absolute;
  pointer-events: none;
}
`;
  doc.head.appendChild(style);
}

function positionForAnnotation(
  position: string | undefined,
  bounds: { width: number; height: number },
  index: number,
): { x: number; y: number } {
  const pad = 28;
  const topPad = 68;
  const p = (position ?? "").toLowerCase();
  if (p.includes("top") && p.includes("right")) return { x: bounds.width - pad - 200, y: topPad + index * 48 };
  if (p.includes("top") && p.includes("left")) return { x: pad, y: topPad + index * 48 };
  if (p.includes("bottom") && p.includes("right")) return { x: bounds.width - pad - 200, y: bounds.height - pad - 40 };
  if (p.includes("bottom") && p.includes("left")) return { x: pad, y: bounds.height - pad - 40 };
  return { x: bounds.width - pad - 200, y: topPad + index * 48 };
}

export function mountAnnotations(
  layer: HTMLElement,
  annotations: AnnotationDecl[],
  nodes: PositionedNode[],
  theme: ThemeTokens,
  bounds: { width: number; height: number },
): void {
  if (annotations.length === 0) return;
  const doc = layer.ownerDocument;
  ensureAnnotationStyles(doc);

  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.classList.add("markdy-annotation__leader");
  Object.assign(svg.style, { position: "absolute", inset: "0", width: "100%", height: "100%", overflow: "visible" });
  layer.appendChild(svg);

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  annotations.slice(0, 2).forEach((ann, index) => {
    const pos = positionForAnnotation(ann.position, bounds, index);
    const textEl = doc.createElement("div");
    textEl.className = "markdy-annotation";
    textEl.textContent = ann.text;
    textEl.style.left = `${pos.x}px`;
    textEl.style.top = `${pos.y}px`;
    layer.appendChild(textEl);

    const target = ann.target ? nodeById.get(ann.target) : undefined;
    if (!target) return;

    const tx = target.x + target.width / 2;
    const ty = target.y + target.height / 2;
    const ax = pos.x + 8;
    const ay = pos.y + 16;
    const path = doc.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", `M ${ax} ${ay} Q ${(ax + tx) / 2} ${(ay + ty) / 2 - 20} ${tx} ${ty}`);
    path.setAttribute("fill", "none");
    const intent = typeof ann.intent === "string" ? ann.intent : "neutral";
    const leaderColor = intent === "accent" ? theme.accent : intent === "muted" ? (theme.soft ?? theme.textMuted) : theme.textMuted;
    const leaderOpacity = intent === "accent" ? "0.60" : intent === "muted" ? "0.40" : "0.50";
    path.setAttribute("stroke", leaderColor);
    path.setAttribute("stroke-width", "1");
    path.setAttribute("stroke-dasharray", "4 3");
    path.setAttribute("opacity", leaderOpacity);
    svg.appendChild(path);

    const dot = doc.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", String(tx));
    dot.setAttribute("cy", String(ty));
    dot.setAttribute("r", "2");
    dot.setAttribute("fill", theme.text);
    svg.appendChild(dot);
  });
}
