import type { PositionedNode, ThemeTokens } from "@markdy/core";

export function mountTimelineLayer(
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

  const baselineY = (bounds.height + 40) / 2;
  const minX = Math.min(...nodes.map((n) => n.x)) - 20;
  const maxX = Math.max(...nodes.map((n) => n.x + n.width)) + 20;

  const strokeAxis = theme?.hairline ?? theme?.border ?? "#cbd5e1";
  const strokeBorder = theme?.border ?? "#cbd5e1";
  const accentColor = theme?.accent ?? "#38bdf8";
  const surfaceFill = theme?.surfaceRaised ?? theme?.surface ?? "#ffffff";

  // 1. Horizontal baseline track
  const axis = doc.createElementNS("http://www.w3.org/2000/svg", "line");
  axis.setAttribute("x1", String(Math.max(40, minX)));
  axis.setAttribute("y1", String(baselineY));
  axis.setAttribute("x2", String(Math.min(bounds.width - 40, maxX)));
  axis.setAttribute("y2", String(baselineY));
  axis.setAttribute("stroke", strokeAxis);
  axis.setAttribute("stroke-width", "2");
  axis.setAttribute("opacity", "0.6");
  svg.appendChild(axis);

  // 2. Milestone pips and vertical stem lines
  for (const node of nodes) {
    const nodeCenterX = node.x + node.width / 2;
    const isAbove = node.y + node.height <= baselineY + 10;
    const targetY = isAbove ? node.y + node.height : node.y;

    // Stem line from node to baseline
    const stem = doc.createElementNS("http://www.w3.org/2000/svg", "line");
    stem.setAttribute("x1", String(nodeCenterX));
    stem.setAttribute("y1", String(baselineY));
    stem.setAttribute("x2", String(nodeCenterX));
    stem.setAttribute("y2", String(targetY));
    stem.setAttribute("stroke", node.focal ? accentColor : strokeBorder);
    stem.setAttribute("stroke-width", node.focal ? "1.5" : "1");
    stem.setAttribute("stroke-dasharray", node.focal ? "none" : "3 3");
    stem.setAttribute("opacity", node.focal ? "0.9" : "0.5");
    svg.appendChild(stem);

    // Baseline milestone pip
    const pip = doc.createElementNS("http://www.w3.org/2000/svg", "circle");
    pip.setAttribute("cx", String(nodeCenterX));
    pip.setAttribute("cy", String(baselineY));
    pip.setAttribute("r", node.focal ? "5" : "3.5");
    pip.setAttribute("fill", node.focal ? accentColor : surfaceFill);
    pip.setAttribute("stroke", node.focal ? accentColor : strokeBorder);
    pip.setAttribute("stroke-width", "1.5");
    svg.appendChild(pip);
  }
}
