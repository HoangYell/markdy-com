// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://markdy.com",
  // The demo is a fully static site — no server adapter needed.
  output: "static",
  integrations: [
    sitemap({
      customPages: [
        "https://markdy.com/AGENT.md",
        "https://markdy.com/llms.txt",
        "https://markdy.com/llms-full.txt",
      ],
    }),
  ],
  build: {
    inlineStylesheets: 'always',
  },
});
