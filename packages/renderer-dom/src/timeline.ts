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

  const SAFE = 40;
  const TITLE_BAND = 64;
  const strokeAxis = theme?.edges?.dependency ?? theme?.rule ?? theme?.border ?? "#64748b";
  const strokeBorder = theme?.edges?.dependency ?? theme?.border ?? "#64748b";
  const accentColor = theme?.accent ?? "#38bdf8";
  const surfaceFill = theme?.surfaceRaised ?? theme?.surface ?? "#ffffff";

  const isVertical = bounds.height > bounds.width || (nodes.length > 1 && Math.abs(nodes[1].y - nodes[0].y) > Math.abs(nodes[1].x - nodes[0].x));

  if (isVertical) {
    const centerX = bounds.width / 2;
    const minY = Math.min(...nodes.map((n) => n.y)) - 16;
    const maxY = Math.max(...nodes.map((n) => n.y + n.height)) + 16;

    // 1. Vertical baseline track
    const axis = doc.createElementNS("http://www.w3.org/2000/svg", "line");
    axis.setAttribute("class", "markdy-timeline-axis");
    axis.setAttribute("x1", String(centerX));
    axis.setAttribute("y1", String(Math.max(SAFE, minY)));
    axis.setAttribute("x2", String(centerX));
    axis.setAttribute("y2", String(Math.min(bounds.height - SAFE, maxY)));
    axis.setAttribute("stroke", strokeAxis);
    axis.setAttribute("stroke-width", "2");
    axis.setAttribute("stroke-linecap", "round");
    axis.setAttribute("opacity", "0.75");
    svg.appendChild(axis);

    // 2. Milestone pips and horizontal stem lines
    for (const node of nodes) {
      const nodeCenterY = node.y + node.height / 2;
      const isLeft = (node.x + node.width / 2) < centerX;
      const targetX = isLeft ? node.x + node.width : node.x;

      // Stem line from axis to node
      const stem = doc.createElementNS("http://www.w3.org/2000/svg", "line");
      stem.setAttribute("class", "markdy-timeline-stem");
      stem.setAttribute("x1", String(centerX));
      stem.setAttribute("y1", String(nodeCenterY));
      stem.setAttribute("x2", String(targetX));
      stem.setAttribute("y2", String(nodeCenterY));
      stem.setAttribute("stroke", node.focal ? accentColor : strokeBorder);
      stem.setAttribute("stroke-width", node.focal ? "2" : "1.5");
      stem.setAttribute("stroke-dasharray", node.focal ? "none" : "4 4");
      stem.setAttribute("opacity", node.focal ? "0.95" : "0.75");
      svg.appendChild(stem);

      // Baseline milestone pip
      const pip = doc.createElementNS("http://www.w3.org/2000/svg", "circle");
      pip.setAttribute("class", "markdy-timeline-pip");
      pip.setAttribute("cx", String(centerX));
      pip.setAttribute("cy", String(nodeCenterY));
      pip.setAttribute("r", node.focal ? "5.5" : "4");
      pip.setAttribute("fill", node.focal ? accentColor : surfaceFill);
      pip.setAttribute("stroke", node.focal ? accentColor : strokeBorder);
      pip.setAttribute("stroke-width", "2");
      svg.appendChild(pip);
    }
  } else {
    const contentH = bounds.height - SAFE - TITLE_BAND - SAFE;
    const baselineY = TITLE_BAND + contentH / 2;
    const minX = Math.min(...nodes.map((n) => n.x)) - 20;
    const maxX = Math.max(...nodes.map((n) => n.x + n.width)) + 20;

    // 1. Horizontal baseline track
    const axis = doc.createElementNS("http://www.w3.org/2000/svg", "line");
    axis.setAttribute("class", "markdy-timeline-axis");
    axis.setAttribute("x1", String(Math.max(40, minX)));
    axis.setAttribute("y1", String(baselineY));
    axis.setAttribute("x2", String(Math.min(bounds.width - 40, maxX)));
    axis.setAttribute("y2", String(baselineY));
    axis.setAttribute("stroke", strokeAxis);
    axis.setAttribute("stroke-width", "2");
    axis.setAttribute("stroke-linecap", "round");
    axis.setAttribute("opacity", "0.75");
    svg.appendChild(axis);

    // 2. Milestone pips and vertical stem lines
    for (const node of nodes) {
      const nodeCenterX = node.x + node.width / 2;
      const isAbove = node.y + node.height <= baselineY + 10;
      const targetY = isAbove ? node.y + node.height : node.y;

      // Stem line from node to baseline
      const stem = doc.createElementNS("http://www.w3.org/2000/svg", "line");
      stem.setAttribute("class", "markdy-timeline-stem");
      stem.setAttribute("x1", String(nodeCenterX));
      stem.setAttribute("y1", String(baselineY));
      stem.setAttribute("x2", String(nodeCenterX));
      stem.setAttribute("y2", String(targetY));
      stem.setAttribute("stroke", node.focal ? accentColor : strokeBorder);
      stem.setAttribute("stroke-width", node.focal ? "2" : "1.5");
      stem.setAttribute("stroke-dasharray", node.focal ? "none" : "4 4");
      stem.setAttribute("opacity", node.focal ? "0.95" : "0.75");
      svg.appendChild(stem);

      // Baseline milestone pip
      const pip = doc.createElementNS("http://www.w3.org/2000/svg", "circle");
      pip.setAttribute("class", "markdy-timeline-pip");
      pip.setAttribute("cx", String(nodeCenterX));
      pip.setAttribute("cy", String(baselineY));
      pip.setAttribute("r", node.focal ? "5.5" : "4");
      pip.setAttribute("fill", node.focal ? accentColor : surfaceFill);
      pip.setAttribute("stroke", node.focal ? accentColor : strokeBorder);
      pip.setAttribute("stroke-width", "2");
      svg.appendChild(pip);
    }
  }
}
