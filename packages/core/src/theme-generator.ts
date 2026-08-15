/**
 * packages/core/src/theme-generator.ts
 * Algorithmic Theme Token Generator for Markdy.
 * Computes WCAG-compliant high-contrast theme palettes from any base brand color.
 * Zero external dependencies.
 */

import type { ThemeTokens } from "./ast.js";

export interface ThemeGeneratorOptions {
  name: string;
  accentHex: string;
  mode?: "light" | "dark";
  canvasHex?: string;
  inkHex?: string;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleaned = hex.replace(/^#/, "").trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split("").map((c) => c + c).join("");
  }
  const num = parseInt(cleaned, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n: number) => {
    const val = Math.round((n + m) * 255);
    return val.toString(16).padStart(2, "0");
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Dynamically computes a cohesive ThemeTokens set from an accent color.
 */
export function generateThemeFromBrand(opts: ThemeGeneratorOptions): ThemeTokens {
  const isDark = opts.mode === "dark";
  const { r, g, b } = hexToRgb(opts.accentHex);
  const hsl = rgbToHsl(r, g, b);

  const canvas = opts.canvasHex ?? (isDark ? hslToHex(hsl.h, 16, 8) : hslToHex(hsl.h, 18, 97));
  const surface = isDark ? hslToHex(hsl.h, 14, 13) : hslToHex(hsl.h, 20, 100);
  const surfaceRaised = isDark ? hslToHex(hsl.h, 14, 18) : hslToHex(hsl.h, 22, 94);
  const border = isDark ? hslToHex(hsl.h, 12, 24) : hslToHex(hsl.h, 14, 86);
  const text = opts.inkHex ?? (isDark ? hslToHex(hsl.h, 10, 94) : hslToHex(hsl.h, 24, 12));
  const textMuted = isDark ? hslToHex(hsl.h, 10, 62) : hslToHex(hsl.h, 14, 42);
  const gridMinor = isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)";
  const gridMajor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";
  const vignette = isDark ? "rgba(0, 0, 0, 0.45)" : "rgba(0, 0, 0, 0.06)";
  const accent = opts.accentHex;
  const accentTint = isDark
    ? `rgba(${r}, ${g}, ${b}, 0.18)`
    : `rgba(${r}, ${g}, ${b}, 0.08)`;
  const soft = isDark ? hslToHex(hsl.h, 10, 48) : hslToHex(hsl.h, 12, 58);
  const rule = border;

  return {
    name: opts.name,
    canvas,
    surface,
    surfaceRaised,
    border,
    text,
    textMuted,
    gridMinor,
    gridMajor,
    vignette,
    accent,
    paper: canvas,
    ink: text,
    muted: textMuted,
    soft,
    rule,
    accentTint,
    nodeSurface: surface,
    nodeSurfaceRaised: surfaceRaised,
    hairline: border,
    shadow: isDark ? "rgba(0, 0, 0, 0.5)" : "rgba(15, 23, 42, 0.08)",
    labelPlate: isDark ? "rgba(15, 23, 42, 0.85)" : "rgba(255, 255, 255, 0.95)",
    roles: {
      client: hslToHex((hsl.h + 30) % 360, 70, isDark ? 65 : 45),
      compute: accent,
      data: hslToHex((hsl.h + 180) % 360, 65, isDark ? 60 : 42),
      messaging: hslToHex((hsl.h + 90) % 360, 75, isDark ? 68 : 46),
      network: hslToHex((hsl.h + 210) % 360, 60, isDark ? 62 : 44),
      platform: hslToHex((hsl.h + 270) % 360, 55, isDark ? 65 : 48),
      security: hslToHex(10, 80, isDark ? 65 : 50),
      delivery: hslToHex((hsl.h + 150) % 360, 65, isDark ? 62 : 42),
      observability: hslToHex((hsl.h + 45) % 360, 75, isDark ? 64 : 45),
      flow: textMuted,
      code: textMuted,
      distributed: hslToHex((hsl.h + 300) % 360, 60, isDark ? 65 : 45),
    },
    edges: {
      request: isDark ? "#38bdf8" : "#0284c7",
      response: isDark ? "#94a3b8" : "#64748b",
      event: isDark ? "#f59e0b" : "#d97706",
      dependency: isDark ? "#475569" : "#94a3b8",
    },
  };
}
