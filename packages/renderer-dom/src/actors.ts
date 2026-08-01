import type { SceneAST, ActorDef } from "@markdy/core";
import type { ActorState } from "./types.js";
import { stateFrom, tx, txCaption } from "./types.js";
import { createFigureEl } from "./figure.js";

const ARCHITECTURE_NODE_TYPES = new Set([
  "service",
  "api",
  "microservice",
  "client",
  "user",
  "db",
  "database",
  "queue",
  "cache",
  "cloud",
  "region",
  "container",
  "cluster",
]);

const ARCHITECTURE_STYLE_ID = "markdy-architecture-node-styles";

function ensureArchitectureStyles(doc: Document): void {
  if (doc.getElementById(ARCHITECTURE_STYLE_ID)) return;

  const style = doc.createElement("style");
  style.id = ARCHITECTURE_STYLE_ID;
  style.textContent = `
.markdy-arch-node {
  --markdy-node-accent: #38bdf8;
  --markdy-node-accent-2: #22c55e;
  --markdy-node-surface: rgba(15, 23, 42, 0.82);
  --markdy-node-border: rgba(148, 163, 184, 0.34);
  --markdy-node-glow: rgba(56, 189, 248, 0.24);
  position: relative;
  isolation: isolate;
  width: 184px;
  min-height: 88px;
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 13px 14px;
  border: 1px solid var(--markdy-node-border);
  border-radius: 14px;
  color: #e5eefb;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.02) 34%, rgba(15, 23, 42, 0.88) 100%),
    radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--markdy-node-accent) 34%, transparent), transparent 42%),
    var(--markdy-node-surface);
  box-shadow:
    0 16px 34px rgba(2, 6, 23, 0.28),
    0 0 0 1px rgba(255, 255, 255, 0.04) inset,
    0 1px 0 rgba(255, 255, 255, 0.12) inset,
    0 0 28px var(--markdy-node-glow);
  overflow: hidden;
  contain: layout paint style;
  backdrop-filter: blur(14px) saturate(1.18);
  -webkit-backdrop-filter: blur(14px) saturate(1.18);
}
.markdy-arch-node::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(90deg, transparent 0 24%, rgba(255, 255, 255, 0.06) 50%, transparent 76%) -180px 0 / 180px 100% no-repeat,
    repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.055) 0 1px, transparent 1px 10px);
  opacity: 0.6;
}
.markdy-arch-node::after {
  content: "";
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 9px;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, var(--markdy-node-accent), var(--markdy-node-accent-2), transparent);
  opacity: 0.82;
  filter: drop-shadow(0 0 6px var(--markdy-node-accent));
}
.markdy-arch-node__icon {
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: 11px;
  background:
    radial-gradient(circle at 35% 25%, rgba(255, 255, 255, 0.28), transparent 42%),
    linear-gradient(145deg, var(--markdy-node-accent), color-mix(in srgb, var(--markdy-node-accent) 38%, #020617));
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.16) inset,
    0 10px 20px color-mix(in srgb, var(--markdy-node-accent) 25%, transparent);
}
.markdy-arch-node__icon::before,
.markdy-arch-node__icon::after {
  content: "";
  position: absolute;
  box-sizing: border-box;
  border-color: rgba(255, 255, 255, 0.9);
}
.markdy-arch-node__label {
  min-width: 0;
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 15px;
  font-weight: 720;
  line-height: 1.08;
  color: #f8fafc;
  text-shadow: 0 1px 12px rgba(15, 23, 42, 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.markdy-arch-node__type {
  display: block;
  margin-top: 5px;
  font-size: 9px;
  font-weight: 740;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--markdy-node-accent) 70%, #e2e8f0);
  opacity: 0.86;
}
.markdy-arch-node[data-markdy-system-type="service"],
.markdy-arch-node[data-markdy-system-type="api"],
.markdy-arch-node[data-markdy-system-type="microservice"] {
  --markdy-node-accent: #38bdf8;
  --markdy-node-accent-2: #818cf8;
}
.markdy-arch-node[data-markdy-system-type="client"],
.markdy-arch-node[data-markdy-system-type="user"] {
  --markdy-node-accent: #f59e0b;
  --markdy-node-accent-2: #fb7185;
}
.markdy-arch-node[data-markdy-system-type="database"],
.markdy-arch-node[data-markdy-system-type="db"] {
  --markdy-node-accent: #22c55e;
  --markdy-node-accent-2: #14b8a6;
  border-radius: 18px 18px 24px 24px;
}
.markdy-arch-node[data-markdy-system-type="cache"] {
  --markdy-node-accent: #a3e635;
  --markdy-node-accent-2: #22c55e;
  border-style: dashed;
}
.markdy-arch-node[data-markdy-system-type="queue"] {
  --markdy-node-accent: #a78bfa;
  --markdy-node-accent-2: #38bdf8;
}
.markdy-arch-node[data-markdy-system-type="cloud"],
.markdy-arch-node[data-markdy-system-type="region"] {
  --markdy-node-accent: #60a5fa;
  --markdy-node-accent-2: #67e8f9;
  border-radius: 999px;
}
.markdy-arch-node[data-markdy-system-type="container"],
.markdy-arch-node[data-markdy-system-type="cluster"] {
  --markdy-node-accent: #c084fc;
  --markdy-node-accent-2: #f472b6;
  border-radius: 10px;
}
.markdy-arch-node[data-markdy-system-type="service"] .markdy-arch-node__icon::before,
.markdy-arch-node[data-markdy-system-type="api"] .markdy-arch-node__icon::before,
.markdy-arch-node[data-markdy-system-type="microservice"] .markdy-arch-node__icon::before {
  inset: 9px 7px;
  border-top: 3px solid rgba(255, 255, 255, 0.92);
  border-bottom: 3px solid rgba(255, 255, 255, 0.92);
}
.markdy-arch-node[data-markdy-system-type="service"] .markdy-arch-node__icon::after,
.markdy-arch-node[data-markdy-system-type="api"] .markdy-arch-node__icon::after,
.markdy-arch-node[data-markdy-system-type="microservice"] .markdy-arch-node__icon::after {
  inset: 14px 7px auto;
  border-top: 3px solid rgba(255, 255, 255, 0.92);
}
.markdy-arch-node[data-markdy-system-type="client"] .markdy-arch-node__icon::before,
.markdy-arch-node[data-markdy-system-type="user"] .markdy-arch-node__icon::before {
  left: 8px;
  right: 8px;
  top: 8px;
  height: 13px;
  border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 3px;
}
.markdy-arch-node[data-markdy-system-type="client"] .markdy-arch-node__icon::after,
.markdy-arch-node[data-markdy-system-type="user"] .markdy-arch-node__icon::after {
  left: 12px;
  right: 12px;
  bottom: 7px;
  border-top: 2px solid rgba(255, 255, 255, 0.92);
}
.markdy-arch-node[data-markdy-system-type="database"] .markdy-arch-node__icon::before,
.markdy-arch-node[data-markdy-system-type="db"] .markdy-arch-node__icon::before,
.markdy-arch-node[data-markdy-system-type="cache"] .markdy-arch-node__icon::before {
  inset: 7px 7px 9px;
  border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 50% / 16%;
}
.markdy-arch-node[data-markdy-system-type="database"] .markdy-arch-node__icon::after,
.markdy-arch-node[data-markdy-system-type="db"] .markdy-arch-node__icon::after,
.markdy-arch-node[data-markdy-system-type="cache"] .markdy-arch-node__icon::after {
  left: 8px;
  right: 8px;
  top: 12px;
  border-top: 2px solid rgba(255, 255, 255, 0.72);
}
.markdy-arch-node[data-markdy-system-type="queue"] .markdy-arch-node__icon::before {
  inset: 9px 8px;
  border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 999px;
}
.markdy-arch-node[data-markdy-system-type="queue"] .markdy-arch-node__icon::after {
  left: 13px;
  top: 9px;
  width: 8px;
  height: 14px;
  border-left: 2px solid rgba(255, 255, 255, 0.82);
  border-right: 2px solid rgba(255, 255, 255, 0.82);
}
.markdy-arch-node[data-markdy-system-type="cloud"] .markdy-arch-node__icon::before,
.markdy-arch-node[data-markdy-system-type="region"] .markdy-arch-node__icon::before {
  left: 7px;
  right: 7px;
  bottom: 9px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 999px;
}
.markdy-arch-node[data-markdy-system-type="cloud"] .markdy-arch-node__icon::after,
.markdy-arch-node[data-markdy-system-type="region"] .markdy-arch-node__icon::after {
  left: 10px;
  top: 7px;
  width: 13px;
  height: 13px;
  border-top: 2px solid rgba(255, 255, 255, 0.92);
  border-left: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 999px 0 0 0;
}
.markdy-arch-node[data-markdy-system-type="container"] .markdy-arch-node__icon::before,
.markdy-arch-node[data-markdy-system-type="cluster"] .markdy-arch-node__icon::before {
  inset: 8px;
  border: 2px solid rgba(255, 255, 255, 0.92);
  border-radius: 4px;
}
.markdy-arch-node[data-markdy-system-type="container"] .markdy-arch-node__icon::after,
.markdy-arch-node[data-markdy-system-type="cluster"] .markdy-arch-node__icon::after {
  left: 10px;
  right: 10px;
  top: 14px;
  border-top: 2px solid rgba(255, 255, 255, 0.72);
}
`;
  doc.head.appendChild(style);
}

function isArchitectureNodeType(type: string): boolean {
  return ARCHITECTURE_NODE_TYPES.has(type);
}

function architectureTypeLabel(type: string): string {
  if (type === "db") return "database";
  if (type === "api") return "service";
  return type;
}

// ---------------------------------------------------------------------------
// Actor element factory
// ---------------------------------------------------------------------------

export function createActorEl(
  name: string,
  def: ActorDef,
  assetDefs: SceneAST["assets"],
  assetOverrides: Record<string, string>,
): HTMLElement {
  let el: HTMLElement;

  switch (def.type) {
    case "sprite": {
      const assetName = def.args[0] ?? "";
      const assetDef = assetDefs[assetName];

      if (assetDef?.type === "icon") {
        const span = document.createElement("span");
        span.className = "iconify";
        span.style.display = "inline-block";
        span.style.fontSize = `${def.size ?? 32}px`;
        span.style.lineHeight = "1";
        span.dataset.icon = assetDef.value;
        span.setAttribute("aria-label", assetDef.value.split(":").pop() ?? "icon");
        el = span;
      } else {
        const img = document.createElement("img");
        img.src = assetOverrides[assetName] ?? assetDef?.value ?? "";
        img.alt = assetName;
        img.style.display = "block";
        img.style.maxWidth = "100%";
        img.style.maxHeight = "200px";
        img.style.objectFit = "contain";
        img.setAttribute("draggable", "false");
        el = img;
      }
      break;
    }

    case "text": {
      const div = document.createElement("div");
      div.textContent = def.args[0] ?? "";
      div.style.fontSize = `${def.size ?? 24}px`;
      div.style.fontFamily = "sans-serif";
      div.style.whiteSpace = "nowrap";
      div.style.userSelect = "none";
      div.style.pointerEvents = "none";
      // color inherits from scene element which sets a bg-contrasting color
      el = div;
      break;
    }

    case "caption": {
      // Full-width overlay ribbon. Visually heavier than a plain text actor:
      // centered horizontally, bold, slightly shadowed. Positioning math
      // (x = scene width / 2) is done at parse time via the `at top|bottom|center`
      // anchor; here we just translate(-50%, -50%) to center on that point.
      const div = document.createElement("div");
      div.textContent = def.args[0] ?? "";
      div.dataset.markdyCaption = def.anchor ?? "top";
      Object.assign(div.style, {
        fontSize: `${def.size ?? 32}px`,
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontWeight: "700",
        whiteSpace: "nowrap",
        textAlign: "center",
        lineHeight: "1.1",
        padding: "6px 14px",
        borderRadius: "4px",
        background: "rgba(0, 0, 0, 0.55)",
        color: "#fff",
        textShadow: "0 2px 6px rgba(0, 0, 0, 0.45)",
        userSelect: "none",
        pointerEvents: "none",
        // Center the caption on its (x, y) point (x = sceneWidth/2).
        // We combine translate-centering with the actor transform in the
        // dataset below so the player can re-apply on state changes.
      });
      el = div;
      break;
    }

    case "figure": {
      el = createFigureEl(def);
      break;
    }

    case "service":
    case "api":
    case "microservice":
    case "client":
    case "user":
    case "db":
    case "database":
    case "queue":
    case "cache":
    case "cloud":
    case "region":
    case "container":
    case "cluster": {
      ensureArchitectureStyles(document);
      const card = document.createElement("div");
      card.className = "markdy-arch-node";
      card.dataset.markdySystemType = def.type;
      card.setAttribute("role", "img");
      card.setAttribute("aria-label", `${architectureTypeLabel(def.type)} ${def.args[0] ?? name}`);

      const icon = document.createElement("span");
      icon.className = "markdy-arch-node__icon";
      icon.setAttribute("aria-hidden", "true");

      const label = document.createElement("div");
      label.className = "markdy-arch-node__label";
      label.textContent = def.args[0] ?? "";
      label.style.fontSize = `${def.size ?? 15}px`;

      const typeLabel = document.createElement("span");
      typeLabel.className = "markdy-arch-node__type";
      typeLabel.textContent = architectureTypeLabel(def.type);
      label.appendChild(typeLabel);

      card.appendChild(icon);
      card.appendChild(label);
      el = card;
      break;
    }

    default: {
      // box
      const div = document.createElement("div");
      div.style.width  = "100px";
      div.style.height = "100px";
      div.style.background = "#999";
      div.style.boxSizing  = "border-box";
      el = div;
      break;
    }
  }

  el.dataset.markdyActor = name;
  el.style.position = "absolute";
  el.style.left = "0";
  el.style.top = "0";
  el.style.transformOrigin = "center center";
  el.style.transform = def.type === "caption" ? txCaption(stateFrom(def)) : tx(stateFrom(def));
  el.style.opacity = String(def.opacity ?? 1);
  if (def.z !== undefined) el.style.zIndex = String(def.z);
  else if (def.type === "caption") el.style.zIndex = "100";
  else if (isArchitectureNodeType(def.type)) el.style.zIndex = "10";

  return el;
}
