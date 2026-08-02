/**
 * Single source of truth for shipped demo scenes shown on the landing page,
 * the interactive playground, and the docs page. Each entry points at a real
 * `.markdy` file under `examples/` — the DSL source itself is never inlined
 * here so the files keep working with `markdy lint`/`fmt`, the LSP, and
 * `pnpm run verify:examples` / the compat gate.
 *
 * Add a new showcase demo by adding one entry here and one file under
 * `examples/showcase/` — every consumer (index.astro, docs.astro) reads
 * from this list, so there is exactly one place to update.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type ExampleCategory = "product" | "system" | "chart" | "ui-state" | "reliability" | "interactive" | "education";

export interface ExampleMeta {
  id: string;
  title: string;
  /** One-line description shown in the playground list and docs cards. */
  description: string;
  category: ExampleCategory;
  /** Path relative to the repo's `examples/` directory. */
  file: string;
  playback?: {
    previewStart?: number;
    loop?: boolean;
  };
}

export interface ExampleEntry extends ExampleMeta {
  sourcePath: string;
  sourceUrl: string;
  code: string;
}

// The first entry is the landing-page/playground default. Keep it high-impact:
// this curated set should showcase complex animated UI, systems, and education scenes.
export const EXAMPLE_REGISTRY: ExampleMeta[] = [
  {
    id: "cyber-parking-control",
    title: "Cyber Parking Control",
    description: "A smart-garage control-room video with a custom CSS dashboard, OCR flow, live routing, glow effects, and a cinematic camera push.",
    category: "system",
    file: "showcase/cyber-parking-control.markdy",
    playback: { previewStart: 0 },
  },
  {
    id: "ascii-parking-garage",
    title: "ASCII Parking Garage",
    description: "A terminal-style ASCII map compiler that turns text rows into lane graphs, bay nodes, state sync, and a polished animated mini-map.",
    category: "education",
    file: "showcase/ascii-parking-garage.markdy",
  },
  {
    id: "parking-game-loop",
    title: "Parking Game Loop",
    description: "An arcade-grade parking-game viewport with CSS road motion, car parking, HUD, physics/collision flow, replay capture, and score punch-in.",
    category: "interactive",
    file: "showcase/parking-game-loop.markdy",
  },
  {
    id: "utf8-byte-visualizer",
    title: "UTF-8 Byte Visualizer",
    description: "A rich byte-visualizer surface where one character becomes code point, hex byte, bit lanes, and a rendered glyph with data-flow choreography.",
    category: "education",
    file: "showcase/utf8-byte-visualizer.markdy",
  },
];

/** Loads every registry entry's DSL source from disk. `root` is the repo root (parent of `website/`). */
export async function loadExamples(root: string): Promise<ExampleEntry[]> {
  return Promise.all(
    EXAMPLE_REGISTRY.map(async (meta) => {
      const sourcePath = `examples/${meta.file}`;
      const code = await readFile(join(root, sourcePath), "utf8");
      return {
        ...meta,
        sourcePath,
        sourceUrl: `https://github.com/HoangYell/markdy-com/blob/main/${sourcePath}`,
        code,
      };
    }),
  );
}
