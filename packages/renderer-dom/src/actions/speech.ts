/**
 * `say` — a transient speech bubble anchored above an actor.
 */
import type { ActionHandler } from "./context.js";
import { isSceneDark, speechBubbleTheme } from "../theme.js";

/** Longest the fade in/out may take, regardless of the bubble's total duration. */
const MAX_FADE_MS = 200;
/** Fraction of the bubble's duration spent fading, when that's shorter than the cap. */
const FADE_FRACTION = 0.15;

export const say: ActionHandler = ({ ev, el, state, delayMs, durMs, scene, anims }) => {
  const text = String(ev.params.text ?? "");
  const theme = speechBubbleTheme(isSceneDark(scene));

  // The bubble is a child of the actor, so it inherits the actor's scale.
  // Counter-scaling keeps text legible on scaled-up or scaled-down actors.
  const inverseScale = 1 / (state.scale || 1);

  const bubble = document.createElement("div");
  bubble.textContent = text;
  Object.assign(bubble.style, {
    position: "absolute",
    bottom: "calc(100% + 10px)",
    left: "50%",
    transform: `translateX(-50%) scale(${inverseScale})`,
    transformOrigin: "center bottom",
    background: theme.background,
    border: `2px solid ${theme.border}`,
    color: theme.text,
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
    boxShadow: theme.shadow,
    opacity: "0",
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
    borderTop: `10px solid ${theme.border}`,
  });
  bubble.appendChild(tail);

  // Actors clip their own overflow by default; the bubble sits outside them.
  el.style.overflow = "visible";
  el.appendChild(bubble);

  const fadeMs = Math.min(MAX_FADE_MS, durMs * FADE_FRACTION);
  anims.push(
    bubble.animate([{ opacity: 0 }, { opacity: 1 }], {
      delay: delayMs,
      duration: fadeMs,
      fill: "forwards",
    }),
    bubble.animate([{ opacity: 1 }, { opacity: 0 }], {
      delay: delayMs + durMs - fadeMs,
      duration: fadeMs,
      fill: "forwards",
    }),
  );
};
