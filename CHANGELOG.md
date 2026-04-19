# Changelog

All notable changes to the `markdy` project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Additive grammar extensions — every existing script continues to parse and
render bit-identically, enforced by the compat gate over the golden example
corpus. New features are layered on top of the current syntax; authors opt
in by using the new tokens.

### Added — Language

- **`caption` actors** — first-class overlay text with anchor positioning:
  `actor title = caption("Demo") at top | bottom | center`. Auto-centers on
  `scene.width / 2` and places at ~12% / ~88% / 50% of scene height.
- **Chapter blocks** — `scene "title" { ... }` groups timeline events under a
  named heading. Emitted on `ast.chapters[] = { name, startLine, startTime,
  endTime }`; every event inside carries `ev.chapter = "<name>"`. Chapters
  chain: each `endTime` becomes the next chapter's `startTime`.
- **`@+N:` relative-time shorthand** — schedules the event `N` seconds after
  the previous event's end time in the current scope. Scope-aware: at the top
  level, relative to the previous top-level event; inside a chapter, relative
  to the previous event in that chapter.
- **`camera` reserved actor** — scene-wide `camera.pan(to=(x,y), dur, ease)`,
  `camera.zoom(to=<scalar>, dur, ease)`, and `camera.shake(intensity, dur)`.
  Transforms are applied to an inner `sceneContent` layer so responsive CSS
  scaling on the outer scene is preserved.
- **`exit` action** — universal mirror of `enter`: slides the actor off-screen
  in the given direction while fading opacity to zero. Works on any actor
  type, including captions.
- **`import "<path>" as <ns>`** — records the declaration on `ast.imports[]`.
  Hosts pass `{ imports: { <ns>: SceneAST } }` to `parse()` (or now directly
  to `createPlayer()`) to resolve namespaces. Resolved namespaces merge their
  `vars`, `defs`, and `seqs` under `ns.<name>`; authors reference them with
  dotted names (`chars.fighter(...)`, `${chars.skin}`, `hero.play(anim.combo)`).
- **`preset <name>(<args>)` macros** — parse-time expansion into full scenes.
  A file whose only top-level content is a `preset ...` call becomes a
  complete animation. Shipping presets: `meme`, `explainer`, `reaction`,
  `pov`, `typing`, `terminal`, `chat_bubble`, `vs`, `tutorial_step`,
  `countdown`, `reveal`, `glitch`, `zoom_punchline`, `before_after`,
  `tier_list`.
- **`!action` must-understand prefix** — opt-in hard fail. `hero.!shake(...)`
  throws `ParseError` if the action is unknown (otherwise unknown actions
  soft-warn and the renderer no-ops them). Use in CI or to guard critical
  beats.
- **Unified `with`-modifier form** — `actor t = box() at (10, 10) with
  scale=1.5, opacity=0.4, rotate=45`. The space-separated form is still
  accepted; the two can be mixed on the same line (space-form first, then
  `with`).
- **Figure-only type checking** — `punch`, `kick`, `rotate_part`, `pose`,
  `wave`, `nod`, `face`, `jump`, `bounce` now throw
  `ParseError: action "X" is figure-only; actor type is "Y"` when applied to
  non-figure actors (previously silently no-op'd).
- **Soft parse warnings (`ast.warnings[]`)** — non-fatal `ParseWarning`
  entries replace hard errors for: unknown actions, unknown camera actions,
  unknown modifier keys, unknown scene keys, and unresolved imports. Surfaced
  via `createPlayer({ onWarning })` or by reading `ast.warnings` directly.

### Added — Runtime

- `PlayerOptions.onWarning` — callback invoked once per soft parse warning.
  Defaults to `console.warn`.
- `PlayerOptions.imports` — pass host-resolved ASTs directly to the player;
  internally threaded through `parse()`.
- `sceneContent` inner layer — camera transforms apply to `sceneContent`
  while the outer `scene` element carries responsive CSS scaling. The two
  never fight.
- Camera state is per-`buildAnimations` call; reusing a DOM element across
  `createPlayer` lifecycles no longer leaks old pan/zoom/shake state.

### Added — Types

- `SceneAST.actors[].type` widened to include `"caption"`.
- `SceneAST.actors[].anchor?: "top" | "bottom" | "center"` for caption-
  positioned actors.
- `SceneAST.events[].chapter?: string` for events inside a chapter block.
- `SceneAST.chapters: Chapter[]`
- `SceneAST.imports: ImportDecl[]`
- `SceneAST.warnings: ParseWarning[]`
- New public types: `Chapter`, `ImportDecl`, `ParseWarning`, `ParseOptions`.
- New exports: `PRESETS`, `PRESET_NAMES`.

### Added — Docs & Tooling

- `docs/SYNTAX.md` — extended-grammar section covering every new feature
  plus the soft-warning taxonomy.
- `docs/AGENT.md` — full refresh of the AI-agent reference (grammar, action
  tables, AST shape, integration examples, new patterns).
- `README.md` — new feature highlights, chaptered/camera/caption example,
  namespaced import example, preset one-liner example, updated action
  table.
- `scripts/regenerate-all.ts` — single source of truth that regenerates
  `docs/SYNTAX.md`, `prompts/system-prompt.{md,json}`,
  `website/public/prompts/*`, and `examples/README.md` from one `FEATURES`
  array, keeping `FIGURE_ONLY_ACTIONS` / `UNIVERSAL_ACTIONS` in sync with the
  parser.
- New example files for each feature, plus `examples/presets/` for every
  shipped preset.
- `@markdy/compat` gate — runs all golden examples and asserts zero
  regressions (0 warnings, 0 chapters, 0 imports on any legacy AST).

### Fixed

- **Scene header inside a chapter block is no longer silently accepted.** A
  bare `scene width=2000` inside `scene "title" { ... }` used to mutate
  `ast.meta` when no prior top-level `scene` declaration existed. Now always
  throws `ParseError` so the typo (usually a missing `"..."` on an intended
  sub-chapter) surfaces at parse time.
- **Chapter `startTime` now reports the earliest event time inside the
  chapter**, not the inherited `openedAt` from top scope. Chapters whose
  first event uses an absolute timestamp earlier than the inherited
  start-time no longer misreport timing to downstream timeline UIs. Empty
  chapters still get a deterministic `startTime` (= `openedAt`).
- **Namespaced templates and vars from imports now resolve.** `actor hero =
  chars.fighter(...)` and `${chars.skin}` were previously rejected because
  the regexes only matched `\w+` for actor type names and `${...}` bodies.
  Dotted names are now accepted end-to-end; `play(seqs.combo)` works by the
  same rules.
- **Camera state is no longer leaked across `createPlayer` sessions.** State
  was stored via `Symbol` on the scene-content DOM node, persisting when the
  same element was reused. Camera state is now per-`buildAnimations`-call
  and always starts from the identity transform.
- **`camera.pan(to=(x, y))` uses the AST scene dimensions instead of probing
  the DOM.** The previous code fell back to a hard-coded 800×400 whenever
  `sceneContent.clientWidth` was 0 (jsdom, pre-layout) or the layer used
  percentage widths, causing pan offsets to be wrong for any scene whose
  dimensions differed from 800×400. The authoring-space coordinates now
  match the rendered motion.
- **Typo'd preset names now surface as `unknown-preset` warnings.** Previously
  any unrecognised preset silently produced an empty scene and a misleading
  `preset-mixed` warning. The new warning lists every valid preset name so
  the author can self-correct. `preset-mixed` is still emitted when a *known*
  preset is used alongside other statements.
- **Captions now hard-reject numeric positioning.** `actor c = caption("hi")
  at (100, 50)` previously parsed silently while the renderer still applied
  `-50%` self-centering, producing confusing placement. It now throws
  `ParseError` with a message pointing at the anchor syntax. The check runs
  against the *resolved* actor type, so `def` templates that expand to
  `caption(...)` are treated identically to direct caption declarations —
  including, for the first time, accepting `at top | bottom | center` on
  templated captions.

### Test coverage

- 50+ new parser tests across caption, chapters, `@+N:`, camera, exit,
  imports, presets, `!action`, unified modifiers, figure-only type
  checking, and soft warnings.
- Regression tests for every fixed bug above.

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
