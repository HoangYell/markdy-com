import type { PositionedNode, ThemeTokens } from "@markdy/core";

export function mountSwimlaneLayer(
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
  const contentH = bounds.height - SAFE - TITLE_BAND - SAFE;

  // Identify distinct lane bands based on unique Y coordinates
  const nodeYs = [...new Set(nodes.map((n) => Math.round(n.y)))].sort((a, b) => a - b);
  const laneCount = Math.max(nodeYs.length, 1);
  const laneHeight = contentH / laneCount;

  const stroke = theme?.edges?.dependency ?? theme?.rule ?? theme?.border ?? "#64748b";

  // Draw horizontal lane dividing lines
  for (let idx = 0; idx <= laneCount; idx++) {
    const y = TITLE_BAND + idx * laneHeight;
    const line = doc.createElementNS("http://www.w3.org/2000/svg", "line");
    line.classList.add("markdy-swimlane-divider");
    line.setAttribute("x1", String(SAFE));
    line.setAttribute("y1", String(y));
    line.setAttribute("x2", String(bounds.width - SAFE));
    line.setAttribute("y2", String(y));
    line.setAttribute("stroke", stroke);
    line.setAttribute("stroke-width", "1.2");
    line.setAttribute("stroke-dasharray", idx === 0 || idx === laneCount ? "none" : "5 5");
    line.setAttribute("opacity", idx === 0 || idx === laneCount ? "0.6" : "0.4");
    svg.appendChild(line);
  }
}
