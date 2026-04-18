import type { SceneAST, ActorDef } from "@markdy/core";
import type { ActorState } from "./types.js";
import { stateFrom, tx, txCaption } from "./types.js";
import { createFigureEl } from "./figure.js";

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

  return el;
}
