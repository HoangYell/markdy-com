const siteUrl = "https://markdy.com";

const routes: Array<{ path: string; changefreq: string; priority: string }> = [
  { path: "", changefreq: "daily", priority: "1.0" },
  { path: "AGENT.md", changefreq: "daily", priority: "1.0" },
  { path: "agent/", changefreq: "daily", priority: "0.9" },
  { path: "docs/", changefreq: "weekly", priority: "0.9" },
  { path: "examples/", changefreq: "weekly", priority: "0.9" },
  { path: "playground/", changefreq: "weekly", priority: "0.8" },
  { path: "llms.txt", changefreq: "daily", priority: "0.8" },
  { path: "llms-full.txt", changefreq: "daily", priority: "0.8" },
  { path: "privacy/", changefreq: "monthly", priority: "0.3" },
  { path: "blog/", changefreq: "weekly", priority: "0.8" },
  { path: "blog/advanced-diagram-layouts-and-editorial-themes/", changefreq: "monthly", priority: "0.7" },
  { path: "blog/ai-generated-architecture-diagrams/", changefreq: "monthly", priority: "0.7" },
  { path: "blog/animated-diagrams-as-code/", changefreq: "monthly", priority: "0.7" },
  { path: "blog/animated-diagrams-astro-mdx/", changefreq: "monthly", priority: "0.7" },
  { path: "blog/animated-sequence-diagrams/", changefreq: "monthly", priority: "0.7" },
  { path: "blog/browser-native-diagram-animation/", changefreq: "monthly", priority: "0.7" },
  { path: "blog/diagram-as-code-guide/", changefreq: "monthly", priority: "0.7" },
  { path: "blog/kubernetes-architecture-diagram/", changefreq: "monthly", priority: "0.7" },
  { path: "blog/markdy-playground/", changefreq: "monthly", priority: "0.7" },
  { path: "blog/markdy-vs-mermaid/", changefreq: "monthly", priority: "0.7" },
  { path: "blog/mermaid-alternative/", changefreq: "monthly", priority: "0.7" },
  { path: "blog/system-design-diagrams/", changefreq: "monthly", priority: "0.7" },
  { path: "blog/universal-ingestion-and-architecture-governance/", changefreq: "monthly", priority: "0.7" },
  { path: "blog/why-markdy-is-diagram-native/", changefreq: "monthly", priority: "0.7" },
];

export async function GET() {
  const urlEntries = routes
    .map(
      (r) => `  <url>
    <loc>${siteUrl}/${r.path}</loc>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
    )
    .join("\n");

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;

  return new Response(sitemapXml.trim(), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
