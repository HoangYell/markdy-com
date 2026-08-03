import type { ThemeTokens } from "./ast.js";

const ROLE_COLORS = {
  compute: "#38bdf8",
  code: "#38bdf8",
  client: "#f59e0b",
  data: "#22c55e",
  messaging: "#a78bfa",
  network: "#60a5fa",
  platform: "#c084fc",
  security: "#fb7185",
  delivery: "#facc15",
  observability: "#2dd4bf",
  flow: "#e879f9",
  distributed: "#94a3b8",
} as const;

const EDGE_COLORS = {
  request: "#38bdf8",
  response: "#a78bfa",
  event: "#f59e0b",
  dependency: "#64748b",
} as const;

export const THEMES: Record<string, ThemeTokens> = {
  midnight: {
    name: "midnight",
    canvas: "#07111f",
    surface: "#0f1b2d",
    surfaceRaised: "#16243a",
    border: "#2b3b52",
    text: "#f4f7fb",
    textMuted: "#9aabc0",
    gridMinor: "rgba(148, 163, 184, 0.13)",
    gridMajor: "rgba(148, 163, 184, 0.2)",
    vignette: "rgba(2, 6, 23, 0.72)",
    accent: "#38bdf8",
    roles: { ...ROLE_COLORS },
    edges: { ...EDGE_COLORS },
  },
  paper: {
    name: "paper",
    canvas: "#f7f9fc",
    surface: "#ffffff",
    surfaceRaised: "#eef3f8",
    border: "#ccd7e5",
    text: "#132033",
    textMuted: "#5d6d82",
    gridMinor: "rgba(15, 23, 42, 0.09)",
    gridMajor: "rgba(15, 23, 42, 0.14)",
    vignette: "rgba(241, 245, 249, 0.74)",
    accent: "#0ea5e9",
    roles: { ...ROLE_COLORS },
    edges: { ...EDGE_COLORS },
  },
};

export function resolveTheme(name: string): ThemeTokens {
  return THEMES[name] ?? THEMES.midnight;
}
