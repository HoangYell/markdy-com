import type { SceneAST } from "@markdy/core";
import type { ActorState, FaceSwap } from "./types.js";
import { stateFrom, tx, txCaption, toEasing } from "./types.js";
import { PART_SEL, readRotation } from "./figure.js";

// ---------------------------------------------------------------------------
// Scene luminance detection (for adaptive bubble/overlay colors)
// ---------------------------------------------------------------------------

/** Returns true if the scene background is dark (luminance < 140). */
function isSceneDark(scene: HTMLElement): boolean {
  const bg = scene.style.background || "white";
  let hex = bg.trim().replace(/^#/, "");
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) <= 140;
  }
  const dark: Record<string, boolean> = { black: true, "#000": true, "#000000": true };
  return dark[bg.toLowerCase()] ?? false;
}

// ---------------------------------------------------------------------------
// Animation builder — processes the timeline into WAAPI Animation objects
// ---------------------------------------------------------------------------
//
// Every animation is created with fill:"forwards" only (no backward fill)
// so that later-created animations do not override earlier ones' intended
// before-phase state.  Initial inline styles are pre-computed here; the
// rAF loop in player.ts then drives currentTime manually.

export function buildAnimations(
  ast: SceneAST,
  actorEls: Map<string, HTMLElement>,
  scene: HTMLElement,
  assetOverrides: Record<string, string>,
  faceSwaps: FaceSwap[],
): Animation[] {
  const anims: Animation[] = [];

  // Initialize tracked state from actor definitions.
  const states = new Map<string, ActorState>();
  for (const [name, def] of Object.entries(ast.actors)) {
    states.set(name, stateFrom(def));
  }

  // Which actors need the caption-centering transform? Captions anchor their
  // (x, y) at *center* rather than top-left, so we use `txCaption` for them.
  const captionActors = new Set<string>();
  for (const [name, def] of Object.entries(ast.actors)) {
    if (def.type === "caption") captionActors.add(name);
  }
  const txFor = (actorName: string): ((s: ActorState) => string) =>
    captionActors.has(actorName) ? txCaption : tx;

  // Camera events live outside any actor element — they drive the scene-content
  // layer passed in as `scene`. Build those separately so actor lookups don't
  // fail on actor="camera".
  const events = [...ast.events].sort((a, b) => a.time - b.time);

  preInitInlineStyles(ast, actorEls, states, events, txFor);

  // Camera state is scoped to this build. Each `buildAnimations` call starts
  // from the identity transform — rebuilding the player (or re-using the
  // same DOM element across sessions) never leaks old pan/zoom/shake state.
  const cameraState = freshCameraState();

  for (const ev of events) {
    const delayMs = ev.time * 1000;
    const durMs = Math.max(
      1,
      (typeof ev.params.dur === "number" ? ev.params.dur : 0.5) * 1000,
    );
    const easing = toEasing(ev.params.ease);
    const baseOpts: KeyframeAnimationOptions = {
      delay: delayMs,
      duration: durMs,
      fill: "forwards",
      easing,
    };

    if (ev.actor === "camera") {
      buildCameraAction(ev, scene, ast, baseOpts, anims, cameraState);
      continue;
    }

    const el = actorEls.get(ev.actor);
    const s = states.get(ev.actor);
    if (!el || !s) continue;

    buildAction(
      ev,
      el,
      s,
      baseOpts,
      delayMs,
      durMs,
      ast,
      states,
      actorEls,
      scene,
      assetOverrides,
      faceSwaps,
      anims,
      txFor(ev.actor),
    );
  }

  return anims;
}

// ---------------------------------------------------------------------------
// Pre-process initial inline styles
// ---------------------------------------------------------------------------
//
// With fill:"forwards" (no backward fill), each actor's before-phase
// shows its inline style.  We need that inline style to match what the
// scene should look like at t=0:
//
//   • Actors whose first action is `enter` must start off-screen.
//   • Actors whose first action is `fade_in` and declared opacity > 0
//     must start invisible.

/**
 * Returns an off-screen variant of `s` displaced in the given direction.
 * Used by both `preInitInlineStyles` (for actors whose first event is an
 * `enter` — they must start offscreen) and `buildAction.enter` at runtime.
 * Keeping a single helper prevents the two paths from drifting to
 * different multipliers.
 */
function offscreenState(
  s: ActorState,
  direction: string,
  sceneWidth: number,
  sceneHeight: number,
): ActorState {
  const out: ActorState = { ...s };
  switch (direction) {
    case "left":   out.x = -sceneWidth  * 1.1; break;
    case "right":  out.x =  sceneWidth  * 2.1; break;
    case "top":    out.y = -sceneHeight * 1.1; break;
    case "bottom": out.y =  sceneHeight * 2.1; break;
  }
  return out;
}

function preInitInlineStyles(
  ast: SceneAST,
  actorEls: Map<string, HTMLElement>,
  states: Map<string, ActorState>,
  events: SceneAST["events"],
  txFor: (actorName: string) => (s: ActorState) => string,
): void {
  const firstEventByActor = new Map<string, (typeof events)[number]>();
  for (const ev of events) {
    if (ev.actor === "camera") continue;
    if (!firstEventByActor.has(ev.actor)) firstEventByActor.set(ev.actor, ev);
  }

  for (const [name, def] of Object.entries(ast.actors)) {
    const el = actorEls.get(name);
    const s = states.get(name);
    if (!el || !s) continue;

    const firstEv = firstEventByActor.get(name);
    const txFn = txFor(name);

    if (firstEv?.action === "enter") {
      const from = String(firstEv.params.from ?? "left");
      const offscreen = offscreenState(s, from, ast.meta.width, ast.meta.height);
      el.style.transform = txFn(offscreen);
    }

    if (firstEv?.action === "fade_in" && (def.opacity === undefined || def.opacity > 0)) {
      el.style.opacity = "0";
    }
  }
}

// ---------------------------------------------------------------------------
// Camera transform tracker
// ---------------------------------------------------------------------------
//
// The `sceneContent` layer (passed in as `scene`) carries a single CSS
// transform string that is built up from pan, zoom, and shake events. We
// track a canonical camera state and animate between successive snapshots.

interface CameraState {
  x: number;  // pan: translate x (px in scene space)
  y: number;  // pan: translate y
  zoom: number;  // zoom factor
}

function freshCameraState(): CameraState {
  return { x: 0, y: 0, zoom: 1 };
}

function cameraTx(s: CameraState): string {
  // Camera moves the scene *content* in the opposite direction of the pan
  // target so that `camera.pan(to=(400,200))` visually means "center on (400,200)".
  return `translate(${-s.x}px, ${-s.y}px) scale(${s.zoom})`;
}

function buildCameraAction(
  ev: TimelineEvent,
  scene: HTMLElement,
  ast: SceneAST,
  baseOpts: KeyframeAnimationOptions,
  anims: Animation[],
  cameraState: CameraState,
): void {
  const s = cameraState;

  switch (ev.action) {
    case "pan": {
      const to = ev.params.to as [number, number] | undefined;
      if (!to) break;
      // Interpret `to=(cx, cy)` as "center the camera on (cx, cy)". Use the
      // AST's declared scene dimensions — querying `scene.clientWidth` here
      // is unreliable: under jsdom it's 0, and when the scene uses CSS
      // `width: 100%` or is wrapped in a responsive scaler the measured
      // value doesn't match the authoring-space coordinates the user wrote.
      const sceneW = ast.meta.width;
      const sceneH = ast.meta.height;
      const targetX = to[0] - sceneW / 2;
      const targetY = to[1] - sceneH / 2;
      const next: CameraState = { ...s, x: targetX, y: targetY };
      anims.push(
        scene.animate(
          [{ transform: cameraTx(s) }, { transform: cameraTx(next) }],
          baseOpts,
        ),
      );
      s.x = next.x;
      s.y = next.y;
      break;
    }

    case "zoom": {
      const to = typeof ev.params.to === "number" ? ev.params.to : s.zoom;
      const next: CameraState = { ...s, zoom: to };
      anims.push(
        scene.animate(
          [{ transform: cameraTx(s) }, { transform: cameraTx(next) }],
          baseOpts,
        ),
      );
      s.zoom = next.zoom;
      break;
    }

    case "shake": {
      const mag = typeof ev.params.intensity === "number" ? ev.params.intensity : 8;
      anims.push(
        scene.animate(
          [
            { transform: cameraTx(s), offset: 0 },
            { transform: cameraTx({ ...s, x: s.x - mag, y: s.y - mag * 0.4 }), offset: 0.15 },
            { transform: cameraTx({ ...s, x: s.x + mag, y: s.y + mag * 0.4 }), offset: 0.35 },
            { transform: cameraTx({ ...s, x: s.x - mag * 0.6, y: s.y + mag * 0.3 }), offset: 0.55 },
            { transform: cameraTx({ ...s, x: s.x + mag * 0.5, y: s.y - mag * 0.3 }), offset: 0.75 },
            { transform: cameraTx(s), offset: 1 },
          ],
          { ...baseOpts, easing: "linear" },
        ),
      );
      break;
    }

    default:
      // Unknown camera actions (already warned by the parser) — no-op.
      break;
  }
}

// ---------------------------------------------------------------------------
// Action handler (switch-dispatched per event)
// ---------------------------------------------------------------------------

import type { TimelineEvent } from "@markdy/core";

const FLOW_STROKE_BY_ACTION: Record<string, string> = {
  request: "#38bdf8",
  response: "#a78bfa",
  emit: "#f59e0b",
};

type Point = { x: number; y: number };
type Rect = { x1: number; y1: number; x2: number; y2: number };

function actorSizeByType(type: string): { width: number; height: number } {
  switch (type) {
    case "service":
    case "client":
    case "db":
    case "queue":
      return { width: 180, height: 84 };
    case "box":
      return { width: 100, height: 100 };
    case "caption":
      return { width: 260, height: 56 };
    case "figure":
      return { width: 120, height: 170 };
    default:
      return { width: 140, height: 42 };
  }
}

function actorCenter(state: ActorState, actorType: string): { x: number; y: number } {
  const { width, height } = actorSizeByType(actorType);
  return {
    x: state.x + width / 2,
    y: state.y + height / 2,
  };
}

function actorRect(state: ActorState, actorType: string): Rect {
  const { width, height } = actorSizeByType(actorType);
  return {
    x1: state.x,
    y1: state.y,
    x2: state.x + width,
    y2: state.y + height,
  };
}

function inflateRect(rect: Rect, pad: number): Rect {
  return {
    x1: rect.x1 - pad,
    y1: rect.y1 - pad,
    x2: rect.x2 + pad,
    y2: rect.y2 + pad,
  };
}

function segmentIntersectsRect(a: Point, b: Point, rect: Rect): boolean {
  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);
  const horizontal = Math.abs(a.y - b.y) < 0.001;
  const vertical = Math.abs(a.x - b.x) < 0.001;

  if (horizontal) {
    const yHit = a.y > rect.y1 && a.y < rect.y2;
    const xOverlap = maxX > rect.x1 && minX < rect.x2;
    return yHit && xOverlap;
  }
  if (vertical) {
    const xHit = a.x > rect.x1 && a.x < rect.x2;
    const yOverlap = maxY > rect.y1 && minY < rect.y2;
    return xHit && yOverlap;
  }
  return false;
}

function countPathIntersections(points: Point[], obstacles: Rect[]): number {
  let hits = 0;
  for (let i = 0; i < points.length - 1; i++) {
    for (const obstacle of obstacles) {
      if (segmentIntersectsRect(points[i], points[i + 1], obstacle)) hits++;
    }
  }
  return hits;
}

function toPathD(points: Point[]): string {
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${round1(p.x)} ${round1(p.y)}`)
    .join(" ");
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function polylineLength(points: Point[]): number {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
  }
  return Math.max(1, total);
}

function pointAtDistance(points: Point[], dist: number): Point {
  let remain = dist;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (remain <= seg || i === points.length - 2) {
      const t = seg <= 0 ? 0 : remain / seg;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    remain -= seg;
  }
  return points[0];
}

function routeFlowPath(
  sourceName: string,
  targetName: string,
  sourceState: ActorState,
  targetState: ActorState,
  states: Map<string, ActorState>,
  ast: SceneAST,
  lane: number,
): Point[] {
  const sourceRect = actorRect(sourceState, ast.actors[sourceName]?.type ?? "box");
  const targetRect = actorRect(targetState, ast.actors[targetName]?.type ?? "box");
  const laneShift = lane * 18;

  const sourceCenter = actorCenter(sourceState, ast.actors[sourceName]?.type ?? "box");
  const targetCenter = actorCenter(targetState, ast.actors[targetName]?.type ?? "box");
  const horizontalPrimary = Math.abs(targetCenter.x - sourceCenter.x) >= Math.abs(targetCenter.y - sourceCenter.y);

  const source: Point = horizontalPrimary
    ? { x: targetCenter.x >= sourceCenter.x ? sourceRect.x2 : sourceRect.x1, y: sourceCenter.y }
    : { x: sourceCenter.x, y: targetCenter.y >= sourceCenter.y ? sourceRect.y2 : sourceRect.y1 };

  const target: Point = horizontalPrimary
    ? { x: targetCenter.x >= sourceCenter.x ? targetRect.x1 : targetRect.x2, y: targetCenter.y }
    : { x: targetCenter.x, y: targetCenter.y >= sourceCenter.y ? targetRect.y1 : targetRect.y2 };

  const obstacles: Rect[] = [];
  for (const [name, state] of states.entries()) {
    if (name === sourceName || name === targetName) continue;
    const type = ast.actors[name]?.type ?? "box";
    obstacles.push(inflateRect(actorRect(state, type), 8));
  }

  const candidates: Point[][] = [];
  if (Math.abs(source.y - target.y) < 0.001 || Math.abs(source.x - target.x) < 0.001) {
    candidates.push([source, target]);
  }

  const midX = round1((source.x + target.x) / 2 + laneShift);
  const midY = round1((source.y + target.y) / 2 + laneShift);

  candidates.push(
    [source, { x: midX, y: source.y }, { x: midX, y: target.y }, target],
    [source, { x: source.x, y: midY }, { x: target.x, y: midY }, target],
  );

  const minObstacleY = obstacles.length ? Math.min(...obstacles.map((o) => o.y1)) : Math.min(source.y, target.y);
  const maxObstacleY = obstacles.length ? Math.max(...obstacles.map((o) => o.y2)) : Math.max(source.y, target.y);
  const topLane = Math.max(16, minObstacleY - 24 - lane * 12);
  const bottomLane = Math.min(ast.meta.height - 16, maxObstacleY + 24 + lane * 12);
  candidates.push(
    [source, { x: source.x, y: topLane }, { x: target.x, y: topLane }, target],
    [source, { x: source.x, y: bottomLane }, { x: target.x, y: bottomLane }, target],
  );

  let best = candidates[0];
  let bestHits = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const hits = countPathIntersections(candidate, obstacles);
    if (hits < bestHits) {
      best = candidate;
      bestHits = hits;
      if (hits === 0) break;
    }
  }
  return best;
}

function ensureEdgeLayer(scene: HTMLElement): SVGSVGElement {
  const existing = scene.querySelector<SVGSVGElement>("svg[data-markdy-edge-layer='1']");
  if (existing) return existing;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("data-markdy-edge-layer", "1");
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

function renderFlowEdge(
  ev: TimelineEvent,
  sourceName: string,
  targetName: string,
  sourceState: ActorState,
  targetState: ActorState,
  states: Map<string, ActorState>,
  ast: SceneAST,
  lane: number,
  scene: HTMLElement,
  baseOpts: KeyframeAnimationOptions,
  anims: Animation[],
): void {
  const styleToken = String(ev.params.style ?? "");
  const isDashed = styleToken === "dashed" || styleToken === "fire_and_forget" || ev.action === "response";
  const stroke = FLOW_STROKE_BY_ACTION[ev.action] ?? "#38bdf8";
  const points = routeFlowPath(
    sourceName,
    targetName,
    sourceState,
    targetState,
    states,
    ast,
    lane,
  );
  const length = polylineLength(points);
  const midPoint = pointAtDistance(points, length * 0.5);
  const pathD = toPathD(points);

  const svg = ensureEdgeLayer(scene);
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("data-markdy-flow-edge", "1");

  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", pathD);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", stroke);
  path.setAttribute("stroke-width", "2.5");
  path.setAttribute("data-markdy-flow-action", ev.action);
  path.style.strokeDasharray = isDashed ? "8 6" : `${length}`;
  path.style.strokeDashoffset = `${length}`;
  group.appendChild(path);

  const marker = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  marker.setAttribute("r", "3");
  marker.setAttribute("fill", stroke);
  marker.style.offsetPath = `path('${pathD}')`;
  marker.style.offsetDistance = "0%";
  marker.style.opacity = "0";
  group.appendChild(marker);

  const labelRaw = String(ev.params.label ?? "");
  if (labelRaw) {
    const label = labelRaw.length > 28 ? `${labelRaw.slice(0, 27)}…` : labelRaw;
    const labelEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
    labelEl.setAttribute("x", `${round1(midPoint.x)}`);
    labelEl.setAttribute("y", `${round1(midPoint.y - 8)}`);
    labelEl.setAttribute("text-anchor", "middle");
    labelEl.setAttribute("font-size", "12");
    labelEl.setAttribute("fill", "#cbd5e1");
    labelEl.textContent = label;
    labelEl.setAttribute("data-full-label", labelRaw);
    group.appendChild(labelEl);
  }

  svg.appendChild(group);

  anims.push(path.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], baseOpts));
  anims.push(
    marker.animate(
      [{ offsetDistance: "0%", opacity: 1 }, { offsetDistance: "100%", opacity: 1 }],
      baseOpts,
    ),
  );

  const fadeOutDelay = Number(baseOpts.delay ?? 0) + Number(baseOpts.duration ?? 0);
  anims.push(
    group.animate([{ opacity: 1 }, { opacity: 0 }], {
      delay: fadeOutDelay,
      duration: 140,
      fill: "forwards",
    }),
  );
}

function buildAction(
  ev: TimelineEvent,
  el: HTMLElement,
  s: ActorState,
  baseOpts: KeyframeAnimationOptions,
  delayMs: number,
  durMs: number,
  ast: SceneAST,
  states: Map<string, ActorState>,
  _actorEls: Map<string, HTMLElement>,
  scene: HTMLElement,
  assetOverrides: Record<string, string>,
  faceSwaps: FaceSwap[],
  anims: Animation[],
  txFn: (s: ActorState) => string,
): void {
  switch (ev.action) {
    case "request":
    case "response":
    case "emit": {
      const targetActorName = String(ev.params.to ?? "");
      if (!targetActorName) break;
      const targetState = states.get(targetActorName);
      if (!targetState) break;
      const lane = ((ev.line % 5) - 2);
      renderFlowEdge(
        ev,
        ev.actor,
        targetActorName,
        s,
        targetState,
        states,
        ast,
        lane,
        scene,
        baseOpts,
        anims,
      );
      break;
    }

    // ── move ────────────────────────────────────────────────────────────────
    case "move": {
      const toArr = ev.params.to as [number, number] | undefined;
      const toX = toArr?.[0] ?? s.x;
      const toY = toArr?.[1] ?? s.y;

      anims.push(
        el.animate(
          [{ transform: txFn(s) }, { transform: txFn({ ...s, x: toX, y: toY }) }],
          baseOpts,
        ),
      );

      s.x = toX;
      s.y = toY;
      break;
    }

    // ── enter ───────────────────────────────────────────────────────────────
    // Slides the actor from the given screen edge into its current (s)
    // position while also restoring opacity to 1. The opacity restore makes
    // `enter` symmetric with `exit` so actors can re-enter after exiting
    // without needing a separate fade_in.
    case "enter": {
      const from = String(ev.params.from ?? "left");
      const fromState = offscreenState(s, from, ast.meta.width, ast.meta.height);

      anims.push(
        el.animate(
          [
            { transform: txFn(fromState), opacity: s.opacity },
            { transform: txFn(s),         opacity: 1 },
          ],
          baseOpts,
        ),
      );
      s.opacity = 1;
      break;
    }

    // ── exit ────────────────────────────────────────────────────────────────
    // Mirror of enter: slides off-screen in the given direction while also
    // fading opacity to 0. Universal — works on any actor type (caption, text,
    // figure, box, sprite). Leaves `s` at the off-screen state since the
    // actor is conceptually gone after this.
    case "exit": {
      const to = String(ev.params.to ?? "right");
      const toState = offscreenState(s, to, ast.meta.width, ast.meta.height);

      anims.push(
        el.animate(
          [
            { transform: txFn(s), opacity: s.opacity },
            { transform: txFn(toState), opacity: 0 },
          ],
          baseOpts,
        ),
      );
      s.x = toState.x;
      s.y = toState.y;
      s.opacity = 0;
      break;
    }

    // ── fade_in ─────────────────────────────────────────────────────────────
    case "fade_in": {
      anims.push(el.animate([{ opacity: 0 }, { opacity: 1 }], baseOpts));
      s.opacity = 1;
      break;
    }

    // ── fade_out ────────────────────────────────────────────────────────────
    case "fade_out": {
      anims.push(
        el.animate([{ opacity: s.opacity }, { opacity: 0 }], baseOpts),
      );
      s.opacity = 0;
      break;
    }

    // ── scale ───────────────────────────────────────────────────────────────
    case "scale": {
      const toScale = typeof ev.params.to === "number" ? ev.params.to : s.scale;
      anims.push(
        el.animate(
          [{ transform: txFn(s) }, { transform: txFn({ ...s, scale: toScale }) }],
          baseOpts,
        ),
      );
      s.scale = toScale;
      break;
    }

    // ── rotate ──────────────────────────────────────────────────────────────
    case "rotate": {
      const toDeg = typeof ev.params.to === "number" ? ev.params.to : s.rotate;
      anims.push(
        el.animate(
          [{ transform: txFn(s) }, { transform: txFn({ ...s, rotate: toDeg }) }],
          baseOpts,
        ),
      );
      s.rotate = toDeg;
      break;
    }

    // ── shake ───────────────────────────────────────────────────────────────
    case "shake": {
      const mag = typeof ev.params.intensity === "number" ? ev.params.intensity : 5;

      anims.push(
        el.animate(
          [
            { transform: txFn(s), offset: 0 },
            { transform: txFn({ ...s, x: s.x + mag }), offset: 0.2 },
            { transform: txFn({ ...s, x: s.x - mag }), offset: 0.4 },
            { transform: txFn({ ...s, x: s.x + mag }), offset: 0.6 },
            { transform: txFn({ ...s, x: s.x - mag }), offset: 0.8 },
            { transform: txFn(s), offset: 1 },
          ],
          { ...baseOpts, easing: "linear" },
        ),
      );
      break;
    }

    // ── punch ───────────────────────────────────────────────────────────────
    case "punch": {
      const pSide = String(ev.params.side ?? "right");
      const pArmEl = el.querySelector<HTMLElement>(
        pSide === "left" ? "[data-fig-arm-l]" : "[data-fig-arm-r]",
      );
      if (!pArmEl) break;
      const pRest = readRotation(pArmEl);
      const pExtend = pSide === "left" ? -75 : 75;
      anims.push(
        pArmEl.animate(
          [
            { transform: `rotate(${pRest}deg)` },
            { transform: `rotate(${pExtend}deg)`, offset: 0.35 },
            { transform: `rotate(${pRest}deg)` },
          ],
          { ...baseOpts, easing: "ease-in-out", fill: "forwards" },
        ),
      );
      break;
    }

    // ── kick ────────────────────────────────────────────────────────────────
    case "kick": {
      const kSide = String(ev.params.side ?? "right");
      const kLegEl = el.querySelector<HTMLElement>(
        kSide === "left" ? "[data-fig-leg-l]" : "[data-fig-leg-r]",
      );
      if (!kLegEl) break;
      const kRest = readRotation(kLegEl);
      const kExtend = kSide === "left" ? -100 : 100;
      anims.push(
        kLegEl.animate(
          [
            { transform: `rotate(${kRest}deg)` },
            { transform: `rotate(${kExtend}deg)`, offset: 0.38 },
            { transform: `rotate(${kRest}deg)` },
          ],
          { ...baseOpts, easing: "ease-in-out", fill: "forwards" },
        ),
      );
      break;
    }

    // ── rotate_part ─────────────────────────────────────────────────────────
    case "rotate_part": {
      const rpName = String(ev.params.part ?? "");
      const rpSel  = PART_SEL[rpName];
      if (!rpSel) break;
      const rpEl = el.querySelector<HTMLElement>(rpSel);
      if (!rpEl) break;

      const rpFrom = readRotation(rpEl);
      const rpTo   = typeof ev.params.to === "number" ? ev.params.to : rpFrom;

      anims.push(
        rpEl.animate(
          [
            { transform: `rotate(${rpFrom}deg)` },
            { transform: `rotate(${rpTo}deg)` },
          ],
          { ...baseOpts, fill: "forwards" },
        ),
      );
      // Update inline style so the next rotate_part reads the correct rest angle.
      rpEl.style.transform = rpEl.style.transform.replace(
        /rotate\([^)]*\)/,
        `rotate(${rpTo}deg)`,
      );
      break;
    }

    // ── face ────────────────────────────────────────────────────────────────
    case "face": {
      const fEl = el.querySelector<HTMLElement>("[data-fig-face]");
      if (!fEl) break;
      const emoji = String(ev.params.text ?? ev.params._0 ?? "");
      if (emoji) faceSwaps.push({ timeMs: ev.time * 1000, el: fEl, emoji });
      break;
    }

    // ── say ─────────────────────────────────────────────────────────────────
    case "say": {
      const text = String(ev.params.text ?? "");
      const inverseScale = 1 / (s.scale || 1);

      // Detect scene background luminance to adapt bubble colors
      const sceneDark = isSceneDark(scene);
      const bubbleBg     = sceneDark ? "#1e2530" : "white";
      const bubbleBorder = sceneDark ? "#475569" : "#222";
      const bubbleText   = sceneDark ? "#e2e8f0" : "#222";
      const bubbleShadow = sceneDark ? "0 2px 8px rgba(0,0,0,0.35)" : "0 2px 8px rgba(0,0,0,0.12)";

      const bubble = document.createElement("div");
      bubble.textContent = text;
      bubble.style.opacity = "0";
      Object.assign(bubble.style, {
        position: "absolute",
        bottom: "calc(100% + 10px)",
        left: "50%",
        transform: `translateX(-50%) scale(${inverseScale})`,
        transformOrigin: "center bottom",
        background: bubbleBg,
        border: `2px solid ${bubbleBorder}`,
        color: bubbleText,
        borderRadius: "12px",
        padding: "6px 14px",
        fontFamily: "system-ui, sans-serif",
        fontSize: "15px",
        lineHeight: "1.3",
        whiteSpace: "nowrap",
        maxWidth: "220px",
        overflow: "hidden",
        textOverflow: "ellipsis",
        pointerEvents: "none",
        zIndex: "10",
        boxShadow: bubbleShadow,
      });

      const tail = document.createElement("span");
      Object.assign(tail.style, {
        position: "absolute",
        bottom: "-10px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "0",
        height: "0",
        borderLeft: "7px solid transparent",
        borderRight: "7px solid transparent",
        borderTop: `10px solid ${bubbleBorder}`,
      });
      bubble.appendChild(tail);

      el.style.overflow = "visible";
      el.appendChild(bubble);

      const fadeDur = Math.min(200, durMs * 0.15);

      anims.push(
        bubble.animate([{ opacity: 0 }, { opacity: 1 }], {
          delay: delayMs,
          duration: fadeDur,
          fill: "forwards",
        }),
        bubble.animate([{ opacity: 1 }, { opacity: 0 }], {
          delay: delayMs + durMs - fadeDur,
          duration: fadeDur,
          fill: "forwards",
        }),
      );
      break;
    }

    // ── pose ────────────────────────────────────────────────────────────────
    // Sets multiple body parts to target angles simultaneously.
    // Usage: @1.0: hero.pose(arm_left=45, arm_right=-45, leg_left=10, dur=0.4)
    case "pose": {
      const poseParts = ["arm_left", "arm_right", "leg_left", "leg_right", "head", "body"];
      for (const partName of poseParts) {
        if (typeof ev.params[partName] !== "number") continue;
        const pSel = PART_SEL[partName];
        if (!pSel) continue;
        const pEl = el.querySelector<HTMLElement>(pSel);
        if (!pEl) continue;

        const fromDeg = readRotation(pEl);
        const toDeg = ev.params[partName] as number;

        anims.push(
          pEl.animate(
            [
              { transform: `rotate(${fromDeg}deg)` },
              { transform: `rotate(${toDeg}deg)` },
            ],
            { ...baseOpts, fill: "forwards" },
          ),
        );
        pEl.style.transform = pEl.style.transform.replace(
          /rotate\([^)]*\)/,
          `rotate(${toDeg}deg)`,
        );
      }
      break;
    }

    // ── wave ────────────────────────────────────────────────────────────────
    // Built-in wave gesture: raises arm, oscillates, returns.
    // Usage: @2.0: hero.wave(side=right, dur=0.8)
    case "wave": {
      const wSide = String(ev.params.side ?? "right");
      const wArmEl = el.querySelector<HTMLElement>(
        wSide === "left" ? "[data-fig-arm-l]" : "[data-fig-arm-r]",
      );
      if (!wArmEl) break;
      const wRest = readRotation(wArmEl);
      const wUp = wSide === "left" ? 70 : -70;
      const wMid1 = wSide === "left" ? 50 : -50;
      const wMid2 = wSide === "left" ? 70 : -70;

      anims.push(
        wArmEl.animate(
          [
            { transform: `rotate(${wRest}deg)`, offset: 0 },
            { transform: `rotate(${wUp}deg)`, offset: 0.2 },
            { transform: `rotate(${wMid1}deg)`, offset: 0.4 },
            { transform: `rotate(${wMid2}deg)`, offset: 0.55 },
            { transform: `rotate(${wMid1}deg)`, offset: 0.7 },
            { transform: `rotate(${wMid2}deg)`, offset: 0.85 },
            { transform: `rotate(${wRest}deg)`, offset: 1 },
          ],
          { ...baseOpts, easing: "ease-in-out", fill: "forwards" },
        ),
      );
      break;
    }

    // ── jump ────────────────────────────────────────────────────────────────
    // Jumps the actor up with squash/stretch effect.
    // Usage: @3.0: hero.jump(height=30, dur=0.5)
    case "jump": {
      const jHeight = typeof ev.params.height === "number" ? ev.params.height : 30;

      // Squash before jump, stretch during, squash on land, return
      anims.push(
        el.animate(
          [
            { transform: txFn(s), offset: 0 },
            { transform: txFn({ ...s, scale: s.scale * 0.9 }), offset: 0.1 },
            { transform: txFn({ ...s, y: s.y - jHeight, scale: s.scale * 1.1 }), offset: 0.45 },
            { transform: txFn({ ...s, y: s.y - jHeight * 0.3, scale: s.scale * 1.05 }), offset: 0.7 },
            { transform: txFn({ ...s, scale: s.scale * 0.92 }), offset: 0.88 },
            { transform: txFn(s), offset: 1 },
          ],
          { ...baseOpts, easing: "ease-in-out" },
        ),
      );
      break;
    }

    // ── nod ─────────────────────────────────────────────────────────────────
    // Nods the head down and back up. Figure actors only.
    // Usage: @2.0: hero.nod(dur=0.4)
    case "nod": {
      const nHeadEl = el.querySelector<HTMLElement>("[data-fig-head]");
      if (!nHeadEl) break;
      const nRest = readRotation(nHeadEl);
      const nDown = 15;

      anims.push(
        nHeadEl.animate(
          [
            { transform: `rotate(${nRest}deg)`, offset: 0 },
            { transform: `rotate(${nDown}deg)`, offset: 0.35 },
            { transform: `rotate(${nRest}deg)`, offset: 0.65 },
            { transform: `rotate(${nDown}deg)`, offset: 0.8 },
            { transform: `rotate(${nRest}deg)`, offset: 1 },
          ],
          { ...baseOpts, easing: "ease-in-out", fill: "forwards" },
        ),
      );
      break;
    }

    // ── bounce ──────────────────────────────────────────────────────────────
    // Bounces the actor vertically with diminishing amplitude.
    // Usage: @1.0: hero.bounce(intensity=15, count=3, dur=0.6)
    case "bounce": {
      const bIntensity = typeof ev.params.intensity === "number" ? ev.params.intensity : 15;
      const bCount = typeof ev.params.count === "number" ? ev.params.count : 3;
      const keyframes: Keyframe[] = [{ transform: txFn(s), offset: 0 }];

      for (let bi = 0; bi < bCount; bi++) {
        const amp = bIntensity * Math.pow(0.55, bi);
        const baseOffset = (bi + 0.5) / (bCount + 0.5);
        const peakOffset = Math.min(baseOffset, 0.98);
        const valleyOffset = Math.min(baseOffset + 0.25 / (bCount + 0.5), 0.99);

        keyframes.push({
          transform: txFn({ ...s, y: s.y - amp }),
          offset: peakOffset,
        });
        if (bi < bCount - 1) {
          keyframes.push({
            transform: txFn(s),
            offset: valleyOffset,
          });
        }
      }
      keyframes.push({ transform: txFn(s), offset: 1 });

      anims.push(
        el.animate(keyframes, { ...baseOpts, easing: "ease-out" }),
      );
      break;
    }

    // ── throw ───────────────────────────────────────────────────────────────
    case "throw": {
      const assetName = String(ev.params.asset ?? "");
      const targetActorName = String(ev.params.to ?? "");
      const targetState = states.get(targetActorName);
      const assetDef = ast.assets[assetName];

      if (!assetDef || !targetState) break;

      let projectile: HTMLElement;

      if (assetDef.type === "image") {
        const img = document.createElement("img");
        img.src = assetOverrides[assetName] ?? assetDef.value;
        img.alt = assetName;
        img.setAttribute("draggable", "false");
        img.style.width = "32px";
        img.style.height = "32px";
        projectile = img;
      } else {
        const span = document.createElement("span");
        span.className = "iconify";
        span.dataset.icon = assetDef.value;
        span.style.fontSize = "32px";
        span.style.lineHeight = "1";
        span.style.display = "inline-block";
        projectile = span;
      }

      Object.assign(projectile.style, {
        position: "absolute",
        left: "0",
        top: "0",
        pointerEvents: "none",
        zIndex: "9",
        opacity: "0",
      });

      scene.appendChild(projectile);

      const throwAnim = projectile.animate(
        [
          { transform: tx(s), opacity: 1 },
          { transform: tx(targetState), opacity: 0 },
        ],
        { ...baseOpts, easing: "ease-in" },
      );

      throwAnim.addEventListener("finish", () => {
        if (projectile.parentNode === scene) scene.removeChild(projectile);
      });

      anims.push(throwAnim);
      break;
    }

    default:
      break;
  }
}
