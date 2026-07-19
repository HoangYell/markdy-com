# @markdy/cli

First-party command-line tooling for MarkdyScript.

## Install

```bash
npm i -D @markdy/cli
```

## Commands

```bash
markdy                 # launch a local browser playground on http://127.0.0.1:4242
markdy lint scene.markdy
markdy fmt scene.markdy
markdy fmt scene.markdy --write
markdy render scene.markdy --out dist/scene.html
markdy explain scene.markdy
markdy new explainer demo.markdy
markdy docs
markdy ai
markdy check-all .
```

## Notes

- The CLI resolves `import "file.markdy" as ns` from disk before parsing.
- `fmt` prints a canonicalized scene and may expand higher-level sugar into its parsed form.
- `render --out` writes a self-contained HTML preview you can open in a browser.
