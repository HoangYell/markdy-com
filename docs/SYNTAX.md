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
asset pepe = image("/memes/pepe.webp")
asset fire = icon("lucide:flame")
```

---

## Actor declarations

```markdy
actor <name> = <type>(<args>) at (<x>,<y>) [modifiers...]
```

Actors are the objects visible in the scene. They must be declared before any events that reference them.

### Actor types

| Type     | Args                    | Description                             |
|----------|-------------------------|-----------------------------------------|
| `sprite` | asset name              | Renders the named image or icon asset   |
| `text`   | `"quoted string"`       | Renders a text label                    |
| `box`    | *(none)*                | Renders a 100x100 px solid grey box     |

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

## Full example

```markdy
scene width=800 height=400 fps=30 bg=white

asset pepe = image("/memes/pepe.webp")
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
ACTOR_TYPE  = "sprite" | "text" | "box"
ACTION      = NAME  -- underscore allowed: fade_in, fade_out
```

---

## Parser errors

The parser throws a `ParseError` with the offending line number for:

- Duplicate `scene` declaration
- Unknown `scene` property key
- Unrecognised asset type
- Invalid actor or event syntax
- Event referencing an undeclared actor
- Unrecognised top-level statement
