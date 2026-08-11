# MarkdyScript Syntax Reference


## MarkdyScript 0.8 — Diagram-Native Grammar

MarkdyScript is diagram-native. Declare semantic nodes, groups, beats, flow operators, and cues — the engine handles layout, routing, timing, and rendering.

### Scene

```markdy
scene "URL Shortener" theme=paper
layout LR
```

Canonical scenes put `layout LR|RL|TB|BT` on its own line. For AI-generated compatibility, the parser also accepts `layout LR` or `layout=LR` on the `scene` line.

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

- `paper` — light documentation canvas (default)
- `midnight` — dark developer canvas
- `blueprint` — technical blueprint canvas
- `graphite` — restrained dark graphite canvas
- `editorial` — flat editorial paper with serif titles and semantic ink/accent roles (opt-in for documentation-style diagrams)

### Diagram types (opt-in)

Add `type=` on the scene line to tune layout and node shapes without changing the core grammar:

| Type | Layout behavior |
|---|---|
| `architecture` | Default ranked graph (LR/TB from `layout`) |
| `flowchart` | Top-down process/decision shapes |
| `tree` | Parent/child tiers with shared sibling buses |
| `state` | Cycle-safe state placement and transition routing |
| `sequence` | Participant columns, lifelines, ordered messages, and activations |

```markdy
scene "Checkout" theme=editorial type=flowchart
layout TB
start Start
decision Valid "Valid cart?"
end End
```

### Visual primitives

Optional visual primitives parse as nodes and reuse semantic styling. `stat`/`metric` accept `value=...`:

`surface`/`panel`, `terminal`, `stat`/`metric`, `matrix`/`grid`, `track`/`lane`, `dot`/`marker`, `chips`/`token_strip`, `glyph`/`glyph_card`

```markdy
stat P95Latency "P95 latency" value="142 ms"
matrix Regions "Deployment matrix"
```

### Structural edges

Declare persistent topology outside beats; renderer draws it behind animated flow edges. `$edges` can target persistent or animated edges for `show`, `hide`, `glow`, `focus`, and `frame`:

```markdy
edge backbone: Client -> Gateway -> API
```

### Annotations

Up to two editorial callouts anchor to a node (default position `top-right`):

```markdy
annotation "Hot path" target=Redis position=top-right
```

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
