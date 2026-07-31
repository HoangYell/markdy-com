/**
 * `throw` — launches an asset from one actor toward another.
 */
import type { AssetDef } from "@markdy/core";
import type { ActionHandler } from "./context.js";
import { tx } from "../types.js";

const PROJECTILE_SIZE_PX = 32;

function createProjectile(
  assetName: string,
  assetDef: AssetDef,
  assetOverrides: Record<string, string>,
): HTMLElement {
  if (assetDef.type === "image") {
    const img = document.createElement("img");
    img.src = assetOverrides[assetName] ?? assetDef.value;
    img.alt = assetName;
    img.setAttribute("draggable", "false");
    img.style.width = `${PROJECTILE_SIZE_PX}px`;
    img.style.height = `${PROJECTILE_SIZE_PX}px`;
    return img;
  }

  const span = document.createElement("span");
  span.className = "iconify";
  span.dataset.icon = assetDef.value;
  span.style.fontSize = `${PROJECTILE_SIZE_PX}px`;
  span.style.lineHeight = "1";
  span.style.display = "inline-block";
  return span;
}

export const throwAsset: ActionHandler = ({
  ev,
  state,
  baseOpts,
  ast,
  states,
  scene,
  assetOverrides,
  anims,
}) => {
  const assetName = String(ev.params.asset ?? "");
  const targetState = states.get(String(ev.params.to ?? ""));
  const assetDef = ast.assets[assetName];
  if (!assetDef || !targetState) return;

  const projectile = createProjectile(assetName, assetDef, assetOverrides);
  Object.assign(projectile.style, {
    position: "absolute",
    left: "0",
    top: "0",
    pointerEvents: "none",
    zIndex: "9",
    opacity: "0",
  });

  // Mounted on the scene rather than the throwing actor so it can travel
  // freely between actors — hence the base `tx`, not the caller's `ctx.tx`,
  // which would apply the thrower's caption-centering offset.
  scene.appendChild(projectile);

  const anim = projectile.animate(
    [
      { transform: tx(state), opacity: 1 },
      { transform: tx(targetState), opacity: 0 },
    ],
    { ...baseOpts, easing: "ease-in" },
  );

  anim.addEventListener("finish", () => {
    if (projectile.parentNode === scene) scene.removeChild(projectile);
  });

  anims.push(anim);
};
