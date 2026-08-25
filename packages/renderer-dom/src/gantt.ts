import type { PositionedNode, ThemeTokens } from "@markdy/core";

export function mountGanttLayer(
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
  const stroke = theme?.edges?.dependency ?? theme?.rule ?? theme?.border ?? "#64748b";

  // Derive phase count from nodes
  const totalPhases = Math.max(
    ...nodes.map((n) => {
      const p = typeof n.props?.phase === "number" ? n.props.phase : 0;
      const s = typeof n.props?.span === "number" ? n.props.span : 1;
      return p + s;
    }),
    4,
  );

  const minY = Math.min(...nodes.map((n) => n.y)) - 16;
  const maxY = Math.max(...nodes.map((n) => n.y + n.height)) + 16;
  const unitW = contentW / totalPhases;

  for (let phase = 0; phase <= totalPhases; phase++) {
    const x = SAFE + phase * unitW;
    const colLine = doc.createElementNS("http://www.w3.org/2000/svg", "line");
    colLine.classList.add("markdy-gantt-column");
    colLine.setAttribute("x1", String(x));
    colLine.setAttribute("y1", String(Math.max(TITLE_BAND, minY)));
    colLine.setAttribute("x2", String(x));
    colLine.setAttribute("y2", String(Math.min(bounds.height - SAFE, maxY)));
    colLine.setAttribute("stroke", stroke);
    colLine.setAttribute("stroke-width", "1");
    colLine.setAttribute("stroke-dasharray", "4 4");
    colLine.setAttribute("opacity", phase === 0 || phase === totalPhases ? "0.6" : "0.35");
    svg.appendChild(colLine);
  }
}
