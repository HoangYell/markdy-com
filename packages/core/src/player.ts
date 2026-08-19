/**
 * Single source of truth for player configuration: schema, aliases, parsing,
 * and default resolution. Hosts (DOM renderer, Astro, MDX, CLI) resolve
 * behavior through `resolvePlayer` instead of re-deriving defaults.
 */
import type {
  PlayerConfig,
  PlayerProgress,
  ResolvedPlayer,
} from "./ast.js";

export function parseBooleanToken(raw: unknown): boolean | undefined {
  if (typeof raw === "boolean") return raw;
  const s = String(raw).trim().toLowerCase();
  if (["true", "on", "yes", "1"].includes(s)) return true;
  if (["false", "off", "no", "0"].includes(s)) return false;
  return undefined;
}

/** Groups own their own alias table, so `speed` can mean rate at the player
 * root and the speed buttons inside `controls:`. */
export type PlayerScope = "player" | "playback" | "controls" | "interaction" | "chrome";

type SettingType = "boolean" | "rate" | "rates" | "progress" | "color" | "group";

type Setting = {
  group: "playback" | "controls" | "interaction" | "chrome";
  key: string;
  type: SettingType;
};

/** Affordances toggled together by the legacy `controls` / `interactive` keys. */
export const CONTROL_KEYS = [
  "play",
  "restart",
  "prevBeat",
  "nextBeat",
  "seek",
  "speed",
  "fit",
  "resetView",
  "fullscreen",
  "svg",
  "share",
] as const;
export const INTERACTION_KEYS = ["zoom", "pan", "doubleClickToReset"] as const;

const PLAYBACK: Record<string, Setting> = {
  autoplay: { group: "playback", key: "autoplay", type: "boolean" },
  loop: { group: "playback", key: "loop", type: "boolean" },
  rate: { group: "playback", key: "rate", type: "rate" },
  speed: { group: "playback", key: "rate", type: "rate" },
  playbackRate: { group: "playback", key: "rate", type: "rate" },
  playback_rate: { group: "playback", key: "rate", type: "rate" },
};

const CONTROLS: Record<string, Setting> = {
  controls: { group: "controls", key: "*", type: "group" },
  play: { group: "controls", key: "play", type: "boolean" },
  playButton: { group: "controls", key: "play", type: "boolean" },
  play_button: { group: "controls", key: "play", type: "boolean" },
  restart: { group: "controls", key: "restart", type: "boolean" },
  restartButton: { group: "controls", key: "restart", type: "boolean" },
  restart_button: { group: "controls", key: "restart", type: "boolean" },
  prevBeat: { group: "controls", key: "prevBeat", type: "boolean" },
  prev_beat: { group: "controls", key: "prevBeat", type: "boolean" },
  nextBeat: { group: "controls", key: "nextBeat", type: "boolean" },
  next_beat: { group: "controls", key: "nextBeat", type: "boolean" },
  speeds: { group: "controls", key: "speeds", type: "rates" },
  speedOptions: { group: "controls", key: "speeds", type: "rates" },
  speed_options: { group: "controls", key: "speeds", type: "rates" },
  seek: { group: "controls", key: "seek", type: "boolean" },
  seekBar: { group: "controls", key: "seek", type: "boolean" },
  seek_bar: { group: "controls", key: "seek", type: "boolean" },
  speed: { group: "controls", key: "speed", type: "boolean" },
  speedControls: { group: "controls", key: "speed", type: "boolean" },
  speed_controls: { group: "controls", key: "speed", type: "boolean" },
  fit: { group: "controls", key: "fit", type: "boolean" },
  fitView: { group: "controls", key: "fit", type: "boolean" },
  fit_view: { group: "controls", key: "fit", type: "boolean" },
  fitViewButton: { group: "controls", key: "fit", type: "boolean" },
  fit_view_button: { group: "controls", key: "fit", type: "boolean" },
  resetView: { group: "controls", key: "resetView", type: "boolean" },
  reset_view: { group: "controls", key: "resetView", type: "boolean" },
  resetViewButton: { group: "controls", key: "resetView", type: "boolean" },
  reset_view_button: { group: "controls", key: "resetView", type: "boolean" },
  fullscreen: { group: "controls", key: "fullscreen", type: "boolean" },
  fullScreen: { group: "controls", key: "fullscreen", type: "boolean" },
  full_screen: { group: "controls", key: "fullscreen", type: "boolean" },
  fullscreenButton: { group: "controls", key: "fullscreen", type: "boolean" },
  fullscreen_button: { group: "controls", key: "fullscreen", type: "boolean" },
  svg: { group: "controls", key: "svg", type: "boolean" },
  exportSvg: { group: "controls", key: "svg", type: "boolean" },
  export_svg: { group: "controls", key: "svg", type: "boolean" },
  share: { group: "controls", key: "share", type: "boolean" },
  shareLink: { group: "controls", key: "share", type: "boolean" },
  share_link: { group: "controls", key: "share", type: "boolean" },
};

const INTERACTION: Record<string, Setting> = {
  interactive: { group: "interaction", key: "*", type: "group" },
  interactiveViewport: { group: "interaction", key: "*", type: "group" },
  interactive_viewport: { group: "interaction", key: "*", type: "group" },
  zoom: { group: "interaction", key: "zoom", type: "boolean" },
  allowZoom: { group: "interaction", key: "zoom", type: "boolean" },
  allow_zoom: { group: "interaction", key: "zoom", type: "boolean" },
  pan: { group: "interaction", key: "pan", type: "boolean" },
  allowPan: { group: "interaction", key: "pan", type: "boolean" },
  allow_pan: { group: "interaction", key: "pan", type: "boolean" },
  clickToPlay: { group: "interaction", key: "clickToPlay", type: "boolean" },
  click_to_play: { group: "interaction", key: "clickToPlay", type: "boolean" },
  keyboard: { group: "interaction", key: "keyboard", type: "boolean" },
  shortcuts: { group: "interaction", key: "keyboard", type: "boolean" },
  doubleClickToReset: { group: "interaction", key: "doubleClickToReset", type: "boolean" },
  double_click_to_reset: { group: "interaction", key: "doubleClickToReset", type: "boolean" },
};

const CHROME: Record<string, Setting> = {
  badge: { group: "chrome", key: "badge", type: "boolean" },
  copyright: { group: "chrome", key: "badge", type: "boolean" },
  progress: { group: "chrome", key: "progress", type: "progress" },
  progressBar: { group: "chrome", key: "progress", type: "progress" },
  progress_bar: { group: "chrome", key: "progress", type: "progress" },
  sceneBoundaryProgress: { group: "chrome", key: "progress", type: "progress" },
  progressColor: { group: "chrome", key: "progressColor", type: "color" },
  progress_color: { group: "chrome", key: "progressColor", type: "color" },
  progressBarColor: { group: "chrome", key: "progressColor", type: "color" },
  progress_bar_color: { group: "chrome", key: "progressColor", type: "color" },
};

/** Flat aliases accepted at the `player:` root, on `scene`, and as top-level
 * directives. Group blocks are the canonical form; these stay for compat. */
const FLAT: Record<string, Setting> = {
  ...PLAYBACK,
  ...CHROME,
  controls: CONTROLS.controls,
  playButton: CONTROLS.playButton,
  play_button: CONTROLS.play_button,
  restartButton: CONTROLS.restartButton,
  restart_button: CONTROLS.restart_button,
  seek: CONTROLS.seek,
  seekBar: CONTROLS.seekBar,
  seek_bar: CONTROLS.seek_bar,
  speedControls: CONTROLS.speedControls,
  speed_controls: CONTROLS.speed_controls,
  speeds: CONTROLS.speeds,
  speedOptions: CONTROLS.speedOptions,
  speed_options: CONTROLS.speed_options,
  prevBeat: CONTROLS.prevBeat,
  prev_beat: CONTROLS.prev_beat,
  nextBeat: CONTROLS.nextBeat,
  next_beat: CONTROLS.next_beat,
  keyboard: INTERACTION.keyboard,
  shortcuts: INTERACTION.shortcuts,
  fitView: CONTROLS.fitView,
  fit_view: CONTROLS.fit_view,
  fitViewButton: CONTROLS.fitViewButton,
  fit_view_button: CONTROLS.fit_view_button,
  resetViewButton: CONTROLS.resetViewButton,
  reset_view_button: CONTROLS.reset_view_button,
  fullscreen: CONTROLS.fullscreen,
  fullScreen: CONTROLS.fullScreen,
  full_screen: CONTROLS.full_screen,
  fullscreenButton: CONTROLS.fullscreenButton,
  fullscreen_button: CONTROLS.fullscreen_button,
  exportSvg: CONTROLS.exportSvg,
  export_svg: CONTROLS.export_svg,
  shareLink: CONTROLS.shareLink,
  share_link: CONTROLS.share_link,
  interactive: INTERACTION.interactive,
  interactiveViewport: INTERACTION.interactiveViewport,
  interactive_viewport: INTERACTION.interactive_viewport,
  allowZoom: INTERACTION.allowZoom,
  allow_zoom: INTERACTION.allow_zoom,
  allowPan: INTERACTION.allowPan,
  allow_pan: INTERACTION.allow_pan,
  clickToPlay: INTERACTION.clickToPlay,
  click_to_play: INTERACTION.click_to_play,
  doubleClickToReset: INTERACTION.doubleClickToReset,
  double_click_to_reset: INTERACTION.double_click_to_reset,
};

const SCOPES: Record<PlayerScope, Record<string, Setting>> = {
  player: FLAT,
  playback: PLAYBACK,
  controls: CONTROLS,
  interaction: INTERACTION,
  // `color` is unambiguous inside the block, but too generic at the root.
  chrome: { ...CHROME, color: CHROME.progressColor },
};

export const PLAYER_GROUPS = ["playback", "controls", "interaction", "chrome"] as const;

/** Keys usable as `scene` props and top-level directives. */
export const PLAYER_FLAT_KEYS: string[] = Object.keys(FLAT);

export function playerSettingScope(scope: PlayerScope, key: string): Setting | undefined {
  return SCOPES[scope][key];
}

/**
 * Applies one `key value` pair into `config`. Returns an error message when the
 * key is unknown or the value does not fit the setting type.
 */
export function applyPlayerSetting(
  config: PlayerConfig,
  scope: PlayerScope,
  key: string,
  rawValue: string,
): string | undefined {
  const setting = SCOPES[scope][key];
  if (!setting) return `unknown player property '${key}'`;

  const value = unquote(rawValue).trim();
  const group = (config[setting.group] ??= {}) as Record<string, unknown>;

  if (setting.type === "boolean" || setting.type === "group") {
    const parsed = value ? parseBooleanToken(value) : true;
    if (parsed === undefined) return `player property '${key}' expects true or false`;
    if (setting.type === "boolean") group[setting.key] = parsed;
    else for (const child of setting.group === "controls" ? CONTROL_KEYS : INTERACTION_KEYS) group[child] = parsed;
    return undefined;
  }

  if (setting.type === "rate") {
    const rate = Number(value);
    if (!Number.isFinite(rate) || rate <= 0) return `player property '${key}' expects a positive number`;
    group[setting.key] = rate;
    return undefined;
  }

  if (setting.type === "rates") {
    const rates = value
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    if (!rates.length || rates.some((rate) => !Number.isFinite(rate) || rate <= 0)) {
      return `player property '${key}' expects a list of positive numbers`;
    }
    group[setting.key] = rates;
    return undefined;
  }

  if (setting.type === "color") {
    if (value) group[setting.key] = value;
    return undefined;
  }

  // `progress` doubles as mode and color so legacy `progress=emerald` keeps working.
  const mode = toProgressMode(value);
  if (mode) group.progress = mode;
  else if (value) group.progressColor = value;
  return undefined;
}

function toProgressMode(value: string): PlayerProgress | undefined {
  const lower = value.toLowerCase();
  if (lower === "none" || lower === "bar" || lower === "boundary") return lower;
  const bool = parseBooleanToken(lower);
  if (bool === true) return "boundary";
  if (bool === false) return "none";
  return undefined;
}

function unquote(raw: string): string {
  const value = raw.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

/** Host-supplied overrides always win over script configuration. */
export type PlayerOverrides = {
  autoplay?: boolean;
  loop?: boolean;
  playbackRate?: number;
  copyright?: boolean;
  controls?: boolean;
  interactiveViewport?: boolean;
  progress?: PlayerProgress;
  progressColor?: string;
};

export function resolvePlayer(config: PlayerConfig = {}, overrides: PlayerOverrides = {}): ResolvedPlayer {
  const playback = config.playback ?? {};
  const interaction = config.interaction ?? {};
  const chrome = config.chrome ?? {};

  // Declaring a group opts in; every affordance then defaults on.
  const controlsOn =
    overrides.controls !== false && (overrides.controls === true || config.controls !== undefined);
  const controls = {
    play: controlsOn && (config.controls?.play ?? true),
    restart: controlsOn && (config.controls?.restart ?? true),
    prevBeat: controlsOn && (config.controls?.prevBeat ?? true),
    nextBeat: controlsOn && (config.controls?.nextBeat ?? true),
    seek: controlsOn && (config.controls?.seek ?? true),
    speed: controlsOn && (config.controls?.speed ?? true),
    fit: controlsOn && (config.controls?.fit ?? true),
    resetView: controlsOn && (config.controls?.resetView ?? true),
    fullscreen: controlsOn && (config.controls?.fullscreen ?? true),
    svg: controlsOn && (config.controls?.svg ?? true),
    share: controlsOn && (config.controls?.share ?? true),
  };

  // Legacy host coupling: `controls` as a host option also unlocks the viewport.
  const interactionOn =
    overrides.interactiveViewport !== false &&
    (overrides.interactiveViewport === true || config.interaction !== undefined || overrides.controls === true);
  const gestures = {
    zoom: interactionOn && (interaction.zoom ?? true),
    pan: interactionOn && (interaction.pan ?? true),
    doubleClickToReset: interactionOn && (interaction.doubleClickToReset ?? true),
  };
  const interactionEnabled = gestures.zoom || gestures.pan || gestures.doubleClickToReset;

  const resetView = controls.resetView && interactionEnabled;
  const controlsEnabled =
    controls.play ||
    controls.restart ||
    controls.prevBeat ||
    controls.nextBeat ||
    controls.seek ||
    controls.speed ||
    controls.fit ||
    controls.resetView ||
    controls.fullscreen ||
    controls.svg ||
    controls.share ||
    resetView;

  const rate = overrides.playbackRate ?? playback.rate ?? 1;

  return {
    playback: {
      autoplay: overrides.autoplay ?? playback.autoplay ?? true,
      loop: overrides.loop ?? playback.loop ?? true,
      rate: Number.isFinite(rate) && rate > 0 ? rate : 1,
    },
    controls: {
      ...controls,
      resetView,
      enabled: controlsEnabled,
      speeds: config.controls?.speeds?.length ? config.controls.speeds : [0.5, 1, 2],
    },
    interaction: {
      ...gestures,
      enabled: interactionEnabled,
      clickToPlay: interaction.clickToPlay ?? true,
      keyboard: interaction.keyboard ?? false,
    },
    chrome: {
      badge: overrides.copyright ?? chrome.badge ?? true,
      progress: overrides.progress ?? chrome.progress ?? "boundary",
      progressColor: overrides.progressColor ?? chrome.progressColor,
    },
  };
}
