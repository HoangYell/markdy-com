# Changelog

All notable changes to the `markdy` project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.8.7] — 2026-08-09

### Changed
- **Human-first AI prompt examples** — Simplified public AI prompt examples so users describe the diagram idea in natural language while the agent guide handles Markdy-specific syntax choices.

### Fixed
- **Unsupported AI syntax diagnostics** — Non-Markdy drawing, timeline, and imperative camera output now fails with actionable guidance instead of misleading node-kind errors.
- **AI-generated syntax tolerance** — The parser now accepts common LLM variants such as `#` comments, quote-safe `//` handling inside URLs, brace-delimited beat/pattern blocks, inline scene layout, quoted property values, and leading-`&` parallel cue continuations.
- **Playground editor/preview visibility** — The dedicated playground editor now scrolls internally while the preview pane stays sticky beside it, so authors can keep watching the animation while typing longer MarkdyScript scenes.

## [0.8.6] — 2026-08-09

### Added
- **Dedicated playground page** — Added `/playground/`, a spacious browser workspace for learning and testing MarkdyScript with curated examples moved outside the main work area, adjustable editor/preview split panes, CodeMirror editing, diagnostics, beat jumping, timeline scrubbing, playback speed controls, snippet insertion, and shareable scene URLs.
- **Playground SEO article** — Added `/blog/markdy-playground/`, a search-focused guide for learning, testing, validating, and sharing animated architecture diagrams in the browser.
- **Camera framing cues** — Added `frame` cues for guiding attention through large architecture diagrams. Authors can frame nodes, groups, or `frame $nodes` to reset smoothly back to the full diagram for loop-friendly scenes.
- **Beat captions** — Optional beat labels such as `beat trace "Follow the request":` now render as timed caption pills over the scene, making architecture walkthroughs easier to follow without extra overlay code.
- **Reference diagnostics** — The parser now warns about unresolved flow endpoints, cue targets, group members, and named styles, giving AI-generated MarkdyScript faster and more actionable validation feedback.

### Changed
- **More expressive storytelling examples** — Refreshed the URL shortener showcase and beats/groups tutorial example with camera framing, captions, and full-diagram reset cues while keeping the homepage example set curated.
- **Styled node rendering** — Named node styles now affect rendered cards (`fill`, `stroke`, `text`, and `accent`) while preserving the premium gradient treatment for custom fills.
- **Example quality gate** — `verify:examples` now treats warnings as failures so shipped examples stay parse-clean, diagnostic-clean, and safe for users or LLMs to copy.

### Fixed
- **Focus zoom parameter** — `focus ... zoom=` now controls the rendered pulse scale instead of always using the same hard-coded emphasis.
- **Formatter round-tripping** — `markdy fmt` now preserves non-style node props such as `icon=`, `image=`, and `logo=` instead of dropping them.
- **Cue property parsing** — Cues with multiple properties, such as `frame API zoom=1.2 dur=500ms`, now parse every property instead of only the first one.

## [0.8.5] — 2026-08-06

### Changed
- **Cleaner playground examples** — Removed long example descriptions from the homepage picker and shared registry, leaving a compact example list with source links; docs showcase cards now use concise architecture-pattern chips instead of paragraphs.
- **Responsive embedded preview** — Stacked the playground layout earlier on tablet and short landscape screens so the embedded preview no longer gets clipped horizontally.
- **Refreshed preview asset** — Regenerated `markdy-output-preview.webp` from the latest preview image for smaller social/docs imagery.

### Fixed
- **Playground syntax colors** — Restored CodeMirror token highlighting in the homepage editor by wiring MarkdyScript stream tokens to highlight tags correctly.

## [0.8.4] — 2026-08-06

### Changed
- **Diagram-native runtime naming** — Renamed the DOM runtime API to `createDiagram`/`Diagram`/`DiagramOptions` to match the animated-architecture-diagram direction, and removed the old `createPlayer`/`Player`/`PlayerOptions` compatibility aliases. Updated the internal scene node layer/dataset naming (`markdy-scene-node`) accordingly.
- **AI-first architecture docs** — Refreshed README, package READMEs, agent prompts, website copy, and marketing drafts so Markdy is described as a concise DSL for animated architecture diagrams from plain text.
- **MDX diagram component** — Renamed the MDX runtime component to `MarkdyDiagram`, with `remarkMarkdy` now emitting that component name by default.
- **Migration map** — Use `createDiagram` instead of `createPlayer`, `Diagram` instead of `Player`, `DiagramOptions` instead of `PlayerOptions`, `MarkdyDiagram` instead of `MarkdyPlayer`, and `SYSTEM_NODE_TYPES` instead of `SYSTEM_ACTOR_TYPES`.

### Removed
- **Legacy compatibility exports** — Removed `SYSTEM_ACTOR_TYPES` from `@markdy/stdlib-systems` and removed custom parser recognizers for old syntax; statements outside the diagram grammar now fail through the strict parser path.
- **Pre-0.8 cartoon docs** — Deleted the historical actor/figure/timeline material (`.github/AI_Instructions.md`, `PLAN.md`, `RESEARCH.md`, `docs/ANIMATION_SYSTEMS_ROADMAP.md`) and rewrote the stale renderer-internals, docs-page, and language-server copy that still described sprites, figures, and face-swaps.

## [0.8.3] — 2026-08-05

### Added
- **Paper-first renderer themes** — Added polished paper, blueprint, and graphite theme families alongside the existing dark theme, with upgraded node cards, role-aware icons, softer shadows, cleaner edge labels, and image/logo support for richer architecture scenes.
- **CI/CD delivery showcase** — Added a curated paper-theme pipeline example that demonstrates grouped reveals, request/dependency/event edges, focus cues, and production-style delivery storytelling.

### Changed
- **Paper is now the default theme** — New scenes, fallback theme resolution, homepage examples, Learn MarkdyScript tutorials, public prompts, docs, and article snippets now lead with the light `paper` theme instead of `midnight`.
- **Homepage playground uses more of the stage** — The embedded scene preview now fills the available width and keeps a tighter landscape frame to reduce wasted blank space.
- **Canvas auto-layout breathing room** — Reduced conservative safe margins and title band reservation so generated diagrams have more usable space and fewer cramped node boxes.

### Fixed
- **Node text readability** — Simplified node labels, removed redundant type copy, and tightened wrapping so longer system names fit better without cheap-looking borders or cramped icons.

## [0.8.2] — 2026-08-04

### Added
- **Playback controls for embedded previews** — Added playback-rate support across the DOM renderer, Astro, and MDX integrations, plus YouTube-style speed buttons in the homepage playground.
- **Semantic node cards** — Replaced visible node-kind text with compact, role-aware SVG icons while preserving semantic metadata, accessible labels, and role coloring.
- **Scene-boundary progress control** — Added `sceneBoundaryProgress` as the preferred option for hiding or showing the rainbow scene-boundary progress indicator.

### Changed
- **Showcase readability** — Rebalanced curated showcase scenes with cleaner spacing, smaller default node cards, and simpler source ids that render readable labels automatically.
- **MarkdyScript onboarding** — Reworked the homepage learning path into progressive how-to tutorials that build from the smallest scene shell to a production architecture explainer.
- **Scene-first documentation** — Updated the landing page, README, and getting-started guide so `.markdy` files and CLI validation are the primary authoring path, with `createPlayer` positioned as a custom embed API.

### Fixed
- **Technical label casing** — Improved generated labels for ids such as `ApiGateway`, `UrlMappingDb`, `CdnEdge`, `kubectl`, and `etcd` so examples can avoid redundant quoted labels.

## [0.8.1] — 2026-08-03

### Fixed
- **Flow-label overlap (`@markdy/renderer-dom`)** — Parallel edges between the same node pair now separate into lanes, and edge labels are placed to avoid node boxes and already-placed labels (with a halo for legibility), so dense diagrams stay readable.
- **Playground editor initialization** — Fixed a missing editor-theme import that left the homepage playground blank (`baseTheme is not defined`).

### Changed
- Refreshed package descriptions/keywords and site metadata for the diagram-native positioning (animated architecture & system diagrams), and added a `/blog/` article cluster for discoverability.

## [0.8.0] — 2026-08-03

### Changed
- **MarkdyScript 0.8 — diagram-native redesign (breaking)** — Replaced actor/timestamp syntax with nodes, beats, flow operators (`->`, `<-`, `~>`, `--`), groups, patterns, and semantic themes (`midnight`, `paper`). Auto-layout, edge routing, and beat scheduling are built in. Figure/story/preset syntax removed.

### Fixed
- **Flow-edge labels** — Inline labels on flow targets (`A -> B "label"`) were folded into the target node id, producing a phantom node so the renderer silently dropped every labeled edge. Labels are now parsed correctly and node ids stay clean.
- **`markdy fmt` round-trips** — Formatting is now idempotent for response (`<-`) edges (previously the arrow direction flipped on each pass) and no longer leaks internal `__pos_` keys when formatting positional `use` calls.
- **Edge routing** — Flow edges now route orthogonally around other nodes instead of drawing straight through them, and a pulse travels along the edge as it reveals.
- **Language server** — Removed duplicate diagnostics reported for a single parse error.
- Completed the 0.8 migration cleanup: dropped dead figure/actor renderer modules, rebuilt the diagram-native geometry helpers, and updated `@markdy/stdlib-systems` and the Astro starter to the new vocabulary.
- Migrated all demos, examples, and docs to 0.8 diagram syntax: replaced the old numbered examples/presets with fresh node/flow/beat/pattern examples (now covered by `verify:examples`), rewrote `AGENT.md` and `TUTORIAL.md`, refreshed every package README, and rebuilt the homepage "Learn" cards (all playground snippets are valid 0.8). Historical planning docs are annotated as pre-0.8.


## [0.7.29] — 2026-08-02

### Fixed
- **Flow-edge labels no longer overlap** — Edges now appear at their scheduled time and persist, assembling the diagram instead of showing every label from the first frame. Labels are placed with collision avoidance so they never sit on top of nodes, the title caption, or one another, and the traveling dot fades on arrival to leave a clean line and arrowhead.

### Changed
- **Learn MarkdyScript rebuilt around architecture diagrams** — The step-by-step guide now teaches the real production recipe (systems nodes, grouped reveals, chaptered `request`/`response`/`emit` flows, polish, and camera direction) with practical, runnable examples instead of one-off story scenes.

## [0.7.28] — 2026-08-02

### Added
- **Actor groups** — Added `group <name> = actorA, actorB` declarations so one event can target multiple actors, with `stagger=N` support for cascaded fan-out timing.
- **Production architecture gallery** — Replaced the curated playground set with five complete system-design diagrams: URL Shortener, Twitter Timeline Service, YouTube Processing Pipeline, OAuth/OIDC Login Flow, and Kubernetes Cluster Architecture.

### Changed
- **Generic visual primitives** — Replaced story-specific showcase surface actors with reusable primitives and friendly aliases (`surface`, `terminal`, `stat`, `matrix`, `track`, `dot`, `chips`, and `glyph`) so advanced scenes can be composed for any scenario instead of relying on hardcoded examples.
- **Technical diagram vocabulary** — Expanded the systems DSL with broad software-engineering node families for architecture, cloud, frontend/backend, data, messaging, Kubernetes, Docker, CI/CD, auth, observability, state machines, flowcharts, distributed systems, and programming concepts.
- **Reference & prompt accuracy** — Documented the full action surface (premium effects, system flow edges, extended easings) and systems vocabulary across `docs/AGENT.md`, the syntax reference, and the generated AI prompt, and derived `system-prompt.json` from the canonical `@markdy/core` vocabulary so the docs, prompt, and engine can no longer drift.
- **Legacy showcase compatibility** — Preserved the earlier bespoke showcase actor names as non-advertised compatibility aliases that render through the generic primitive layer.

## [0.7.27] — 2026-08-02

### Added
- **Premium playground showcases** — Replaced the simple homepage playground set with polished Cyber Parking, ASCII Parking Garage, Parking Game Loop, and UTF-8 Byte Visualizer scenes that demonstrate complex HTML/CSS surfaces, animated HUDs, terminal views, game-style motion, and byte-level education flows.
- **Showcase surface actors** — Added an initial bespoke showcase-surface experiment for detailed dashboard, terminal, game, and byte-visualization scenes.

### Changed
- **Renderer safe framing** — Added an automatic safe-frame actor layer so large or animated scene content is scaled and translated back inside the viewport instead of being clipped.
- **Flow routing accuracy** — Improved system connection geometry with scale-aware actor bounds, better route scoring, scene clamping, and lane-aware label placement to keep dense diagrams readable.

## [0.7.26] — 2026-07-31

### Changed
- **Homepage learning polish** — Refined the Learn MarkdyScript section and homepage layout copy for clearer onboarding before the playground/gallery refresh.

## [0.7.25] — 2026-07-31

### Changed
- **Natural default easing** — `enter` and `fade_in` now default to `out` easing, while `exit` and `fade_out` default to `in` easing when no explicit `ease=` is provided, making bare entrance and exit animations feel less mechanical.
- **Syntax docs clarified** — Documented the action-specific easing defaults while preserving `linear` as the default for other actions and explicit `ease=` overrides.

## [0.7.24] — 2026-07-30

### Fixed
- **Website favicon fallback** — Added a legacy `/favicon.ico` route so browser favicon probes resolve to the shipped site icon instead of returning a 404.

## [0.7.23] — 2026-07-30

### Added
- **Website SEO foundation** — Expanded site-wide metadata, Open Graph/Twitter previews, structured data, crawler hints, `llms.txt`, a web manifest, and a square site icon so search engines, social previews, and AI tools can better understand Markdy.
- **Documentation landing page** — Added an indexable `/docs/` page that points developers to the tutorial, syntax reference, AI agent guide, examples, and quickstart install command.
- **Homepage intent content** — Added use-case, FAQ, and promotion sections to answer common animation DSL questions and give visitors clearer paths to GitHub, npm, and AI-agent docs.

### Changed
- **Privacy copy accuracy** — Updated the privacy page to reflect that Markdy.com does not currently run analytics scripts or advertising pixels.

## [0.7.22] — 2026-07-30

### Changed
- **Learn section balance** — Added a final Captions & Camera card to the homepage Learn MarkdyScript guide so the desktop grid no longer ends with an orphan card.
- **Camera syntax onboarding** — Expanded the learning path with runnable examples for anchored captions plus `camera.pan`, `camera.zoom`, and `camera.shake`.

## [0.7.21] — 2026-07-19

### Changed
- **README output preview unified** — Added a single shared output-preview image embed across root, examples, and package READMEs so users can quickly see real Markdy render output.
- **Visual docs simplified** — Replaced prior screenshot-heavy visual-guide sections with clearer text-based package-position maps in package docs.
- **Website visual cleanup** — Removed the homepage image-card visual guide section and deleted the older generated showcase image assets.

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
