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
  border-radius: 12px;
  background:
    linear-gradient(180deg,
      var(--md-node-surface-raised, color-mix(in srgb, var(--md-surface-raised) 88%, #ffffff 12%)),
      var(--md-node-surface, var(--md-surface)));
  color: var(--md-text);
  box-shadow:
    0 1px 1px color-mix(in srgb, var(--md-shadow, rgba(2, 6, 23, 0.5)) 50%, transparent),
    0 10px 22px -12px var(--md-shadow, rgba(2, 6, 23, 0.55)),
    inset 0 0 0 1px var(--md-hairline, color-mix(in srgb, var(--md-border) 50%, transparent)),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  overflow: hidden;
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
    0 2px 4px rgba(2, 6, 23, 0.32),
    0 16px 34px -14px rgba(2, 6, 23, 0.6),
    inset 0 0 0 1px color-mix(in srgb, var(--md-accent) 65%, transparent),
    0 0 0 3px color-mix(in srgb, var(--md-accent) 20%, transparent);
}
.markdy-node[data-glow="1"] {
  box-shadow:
    0 2px 4px rgba(2, 6, 23, 0.32),
    0 0 0 1px color-mix(in srgb, var(--md-glow-color, var(--md-accent)) 55%, transparent),
    0 0 20px -2px color-mix(in srgb, var(--md-glow-color, var(--md-accent)) 42%, transparent),
    inset 0 0 18px -8px color-mix(in srgb, var(--md-glow-color, var(--md-accent)) 45%, transparent);
}
.markdy-node__rail { display: none; }
.markdy-node__type { display: none; }
.markdy-node__body {
  height: 100%;
  padding: 0 13px;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.markdy-node__icon {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--md-role-color, var(--md-accent));
  background:
    linear-gradient(180deg,
      color-mix(in srgb, var(--md-role-color, var(--md-accent)) 24%, transparent),
      color-mix(in srgb, var(--md-role-color, var(--md-accent)) 11%, transparent));
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--md-role-color, var(--md-accent)) 34%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
}
.markdy-node__icon svg {
  width: 17px;
  height: 17px;
  display: block;
  stroke: currentColor;
}
.markdy-node__icon[data-media="image"] {
  background: color-mix(in srgb, var(--md-surface-raised) 68%, #ffffff 32%);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--md-border) 60%, transparent);
  padding: 3px;
  overflow: hidden;
}
.markdy-node__icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 6px;
  display: block;
}
.markdy-node__icon[data-fit="cover"] img {
  object-fit: cover;
}
.markdy-node[data-icon="decision"] .markdy-node__icon,
.markdy-node[data-icon="flow"] .markdy-node__icon {
  border-radius: 999px;
}
.markdy-node__label {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.18;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
  overflow-wrap: anywhere;
  word-break: break-word;
  text-wrap: balance;
}
.markdy-node[data-role="client"] { border-radius: 15px 15px 9px 9px; }
.markdy-node[data-role="data"] { border-radius: 12px 12px 20px 20px; }
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
};

function iconKeyForNode(node: PositionedNode): string {
  const override = typeof node.props?.icon === "string" ? node.props.icon.toLowerCase() : undefined;
  if (override && ICONS[override]) return override;
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
  if (node.kind === "api" || node.kind === "service" || node.kind === "microservice" || node.kind === "backend" || node.kind === "server" || node.kind === "handler" || node.kind === "controller") return "server";
  if (node.kind === "browser" || node.kind === "web" || node.kind === "frontend" || node.kind === "app") return "browser";
  if (node.kind === "user" || node.kind === "client") return "user";
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

  appendGlyph(doc, wrap, ICONS[iconKeyForNode(node)] ?? ICONS.service);
  return wrap;
}

export function createNodeEl(node: PositionedNode, theme: ThemeTokens, assets?: Record<string, string>): HTMLElement {
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

  const body = document.createElement("div");
  body.className = "markdy-node__body";
  const icon = createNodeMediaEl(document, node, assets);
  const label = document.createElement("div");
  label.className = "markdy-node__label";
  label.textContent = node.label;
  body.append(icon, label);
  el.append(body);
  return el;
}

export function createTitleEl(title: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "markdy-scene-title";
  el.textContent = title;
  return el;
}
