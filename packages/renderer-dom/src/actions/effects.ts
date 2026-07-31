/** Premium visual effects and motion helpers for universal actors. */
import type { ActionHandler } from "./context.js";

function numeric(value: unknown, fallback: number): number {
  return typeof value === "number" ? value : fallback;
}

function stringParam(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

export const spring: ActionHandler = ({ ev, el, state, baseOpts, anims, tx }) => {
  const to = ev.params.to as [number, number] | undefined;
  const toX = to?.[0] ?? state.x;
  const toY = to?.[1] ?? state.y;
  const stiffness = numeric(ev.params.stiffness, 0.18);
  const overshootX = toX + (toX - state.x) * stiffness;
  const overshootY = toY + (toY - state.y) * stiffness;

  anims.push(
    el.animate(
      [
        { transform: tx(state), offset: 0 },
        { transform: tx({ ...state, x: overshootX, y: overshootY }), offset: 0.72 },
        { transform: tx({ ...state, x: toX, y: toY }), offset: 1 },
      ],
      { ...baseOpts, easing: "cubic-bezier(.2,1.35,.35,1)" },
    ),
  );
  state.x = toX;
  state.y = toY;
};

export const followPath: ActionHandler = ({ ev, el, baseOpts, anims }) => {
  const path = stringParam(ev.params.path, "M 0 0 L 120 0");
  const rotate = ev.params.rotate === false ? "0deg" : "auto";
  anims.push(
    el.animate(
      [
        { offsetPath: `path('${path}')`, offsetDistance: "0%", offsetRotate: rotate },
        { offsetPath: `path('${path}')`, offsetDistance: "100%", offsetRotate: rotate },
      ],
      baseOpts,
    ),
  );
};

export const pulse: ActionHandler = ({ ev, el, state, baseOpts, anims, tx }) => {
  const amount = numeric(ev.params.amount, 1.08);
  anims.push(
    el.animate(
      [
        { transform: tx(state), offset: 0 },
        { transform: tx({ ...state, scale: state.scale * amount }), offset: 0.48 },
        { transform: tx(state), offset: 1 },
      ],
      { ...baseOpts, easing: "ease-in-out" },
    ),
  );
};

export const glow: ActionHandler = ({ ev, el, baseOpts, anims }) => {
  const color = stringParam(ev.params.color, "#38bdf8");
  const strength = numeric(ev.params.strength, 24);
  anims.push(
    el.animate(
      [
        { filter: "drop-shadow(0 0 0 transparent)", boxShadow: "0 0 0 rgba(0,0,0,0)" },
        { filter: `drop-shadow(0 0 ${strength}px ${color})`, boxShadow: `0 0 ${strength}px ${color}` },
        { filter: "drop-shadow(0 0 0 transparent)", boxShadow: "0 0 0 rgba(0,0,0,0)" },
      ],
      { ...baseOpts, easing: "ease-in-out" },
    ),
  );
};

export const ripple: ActionHandler = ({ ev, el, delayMs, durMs, anims }) => {
  const color = stringParam(ev.params.color, "#38bdf8");
  const size = numeric(ev.params.size, 140);
  const ring = document.createElement("span");
  ring.setAttribute("data-markdy-ripple", "1");
  Object.assign(ring.style, {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: `${size}px`,
    height: `${size}px`,
    marginLeft: `${-size / 2}px`,
    marginTop: `${-size / 2}px`,
    border: `2px solid ${color}`,
    borderRadius: "999px",
    pointerEvents: "none",
    opacity: "0",
  });
  el.appendChild(ring);
  anims.push(
    ring.animate(
      [
        { transform: "scale(0.2)", opacity: 0.6 },
        { transform: "scale(1)", opacity: 0 },
      ],
      { delay: delayMs, duration: durMs, fill: "forwards", easing: "ease-out" },
    ),
  );
};

export const blur: ActionHandler = ({ ev, el, baseOpts, anims }) => {
  const from = numeric(ev.params.from, 0);
  const to = numeric(ev.params.to, 8);
  anims.push(el.animate([{ filter: `blur(${from}px)` }, { filter: `blur(${to}px)` }], baseOpts));
};

export const lineReveal: ActionHandler = ({ ev, el, baseOpts, anims }) => {
  const from = stringParam(ev.params.from, "left");
  const start = from === "right" ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)";
  anims.push(el.animate([{ clipPath: start }, { clipPath: "inset(0 0 0 0)" }], baseOpts));
};

export const mask: ActionHandler = ({ ev, el, baseOpts, anims }) => {
  const from = numeric(ev.params.from, 0);
  const to = numeric(ev.params.to, 120);
  anims.push(
    el.animate(
      [
        { clipPath: `circle(${from}% at 50% 50%)` },
        { clipPath: `circle(${to}% at 50% 50%)` },
      ],
      baseOpts,
    ),
  );
};

export const parallax: ActionHandler = ({ ev, el, state, baseOpts, anims, tx }) => {
  const depth = numeric(ev.params.depth, 0.35);
  const by = ev.params.by as [number, number] | undefined;
  const dx = (by?.[0] ?? 24) * depth;
  const dy = (by?.[1] ?? 0) * depth;
  anims.push(
    el.animate(
      [
        { transform: tx(state) },
        { transform: tx({ ...state, x: state.x + dx, y: state.y + dy }) },
      ],
      baseOpts,
    ),
  );
};