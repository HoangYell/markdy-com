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

// Bullet Reveal is first (and has no explicit previewStart override), which
// makes it the landing-page/playground default — it's the calmest and most
// immediately legible of the five: no failure states, no camera movement.
export const EXAMPLE_REGISTRY: ExampleMeta[] = [
  {
    id: "bullet-reveal",
    title: "Bullet Reveal",
    description: "Sequential bullet points animating in with stagger — the PowerPoint-style reveal people actually need.",
    category: "product",
    file: "showcase/bullet-reveal.markdy",
    playback: { previewStart: 0 },
  },
  {
    id: "request-lifecycle",
    title: "Request Lifecycle",
    description: "Browser to CDN to server to database, with a packet traveling the path and a response returning.",
    category: "system",
    file: "showcase/request-lifecycle.markdy",
  },
  {
    id: "bar-chart-grow-in",
    title: "Bar Chart Grow-In",
    description: "Bars rising with staggered easing while axis labels settle into place.",
    category: "chart",
    file: "showcase/bar-chart-grow-in.markdy",
  },
  {
    id: "retry-with-backoff",
    title: "Retry with Backoff",
    description: "A failing request retrying at increasing intervals until it succeeds.",
    category: "reliability",
    file: "showcase/retry-with-backoff.markdy",
  },
  {
    id: "component-state-transition",
    title: "Component State Transition",
    description: "A card moving through idle, loading, loaded, and error states.",
    category: "ui-state",
    file: "showcase/component-state-transition.markdy",
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
