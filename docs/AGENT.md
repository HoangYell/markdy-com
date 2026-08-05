# MarkdyScript — AI Agent Reference

MarkdyScript 0.8 is **diagram-native**: you declare nodes, groups, and beats, and the engine handles layout, edge routing, timing, and rendering. This is the complete grammar and pattern reference for generating scenes.

## Rules

- Use `scene`, node declarations, `group`, `beat`, flow operators, and optionally `style`, `pattern`/`use`.
- Do **not** use the removed pre-0.8 syntax: `actor`, `@time:` events, `def`, `seq`, `preset`, `figure()`, `caption()`, `import`, `asset`, or pixel coordinates (`at (x, y)`).
- Prefer concise beats over manual positioning — layout is automatic.
- Default theme is `paper`; default layout direction is `LR`.
- Keep flow labels short (≤ ~28 chars) so they stay readable.

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

## Grammar

### `scene` — configuration (first line)

```markdy
scene "Title" theme=paper width=1280 height=720 fps=60 duration=8
```

| Property | Default | Description |
|---|---|---|
| title (bare string) | — | Optional scene title, shown top-left |
| `theme` | `paper` | Semantic palette: `paper` (light), `midnight` (dark), `blueprint`, or `graphite` |
| `width` / `height` | `1280` / `720` | Canvas size in px |
| `fps` | `60` | Frame rate hint |
| `duration` | auto | Force total seconds (otherwise derived from cues) |

### `layout` — auto-layout direction

```markdy
layout LR   # LR (default), RL, TB, BT
```

### Node declaration

```markdy
<kind> <Id> ["Label"] [style=name]
```

- `kind` sets the node's semantic role/color (see Node kinds).
- `Id` is a unique identifier used in flows, groups, and cues.
- `"Label"` is optional; it defaults to a humanized form of the id.

```markdy
service API "Checkout API"
database DB
queue Events "order.events"
```

### `group` — name a set of nodes

```markdy
group storage: DB Redis
group storage "Storage tier": DB Redis   # optional label
```

Target a group anywhere a node id is accepted (`show storage`, `glow storage`).

### `style` — reusable node styling

```markdy
style hot = fill=#f59e0b
database Primary "Primary DB" style=hot
```

### `beat` — a named block of cues

Cues inside a beat are scheduled in order. Beats run one after another.

```markdy
beat checkout:
  show $nodes stagger=80ms
  Client -> API "POST /order" -> DB "persist"
  glow API color=#22c55e & focus DB zoom=1.1
```

### Flow operators

Connect nodes with directed edges. Chain multiple hops on one line and add a `"label"` after any target.

| Operator | Edge kind | Rendered as |
|---|---|---|
| `->` | request | solid directed arrow |
| `<-` | response | dashed arrow, drawn back toward the caller |
| `~>` | event | dotted async/publish arrow |
| `--` | dependency | thin structural link |

```markdy
Web -> API "POST /checkout" -> DB "persist"
API ~> Queue "order.created"
Web <- API "201 Created"
```

Flows may appear inside a `beat` (animated) or at the top level as `edge id: A -> B "label"` (static declaration).

### Cues

Cues live inside a beat. Put `&` between two cues to run them in parallel.

| Cue | Parameters | Description |
|---|---|---|
| `show` | `stagger`, `dur` | Reveal nodes or a group |
| `hide` | `dur` | Fade nodes out |
| `glow` | `color`, `strength`, `dur` | Colored emphasis glow |
| `focus` | `zoom`, `dur` | Pulse-scale a node to draw attention |
| `use` | pattern args | Expand a `pattern` |

Selectors: `$nodes` targets every node; a group name targets its members.

### `pattern` / `use` — reusable flows

```markdy
pattern lookup(client, store):
  $client -> $store "lookup"
  $client <- $store "result"

beat main:
  use lookup(API, DB)
```

`$param` placeholders are substituted with the positional (or named) arguments passed to `use`.

## Node kinds

Every kind maps to a semantic role that determines its color.

- **client**: `client`, `user`, `browser`, `web`, `mobile`, `desktop`, `frontend`, `app`, `page`, `view`, `component`, `store`
- **compute**: `service`, `api`, `microservice`, `backend`, `server`, `worker`, `job`, `scheduler`, `cron`, `batch`, `function`, `lambda`, `edge`, `controller`, `handler`, `repository`, `runtime`, `process`
- **code**: `module`, `package`, `library`, `sdk`, `cli`, `class`, `interface`, `method`, `object`, `enum`, `type`
- **data**: `db`, `database`, `sql`, `nosql`, `table`, `index`, `warehouse`, `lake`, `object_store`, `bucket`, `blob`, `volume`, `disk`, `search`, `cache`
- **messaging**: `queue`, `topic`, `stream`, `event`, `event_bus`, `bus`, `broker`, `pubsub`, `kafka`, `producer`, `consumer`, `dead_letter`, `dlq`, `webhook`
- **network**: `cloud`, `region`, `vpc`, `subnet`, `network`, `internet`, `dns`, `cdn`, `proxy`, `gateway`, `api_gateway`, `load_balancer`, `reverse_proxy`, `router`, `switch`, `nat`, `firewall`, `waf`, `vpn`, `bastion`
- **platform**: `container`, `cluster`, `pod`, `node`, `deployment`, `replicaset`, `statefulset`, `daemonset`, `namespace`, `ingress`, `service_mesh`, `sidecar`, `image`, `registry`, `docker`, `compose`, `helm`, `chart`, `configmap`, `pvc`
- **security**: `auth`, `identity`, `oauth`, `oidc`, `jwt`, `session`, `policy`, `role`, `permission`, `vault`, `secret`, `key`, `certificate`
- **delivery**: `repo`, `branch`, `commit`, `pipeline`, `workflow`, `runner`, `build`, `test`, `artifact`, `deploy`, `release`, `environment`, `preview`
- **observability**: `monitor`, `metrics`, `logs`, `trace`, `alert`, `dashboard`, `probe`, `slo`
- **flow**: `start`, `end`, `state`, `decision`, `condition`, `step`, `loop`, `sequence`, `participant`
- **distributed**: `replica`, `shard`, `leader`, `follower`, `quorum`, `consensus`, `lock`

Aliases: `db`→`database`, `api`→`service`, `gateway`→`api_gateway`, `mq`→`queue`, `k8s`→`cluster`, `lb`→`load_balancer`.

## Ordering rules

1. `scene` must be the first statement.
2. Declare nodes (and `style`/`group`/`pattern`) before referencing them in beats.
3. Flow cues and `show`/`hide`/`glow`/`focus` must be inside a `beat` block.
4. A node id used in a flow must be declared, or the edge is skipped.

## Generation patterns

### Architecture diagram (recommended default)

```markdy
scene "URL Shortener" theme=paper
layout LR

user Visitor
browser Browser
gateway Gateway "API Gateway"
service Shortener "URL Shortener"
cache Redis "Hot URL Cache"
database UrlDB "URL Mapping DB"

group storage: Redis UrlDB

beat layout:
  show $nodes stagger=60ms

beat create:
  Browser -> Gateway "POST /shorten" -> Shortener
  Shortener -> UrlDB "store slug" & Shortener ~> Redis "warm cache"
  Browser <- Shortener "short.ly/a7"

beat redirect:
  Visitor -> Browser "open link" -> Gateway "GET /a7" -> Shortener
  Shortener -> Redis "cache lookup"
  Browser <- Shortener "301 redirect"

beat finish:
  glow storage color=#22c55e
```

### Sequence / request lifecycle

```markdy
scene "Auth Flow" theme=paper
layout LR

browser Client
service API
auth OIDC "OIDC Provider"

beat main:
  show $nodes stagger=80ms
  Client -> API "request" -> OIDC "verify token"
  API <- OIDC "claims"
  Client <- API "session"
```

### Reusable pattern

```markdy
scene "Replication" theme=paper
layout TB

database Primary "Primary"
database Replica "Replica"

pattern replicate(leader, follower):
  $leader -> $follower "stream WAL"
  $leader <- $follower "ack"

beat main:
  show $nodes
  use replicate(Primary, Replica)
```

## Common mistakes to avoid

- ❌ `actor x = box() at (10, 20)` — no `actor`, no coordinates. ✅ `service X "Label"`.
- ❌ `@0.5: A.request(to=B)` — no `@time:` events. ✅ put `A -> B "label"` inside a `beat`.
- ❌ `caption("...")`, `figure(...)`, `preset ...`, `def`, `seq`, `import`, `asset` — all removed.
- ❌ Flow at top level. ✅ Flows/cues belong inside a `beat` (or use `edge id: A -> B`).
- ❌ Referencing an undeclared node id in a flow — declare the node first.

## Validation checklist

- [ ] First line is `scene ...`.
- [ ] Every node used in a flow/cue is declared.
- [ ] Flow operators are one of `->`, `<-`, `~>`, `--`.
- [ ] Cues and flows are inside `beat` blocks.
- [ ] Theme is `paper`, `midnight`, `blueprint`, or `graphite`; layout is `LR`/`RL`/`TB`/`BT`.

## Integration code

### Browser (Vanilla)

```typescript
import { createPlayer } from "@markdy/renderer-dom";

const player = createPlayer({
  container: document.getElementById("scene")!,
  code: generatedMarkdyScript,
  autoplay: true,
  loop: true,         // loop when the animation ends (default: true)
  copyright: true,    // "Powered by Markdy" badge (default: true)
  progressBar: true,  // rainbow border progress indicator (default: true)
  onWarning: (w) => console.warn(`${w.message} (line ${w.line})`),
});
```

### CLI (validation / formatting / preview)

```sh
pnpm add -D @markdy/cli

markdy lint scene.markdy
markdy fmt scene.markdy --write
markdy render scene.markdy --out dist/scene.html
markdy check-all examples
```

- `markdy` with no args opens a local playground.
- `markdy explain scene.markdy --json` prints the parsed AST for tooling/debugging.

### Astro component

```astro
---
import { Markdy } from "@markdy/astro";
---
<Markdy code={generatedMarkdyScript} width={800} height={400} bg="#07111f" autoplay />
```

### Parse only (validation)

```typescript
import { parse, compile, ParseError } from "@markdy/core";
import type { DiagramAST } from "@markdy/core";

try {
  const ast: DiagramAST = parse(generatedMarkdyScript);
  for (const d of ast.diagnostics) {
    if (d.severity === "warning") console.warn(`${d.message} (line ${d.line})`);
  }
  const plan = compile(ast); // positioned nodes, routed edges, timed cues
} catch (e) {
  if (e instanceof ParseError) {
    console.error(`Line ${e.line}: ${e.message}`);
  }
}
```

### Language server

```sh
npx @markdy/language-server
```

Runs on stdio as an LSP server, providing parser diagnostics, node-aware completions, hover docs, and document symbols for Markdy editors/IDE integrations.
