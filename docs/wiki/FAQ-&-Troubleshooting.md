# Markdy FAQ & Troubleshooting

Frequently asked questions and best practices for authoring Markdy diagrams.

---

## ❓ Frequently Asked Questions

### 1. How is Markdy different from Mermaid.js?
Mermaid produces static SVG or PNG diagrams. Markdy is designed from the ground up for **animated architecture stories and system design explainers**. You can control time across `beat` sequences, orchestrate animated flow particles, and direct camera focus with `frame` and `glow` cues.

### 2. Can I use Markdy without any frontend framework?
Yes! `@markdy/core` is a zero-dependency TypeScript parser, and `@markdy/renderer-dom` compiles plain DOM elements and Web Animations API (WAAPI) keyframes. You can also render standalone self-contained `.html` files using the CLI:
```sh
npx @markdy/cli render system.markdy --out system.html
```

### 3. How do I embed Markdy in Astro or Next.js / MDX?
- **Astro**: Use `@markdy/astro` component:
  ```astro
  ---
  import { Markdy } from "@markdy/astro";
  ---
  <Markdy code={markdyScript} width={800} height={400} theme="paper" autoplay />
  ```
- **React / MDX**: Use `@markdy/mdx` plugin to render fenced ````markdy ```` blocks with automatic viewport hydration.

### 4. Why does my node layout look distorted when using `->` for return responses?
In MarkdyScript, `->` defines **architectural ranking (forward dependency)**. If `NodeA -> NodeB` and you also write `NodeB -> NodeA`, you create a cycle that distorts rank ordering.
**Solution**: Always use `<-` for responses or returns (e.g. `NodeA <- NodeB "200 OK"`). `<-` is cycle-safe and excluded from ranking calculation.

---

## 🛠️ Diagnostics & Self-Healing

Markdy includes automatic fuzzy diagnostics across CLI, LSP, and MCP:

- **CLI Auto-Repair**:
  ```sh
  markdy fmt --fix system.markdy
  ```
- **Architecture Governance Lint**:
  ```sh
  markdy lint --arch-rules system.markdy
  ```
- **AST Architecture Diff**:
  ```sh
  markdy diff v1.markdy v2.markdy
  ```
