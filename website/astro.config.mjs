// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://markdy.com",
  // The demo is a fully static site — no server adapter needed.
  output: "static",
  integrations: [sitemap()],
  build: {
    inlineStylesheets: 'always',
  },
});
