# Copilot instructions for this repository

- When the user says `ship it`, `release it`, or gives shorthand like `commit, PR, merge, release, tag it`, interpret that as a request to run the full shipping workflow for the current completed changes.
- The default shipping workflow for this repo is:
  1. validate the current change with the full CI suite: `pnpm run ci` (runs unit tests, AST backward compatibility gates, documentation examples, and Chrome DevTools headless E2E verification)
  2. commit the finished product changes with a repo-style commit message
  3. open a PR and wait for checks
  4. merge the PR once checks pass
  5. cut the next patch release with `pnpm run release <next-version>`
  6. ensure `CHANGELOG.md` contains concrete release notes before the release commit is created
  7. push the version tag and confirm the GitHub Release workflow succeeds
- Prefer the existing release automation in [scripts/release.sh](/Users/yell/Projects/markdy-com/scripts/release.sh) instead of manually stitching together a release flow.
- All 8 packages are dual-published:
  - **npmjs.com**: Distributed under `@markdy/*` (e.g. `@markdy/core`, `@markdy/renderer-dom`, `@markdy/mcp-server`)
  - **GitHub Packages**: Distributed under `@hoangyell/*` on `https://npm.pkg.github.com` via `scripts/publish-packages.mjs`
- CI runs 4 parallelized jobs (`quality`, `test` matrix across Node 20 & 22, `devtools-e2e`, and `website`). The `quality` job runs `pnpm run build` prior to `pnpm run typecheck` to ensure emitted declarations are available for cross-package workspace imports.
- Keep the homepage example picker curated. Favor the strongest showcase scenes and avoid cluttering the homepage with weak, repetitive, or overly diagnostic examples.
