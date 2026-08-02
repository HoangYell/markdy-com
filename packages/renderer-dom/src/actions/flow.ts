/**
 * `request` / `response` / `emit` — animated edges between system-diagram
 * nodes, used by the `@markdy/stdlib-systems` actor pack.
 *
 * An edge is drawn as an SVG polyline routed around the other actors, then
 * revealed by animating its dash offset while a dot travels along it. Edges
 * are transient: they fade out as soon as their traversal finishes, so a
 * busy sequence diagram doesn't accumulate clutter.
 */
import type { ActionContext, ActionHandler } from "./context.js";
import type { ActorState } from "../types.js";
import { placeFlowLabel, polylineLength, routeFlowPath, toPathD } from "../geometry/path.js";
import { actorRect, inflateRect, type Rect } from "../geometry/rect.js";

const EDGE_LAYER_ATTR = "data-markdy-edge-layer";

/** Stroke color per flow verb — request out, response back, emit fire-and-forget. */
const STROKE_BY_ACTION: Record<string, string> = {
  request: "#38bdf8",
  response: "#a78bfa",
  emit: "#f59e0b",
};

const DEFAULT_STROKE = "#38bdf8";
const LABEL_MAX_CHARS = 28;
/** Approximate rendered width of one label character at 12px bold, in px. */
const LABEL_CHAR_PX = 6.8;
/** How long the draw-on / fade-in of an edge takes, in milliseconds. */
const EDGE_REVEAL_MS = 220;

/**
 * Per-scene registry of placed label rectangles.
 *
 * Flow edges are built independently (one call to `buildEdge` each), but their
 * labels must not collide, so each edge records the box it claimed here and
 * later edges route their labels around the accumulated set. Keyed by the SVG
 * overlay element so a rebuilt scene (new overlay) starts from a clean slate.
 */
const LABEL_RECTS = new WeakMap<SVGSVGElement, Rect[]>();

/**
 * Lazily creates the shared SVG overlay that all flow edges draw into.
 *
 * One layer per scene keeps z-ordering predictable: edges sit above actors
 * (z-index 95) but below speech bubbles and the progress chrome.
 */
function ensureEdgeLayer(scene: HTMLElement): SVGSVGElement {
  const existing = scene.querySelector<SVGSVGElement>(`svg[${EDGE_LAYER_ATTR}='1']`);
  if (existing) return existing;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute(EDGE_LAYER_ATTR, "1");
  Object.assign(svg.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    overflow: "visible",
    pointerEvents: "none",
    zIndex: "95",
  });
  scene.appendChild(svg);
  return svg;
}

function ensureEdgeDefs(svg: SVGSVGElement): void {
  if (svg.querySelector("defs[data-markdy-flow-defs='1']")) return;

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.setAttribute("data-markdy-flow-defs", "1");

  const glow = document.createElementNS("http://www.w3.org/2000/svg", "filter");
  glow.setAttribute("id", "markdy-flow-glow");
  glow.setAttribute("x", "-40%");
  glow.setAttribute("y", "-40%");
  glow.setAttribute("width", "180%");
  glow.setAttribute("height", "180%");
  const blur = document.createElementNS("http://www.w3.org/2000/svg", "feGaussianBlur");
  blur.setAttribute("stdDeviation", "3");
  blur.setAttribute("result", "coloredBlur");
  const merge = document.createElementNS("http://www.w3.org/2000/svg", "feMerge");
  const glowNode = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
  glowNode.setAttribute("in", "coloredBlur");
  const sourceNode = document.createElementNS("http://www.w3.org/2000/svg", "feMergeNode");
  sourceNode.setAttribute("in", "SourceGraphic");
  merge.append(glowNode, sourceNode);
  glow.append(blur, merge);

  const arrow = document.createElementNS("http://www.w3.org/2000/svg", "marker");
  arrow.setAttribute("id", "markdy-flow-arrow");
  arrow.setAttribute("viewBox", "0 0 10 10");
  arrow.setAttribute("refX", "8");
  arrow.setAttribute("refY", "5");
  arrow.setAttribute("markerWidth", "6");
  arrow.setAttribute("markerHeight", "6");
  arrow.setAttribute("orient", "auto-start-reverse");
  const arrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
  arrowPath.setAttribute("d", "M 1 1 L 9 5 L 1 9 z");
  arrowPath.setAttribute("fill", "context-stroke");
  arrow.appendChild(arrowPath);

  defs.append(glow, arrow);
  svg.prepend(defs);
}

/**
 * `response` edges and anything explicitly marked `dashed` /
 * `fire_and_forget` render as a dashed line rather than a solid draw-on.
 */
function isDashed(ctx: ActionContext): boolean {
  const style = String(ctx.ev.params.style ?? "");
  return style === "dashed" || style === "fire_and_forget" || ctx.ev.action === "response";
}

/**
 * Bounding box an edge label must dodge.
 *
 * Normal top-left-anchored actors use their `actorRect`. A `caption` is a
 * centered overlay ribbon whose real rendered width depends on its text (and
 * so isn't known here), so we reserve its full-width horizontal band — which
 * is also what a title/subtitle visually occupies — keeping edge labels out
 * of the title zone entirely.
 */
function nodeObstacleRect(state: ActorState, type: string, sceneWidth: number): Rect {
  const rect = actorRect(state, type);
  if (type !== "caption") return rect;
  const halfH = (rect.y2 - rect.y1) / 2 + 4;
  return { x1: 0, y1: state.y - halfH, x2: sceneWidth, y2: state.y + halfH };
}

function buildEdge(ctx: ActionContext, targetName: string): void {
  const { ev, state, states, ast, scene, baseOpts, anims } = ctx;
  const targetState = states.get(targetName);
  if (!targetState) return;

  // Fan concurrent edges out into separate lanes so parallel calls between
  // the same nodes stay individually readable. Derived from the source line
  // so the same scene always routes identically.
  const lane = (ev.line % 5) - 2;

  const points = routeFlowPath(ev.actor, targetName, state, targetState, states, ast, lane);
  const length = polylineLength(points);
  const pathD = toPathD(points);
  const stroke = STROKE_BY_ACTION[ev.action] ?? DEFAULT_STROKE;
  const svg = ensureEdgeLayer(scene);
  ensureEdgeDefs(svg);

  const startMs = Number(baseOpts.delay ?? 0);
  const durationMs = Math.max(1, Number(baseOpts.duration ?? 500));
  const revealMs = Math.min(EDGE_REVEAL_MS, durationMs);

  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("data-markdy-flow-edge", "1");
  // Hidden until the edge's scheduled time; `fill: both` on the reveal below
  // holds this 0 during the delay so future edges don't show early, then the
  // edge draws on and stays part of the assembled diagram.
  group.style.opacity = "0";

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathD);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", stroke);
  path.setAttribute("stroke-width", "3");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  path.setAttribute("marker-end", "url(#markdy-flow-arrow)");
  path.setAttribute("filter", "url(#markdy-flow-glow)");
  path.setAttribute("data-markdy-flow-action", ev.action);
  // A solid edge draws itself on by retracting one full-length dash; a
  // dashed edge keeps a repeating pattern and slides it instead.
  path.style.strokeDasharray = isDashed(ctx) ? "8 6" : `${length}`;
  path.style.strokeDashoffset = `${length}`;
  group.appendChild(path);

  const marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  marker.setAttribute("r", "4.5");
  marker.setAttribute("fill", stroke);
  marker.setAttribute("filter", "url(#markdy-flow-glow)");
  marker.style.offsetPath = `path('${pathD}')`;
  marker.style.offsetDistance = "0%";
  marker.style.opacity = "0";
  group.appendChild(marker);

  const labelText = String(ev.params.label ?? "");
  if (labelText) {
    const shown =
      labelText.length > LABEL_MAX_CHARS ? `${labelText.slice(0, LABEL_MAX_CHARS - 1)}…` : labelText;
    const textWidth = shown.length * LABEL_CHAR_PX + 12;

    const placed = LABEL_RECTS.get(svg) ?? (LABEL_RECTS.set(svg, []), LABEL_RECTS.get(svg)!);
    const obstacles: Rect[] = [...placed];
    for (const [name, nodeState] of states.entries()) {
      const type = ast.actors[name]?.type ?? "box";
      obstacles.push(inflateRect(nodeObstacleRect(nodeState, type, ast.meta.width), 2));
    }

    const spot = placeFlowLabel(points, textWidth, obstacles, ast);
    placed.push(spot.rect);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", `${spot.x}`);
    label.setAttribute("y", `${spot.y}`);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("dominant-baseline", "middle");
    label.setAttribute("font-size", "12");
    label.setAttribute("font-weight", "700");
    label.setAttribute("paint-order", "stroke");
    label.setAttribute("stroke", "rgba(2, 6, 23, 0.9)");
    label.setAttribute("stroke-width", "5");
    label.setAttribute("stroke-linejoin", "round");
    label.setAttribute("fill", "#dbe4f0");
    label.setAttribute("data-full-label", labelText);
    label.textContent = shown;
    group.appendChild(label);
  }

  svg.appendChild(group);

  anims.push(
    path.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], baseOpts),
    // Travel the dot along the edge, then fade it at arrival so the finished
    // edge is a clean line + arrowhead rather than a dot resting on the tip.
    marker.animate(
      [
        { offsetDistance: "0%", opacity: 1, offset: 0 },
        { offsetDistance: "100%", opacity: 1, offset: 0.82 },
        { offsetDistance: "100%", opacity: 0, offset: 1 },
      ],
      baseOpts,
    ),
    // Reveal the edge at its scheduled time and keep it (persist). `fill: both`
    // holds opacity 0 during the delay, so nothing appears before its turn.
    group.animate([{ opacity: 0 }, { opacity: 1 }], {
      delay: startMs,
      duration: revealMs,
      fill: "both",
    }),
  );
}

/** All three flow verbs share one implementation; only stroke and dash differ. */
export const flowEdge: ActionHandler = (ctx) => {
  const targetName = String(ctx.ev.params.to ?? "");
  if (targetName) buildEdge(ctx, targetName);
};
