# @markdy/language-server

Language Server Protocol (LSP) server for MarkdyScript.

Current capabilities:
- parse diagnostics from `@markdy/core`
- actor-aware action completion
- hover docs for common actions
- document symbols for scenes, actors, defs, and seqs

## Package position (text)

```text
Editor -> @markdy/language-server -> @markdy/core parser

The server translates parse diagnostics and symbols into LSP responses.
```

## Output preview

<p align="center">
	<img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/markdy-output-preview.webp" alt="Markdy output preview" width="900" />
</p>

Run on stdio:

```sh
npx @markdy/language-server
```
