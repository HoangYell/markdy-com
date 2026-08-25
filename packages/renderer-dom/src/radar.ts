import type { PositionedNode, ThemeTokens } from "@markdy/core";

export function mountRadarLayer(
  layer: HTMLElement,
  nodes: PositionedNode[],
  theme: ThemeTokens,
  bounds: { width: number; height: number },
): void {
  if (nodes.length < 3) return;
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

  const nodeCenters = nodes.map((n) => ({
    x: n.x + n.width / 2,
    y: n.y + n.height / 2,
  }));

  const strokeAxis = theme?.edges?.dependency ?? theme?.rule ?? theme?.border ?? "#64748b";
  const strokeRing = theme?.rule ?? theme?.edges?.dependency ?? theme?.border ?? "#64748b";
  const accentColor = theme?.accent ?? "#38bdf8";

  // 1. Draw radial spoke axes from center to each node
  for (const nc of nodeCenters) {
    const line = doc.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(centerX));
    line.setAttribute("y1", String(centerY));
    line.setAttribute("x2", String(nc.x));
    line.setAttribute("y2", String(nc.y));
    line.setAttribute("stroke", strokeAxis);
    line.setAttribute("stroke-width", "1.2");
    line.setAttribute("stroke-dasharray", "4 4");
    line.setAttribute("opacity", "0.6");
    svg.appendChild(line);
  }

  // 2. Draw 3 concentric polygon rings (33%, 66%, 100%)
  const fractions = [0.33, 0.66, 1.0];
  for (const f of fractions) {
    const points = nodeCenters
      .map((nc) => {
        const px = centerX + (nc.x - centerX) * f;
        const py = centerY + (nc.y - centerY) * f;
        return `${px.toFixed(1)},${py.toFixed(1)}`;
      })
      .join(" ");

    const poly = doc.createElementNS("http://www.w3.org/2000/svg", "polygon");
    poly.setAttribute("points", points);
    poly.setAttribute("fill", "none");
    poly.setAttribute("stroke", strokeRing);
    poly.setAttribute("stroke-width", f === 1.0 ? "1.5" : "1.2");
    poly.setAttribute("stroke-dasharray", f === 1.0 ? "none" : "4 4");
    poly.setAttribute("opacity", String(0.4 + f * 0.3));
    svg.appendChild(poly);
  }

  // 3. Center point dot
  const centerDot = doc.createElementNS("http://www.w3.org/2000/svg", "circle");
  centerDot.setAttribute("cx", String(centerX));
  centerDot.setAttribute("cy", String(centerY));
  centerDot.setAttribute("r", "3");
  centerDot.setAttribute("fill", strokeAxis);
  centerDot.setAttribute("opacity", "0.8");
  svg.appendChild(centerDot);

  // 4. Draw a subtle translucent polygon area connecting the nodes
  const areaPoints = nodeCenters
    .map((nc, idx) => {
      const f = 0.75 + ((idx % 3) * 0.12);
      const px = centerX + (nc.x - centerX) * f;
      const py = centerY + (nc.y - centerY) * f;
      return `${px.toFixed(1)},${py.toFixed(1)}`;
    })
    .join(" ");

  const area = doc.createElementNS("http://www.w3.org/2000/svg", "polygon");
  area.setAttribute("points", areaPoints);
  area.setAttribute("fill", accentColor);
  area.setAttribute("fill-opacity", "0.08");
  area.setAttribute("stroke", accentColor);
  area.setAttribute("stroke-width", "1.5");
  area.setAttribute("stroke-dasharray", "4 4");
  area.setAttribute("opacity", "0.7");
  svg.appendChild(area);
}
