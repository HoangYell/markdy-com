# PLAN

Dependency-ordered tasks for shipping Markdy v2. Each task lists its deps,
its deliverable, and its acceptance criteria.

## Phase 0 — foundation (lands before any v2 feature)

**P0.1 — Golden examples.** `examples/` folder contains every v1 pattern
from `docs/AGENT.md` as a standalone `.markdy` file. Each file is <20
lines, self-contained, and carries a one-line front-matter comment.

**P0.2 — Compat gate.** `@markdy/compat` is scaffolded with a single
entrypoint `compatCheck(source)` that returns `{ ok: true }` for every
example in the golden set. `scripts/compat-gate.ts` runs over the whole
`examples/` tree. CI runs `test:compat` on every push.

**P0.3 — CI integration.** `.github/workflows/ci.yml` gains a "compat
gate" job. Renderer & core builds stay green.

## Phase 1 — v2 parser (additive, under `@markdy 2` pragma)

**P1.1 — Pragma parsing.** `@markdy 2` as first non-blank line enables
v2 mode. Absence = v1 mode. Pragma is stored on `ast.meta.version`.

**P1.2 — Chapters (`scene "title" { ... }`).** Named blocks of events
on the unified timeline. Bare v1 events still form the implicit root
chapter. AST gains `ast.chapters: Chapter[]`.

**P1.3 — `@+N:` shorthand.** At the top level (v2 mode), `@+0.3:` means
"0.3s after the previous top-level event end-time." Inside chapters,
relative to the previous event in the same chapter. `@N:` absolute
still works and interleaves freely.

**P1.4 — `camera` primitive.** Top-level statement `camera.pan(...)`,
`camera.zoom(...)`, `camera.shake()`. Stored as `ast.events` with
`actor = "$camera"`.

**P1.5 — `caption` actor type.** `actor c = caption("text") at top`.
Position keyword instead of `(x,y)`. Auto-sizes, auto-times.

**P1.6 — `preset <name>` expansion.** Parse-time expansion. 15 built-in
presets ship as string templates.

**P1.7 — `!action` must-understand.** `hero.!new_action()` fails on
unknown parsers; plain `hero.new_action()` soft-warns.

**P1.8 — Soft-warn for unknown tokens.** Parser emits `ast.warnings[]`
instead of throwing for unknown actions, modifiers, and scene keys.

**P1.9 — `exit` action.** Mirror of `enter`. Slides actor off-screen.

**P1.10 — Parse-time type checking.** Figure-only actions (`punch`,
`kick`, `pose`, `wave`, `nod`, `rotate_part`, `face`) throw a clear
error when applied to non-figure actors.

**P1.11 — Unified modifier syntax (v2 mode).** `actor x = box() at
(10,20) with scale=1.5, rotate=45`. Space-separated v1 form always
works.

**P1.12 — `import "name.markdy" as ns`.** Compiles imported file's
`var`/`def`/`seq` into the importing namespace. Renderer never sees
the import statement. (Stub in v2.0: parses and records; resolution
is host-dependent so CLI handles disk resolution, library remains
pure.)

## Phase 2 — renderer

**P2.1 — Renderer consumes v2 AST.** New `camera` events, `exit`
action, caption rendering.

## Phase 3 — CLI

**P3.1 — `@markdy/cli` package.** Commands: `render`, `fmt`, `lint`,
`migrate`, `new`, `ai`, `explain`, `docs`, `check-all`. Default (no
args) opens a local playground.

## Phase 4 — docs & regeneration

**P4.1 — `scripts/regenerate-agent-md.ts`.** Builds `AGENT.md` at repo
root from `packages/core` (grammar, actors, actions, modifiers) and
`examples/` (patterns).

**P4.2 — `scripts/regenerate-docs.ts`.** Rewrites `docs/SYNTAX.md` and
`docs/AGENT.md` into the v2 doc site. Both stay in sync with the
parser.

**P4.3 — `CLAUDE.md`, `MIGRATION.md`, `CONTRIBUTING.md`, `CHANGELOG.md`
updates.**

**P4.4 — `prompts/` folder.** `system-prompt.md`, `claude.md`,
`chatgpt.md`, `cursor-rule.md`, `windsurf.md`.

## Phase 5 — landing & playground

**P5.1 — Landing refresh.** Website `index.astro` picks up new
examples and a v2 feature showcase.

**P5.2 — Playground sidebar** points at `examples/` directly.

## Phase 6 — launch assets

**P6.1 — `launch/` copy.** hn-show, x-thread, product-hunt copy,
written from the shipped feature list.

## Phase 7 — regenerate-and-verify pass

**P7.1 — `pnpm regenerate:agent-md` + `pnpm regenerate:docs`.**
Running these commands changes nothing (or touches only known
generated files).

**P7.2 — `pnpm test:compat`.** Green.

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
