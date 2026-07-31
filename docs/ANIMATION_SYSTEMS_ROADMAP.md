# Markdy Architecture Animation Layer

Markdy is moving toward "Mermaid for animated diagrams": terse architecture syntax, timeline-driven motion, and browser-native rendering that stays inspectable and cheap.

## Implemented foundation

### Architecture nodes

DSL syntax:

```markdy
client Browser
service Gateway
database PostgreSQL at (680, 140)
queue Kafka
cache Redis "Session Cache"

@0.0: Browser.request(to=Gateway, label="GET /v1", dur=0.7)
@0.8: Gateway.request(to=PostgreSQL, label=query, dur=0.5)
@1.4: PostgreSQL.response(to=Gateway, label="rows", dur=0.5)
```

Parser changes:

- `service|database|db|queue|cache|api|user|client|cloud|region|container|microservice|cluster Name ["Label"] [at (x,y)]` parses as shorthand for an actor declaration.
- Missing positions receive deterministic grid auto-layout based on declaration order and scene width.
- The shorthand requires an actor pack that registers the target type, preserving core’s pack-based extensibility.

AST changes:

- No new AST node is required. Shorthand expands into existing `SceneAST.actors[name] = ActorDef` records.
- Compatibility tools that already consume actors/events keep working unchanged.

Renderer implementation:

- `@markdy/renderer-dom` renders expanded system node types with compact architecture-card styles.
- Flow verbs still use the existing SVG overlay and WAAPI dash/packet animations.

Backward compatibility:

- Existing `actor API = service("API") at (x,y)` syntax remains valid.
- Unknown shorthand types fail with a clear pack-registration error instead of silently creating unsupported actors.

### Premium universal effects

DSL syntax:

```markdy
@0.0: API.glow(color=#38bdf8, strength=24, dur=0.5)
@0.2: API.pulse(amount=1.08, dur=0.35)
@0.4: API.ripple(color=#22c55e, size=140, dur=0.5)
@0.8: packet.follow_path(path="M 0 0 C 120 -40 240 0", dur=0.9)
@1.8: API.spring(to=(360,210), stiffness=0.18, dur=0.7)
@2.4: title.line_reveal(from=left, dur=0.4)
```

Parser changes:

- Added `spring`, `follow_path`, `pulse`, `glow`, `ripple`, `blur`, `line_reveal`, `mask`, and `parallax` to the canonical universal action vocabulary.
- Parameters continue to use the existing named/positional parser, so no new expression grammar is needed.

AST changes:

- Effects are regular `TimelineEvent` entries. Params live in `TimelineEvent.params`.
- No renderer-specific AST coupling was introduced.

Renderer implementation:

- Effects compile to Web Animations API keyframes on transform, filter, box-shadow, clip-path, and CSS motion path properties.
- `ripple` creates a transient child element and pushes its WAAPI animation into the same scrubbed animation set.
- `spring` mutates running actor position so subsequent events start from the settled endpoint.

Backward compatibility:

- Older renderers that do not know a new action still no-op unknown handler names under Markdy’s must-ignore behavior.
- Authors can use `!glow(...)` or any must-understand action form to require support.

## Next design targets

### Timeline groups

DSL syntax:

```markdy
timeline {
  sequence {
    Browser.request(to=Gateway, label="POST /login", dur=0.7)
    wait 0.2
    Gateway.request(to=Auth, label=verify, dur=0.5)
  }
  parallel {
    Gateway.glow(color=#38bdf8, dur=0.5)
    Auth.pulse(dur=0.5)
  }
  repeat 2 {
    Queue.emit(to=Worker, label=job, dur=0.4)
  }
}
```

Parser changes:

- Add a timeline block parser that lowers `sequence`, `parallel`, `wait`, `repeat`, `loop`, `delay`, `label`, `seek`, and `reverse` into absolute event times.
- Keep the existing `@time:` syntax as the canonical low-level representation.

AST changes:

- Prefer lowering to `TimelineEvent[]` plus optional timeline metadata for labels and source maps.
- Add `TimelineLabel` metadata only when author labels are present.

Renderer implementation:

- Reuse the current sorted event compiler after timeline lowering.
- Add batch planning so same-time events can share delay/duration calculations.

Backward compatibility:

- Existing absolute and relative events remain valid.
- Timeline blocks become additive syntax, not a replacement.

### Packets and semantic flows

DSL syntax:

```markdy
packet Request {
  from Browser
  to API
  label "GET /users"
  duration 0.8
}
```

Parser changes:

- Add a block form that lowers to `from.request(to=..., label=..., dur=...)`.
- Support `response`, `event`, and custom packet styles as block keys.

AST changes:

- Initial implementation can lower to `TimelineEvent`.
- A later optimization pass may add packet metadata for preview tooling and source maps.

Renderer implementation:

- Reuse SVG flow edges for routing and packet markers.
- Cache routed paths between unchanged actor pairs for large diagrams.

Backward compatibility:

- Existing `request/response/emit` event syntax remains the stable primitive.

### Themes and reusable components

DSL syntax:

```markdy
theme dark

component Service(name) {
  service name
  $.glow(on=request)
}
```

Parser changes:

- Extend existing `def`, `seq`, `var`, `group`, and `import` foundations with higher-level component expansion.
- Keep all expansion deterministic and inspectable in the AST.

AST changes:

- Add theme metadata and component definitions for tooling.
- Lower rendered actors/events to existing maps and event arrays.

Renderer implementation:

- Apply themes through CSS custom properties on the scene root.
- Let node renderers read semantic actor types and theme tokens without JavaScript author code.

Backward compatibility:

- Current variables/templates/sequences remain valid.
- Themes should only change scenes that opt in.