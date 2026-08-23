# @markdy/language-server

Language Server Protocol (LSP) server for MarkdyScript.

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
  <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/markdy-split-editor.webp" alt="Markdy Language Server Code Completion & Hover Preview" width="900" />
</p>
<p align="center">
  <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/markdy-governance-audit.webp" alt="Markdy Language Server & Diagnostics Preview" width="900" />
</p>

Run on stdio:

```sh
npx @markdy/language-server
```
