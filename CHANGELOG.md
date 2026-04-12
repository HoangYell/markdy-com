# Changelog

All notable changes to the `markdy` project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
