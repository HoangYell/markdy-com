/**
 * @markdy/renderer-dom
 *
 * Translates a MarkdyScript program into DOM elements and drives the
 * timeline via the Web Animations API (WAAPI).
 * No React, GSAP, or Rough.js dependencies.
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
