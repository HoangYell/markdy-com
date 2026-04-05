# MarkdyScript — AI Agent Reference

> **Purpose:** This document is a structured, machine-readable reference for AI agents and LLMs generating MarkdyScript code. It provides the exact grammar, all valid tokens, constraints, and common patterns in a format optimized for prompt engineering and code generation.

---

## System Prompt Context

When generating MarkdyScript, use this mental model:

1. MarkdyScript is a **line-based DSL** — one statement per line
2. The output is a **2D animated scene** rendered with the Web Animations API
3. Coordinate system: `(0,0)` = **top-left**, X → right, Y → down, units = pixels
4. Time is in **seconds** (decimal), starting at `0.0`
5. All animations run on a **single timeline** — events at the same `@time` play simultaneously
6. The parser is **strict** — unknown statements throw `ParseError` with line numbers

---

## Grammar (Exact)

```
program       = line*
line          = statement | comment | blank

statement     = var_decl | scene_decl | asset_decl | actor_decl
              | event | def_block | seq_block

var_decl      = "var" IDENT "=" REST_OF_LINE
scene_decl    = "scene" (IDENT "=" VALUE)*
asset_decl    = "asset" IDENT "=" ("image" | "icon") "(" QUOTED ")"
actor_decl    = "actor" IDENT "=" TYPE "(" ARGS? ")" "at" "(" NUM "," NUM ")" MODIFIER*
event         = "@" NUM ":" IDENT "." ACTION "(" PARAMS? ")"

def_block     = "def" IDENT "(" PARAM_LIST? ")" "{" NEWLINE
                  TYPE "(" ARGS? ")" NEWLINE
                "}"

seq_block     = "seq" IDENT ("(" PARAM_LIST? ")")? "{" NEWLINE
                  seq_event+ NEWLINE
                "}"
seq_event     = "@+" NUM ":" "$." ACTION "(" PARAMS? ")"

MODIFIER      = ("scale" | "rotate" | "opacity" | "size") NUM
PARAMS        = PARAM ("," PARAM)*
PARAM         = VALUE                           # positional
              | IDENT "=" VALUE                  # named
VALUE         = QUOTED | NUM | TUPLE | IDENT
TUPLE         = "(" NUM "," NUM ")"
QUOTED        = '"' [^"]* '"'
NUM           = [0-9]+ ("." [0-9]+)?
IDENT         = [a-zA-Z_][a-zA-Z0-9_]*
PARAM_LIST    = IDENT ("," IDENT)*
REST_OF_LINE  = .+                              # no comment stripping on var lines
comment       = "#" .*
TYPE          = "sprite" | "text" | "box" | "figure" | DEF_NAME
ACTION        = IDENT
```

---

## Statement Reference

### `var` — Variable Declaration

```
var <name> = <value>
```

- Parsed **before** comment stripping (safe for `#hex` colours)
- Substituted everywhere via `${name}`
- Forward references are invalid — declare before use

### `scene` — Scene Configuration

```
scene [width=NUM] [height=NUM] [fps=NUM] [bg=STRING] [duration=NUM]
```

| Property | Type | Default | Constraints |
|---|---|---|---|
| `width` | int | `800` | > 0 |
| `height` | int | `400` | > 0 |
| `fps` | int | `30` | Informational |
| `bg` | string | `white` | Any CSS colour |
| `duration` | float | auto | Auto-computed from last event if omitted |

- At most **one** scene declaration per program
- Must appear before actors/events (convention, not enforced)

### `asset` — Asset Declaration

```
asset <name> = image("<url>")
asset <name> = icon("<set:name>")
```

### `actor` — Actor Declaration

```
actor <name> = <type>(<args>) at (<x>, <y>) [modifiers...]
```

**Built-in types:**

| Type | Arguments | Notes |
|---|---|---|
| `sprite` | `assetName` | References a declared asset |
| `text` | `"quoted string"` | Renders text label |
| `box` | *(none)* | 100×100 grey box |
| `figure` | `skinColor [, gender [, face]]` | Emoji stick figure |

**Figure arguments in detail:**

| Position | Name | Type | Default | Valid values |
|---|---|---|---|---|
| 1 | skinColor | CSS colour | `#ffdbac` | Any hex/named colour |
| 2 | gender | string | `m` | `m`, `f` |
| 3 | face | emoji | `😶` (m) / `🙂` (f) | Any single emoji |

**Modifiers** (space-separated after `at (x,y)`):

| Modifier | Type | Default |
|---|---|---|
| `scale` | float | `1` |
| `rotate` | float (degrees) | `0` |
| `opacity` | float (0–1) | `1` |
| `size` | int (px) | — |

### `def` — Template Definition

```
def <name>(<param1>, <param2>) {
  <builtinType>(<args with ${param} refs>)
}
```

- Body is exactly **one line** containing a built-in actor type
- Expanded at parse time — renderer never sees templates
- Use `${param}` for parameter substitution in body args

### `seq` — Sequence Definition

```
seq <name>[(<param1>, <param2>)] {
  @+<offset>: $.<action>(<params with ${param} refs>)
  ...
}
```

- `$` = target actor placeholder (resolved at play time)
- `@+offset` = relative time from play invocation
- Parameters optional — parameterless sequences use `seq name { ... }`

### `@time` — Timeline Event

```
@<seconds>: <actorName>.<action>(<params>)
```

Special action: `play` expands a sequence inline:
```
@<time>: <actor>.play(<seqName>[, key=value, ...])
```

---

## Complete Action Table

### Universal Actions (all actor types)

| Action | Parameters | Behaviour |
|---|---|---|
| `enter` | `from=left\|right\|top\|bottom`, `dur`, `ease` | Slide in from offscreen |
| `move` | `to=(x,y)`, `dur`, `ease` | Translate to position |
| `fade_in` | `dur` | Opacity 0 → 1 |
| `fade_out` | `dur` | Current opacity → 0 |
| `scale` | `to=NUM`, `dur`, `ease` | Animate scale |
| `rotate` | `to=NUM` (degrees), `dur` | Animate rotation |
| `shake` | `intensity=NUM` (px, default 5), `dur` | Horizontal oscillation, returns to origin |
| `say` | `"text"` (positional), `dur` | Speech bubble above actor |
| `throw` | `assetName` (positional), `to=actorName`, `dur` | Projectile animation |
| `play` | `seqName` (positional), named params | Expand sequence inline |

### Figure-Only Actions

| Action | Parameters | Behaviour |
|---|---|---|
| `punch` | `side=left\|right` (default `right`), `dur` | Swing arm out and back |
| `kick` | `side=left\|right` (default `right`), `dur` | Swing leg out and back |
| `rotate_part` | `part=STRING`, `to=NUM` (degrees), `dur` | Rotate named body part |
| `face` | `"emoji"` (positional) | Instant emoji face swap (seek-safe) |

### Valid `part` Names for `rotate_part`

`head`, `face`, `body`, `arm_left`, `arm_right`, `leg_left`, `leg_right`

### Common Parameters

| Parameter | Type | Default | Present on |
|---|---|---|---|
| `dur` | float (seconds) | `0.5` | All timed actions |
| `ease` | string | `linear` | `enter`, `move`, `scale`, `rotate` |

### Easing Values

| Token | CSS Equivalent |
|---|---|
| `linear` | `linear` |
| `in` | `ease-in` |
| `out` | `ease-out` |
| `inout` | `ease-in-out` |

---

## Ordering Rules

1. `var` declarations must come before their `${ref}` usage
2. `def` blocks must come before actors that use the template
3. `seq` blocks must come before events that `play` them
4. `asset` declarations must come before actors that reference them
5. `actor` declarations must come before events that target them
6. `scene` may appear at most once (convention: first non-var statement)

Recommended order:
```
var declarations
scene
def blocks
seq blocks
asset declarations
actor declarations
timeline events (sorted by @time)
```

---

## Generation Patterns

### Pattern 1: Simple Text Animation

```markdy
scene width=600 height=300 bg=white

actor title = text("Your Text") at (150, 120) size 48 opacity 0

@0.3: title.fade_in(dur=0.6)
@1.5: title.move(to=(200, 120), dur=0.8, ease=out)
```

### Pattern 2: Figure Entrance + Dialogue

```markdy
scene width=800 height=400 bg=#f5f5ff

actor person = figure(#c68642, m, 😊) at (400, 200)

@0.0: person.enter(from=left, dur=0.8)
@1.2: person.say("Hello!", dur=1.5)
@1.2: person.face("😄")
@3.0: person.face("😎")
```

### Pattern 3: Two Characters Interacting

```markdy
scene width=900 height=450 bg=#fff5f9

var y = 200

def character(skin, face) {
  figure(${skin}, m, ${face})
}

actor alice = character(#fad4c0, 😊) at (200, ${y})
actor bob   = character(#c68642, 😏) at (700, ${y})

@0.0: alice.enter(from=left, dur=0.8)
@0.3: bob.enter(from=right, dur=0.8)
@1.5: alice.say("Hi Bob!", dur=1.2)
@2.0: bob.face("😄")
@2.8: bob.say("Hey Alice!", dur=1.2)
```

### Pattern 4: Reusable Choreography

```markdy
scene width=900 height=450 bg=white

def fighter(skin, face) {
  figure(${skin}, m, ${face})
}

seq punch_combo(side) {
  @+0.0: $.punch(side=${side}, dur=0.3)
  @+0.05: $.shake(intensity=5, dur=0.3)
}

seq wave_arm(arm, angle) {
  @+0.0: $.rotate_part(part=${arm}, to=${angle}, dur=0.3)
  @+0.3: $.rotate_part(part=${arm}, to=25, dur=0.3)
}

actor a = fighter(#c68642, 😤) at (300, 200)
actor b = fighter(#8d5524, 😡) at (600, 200)

@0.0: a.enter(from=left, dur=0.8)
@0.3: b.enter(from=right, dur=0.8)
@2.0: a.play(wave_arm, arm=arm_right, angle=-80)
@3.0: a.play(punch_combo, side=right)
@3.1: b.face("😵")
```

### Pattern 5: Object Throwing

```markdy
scene width=800 height=400 bg=white

asset ball = icon("noto:basketball")

actor thrower = figure(#c68642, m, 😎) at (150, 200)
actor catcher = figure(#8d5524, m, 😊) at (650, 200)

@0.0: thrower.enter(from=left, dur=0.6)
@0.3: catcher.enter(from=right, dur=0.6)
@1.5: thrower.throw(ball, to=catcher, dur=0.8)
@2.3: catcher.shake(intensity=4, dur=0.3)
@2.3: catcher.face("😵")
```

---

## Common Mistakes to Avoid

| Mistake | Fix |
|---|---|
| Using `#comment` inside `var` value | `var` lines skip comment stripping — `#hex` is safe |
| Referencing actor before declaration | Move `actor` line above the `@time` event |
| Using `punch`/`kick`/`face`/`rotate_part` on non-figure | These only work on `figure` actors |
| Missing quotes on `say` text | `say("text")` — text must be quoted |
| Forgetting `$` in seq body | Use `$` not the actor name: `@+0.0: $.action(...)` |
| Using absolute `@time` in seq | Use relative `@+offset` inside seq blocks |
| Putting multiple statements on one line | One statement per line |
| Unclosed `def` or `seq` block | Every `{` needs a matching `}` on its own line |

---

## AST Shape (for programmatic use)

The `parse()` function returns a `SceneAST`:

```typescript
interface SceneAST {
  meta: {
    width: number;       // default 800
    height: number;      // default 400
    fps: number;         // default 30
    bg: string;          // default "white"
    duration?: number;   // auto-computed if omitted
  };
  assets: Record<string, { type: "image" | "icon"; value: string }>;
  actors: Record<string, {
    type: "sprite" | "text" | "box" | "figure";
    args: string[];
    x: number;
    y: number;
    scale?: number;
    rotate?: number;
    opacity?: number;
    size?: number;
  }>;
  events: Array<{
    time: number;
    actor: string;
    action: string;
    params: Record<string, unknown>;
    line: number;
  }>;
  defs: Record<string, { params: string[]; actorType: string; bodyArgs: string[] }>;
  seqs: Record<string, { params: string[]; events: Array<{ offset: number; action: string; paramsRaw: string }> }>;
  vars: Record<string, string>;
}
```

---

## Validation Checklist

When generating MarkdyScript, verify:

- [ ] Every referenced actor is declared before its first event
- [ ] Every referenced asset is declared before its actor
- [ ] Every `play()` references a declared `seq`
- [ ] Actor types using templates reference a declared `def`
- [ ] `figure`-only actions (`punch`, `kick`, `rotate_part`, `face`) target figure actors
- [ ] `throw` references a declared asset name and a declared actor in `to=`
- [ ] All `def` and `seq` blocks have matching `}` on their own line
- [ ] `@time` uses decimal seconds (e.g., `@2.5:` not `@2.5s:`)
- [ ] No trailing colons on non-event lines
- [ ] `var` lines are above any line that uses `${varName}`
- [ ] `rotate_part` uses valid part names: `head`, `face`, `body`, `arm_left`, `arm_right`, `leg_left`, `leg_right`
- [ ] Emoji in `face()` is quoted: `face("😡")` not `face(😡)`
- [ ] Duration values compute correctly: `time + dur` of last event ≈ total scene length

---

## Integration Code

### Browser (Vanilla)

```typescript
import { createPlayer } from "@markdy/renderer-dom";

const player = createPlayer({
  container: document.getElementById("scene")!,
  code: generatedMarkdyScript,
  autoplay: true,
});
```

### Astro Component

```astro
---
import { Markdy } from "@markdy/astro";
---
<Markdy code={generatedMarkdyScript} width={800} height={400} autoplay />
```

### Parse Only (validation)

```typescript
import { parse, ParseError } from "@markdy/core";

try {
  const ast = parse(generatedMarkdyScript);
  // ast.events.length, ast.actors, etc.
} catch (e) {
  if (e instanceof ParseError) {
    // e.line — exact line number of the error
    // e.message — human-readable description
  }
}
```
