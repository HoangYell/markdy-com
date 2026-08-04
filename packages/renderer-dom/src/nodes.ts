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
  border-radius: 14px;
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
  display: none;
}
.markdy-node__body {
  height: 100%;
  padding: 0 14px 0 18px;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.markdy-node__icon {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--md-role-color, var(--md-accent));
  background: color-mix(in srgb, var(--md-role-color, var(--md-accent)) 16%, transparent);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--md-role-color, var(--md-accent)) 28%, transparent) inset;
}
.markdy-node__icon svg {
  width: 18px;
  height: 18px;
  display: block;
  stroke: currentColor;
}
.markdy-node[data-icon="decision"] .markdy-node__icon,
.markdy-node[data-icon="flow"] .markdy-node__icon {
  border-radius: 999px;
}
.markdy-node__label {
  min-width: 0;
  padding: 0;
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

type SvgSpec = Array<[string, Record<string, string>]>;

const ICONS: Record<string, SvgSpec> = {
  compute: [
    ["rect", { x: "5", y: "5", width: "14", height: "14", rx: "3" }],
    ["path", { d: "M9 9h6v6H9zM9 2.5v2.5M15 2.5v2.5M9 19v2.5M15 19v2.5M2.5 9h2.5M2.5 15h2.5M19 9h2.5M19 15h2.5" }],
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
  flow: [
    ["path", { d: "M5 12h14" }],
    ["path", { d: "m13 6 6 6-6 6" }],
  ],
  decision: [
    ["path", { d: "M12 3 21 12 12 21 3 12 12 3Z" }],
    ["path", { d: "M12 8v4" }],
    ["path", { d: "M12 16h.01" }],
  ],
};

function iconKeyForNode(node: PositionedNode): string {
  if (node.kind === "api_gateway" || node.kind === "gateway" || node.kind === "load_balancer" || node.kind === "ingress") return "gateway";
  if (node.kind === "db" || node.kind === "database" || node.kind === "sql" || node.kind === "nosql" || node.kind === "warehouse") return "database";
  if (node.kind === "bucket" || node.kind === "object_store" || node.kind === "blob" || node.kind === "volume" || node.kind === "disk") return "storage";
  if (node.kind === "cdn" || node.kind === "dns" || node.kind === "internet") return "cdn";
  if (node.kind === "queue" || node.kind === "topic" || node.kind === "stream" || node.kind === "event_bus" || node.kind === "broker") return "queue";
  if (node.kind === "worker" || node.kind === "job" || node.kind === "scheduler" || node.kind === "cron" || node.kind === "batch") return "worker";
  if (node.kind === "browser" || node.kind === "web" || node.kind === "frontend" || node.kind === "app") return "browser";
  if (node.kind === "user" || node.kind === "client") return "user";
  if (node.kind === "decision" || node.kind === "condition") return "decision";
  if (node.kind === "cache") return "cache";
  return ICONS[node.kind] ? node.kind : node.role;
}

function createIconEl(doc: Document, node: PositionedNode): HTMLElement {
  const wrap = doc.createElement("div");
  wrap.className = "markdy-node__icon";
  wrap.setAttribute("aria-hidden", "true");
  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  const spec = ICONS[iconKeyForNode(node)] ?? ICONS.service;
  for (const [tag, attrs] of spec) {
    const child = doc.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [name, value] of Object.entries(attrs)) child.setAttribute(name, value);
    svg.appendChild(child);
  }
  wrap.appendChild(svg);
  return wrap;
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
  const typeText = node.kind.replace(/_/g, " ");
  el.dataset.kind = node.kind;
  el.dataset.icon = iconKeyForNode(node);
  el.title = `${node.label} (${typeText})`;
  el.setAttribute("aria-label", el.title);

  const rail = document.createElement("div");
  rail.className = "markdy-node__rail";
  const type = document.createElement("div");
  type.className = "markdy-node__type";
  type.textContent = typeText;
  const body = document.createElement("div");
  body.className = "markdy-node__body";
  const icon = createIconEl(document, node);
  const label = document.createElement("div");
  label.className = "markdy-node__label";
  label.textContent = node.label;
  body.append(icon, label);
  el.append(rail, type, body);
  return el;
}

export function createTitleEl(title: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "markdy-scene-title";
  el.textContent = title;
  return el;
}
