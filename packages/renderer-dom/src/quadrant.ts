import type { PositionedNode, ThemeTokens } from "@markdy/core";

export function mountQuadrantLayer(
  layer: HTMLElement,
  nodes: PositionedNode[],
  theme: ThemeTokens,
  bounds: { width: number; height: number },
): void {
  if (nodes.length === 0) return;
  const doc = layer.ownerDocument;
  Object.assign(layer.style, {
    position: "absolute",
    inset: "0",
    zIndex: "38",
    pointerEvents: "none",
  });

  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${bounds.width} ${bounds.height}`);
  Object.assign(svg.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    overflow: "visible",
  });
  layer.appendChild(svg);

  const SAFE = 40;
  const TITLE_BAND = 64;
  const contentW = bounds.width - SAFE * 2;
  const contentH = bounds.height - SAFE - TITLE_BAND - SAFE;
  const centerX = SAFE + contentW / 2;
  const centerY = TITLE_BAND + contentH / 2;

  const stroke = theme?.edges?.dependency ?? theme?.rule ?? theme?.border ?? "#64748b";

  // 1. Vertical axis dividing left and right quadrants
  const vAxis = doc.createElementNS("http://www.w3.org/2000/svg", "line");
  vAxis.classList.add("markdy-quadrant-vaxis");
  vAxis.setAttribute("x1", String(centerX));
  vAxis.setAttribute("y1", String(TITLE_BAND + 16));
  vAxis.setAttribute("x2", String(centerX));
  vAxis.setAttribute("y2", String(bounds.height - SAFE - 16));
  vAxis.setAttribute("stroke", stroke);
  vAxis.setAttribute("stroke-width", "1.5");
  vAxis.setAttribute("stroke-dasharray", "5 5");
  vAxis.setAttribute("opacity", "0.65");
  svg.appendChild(vAxis);

  // 2. Horizontal axis dividing top and bottom quadrants
  const hAxis = doc.createElementNS("http://www.w3.org/2000/svg", "line");
  hAxis.classList.add("markdy-quadrant-haxis");
  hAxis.setAttribute("x1", String(SAFE + 16));
  hAxis.setAttribute("y1", String(centerY));
  hAxis.setAttribute("x2", String(bounds.width - SAFE - 16));
  hAxis.setAttribute("y2", String(centerY));
  hAxis.setAttribute("stroke", stroke);
  hAxis.setAttribute("stroke-width", "1.5");
  hAxis.setAttribute("stroke-dasharray", "5 5");
  hAxis.setAttribute("opacity", "0.65");
  svg.appendChild(hAxis);

  // 3. Center crosshair hub
  const hub = doc.createElementNS("http://www.w3.org/2000/svg", "circle");
  hub.classList.add("markdy-quadrant-hub");
  hub.setAttribute("cx", String(centerX));
  hub.setAttribute("cy", String(centerY));
  hub.setAttribute("r", "4");
  hub.setAttribute("fill", stroke);
  hub.setAttribute("opacity", "0.75");
  svg.appendChild(hub);
}
