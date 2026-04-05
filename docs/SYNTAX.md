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
asset pepe = image("https://media1.tenor.com/m/4n4cErvEq_sAAAAd/yapapa-cat.gif")
asset fire = icon("lucide:flame")
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
| `figure` | `skinColor [, gender [, face]]` | Emoji stick figure with articulatable limbs |

### The `figure` actor type

Figures are emoji-based stick figures with named body parts that can be individually animated.

```markdy
actor guy  = figure(#c68642)           at (100, 200)    # male, default face 😶
actor gal  = figure(#fad4c0, f)        at (300, 200)    # female variant, default face 🙂
actor hero = figure(#c68642, m, 😎)   at (500, 200)    # custom starting face
```

**Arguments** (positional, inside the parentheses):

| Position | Name | Default | Description |
|---|---|---|---|
| 1 | `skinColor` | `#ffdbac` | CSS colour for skin (neck, arm sticks) |
| 2 | `gender` | `m` | `m` = male (👕🤜👟), `f` = female (👗💅👠) |
| 3 | `face` | `😶` (m) / `🙂` (f) | Starting emoji expression |

**Named body parts** (used by `rotate_part`, `punch`, `kick`):

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

```markdy
actor p     = sprite(pepe) at (100,250) scale 0.4
actor title = text("Ship it") at (320,80) size 48 opacity 0
actor box1  = box() at (50,50) rotate 45
```

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
| `ease`    | string | `linear` | Easing: `linear`, `in`, `out`, `inout`  |

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
@1.0: p.say("bruh", dur=1.0)
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

### `punch`

Swings one arm out and snaps it back. **Figure actors only.**

```markdy
@5.0: hero.punch(side=right, dur=0.3)
```

| Parameter | Values          | Default  |
|-----------|-----------------|----------|
| `side`    | `left`, `right` | `right`  |
| `dur`     | seconds         | `0.5`    |

---

### `kick`

Swings one leg out and snaps it back. **Figure actors only.**

```markdy
@5.5: hero.kick(side=left, dur=0.36)
```

| Parameter | Values          | Default  |
|-----------|-----------------|----------|
| `side`    | `left`, `right` | `right`  |
| `dur`     | seconds         | `0.5`    |

---

### `rotate_part`

Rotates any named body part of a figure to a target angle. **Figure actors only.**

```markdy
@1.0: hero.rotate_part(part=arm_right, to=90, dur=0.4)
@2.0: hero.rotate_part(part=leg_left, to=-60, dur=0.35)
@3.0: hero.rotate_part(part=head, to=20, dur=0.3)
```

| Parameter | Type    | Description                                       |
|-----------|---------|---------------------------------------------------|
| `part`    | string  | Body part name (see figure actor docs above)     |
| `to`      | number  | Target angle in degrees                           |
| `dur`     | seconds | Animation duration                                |

Valid part names: `head`, `face`, `body`, `arm_left`, `arm_right`, `leg_left`, `leg_right`.

---

### `face`

Instantly swaps the emoji face of a figure actor. Seek-safe — works correctly with both forward playback and `seek()` backwards. **Figure actors only.**

```markdy
@5.0: hero.face("😡")
@9.5: hero.face("😵")
```

| Argument  | Type   | Description           |
|-----------|--------|-----------------------|
| `"emoji"` | string | New emoji expression  |

---

## Full example

```markdy
scene width=800 height=400 fps=30 bg=white

asset pepe = image("https://media1.tenor.com/m/4n4cErvEq_sAAAAd/yapapa-cat.gif")
asset cat  = image("/memes/cat.png")
asset fire = icon("lucide:flame")

actor p     = sprite(pepe) at (100,250) scale 0.4
actor c     = sprite(cat)  at (600,250) scale 0.4
actor title = text("Ship it") at (320,80) size 48

@0.0: p.enter(from=left, dur=0.8)
@1.0: p.say("bruh", dur=1.0)
@2.0: p.move(to=(300,250), dur=1.0, ease=inout)
@3.0: p.throw(fire, to=c, dur=0.8)
@4.0: c.shake(intensity=3, dur=0.5)
@4.6: c.fade_out(dur=0.4)
@5.2: title.fade_in(dur=0.5)
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

modifier    = ("scale" | "rotate" | "opacity" | "size") NUMBER
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
def fighter(skin, gender, face) {
  figure(${skin}, ${gender}, ${face})
}

def label(content) {
  text(${content})
}

# Usage — works exactly like a built-in type:
actor bruno = fighter(#c68642, m, 😏) at (740, 200)
actor alex  = fighter(#8d5524, m, 😤) at (120, 200) scale 1.2
actor title = label("Round 1") at (400, 50) size 32
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
  @+0.0: $.rotate_part(part=arm_right, to=-80, dur=0.3)
  @+0.3: $.rotate_part(part=arm_right, to=-25, dur=0.3)
}

@2.0: bruno.play(wave)
@3.0: alex.play(wave)

# A parameterized punch combo
seq punch_combo(side) {
  @+0.0: $.punch(side=${side}, dur=0.3)
  @+0.3: $.shake(intensity=5, dur=0.2)
}

@5.0: bruno.play(punch_combo, side=left)
@6.0: alex.play(punch_combo, side=right)
```

---

## Composability

`var`, `def`, and `seq` compose together — users can build entire character systems and choreographies without changing the engine:

```markdy
# ── Variables ──────────────────────
var skin_a = #c68642
var skin_b = #8d5524

# ── Templates ──────────────────────
def fighter(skin, face) {
  figure(${skin}, m, ${face})
}

def heroine(skin, face) {
  figure(${skin}, f, ${face})
}

# ── Sequences ──────────────────────
seq entrance(side) {
  @+0.0: $.enter(from=${side}, dur=1.0)
}

seq celebrate {
  @+0.0: $.rotate_part(part=arm_right, to=-130, dur=0.3)
  @+0.3: $.rotate_part(part=arm_right, to=-25, dur=0.4)
  @+0.0: $.say("🎉", dur=1.5)
}

# ── Scene ──────────────────────────
scene width=920 height=460 bg=#fff5f9

actor bruno = fighter(${skin_a}, 😏) at (740, 200)
actor alex  = fighter(${skin_b}, 😤) at (120, 200)
actor lily  = heroine(#fad4c0, 😊) at (430, 200) opacity 0

@0.0: lily.fade_in(dur=0.7)
@0.8: bruno.play(entrance, side=right)
@1.1: alex.play(entrance, side=left)
@10.1: bruno.play(celebrate)
```

---

## Parser errors

The parser throws a `ParseError` with the offending line number for:

- Duplicate `scene` declaration
- Unknown `scene` property key
- Unrecognised asset type
- Invalid actor or event syntax
- Event referencing an undeclared actor
- Unknown actor type or template name
- Unclosed `def` or `seq` block
- Empty `def` body
- Unknown sequence name in `play`
- Unrecognised top-level statement
