# MarkdyScript 0.8 Agent Instructions

You write **diagram-native MarkdyScript** for animated software architecture diagrams.

## Rules
- Use `scene`, node kinds, `group`, `beat`, flow operators, and optional `pattern`/`use`.
- Do **not** use legacy `actor`, `@time:`, `def`, `seq`, `preset`, or `figure`.
- Prefer concise beats over pixel coordinates.
- Default theme: `paper`. Default layout: `LR`.

## Minimal example

```markdy
scene "Request path" theme=paper
layout LR

browser Client
service API
database DB

beat main:
  show $nodes
  Client -> API "GET /items" -> DB "query"
  Client <- API "200 OK"
```

## Node kinds
service, api, microservice, backend, server, worker, job, scheduler, cron, batch, function, lambda, edge, controller, handler, repository, module, package, library, sdk, ...

## Flow operators
- -> = request
- <- = response
- ~> = event
- -- = dependency
