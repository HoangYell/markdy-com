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

export type ExampleCategory = "product" | "system" | "chart" | "ui-state" | "reliability";

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

// NOTE: this still lists the pre-refactor carousel content. Step 3 swaps
// these entries for the new showcase demo set (bullet-reveal,
// request-lifecycle, bar-chart-grow-in, retry-with-backoff,
// component-state-transition) in a follow-up commit — kept separate so the
// registry-extraction refactor and the content swap are independently
// reviewable.
export const EXAMPLE_REGISTRY: ExampleMeta[] = [
  {
    id: "launch-flow",
    title: "Launch Flow",
    description: "Product launch explainer: text, systems, and timeline motion.",
    category: "product",
    file: "00-launch-flow.markdy",
    playback: { previewStart: 0 },
  },
  {
    id: "feature-tour",
    title: "Feature Tour",
    description: "A fully-loaded example: chapters + captions + camera + @+N + exit.",
    category: "system",
    file: "13-combined.markdy",
  },
  {
    id: "camera-shake",
    title: "Camera Shake",
    description: "camera.shake(intensity=N) — draw attention to a status change.",
    category: "ui-state",
    file: "06-camera-shake.markdy",
  },
  {
    id: "chart-reveal",
    title: "Chart Reveal",
    description: "Animated chart reveal for docs, reports, and launch posts.",
    category: "chart",
    file: "16-chart-reveal.markdy",
  },
  {
    id: "api-edge-flow",
    title: "API Edge Flow",
    description: "Animated system flow: client to API to edge to data.",
    category: "system",
    file: "17-api-edge-flow.markdy",
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
