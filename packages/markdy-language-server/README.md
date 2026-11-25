# @markdy/language-server

<p align="center">
  <a href="https://markdy.com/playground/"><img src="https://img.shields.io/badge/⚡_Live_Studio-markdy.com%2Fplayground-3b82f6?style=for-the-badge" alt="Live Studio" /></a>
  <a href="https://markdy.com/docs/"><img src="https://img.shields.io/badge/📖_Docs-Documentation-10b981?style=for-the-badge" alt="Documentation" /></a>
  <a href="https://markdy.com/examples/"><img src="https://img.shields.io/badge/🌟_Blueprints-91+_Examples-f59e0b?style=for-the-badge" alt="Examples" /></a>
  <a href="https://github.com/sponsors/HoangYell"><img src="https://img.shields.io/badge/📐_Pro_Blueprints-Architecture_Kits-f59e0b?style=for-the-badge" alt="Pro Architecture Blueprints" /></a>
  <a href="https://github.com/sponsors/HoangYell"><img src="https://img.shields.io/badge/💖_Sponsor-Support_Markdy-ea4aaa?style=for-the-badge" alt="Sponsor Markdy" /></a>
</p>

Language Server Protocol (LSP) server for MarkdyScript.

> 💼 **Enterprise & Commercial**: Free under MIT. Access production architectural templates, custom diagram kits, and direct support via **[GitHub Sponsors & Pro Blueprints](https://github.com/sponsors/HoangYell)**.

Current capabilities:
- parse diagnostics from `@markdy/core`
- completion for scene/layout/group/beat keywords, node kinds, cues, and declared node ids
- hover docs for beats and flow operators
- document symbols for declared nodes

## Package position (text)

```text
Editor -> @markdy/language-server -> @markdy/core parser

The server translates parse diagnostics and symbols into LSP responses.
```

## Output preview

<p align="center">
  <a href="https://markdy.com/playground/">
    <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/markdy-split-editor.webp" alt="Markdy Language Server Code Completion & Hover Preview" width="900" />
  </a>
</p>
<p align="center">
  <a href="https://markdy.com/playground/">
    <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/markdy-governance-audit.webp" alt="Markdy Language Server & Diagnostics Preview" width="900" />
  </a>
</p>

Run on stdio:

```sh
npx @markdy/language-server
```
