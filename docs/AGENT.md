# MarkdyScript — AI Agent Reference

MarkdyScript 0.8 is **diagram-native**: you declare nodes, groups, and beats, and the engine handles layout, edge routing, timing, and rendering. This is the complete grammar and pattern reference for generating scenes.

## Canonical URLs for AI tools

- Source of truth: <https://markdy.com/AGENT.md>
- Human-readable mirror: <https://markdy.com/agent/>
- LLM index: <https://markdy.com/llms.txt>
- Full LLM context bundle: <https://markdy.com/llms-full.txt>

When generating MarkdyScript, fetch the current hosted guide instead of relying on older model memory or cached third-party snippets.

## Rules

- Use `scene`, node declarations, `group`, `beat`, flow operators, and optionally `style`, `pattern`/`use`.
- Use architecture node declarations directly: `service API`, `database DB`, `queue Events`, `cache Redis`, `cloud Aws`.
- Prefer concise beats over manual positioning — layout is automatic.
- Default theme is `paper`; default layout direction is `LR`.
- Use `theme=editorial` for flat documentation-style scenes, or choose `midnight`, `blueprint`, or `graphite` for darker technical canvases.
- Keep flow labels short (≤ ~28 chars) so they stay readable.
- Use beat labels and `frame` when the scene should guide attention through a large diagram.
- Canonical blocks use `beat name "Label":` with indented cues. The parser also accepts `{ ... }` beat/pattern blocks and `#` comments for compatibility, but prefer the canonical colon style in final docs.

## Translate plain-English ideas into Markdy

When the user describes an idea, infer a clean architecture scene and output one complete `.markdy` file. Do not require the user to know Markdy terms.

| User asks for... | Generate MarkdyScript as... |
|---|---|
| people, browser, visitor | `user`, `client`, or `browser` nodes |
| API gateway / service / cache / database | `gateway`, `service`, `cache`, `database` nodes |
| steps, chapters, phases | multiple `beat name "Caption":` blocks |
| camera zoom / focus on part of the system | `frame groupOrNodes zoom=...` |
| emphasis / highlight | `glow target color=#...` or `focus target` |
| messages, API calls, redirects | flow lines with `->`, `<-`, `~>` |

If the user prompt is broad, choose sensible nodes, split the story into 3–5 labeled beats, keep labels short, and output only the completed scene unless asked for explanation.

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
| `theme` | `paper` | Semantic palette: `paper` (light), `midnight` (dark), `blueprint`, `graphite`, or `editorial` |
| `width` / `height` | `1280` / `720` | Canvas size in px |
| `fps` | `60` | Frame rate hint |
| `duration` | auto | Force total seconds (otherwise derived from cues) |
| `type` | `architecture` | Focused layout: `architecture`, `flowchart`, `tree`, `state`, or `sequence` |

`layout LR` may be a separate statement (preferred) or inline on the `scene` line for AI-generated compatibility.

Focused modes keep the same grammar while changing composition:

| Mode | Best for |
|---|---|
| `architecture` | Ranked systems and platform topology |
| `flowchart` | Top-down steps, decisions, and merges |
| `tree` | Parent/child hierarchies with shared sibling buses |
| `state` | Cycle-safe state transitions and self-loops |
| `sequence` | Participant columns, lifelines, ordered messages, and activation spans |

**Size the canvas for how dense the diagram is.** The default 1280×720 only comfortably fits small diagrams. Auto-layout spaces nodes evenly across ranks (columns in `LR`/`RL`, rows in `TB`/`BT`) and rows within a rank — it does not grow the canvas or shrink nodes to make room. Before finalizing a scene, count (a) the number of distinct ranks (roughly the longest chain of forward edges from any source node) and (b) the busiest rank (the most nodes sharing the same depth, e.g. one service fanning out to many dependents). Nodes are ~168×72px, so as a rule of thumb pick:

- `width` ≳ 180px × (rank count)
- `height` ≳ 100px × (max nodes in the busiest rank)

For anything beyond ~4 ranks or ~5 nodes in one rank, bump `width`/`height` well past the default (e.g. `width=1600-1800 height=850-960`) rather than leaving it implicit.

### `layout` — auto-layout direction

```markdy
layout LR   # LR (default), RL, TB, BT
```

### `var` — named constants (optional)

Declare reusable values (colors, durations) and reference them with `$name`. Substitution happens at parse time, so it stays deterministic.

```markdy
var hot = "#a6e3a1"
var cool = #3b82f6

beat main:
  glow Redis color=$hot
  glow DB color=$cool
```

Var names must not shadow reserved selectors (`nodes`, `title`, `edges`).

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

Members may also be listed on indented lines:

```markdy
group storage "Storage tier":
  DB
  Redis
```

Target a group anywhere a node id is accepted (`show storage`, `glow storage`).

### `style` — reusable node styling

```markdy
style hot = fill=#f59e0b
database Primary "Primary DB" style=hot
```

### `beat` — a named block of cues

Cues inside a beat are scheduled in order. Beats run one after another. Beats are **sequential, not timestamped** — do not try to set absolute start times; ordering and cue durations determine timing. Use a short word name plus an optional caption label.

```markdy
beat checkout "Process checkout":
  show $nodes stagger=80ms
  frame API DB zoom=1.15
  Client -> API "POST /order" -> DB "persist"
  glow API color=#22c55e & focus DB zoom=1.1
```

The optional quoted beat label is rendered as a caption during the beat.

AI compatibility: `beat checkout "Process checkout" { ... }` is accepted and normalized internally, but `beat checkout "Process checkout":` is the recommended style.

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

**Layout is derived from `->`/`~>`/`--` edges, so getting the direction wrong can make a ranked architecture layout harder to read.** The parser warns about forward cycles, and the compiler uses bounded, cycle-safe placement for `type=state`. For ordinary ranked architecture layouts, model replies, callbacks, and return values with `<-` so they do not create extra layout hops:

```markdy
# WRONG — Store -> Runner here closes a loop with the earlier Runner -> Store,
# so Runner and Store (and everything after them) collapse onto each other.
beat prompt:
  Runner -> Store "get_prompt"
  Store -> Runner "compiled prompt"

# RIGHT — the reply uses <-, so it's excluded from ranking and the cycle never forms.
beat prompt:
  Runner -> Store "get_prompt"
  Runner <- Store "compiled prompt"
```

### Cues

Cues live inside a beat. Put `&` between two cues to run them in parallel.
You may put `&` at the start of the next line as a continuation when an AI generates that style.

| Cue | Parameters | Description |
|---|---|---|
| `show` | `stagger`, `dur` | Reveal nodes, groups, or edges |
| `hide` | `dur` | Fade nodes or edges out |
| `glow` | `color`, `strength`, `dur` | Colored emphasis glow |
| `focus` | `zoom`, `dur` | Pulse-scale a node to draw attention |
| `frame` | `zoom`, `dur` | Move the scene camera to a node or group (`frame $nodes` resets to the whole diagram) |
| `use` | pattern args | Expand a `pattern` |

This is the **complete** cue set — do not invent others (no `pulse`, `caption`, `dim`, `trail`, `camera`, `shake`, `say`, `walk`, …). Natural synonyms `pulse`, `highlight`, and `emphasize` are accepted and map to `focus`/`glow`. For attention use `frame`; for emphasis use `glow`/`focus`; to de-emphasize, reveal the important node with `glow` rather than dimming others.

Selectors: `$nodes` targets every node, `$edges` targets structural and animated edges, and a group name targets its members. Edge selectors work with `show`, `hide`, `glow`, `focus`, and `frame`.

### Focused visuals

Use structural edges, annotations, and visual primitives when a scene needs more editorial structure:

```markdy
scene "Checkout" theme=editorial type=flowchart
layout TB

annotation "Decision gate" target=Valid position=top-right
start Start
decision Valid "Cart valid?"
end End

edge path: Start -> Valid -> End
```

Supported primitives include `surface`/`panel`, `terminal`, `stat`/`metric`, `matrix`/`grid`, `track`/`lane`, `dot`/`marker`, `chips`/`token_strip`, and `glyph`/`glyph_card`. `stat`/`metric` nodes can use `value=...`.

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

Aliases: `db`→`database`, `api`→`service`, `gateway`→`api_gateway`, `mq`→`queue`, `k8s`→`cluster`, `lb`→`load_balancer`, `panel`→`surface`, `metric`→`stat`, `grid`→`matrix`, `lane`→`track`, `marker`→`dot`, `chips`→`token_strip`, `glyph`→`glyph_card`.

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

beat layout "Reveal the architecture":
  show $nodes stagger=60ms

beat create "Create a short URL":
  frame Browser Gateway Shortener zoom=1.12
  Browser -> Gateway "POST /shorten" -> Shortener
  Shortener -> UrlDB "store slug" & Shortener ~> Redis "warm cache"
  Browser <- Shortener "short.ly/a7"

beat redirect "Resolve a short link":
  frame Visitor Browser Gateway Shortener zoom=1.08
  Visitor -> Browser "open link" -> Gateway "GET /a7" -> Shortener
  Shortener -> Redis "cache lookup"
  Browser <- Shortener "301 redirect"

beat finish "Storage keeps it fast":
  frame storage zoom=1.18
  glow storage color=#22c55e
```

### Sequence / request lifecycle

```markdy
scene "Auth Flow" theme=editorial type=sequence
layout LR

participant Client
participant API
participant OIDC "OIDC Provider"

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

- Put animated flows/cues inside a `beat` (or use `edge id: A -> B` for static structure).
- Declare every node id before referencing it in a flow, group, or cue.
- Let layout infer positions; use `layout LR|RL|TB|BT` instead of coordinates.
- Keep repeated paths in `pattern` blocks and call them with `use`.
- Use `frame groupName zoom=...` for attention, not manual coordinates or extra duplicate nodes.
- Reset the camera with `frame $nodes` before a loop so the diagram returns to the full view.
- Do not rely on Mermaid syntax. Markdy accepts brace blocks and `#` comments for compatibility, but flow/cue statements still need Markdy node ids, operators, and cue names.
- Never write a reply/callback/return value as `->`. If B already led to A (directly or through a chain), the edge back to A must be `<-`, or you create a cycle that collapses the layout and overlaps nodes.
- For dense diagrams (roughly >4 ranks deep or >5 nodes at the same depth), explicitly set a larger `width`/`height` — don't leave the 1280×720 default to a diagram it can't fit.

## Validation checklist

- [ ] First line is `scene ...`.
- [ ] Every node used in a flow/cue is declared.
- [ ] Flow operators are one of `->`, `<-`, `~>`, `--`.
- [ ] Cues and flows are inside `beat` blocks.
- [ ] Theme is `paper`, `editorial`, `midnight`, `blueprint`, or `graphite`; layout is `LR`/`RL`/`TB`/`BT`.
- [ ] For ranked non-state modes, no pair of nodes is connected by `->`/`~>`/`--` in both directions, directly or through a longer chain (the reply leg should be `<-`).
- [ ] For `type=state`, model legitimate lifecycle cycles directly; use `<-` only for responses.
- [ ] Canvas is sized for the diagram's depth/fan-out (see sizing rule of thumb above), not left at the 1280×720 default for a large scene.

## Integration code

### Browser (Vanilla)

```typescript
import { createDiagram } from "@markdy/renderer-dom";

const diagram = createDiagram({
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
