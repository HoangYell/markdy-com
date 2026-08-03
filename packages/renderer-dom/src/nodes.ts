import type { PositionedNode, ThemeTokens } from "@markdy/core";

const STYLE_ID = "markdy-diagram-node-styles";

export function ensureNodeStyles(doc: Document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.markdy-node {
  position: absolute;
  box-sizing: border-box;
  width: var(--md-node-w, 184px);
  height: var(--md-node-h, 88px);
  border-radius: 16px;
  border: 1px solid var(--md-border);
  background: linear-gradient(145deg, var(--md-surface-raised), var(--md-surface));
  color: var(--md-text);
  box-shadow: 0 12px 32px rgba(2, 6, 23, 0.28), 0 0 0 1px rgba(255,255,255,0.04) inset;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  overflow: hidden;
  opacity: 0;
  transform: translateY(8px);
  transition: box-shadow 0.3s ease;
}
.markdy-node[data-visible="1"] {
  opacity: 1;
  transform: translateY(0);
}
.markdy-node[data-focused="1"] {
  box-shadow: 0 0 0 2px var(--md-accent), 0 16px 40px rgba(2, 6, 23, 0.35);
}
.markdy-node[data-glow="1"] {
  box-shadow: 0 0 24px var(--md-glow-color, var(--md-accent)), 0 0 0 1px var(--md-glow-color, var(--md-accent)) inset;
}
.markdy-node__rail {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--md-role-color, var(--md-accent));
  border-radius: 16px 0 0 16px;
}
.markdy-node__type {
  padding: 10px 14px 0 18px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--md-text-muted);
}
.markdy-node__label {
  padding: 2px 14px 0 18px;
  font-size: 15px;
  font-weight: 650;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.markdy-node[data-role="client"] { border-radius: 20px 20px 8px 8px; }
.markdy-node[data-role="data"] { border-radius: 16px 16px 28px 28px; }
.markdy-node[data-role="flow"] { transform: rotate(0deg); clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%); }
.markdy-node[data-role="network"] { clip-path: polygon(8% 0%, 92% 0%, 100% 50%, 92% 100%, 8% 100%, 0% 50%); }
.markdy-scene-title {
  position: absolute;
  left: 64px;
  top: 28px;
  right: 64px;
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--md-text);
  opacity: 0;
  transform: translateY(-6px);
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}
.markdy-scene-title[data-visible="1"] {
  opacity: 1;
  transform: translateY(0);
}
`;
  doc.head.appendChild(style);
}

export function createNodeEl(node: PositionedNode, theme: ThemeTokens): HTMLElement {
  const el = document.createElement("div");
  el.className = "markdy-node markdy-scene-actor";
  el.dataset.actor = node.id;
  el.dataset.role = node.role;
  el.style.left = `${node.x}px`;
  el.style.top = `${node.y}px`;
  el.style.setProperty("--md-node-w", `${node.width}px`);
  el.style.setProperty("--md-node-h", `${node.height}px`);
  const roleColor = theme.roles[node.role] ?? theme.accent;
  el.style.setProperty("--md-role-color", roleColor);

  const rail = document.createElement("div");
  rail.className = "markdy-node__rail";
  const type = document.createElement("div");
  type.className = "markdy-node__type";
  type.textContent = node.kind.replace(/_/g, " ");
  const label = document.createElement("div");
  label.className = "markdy-node__label";
  label.textContent = node.label;
  el.append(rail, type, label);
  return el;
}

export function createTitleEl(title: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "markdy-scene-title";
  el.textContent = title;
  return el;
}
