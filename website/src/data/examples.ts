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

export type ExampleCategory = "product" | "system" | "architecture" | "chart" | "ui-state" | "reliability" | "interactive" | "education";

export interface ExampleMeta {
  id: string;
  title: string;
  category: ExampleCategory;
  /** Architecture pattern label for docs/gallery filtering. */
  pattern?: string;
  /** Semantic theme used by the scene. */
  theme?: "midnight" | "paper" | "blueprint" | "graphite" | "editorial" | "nebula";
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
    id: "url-shortener-architecture",
    title: "URL Shortener Architecture",
    category: "architecture",
    pattern: "cache-aside",
    theme: "paper",
    file: "showcase/url-shortener-architecture.markdy",
    playback: { previewStart: 0 },
  },
  {
    id: "twitter-timeline-service",
    title: "Twitter Timeline Service",
    category: "architecture",
    pattern: "fan-out",
    theme: "midnight",
    file: "showcase/twitter-timeline-service.markdy",
  },
  {
    id: "youtube-processing-pipeline",
    title: "YouTube Processing Pipeline",
    category: "architecture",
    pattern: "pipeline",
    theme: "graphite",
    file: "showcase/youtube-processing-pipeline.markdy",
  },
  {
    id: "oauth-oidc-login-flow",
    title: "OAuth / OIDC Login Flow",
    category: "architecture",
    pattern: "auth-flow",
    theme: "midnight",
    file: "showcase/oauth-oidc-login-flow.markdy",
  },
  {
    id: "kubernetes-cluster-architecture",
    title: "Kubernetes Cluster Architecture",
    category: "architecture",
    pattern: "platform",
    theme: "blueprint",
    file: "showcase/kubernetes-cluster-architecture.markdy",
  },
  {
    id: "cicd-delivery-pipeline",
    title: "CI/CD Delivery Pipeline",
    category: "reliability",
    pattern: "ci-cd",
    theme: "paper",
    file: "showcase/cicd-delivery-pipeline.markdy",
  },
  {
    id: "editorial-architecture",
    title: "API Platform Architecture",
    category: "architecture",
    pattern: "tiered-platform",
    theme: "editorial",
    file: "showcase/editorial-architecture.markdy",
  },
  {
    id: "editorial-flowchart",
    title: "Checkout Flowchart",
    category: "education",
    pattern: "decision-flow",
    theme: "editorial",
    file: "showcase/editorial-flowchart.markdy",
  },
  {
    id: "editorial-tree",
    title: "Engineering Org Tree",
    category: "architecture",
    pattern: "hierarchy",
    theme: "editorial",
    file: "showcase/editorial-tree.markdy",
  },
  {
    id: "editorial-state",
    title: "Order Lifecycle State",
    category: "ui-state",
    pattern: "lifecycle",
    theme: "editorial",
    file: "showcase/editorial-state.markdy",
  },
  {
    id: "editorial-sequence",
    title: "Login Sequence",
    category: "architecture",
    pattern: "request-sequence",
    theme: "editorial",
    file: "showcase/editorial-sequence.markdy",
  },
  {
    id: "nebula-constellation",
    title: "Signal Constellation",
    category: "architecture",
    pattern: "radial-signal",
    theme: "nebula",
    file: "showcase/nebula-constellation.markdy",
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
