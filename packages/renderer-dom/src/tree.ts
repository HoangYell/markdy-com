import type { ThemeTokens, TreeBus } from "@markdy/core";
import { toPathD } from "./geometry/path.js";

export function mountTreeBuses(
  layer: HTMLElement,
  buses: TreeBus[],
  theme: ThemeTokens,
): void {
  if (buses.length === 0) return;
  Object.assign(layer.style, {
    position: "absolute",
    inset: "0",
    zIndex: "42",
    pointerEvents: "none",
  });

  const doc = layer.ownerDocument;
  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  Object.assign(svg.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    overflow: "visible",
  });
  layer.appendChild(svg);

  const stroke = theme.edges?.dependency ?? theme.rule ?? theme.border ?? "#64748b";
  for (const bus of buses) {
    const group = doc.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("data-tree-bus", bus.id);

    bus.childXs.forEach((childX, idx) => {
      const targetY = bus.childYs ? (bus.childYs[idx] ?? bus.childY) : bus.childY;
      const pathEl = doc.createElementNS("http://www.w3.org/2000/svg", "path");
      let d: string;
      if (Math.abs(childX - bus.parentX) < 1) {
        d = toPathD([
          { x: bus.parentX, y: bus.parentY },
          { x: childX, y: targetY },
        ], 12);
      } else {
        const branchY = bus.childYs ? (bus.parentY + targetY) / 2 : bus.branchY;
        d = toPathD([
          { x: bus.parentX, y: bus.parentY },
          { x: bus.parentX, y: branchY },
          { x: childX, y: branchY },
          { x: childX, y: targetY },
        ], 12);
      }
      pathEl.setAttribute("d", d);
      pathEl.setAttribute("fill", "none");
      pathEl.setAttribute("stroke", stroke);
      pathEl.setAttribute("stroke-width", "1.6");
      pathEl.setAttribute("stroke-linecap", "round");
      pathEl.setAttribute("stroke-linejoin", "round");
      group.appendChild(pathEl);
    });

    svg.appendChild(group);
  }
}
