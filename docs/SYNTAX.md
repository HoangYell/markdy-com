# MarkdyScript Syntax Reference

MarkdyScript is a line-based, whitespace-tolerant DSL for describing 2-D animation scenes. One statement per line. Comments start with `#`. Blank lines are ignored.

File extension: `.markdy`  
Markdown code fence: ` ```markdy `

---

## Scene declaration

```markdy
scene [key=value ...]
```

Must appear at most once, before any other statements. All properties are optional.

| Property   | Type   | Default | Description                                       |
|------------|--------|---------|---------------------------------------------------|
| `width`    | number | `800`   | Canvas width in pixels                            |
| `height`   | number | `400`   | Canvas height in pixels                           |
| `fps`      | number | `30`    | Frames per second (informational, used by renderer) |
| `bg`       | string | `white` | Background colour — any CSS colour value          |
| `duration` | number | auto    | Scene length in seconds. Auto-computed from the last event end-time when omitted. |

```markdy
scene width=1024 height=576 fps=60 bg=#1a1a2e
```

---

## String literals and escaping

Markdy supports both double-quoted (`"..."`) and single-quoted (`'...'`) string literals.

- Use `\"` or `\'` to include quote characters inside strings.
- Use `\\` for a literal backslash.
- `\n`, `\r`, and `\t` are supported.
- `#` inside quoted strings is treated as text, not a comment.
- Commas inside quoted strings do not split argument lists.

---

## Asset declarations

```markdy
asset <name> = image("<path>")
asset <name> = icon("<icon-id>")
```

Assets are named references to external resources. The name is used later by actor and event statements.

| Type    | Value         | Description                                     |
|---------|---------------|-------------------------------------------------|
| `image` | URL or path   | Loaded as an `<img>` element by the renderer    |
| `icon`  | `set:name`    | Stored in `data-icon`; compatible with Iconify  |

```markdy
asset logo = image("/icon.svg")
asset packet = icon("lucide:send")
```

---

## Actor declarations

```markdy
actor <name> = <type>(<args>) at (<x>,<y>) [modifiers...]
```

Actors are the objects visible in the scene. They must be declared before any events that reference them.

### Actor types

| Type     | Args                           | Description                             |
|----------|--------------------------------|-----------------------------------------|
| `sprite` | asset name                     | Renders the named image or icon asset   |
| `text`   | `"quoted string"`              | Renders a text label                    |
| `box`    | *(none)*                       | Renders a 100×100 px solid grey box     |
| `figure` | `skinColor [, gender [, face]]` | Optional presenter or guide actor |

### The `figure` actor type

Figures are emoji-based presenter actors for scenes that need a neutral guide.

```markdy
actor guide = figure(#c68642, m, 🙂) at (300, 200)    # neutral presenter
actor host  = figure(#fad4c0, f, 🤔) at (500, 200)    # custom starting face
```

**Arguments** (positional, inside the parentheses):

| Position | Name | Default | Description |
|---|---|---|---|
| 1 | `skinColor` | `#ffdbac` | CSS colour for skin (neck, arm sticks) |
| 2 | `gender` | `m` | `m` = male (👕🤜👟), `f` = female (👗💅👠) |
| 3 | `face` | `😶` (m) / `🙂` (f) | Starting emoji expression |

**Named body parts** (used by `rotate_part` and `pose`):

| Part name | Data attribute | Description |
|---|---|---|
| `head` | `data-fig-head` | The emoji face span |
| `face` | `data-fig-face` | Same element (alias) |
| `body` | `data-fig-body` | Torso emoji (👕 or 👗) |
| `arm_left` | `data-fig-arm-l` | Left arm (pivot: shoulder) |
| `arm_right` | `data-fig-arm-r` | Right arm (pivot: shoulder) |
| `leg_left` | `data-fig-leg-l` | Left leg (pivot: hip) |
| `leg_right` | `data-fig-leg-r` | Right leg (pivot: hip) |

### Position

`at (x,y)` sets the initial translation. The origin `(0,0)` is the top-left of the scene. Coordinates are in pixels.

### Modifiers

Modifiers follow the `at (x,y)` clause as space-separated `key value` pairs. All are optional.

| Modifier  | Type   | Default | Description                      |
|-----------|--------|---------|----------------------------------|
| `scale`   | number | `1`     | Uniform scale factor             |
| `rotate`  | number | `0`     | Initial rotation in degrees      |
| `opacity` | number | `1`     | Initial opacity (0–1)            |
| `size`    | number | —       | Font size in px (text actors); icon size in px (icon sprites) |
| `z`       | number | —       | Z-index for layering control (higher = in front) |

```markdy
actor p     = sprite(pepe) at (100,250) scale 0.4
actor title = text("Ship it") at (320,80) size 48 opacity 0
actor box1  = box() at (50,50) rotate 45
actor hero  = figure(#c68642, m, 😎) at (200, 200) z 5
```

### Architecture node shorthand

When the systems actor pack is registered, common architecture nodes can be declared without the `actor ... = type(...)` ceremony:

```markdy
service API
database PostgreSQL at (620, 140)
queue Kafka
cache Redis "Session Cache"
client Browser at (120, 220)
cloud AWS
region USEast
container PodA
cluster Kubernetes
```

Shorthand declarations expand to ordinary actors in the AST. `service API` is equivalent to `actor API = service("API") at (...)`, with a deterministic auto-layout position when `at (x,y)` is omitted. `database`, `cache`, `cloud`, `region`, `container`, `microservice`, and `cluster` render as architecture diagram nodes and support system flow actions such as `request`, `response`, and `emit`.

The systems pack is intentionally broad enough for most software engineering diagrams. These aliases all render as generic technical nodes and support the same flow actions:

| Family | Node types |
| --- | --- |
| Compute/backend | `service`, `api`, `microservice`, `backend`, `server`, `worker`, `job`, `scheduler`, `cron`, `batch`, `function`, `lambda`, `edge`, `controller`, `handler`, `repository`, `runtime`, `process` |
| Frontend/client | `client`, `user`, `browser`, `web`, `mobile`, `desktop`, `frontend`, `app`, `page`, `view`, `component`, `store` |
| Data/storage | `db`, `database`, `sql`, `nosql`, `table`, `index`, `warehouse`, `lake`, `object_store`, `bucket`, `blob`, `volume`, `disk`, `search`, `cache` |
| Messaging/events | `queue`, `topic`, `stream`, `event`, `event_bus`, `bus`, `broker`, `pubsub`, `kafka`, `producer`, `consumer`, `dead_letter`, `dlq`, `webhook` |
| Network/cloud | `cloud`, `region`, `vpc`, `subnet`, `network`, `internet`, `dns`, `cdn`, `proxy`, `gateway`, `api_gateway`, `load_balancer`, `reverse_proxy`, `router`, `switch`, `nat`, `firewall`, `waf`, `vpn`, `bastion` |
| Platform/Kubernetes/Docker | `container`, `cluster`, `pod`, `node`, `deployment`, `replicaset`, `statefulset`, `daemonset`, `namespace`, `ingress`, `service_mesh`, `sidecar`, `image`, `registry`, `docker`, `compose`, `helm`, `chart`, `configmap`, `pvc` |
| Security/IAM | `auth`, `identity`, `oauth`, `oidc`, `jwt`, `session`, `policy`, `role`, `permission`, `vault`, `secret`, `key`, `certificate` |
| CI/CD | `repo`, `branch`, `commit`, `pipeline`, `workflow`, `runner`, `build`, `test`, `artifact`, `deploy`, `release`, `environment`, `preview` |
| Observability | `monitor`, `metrics`, `logs`, `trace`, `alert`, `dashboard`, `probe`, `slo` |
| Flow/state/sequence | `start`, `end`, `state`, `decision`, `condition`, `step`, `loop`, `sequence`, `participant` |
| Distributed systems | `replica`, `shard`, `leader`, `follower`, `quorum`, `consensus`, `lock` |
| Programming concepts | `class`, `interface`, `method`, `object`, `enum`, `type`, `module`, `package`, `library`, `sdk`, `cli` |

Example:

```markdy
client Browser at (80, 160)
api_gateway EdgeAPI "API Gateway" at (320, 160)
auth OIDC "OIDC Provider" at (560, 160)
pod CheckoutPod "Checkout Pod" at (320, 340)
topic Orders "orders.created" at (560, 340)
warehouse BI "Analytics Warehouse" at (800, 340)

@0.5: Browser.request(to=EdgeAPI, label="POST /checkout")
@1.2: EdgeAPI.request(to=OIDC, label="verify token")
@1.9: EdgeAPI.emit(to=Orders, label="order.created")
@2.5: Orders.emit(to=BI, label="stream")
```

### Generic visual primitives

The systems actor pack also includes reusable visual primitives for composing rich UI scenes without adding story-specific actor types:

```markdy
actor shell = surface("Ops dashboard", "live", cyan) at (60, 120)
actor log = terminal("Compiler", "input rows", "tokens -> graph", "state synced", green) at (60, 120)
actor cells = matrix("cells", "4x2", "3 6 8", green) at (240, 160)
actor latency = stat("latency", "18ms", cyan) at (90, 330)
actor route = track("handoff", cyan) at (80, 260)
actor packet = dot("packet", cyan) at (240, 270)
actor tokens = chips("char|U+0041|0x41", purple) at (190, 210)
actor glyph = glyph("A", "glyph", purple) at (80, 180)
```

Use these as composable building blocks for dashboards, terminals, games, maps, encoders, education flows, and product explainers. They accept normal modifiers and universal actions, so you can animate them with `fade_in`, `mask`, `glow`, `ripple`, `move`, `pulse`, and `play(...)`.

---

## Timeline events

```markdy
@<time>: <actorName>.<action>(<params>)
```

`<time>` is a decimal number of seconds from the start of the scene.  
`<params>` is a comma-separated list of `key=value` pairs.  
Some actions accept a leading positional argument (see action table below).

```markdy
@0.0: p.enter(from=left, dur=0.8)
@2.5: p.move(to=(300,250), dur=1.0, ease=inout)
```

Events are executed in time order. Multiple events may share the same timestamp.

---

## Actions

### Common parameter

| Parameter | Type   | Default  | Description                             |
|-----------|--------|----------|-----------------------------------------|
| `dur`     | number | `0.5`    | Duration of the action in seconds       |
| `ease`    | string | `linear`* | Easing: `linear`, `in`, `out`, `inout`, `smooth`, `snappy`, `overshoot`, `sharp`, or a literal `cubic-bezier(x1,y1,x2,y2)` curve |

\* `enter` and `fade_in` default to `out` (decelerate into place) and `exit`/`fade_out` default to `in` (accelerate away) when `ease` is omitted — this is what makes a bare `hero.enter(from=left, dur=0.6)` look natural instead of mechanical. Every other action still defaults to `linear`. An explicit `ease=` always overrides the default.

---

### `enter`

Slides the actor into the scene from outside the canvas boundary.

```markdy
@0.0: p.enter(from=left, dur=0.8)
```

| Parameter | Values                        | Default |
|-----------|-------------------------------|---------|
| `from`    | `left`, `right`, `top`, `bottom` | `left` |
| `dur`     | seconds                       | `0.5`  |

---

### `move`

Translates the actor to a new position.

```markdy
@2.0: p.move(to=(300,250), dur=1.0, ease=inout)
```

| Parameter | Type         | Description               |
|-----------|--------------|---------------------------|
| `to`      | `(x,y)`      | Target position in pixels |
| `dur`     | seconds      |                           |
| `ease`    | easing token |                           |

---

### `spring`

Moves to a new coordinate with a subtle overshoot and settle.

```markdy
@0.4: API.spring(to=(360,210), stiffness=0.18, dur=0.7)
```

| Parameter   | Type    | Default | Description                     |
|-------------|---------|---------|---------------------------------|
| `to`        | `(x,y)` | current | Target position in pixels       |
| `stiffness` | number  | `0.18`  | Overshoot amount                |

---

### `follow_path`

Moves an actor along an SVG path string using CSS motion path properties.

```markdy
@1.0: packet.follow_path(path="M 0 0 C 80 -40 160 40 240 0", dur=1.0)
```

| Parameter | Type   | Default | Description                         |
|-----------|--------|---------|-------------------------------------|
| `path`    | string | line    | SVG path data                       |
| `rotate`  | bool   | `true`  | Use automatic path-facing rotation  |

---

### Visual effects

These universal actions work on all actor types and compile to Web Animations API keyframes plus lightweight transient DOM where needed.

```markdy
@0.0: API.glow(color=#38bdf8, strength=24, dur=0.5)
@0.2: API.pulse(amount=1.08, dur=0.35)
@0.4: API.ripple(color=#22c55e, size=140, dur=0.5)
@0.8: title.line_reveal(from=left, dur=0.4)
@1.2: panel.mask(from=0, to=120, dur=0.6)
@1.6: panel.blur(from=8, to=0, dur=0.4)
@2.0: bg.parallax(depth=0.35, by=(40,0), dur=1.0)
```

| Action        | Purpose                                      |
|---------------|----------------------------------------------|
| `pulse`       | Temporary scale emphasis                     |
| `glow`        | Animated drop-shadow/box-shadow highlight    |
| `ripple`      | Expanding ring from actor center             |
| `blur`        | CSS blur transition                          |
| `line_reveal` | Directional clip-path reveal                 |
| `mask`        | Circular clip-path reveal/conceal            |
| `parallax`    | Depth-scaled offset for layered motion       |

---

### `fade_in`

Animates opacity from 0 to 1.

```markdy
@5.2: title.fade_in(dur=0.5)
```

---

### `fade_out`

Animates opacity to 0 from the current opacity value.

```markdy
@4.6: c.fade_out(dur=0.4)
```

---

### `scale`

Animates the actor's scale to a new value.

```markdy
@1.0: p.scale(to=1.5, dur=0.4, ease=out)
```

| Parameter | Type    | Description       |
|-----------|---------|-------------------|
| `to`      | number  | Target scale      |
| `dur`     | seconds |                   |
| `ease`    | easing  |                   |

---

### `rotate`

Animates the actor's rotation to a new value.

```markdy
@1.0: p.rotate(to=90, dur=0.5)
```

| Parameter | Type    | Description            |
|-----------|---------|------------------------|
| `to`      | number  | Target angle in degrees |
| `dur`     | seconds |                        |

---

### `shake`

Rapidly oscillates the actor horizontally and returns it to its original position.

```markdy
@4.0: c.shake(intensity=3, dur=0.5)
```

| Parameter   | Type    | Default | Description                 |
|-------------|---------|---------|-----------------------------|
| `intensity` | number  | `5`     | Pixel offset per oscillation |
| `dur`       | seconds | `0.5`   |                             |

---

### `say`

Displays a speech bubble above the actor for `dur` seconds.

```markdy
@1.0: guide.say("Start with the API.", dur=1.0)
```

The text string is the first positional argument (no key required).

| Argument | Type   | Description            |
|----------|--------|------------------------|
| `"text"` | string | Speech bubble content  |
| `dur`    | seconds |                       |

---

### `throw`

Animates a projectile from the actor to a target actor using the named asset.

```markdy
@3.0: p.throw(fire, to=c, dur=0.8)
```

The asset name is the first positional argument.

| Argument    | Type        | Description                         |
|-------------|-------------|-------------------------------------|
| `assetName` | identifier  | Asset to use as the projectile      |
| `to`        | actor name  | Target actor                        |
| `dur`       | seconds     |                                     |

---

### Legacy figure actions

`punch` and `kick` remain supported for compatibility with older scenes, but avoid them in public docs, onboarding, and generated examples. Prefer neutral presenter gestures like `wave`, `nod`, `face`, and small `pose` changes.

---

### `rotate_part`

Rotates any named body part of a figure to a target angle. **Figure actors only.**

```markdy
@1.0: guide.rotate_part(part=head, to=10, dur=0.3)
@2.0: guide.rotate_part(part=head, to=0, dur=0.3)
```

| Parameter | Type    | Description                                       |
|-----------|---------|---------------------------------------------------|
| `part`    | string  | Body part name (see figure actor docs above)     |
| `to`      | number  | Target angle in degrees                           |
| `dur`     | seconds | Animation duration                                |

Valid part names: `head`, `face`, `body`, `arm_left`, `arm_right`, `leg_left`, `leg_right`.

---

### `pose`

Sets multiple body parts to target angles simultaneously in a single action. More ergonomic than chaining multiple `rotate_part` calls. **Figure actors only.**

```markdy
@1.0: guide.pose(head=10, dur=0.3)
@2.0: guide.pose(head=0, dur=0.3)
```

| Parameter    | Type   | Description                         |
|--------------|--------|-------------------------------------|
| `arm_left`   | number | Target angle for left arm (degrees) |
| `arm_right`  | number | Target angle for right arm          |
| `leg_left`   | number | Target angle for left leg           |
| `leg_right`  | number | Target angle for right leg          |
| `head`       | number | Target angle for head               |
| `body`       | number | Target angle for torso              |
| `dur`        | seconds |                                    |

Only the parts you specify are animated — omitted parts stay at their current angle.

---

### `wave`

Built-in wave gesture — raises an arm, oscillates it back and forth, then returns to rest. **Figure actors only.**

```markdy
@2.0: hero.wave(side=right, dur=0.8)
@3.0: gal.wave(side=left, dur=0.6)
```

| Parameter | Values          | Default  |
|-----------|-----------------|----------|
| `side`    | `left`, `right` | `right`  |
| `dur`     | seconds         | `0.5`    |

---

### `jump`

Jumps the actor upward with a squash-and-stretch effect, then lands back at the original position.

```markdy
@3.0: hero.jump(height=30, dur=0.5)
```

| Parameter | Type    | Default | Description                     |
|-----------|---------|---------|---------------------------------|
| `height`  | number  | `30`    | Jump height in pixels           |
| `dur`     | seconds | `0.5`   |                                 |

---

### `nod`

Nods the head down and back up twice — a quick agreement gesture. **Figure actors only.**

```markdy
@2.0: hero.nod(dur=0.4)
```

| Parameter | Type    | Default |
|-----------|---------|---------|
| `dur`     | seconds | `0.5`   |

---

### `bounce`

Bounces the actor vertically with diminishing amplitude — useful for emphasis or landing effects.

```markdy
@1.0: hero.bounce(intensity=15, count=3, dur=0.6)
```

| Parameter   | Type    | Default | Description                      |
|-------------|---------|---------|----------------------------------|
| `intensity` | number  | `15`    | Initial bounce height in pixels  |
| `count`     | number  | `3`     | Number of bounces                |
| `dur`       | seconds | `0.5`   |                                  |

---

### `face`

Instantly swaps the emoji face of a figure actor. Seek-safe — works correctly with both forward playback and `seek()` backwards. **Figure actors only.**

```markdy
@5.0: hero.face("🤔")
@9.5: hero.face("🙂")
```

| Argument  | Type   | Description           |
|-----------|--------|-----------------------|
| `"emoji"` | string | New emoji expression  |

---

## Full example

```markdy
scene width=800 height=400 fps=30 bg=white

asset packet = icon("lucide:send")

actor client = text("Client") at (120,220) size 28 opacity 0
actor api    = text("API") at (340,220) size 28 opacity 0
actor data   = text("Data") at (560,220) size 28 opacity 0
actor title  = caption("Request lifecycle") at top opacity 0

@0.0: title.fade_in(dur=0.4)
@0.3: client.fade_in(dur=0.3)
@0.5: api.fade_in(dur=0.3)
@0.7: data.fade_in(dur=0.3)
@1.2: client.throw(packet, to=api, dur=0.6)
@1.9: api.throw(packet, to=data, dur=0.6)
@2.6: data.shake(intensity=3, dur=0.4)
```

---

## Grammar summary

```
program     = statement*
statement   = scene | asset | actor | event | blank | comment

scene       = "scene" (KEY "=" VALUE)*
asset       = "asset" NAME "=" ASSET_TYPE "(" QUOTED ")"
actor       = "actor" NAME "=" ACTOR_TYPE "(" ARGS? ")" "at" COORD modifier*
event       = "@" NUMBER ":" NAME "." ACTION "(" PARAMS? ")"

modifier    = ("scale" | "rotate" | "opacity" | "size" | "z") NUMBER
COORD       = "(" NUMBER "," NUMBER ")"
PARAMS      = PARAM ("," PARAM)*
PARAM       = (QUOTED | identifier | NUMBER | COORD)   -- positional
            | KEY "=" (QUOTED | identifier | NUMBER | COORD)  -- named

comment     = "#" <rest of line>
NAME        = /[a-z_][a-z0-9_]*/i
NUMBER      = /[0-9]+(\.[0-9]+)?/
QUOTED      = '"' [^"]* '"'
KEY         = NAME
VALUE       = QUOTED | NUMBER | identifier
ASSET_TYPE  = "image" | "icon"
ACTOR_TYPE  = "sprite" | "text" | "box" | "figure" | DEF_NAME
ACTION      = NAME  -- underscore allowed: fade_in, fade_out
VAR_REF     = "${" NAME "}"
```

---

## Variables (`var`)

Variables let you define reusable constants that are substituted everywhere via `${name}`.

```markdy
var <name> = <value>
```

The value extends to the end of the line. Values may contain `#` (e.g. hex colours) since comment stripping is skipped for `var` lines.

```markdy
var skin_tone = #c68642
var start_y = 200
var bg = #fff5f9

scene bg=${bg}
actor hero = figure(${skin_tone}, m, 😎) at (300, ${start_y})
@1.0: hero.enter(from=left, dur=0.8)
```

Variables can reference earlier variables:

```markdy
var base_x = 100
var offset = ${base_x}
```

---

## Templates (`def`)

Templates let you define reusable actor types that expand to built-in types at parse time. The renderer never sees them — they compile down to standard actors.

```markdy
def <name>(<param1>, <param2>, ...) {
  <actorType>(<args using ${param}>)
}
```

The body is exactly one line containing a built-in actor type and its arguments. Template parameters are substituted using `${param}`.

```markdy
def presenter(skin, gender, face) {
  figure(${skin}, ${gender}, ${face})
}

def label(content) {
  text(${content})
}

# Usage — works exactly like a built-in type:
actor host  = presenter(#c68642, m, 🙂) at (740, 200)
actor guide = presenter(#8d5524, m, 🙂) at (120, 200) scale 1.2
actor title = label("Release Plan") at (400, 50) size 32
```

---

## Sequences (`seq`)

Sequences let you define reusable animation blocks that can be played on any actor. They eliminate copy-paste for repeated animation patterns.

```markdy
seq <name> {
  @+<offset>: $.<action>(<params>)
  @+<offset>: $.<action>(<params>)
}
```

```markdy
seq <name>(<param1>, <param2>) {
  @+<offset>: $.<action>(key=${param}, ...)
}
```

Inside a seq:
- `$` refers to whichever actor the sequence is played on
- `@+offset` is relative time from when `play` is called (not absolute scene time)
- `${param}` references sequence parameters

### Playing a sequence

```markdy
@<time>: <actor>.play(<seqName>)
@<time>: <actor>.play(<seqName>, <key>=<value>, ...)
```

The `play` action expands the sequence inline at parse time — each `@+offset` event becomes an absolute event at `time + offset`.

### Examples

```markdy
# A simple wave animation — reuse on any actor
seq wave {
  @+0.0: $.wave(side=right, dur=0.6)
}

@2.0: host.play(wave)
@3.0: guide.play(wave)

# A parameterized greeting
seq greet(side) {
  @+0.0: $.wave(side=${side}, dur=0.4)
  @+0.5: $.nod(dur=0.3)
}

@5.0: host.play(greet, side=left)
@6.0: guide.play(greet, side=right)
```

---

## Composability

`var`, `def`, and `seq` compose together — users can build entire character systems and choreographies without changing the engine:

```markdy
# ── Variables ──────────────────────
var skin_a = #c68642
var skin_b = #8d5524

# ── Templates ──────────────────────
def presenter(skin, gender, face) {
  figure(${skin}, ${gender}, ${face})
}

# ── Sequences ──────────────────────
seq entrance(side) {
  @+0.0: $.enter(from=${side}, dur=1.0)
}

seq celebrate {
  @+0.0: $.jump(height=20, dur=0.5)
  @+0.1: $.say("Checks passed.", dur=1.5)
}

# ── Scene ──────────────────────────
scene width=920 height=460 bg=#f8fafc

actor host  = presenter(${skin_a}, m, 🙂) at (740, 200)
actor guide = presenter(${skin_b}, m, 🙂) at (120, 200)
actor lead  = presenter(#fad4c0, f, 🙂) at (430, 200) opacity 0

@0.0: lead.fade_in(dur=0.7)
@0.8: host.play(entrance, side=right)
@1.1: guide.play(entrance, side=left)
@10.1: host.play(celebrate)
```

---

## Parser errors

The parser throws a `ParseError` with the offending line number for:

- Duplicate `scene` declaration
- Unrecognised asset type
- Invalid actor or event syntax
- Event referencing an undeclared actor
- Unknown actor type or template name
- Unclosed `def`, `seq`, or chapter block
- Empty `def` body
- Unknown sequence name in `play`
- Unrecognised top-level statement
- Figure-only action (`wave`, `nod`, `face`, `pose`, `rotate_part`) on a non-figure actor
- Must-understand (`!action`) call on an unknown action

Unknown scene property keys, unknown actions without `!`, unknown modifier keys, and unresolved imports are *soft warnings* — see the "Soft warnings" section below.

<!-- markdy:regen:syntax-addendum:start -->

## Extended grammar

The following features are part of the base grammar — no pragma, no opt-in. Every feature is additive: existing scripts continue to parse and render identically.

### caption actor

A `caption` is a first-class actor type for overlay text (titles, subtitles, meme-format captions). Unlike `text`, captions are self-centering and position themselves relative to the scene (top ≈ 12% down, bottom ≈ 88%, center = 50%). You can still apply modifiers (`size`, `opacity`, etc.) and animate them with any universal action (`fade_in`, `exit`, `move`, ...).

```markdy
actor title = caption("The Demo") at top
```

Full example: [`examples/01-caption-basic.markdy`](../examples/01-caption-basic.markdy)

---

### chapter blocks

A chapter block organizes a run of events under a named heading. Chapters can be listed in UIs (timeline scrubbers, table of contents) and recorded in `ast.chapters`. `@+N:` shorthand inside a chapter is relative to the chapter's own previous event, so chapters compose cleanly.

```markdy
scene "intro" {
  @+0.0: hero.enter(from=left, dur=0.4)
  @+0.2: hero.wave(dur=0.5)
}
```

Full example: [`examples/03-chapters.markdy`](../examples/03-chapters.markdy)

---

### @+N: relative time

No more hand-counted absolute timestamps. `@+N:` takes the end-time of the previous event (end = start + dur) and adds N seconds. Scopes are honored: `@+N` at the top level is relative to the previous top-level event, and `@+N` inside a chapter is relative to the previous event in that chapter.

```markdy
@0.0:  hero.enter(from=left, dur=0.5)
@+0.2: hero.say("hi", dur=1.0)
```

Full example: [`examples/02-at-plus-shorthand.markdy`](../examples/02-at-plus-shorthand.markdy)

---

### actor groups

A `group` declaration names a set of already-declared actors. Target the group anywhere an actor event target is accepted and the parser expands it into one ordinary event per member, in declaration order. Add `stagger=N` to a grouped event to walk each member's start time forward by N seconds; `stagger` is consumed at parse time and does not appear in emitted params.

```markdy
actor a = text("A") at (160, 200) opacity 0
actor b = text("B") at (240, 200) opacity 0
group letters = a, b
@0.0: letters.fade_in(dur=0.4, stagger=0.15)
```

Full example: [`examples/showcase/bullet-reveal.markdy`](../examples/showcase/bullet-reveal.markdy)

---

### camera reserved actor

`camera` is a reserved actor name. It has three actions — `pan`, `zoom`, `shake` — that apply their transform to an inner scene-content layer so responsive CSS scaling is preserved. You don't declare camera as an actor; reference it directly. Unknown camera actions soft-warn and no-op.

```markdy
@0.0: camera.zoom(to=1.4, dur=0.8, ease=out)
```

Full example: [`examples/05-camera-zoom.markdy`](../examples/05-camera-zoom.markdy)

---

### exit action

`exit` is a universal action — it works on any actor type. Like `enter`, it takes a `to` direction. The animation combines an off-screen translate with an opacity-to-zero fade, so the actor is visually gone at the end.

```markdy
@2.0: hero.exit(to=right, dur=0.5)
```

Full example: [`examples/09-exit-action.markdy`](../examples/09-exit-action.markdy)

---

### import statements

Records the import in `ast.imports`. The parser doesn't open files; hosts (playground, CLI) pass a `{ imports: { ns: SceneAST } }` map to `parse()`. Resolved namespaces merge their `vars`, `defs`, and `seqs` into the parent under `ns.<name>`. Unresolved imports produce a soft `import-unresolved` warning.

```markdy
import "./characters.markdy" as chars
```

Full example: [`examples/14-import-namespaced.markdy`](../examples/14-import-namespaced.markdy)

---

### preset expansion

Presets are parse-time macros for common scene shapes (meme, explainer, reaction, countdown, ...). The MarkdyScript source is literally replaced with the preset's expansion before actor/event parsing begins. A file whose only content is a `preset <name>` call becomes a complete scene.

```markdy
preset meme("top line", "bottom line")
```

Full example: [`examples/presets/meme.markdy`](../examples/presets/meme.markdy)

---

### !action must-understand prefix

By default, unknown actions produce a `ParseWarning` and the renderer no-ops them. This keeps old scripts parseable as the grammar evolves. When you'd rather fail-fast — e.g. in CI, or to guard a critical beat — prefix the action with `!`. A must-understand call to an unknown action throws `ParseError` at parse time.

```markdy
@1.0: hero.!shake(intensity=6, dur=0.4)
```

Full example: [`examples/15-must-understand.markdy`](../examples/15-must-understand.markdy)

---

### unified with-modifier form

Two modifier forms are supported; pick whichever reads better: **space-separated** — `actor x = box() at (10,10) scale 1.5 rotate 10` or **unified** — `actor x = box() at (10,10) with scale=1.5, rotate=10`. They can be mixed on the same line (space form first, then `with`). Unknown modifier keys produce a soft warning and are ignored.

```markdy
actor box1 = box() at (100, 100) with scale=1.2, opacity=0.85, rotate=12
```

Full example: [`examples/10-unified-modifiers.markdy`](../examples/10-unified-modifiers.markdy)

---

### figure-only type check

The parser now rejects figure-only actions on non-figure actors with a clear error pointing at the actor type. This catches common mistakes early — applying `punch` to a `text` actor used to silently no-op; now it throws `ParseError: action "punch" is figure-only; actor type is "text"`.

```markdy
# Type check: `text` actors cannot use `punch`
# @0.0: label.punch(...)   → ParseError
```

Full example: [`examples/12-figure-type-check.markdy`](../examples/12-figure-type-check.markdy)

---

### systems architecture nodes

Register the `@markdy/stdlib-systems` pack to unlock a broad vocabulary of software-diagram node types across compute, client, data, messaging, network, Kubernetes/Docker, security, CI/CD, observability, flow, and distributed-systems categories. Shorthand `<type> <Name> ["Label"] [at (x,y)]` expands to a normal actor and is styled by semantic category, so you name the concept and the renderer handles the look.

```markdy
service Orders "Orders API" at (200, 120)
```

Full example: [`examples/showcase/url-shortener-architecture.markdy`](../examples/showcase/url-shortener-architecture.markdy)

---

### system flow edges

The three flow verbs draw labeled, auto-routed edges between technical nodes: `request` is a solid call (blue), `response` a dashed return (violet), and `emit` an async/event edge (amber). Edges route around other nodes, fan parallel calls into separate lanes, and fade out after their dot arrives so busy diagrams stay readable. `to=` is required; keep `label=` under 28 characters.

```markdy
@0.5: Orders.request(to=UrlDB, label="store slug", dur=0.5)
```

Full example: [`examples/showcase/twitter-timeline-service.markdy`](../examples/showcase/twitter-timeline-service.markdy)

---

### premium visual effects

Beyond the core motion actions, every actor supports a set of premium effects: `glow`/`pulse`/`ripple` for emphasis, `blur`/`mask`/`line_reveal` for reveals, `parallax` for layered depth, and `spring`/`follow_path` for richer motion. Pair `smooth`, `snappy`, `overshoot`, or `sharp` easing (or a literal `cubic-bezier(...)`) for a polished feel.

```markdy
@0.0: Orders.glow(color=#38bdf8, strength=24, dur=0.5)
```

Full example: [`examples/showcase/youtube-processing-pipeline.markdy`](../examples/showcase/youtube-processing-pipeline.markdy)

---

### visual composition primitives

Compose Excalidraw/Lucidchart-style annotated scenes without scenario-specific actors. Each primitive takes a positional label first and a colour tone last (`cyan`, `green`, `amber`, `purple`, ...): `surface`/`terminal` for panels, `stat` for KPIs, `matrix` for cell grids, `track`/`dot` for paths, `chips` for token rows, and `glyph` for badge cards. They accept all normal modifiers and universal actions.

```markdy
actor kpi = stat("latency", "18ms", cyan) at (90, 330)
```

Full example: [`examples/showcase/technical-diagram-vocabulary.markdy`](../examples/showcase/technical-diagram-vocabulary.markdy)

---

## Soft warnings

Where the grammar could have hard-errored, it often emits a `ParseWarning` instead. Warnings are attached to `ast.warnings` and surfaced via the renderer's `onWarning` callback. This keeps older scripts parseable as the grammar evolves.

| kind | emitted when |
|------|---|
| `unknown-action` | an action name is not in the parser's known set |
| `unknown-camera-action` | a `camera.*` call uses an unsupported action |
| `unknown-modifier` | a `with key=val` or space-form key is not a known modifier |
| `unknown-scene-key` | the `scene` declaration has an unrecognized property |
| `unknown-preset` | `preset <name>` references a preset that doesn't exist; the message lists available names |
| `import-unresolved` | an `import ... as ns` has no matching host-provided namespace |
| `preset-mixed` | `preset <name>` appears alongside other statements (presets are whole-file shorthands) |
| `actor-count-threshold` | a scene declares an unusually large number of actors; a hint to split or simplify |
| `label-overflow` | a caption or label is long enough that it may overflow its layout box |

Prefix an action with `!` to opt into hard-fail behavior instead: `actor.!action(...)` throws `ParseError` on unknown actions.
<!-- markdy:regen:syntax-addendum:end -->
