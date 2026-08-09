import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@markdy/core": resolve(__dirname, "../core/src/index.ts"),
      "@markdy/stdlib-systems": resolve(__dirname, "../stdlib-systems/src/index.ts"),
    },
  },
});
