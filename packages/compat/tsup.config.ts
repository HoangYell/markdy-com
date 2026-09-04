import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "mermaid/mermaid-transpiler": "src/mermaid/mermaid-transpiler.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
});
