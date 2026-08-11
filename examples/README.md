# MarkdyScript examples

Every file in this tree parses cleanly on the current 0.8 diagram grammar. Changes that break an example also break the `verify:examples` gate in CI.

## Layout

- Top-level `.markdy` files — a short learning sequence, one concept per file:
  - [`01-first-diagram.markdy`](01-first-diagram.markdy) — nodes, a beat, and a flow chain.
  - [`02-flow-operators.markdy`](02-flow-operators.markdy) — the four edge operators (`->`, `<-`, `~>`, `--`).
  - [`03-beats-and-groups.markdy`](03-beats-and-groups.markdy) — beats, groups, parallel `&` cues, `glow`/`focus`.
  - [`04-patterns-and-styles.markdy`](04-patterns-and-styles.markdy) — reusable `pattern` + `use`, and node `style`.
- `showcase/` — the demo scenes shown on the homepage playground and docs page. Listed in `website/src/data/examples.ts`, the single registry both pages read from.
  - Focused showcases cover `architecture`, `flowchart`, `tree`, `state`, `sequence`, and `constellation`.
- `astro-starter/` — a minimal Astro project embedding the `<Markdy />` component.

Compat-gate fixtures (baseline snapshot corpus) live alongside their snapshots in `packages/compat/fixtures/` and are covered by `pnpm run gate`.

## Verifying

```bash
pnpm run verify:examples   # parse every file, assert no regressions
pnpm run gate              # compat-gate against baseline snapshots
pnpm run ci                # full test + gate + verify pipeline
```

