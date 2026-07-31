/**
 * Scene-adaptive theming for renderer-generated chrome (speech bubbles and
 * anything else Markdy draws on top of the author's actors).
 *
 * Scenes set their own `bg`, and a hard-coded white bubble on a dark scene
 * (or vice versa) reads as a bug. Rather than asking authors to theme
 * generated chrome, we derive it from the declared background.
 */

/** Perceived-luminance cutoff (ITU-R BT.601) below which a scene counts as dark. */
const DARK_LUMINANCE_THRESHOLD = 140;

const NAMED_DARK: Record<string, boolean> = {
  black: true,
  "#000": true,
  "#000000": true,
};

/** True when the scene background is dark enough to need light-on-dark chrome. */
export function isSceneDark(scene: HTMLElement): boolean {
  const bg = scene.style.background || "white";
  let hex = bg.trim().replace(/^#/, "");
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];

  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return 0.299 * r + 0.587 * g + 0.114 * b <= DARK_LUMINANCE_THRESHOLD;
  }
  return NAMED_DARK[bg.toLowerCase()] ?? false;
}

export interface SpeechBubbleTheme {
  background: string;
  border: string;
  text: string;
  shadow: string;
}

export function speechBubbleTheme(dark: boolean): SpeechBubbleTheme {
  return dark
    ? {
        background: "#1e2530",
        border: "#475569",
        text: "#e2e8f0",
        shadow: "0 2px 8px rgba(0,0,0,0.35)",
      }
    : {
        background: "white",
        border: "#222",
        text: "#222",
        shadow: "0 2px 8px rgba(0,0,0,0.12)",
      };
}
