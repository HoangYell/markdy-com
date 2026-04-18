import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
  },
  resolve: {
    alias: {
      // Always resolve against the source — this keeps the renderer tests in
      // lock-step with parser changes without requiring a `@markdy/core` build.
      "@markdy/core": resolve(__dirname, "../core/src/index.ts"),
    },
  },
});
