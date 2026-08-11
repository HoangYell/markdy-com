import type { PositionedNode, ThemeTokens } from "@markdy/core";

let constellationId = 0;

function nextId(): string {
  constellationId += 1;
  return `md-constellation-${constellationId}`;
}

function appendCircle(
  doc: Document,
  parent: SVGElement,
  cx: number,
  cy: number,
  radius: number,
  stroke: string,
  opacity: string,
  dash?: string,
): void {
  const circle = doc.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("cx", String(cx));
  circle.setAttribute("cy", String(cy));
  circle.setAttribute("r", String(radius));
  circle.setAttribute("fill", "none");
  circle.setAttribute("stroke", stroke);
  circle.setAttribute("stroke-width", "1");
  circle.setAttribute("opacity", opacity);
  if (dash) circle.setAttribute("stroke-dasharray", dash);
  parent.appendChild(circle);
}

export function mountConstellationLayer(
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

  const focal = nodes.find((node) => node.focal) ?? nodes[0];
  const centerX = focal.x + focal.width / 2;
  const centerY = focal.y + focal.height / 2;
  const radius = Math.max(120, Math.min(bounds.width, bounds.height) * 0.28);
  const gradientId = `${nextId()}-halo`;
  const defs = doc.createElementNS("http://www.w3.org/2000/svg", "defs");
  const gradient = doc.createElementNS("http://www.w3.org/2000/svg", "radialGradient");
  gradient.setAttribute("id", gradientId);
  const stopA = doc.createElementNS("http://www.w3.org/2000/svg", "stop");
  stopA.setAttribute("offset", "0%");
  stopA.setAttribute("stop-color", theme.accent);
  stopA.setAttribute("stop-opacity", "0.24");
  const stopB = doc.createElementNS("http://www.w3.org/2000/svg", "stop");
  stopB.setAttribute("offset", "100%");
  stopB.setAttribute("stop-color", theme.accent);
  stopB.setAttribute("stop-opacity", "0");
  gradient.append(stopA, stopB);
  defs.appendChild(gradient);
  svg.appendChild(defs);

  const halo = doc.createElementNS("http://www.w3.org/2000/svg", "circle");
  halo.setAttribute("cx", String(centerX));
  halo.setAttribute("cy", String(centerY));
  halo.setAttribute("r", String(radius * 0.7));
  halo.setAttribute("fill", `url(#${gradientId})`);
  svg.appendChild(halo);

  appendCircle(doc, svg, centerX, centerY, radius * 0.55, theme.rule ?? theme.border, "0.55", "2 8");
  appendCircle(doc, svg, centerX, centerY, radius * 0.82, theme.rule ?? theme.border, "0.38", "1 11");
  appendCircle(doc, svg, centerX, centerY, radius, theme.soft ?? theme.border, "0.22", "1 15");

  for (const node of nodes) {
    if (node.id === focal.id) continue;
    const nodeX = node.x + node.width / 2;
    const nodeY = node.y + node.height / 2;
    const link = doc.createElementNS("http://www.w3.org/2000/svg", "line");
    link.classList.add("markdy-constellation-link");
    link.setAttribute("x1", String(centerX));
    link.setAttribute("y1", String(centerY));
    link.setAttribute("x2", String(nodeX));
    link.setAttribute("y2", String(nodeY));
    link.setAttribute("stroke", theme.soft ?? theme.accent);
    link.setAttribute("stroke-width", "1");
    link.setAttribute("stroke-dasharray", "2 9");
    link.setAttribute("opacity", "0.22");
    svg.appendChild(link);
  }

  for (let index = 0; index < 28; index += 1) {
    const angle = index * 2.399963;
    const distance = 70 + ((index * 47) % 190);
    const star = doc.createElementNS("http://www.w3.org/2000/svg", "circle");
    star.classList.add("markdy-constellation-star");
    star.setAttribute("cx", String(centerX + Math.cos(angle) * distance));
    star.setAttribute("cy", String(centerY + Math.sin(angle) * distance * 0.72));
    star.setAttribute("r", String(1 + (index % 3) * 0.45));
    star.setAttribute("fill", index % 4 === 0 ? theme.soft ?? theme.accent : theme.textMuted);
    star.setAttribute("opacity", String(0.28 + (index % 5) * 0.1));
    star.style.animationDelay = `${-(index % 7) * 0.45}s`;
    svg.appendChild(star);
  }
}
