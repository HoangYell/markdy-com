import type { ThemeTokens, TreeBus } from "@markdy/core";

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

  const stroke = theme.rule ?? theme.hairline ?? theme.border;
  for (const bus of buses) {
    const group = doc.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("data-tree-bus", bus.id);
    const parentLeg = doc.createElementNS("http://www.w3.org/2000/svg", "path");
    parentLeg.setAttribute("d", `M ${bus.parentX} ${bus.parentY} L ${bus.parentX} ${bus.branchY}`);
    const childXs = [...bus.childXs].sort((a, b) => a - b);
    const branch = doc.createElementNS("http://www.w3.org/2000/svg", "path");
    const branchStart = childXs[0] ?? bus.parentX;
    const branchEnd = childXs[childXs.length - 1] ?? bus.parentX;
    branch.setAttribute("d", `M ${branchStart} ${bus.branchY} L ${branchEnd} ${bus.branchY}`);
    group.append(parentLeg, branch);

    for (const childX of bus.childXs) {
      const leg = doc.createElementNS("http://www.w3.org/2000/svg", "path");
      leg.setAttribute("d", `M ${childX} ${bus.branchY} L ${childX} ${bus.childY}`);
      group.appendChild(leg);
    }

    for (const path of Array.from(group.querySelectorAll<SVGPathElement>("path"))) {
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", stroke);
      path.setAttribute("stroke-width", "1.5");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
    }
    svg.appendChild(group);
  }
}
