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
  label.setAttribute("dominant-baseline", "central");
  label.setAttribute("font-size", "11");
  label.setAttribute("font-weight", "500");
  label.setAttribute("font-family", "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace");
  label.setAttribute("fill", theme.text);
  label.setAttribute("paint-order", "stroke fill");
  label.setAttribute("stroke", theme.labelPlate ?? theme.surface);
  label.setAttribute("stroke-width", "3px");
  label.setAttribute("stroke-linejoin", "round");
  label.textContent = text;
  return label;
}

function resolveLifelineStroke(theme: ThemeTokens): string {
  return theme.edges?.dependency ?? theme.rule ?? theme.border ?? "#64748b";
}

function syncAnimationGroup(primary: Animation, followers: Animation[]): Animation {
  if (followers.length === 0) return primary;
  const all = [primary, ...followers];
  const controlMethods = new Set(["play", "pause", "cancel", "finish", "reverse"]);
  const syncProps = new Set(["currentTime", "playbackRate", "startTime"]);
  return new Proxy(primary, {
    get(target, prop, receiver) {
      if (typeof prop === "string" && controlMethods.has(prop)) {
        return (...args: unknown[]) => {
          for (const anim of all) {
            const fn = Reflect.get(anim, prop) as ((...a: unknown[]) => unknown) | undefined;
            if (typeof fn === "function") fn.apply(anim, args);
          }
        };
      }
      const val = Reflect.get(target, prop, receiver);
      return typeof val === "function" ? val.bind(target) : val;
    },
    set(target, prop, value) {
      if (typeof prop === "string" && syncProps.has(prop)) {
        for (const anim of all) Reflect.set(anim, prop, value);
        return true;
      }
      return Reflect.set(target, prop, value);
    },
  });
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
  Object.assign(svg.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    overflow: "visible",
    pointerEvents: "none",
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

  const lifelineStroke = resolveLifelineStroke(theme);
  for (const node of nodes) {
    const x = centerX(node.id);
    const lifeline = doc.createElementNS("http://www.w3.org/2000/svg", "line");
    lifeline.classList.add("markdy-sequence-lifeline");
    lifeline.setAttribute("x1", String(x));
    lifeline.setAttribute("x2", String(x));
    lifeline.setAttribute("y1", String(node.y + node.height));
    lifeline.setAttribute("y2", String(bounds.height - 36));
    lifeline.setAttribute("stroke", lifelineStroke);
    lifeline.setAttribute("stroke-width", "1.5");
    lifeline.setAttribute("stroke-dasharray", "5 5");
    lifeline.setAttribute("opacity", "0.85");
    svg.appendChild(lifeline);

    const cap = doc.createElementNS("http://www.w3.org/2000/svg", "circle");
    cap.classList.add("markdy-sequence-lifeline-cap");
    cap.setAttribute("cx", String(x));
    cap.setAttribute("cy", String(bounds.height - 36));
    cap.setAttribute("r", "2.5");
    cap.setAttribute("fill", lifelineStroke);
    cap.setAttribute("opacity", "0.85");
    svg.appendChild(cap);
  }

  activations.forEach((activation, index) => {
    const x = centerX(activation.participant);
    const bar = doc.createElementNS("http://www.w3.org/2000/svg", "rect");
    bar.classList.add("markdy-sequence-activation");
    bar.setAttribute("data-activation-index", String(index));
    bar.setAttribute("x", String(x - 6));
    bar.setAttribute("y", String(activation.y));
    bar.setAttribute("width", "12");
    bar.setAttribute("height", String(activation.height));
    bar.setAttribute("rx", "4");
    bar.setAttribute("fill", theme.accent);
    bar.setAttribute("opacity", "0");
    bar.style.filter = `drop-shadow(0 0 6px ${theme.accent}66)`;
    svg.appendChild(bar);
  });

  const animations: Animation[] = [];
  for (const message of messages) {
    const fromX = centerX(message.from);
    const toX = centerX(message.to);
    const group = doc.createElementNS("http://www.w3.org/2000/svg", "g");
    group.classList.add("markdy-sequence-message");
    group.setAttribute("data-message", message.id);
    group.setAttribute("data-message-id", message.id);

    const line = doc.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(fromX));
    line.setAttribute("x2", String(toX));
    line.setAttribute("y1", String(message.y));
    line.setAttribute("y2", String(message.y));
    line.setAttribute("stroke", theme.edges[message.kind]);
    line.setAttribute("stroke-width", "2");
    line.setAttribute("stroke-linecap", "round");
    line.style.opacity = "0";
    if (message.kind === "response") line.setAttribute("stroke-dasharray", "6 4");
    if (message.kind === "event") line.setAttribute("stroke-dasharray", "2 6");
    if (message.kind !== "dependency") {
      const marker = markers.get(message.kind);
      if (marker) line.setAttribute("marker-end", `url(#${marker})`);
    }
    group.appendChild(line);

    let plateEl: SVGRectElement | null = null;
    let textEl: SVGTextElement | null = null;
    if (message.label) {
      const midX = (fromX + toX) / 2;
      const plate = doc.createElementNS("http://www.w3.org/2000/svg", "rect");
      const width = Math.max(40, message.label.length * 6.8 + 18);
      plate.setAttribute("x", String(midX - width / 2));
      plate.setAttribute("y", String(message.y - 26));
      plate.setAttribute("width", String(width));
      plate.setAttribute("height", "22");
      plate.setAttribute("rx", "6");
      plate.setAttribute("fill", theme.labelPlate ?? theme.surface);
      plate.setAttribute("fill-opacity", "0.96");
      plate.setAttribute("stroke", theme.hairline ?? `color-mix(in srgb, ${theme.border} 70%, transparent)`);
      plate.setAttribute("stroke-width", "1");
      plate.style.opacity = "0";
      plateEl = plate;
      group.appendChild(plate);
      textEl = createText(doc, midX, message.y - 15, message.label, theme);
      textEl.style.opacity = "0";
      group.appendChild(textEl);
    }

    const pulse = doc.createElementNS("http://www.w3.org/2000/svg", "circle");
    pulse.setAttribute("r", "4");
    pulse.setAttribute("fill", theme.edges[message.kind] || theme.accent);
    pulse.classList.add("markdy-sequence-pulse");
    pulse.style.opacity = "0";
    pulse.style.filter = `drop-shadow(0 0 6px ${theme.edges[message.kind] || theme.accent})`;
    group.appendChild(pulse);

    svg.appendChild(group);
    const durMs = Math.max(160, message.duration * 1000);
    const startMs = message.start * 1000;
    const revealTiming: KeyframeAnimationOptions = {
      duration: 140,
      delay: startMs,
      fill: "both",
      easing: "ease-out",
    };
    const lineAnim = line.animate([{ opacity: 0 }, { opacity: 1 }], revealTiming);
    const followers: Animation[] = [];
    if (plateEl) followers.push(plateEl.animate([{ opacity: 0 }, { opacity: 1 }], revealTiming));
    if (textEl) followers.push(textEl.animate([{ opacity: 0 }, { opacity: 1 }], revealTiming));
    animations.push(
      syncAnimationGroup(lineAnim, followers),
      pulse.animate(
        [
          { transform: `translate(${fromX}px, ${message.y}px)`, opacity: 0 },
          { transform: `translate(${fromX}px, ${message.y}px)`, opacity: 1, offset: 0.1 },
          { transform: `translate(${toX}px, ${message.y}px)`, opacity: 1, offset: 0.9 },
          { transform: `translate(${toX}px, ${message.y}px)`, opacity: 0 },
        ],
        {
          duration: durMs,
          delay: startMs,
          fill: "forwards",
          easing: "cubic-bezier(0.2, 0.85, 0.4, 1)",
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

export function updateSequenceLayerTheme(layer: HTMLElement, theme: ThemeTokens): void {
  const svg = layer.querySelector("svg");
  if (!svg) return;

  const defs = svg.querySelector("defs");
  if (defs) {
    Array.from(defs.querySelectorAll("marker")).forEach((marker) => {
      const id = marker.getAttribute("id") || "";
      const path = marker.querySelector("path");
      if (path) {
        if (id.includes("response")) {
          path.setAttribute("stroke", theme.edges.response);
        } else if (id.includes("event")) {
          path.setAttribute("fill", theme.edges.event);
        } else {
          path.setAttribute("fill", theme.edges.request);
        }
      }
    });
  }

  const lifelineStroke = resolveLifelineStroke(theme);
  Array.from(svg.querySelectorAll(".markdy-sequence-lifeline")).forEach((line) => {
    line.setAttribute("stroke", lifelineStroke);
  });
  Array.from(svg.querySelectorAll(".markdy-sequence-lifeline-cap")).forEach((cap) => {
    cap.setAttribute("fill", lifelineStroke);
  });

  Array.from(svg.querySelectorAll(".markdy-sequence-activation")).forEach((bar) => {
    bar.setAttribute("fill", theme.accent);
    (bar as HTMLElement).style.filter = `drop-shadow(0 0 6px ${theme.accent}66)`;
  });

  Array.from(svg.querySelectorAll(".markdy-sequence-message")).forEach((group) => {
    const line = group.querySelector("line");
    if (line) {
      const markerEnd = line.getAttribute("marker-end") || "";
      if (markerEnd.includes("response")) line.setAttribute("stroke", theme.edges.response);
      else if (markerEnd.includes("event")) line.setAttribute("stroke", theme.edges.event);
      else line.setAttribute("stroke", theme.edges.request);
    }
    const plate = group.querySelector("rect");
    if (plate) {
      plate.setAttribute("fill", theme.labelPlate ?? theme.surface);
      plate.setAttribute("stroke", theme.hairline ?? `color-mix(in srgb, ${theme.border} 70%, transparent)`);
    }
    const text = group.querySelector("text");
    if (text) {
      text.setAttribute("fill", theme.text);
      text.setAttribute("stroke", theme.labelPlate ?? theme.surface);
    }
  });
}
