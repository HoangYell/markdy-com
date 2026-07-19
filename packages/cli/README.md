# @markdy/cli

First-party command-line tooling for MarkdyScript.

## Install

```bash
npm i -D @markdy/cli
```

If you install it into a project, run it with `npx markdy ...` or `npm exec markdy ...` from that project.
To make `markdy` available as a shell command everywhere, install it globally with `npm i -g @markdy/cli`.

## Visual guide

<p align="center">
	<img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/markdy-cli-flow.webp" alt="Markdy CLI workflow visual" width="900" />
</p>

## Love Story result

<p align="center">
	<img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/markdy-love-story-result.webp" alt="Love Story main Markdy result" width="900" />
</p>

Use the same command shown in this repo to generate the preview image yourself:

```bash
npx markdy render examples/00-love-story.markdy --out examples/xscene.html
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
- `render --out` writes a self-contained HTML preview to the exact path you pass in.
- If the path is relative, it is resolved from the current working directory.
- If you see `zsh: command not found: markdy`, the package is installed locally but that directory is not on your PATH.
