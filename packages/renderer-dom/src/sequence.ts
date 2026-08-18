import type {
  PositionedNode,
  SequenceActivation,
  SequenceMessage,
  ThemeTokens,
} from "@markdy/core";

let sequenceLayerCounter = 0;

function markerId(prefix: string): string {
  sequenceLayerCounter += 1;
  return `md-sequence-${prefix}-${sequenceLayerCounter}`;
}

function appendMarker(
  doc: Document,
  defs: SVGDefsElement,
  id: string,
  kind: SequenceMessage["kind"],
  color: string,
): void {
  const marker = doc.createElementNS("http://www.w3.org/2000/svg", "marker");
  marker.setAttribute("id", id);
  marker.setAttribute("viewBox", "0 0 10 10");
  marker.setAttribute("refX", "8.5");
  marker.setAttribute("refY", "5");
  marker.setAttribute("markerWidth", "7");
  marker.setAttribute("markerHeight", "7");
  marker.setAttribute("orient", "auto");

  const path = doc.createElementNS("http://www.w3.org/2000/svg", "path");
  if (kind === "response") {
    path.setAttribute("d", "M 1.5 1.6 L 9 5 L 1.5 8.4");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", color);
    path.setAttribute("stroke-width", "1.4");
  } else if (kind === "event") {
    path.setAttribute("d", "M 5 2 A 3 3 0 1 1 5 8 A 3 3 0 1 1 5 2");
    path.setAttribute("fill", color);
  } else {
    path.setAttribute("d", "M 1.5 1.6 L 9 5 L 1.5 8.4 L 3.4 5 Z");
    path.setAttribute("fill", color);
  }
  marker.appendChild(path);
  defs.appendChild(marker);
}

function createText(
  doc: Document,
  x: number,
  y: number,
  text: string,
  theme: ThemeTokens,
): SVGTextElement {
  const label = doc.createElementNS("http://www.w3.org/2000/svg", "text");
  label.setAttribute("x", String(x));
  label.setAttribute("y", String(y));
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("dominant-baseline", "middle");
  label.setAttribute("font-size", "11");
  label.setAttribute("font-family", theme.fonts?.mono ?? "ui-monospace, SFMono-Regular, Menlo, monospace");
  label.setAttribute("fill", theme.text);
  label.textContent = text;
  return label;
}

export function mountSequenceLayer(
  layer: HTMLElement,
  nodes: PositionedNode[],
  messages: SequenceMessage[],
  activations: SequenceActivation[],
  theme: ThemeTokens,
  bounds: { width: number; height: number },
): Animation[] {
  Object.assign(layer.style, {
    position: "absolute",
    inset: "0",
    zIndex: "52",
    pointerEvents: "none",
  });

  const doc = layer.ownerDocument;
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

  const defs = doc.createElementNS("http://www.w3.org/2000/svg", "defs");
  const markers = new Map<SequenceMessage["kind"], string>();
  for (const kind of ["request", "response", "event"] as const) {
    const id = markerId(kind);
    markers.set(kind, id);
    appendMarker(doc, defs, id, kind, theme.edges[kind]);
  }
  svg.appendChild(defs);

  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const centerX = (id: string): number => {
    const node = nodeById.get(id);
    return node ? node.x + node.width / 2 : 0;
  };

  for (const node of nodes) {
    const x = centerX(node.id);
    const lifeline = doc.createElementNS("http://www.w3.org/2000/svg", "line");
    lifeline.classList.add("markdy-sequence-lifeline");
    lifeline.setAttribute("x1", String(x));
    lifeline.setAttribute("x2", String(x));
    lifeline.setAttribute("y1", String(node.y + node.height + 8));
    lifeline.setAttribute("y2", String(bounds.height - 32));
    lifeline.setAttribute("stroke", theme.hairline ?? theme.border);
    lifeline.setAttribute("stroke-width", "1.2");
    lifeline.setAttribute("stroke-dasharray", "4 6");
    lifeline.setAttribute("opacity", "0.85");
    svg.appendChild(lifeline);
  }

  for (const activation of activations) {
    const x = centerX(activation.participant);
    const bar = doc.createElementNS("http://www.w3.org/2000/svg", "rect");
    bar.classList.add("markdy-sequence-activation");
    bar.setAttribute("x", String(x - 6));
    bar.setAttribute("y", String(activation.y));
    bar.setAttribute("width", "12");
    bar.setAttribute("height", String(activation.height));
    bar.setAttribute("rx", "4");
    bar.setAttribute("fill", theme.accent);
    bar.setAttribute("opacity", "0");
    bar.style.filter = `drop-shadow(0 0 6px ${theme.accent}66)`;
    svg.appendChild(bar);
  }

  const animations: Animation[] = [];
  for (const message of messages) {
    const fromX = centerX(message.from);
    const toX = centerX(message.to);
    const group = doc.createElementNS("http://www.w3.org/2000/svg", "g");
    group.classList.add("markdy-sequence-message");
    group.setAttribute("data-message", message.id);
    group.style.opacity = "0";

    const line = doc.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(fromX));
    line.setAttribute("x2", String(toX));
    line.setAttribute("y1", String(message.y));
    line.setAttribute("y2", String(message.y));
    line.setAttribute("stroke", theme.edges[message.kind]);
    line.setAttribute("stroke-width", "2");
    line.setAttribute("stroke-linecap", "round");
    if (message.kind === "response") line.setAttribute("stroke-dasharray", "6 4");
    if (message.kind === "event") line.setAttribute("stroke-dasharray", "2 6");
    if (message.kind !== "dependency") {
      const marker = markers.get(message.kind);
      if (marker) line.setAttribute("marker-end", `url(#${marker})`);
    }
    group.appendChild(line);

    if (message.label) {
      const midX = (fromX + toX) / 2;
      const plate = doc.createElementNS("http://www.w3.org/2000/svg", "rect");
      const width = message.label.length * 6.8 + 16;
      plate.setAttribute("x", String(midX - width / 2));
      plate.setAttribute("y", String(message.y - 25));
      plate.setAttribute("width", String(width));
      plate.setAttribute("height", "20");
      plate.setAttribute("rx", "6");
      plate.setAttribute("fill", theme.labelPlate ?? theme.surface);
      plate.setAttribute("fill-opacity", "0.96");
      plate.setAttribute("stroke", theme.hairline ?? `color-mix(in srgb, ${theme.border} 70%, transparent)`);
      plate.setAttribute("stroke-width", "1");
      plate.style.filter = "drop-shadow(0 1px 3px rgba(0,0,0,0.12))";
      group.appendChild(plate);
      group.appendChild(createText(doc, midX, message.y - 14.5, message.label, theme));
    }

    svg.appendChild(group);
    animations.push(
      group.animate(
        [{ opacity: 0 }, { opacity: 1 }],
        {
          duration: Math.max(160, message.duration * 1000),
          delay: message.start * 1000,
          fill: "forwards",
          easing: "ease-out",
        },
      ),
    );
  }

  const activationEls = Array.from(svg.querySelectorAll<SVGRectElement>(".markdy-sequence-activation"));
  activationEls.forEach((bar, index) => {
    const activation = activations[index];
    if (!activation) return;
    animations.push(
      bar.animate(
        [{ opacity: 0 }, { opacity: 0.9, offset: 0.2 }, { opacity: 0 }],
        {
          duration: Math.max(120, activation.duration * 1000),
          delay: activation.start * 1000,
          fill: "none",
          easing: "ease-out",
        },
      ),
    );
  });

  for (const animation of animations) animation.pause();
  return animations;
}
