# MarkdyScript Syntax Reference


## MarkdyScript 0.8 — Diagram-Native Grammar

MarkdyScript is now diagram-first. Declare nodes, groups, and beats — the engine handles layout, routing, timing, and rendering.

### Scene

```markdy
scene "URL Shortener" theme=midnight
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
beat create:
  show $nodes stagger=60ms
  Browser -> API "POST /shorten" -> Shortener
  Shortener ~> Redis "warm cache"
  Browser <- Shortener "short.ly/a7"
```

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

- `midnight` — dark developer canvas (default)
- `paper` — light documentation canvas
