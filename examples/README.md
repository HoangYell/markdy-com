# MarkdyScript examples

Every file in this tree parses cleanly on the current grammar. Changes that break an example also break the `verify:examples` gate in CI.

## Layout

- Top-level `.markdy` files — one file per feature. Good starting points when you want to learn a specific capability (captions, chapters, camera, imports, etc.).
- `presets/` — one-line `preset <name>(...)` calls showcasing the built-in scene templates. These are the shortest valid MarkdyScript programs that still produce a complete scene.

Compat-gate fixtures (baseline snapshot corpus) live alongside their snapshots in `packages/compat/fixtures/` and are covered by `pnpm run gate`.

## Output preview

<p align="center">
	<img src="../website/public/images/markdy-output-preview.webp" alt="Markdy output preview" width="1000" />
</p>

## Verifying

```bash
pnpm run verify:examples   # parse every file, assert no regressions
pnpm run gate              # compat-gate against baseline snapshots
pnpm run ci                # full test + gate + verify pipeline
```
