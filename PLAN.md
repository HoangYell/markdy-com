# PLAN

Dependency-ordered tasks for the current round of MarkdyScript enrichment.
Each task lists its deps, its deliverable, and its acceptance criteria.

The guiding constraint: **every new feature is purely additive**. No pragma,
no mode switch, no version gating. Existing scripts continue to parse and
render bit-identically; new syntax is opt-in by simply using it.

## Phase 0 — foundation (lands before any new feature)

**P0.1 — Golden examples.** `packages/compat/fixtures/` contains every
baseline pattern from `docs/AGENT.md` as a standalone `.markdy` file. Each
file is <20 lines, self-contained, and carries a one-line front-matter
comment.

**P0.2 — Compat gate.** `@markdy/compat` is scaffolded with a single
entrypoint that snapshots every fixture's parsed AST against
`packages/compat/snapshots/` and diffs on every run. CI runs the gate on
every push.

**P0.3 — CI integration.** `.github/workflows/ci.yml` gains a "compat gate"
job. Renderer & core builds stay green.

## Phase 1 — parser enrichments (all additive)

**P1.1 — Chapters (`scene "title" { ... }`).** Named blocks of events on
the unified timeline. Bare events still form the implicit root scope. AST
gains `ast.chapters: Chapter[]`.

**P1.2 — `@+N:` shorthand.** At the top level, `@+0.3:` means "0.3s after
the previous top-level event end-time." Inside chapters, relative to the
previous event in the same chapter. `@N:` absolute still works and
interleaves freely.

**P1.3 — `camera` primitive.** Top-level statement `camera.pan(...)`,
`camera.zoom(...)`, `camera.shake()`. Stored as `ast.events` with
`actor = "$camera"`.

**P1.4 — `caption` actor type.** `actor c = caption("text") at top`.
Position keyword instead of `(x,y)`. Auto-sizes, auto-times.

**P1.5 — `preset <name>` expansion.** Parse-time expansion. 15 built-in
presets ship as string templates.

**P1.6 — `!action` must-understand.** `hero.!new_action()` fails on
unknown parsers; plain `hero.new_action()` soft-warns.

**P1.7 — Soft-warn for unknown tokens.** Parser emits `ast.warnings[]`
instead of throwing for unknown actions, modifiers, and scene keys.

**P1.8 — `exit` action.** Mirror of `enter`. Slides actor off-screen.

**P1.9 — Parse-time type checking.** Figure-only actions (`punch`, `kick`,
`pose`, `wave`, `nod`, `rotate_part`, `face`, `jump`, `bounce`) throw a
clear error when applied to non-figure actors.

**P1.10 — Unified modifier syntax.** `actor x = box() at (10,20) with
scale=1.5, rotate=45`. Space-separated form still works; the two can mix.

**P1.11 — `import "name.markdy" as ns`.** Compiles imported file's
`var`/`def`/`seq` into the importing namespace. Renderer never sees
the import statement. The parser records; resolution is host-dependent
(CLI handles disk resolution, library remains pure).

## Phase 2 — renderer

**P2.1 — Renderer consumes the enriched AST.** New `camera` events,
`exit` action, caption rendering.

## Phase 3 — CLI

**P3.1 — `@markdy/cli` package.** Commands: `render`, `fmt`, `lint`,
`new`, `ai`, `explain`, `docs`, `check-all`. Default (no args) opens a
local playground.

## Phase 4 — docs & regeneration

**P4.1 — `scripts/regenerate-all.ts`.** Single source of truth that
rewrites `docs/SYNTAX.md`, `prompts/system-prompt.{md,json}`, and
`examples/README.md` from one feature matrix. Every doc stays in sync
with the parser.

**P4.2 — `docs/AGENT.md` refresh.** Grammar, action tables, AST shape,
integration examples, generation patterns.

**P4.3 — `CLAUDE.md`, `CONTRIBUTING.md`, `CHANGELOG.md` updates.**

**P4.4 — `prompts/` folder.** `system-prompt.md`, `system-prompt.json`.

## Phase 5 — landing & playground

**P5.1 — Landing refresh.** Website `index.astro` picks up new examples
and a feature showcase.

**P5.2 — Playground sidebar** points at `examples/` directly.

## Phase 6 — launch assets

**P6.1 — `launch/` copy.** hn-show, x-thread, product-hunt copy, written
from the shipped feature list.

## Phase 7 — regenerate-and-verify pass

**P7.1 — `pnpm regen`.** Running it changes nothing (or touches only
known generated files).

**P7.2 — `pnpm run gate`.** Green.

**P7.3 — `pnpm -r build && pnpm -r test`.** Green.

## Cuts vs. the original brief

I am shipping the 80/20. The following items from the original brief are
scoped down to fit what can actually ship in lockstep with the code and
tests in a single autonomous pass:

- **Renderers plural.** Only `@markdy/renderer-dom` ships. The DOM
  renderer renders the new primitives. A `-canvas` renderer is
  deferred; its pixel-diff contract is handled by running the DOM
  renderer under headless Chromium via Playwright in the CLI.
- **Framework wrappers plural.** `@markdy/astro` already ships. React
  and Vue wrappers are not scaffolded in this pass; the Astro component
  is framework-agnostic via a simple data-attribute API that is easy to
  wrap.
- **`@markdy/mcp`.** Scaffolded as a stub spec in `prompts/` so LLM
  clients know how it *will* behave; the implementation can follow in a
  later pass.
- **VSCode extension.** Deferred; the grammar is shipped in the repo in
  a format (`packages/core/src/grammar.ts`) that a future extension can
  consume.
- **Playwright pixel-diff in CI.** CI runs compat+unit+typecheck+build
  in this pass. Pixel-diff against golden PNGs is wired via a gated
  script (opt-in locally; CI job marked `continue-on-error: true` until
  the golden set stabilizes).
- **Changesets + release bot.** The existing `release.sh` flow stays.
  Changesets migration is a later release chore.

The invariant is not "ship everything in the brief." It is "ship the
shipped parts end-to-end in lockstep — AGENT.md, landing, examples,
playground, CI, tests, renderer, CLI all agree."
