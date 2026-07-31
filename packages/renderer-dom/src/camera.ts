/**
 * The `camera` reserved actor: pan, zoom, and shake applied to the whole
 * scene-content layer.
 *
 * Camera transforms live on an inner layer rather than the scene root so
 * they compose with — instead of clobbering — the responsive CSS scale the
 * player applies to fit the viewport.
 */
import type { SceneAST, TimelineEvent } from "@markdy/core";

export interface CameraState {
  /** Pan offset in scene-space pixels. */
  x: number;
  y: number;
  zoom: number;
}

/**
 * Camera state is per-build, never module-global: rebuilding the player (or
 * reusing the same container across sessions) must not inherit a previous
 * run's pan/zoom.
 */
export function freshCameraState(): CameraState {
  return { x: 0, y: 0, zoom: 1 };
}

/**
 * Content moves opposite the pan target, so `camera.pan(to=(400,200))`
 * reads as "center the view on (400, 200)".
 */
function cameraTx(s: CameraState): string {
  return `translate(${-s.x}px, ${-s.y}px) scale(${s.zoom})`;
}

const DEFAULT_SHAKE_INTENSITY = 8;

export function buildCameraAction(
  ev: TimelineEvent,
  scene: HTMLElement,
  ast: SceneAST,
  baseOpts: KeyframeAnimationOptions,
  anims: Animation[],
  state: CameraState,
): void {
  switch (ev.action) {
    case "pan": {
      const to = ev.params.to as [number, number] | undefined;
      if (!to) break;

      // Use the AST's declared dimensions, not measured ones: under jsdom
      // `clientWidth` is 0, and with responsive scaling the measured value
      // wouldn't match the authoring-space coordinates the user wrote.
      const next: CameraState = {
        ...state,
        x: to[0] - ast.meta.width / 2,
        y: to[1] - ast.meta.height / 2,
      };
      anims.push(
        scene.animate([{ transform: cameraTx(state) }, { transform: cameraTx(next) }], baseOpts),
      );
      state.x = next.x;
      state.y = next.y;
      break;
    }

    case "zoom": {
      const next: CameraState = {
        ...state,
        zoom: typeof ev.params.to === "number" ? ev.params.to : state.zoom,
      };
      anims.push(
        scene.animate([{ transform: cameraTx(state) }, { transform: cameraTx(next) }], baseOpts),
      );
      state.zoom = next.zoom;
      break;
    }

    case "shake": {
      const mag =
        typeof ev.params.intensity === "number" ? ev.params.intensity : DEFAULT_SHAKE_INTENSITY;
      const at = (dx: number, dy: number, offset: number): Keyframe => ({
        transform: cameraTx({ ...state, x: state.x + dx, y: state.y + dy }),
        offset,
      });

      anims.push(
        scene.animate(
          [
            at(0, 0, 0),
            at(-mag, -mag * 0.4, 0.15),
            at(mag, mag * 0.4, 0.35),
            at(-mag * 0.6, mag * 0.3, 0.55),
            at(mag * 0.5, -mag * 0.3, 0.75),
            at(0, 0, 1),
          ],
          { ...baseOpts, easing: "linear" },
        ),
      );
      break;
    }

    default:
      // Unknown camera actions already soft-warned in the parser — no-op.
      break;
  }
}
