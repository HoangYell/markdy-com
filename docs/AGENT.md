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
6. The parser is **forgiving by default** — unknown actions, modifiers, and scene keys emit soft `ParseWarning` entries on `ast.warnings`; structural errors (bad syntax, undeclared actors, figure-only action on non-figure, unclosed blocks) still throw `ParseError` with a line number
7. Opt into **hard-fail** on unknown actions by prefixing with `!` — e.g. `hero.!shake(...)`

---

## Grammar (Exact)

```
program        = line*
line           = statement | comment | blank

statement      = var_decl | scene_decl | asset_decl | actor_decl
               | event | def_block | seq_block
               | chapter_block | import_decl | preset_call

var_decl       = "var" IDENT "=" REST_OF_LINE
scene_decl     = "scene" (IDENT "=" VALUE)*
asset_decl     = "asset" IDENT "=" ("image" | "icon") "(" QUOTED ")"
actor_decl     = "actor" IDENT "=" TYPE "(" ARGS? ")" POSITION TRAILER?
position       = "at" "(" NUM "," NUM ")"             # any actor type
               | "at" ANCHOR                          # caption actors only
anchor         = "top" | "bottom" | "center"
trailer        = modifier* ("with" with_pairs)?
modifier       = ("scale" | "rotate" | "opacity" | "size" | "z") NUM
with_pairs     = MOD_KEY "=" VALUE ("," MOD_KEY "=" VALUE)*
event          = abs_event | rel_event
abs_event      = "@"  NUM ":" EVT_ACTOR "." BANG? ACTION "(" PARAMS? ")"
rel_event      = "@+" NUM ":" EVT_ACTOR "." BANG? ACTION "(" PARAMS? ")"
EVT_ACTOR      = IDENT | "camera"                      # "camera" is reserved
BANG           = "!"                                   # must-understand prefix

def_block      = "def" IDENT "(" PARAM_LIST? ")" "{" NEWLINE
                   TYPE "(" ARGS? ")" NEWLINE
                 "}"

seq_block      = "seq" IDENT ("(" PARAM_LIST? ")")? "{" NEWLINE
                   seq_event+ NEWLINE
                 "}"
seq_event      = "@+" NUM ":" "$." BANG? ACTION "(" PARAMS? ")"

chapter_block  = "scene" QUOTED "{" NEWLINE
                   (event | blank | comment)*
                 "}"

import_decl    = "import" QUOTED "as" IDENT
preset_call    = "preset" IDENT "(" ARGS? ")"          # must be sole top-level content

PARAMS         = PARAM ("," PARAM)*
PARAM          = VALUE                           # positional
               | IDENT "=" VALUE                  # named
VALUE          = QUOTED | NUM | TUPLE | DOTTED_IDENT
TUPLE          = "(" NUM "," NUM ")"
QUOTED         = '"' [^"]* '"'
NUM            = [0-9]+ ("." [0-9]+)?
IDENT          = [a-zA-Z_][a-zA-Z0-9_]*
DOTTED_IDENT   = IDENT ("." IDENT)*                    # allows ns-scoped refs
PARAM_LIST     = IDENT ("," IDENT)*
REST_OF_LINE   = .+                                    # no comment stripping on var lines
comment        = "#" .*
TYPE           = "sprite" | "text" | "box" | "figure" | "caption" | DEF_NAME
MOD_KEY        = "scale" | "rotate" | "opacity" | "size" | "z"
ACTION         = IDENT
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

- At most **one** scene declaration per program (throws on duplicate at top level)
- Must appear before actors/events (convention, not enforced)
- A scene **header** is never legal inside a chapter block — use `scene "title" { ... }` there
- Unknown scene keys (e.g. `scene zoom=1`) emit `unknown-scene-key` warnings, they don't throw

### `scene "title" { ... }` — Chapter Block

```
scene "chapter name" {
  @+<offset>: <actor>.<action>(<params>)
  ...
}
```

- Groups a run of events under a named heading for timeline UIs
- Appears in `ast.chapters[] = { name, startLine, startTime, endTime }`
- Every event inside the block has `ev.chapter = "<name>"`
- `@+N:` inside a chapter is relative to the **chapter's** previous event (not the global timeline)
- Chapters can't nest — close one before opening the next
- Adjacent chapters chain: the next chapter's `startTime` = previous chapter's `endTime`

### `asset` — Asset Declaration

```
asset <name> = image("<url>")
asset <name> = icon("<set:name>")
```

### `actor` — Actor Declaration

```
actor <name> = <type>(<args>) at (<x>, <y>) [modifiers...]
actor <name> = <type>(<args>) at (<x>, <y>) with <key>=<val>, <key>=<val>
actor <name> = caption("<text>") at top | bottom | center
```

**Built-in types:**

| Type | Arguments | Notes |
|---|---|---|
| `sprite` | `assetName` | References a declared asset |
| `text` | `"quoted string"` | Renders text label |
| `box` | *(none)* | 100×100 grey box |
| `figure` | `skinColor [, gender [, face]]` | Emoji stick figure |
| `caption` | `"quoted string"` | Auto-centered overlay text; see anchor syntax below |

The actor name `camera` is **reserved**. Never declare `actor camera = ...` — reference `camera.pan`, `camera.zoom`, `camera.shake` directly in events.

**Figure arguments in detail:**

| Position | Name | Type | Default | Valid values |
|---|---|---|---|---|
| 1 | skinColor | CSS colour | `#ffdbac` | Any hex/named colour |
| 2 | gender | string | `m` | `m`, `f` |
| 3 | face | emoji | `😶` (m) / `🙂` (f) | Any single emoji |

**Caption positioning:** captions use anchor keywords (`at top | bottom | center`) instead of numeric coordinates. They're auto-centered horizontally (`x = scene.width / 2`) and placed at `~12%` / `~88%` / `50%` of scene height respectively. Numeric `at (x, y)` is a `ParseError` for captions; anchor syntax on non-captions is a `ParseError` too.

**Modifiers** — two equivalent forms, mix freely on one line:

| Modifier | Type | Default |
|---|---|---|
| `scale` | float | `1` |
| `rotate` | float (degrees) | `0` |
| `opacity` | float (0–1) | `1` |
| `size` | int (px) | — |
| `z` | int | — |

```markdy
# Space-separated
actor hero = figure(#c68642, m, 😎) at (100, 100) scale 1.5 opacity 0.8

# Unified with-form
actor hero = figure(#c68642, m, 😎) at (100, 100) with scale=1.5, opacity=0.8

# Mixed — space-form must come first, then `with`
actor hero = figure(#c68642, m, 😎) at (100, 100) scale 1.5 with opacity=0.8
```

Unknown modifier keys emit `unknown-modifier` warnings (not errors).

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

Two forms share the same event grammar:

```
@<seconds>:  <actor>.<action>(<params>)       # absolute time
@+<offset>:  <actor>.<action>(<params>)       # relative to previous event's end
```

- `@+N:` takes the end-time of the previous event in the current scope and adds `N` seconds (end = `time + dur`, dur defaulting to `0`)
- At the top level, "previous event" means the previous top-level event (chapters chain in)
- Inside a chapter, "previous event" is the previous event in that chapter

**Must-understand prefix**: write `actor.!action(...)` to force a `ParseError` if the action is unknown. Without `!`, unknown actions emit `unknown-action` warnings and the renderer no-ops them.

**Special action `play`** expands a sequence inline:

```
@<time>: <actor>.play(<seqName>[, key=value, ...])
@<time>: <actor>.play(<ns.seqName>[, key=value, ...])   # namespaced via import
```

**`camera` actions** target the camera, not an actor:

```
@<time>: camera.pan(to=(<cx>, <cy>), dur=<s>, ease=<curve>)
@<time>: camera.zoom(to=<scalar>, dur=<s>)
@<time>: camera.shake(intensity=<px>, dur=<s>)
```

Unknown camera actions emit `unknown-camera-action` warnings.

### `import` — Namespaced Composition

```
import "<relative-path>.markdy" as <namespace>
```

- Records the declaration in `ast.imports[] = { path, namespace, line }`
- The **host** (playground, CLI, Astro plugin) resolves the path and passes `{ imports: { <namespace>: SceneAST } }` to `parse()`
- When resolved, the child's `vars`, `defs`, and `seqs` merge into the parent under `ns.name`
- Reference namespaced symbols with dotted names:
  - Actor type: `actor hero = chars.fighter(...) at (...)`
  - Variable: `${chars.skin_tone}`
  - Sequence: `@0.0: hero.play(anim.combo_strike)`
- Unresolved imports emit `import-unresolved` warnings; the renderer no-ops references

### `preset` — Built-in Scene Macros

```
preset <name>(<arg1>, <arg2>, ...)
```

Presets are parse-time macros — the MarkdyScript source is literally replaced with the preset's expansion before parsing continues. A file whose **only top-level content** is a single `preset ...` call becomes a complete scene.

Shipping presets: `meme`, `explainer`, `reaction`, `pov`, `typing`, `terminal`, `chat_bubble`, `vs`, `tutorial_step`, `countdown`, `reveal`, `glitch`, `zoom_punchline`, `before_after`, `tier_list`.

---

## Complete Action Table

### Universal Actions (all actor types)

| Action | Parameters | Behaviour |
|---|---|---|
| `enter` | `from=left\|right\|top\|bottom`, `dur`, `ease` | Slide in from offscreen + fade to opacity 1 |
| `exit` | `to=left\|right\|top\|bottom`, `dur`, `ease` | Slide off-screen + fade to opacity 0 |
| `move` | `to=(x,y)`, `dur`, `ease` | Translate to position |
| `fade_in` | `dur` | Opacity 0 → 1 |
| `fade_out` | `dur` | Current opacity → 0 |
| `scale` | `to=NUM`, `dur`, `ease` | Animate scale |
| `rotate` | `to=NUM` (degrees), `dur` | Animate rotation |
| `shake` | `intensity=NUM` (px, default 5), `dur` | Horizontal oscillation, returns to origin |
| `say` | `"text"` (positional), `dur` | Speech bubble above actor |
| `throw` | `assetName` (positional), `to=actorName`, `dur` | Projectile animation |
| `play` | `seqName` (positional), named params | Expand sequence inline |

### Figure-Only Actions (hard-fail on non-figure actors)

| Action | Parameters | Behaviour |
|---|---|---|
| `punch` | `side=left\|right` (default `right`), `dur` | Swing arm out and back |
| `kick` | `side=left\|right` (default `right`), `dur` | Swing leg out and back |
| `rotate_part` | `part=STRING`, `to=NUM` (degrees), `dur` | Rotate named body part |
| `pose` | `arm_left=NUM`, `arm_right=NUM`, `leg_left=NUM`, `leg_right=NUM`, `head=NUM`, `body=NUM`, `dur` | Set multiple parts at once |
| `wave` | `side=left\|right` (default `right`), `dur` | Wave gesture (arm up, oscillate, return) |
| `nod` | `dur` | Head nod gesture (down-up twice) |
| `face` | `"emoji"` (positional) | Instant emoji face swap (seek-safe) |
| `jump` | `height=NUM` (px, default 30), `dur` | Jump with squash-and-stretch, returns to origin |
| `bounce` | `intensity=NUM` (px, default 15), `count=NUM` (default 3), `dur` | Diminishing vertical bounce |

### Camera Actions (via reserved `camera` actor)

| Action | Parameters | Behaviour |
|---|---|---|
| `pan` | `to=(x,y)`, `dur`, `ease` | Pan so `(x,y)` is centered in the viewport |
| `zoom` | `to=NUM` (scalar), `dur`, `ease` | Zoom the scene-content layer |
| `shake` | `intensity=NUM` (px, default 8), `dur` | Camera-level shake (distinct from actor shake) |

Unknown camera actions soft-warn (`unknown-camera-action`) and no-op. `camera` is not declared as an actor — reference it directly in events.

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

### Pattern 6: Expressive Figure with Pose and Gestures

```markdy
scene width=800 height=400 bg=#f0f4ff

actor hero = figure(#c68642, m, 😎) at (400, 200)

@0.0: hero.enter(from=left, dur=0.8)
@1.0: hero.wave(side=right, dur=0.8)
@1.0: hero.face("😄")
@2.0: hero.say("Hey there!", dur=1.2)
@2.0: hero.nod(dur=0.4)
@3.5: hero.pose(arm_left=70, arm_right=-70, dur=0.4)
@4.0: hero.jump(height=25, dur=0.5)
@4.5: hero.bounce(intensity=10, count=2, dur=0.4)
@5.0: hero.pose(arm_left=0, arm_right=0, dur=0.3)
@5.0: hero.face("😎")
```

### Pattern 7: Layered Scene with Z-Index

```markdy
scene width=800 height=400 bg=white

actor bg_text = text("Background") at (300, 180) size 60 opacity 0.3 z 1
actor hero    = figure(#c68642, m, 😎) at (400, 200) z 5
actor overlay = text("Foreground") at (250, 100) size 24 opacity 0 z 10

@0.0: hero.enter(from=left, dur=0.8)
@1.0: overlay.fade_in(dur=0.5)
```

### Pattern 8: Meme-Format Caption Layout

```markdy
scene width=720 height=720 bg=#111

actor top    = caption("top line") at top
actor hero   = figure(#c68642, m, 😎) at (360, 430)
actor bottom = caption("bottom line") at bottom

@0.0:  top.fade_in(dur=0.3)
@+0.2: hero.enter(from=bottom, dur=0.6)
@+0.2: bottom.fade_in(dur=0.3)
@+0.5: hero.bounce(intensity=20, count=2, dur=0.8)
```

### Pattern 9: Chaptered Narrative with Relative Time

```markdy
scene width=900 height=500 bg=#f5f5ff

actor hero = figure(#c68642, m, 😎) at (450, 280)

scene "hook" {
  @+0.0: hero.enter(from=bottom, dur=0.6)
  @+0.2: hero.say("this goes fast", dur=1.0)
}

scene "beat" {
  @+0.0: hero.face("😵")
  @+0.3: hero.shake(intensity=8, dur=0.4)
  @+0.4: hero.say("what?!", dur=1.0)
}

scene "payoff" {
  @+0.0: hero.face("😂")
  @+0.2: hero.jump(height=30, dur=0.5)
}
```

### Pattern 10: Camera-Driven Focus Pulls

```markdy
scene width=1280 height=720 bg=#101424

actor hero    = figure(#c68642, m, 😎) at (300, 400)
actor villain = figure(#8d5524, m, 😈) at (980, 400)
actor title   = caption("ROUND 1") at top

@0.0:  title.fade_in(dur=0.4)
@+0.5: camera.pan(to=(300, 400), dur=0.8, ease=out)
@+0.2: camera.zoom(to=1.4, dur=0.6)
@+0.8: hero.punch(side=right, dur=0.3)
@+0.0: villain.shake(intensity=10, dur=0.4)
@+0.4: camera.zoom(to=1.0, dur=0.6)
@+0.0: camera.pan(to=(640, 400), dur=0.6)
@+0.8: title.exit(to=top, dur=0.4)
```

### Pattern 11: Importing Shared Characters

```markdy
# characters.markdy
var skin_warm = #c68642
var skin_cool = #8d5524
def fighter(skin, face) {
  figure(${skin}, m, ${face})
}
```

```markdy
# main.markdy — host resolves "./characters.markdy" as `chars`
import "./characters.markdy" as chars
scene width=900 height=500 bg=white

actor hero    = chars.fighter(${chars.skin_warm}, 😎) at (300, 260)
actor villain = chars.fighter(${chars.skin_cool}, 😤) at (600, 260)

@0.0:  hero.enter(from=left, dur=0.7)
@+0.0: villain.enter(from=right, dur=0.7)
@+0.2: hero.face("😏")
```

### Pattern 12: Preset Shorthand

For common formats — a single line is a full scene:

```markdy
preset meme("when the bug is finally fixed", "it was a typo")
```

Other ready-to-use preset names: `explainer`, `reaction`, `pov`, `chat_bubble`, `vs`, `tutorial_step`, `countdown`, `reveal`, `glitch`, `zoom_punchline`, `before_after`, `tier_list`, `typing`, `terminal`.

---

## Common Mistakes to Avoid

| Mistake | Fix |
|---|---|
| Using `#comment` inside `var` value | `var` lines skip comment stripping — `#hex` is safe |
| Referencing actor before declaration | Move `actor` line above the `@time` event |
| Using `punch`/`kick`/`face`/`jump`/`bounce` on non-figure | These only work on `figure` actors |
| Missing quotes on `say` text | `say("text")` — text must be quoted |
| Forgetting `$` in seq body | Use `$` not the actor name: `@+0.0: $.action(...)` |
| Using absolute `@time` in seq | Use relative `@+offset` inside seq blocks |
| Putting multiple statements on one line | One statement per line |
| Unclosed `def`, `seq`, or chapter block | Every `{` needs a matching `}` on its own line |
| Declaring `actor camera = ...` | Reserved — just write `camera.pan(...)` in an event |
| `actor c = caption("x") at (100, 100)` | Captions use anchor syntax: `at top\|bottom\|center` |
| `scene width=2000` inside a chapter block | Move scene header outside or use `scene "title" { ... }` for a sub-chapter |
| Using `!action` for normal forgiving behavior | Drop the `!` — without it, unknown actions warn instead of throwing |
| Expecting imports to auto-resolve | The parser never opens files; the host must pass `{ imports: { ns: ast } }` |

---

## AST Shape (for programmatic use)

The `parse(source, opts?)` function returns a `SceneAST`:

```typescript
interface ParseOptions {
  /** Host-resolved namespaces for `import "..." as ns`. */
  imports?: Record<string, SceneAST>;
}

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
    type: "sprite" | "text" | "box" | "figure" | "caption";
    args: string[];
    x: number;
    y: number;
    anchor?: "top" | "bottom" | "center";   // caption-only
    scale?: number;
    rotate?: number;
    opacity?: number;
    size?: number;
    z?: number;
  }>;
  events: Array<{
    time: number;
    actor: string;                 // may be "camera"
    action: string;
    params: Record<string, unknown>;
    line: number;
    chapter?: string;              // set when the event lives in a chapter block
  }>;
  defs: Record<string, { params: string[]; actorType: string; bodyArgs: string[] }>;
  seqs: Record<string, { params: string[]; events: Array<{ offset: number; action: string; paramsRaw: string }> }>;
  vars: Record<string, string>;
  chapters: Array<{ name: string; startLine: number; startTime: number; endTime: number }>;
  imports: Array<{ path: string; namespace: string; line: number }>;
  warnings: Array<{
    kind:
      | "unknown-action"
      | "unknown-camera-action"
      | "unknown-modifier"
      | "unknown-scene-key"
      | "import-unresolved";
    message: string;
    line: number;
  }>;
}
```

---

## Validation Checklist

When generating MarkdyScript, verify:

- [ ] Every referenced actor is declared before its first event
- [ ] Every referenced asset is declared before its actor
- [ ] Every `play()` references a declared `seq` (namespaced `ns.name` OK if imported)
- [ ] Actor types using templates reference a declared `def` (namespaced `ns.name` OK if imported)
- [ ] `figure`-only actions (`punch`, `kick`, `rotate_part`, `pose`, `wave`, `nod`, `face`, `jump`, `bounce`) target figure actors
- [ ] `throw` references a declared asset name and a declared actor in `to=`
- [ ] All `def`, `seq`, and chapter (`scene "title" { ... }`) blocks have matching `}` on their own line
- [ ] `@time` uses decimal seconds (e.g., `@2.5:` not `@2.5s:`)
- [ ] `@+N:` is only used after at least one event exists in the same scope (or is intentionally offsetting from `0.0`)
- [ ] No trailing colons on non-event lines
- [ ] `var` lines are above any line that uses `${varName}`
- [ ] `rotate_part` uses valid part names: `head`, `face`, `body`, `arm_left`, `arm_right`, `leg_left`, `leg_right`
- [ ] Emoji in `face()` is quoted: `face("😡")` not `face(😡)`
- [ ] Captions use anchor syntax (`at top|bottom|center`), not numeric coordinates
- [ ] Never declare `actor camera = ...` — it's reserved
- [ ] Never nest chapters or place a `scene <k>=<v>` header inside a chapter
- [ ] If using `import`, the host must supply `{ imports: { <ns>: ast } }` to `parse()` — otherwise references warn and no-op
- [ ] Duration values compute correctly: `time + dur` of last event ≈ total scene length

---

## Integration Code

### Browser (Vanilla)

```typescript
import { createPlayer, parse } from "@markdy/renderer-dom";

const player = createPlayer({
  container: document.getElementById("scene")!,
  code: generatedMarkdyScript,
  autoplay: true,
  loop: true,         // loop when animation ends (default: true)
  copyright: true,    // "Powered by Markdy" badge below viewport (default: true)
  progressBar: true,  // rainbow border progress indicator (default: true)
  // Surface soft parse warnings. Return void; warnings are non-fatal.
  onWarning: (w) => console.warn(`[${w.kind}] ${w.message} (line ${w.line})`),
  // Resolve `import "..." as ns` by pre-parsing the referenced source.
  imports: {
    chars: parse(await fetch("/chars.markdy").then(r => r.text())),
  },
});
```

### Astro Component

```astro
---
import { Markdy } from "@markdy/astro";
---
<Markdy code={generatedMarkdyScript} width={800} height={400} autoplay />
{/* Disable branding if embedding in your own product: */}
<Markdy code={generatedMarkdyScript} width={800} height={400} autoplay copyright={false} progressBar={false} />
```

### Parse Only (validation)

```typescript
import { parse, ParseError } from "@markdy/core";
import type { SceneAST } from "@markdy/core";

try {
  const ast = parse(generatedMarkdyScript, {
    // Optional — pass resolved ASTs for any `import "..." as ns` statements
    imports: {
      chars: parse(charactersSource),
    },
  });
  // ast.events, ast.actors, ast.chapters, ast.warnings, ...
  if (ast.warnings.length > 0) {
    for (const w of ast.warnings) {
      console.warn(`[${w.kind}] ${w.message} (line ${w.line})`);
    }
  }
} catch (e) {
  if (e instanceof ParseError) {
    // e.line — exact line number of the error
    // e.message — human-readable description
  }
}
```
