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
  theme?: "midnight" | "paper" | "blueprint" | "graphite" | "editorial" | "nebula" | "terminal" | "sketchy";
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
    id: "fintech-governance-engine",
    title: "Fintech Governance Engine",
    category: "architecture",
    pattern: "well-architected",
    theme: "blueprint",
    file: "showcase/fintech-governance-engine.markdy",
  },
  {
    id: "microservices-mesh-ingest",
    title: "Transpiled Microservices Mesh",
    category: "system",
    pattern: "microservices",
    theme: "paper",
    file: "showcase/microservices-mesh-ingest.markdy",
  },
  {
    id: "data-flywheel-loop",
    title: "AI Data Flywheel Loop",
    category: "system",
    pattern: "flywheel-loop",
    theme: "paper",
    file: "showcase/data-flywheel-loop.markdy",
  },
  {
    id: "lakehouse-medallion-pipeline",
    title: "Lakehouse Medallion Pipeline",
    category: "architecture",
    pattern: "medallion",
    theme: "editorial",
    file: "showcase/lakehouse-medallion-pipeline.markdy",
  },
  {
    id: "strategic-decision-quadrant",
    title: "Strategic Decision 2x2 Quadrant",
    category: "system",
    pattern: "quadrant",
    theme: "editorial",
    file: "showcase/strategic-decision-quadrant.markdy",
  },
  {
    id: "cross-functional-swimlanes",
    title: "E-Commerce Checkout Swimlanes",
    category: "architecture",
    pattern: "swimlane",
    theme: "paper",
    file: "showcase/cross-functional-swimlanes.markdy",
  },
  {
    id: "enterprise-value-pyramid",
    title: "Platform Engineering Value Pyramid",
    category: "architecture",
    pattern: "pyramid",
    theme: "editorial",
    file: "showcase/enterprise-value-pyramid.markdy",
  },
  {
    id: "database-radar-benchmark",
    title: "Distributed Database Radar Benchmark",
    category: "system",
    pattern: "radar",
    theme: "paper",
    file: "showcase/database-radar-benchmark.markdy",
  },
  {
    id: "secure-paved-road-enforcement",
    title: "Zero-Trust Secure Paved Road",
    category: "architecture",
    pattern: "paved-road",
    theme: "editorial",
    file: "showcase/secure-paved-road-enforcement.markdy",
  },
  {
    id: "fanin-concurrency-bottleneck",
    title: "Fan-In Queue & Bottleneck",
    category: "system",
    pattern: "queue-bottleneck",
    theme: "paper",
    file: "showcase/fanin-concurrency-bottleneck.markdy",
  },
  {
    id: "platform-milestones-timeline",
    title: "Platform Engineering Timeline",
    category: "system",
    pattern: "timeline",
    theme: "editorial",
    file: "showcase/platform-milestones-timeline.markdy",
  },
  {
    id: "engineering-gantt-roadmap",
    title: "Engineering Gantt Roadmap",
    category: "system",
    pattern: "gantt",
    theme: "paper",
    file: "showcase/engineering-gantt-roadmap.markdy",
  },
  {
    id: "product-market-fit-venn",
    title: "Product-Market Fit Venn",
    category: "architecture",
    pattern: "venn",
    theme: "editorial",
    file: "showcase/product-market-fit-venn.markdy",
  },
  {
    id: "terminal-cli-architecture",
    title: "Terminal Infrastructure Topology",
    category: "system",
    pattern: "terminal",
    theme: "terminal",
    file: "showcase/terminal-cli-architecture.markdy",
  },
  {
    id: "sketchy-whiteboard-flow",
    title: "Whiteboard Product Discovery",
    category: "education",
    pattern: "sketchy",
    theme: "sketchy",
    file: "showcase/sketchy-whiteboard-flow.markdy",
  },
  {
    id: "osi-abstraction-layers",
    title: "OSI Abstraction Layers Stack",
    category: "system",
    pattern: "layers",
    theme: "editorial",
    file: "showcase/osi-abstraction-layers.markdy",
  },
  {
    id: "nested-security-perimeter",
    title: "Nested Security Perimeter",
    category: "architecture",
    pattern: "nested",
    theme: "paper",
    file: "showcase/nested-security-perimeter.markdy",
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
