# Changelog

All notable changes to the `markdy` project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.20] — 2026-07-19

### Changed
- **Documentation visuals optimized to WebP** — Converted the newly added Markdy visual guide and Love Story result assets from PNG to WebP for smaller image payloads.
- **Cross-package image links refreshed** — Updated homepage and package README visual embeds to reference the new `.webp` assets consistently.
- **Website showcase alignment** — Kept the homepage visual guide cards in sync with package-level README visuals for clearer ecosystem storytelling.

## [0.7.19] — 2026-07-19

### Changed
- **Homepage package showcase details** — Added clearer package-level descriptions and practical usage examples on the homepage so new users can understand each package's role faster.
- **Website button accessibility and ergonomics** — Improved button accessibility and interaction behavior in the website layout for better keyboard and screen-reader usability.

## [0.7.18] — 2026-07-19

### Changed
- **Love Story default refresh** — Replaced the older homepage Love Story with the newer chapter-based `Full Story` variant from recent history so the default demo is once again the best version.
- **Homepage example curation** — Reduced the playground picker to a tighter showcase of five stronger demos: Love Story, Feature Tour, Fight Beat, @+ Timing, and Modifiers.
- **Copilot shipping shortcut** — Added repo-level Copilot instructions so short prompts like `ship it` can map to the full commit, PR, merge, release, and tag workflow for this repository.

## [0.7.17] — 2026-07-19

### Added
- **Restored homepage default scene** — Brought back the original Love Story example as a shipped scene file and made it the default playground example again.

### Changed
- **Homepage example curation** — Reduced the homepage example picker to a smaller, stronger set of scenes so the sidebar focuses on the best demos.
- **Preview sizing behavior** — Adjusted the playground preview to scale scenes up while preserving their original aspect ratio, rather than using a crop/zoom style fill.
- **Default preview framing** — Start the Love Story default example from a more meaningful moment so the preview is visually informative on first load.

## [0.7.16] — 2026-07-19

### Changed
- **Homepage layout polish** — Rebalanced the package showcase into a more intentional desktop/tablet layout so the section no longer leaves an awkward orphan card row.
- **Playground UX cleanup** — Improved the homepage playground copy, source-link labeling, preview spacing, and stage scaling so examples fit more comfortably and read more clearly.
- **Mobile landing-page refinement** — Tightened the hero, CTA stack, and usage tabs/code sample on small screens to improve above-the-fold density and readability.

### Fixed
- **Website example loading** — Made homepage example-file loading work consistently in both `astro dev` and `astro build` environments.

## [0.7.15] — 2026-07-19

### Added
- **New package: `@markdy/cli`** — Added a first-party CLI for linting, formatting, explaining, rendering, and local preview/playground workflows.

### Changed
- **Language server publishing** — Scoped the language-server package to `@markdy/language-server` and updated install/docs references accordingly.
- **Release pipeline coverage** — Updated the npm release workflow to build and publish the new CLI package and to publish the scoped language-server package name.
- **Landing page + playground refresh** — Updated the website package showcase and switched the playground example picker to read from the shipped `examples/` corpus with source links.
- **Agent docs refresh** — Updated `docs/AGENT.md` with corrected integration snippets plus CLI and language-server guidance.

### Fixed
- **Workspace lint stability** — Added local workspace path mappings so recursive TypeScript linting no longer depends on prebuilt sibling package artifacts during release validation.

## [0.7.14] — 2026-07-19

### Internal
- **Follow-up release cut** — Published `0.7.14` as a no-feature-change release to keep the release train moving after `0.7.13`.
- **No runtime behavior changes** — Parser, renderer, website, MDX integration, and language-server behavior are unchanged from `0.7.13`.

## [0.7.13] — 2026-07-19

### Added
- **New package: `@markdy/mdx`** — Added a lightweight MDX integration package with a remark plugin and lazy React player for embedding Markdy scenes in MDX content.
- **Shared language server package** — Added the Markdy language server package for editor integrations and LSP-powered diagnostics/completion.

### Fixed
- **MDX prop normalization** — Normalized MDX props for better framework compatibility across downstream MDX runtimes.

### Changed
- **Release automation** — Expanded `release.sh` into a more complete end-to-end release flow covering validation, release PR creation, merge, tagging, and release monitoring.
- **Website analytics cleanup** — Removed the delayed Google Analytics tracking snippet from the website.

## [0.7.12] — 2026-07-18

### Improved
- **System edge routing quality** — Upgraded `request` / `response` / `emit` flow rendering to obstacle-aware orthogonal/elbow routing in `@markdy/renderer-dom`, reducing line overlap with intermediate actors in dense scenes.
- **Dense-scene coverage** — Added renderer tests for 3-actor, 5-actor, and 10-actor system layouts plus fire-and-forget dashed-edge behavior verification.

## [0.7.11] — 2026-07-18

### Added
- **System actor pack foundation** — Introduced optional actor-pack registration in `@markdy/core` via `registerActorPack`, enabling external actor/action vocabularies without adding runtime dependencies to core.
- **New package: `@markdy/stdlib-systems`** — Added first-party systems pack with actor types `service`, `db`, `queue`, `client` and flow actions `request`, `response`, `emit`.
- **Flow rendering baseline** — Added DOM renderer support for system actor cards and animated request/response/emit flow edges.

### Improved
- **Parser diagnostics for larger system scenes** — Added non-fatal warnings for actor-count threshold and long actor-label overflow risk.
- **Coverage** — Added parser and renderer tests for systems pack registration and flow-action handling.

### Internal
- Added `@markdy/stdlib-systems` to workspace build/test/lint flow and release publishing pipeline.

## [0.7.10] — 2026-07-18

### Internal
- **Repository metadata normalization** — Standardized today's commit authorship metadata on active refs to a single committer identity for maintainership consistency.
- **No runtime behavior changes** — Parser, renderer, and Astro runtime behavior are unchanged from `0.7.9`.

## [0.7.9] — 2026-07-18

### Fixed
- **Robust string escaping in parser** — Hardened `@markdy/core` parsing for quoted values so scripts embedded in Markdown/MDX/JS strings are less error-prone:
  - supports both single-quoted and double-quoted string literals
  - correctly handles escaped quotes (`\"`, `\'`) while parsing comments and comma-delimited params
  - supports common escapes (`\\`, `\n`, `\r`, `\t`)
  - preserves unknown escape sequences instead of silently dropping backslashes
- **Regression coverage** — Added parser tests for escaped quotes, commas/hash inside strings, backslash-heavy paths, single-quoted literals, and unknown-escape preservation.

### Docs
- Updated [AGENT.md](docs/AGENT.md) and [SYNTAX.md](docs/SYNTAX.md) to reflect the expanded string-literal and escaping behavior.

## [0.7.8] — 2026-07-18

### Internal
- **Dependency refresh (July 2026)** — Consolidated and applied the open Dependabot updates across the monorepo:
  - `astro` to `^7.1.1` in `website` and `packages/astro` dev dependencies.
  - `@astrojs/sitemap` to `^3.7.3`.
  - `@codemirror/autocomplete` to `^6.20.3`.
  - `wrangler` to `^4.112.0`.
  - `lighthouse` to `^13.4.0`.
  - `tsx` to `^4.23.1` (root and `packages/compat`).
  - `@types/node` to `^25.9.5` in `packages/compat`.
- **CI maintenance** — Updated `actions/checkout` to `v7` in CI and release workflows.
- Regenerated `pnpm-lock.yaml` after dependency updates.

## [0.7.7] — 2026-07-18

### Changed
- **Clearer product positioning** — Updated core messaging across the repository and website to describe Markdy as a **text-to-motion animation DSL** and explicitly clarify that it is not a static diagram generator.
- **Landing page copy refresh** — Updated homepage title, hero, footer tagline, and SEO metadata to reduce Mermaid-style diagram confusion and set expectations earlier.
- **Package discoverability** — Replaced the `mermaid-alternative` keyword with `text-to-motion` in root and `@markdy/core` package metadata.

### Community
- **Discussions path fixed** — Enabled GitHub Discussions and updated issue template guidance to route usage questions to Discussions Q&A.
- **Issue follow-up** — Replied on issue #33 with clarification and the new Discussions link.

### Internal
- **Release template wording** — Updated GitHub release workflow body copy to match the new text-to-motion positioning.

## [0.7.6] — 2026-05-26

### Internal
- **Dependency bundle (May 2026)** — Consolidated 9 stale dependabot PRs into a single bundle (#22) and regenerated the workspace lockfile. No runtime changes to the published packages. Notable bumps: `jsdom` 26.1.0 → 29.1.1 (renderer-dom devDep, 3 major versions, all 14 renderer-dom tests still pass), `vitest` 4.1.4 → 4.1.7, `astro` 6.1.5 → 6.2.1, `@codemirror/view` 6.41.0 → 6.43.0, `@codemirror/search` 6.6.0 → 6.7.0, `@lezer/lr` 1.4.8 → 1.4.10, `wrangler` 4.81.1 → 4.94.0, `lighthouse` 13.1.0 → 13.2.0.
- **CI** — Updated `softprops/action-gh-release` from v2 to v3 in the release workflow (#8).

## [0.7.5] — 2026-05-16

### Fixed
- **Rocket Loader autoplay backup trigger** — Added a true belt-and-suspenders rescue path in `@markdy/astro`: an `<img onerror>` inline event handler that re-injects every type-mangled module script as a fresh `type="module"` script with `data-cfasync="false"`. Inline event handlers are never rewritten by Rocket Loader, so this still fires when the primary `<script data-cfasync="false">` rescue gets rewritten and never executes. The handler is intentionally minimal — it only handles the common case (A) where Rocket Loader mangles `type="module"` — but that is enough to bootstrap Markdy hydration even when Cloudflare ignores the cfasync opt-out for the inline rescue script. Fixes the autoplay regression on heavily-Rocket-Loader-processed pages such as `/vi/five-days-five-years-apple-m5-kernel-exploit/`.

### Internal
- Inline rescue script now builds the comment- and script-tag-closing regex patterns from string parts using `\x3c`/`\x3e` escapes, so the literal HTML tokens `<!--`, `-->`, and `</script>` no longer appear in the source. This prevents Astro's JSX parser and the HTML parser from misinterpreting the regex literals.

## [0.7.4] — 2026-05-16

### Fixed
- **Cloudflare Rocket Loader autoplay** — The `@markdy/astro` rescue script now opts out of Rocket Loader via `data-cfasync="false"` and re-injects rescued module scripts with the same opt-out. This keeps Markdy hydration executable on Rocket Loader pages where inline rescue scripts were being rewritten to a custom `*-text/javascript` type, fixing autoplay on Vietnamese article pages such as `/vi/five-days-five-years-apple-m5-kernel-exploit/`.

## [0.7.3] — 2026-05-04

### Fixed
- **Rocket Loader commented-out scripts** — Cloudflare Rocket Loader sometimes wraps `<script type="module" src="...">` in an HTML comment (`<!--<script ...></script>-->`) instead of just mangling the `type` attribute. The existing rescue logic only queried the live DOM for `script[type$="-module"][src]`, which is invisible when the tag is inside a comment. The rescue script in `@markdy/astro` now also parses `document.documentElement.innerHTML` as a raw string to find and re-inject commented-out module scripts, fixing both autoplay and click-to-play on sites with Rocket Loader enabled.

## [0.7.2] — 2026-05-04

### Fixed
- **Play button support** — Explicitly clicking the `▶ markdy` placeholder in `@markdy/astro` will now force the animation to play, overriding an `autoplay=false` dataset value.
- **Interactive viewport** — Added a click listener to the `viewport` in `@markdy/renderer-dom` to let users easily toggle play/pause on the animation. If the animation has already ended, clicking it will seamlessly restart it from the beginning.

## [0.7.1] — 2026-05-04

### Fixed
- **Click-to-play placeholder** — The `▶ markdy` SSR placeholder in `@markdy/astro` is now clickable. Clicking it immediately hydrates and starts the animation without waiting for the `IntersectionObserver` callback. `cursor: pointer` is also set on the placeholder to signal interactivity.
- **Autoplay on first navigation** — Autoplay no longer requires a full page refresh (F5) when arriving from an external link. `IntersectionObserver` threshold lowered from `1.0` to `0.25`, and `initAll()` now proactively hydrates any `.markdy-root` element that is already inside the viewport at page-load time via `getBoundingClientRect()`, bypassing the observer entirely for those elements.

## [0.7.0] — 2026-04-20

### Added
- **Chapters** (`scene "title" { ... }`) — Support for named blocks of events on a unified timeline.
- **Relative Timing Shorthand** (`@+N:`) — Introduced `@+0.3:` to specify offsets relative to the end of the previous event.
- **Camera Dynamics** — Added `camera` primitives like `camera.pan()`, `camera.zoom()`, and `camera.shake()` for cinematic control.
- **Caption Actor** — Added `caption` actor type with `at top/bottom` positioning keywords.
- **Unified Modifiers** — New comma-separated modifier syntax: `with scale=1.5, rotate=45`.
- **Mandatory Actions** — Added `!action()` prefix for "must-understand" actions that error on older parsers.
- **Exit Action** — Added `exit` action to complement `enter`, sliding actors off-screen.
- **Presets & Expansion** — Support for `preset <name>` expansion at parse-time.

### Improved
- **Parser Robustness** — Added soft-warnings for unknown tokens instead of hard errors.
- **Type Checking** — Initial parse-time type checking for figure-specific actions (`jump`, `wave`, `pose`, etc.).
- **Documentation** — Updated `PLAN.md` and `RESEARCH.md` for v2 foundation.

## [0.6.0] — 2026-04-18

### Added
- **Expressive Character Actions** — Introduced high-level gesture and movement actions for `figure` actors in `@markdy/renderer-dom`. These simplify animation logic by replacing complex part rotation chains:
    - `jump(height, dur)`: Natural jumping motion with squash and stretch.
    - `bounce(intensity, count, dur)`: Diminishing vertical bounce effect.
    - `wave(side, dur)`: Context-aware waving gesture (oscillates specified arm).
    - `nod(dur)`: Intuitive head-nodding gesture.
    - `pose({ arms, legs, ... }, dur)`: Set multiple body part rotations simultaneously in a single command.
- **Layering Support** — Added `z` modifier to actors, allowing explicit control over rendering order (z-index) within a scene.
- **Theme-Aware Playground** — The website playground now automatically adapts scene background colors when switching between Light and Dark modes.

### Fixed
- **UI Contrast** — Adjusted `text-muted` color variables on the website for improved accessibility and readability in both themes.
- Updated documentation and playground examples to showcase new gestures and layering capabilities.

## [0.5.8] — 2026-04-12


### Fixed
- **Backslash-escaped variable interpolation** — `\${varname}` (the form produced by `String.raw` template literals in MDX) is now correctly resolved by the parser. Previously, only `${varname}` was matched, causing scenes embedded in MDX via `<Markdy code={String.raw\`...\`} />` to silently fail when using `var`, `def`, or `seq` features. The fix applies to all interpolation paths: var declarations, actor args/positions, event params, scene properties, def body templates, and seq body params.
- Added 10 new regression tests covering backslash-escaped vars across every parser code path.

## [0.5.7] — 2026-04-12

### Fixed
- **Dark mode text contrast** — `text` actors and speech bubbles no longer inherit the page's dark-mode body color when rendered inside a light-background scene.
- Speech bubbles now explicitly set `color: "#222"` so text is always readable against the white bubble background regardless of OS/browser theme.
- Added `bgToTextColor()` helper in `@markdy/renderer-dom`: computes perceived luminance (ITU-R BT.601) from the scene `bg` color and sets a contrasting `color` on the scene root element. `text` actors inherit this automatically — `#1a1a1a` on light scenes, `#f0f0f0` on dark scenes.

## [0.5.6] — 2026-04-12

### Fixed
- Extracted `totalDurationMs` as a single constant in `createPlayer` — eliminates three redundant `(ast.meta.duration ?? 0) * 1000` recalculations per frame in the rAF tick loop.

### Changed
- Release script now also bumps the root `package.json` version alongside package versions.

### Website
- Added `theme-color` meta tags for light (`#fafafa`) and dark (`#0f172a`) color schemes to improve browser chrome theming on mobile.

## [0.5.5] — 2026-04-12

### Fixed
- Version sync and lockfile update across all packages (`@markdy/core`, `@markdy/renderer-dom`, `@markdy/astro`).

## [0.5.4] — 2026-04-12

### Added
- `progressBar` option (`boolean`, default `true`) — renders a rainbow `conic-gradient` border that traces top→right→bottom→left as playback progresses.
- `copyright` option (`boolean`, default `true`) — renders a small "Powered by Markdy" link below the animation viewport.

### Fixed
- Compute the progress bar start angle from the scene aspect ratio so it visually starts at the top-left corner for non-square viewports.
- Place the copyright badge outside the scene container so it is not clipped by `overflow:hidden`.

### Docs
- Updated API tables and integration examples in README and package READMEs to document `copyright`, `progressBar`, and `loop`.

## [0.5.3] — 2026-04-12

### Added
- `copyright` option (`boolean`, default `true`) — renders a small "Powered by Markdy" link below the animation viewport, linking to markdy.com.
- `progressBar` option (`boolean`, default `true`) — renders a rainbow `conic-gradient` border that traces top→right→bottom→left as playback progresses.
- Both options are available in `createPlayer()` (`@markdy/renderer-dom`) and the `<Markdy />` Astro component.

### Fixed
- Copyright badge is now placed outside the container element to avoid `overflow:hidden` clipping.
- Rainbow progress bar starts from the top-left corner (315°).

### Docs
- Updated API tables in root README, `@markdy/renderer-dom` README, and `@markdy/astro` README to document `copyright`, `progressBar`, and `loop` options.

## [0.5.0] — 2026-04-11

### Changed
- Bumped package versions to 0.5.0

## [0.3.0] — 2026-04-11

### Added
- Automated release script (`scripts/release.sh`) — bumps versions across all packages, commits, tags, and pushes in a single command.
- Release workflow documentation in [CONTRIBUTING.md](CONTRIBUTING.md).

### Changed
- Updated `README.md` with `pnpm run release <version>` in the Scripts table.

### Improved
- Inlined CSS stylesheets and optimised Google Fonts loading on the website for better Lighthouse performance scores.

## [0.2.0] — 2026-04-11

### Changed
- Bump `actions/checkout`, `actions/setup-node`, and `pnpm/action-setup` from v4 to v6.
- Remove leftover `packages: write` permission from release workflow (GitHub Packages support was removed in v0.1.3).

### Fixed
- Add missing `LICENSE` files to each published package directory (required by `package.json` `files` field).
- Remove dev-only scratch scripts (`run-preview.js`, `test-parse.js`) from the repository.
- Fix `cd markdy` → `cd markdy-com` in README Development section.

## [0.1.3] — 2026-04-11

### Fixed
- Remove GitHub Packages publishing steps from release workflow until a `markdy` GitHub org is created. npm and GitHub Releases remain active.
- Clean up release workflow — remove orphaned GitHub Packages job configuration.

## [0.1.2] — 2026-04-11

### Added
- GitHub Packages publishing alongside npm in the release workflow (later reverted in v0.1.3).

## [0.1.1] — 2026-04-11

### Fixed
- CI and Release workflows now use Node.js 22 (required by Astro 6).
- Release workflow builds only publishable packages (not website) to reduce build time.

## [0.1.0] — 2026-04-11

### Added
- Core AST parser with support for `scene`, `actor`, and timeline animations (`@markdy/core`).
- Browser-native Web Animations API (WAAPI) DOM renderer with timeline scrubbing (`@markdy/renderer-dom`).
- Official framework-agnostic Astro component wrapper (`@markdy/astro`).
- Out-of-the-box support for `emoji` powered articulated stick figures.
- Initial interactive documentation and playground website (`markdy.com`).
- High-performance CodeMirror 6 editor integration for the playground.
- StackBlitz `astro-starter` boilerplate for zero-friction user testing.

### Optimized
- Microscopic bundle size achieving ~30kb total parsing + rendering cost.
- Lazy-loaded Google Analytics and icon assets to hit 100/100 Lighthouse metrics.
- Added comprehensive `sitemap.xml` automation and `JSON-LD` structured data.
- SEO-injected rich metadata targeting GSAP and Framer Motion alternatives.

### Security & DX
- Established rigorous Contributor Covenant Code of Conduct.
- Added official Enterprise-readiness Security Disclosure policies.
- Automated vulnerability scanning via `dependabot`.
- Professionalized GitHub Issue, Bug Report, and PR workflows.
