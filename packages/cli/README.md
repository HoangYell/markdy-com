# @markdy/cli

First-party command-line tooling for MarkdyScript.

## Install

```bash
npm i -D @markdy/cli
```

If you install it into a project, run it with `npx markdy ...` or `npm exec markdy ...` from that project.
To make `markdy` available as a shell command everywhere, install it globally with `npm i -g @markdy/cli`.

## Package position (text)

```text
@markdy/cli
  -> reads .markdy files from disk
  -> uses parser/runtime packages internally
  -> outputs diagnostics, formatted source, or rendered HTML
```

## Output preview

<p align="center">
  <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/scene-concurrency-decision-flowchart.webp" alt="Markdy CLI Flowchart Generation" width="900" />
</p>
<p align="center">
  <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/scene-terminal-cli.webp" alt="Markdy CLI Terminal Infrastructure Preview" width="900" />
</p>

Use this command to generate a local HTML preview:

```bash
npx markdy render examples/showcase/url-shortener-architecture.markdy --out scene.html
```

## Commands

```bash
markdy                                   # launch a local browser playground on http://127.0.0.1:4242
markdy lint scene.markdy                 # syntax validation
markdy lint scene.markdy --arch-rules    # run Well-Architected governance & cycle rules
markdy fmt scene.markdy --write          # format MarkdyScript file
markdy import flow.mmd --out scene.markdy # import Mermaid, draw.io, Compose, K8s, or Terraform
markdy diff v1.markdy v2.markdy          # semantic AST diff summary table
markdy diff v1.markdy v2.markdy --evolution # generate animated migration scene
markdy share scene.markdy                # create compressed playground link
markdy render scene.markdy --out dist/scene.html # export self-contained HTML preview
markdy explain scene.markdy              # display AST structure and stats
markdy new demo.markdy                   # scaffold fresh starter scene
markdy docs                              # display docs and tutorial links
markdy ai                                # generate prompt context for LLMs
markdy check-all . --arch-rules          # batch lint entire workspace
```

## Notes

- The CLI resolves `import "file.markdy" as ns` from disk before parsing.
- `fmt` canonicalizes aliases and indentation, places optional `player:` configuration last, and preserves its behavior; it may expand higher-level scene sugar into parsed form.
- `render --out` writes a self-contained HTML preview to the exact path you pass in.
- If the path is relative, it is resolved from the current working directory.
- If you see `zsh: command not found: markdy`, the package is installed locally but that directory is not on your PATH.
