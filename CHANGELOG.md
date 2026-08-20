# Changelog

All notable changes to the `markdy` project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.17] — 2026-08-20

### Fixed
- **Robust Fullscreen Viewport & Fallback Modal (`@markdy/renderer-dom`)** — Enhanced fullscreen handling with multi-vendor browser support (`webkit`, `moz`, `ms`), `:fullscreen` canvas scaling, auto-refit on fullscreen transitions, and automatic CSS pseudo-fullscreen fallback (`.markdy--pseudo-fullscreen`) when native `requestFullscreen()` is blocked by iframe sandboxes or browser permission policies.

## [1.0.16] — 2026-08-20

### Changed
- **Default Speed Segmented Pill (`@markdy/core`)** — Simplified canonical default speeds to `[0.25, 1]` (`0.25x` for slow-motion inspection and `1x` for normal pace) for a clean, minimal 2-option segmented pill across all standalone and embedded players.

## [1.0.15] — 2026-08-20

### Changed
- **Default Player Controls (`@markdy/core`)** — `prev_beat` and `next_beat` now default to `false` (opt-in only), removing the `Prev` and `Next` buttons from the default playback toolbar for a sleeker, uncrowded timeline bar across all embedded and standalone diagrams.

## [1.0.14] — 2026-08-20

### Added
- **Micro-Inspection Speed Pill (`@markdy/core`, `@markdy/renderer-dom`)** — Default speeds updated to `[0.1, 0.25, 0.5, 1, 1.5]`. Features a high-contrast segmented pill UI for ultra-slow motion step-through of complex distributed flows and race conditions.
- **Embedded Source Code Drawer (`<> Code`) with Direct Studio Forking (`@markdy/renderer-dom`)** — Enhanced the `<> Code` modal overlay with an **`Open in Studio ↗`** primary action button, allowing readers of embedded diagrams on third-party documentation/blogs to 1-click fork the diagram into `https://markdy.com/playground#code=...`.
- **Dynamic Theme Switcher Control (`@markdy/core`, `@markdy/renderer-dom`)** — Added `player.controls.theme` support with random dark-to-dark and light-to-light palette toggling across Studio, Playground, and embedded viewports via `markdy-theme-switch` custom events.
- **Glassmorphic Brand Badge (`.markdy-badge`)** — Upgraded the default diagram watermark to an interactive `⚡ Markdy` pill badge with hover elevation and direct playground deep linking.

### Changed
- **Canonical Embed Player Defaults** — Standardized embed defaults across `@markdy/core` and all 49+ showcase `.markdy` files (`keyboard: false` to prevent article scroll-jacking, `badge: true` and `code: true` for viral discovery, `speeds: "0.1 0.25 0.5 1 1.5"` for micro-inspection).
- **Playground MarkdyScript Formatter** — Enhanced `formatMarkdyScript` in `playground.astro` to properly format nested YAML `player:` blocks with 2-space category indentation and 4-space setting indentation.

### Fixed
- **Client Runtime State in Live Studio (`index.astro`)** — Declared missing `autoShuffleTimer` and `isAutoShuffleEnabled` variables in the homepage client script, eliminating runtime reference errors during manual code edits and preset switches.

## [1.0.13] — 2026-08-19

### Fixed
- **Diamond / Decision Node Rendering (`@markdy/renderer-dom`)** — Decision (`decision` kind) and diamond-shape nodes no longer render a glyph/icon inside the rhombus body. The clipped geometry leaves too little horizontal room for an icon alongside the label, causing truncation and visual noise. Diamond nodes now render label-only with a centred body and tighter horizontal padding (`padding: 6px 16%`), matching the visual convention of standard flowchart diamond shapes. Updated the visual gate test so the "every node has a glyph" assertion correctly exempts diamond-shape nodes.
- **Structural Edge Layer Z-Index (`@markdy/renderer-dom`)** — Raised the `markdy-structural-edge-host` layer z-index from `45` to `55`, placing it correctly between the group boundary layer (`z:48` → edges draw above group fills) and the scene node layer (`z:60` → nodes always sit on top of edges). Edges connecting nodes inside or across group boundaries are now fully visible and no longer obscured by group background panels.

## [1.0.12] — 2026-08-19

### Added
- **`fullscreen` Player Control Flag (`@markdy/core`, `@markdy/renderer-dom`)** — Declarative `fullscreen true/false` flag inside `player.controls:`. Features native HTML5 Fullscreen API integration with dynamic `aria-pressed` synchronization and `fullscreenchange` lifecycle tracking.
- **Micro-Icon Glyphs & Thematic Tokens (`@markdy/renderer-dom`)** — Added crisp CSS pseudo-element icons for all player buttons (`▶`/`⏸`, `⏮`, `⏭`, `↺`, `⛶ Fit`, `⊙ Reset`, `⛶ Full`, `📥 SVG`, `🔗 Share`) alongside dark-mode and theme-specific styling tokens across all 8 themes.

### Changed
- **Playground & Live Studio Respect DSL `player:` Directives** — Removed overriding host options in `playground.astro` and `index.astro` so that user-defined `player:` directives in MarkdyScript are 100% authoritative in both the Playground and Homepage Live Studio.
- **Pixel-Perfect Single-Row Toolbar** — Refined toolbar button padding, gaps, and slider dimensions so all 14 player affordances comfortably sit on a single desktop row without wrapping, with clean centered wrapping on mobile viewports.
- **Streamlined Live Studio Header** — Consolidated homepage studio actions (`🔀 Shuffle`, `Run ▶`, `Paste`, `Copy`, `Popout ↗`) and compiler status pill into the topbar, eliminating duplicated SVG/Share buttons.
- **Showcase Example Parity** — Updated showcase examples (`url-shortener-architecture.markdy`) to showcase all 23 player flags across playback, controls, interaction, and chrome.

## [1.0.11] — 2026-08-19

### Added
- **Unified `player:` block (`@markdy/core`)** — One declarative home for everything outside the diagram scene itself, organised into four groups so every leaf belongs to exactly one concern:

  ```markdy
  player:
    playback:
      autoplay false
      loop true
      rate 1.5
    controls:
      play true
      restart true
      prev_beat true
      next_beat true
      seek true
      speed true
      speeds "0.5 1 2"
      fit true
      reset_view true
      svg true
      share true
    interaction:
      zoom true
      pan true
      click_to_play true
      double_click_to_reset true
      keyboard true
    chrome:
      badge false
      progress boundary
      color "#3b82f6"
  ```

  - **Opt-in by declaration**: declaring a group turns it on and every affordance inside defaults to on, so authors only list what they want to switch off. A group disables itself when all of its affordances are `false`, which removes the need for a separate `enabled` flag to keep in sync.
  - **Scope-local aliases**: `speed` means playback rate at the player root but the speed buttons inside `controls:`, which the previous flat model could not express. Keys accept camel case or snake case and `key value`, `key: value`, or `key = value`.
- **New player controls (`@markdy/renderer-dom`)**:
  - **Fit** — frames every item in the scene using real content bounds and pins the camera, so `frame`/`focus` zoom cues (e.g. `zoom=1.18`) stop moving the view while active. Implemented with an inline `!important` transform that outranks cue animations in the cascade.
  - **Prev/Next beat** — time-aware beat stepping that mounts only when a scene has more than one beat.
  - **Seek bar**, **configurable speed options** (`speeds "0.25 1 3"`), **SVG export**, and **Share**.
  - **SVG** exports the settled final frame so no revealed node is missing, and loads the exporter through a dynamic import to keep the default bundle lean. **Share** copies a compressed `#code=` link, aimed at the Markdy playground by default and redirectable with the new `shareUrl` option.
- **Keyboard shortcuts** — <kbd>←</kbd>/<kbd>→</kbd> step beats, <kbd>Space</kbd> toggles playback, <kbd>Home</kbd> restarts. Opt-in through `interaction: keyboard true` because the listener is window-level and captures space and arrow keys.
- **`Diagram.nextBeat()` / `Diagram.prevBeat()`** — public beat navigation derived from the current playhead.

### Changed
- **`@markdy/core` owns player resolution** — new `player.ts` module holds the schema, a single alias registry, `applyPlayerSetting`, and `resolvePlayer`. The parser's `player:` block, `scene` properties, top-level directives, `SCENE_KEYS`, and the language-server keyword list all derive from that one source instead of four hand-maintained lists, and hosts resolve behaviour through `resolvePlayer` rather than re-deriving defaults.
- **Live Studio and homepage now use the built-in player** — removed the duplicated transport UI (play, restart, rewind, speed buttons, timeline scrubber, step buttons, beat/scene jump selects, canvas "Fit", and the topbar SVG and Share buttons) along with their handlers and CSS. Auto-shuffle, grid, zoom in/out, Import, Live Director, PNG/GIF export, and theme remain, since they are not player duplicates.
- **`@markdy/mdx` no longer overrides scene configuration** — `remarkMarkdy()` previously injected `autoplay=false`, `loop=false`, and `progressBar=false` as explicit props, which silently outranked a scene's own settings. The transform now adds no implicit props, so a diagram behaves the same in DOM, Astro, and MDX. Pass `remarkMarkdy({ defaults: { autoplay: false, loop: false, progressBar: false } })` to restore the previous static-page behaviour.

### Deprecated
- `SceneMeta.controls`, `interactiveViewport`, `autoplay`, `loop`, `copyright`, `playbackRate`, and `progressColor` are now mirrors of `meta.player`, kept populated for existing consumers. Legacy top-level directives, flat `player:` keys, and inline `scene` properties such as `controls true`, `interactive true`, and `speed 1.5` are normalised into the grouped model and continue to work.

## [1.0.10] — 2026-08-18

### Added
- **Circuit-Grade Orthogonal Routing & Line Bridges (`@markdy/renderer-dom`)**:
  - **CAD-Style Semicircular Line Bridges**: Added automatic perpendicular crossing detection with direction-consistent 5px semicircular arc bridge hops (`A 5 5 0 ...`) over intersecting connector paths.
  - **Strict Node Collision Avoidance**: Preserved all node bounding boxes in obstacle pathfinding grids, preventing connector paths from ever penetrating or cutting across component card bodies, text, or icons.
  - **Smart Anchor Selection & Return Highways**: Forward Left-to-Right flows strictly route right-face to left-face; backward return loops route through dedicated top or bottom perimeter highway corridors with outward port extensions ($\ge 18\text{px}$).
  - **Collision-Free Label Placement**: Evaluates multi-segment candidate anchor positions with step offsets, preventing adjacent edge labels from overlapping in tight corridors.
  - **Subtle Layered Label Backdrops**: Layered label badges above connector lines with opaque theme-matched fills and subtle border strokes.

## [1.0.9] — 2026-08-18

### Added
- **Modern Diagram Rendering Engine Upgrade** — Re-architected Markdy's layout and rendering pipeline for publication-grade HTML/SVG presentation across all 18 diagram archetypes:
  - **Circuit-Grade Orthogonal Routing & Stubs**: Enforced $18\text{px}$ initial perpendicular exit/entry stubs ensuring filleted corners ($r=14\text{px}$) never cut into card boundaries; added `cleanCollinearPoints` pruning of redundant collinear vertices.
  - **Adaptive Space-Aware Layout Math**: Bounded safe content canvas calculations in `layoutRanked` eliminating right-side clipping on wide flows (e.g. 8-stage CI/CD pipelines) and clustering nodes by group within ranks.
  - **Radar Benchmark Web Layer (`type=radar`)**: Added concentric regular polygon grid rings, radial spoke axes from center to each metric card, and subtle translucent benchmark polygon overlays.
  - **Milestone Timeline Track (`type=timeline`)**: Added a central horizontal baseline track with circular milestone pips, vertical stem lines, and focal pulse styling.
  - **Executive Value Pyramids (`type=pyramid`)**: Dynamically widens tier card widths from apex to base, creating an executive pyramid hierarchy.
  - **Concentric Security Perimeters (`type=nested`)**: Concentric boundary frames with clean top-left badges enclosing a centered focal Hardware Security Enclave (HSM) core.
  - **Gantt Chart Centering & Spacing (`type=gantt`)**: Adaptive row spacing and centered baseline positioning for staggered phase spans.
  - **Modern Card Glassmorphism & Elevation**: Specular top highlights (`inset 0 1px 0 rgba(...)`), multi-layer drop shadows, role-colored icon containers, and container boundary differentiation.
- **Comprehensive Unit Testing Suite** — Added 155 automated unit tests across `@markdy/core` and `@markdy/renderer-dom` verifying all DSL syntax constructs, geometry routing math, layer renderers, 18 diagram archetypes, and 8 themes.

## [1.0.8] — 2026-08-17

### Added
- **Authoritative AGENT.md Refactor** — Redesigned the canonical AI reference guide with a universal 4-step mental model, canvas sizing math, and 8 production-ready golden architectural templates (Microservices, RAG/AI Agents, Kafka Fanout, Kubernetes, GitOps CI/CD, OAuth2 Auth, Multi-Region HA, and Decision Trees).
- **Automated Documentation Quality Gate** — Extended `verify:examples` to automatically extract, parse, and validate all `markdy` code fences in `docs/AGENT.md` ensuring 100% of documentation examples remain syntactically valid and runnable.
- **Docs Keyboard Search Shortcuts** — Added `Cmd+K`, `Ctrl+K`, and `/` keyboard shortcuts to immediately focus and select the documentation search bar.

### Changed
- **Article Typography & Link Contrast** — Standardized text block links and breadcrumbs with high-contrast palette values and distinct underlines.

## [1.0.7] — 2026-08-17

### Performance
- **Dynamic Module Code-Splitting** — Switched homepage interactive studio to dynamically load `@codemirror/*` and `@markdy/renderer-dom` inside `requestIdleCallback`, dropping initial page JavaScript bundle from 614 KB to 17 KB.
- **100/100 Google Lighthouse Scores** — Reached 100/100 Performance, 100/100 Best Practices, and 100/100 SEO across all key routes (`/`, `/docs/`, `/agent/`, `/blog/`, `/playground/`).
- **Zero Cumulative Layout Shift (CLS = 0.000)** — Stabilized hero stages and typography rendering with `display=optional` and reserved responsive dimension boundaries.

### Added
- **Playground Live Director Theatre Mode** — Added a 1-click fullscreen cinematic presentation theatre mode with frosted glass blur dock and auto-restart on stage focus.
- **Playful Mascot Integrations** — Embedded axolotl mascots, 3D wordmark, and AI agent graphics with low-priority non-blocking lazy loading.

### Accessibility
- **WCAG 2.2 Compliance** — Sequential heading hierarchy (`h1` $\rightarrow$ `h2` $\rightarrow$ `h3`), `role="tablist"` / `role="tab"` / `aria-selected` state synchronization, distinct link underlines in text blocks, and touch target sizing.

## [1.0.6] — 2026-08-16

### Performance
- **Hero Image Preloading & Resource Prioritization** — Preloaded hero background image (`/og-image.webp`) in the HTML `<head>` with `fetchpriority="high"`, `loading="eager"`, and explicit intrinsic dimensions, driving Largest Contentful Paint (LCP) down to 520ms.
- **Zero-Shift Font Strategy (CLS = 0)** — Switched web font loading to `font-display: optional` with DNS preconnect, eliminating layout reflows and font-swapping shifts for a perfect Cumulative Layout Shift score (0.00).
- **Asynchronous & Lazy Image Loading** — Configured all blog diagram images, mascots, and brand marks with `loading="lazy"`, `decoding="async"`, and explicit aspect ratio dimensions.
- **Edge Asset Caching** — Added long-term immutable caching headers (`Cache-Control: public, max-age=31536000, immutable`) for all `/images/*`, `/*.webp`, `/*.svg`, and `/_astro/*` bundles in `website/public/_headers`.

## [1.0.5] — 2026-08-16

### Added
- **Markdy Visual Capture Workspace Skill** — Added reusable agent automation (`.agents/skills/markdy-visual-capture/`) for capturing crisp 2× Retina playground diagrams and generating decorated 16:9 landscape documentation assets.
- **Mascot & Brand Visual Identity** — Added transparent mascot artwork (`mascot.webp`), 3D hexagon M pin icon, and master WebP Open Graph image (`og-image.webp`).

### Changed
- **Redesigned Homepage Hero Section** — Elevated the landing page hero into a modern showcase stage using `og-image.webp` as the visual foundation, with a seamless frosted glass wash for crisp typography readability and responsive light/dark theme support.
- **High-DPI Landscape Documentation Assets** — Upgraded all 32 diagrams across `docs/images/` and `website/public/images/` to 16:9 landscape format, decorated with the Markdy axolotl mascot, 3D icon pins, and step-by-step architecture notes.
- **GitHub README Showcase** — Embedded the official mascot banner and vector logo directly into the root `README.md`.

## [1.0.4] — 2026-08-16

### Added
- **"Core Philosophy" docs section** — The docs sidebar and mobile TOC have long linked to a `#concepts` anchor with no matching section. Added the missing "Core Philosophy" section covering diagrams-as-code, the parser/renderer split, timeline-driven motion, and semantic node kinds.

### Changed
- **Unified "Copy" button styling** — Standalone copy-to-clipboard buttons next to code blocks (blog articles, docs code cards, homepage framework/ingestion snippets, the AI agent page) now share one consistent style instead of five slightly different bespoke ones. Copy buttons that are part of a multi-button toolbar (playground toolbar, homepage Studio tools, paired prompt actions) were intentionally left as-is so they stay visually consistent with their sibling buttons.

## [1.0.3] — 2026-08-16

### Fixed
- **Article code blocks readable in light theme** — Blog article code cards hardcoded a dark-theme text color, making snippets nearly invisible against the light-theme code background. Text color now follows the theme.

### Added
- **Vanilla JavaScript integration example** — The homepage framework quickstart and the docs "Framework Integrations" section now include a plain `@markdy/renderer-dom` / `createDiagram` example alongside Astro, MDX/React, and CLI.

### Changed
- **Homepage framework tabs now lead with JavaScript** — Supersedes the 1.0.2 change; the framework quickstart now defaults to the framework-agnostic JavaScript example first, since Astro and MDX are built on top of it, followed by Astro, MDX/React, and CLI tooling last.

## [1.0.2] — 2026-08-16

### Fixed
- **Code-card language detection now respects explicit block metadata** — Studio eligibility checks on article and docs code cards now honor `data-lang`, preventing JavaScript or text examples that embed Markdy strings from being misclassified as runnable Markdy scenes.
- **Framework example snippets now declare intended languages** — Blog examples that should remain JavaScript or literal fenced text now opt out of Studio auto-detection with explicit `data-lang` values.

### Changed
- **Homepage framework tabs now lead with Astro** — The framework quickstart tab order and default active panel now prioritize the Astro integration path while retaining MDX/React and CLI snippets.

## [1.0.1] — 2026-08-16

### Added
- **Embedded playground popout** — The "Powered by Markdy" badge on embedded scenes now opens the hosted playground with the current MarkdyScript preloaded.

### Fixed
- **Viewport-independent exports** — SVG exports now capture the full scene instead of the current interactive pan and zoom transform.
- **Resilient export resource inlining** — External image and CSS resources are cached, time-bounded, and safely replaced when unavailable so exports do not hang or fail on unreachable assets.

### Changed
- **Focused web export actions** — The homepage and playground topbars now emphasize SVG export while keeping heavier raster/GIF export paths out of the primary toolbar.

## [1.0.0] — 2026-08-16

### Added
- **Canvas-safe PNG and GIF exports** — Added shared resource inlining for renderer DOM exports so external images and CSS `url()` assets are embedded as data URIs before canvas rendering.

### Fixed
- **Cross-origin export failures** — Prevented tainted-canvas failures in PNG snapshots and animated GIF frame capture when diagrams include externally hosted assets.

### Changed
- **Playground editor controls** — Refined the playground source editor header into separate selector and action rows, improving toolbar grouping, spacing, and primary Run button placement.

## [0.8.28] — 2026-08-16

### Added
- **Focused Visual & Code Authoring Studio (`/playground/`)** — Redesigned the playground into a modern visual and code authoring environment with segmented view modes (`⚡ Split`, `🎨 Canvas`, `📝 Code`), live status indicators with real-time node & flow counters, and a Code Formatter (`✨ Format` / `Cmd+S`).
- **Token Palette Shelf with Drag & Drop Flow** — Added 5 categorized shelves (Nodes, Flows, Layouts, Themes, Beats) with semantic icons, drag-and-drop onto the canvas with visual drop cards, and automatic MarkdyScript AST code generation.
- **Canvas Direct Manipulation & Contextual HUDs** — Added interactive node selection with Floating Node HUD (kind selector, inline rename, pulse animation trigger, frame grouping, node deletion), directional connector ports (N, S, E, W) with rubber-band bezier curves, and Flow connection popovers.
- **Canvas Viewport & Background Grid Controls** — Added interactive Zoom In (`+`), Zoom Out (`−`), Fit to View (`⛶ Fit`), and Background Grid toggles (`▦ Dots / Mesh / Plain`).
- **Collapsible Architecture Inspector Drawer** — Integrated 4 inspector panels: Entities (live node and flow counts), Health & Suggestions (with 1-click fixes), AI Prompt Architect (generates system prompts embedding the current AST and `AGENT.md`), and Diagnostics & Lint.
- **Animated GIF Export Engine in `@markdy/renderer-dom`** — Added `exportDiagramAsGif` with multi-frame Web Animations API sampling, complementing existing vector SVG and 2x Retina PNG exporters.
- **Showcase Gallery Search & Category Filters** — Enhanced gallery with alias expansion search (`k8s`, `kafka`, `oauth`, `sql`, `db`, `async`, `cicd`, `pipeline`, `stream`) and categorized filter chips.

## [0.8.27] — 2026-08-16

### Added
- **AI Agent & Docs Header Metadata** — Added authoritative specification metadata blocks (Current Version, Time Updated, Specification Version, Last Updated, Status, and Canonical URLs) across `docs/AGENT.md`, `docs/SYNTAX.md`, `docs/TUTORIAL.md`, `docs/GETTING_STARTED.md`, `docs/GUIDES.md`, `docs/TROUBLESHOOTING.md`, `docs/COMPARISONS.md`, and `docs/ARCHITECTURE.md`.
- **Dynamic Documentation Endpoints** — Dynamically synchronized version, timestamp, and spec metadata across `/agent/`, `/docs/`, `/llms.txt`, and `/llms-full.txt`.
- **Automated Version Synchronization** — Integrated `pnpm run regen` directly into the release script so every future release automatically updates documentation metadata, prompts, and machine-readable endpoints from `package.json`.
- **Copy Actions on Documentation Snippets** — Added 1-click copy buttons for universal ingestion commands and framework code snippets on the documentation hub.

### Changed
- **Mobile UX & Safe-Area Inset Handling** — Added safe area inset support (`var(--sat)`, `var(--sab)`), responsive fluid typography (`clamp()`), and momentum touch scrolling (`-webkit-overflow-scrolling: touch`) across layouts, code blocks, and table containers.

## [0.8.26] — 2026-08-16

### Added
- **Complete In-Browser Documentation Hub (`/docs/`)** — Interactive quickstart, complete grammar and scene declaration tables, 13 semantic node kinds, 6 flow operators, and official Model Context Protocol (MCP) server integration reference for Claude Desktop and Cursor.
- **Interactive Studio Visual Canvas & HUD (`/playground/`)** — Added 3 view modes (Canvas, Split, Code), direct-manipulation node selection with Floating HUD (`⚡ Pulse`, `🔍 Frame`, `🗑️ Delete`), storyboard beat track, and 1-click universal ingestion modal.
- **Hero Split-Pane Live Studio (`/`)** — Embedded live interactive compiler and Web Animations API DOM stage directly on the homepage hero with 1-click architecture presets (Cache-Aside, Kafka Stream, K8s Ingress, OAuth2).
- **High-DPI 2x Retina PNG & Vector SVG Export** — Standalone export utilities in `@markdy/renderer-dom` for SVG and crisp raster PNG snapshots.
- **Native URL State Compression** — Built-in LZ-based compression (`compressMarkdyToUrlHash` / `decompressMarkdyFromUrlHash`) for compact `#code=~m...` shareable URLs.

### Changed
- **Architecture Governance Linter & AST Validation** — Strict rule validation across cloud well-architected guardrails, cycle detection, and security boundary isolation.
- **Global Design Tokens & Elevations** — Standardized modern HSL palette, dark/light theme palettes, layered elevations, and focus rings.

### Fixed
- **Universal Ingestion Transpilation Handlers** — Fixed async Draw.io parsing and Mermaid transpiler result object extraction in studio import modal.
- **Architecture Governance Audit in Studio** — Corrected AST passing and violation report formatting.

## [0.8.25] — 2026-08-15

### Fixed
- **MCP server npm publishing** — The Release workflow now builds, publishes, and lists `@markdy/mcp-server` so its npm package page resolves after release.

## [0.8.24] — 2026-08-15

### Changed
- **Venn diagram routing** — Venn set nodes now use square circle geometry and circle-to-circle flow arrows route directly between circular boundaries instead of rectangular card anchors.
- **Homepage package grid alignment** — The final package card now follows the grid flow instead of being centered as an orphan.

### Fixed
- **Fintech governance showcase spacing** — Widened the high-throughput fintech governance scene so LR-ranked cards and arrows no longer overlap in the homepage playground preview.

## [0.8.23] — 2026-08-15

### Fixed
- **Homepage editor startup** — Removed an invalid spread of the `TECHNICAL_NODE_KINDS` role lookup object so the homepage playground script initializes and rendered Markdy scenes hydrate locally and in production.

## [0.8.22] — 2026-08-15

### Changed
- **CLI import loads compatibility tooling on demand** — `markdy import` now lazy-loads `@markdy/compat`, keeping normal CLI startup paths lighter while preserving all supported import formats.
- **Diagram-cycle diagnostics stay mode-aware** — Forward-flow cycle warnings now apply to architecture and flowchart diagrams without flagging loop-oriented layouts that intentionally circle back.

### Fixed
- **Renderer embeds without `ResizeObserver`** — `@markdy/renderer-dom` now renders and tears down cleanly in browser/embed hosts that do not expose `ResizeObserver`, while still using resize observation when available.
- **Quoted cue captions no longer become targets** — Cue target parsing now ignores trailing quoted captions such as `glow Decide "focal gate"` instead of warning about a missing target named after the caption.

## [0.8.21] — 2026-08-15

### Added
- **Expanded architecture example library** — Added new numbered examples (`05` through `19`) and a broadened showcase set covering ingestion, governance, swimlanes, pyramids, radar comparisons, fan-in bottlenecks, timelines, Gantt roadmaps, Venn overlap, and containment scenarios.
- **Compatibility toolkit foundation (`@markdy/compat`)** — Introduced a dedicated compatibility package with source modules, tests, and release gate wiring to improve cross-format and integration workflows.
- **MCP server package scaffold** — Added a new `@markdy/mcp-server` workspace package to support model-context protocol integration work.

### Changed
- **Core compiler and renderer capabilities** — Updated core compiler/runtime modules and renderer-dom behavior, including new utilities and extended feature coverage in tests and snapshots.
- **CLI and docs refresh** — Expanded CLI implementation/tests and refreshed docs, tutorials, and website content to reflect the richer architecture-focused examples and workflows.

## [0.8.20] — 2026-08-15

### Added
- **In-script controls & presentation directives** — MarkdyScript now supports declaring runtime and embed directives directly in code (e.g. `controls true`, `interactive true`, `progressColor "#3b82f6"`, `speed 1.5`, `loop false`), both as top-level directives and inline `scene` properties, making scenes self-contained across the CLI, Astro, and MDX.
- **Custom progress bar colors & gradients** — Support solid colors (`progressColor="#3b82f6"`) or multi-stop gradients (`progressColor="#ec4899, #8b5cf6"`) in both MarkdyScript and renderer options, with rainbow remaining as the default.

### Changed
- **Left-aligned diagram controls in footer** — The built-in toolbar now sits on the left of the footer with active press tactile feedback, while the "Powered by Markdy" badge is aligned to the far right.

## [0.8.19] — 2026-08-15

### Changed
- **Diagram controls move below scenes** — The built-in toolbar now sits in the footer beside the "Powered by Markdy" badge instead of overlaying scene content.

## [0.8.18] — 2026-08-14

### Changed
- **Embedded controls enable viewport interaction** — `controls` now enables wheel zoom, drag pan, and view reset automatically so Astro/MDX embeds only need one flag for the full interactive toolbar experience.

## [0.8.17] — 2026-08-14

### Added
- **Embedded diagram controls** — Added an opt-in `controls` flag for renderer, Astro, and MDX embeds that shows play/pause, restart, speed, and view reset controls.

## [0.8.16] — 2026-08-14

### Fixed
- **Fixed-frame viewport panning** — Dragging an interactive diagram now pans the content behind the scene frame instead of moving the whole scene surface out of view.

## [0.8.15] — 2026-08-14

### Added
- **Interactive diagram viewport** — `@markdy/renderer-dom` now supports opt-in wheel zoom and drag pan through `interactiveViewport`, with website demos enabling the Figma-like viewport controls while preserving click-to-pause.

### Changed
- **Calmer normal playback** — `1x` is now Markdy's normal playback speed, so `0.5x` is half of the new normal and `2x` is twice the new normal.

## [0.8.14] — 2026-08-11

### Fixed
- **Silent MDX/JSX indent recovery** — `@markdy/core` now treats successful recovery from host-stripped colon-body indentation as normal parsing behavior instead of emitting browser-visible warnings through `@markdy/renderer-dom`.

## [0.8.13] — 2026-08-11

### Fixed
- **Colon-body indent loss** — `@markdy/core` now recovers `group` / `beat` / `pattern` colon bodies when hosts (MDX/JSX template literals) strip leading indentation, instead of failing with empty groups or top-level cue errors. A diagnostic warning is emitted when the soft-body fallback runs.
- **Astro HTML attribute stripping** — `@markdy/astro` encodes MarkdyScript as `data-markdy-code-b64` so HTML attribute whitespace normalization cannot destroy indented diagram source before hydration.

## [0.8.12] — 2026-08-11

### Added
- **Focused diagram modes** — Added opt-in `architecture`, `flowchart`, `tree`, `state`, and `sequence` layouts with cycle-safe state placement, tree buses, sequence lifelines, activation spans, and self-loop routing.
- **Editorial scene system** — Added the `editorial` theme, semantic visual primitives, structural edge selectors, annotations, group zones, shape-aware nodes, and a read-only icon registry.
- **Nebula constellation mode** — Added an opt-in `nebula` theme and `constellation` layout with focal-node halos, orbit rings, deterministic stars, and radial signal examples.

### Changed
- **Renderer composition** — Structural and animated edges now remain addressable during playback; fan-out routing uses distinct attachment lanes and emphasis cues resolve `$edges`.
- **Documentation surfaces** — Updated the homepage, playground registry, agent prompts, package READMEs, tutorials, guides, and related articles with the new themes and focused modes.

### Removed
- **Repository cleanup** — Removed unused internal design reference material from `docs/`.

## [0.8.11] — 2026-08-09

### Changed
- **Homepage crawl paths** — Added curated featured article links and matching JSON-LD so search crawlers can reach the strongest diagram-as-code guides directly from the homepage.
- **Privacy disclosure accuracy** — Updated the privacy policy to disclose cookie-free Cloudflare Web Analytics metrics and refreshed the privacy metadata.

### Fixed
- **Canonical privacy URL** — Normalized the homepage footer privacy link to `/privacy/` to avoid sending crawlers through the non-canonical redirect.
- **Unused third-party script** — Removed the unused Iconify CDN script and obsolete runtime scan hook from the website shell.

## [0.8.10] — 2026-08-09

### Added
- **AI documentation discovery** — Publish the canonical agent guide at `/AGENT.md`, a crawlable `/agent/` mirror, and generated `/llms.txt` plus `/llms-full.txt` endpoints from `docs/AGENT.md` so ChatGPT, Gemini, crawlers, and coding agents can find the latest MarkdyScript syntax without duplicate manual docs. Website, README, package docs, and the CLI `docs`/`ai` output now point AI tools at these hosted canonical URLs.
- **Diagram-native roadmap article** — Added a “Why Markdy focuses on animated architecture diagrams” article that explains the shift from general animation syntax toward semantic system diagrams, using developer feedback as the product narrative without amplifying the original discussion thread.

### Changed
- **Single-source AI prompts** — The generated `prompts/system-prompt.*` now direct agents to the canonical hosted guide first, keeping every AI surface pointed at one source of truth.
- **Diagram-native public positioning** — Refreshed homepage, docs, article, package, prompt, and marketing copy around Markdy’s diagram-native path (`scene`, semantic nodes, groups, beats, flows, and cues), and reshaped `/llms.txt` into a concise LLM-friendly index with canonical links and descriptions.

### Fixed
- **`regen` no longer clobbers `docs/SYNTAX.md`** — `scripts/regenerate-all.ts` previously overwrote the hand-maintained syntax reference with a stale stub; it now only regenerates the vocabulary-derived system prompts.

## [0.8.9] — 2026-08-09

### Added
- **`var` named constants** — Top-level `var name = value` declarations (colors, durations, etc.) can be referenced with `$name` and are substituted deterministically at parse time, so AI-generated scenes that reach for color variables now work.
- **Multi-line group members** — `group name:` can list members on indented lines in addition to the inline `group name: A B C` form.
- **Natural cue synonyms** — `pulse`, `highlight`, and `emphasize` are accepted and map to `focus`/`glow`, so common AI emphasis verbs produce valid scenes.

### Fixed
- **Flow labels with arrows** — Flow labels containing `->`, `<-`, `~>`, or `--` (for example `"STORE key -> value"`) no longer break the flow-chain parser; operators inside quoted labels are ignored when splitting.
- **Hash comments vs hex colors** — `#` only starts a comment in the conventional `# text` form, so bare hex values like `var c = #3b82f6` are no longer mistaken for comments.
- **Clearer AI-syntax errors** — `camera ...` statements and unknown cues now report actionable messages (pointing to `frame` and the valid cue list), and beat names may include digits/dots so timestamp-style names parse.

## [0.8.8] — 2026-08-09

### Changed
- **Concise AI example prompt** — Tightened the homepage AI example prompt into a single natural-language request that still guides assistants to a complete, correct Markdy scene.

### Fixed
- **Unsupported AI syntax diagnostics** — Non-Markdy drawing, timeline, and imperative camera output now fails with actionable guidance instead of misleading node-kind errors, and the agent guide stays positive-only so prompts do not seed unsupported syntax.

## [0.8.7] — 2026-08-09

### Changed
- **Human-first AI prompt examples** — Simplified public AI prompt examples so users describe the diagram idea in natural language while the agent guide handles Markdy-specific syntax choices.

### Fixed
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
