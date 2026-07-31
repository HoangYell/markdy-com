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
import { pointAtDistance, polylineLength, round1, routeFlowPath, toPathD } from "../geometry/path.js";

const EDGE_LAYER_ATTR = "data-markdy-edge-layer";

/** Stroke color per flow verb — request out, response back, emit fire-and-forget. */
const STROKE_BY_ACTION: Record<string, string> = {
  request: "#38bdf8",
  response: "#a78bfa",
  emit: "#f59e0b",
};

const DEFAULT_STROKE = "#38bdf8";
const LABEL_MAX_CHARS = 28;
/** How long an edge lingers after its dot arrives, in milliseconds. */
const EDGE_FADE_MS = 140;

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

/**
 * `response` edges and anything explicitly marked `dashed` /
 * `fire_and_forget` render as a dashed line rather than a solid draw-on.
 */
function isDashed(ctx: ActionContext): boolean {
  const style = String(ctx.ev.params.style ?? "");
  return style === "dashed" || style === "fire_and_forget" || ctx.ev.action === "response";
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

  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("data-markdy-flow-edge", "1");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathD);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", stroke);
  path.setAttribute("stroke-width", "2.5");
  path.setAttribute("data-markdy-flow-action", ev.action);
  // A solid edge draws itself on by retracting one full-length dash; a
  // dashed edge keeps a repeating pattern and slides it instead.
  path.style.strokeDasharray = isDashed(ctx) ? "8 6" : `${length}`;
  path.style.strokeDashoffset = `${length}`;
  group.appendChild(path);

  const marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  marker.setAttribute("r", "3");
  marker.setAttribute("fill", stroke);
  marker.style.offsetPath = `path('${pathD}')`;
  marker.style.offsetDistance = "0%";
  marker.style.opacity = "0";
  group.appendChild(marker);

  const labelText = String(ev.params.label ?? "");
  if (labelText) {
    const midPoint = pointAtDistance(points, length * 0.5);
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", `${round1(midPoint.x)}`);
    label.setAttribute("y", `${round1(midPoint.y - 8)}`);
    label.setAttribute("text-anchor", "middle");
    label.setAttribute("font-size", "12");
    label.setAttribute("fill", "#cbd5e1");
    label.setAttribute("data-full-label", labelText);
    label.textContent =
      labelText.length > LABEL_MAX_CHARS ? `${labelText.slice(0, LABEL_MAX_CHARS - 1)}…` : labelText;
    group.appendChild(label);
  }

  ensureEdgeLayer(scene).appendChild(group);

  anims.push(
    path.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], baseOpts),
    marker.animate(
      [
        { offsetDistance: "0%", opacity: 1 },
        { offsetDistance: "100%", opacity: 1 },
      ],
      baseOpts,
    ),
    group.animate([{ opacity: 1 }, { opacity: 0 }], {
      delay: Number(baseOpts.delay ?? 0) + Number(baseOpts.duration ?? 0),
      duration: EDGE_FADE_MS,
      fill: "forwards",
    }),
  );
}

/** All three flow verbs share one implementation; only stroke and dash differ. */
export const flowEdge: ActionHandler = (ctx) => {
  const targetName = String(ctx.ev.params.to ?? "");
  if (targetName) buildEdge(ctx, targetName);
};
