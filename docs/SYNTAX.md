# MarkdyScript Syntax Reference

> ### SPECIFICATION METADATA
> - **Status**: Active & Canonical
> - **Current Version**: v1.0.10
> - **Specification Version**: 1.0.x
> - **Last Updated**: 2026-08-18
> - **Documentation Hub**: <https://markdy.com/docs/>
> - **AI Agent Guide**: <https://markdy.com/AGENT.md>

## MarkdyScript 0.8 — Diagram-Native Grammar

MarkdyScript is diagram-native. Declare semantic nodes, groups, beats, flow operators, and cues — the engine handles layout, routing, timing, and rendering.

### Scene & Directives

```markdy
controls true
interactive true
progressColor "#3b82f6"
loop false

scene theme=paper
layout LR
```

Canonical scenes put `layout LR|RL|TB|BT` on its own line. For AI-generated compatibility, the parser also accepts `layout LR` or `layout=LR` on the `scene` line.

You can declare diagram runtime and presentation settings directly at the top of the file as standalone directives or inline on the `scene` line:

| Top-Level Directive | `scene` Prop | Description |
|---|---|---|
| `controls [true\|false\|on\|off]` | `controls=true` | Mount playback, speed, and reset view buttons in footer |
| `interactive [true\|false\|on\|off]` | `interactive=true` | Enable wheel zoom and drag pan |
| `progressColor <color>` | `progressColor="#3b82f6"` | Custom progress bar color or gradient (e.g. `progressColor="#ec4899, #8b5cf6"`) |
| `speed <number>` | `playbackRate=1.5` | Timeline speed multiplier |
| `autoplay [true\|false\|on\|off]` | `autoplay=true` | Start playback automatically on load |
| `loop [true\|false\|on\|off]` | `loop=false` | Loop timeline playback when reaching the end |
| `copyright [true\|false\|on\|off]` | `copyright=false` | Show/hide "Powered by Markdy" badge |

Directives support space, colon (`controls: true`), and equals (`controls = true`) syntax. Directives defined in the script allow `<Markdy code={code} />` embeds to be completely self-contained without needing wrapper props.

### Nodes

```markdy
browser Browser
service API "API Gateway"
database UrlDB "URL Store"
```

Supported node kinds include: service, api, microservice, backend, server, worker, job, scheduler, cron, batch, function, lambda, and more.

### Groups

```markdy
group storage: Redis UrlDB
```

### Beats and flows

```markdy
beat create "Create a short URL":
  show $nodes stagger=60ms
  frame app zoom=1.15 dur=600ms
  Browser -> API "POST /shorten" -> Shortener
  Shortener ~> Redis "warm cache"
  Browser <- Shortener "short.ly/a7"
```

The optional beat label is rendered as a short caption during that beat.

Canonical beat and pattern blocks end with `:` and use indentation. The parser also accepts `{ ... }` block delimiters and `#` comments because LLMs often emit that style, but generated documentation should prefer the colon form above.

When a host strips indentation (common with MDX/JSX template literals), the parser recovers colon bodies by reading until the next top-level statement. Prefer keeping real indentation or loading MarkdyScript from a raw `.markdy` file when you control the embed path; use brace blocks only when a host cannot preserve indentation.

Flow operators:
- `->` — request
- `<-` — response
- `~>` — event
- `--` — dependency

### Patterns

```markdy
pattern lookup(client, store):
  $client -> $store "lookup"
  $client <- $store "result"

beat main:
  use lookup(API, DB)
```

### Themes

- `paper` — clean light documentation canvas (default)
- `editorial` — flat editorial paper with serif titles and semantic ink/accent roles
- `terminal` — dark CLI/TUI canvas with monospace font and neon glow accents
- `sketchy` — organic hand-drawn whiteboard theme with displacement filter
- `nebula` — deep-space canvas with orbit rings, signal halos, and constellation decoration
- `midnight` — dark developer canvas
- `blueprint` — technical blueprint CAD canvas
- `graphite` — restrained dark minimal canvas

<p align="center">
  <img src="images/markdy-themes-showcase.webp" alt="Markdy Semantic Themes Overview" width="800" />
</p>

### Diagram types (opt-in)

Add `type=` on the scene line to tune layout and node shapes without changing the core grammar:

<p align="center">
  <img src="images/markdy-layouts-themes.webp" alt="Markdy Layout Topologies and Themes" width="800" />
</p>

| Type | Layout behavior |
|---|---|
| `architecture` | Default ranked graph (LR/TB from `layout`) |
| `flowchart` | Top-down process/decision shapes |
| `tree` | Parent/child tiers with shared sibling buses |
| `state` | Cycle-safe state placement and transition routing |
| `sequence` | Participant columns, lifelines, ordered messages, and activations |
| `timeline` | Horizontal hairline baseline with alternating above/below milestone placement |
| `gantt` | Phase-based horizontal bar stacking with `phase=` and `span=` properties |
| `venn` | 2–3 circle concept intersection with automatic proximity scaling |
| `layers` | Full-width horizontal stacked abstraction bands (OSI, CSS cascade, memory models) |
| `nested` | Concentric rounded boundaries with stepped insets for defense-in-depth and security scopes |
| `radar` | Multi-axis polygon comparison chart with series color palette |
| `medallion` | Multi-tier Bronze → Silver → Gold data lakehouse stages |
| `flywheel` / `loop` | Circular closed-loop engine with tangential flow paths |
| `quadrant` | 2×2 decision and strategic positioning matrix |
| `swimlane` | Multi-tier cross-functional horizontal lane partitions |
| `pyramid` | Hierarchical tier pyramid with step-proportional width scaling |
| `constellation` | Radial focal-node layout with deterministic orbit decoration |

```markdy
scene theme=editorial type=timeline
service Alpha "Alpha v0.1"
service Beta "Beta v0.5" focal=true
service GA "GA v1.0"
```

### Visual primitives & semantic node kinds

Optional visual primitives parse as nodes and reuse semantic styling. `stat`/`metric` accept `value=...`:

- **Containers & Surfaces**: `surface`/`panel`, `terminal`, `matrix`/`grid`, `track`/`lane`
- **Data & Storage**: `database`, `storage`, `bucket`, `cache`, `queue`
- **Markers & Tokens**: `dot`/`marker`, `chips`/`token_strip`, `glyph`/`glyph_card`
- **Semantic Roles**: `external` (dashed outside-scope boundary), `optional` (faded pending feature)
- **Metrics**: `stat`/`metric` (`value="142 ms"`)

```markdy
stat P95Latency "P95 latency" value="142 ms"
matrix Regions "Deployment matrix"
storage S3DataLake "Object Storage"
external CivilRegistry "External CRVS API"
```

### Structural edges

Declare persistent topology outside beats; renderer draws it behind animated flow edges. `$edges` can target persistent or animated edges for `show`, `hide`, `glow`, `focus`, and `frame`:

```markdy
edge backbone: Client -> Gateway -> API
```

### Editorial Annotations

Up to two editorial callouts anchor to a node with optional color `intent`:

```markdy
annotation "Hot path bottleneck" target=Redis position=top-right intent=accent
annotation "Offline sync mode" target=LocalDb position=bottom-left intent=muted
```

Supported intents: `neutral` (default ink), `accent` (coral/accent leader), `muted` (subtle secondary tone).

### Cues

| Cue | Description | Parameters |
|---|---|---|
| `show` | Reveal nodes, groups, or edges | `stagger`, `dur` |
| `hide` | Fade nodes or edges out | `dur` |
| `glow` | Emphasize with a colored glow | `color`, `strength`, `dur` |
| `focus` | Pulse-scale nodes to draw attention | `zoom`, `dur` |
| `frame` | Move the scene camera to a node or group | `zoom`, `dur` |
| `use` | Expand a pattern | pattern args |

Selectors: `$nodes`, `$edges`, `$groupName`, and declared `group` ids.

`frame $nodes` returns the camera to the full diagram — a good final cue for looping scenes.

For parallel cues, prefer `cue A & cue B` on one line. A leading `& cue B` continuation on the next line is accepted for AI-generated compatibility.
