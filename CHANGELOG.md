# Changelog

All notable changes to the `markdy` project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] — 2026-04-11

### Changed
- Bumped package versions to 0.5.0

## [Unreleased]

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
