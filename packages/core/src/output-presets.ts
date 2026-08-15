/**
 * Output size presets for various export targets.
 * Maps named presets to viewBox dimensions and safe margins.
 */

export interface OutputPreset {
  name: string;
  width: number;
  height: number;
  /** Safe margin inset from each edge (px). */
  safeArea: number;
  /** Aspect ratio label for human display. */
  aspect: string;
  /** Intended output context. */
  context: string;
}

export const OUTPUT_PRESETS: Record<string, OutputPreset> = {
  "doc-inline": {
    name: "doc-inline",
    width: 960,
    height: 600,
    safeArea: 40,
    aspect: "8:5",
    context: "Inline documentation diagrams",
  },
  "doc-wide": {
    name: "doc-wide",
    width: 1280,
    height: 720,
    safeArea: 40,
    aspect: "16:9",
    context: "Wide documentation hero diagrams",
  },
  "slide-16x9": {
    name: "slide-16x9",
    width: 1280,
    height: 720,
    safeArea: 48,
    aspect: "16:9",
    context: "Presentation slides (Google Slides, Keynote, PowerPoint)",
  },
  "slide-4x3": {
    name: "slide-4x3",
    width: 1024,
    height: 768,
    safeArea: 48,
    aspect: "4:3",
    context: "Legacy presentation slides",
  },
  "social-og": {
    name: "social-og",
    width: 1200,
    height: 632,
    safeArea: 64,
    aspect: "~1.9:1",
    context: "Open Graph / Twitter Card / LinkedIn",
  },
  "social-square": {
    name: "social-square",
    width: 1080,
    height: 1080,
    safeArea: 64,
    aspect: "1:1",
    context: "Instagram / Square social posts",
  },
  "print-a4": {
    name: "print-a4",
    width: 1120,
    height: 792,
    safeArea: 40,
    aspect: "~1.41:1",
    context: "A4 landscape print",
  },
  "print-letter": {
    name: "print-letter",
    width: 1056,
    height: 816,
    safeArea: 40,
    aspect: "~1.29:1",
    context: "US Letter landscape print",
  },
};

/** Resolve a preset by name, falling back to doc-inline. */
export function resolveOutputPreset(name: string): OutputPreset {
  return OUTPUT_PRESETS[name] ?? OUTPUT_PRESETS["doc-inline"];
}

/** List all available preset names. */
export function listOutputPresets(): string[] {
  return Object.keys(OUTPUT_PRESETS);
}
