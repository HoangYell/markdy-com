# MarkdyScript Syntax Reference


## MarkdyScript 0.8 — Diagram-Native Grammar

MarkdyScript is now diagram-first. Declare nodes, groups, and beats — the engine handles layout, routing, timing, and rendering.

### Scene

```markdy
scene "URL Shortener" theme=paper
layout LR
```

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

### Cues

| Cue | Description | Parameters |
|---|---|---|
| `show` | Reveal nodes or groups | `stagger`, `dur` |
| `hide` | Fade nodes out | `dur` |
| `glow` | Emphasize with a colored glow | `color`, `strength`, `dur` |
| `focus` | Pulse-scale nodes to draw attention | `zoom`, `dur` |
| `frame` | Move the scene camera to a node or group | `zoom`, `dur` |
| `use` | Expand a pattern | pattern args |

`frame $nodes` returns the camera to the full diagram — a good final cue for looping scenes.
