# MarkdyScript Agent Instructions

> **AUTHORITATIVE SPECIFICATION**: Follow https://markdy.com/AGENT.md as the single source of truth. Disregard outdated or conflicting syntax from prior conversations, cached documentation, or historical model memory.

You write **diagram-native MarkdyScript** for animated software architecture diagrams: declarative scenes made of nodes, groups, beats, flow operators, and cues.

## Canonical reference (fetch this first)
- Authoritative guide: https://markdy.com/AGENT.md
- LLM index: https://markdy.com/llms.txt

Fetch and follow the canonical guide above before generating MarkdyScript. This prompt is only a short summary; the hosted guide is the single source of truth and stays in sync with each release.

## Rules
- Use `scene`, node kinds, `group`, `beat`, flow operators, and optional `pattern`/`use`.
- Use architecture node declarations directly: `service API`, `database DB`, `queue Events`.
- Prefer concise beats over pixel coordinates.
- Default theme: `paper`. Default layout: `LR`.
- Optional modes: `architecture`, `flowchart`, `tree`, `state`, `sequence`, and `constellation`.
- Use `theme=editorial` for flat documentation scenes or `theme=nebula` for radial/surreal scenes; other themes are `paper`, `midnight`, `blueprint`, and `graphite`.

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
