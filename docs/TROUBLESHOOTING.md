# Markdy Troubleshooting

> ### DOCUMENTATION METADATA
> - **Status**: Active & Canonical
> - **Current Version**: v1.1.2
> - **Specification Version**: 1.1.x
> - **Last Updated**: 2026-08-30
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

## Automated Diagnostics & Self-Healing Tools

Markdy provides built-in fuzzy diagnostics and automatic repair across CLI and MCP:

- **CLI Auto-Repair**: Run `markdy fmt --fix <file.markdy>` to automatically repair keyword typos, node kind typos, missing colons, and unquoted strings.
- **CLI Suggestions**: Run `markdy suggest <file.markdy>` to get predictive next-line completions and proactive architecture suggestions.
- **MCP Server Tools**: Call `diagnose_markdy_syntax` for line-by-line "Did you mean?" suggestions, or `fix_markdy_code` to apply automatic fixes.
- **LSP QuickFix**: In VS Code or your IDE, trigger Code Actions (QuickFix) on any reported warning to apply single-click repairs.
