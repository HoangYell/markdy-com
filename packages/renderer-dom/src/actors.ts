import type { SceneAST, ActorDef } from "@markdy/core";
import type { ActorState } from "./types.js";
import { stateFrom, tx } from "./types.js";
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
  el.style.transform = tx(stateFrom(def));
  el.style.opacity = String(def.opacity ?? 1);

  return el;
}
