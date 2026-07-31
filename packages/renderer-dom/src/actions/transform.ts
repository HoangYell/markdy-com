/**
 * Universal actions: position, opacity, scale, rotation, and emphasis.
 *
 * These work on every actor type. Each handler animates from the actor's
 * current running state to a new one, then writes that new state back so the
 * next event on the same actor picks up where this one ended.
 */
import type { ActionHandler } from "./context.js";
import { offscreenState } from "../stage.js";

export const move: ActionHandler = ({ ev, el, state, baseOpts, anims, tx }) => {
  const to = ev.params.to as [number, number] | undefined;
  const toX = to?.[0] ?? state.x;
  const toY = to?.[1] ?? state.y;

  anims.push(el.animate([{ transform: tx(state) }, { transform: tx({ ...state, x: toX, y: toY }) }], baseOpts));

  state.x = toX;
  state.y = toY;
};

/**
 * Slides in from a screen edge and restores opacity to 1.
 *
 * Restoring opacity makes `enter` a true mirror of `exit`, so an actor can
 * exit and later re-enter without needing a separate `fade_in`.
 */
export const enter: ActionHandler = ({ ev, el, state, baseOpts, ast, anims, tx }) => {
  const from = String(ev.params.from ?? "left");
  const fromState = offscreenState(state, from, ast.meta.width, ast.meta.height);

  anims.push(
    el.animate(
      [
        { transform: tx(fromState), opacity: state.opacity },
        { transform: tx(state), opacity: 1 },
      ],
      baseOpts,
    ),
  );
  state.opacity = 1;
};

/**
 * Mirror of `enter` — slides off-screen while fading out. Leaves the running
 * state parked off-screen, since the actor is conceptually gone afterwards.
 */
export const exit: ActionHandler = ({ ev, el, state, baseOpts, ast, anims, tx }) => {
  const to = String(ev.params.to ?? "right");
  const toState = offscreenState(state, to, ast.meta.width, ast.meta.height);

  anims.push(
    el.animate(
      [
        { transform: tx(state), opacity: state.opacity },
        { transform: tx(toState), opacity: 0 },
      ],
      baseOpts,
    ),
  );
  state.x = toState.x;
  state.y = toState.y;
  state.opacity = 0;
};

export const fadeIn: ActionHandler = ({ el, state, baseOpts, anims }) => {
  anims.push(el.animate([{ opacity: 0 }, { opacity: 1 }], baseOpts));
  state.opacity = 1;
};

export const fadeOut: ActionHandler = ({ el, state, baseOpts, anims }) => {
  anims.push(el.animate([{ opacity: state.opacity }, { opacity: 0 }], baseOpts));
  state.opacity = 0;
};

export const scale: ActionHandler = ({ ev, el, state, baseOpts, anims, tx }) => {
  const to = typeof ev.params.to === "number" ? ev.params.to : state.scale;
  anims.push(el.animate([{ transform: tx(state) }, { transform: tx({ ...state, scale: to }) }], baseOpts));
  state.scale = to;
};

export const rotate: ActionHandler = ({ ev, el, state, baseOpts, anims, tx }) => {
  const to = typeof ev.params.to === "number" ? ev.params.to : state.rotate;
  anims.push(el.animate([{ transform: tx(state) }, { transform: tx({ ...state, rotate: to }) }], baseOpts));
  state.rotate = to;
};

/**
 * Horizontal oscillation that returns to rest. Always linear — easing a
 * shake makes the oscillation read as lopsided rather than as a vibration.
 */
export const shake: ActionHandler = ({ ev, el, state, baseOpts, anims, tx }) => {
  const mag = typeof ev.params.intensity === "number" ? ev.params.intensity : 5;

  anims.push(
    el.animate(
      [
        { transform: tx(state), offset: 0 },
        { transform: tx({ ...state, x: state.x + mag }), offset: 0.2 },
        { transform: tx({ ...state, x: state.x - mag }), offset: 0.4 },
        { transform: tx({ ...state, x: state.x + mag }), offset: 0.6 },
        { transform: tx({ ...state, x: state.x - mag }), offset: 0.8 },
        { transform: tx(state), offset: 1 },
      ],
      { ...baseOpts, easing: "linear" },
    ),
  );
};

/** Vertical hop with squash on the crouch and stretch at the apex. */
export const jump: ActionHandler = ({ ev, el, state, baseOpts, anims, tx }) => {
  const height = typeof ev.params.height === "number" ? ev.params.height : 30;

  anims.push(
    el.animate(
      [
        { transform: tx(state), offset: 0 },
        { transform: tx({ ...state, scale: state.scale * 0.9 }), offset: 0.1 },
        { transform: tx({ ...state, y: state.y - height, scale: state.scale * 1.1 }), offset: 0.45 },
        { transform: tx({ ...state, y: state.y - height * 0.3, scale: state.scale * 1.05 }), offset: 0.7 },
        { transform: tx({ ...state, scale: state.scale * 0.92 }), offset: 0.88 },
        { transform: tx(state), offset: 1 },
      ],
      { ...baseOpts, easing: "ease-in-out" },
    ),
  );
};

/** Vertical bounce whose amplitude decays by 45% per hop. */
export const bounce: ActionHandler = ({ ev, el, state, baseOpts, anims, tx }) => {
  const intensity = typeof ev.params.intensity === "number" ? ev.params.intensity : 15;
  const count = typeof ev.params.count === "number" ? ev.params.count : 3;
  const keyframes: Keyframe[] = [{ transform: tx(state), offset: 0 }];

  for (let i = 0; i < count; i++) {
    const amp = intensity * Math.pow(0.55, i);
    const baseOffset = (i + 0.5) / (count + 0.5);
    const peakOffset = Math.min(baseOffset, 0.98);
    const valleyOffset = Math.min(baseOffset + 0.25 / (count + 0.5), 0.99);

    keyframes.push({ transform: tx({ ...state, y: state.y - amp }), offset: peakOffset });
    if (i < count - 1) {
      keyframes.push({ transform: tx(state), offset: valleyOffset });
    }
  }
  keyframes.push({ transform: tx(state), offset: 1 });

  anims.push(el.animate(keyframes, { ...baseOpts, easing: "ease-out" }));
};
