# MarkdyScript examples

Every file in this tree parses cleanly on the current grammar. Changes that break an example also break the `verify:examples` gate in CI.

## Layout

- `v1/` — baseline grammar snapshot. These files are the compat-gate fixtures; their parsed ASTs are snapshot-tested in `packages/compat/snapshots/`. Every future grammar change must leave these bit-identical (or the snapshots are updated intentionally).
- `v2/` — one file per extended-grammar feature. Good starting points when you want to learn a specific capability (captions, chapters, camera, etc.).
- `presets/` — one-line `preset <name>(...)` calls showcasing the built-in scene templates. These are the shortest valid MarkdyScript programs that still produce a complete scene.

## Verifying

```bash
pnpm run verify:examples   # parse every file, assert no regressions
pnpm run gate              # compat-gate against v1 snapshots
pnpm run ci                # full test + gate + verify pipeline
```
