import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  target: "es2022",
  noExternal: ["@markdy/core", "@markdy/compat"],
  banner: {
    js: "#!/usr/bin/env node",
  },
});
