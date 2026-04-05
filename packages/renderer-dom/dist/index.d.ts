/**
 * @markdy/renderer-dom — Player
 *
 * Translates a MarkdyScript program into DOM elements and drives the
 * timeline via the Web Animations API (WAAPI).
 *
 * Playback architecture: all WAAPI animations stay permanently paused.
 * A requestAnimationFrame loop advances `sceneMs` each frame and sets
 * `anim.currentTime = sceneMs` on every animation.  This avoids two
 * known pitfalls with WAAPI's startTime-based resumption:
 *
 *   1. Setting `startTime` on a paused animation does not reliably change
 *      the play state to "running" across all browsers.
 *   2. `fill:"both"` causes later-created animations to win the cascade
 *      during their before-phase, overriding earlier animations' off-screen
 *      backward fill.
 *
 * By using `fill:"forwards"` only and pre-initialising actor inline styles,
 * each actor's before-phase state falls through to the inline style we set,
 * which gives correct initial positions and opacity values.
 */
interface PlayerOptions {
    container: HTMLElement;
    code: string;
    assets?: Record<string, string>;
    autoplay?: boolean;
}
interface Player {
    play(): void;
    pause(): void;
    seek(seconds: number): void;
    destroy(): void;
}
declare function createPlayer(opts: PlayerOptions): Player;

export { type Player, type PlayerOptions, createPlayer };
