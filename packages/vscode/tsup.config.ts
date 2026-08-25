import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: {
      extension: "src/extension.ts",
      server: "src/server.ts",
    },
    format: ["cjs"],
    target: "node18",
    platform: "node",
    external: ["vscode"],
    clean: true,
    sourcemap: true,
    minify: false,
    outExtension() {
      return { js: ".js" };
    },
    noExternal: [
      /@markdy\/.*/,
      "vscode-languageclient",
      "vscode-languageserver",
      "vscode-languageserver-textdocument",
    ],
  },
  {
    entry: {
      "preview-runtime": "src/preview/previewRuntime.ts",
    },
    format: ["iife"],
    globalName: "MarkdyPreview",
    target: "es2022",
    platform: "browser",
    sourcemap: true,
    minify: false,
    outExtension() {
      return { js: ".js" };
    },
    noExternal: [/@markdy\/.*/],
  },
]);
