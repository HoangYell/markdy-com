# Markdy Troubleshooting

> ### DOCUMENTATION METADATA
> - **Status**: Active & Canonical
> - **Current Version**: v1.0.26
> - **Specification Version**: 1.0.x
> - **Last Updated**: 2026-08-24
> - **Documentation Hub**: <https://markdy.com/docs/>
> - **AI Reference**: <https://markdy.com/AGENT.md>

This guide helps fix common problems when writing MarkdyScript, rendering animated diagrams, or generating scenes with AI agents.

## "Unknown node kind"

Cause: the first word of a node declaration isn't a recognized kind.

Fix: use a kind from the vocabulary (it ships inside `@markdy/core` — no registration needed). Common kinds: `service`, `client`, `browser`, `database`, `cache`, `queue`, `cloud`, `container`, `cluster`, `gateway`. Aliases like `db`, `api`, and `lb` expand automatically. See the full list in [AGENT.md](AGENT.md#node-kinds).

## "Unexpected statement" / "top-level cues must be inside a beat block"

Common causes:

- syntax outside the diagram grammar: use `scene`, architecture node declarations, `group`, `beat`, flow operators, and optional `pattern`/`use`
- a flow (`A -> B`) or cue (`show`, `glow`) written outside a `beat` block
- referencing a node id that was never declared
- a missing `"` around a label

Fix by checking the line number in the `ParseError`.

## Parse warnings

Non-fatal issues (like an unknown `scene` property) are reported as warnings in `ast.diagnostics` rather than throwing. Inspect them via the `onWarning` callback on `createDiagram`, or run `markdy lint`.

## Nodes overlap or edges are hard to read

- Increase scene size to `1280x720`.
- Reduce the number of nodes per rank.
- Keep edge labels short.
- Split long flows across several `beat` blocks.

## The animation feels too busy

- Reveal nodes first, then animate flows.
- Use one emphasis effect per beat.
- Use `focus` at the end, not constantly.
- Prefer `stagger` over many simultaneous effects.

## Scene works locally but not in a website

Check that package versions are aligned, assets are reachable, the container exists before `createDiagram`, and SSR code does not access `document` before hydration.

## AI-generated MarkdyScript fails

Give the model <https://markdy.com/AGENT.md> and ask it to fix the exact line number, keep all nodes declared before flows, use only documented cues and flow operators, and shorten labels.

If the model generates manual drawing, timestamp timeline, or imperative camera commands, ask it to translate the idea into Markdy 0.8:

- one `scene` line
- architecture nodes such as `browser`, `gateway`, `service`, `cache`, and `database`
- multiple `beat name "Caption":` blocks
- `frame` for camera-like attention
- `glow` / `focus` for emphasis
- flow lines with `->`, `<-`, `~>`
