# MarkdyScript Tutorial

A step-by-step guide to creating animated scenes with MarkdyScript — from your first text label to full stick-figure choreographies.

> **Prerequisites:** Basic familiarity with any text editor. No programming required to write MarkdyScript.

---

## Table of Contents

1. [Your First Scene](#1-your-first-scene)
2. [Adding Movement](#2-adding-movement)
3. [Multiple Actors](#3-multiple-actors)
4. [Working with Images](#4-working-with-images)
5. [Stick Figures](#5-stick-figures)
6. [Speech & Interaction](#6-speech--interaction)
7. [Variables](#7-variables)
8. [Templates](#8-templates)
9. [Sequences](#9-sequences)
10. [Putting It All Together](#10-putting-it-all-together)

---

## 1. Your First Scene

Every MarkdyScript program starts with a scene declaration and at least one actor.

```markdy
scene width=600 height=300 bg=white

actor hello = text("Hello World") at (200, 130) size 40
```

**What this does:**
- Creates a 600×300 pixel white canvas
- Places the text "Hello World" at coordinates (200, 130)
- `size 40` sets the font size to 40 pixels

> **Coordinate system:** `(0, 0)` is the top-left corner. X increases rightward, Y increases downward.

---

## 2. Adding Movement

Actors are static until you add **timeline events**. Events start with `@` followed by a time in seconds:

```markdy
scene width=600 height=300 bg=white

actor label = text("Hello World") at (50, 130) size 40 opacity 0

@0.3: label.fade_in(dur=0.6)
@1.2: label.move(to=(300, 130), dur=0.8, ease=out)
```

**Reading the timeline:**
- `@0.3` — at 0.3 seconds, fade in
- `@1.2` — at 1.2 seconds, slide to `(300, 130)` over 0.8 seconds

**Common parameters:**
- `dur` — duration in seconds (default: 0.5)
- `ease` — easing curve: `linear`, `in`, `out`, `inout`

> **Tip:** `opacity 0` in the actor declaration makes it invisible at the start — `fade_in` then reveals it.

---

## 3. Multiple Actors

You can have as many actors as you need. Events at the same time play simultaneously:

```markdy
scene width=800 height=400 bg=#f0f0f0

actor title  = text("Scene Title") at (250, 50) size 48 opacity 0
actor box1   = box() at (100, 200) opacity 0
actor box2   = box() at (350, 200) opacity 0
actor box3   = box() at (600, 200) opacity 0

# Title fades in first
@0.0: title.fade_in(dur=0.5)

# All three boxes appear together
@0.8: box1.fade_in(dur=0.4)
@0.8: box2.fade_in(dur=0.4)
@0.8: box3.fade_in(dur=0.4)

# Staggered movement
@1.5: box1.move(to=(100, 150), dur=0.6, ease=out)
@1.7: box2.move(to=(350, 150), dur=0.6, ease=out)
@1.9: box3.move(to=(600, 150), dur=0.6, ease=out)
```

> **Comments** start with `#` and are ignored by the parser.

---

## 4. Working with Images

Use **assets** to load images, then reference them with **sprite** actors:

```markdy
scene width=800 height=400 bg=white

asset logo = image("/images/logo.png")
asset fire = icon("lucide:flame")

actor pic  = sprite(logo) at (100, 100) scale 0.5
actor icon = sprite(fire) at (400, 200) size 48

@0.0: pic.enter(from=left, dur=0.8)
@1.0: pic.scale(to=1.0, dur=0.5, ease=out)
@2.0: icon.fade_in(dur=0.3)
```

**Asset types:**
- `image("url")` — renders as an `<img>` element
- `icon("set:name")` — stores in `data-icon`, compatible with Iconify

**`enter` action** — slides an actor in from offscreen:
- `from=left` (default), `from=right`, `from=top`, `from=bottom`

---

## 5. Stick Figures

The `figure` actor type creates emoji stick figures with articulatable limbs:

```markdy
scene width=800 height=400 bg=#f5f5ff

# Arguments: skinColor, gender, startingFace
actor guy = figure(#c68642, m, 😎) at (200, 200)
actor gal = figure(#fad4c0, f, 🙂) at (500, 200)

@0.0: guy.enter(from=left, dur=0.8)
@0.5: gal.enter(from=right, dur=0.8)
```

**Figure arguments:**

| Position | What it does | Values |
|---|---|---|
| 1st | Skin colour | Any CSS colour (`#c68642`, `peachpuff`, etc.) |
| 2nd | Gender | `m` (👕🤜👟) or `f` (👗💅👠) |
| 3rd | Starting face | Any emoji (`😎`, `🙂`, `😡`, etc.) |

### Body Part Actions

Figures have named body parts you can animate individually:

```markdy
# Wave: rotate the right arm up, then back down
@2.0: guy.rotate_part(part=arm_right, to=-80, dur=0.3)
@2.5: guy.rotate_part(part=arm_right, to=-20, dur=0.3)

# Tilt the head
@3.0: gal.rotate_part(part=head, to=15, dur=0.3)

# Quick punch with the left arm
@4.0: guy.punch(side=left, dur=0.3)

# Kick with the right leg
@5.0: guy.kick(side=right, dur=0.35)
```

**Part names:** `head`, `face`, `body`, `arm_left`, `arm_right`, `leg_left`, `leg_right`

### Face Expressions

Swap the emoji face at any point in the timeline:

```markdy
@0.0: guy.face("😊")
@3.0: guy.face("😡")    # angry!
@5.0: guy.face("😵")    # knocked out
@7.0: guy.face("😄")    # happy again
```

Face changes are instant and **seek-safe** — scrubbing backward shows the correct face at every point.

---

## 6. Speech & Interaction

### Speech Bubbles

```markdy
@1.0: guy.say("Hello there!", dur=1.5)
@3.0: gal.say("Nice to meet you 😊", dur=2.0)
```

The bubble appears above the actor for `dur` seconds with fade-in/fade-out.

### Throwing Objects

```markdy
asset ball = icon("noto:basketball")

@4.0: guy.throw(ball, to=gal, dur=0.8)
@5.0: gal.shake(intensity=5, dur=0.4)
```

`throw` animates a projectile from one actor to another. Combine with `shake` on the target for impact.

---

## 7. Variables

Use `var` to avoid repeating values.  Variables are substituted everywhere via `${name}`:

```markdy
var skin = #c68642
var y = 200
var bg_color = #fff5f9

scene bg=${bg_color}

actor hero = figure(${skin}, m, 😎) at (300, ${y})
```

> **Important:** `var` lines can contain `#` characters (for hex colours) — comment stripping is disabled for `var` statements.

Variables can reference earlier variables:

```markdy
var base = 100
var offset = 50
```

---

## 8. Templates

When you create multiple similar actors, **templates** (`def`) eliminate repetition:

```markdy
# Define once
def fighter(skin, face) {
  figure(${skin}, m, ${face})
}

def heroine(skin, face) {
  figure(${skin}, f, ${face})
}

# Use many times — works exactly like a built-in type
actor bruno = fighter(#c68642, 😏) at (200, 200)
actor alex  = fighter(#8d5524, 😤) at (600, 200)
actor lily  = heroine(#fad4c0, 😊) at (400, 200)
```

Templates expand at parse time — the renderer only sees standard `figure` actors.

---

## 9. Sequences

When the same animation pattern repeats across actors, use **sequences** (`seq`):

```markdy
seq wave {
  @+0.0: $.rotate_part(part=arm_right, to=-80, dur=0.3)
  @+0.3: $.rotate_part(part=arm_right, to=-25, dur=0.3)
}

# Any actor can play it
@2.0: bruno.play(wave)
@3.0: alex.play(wave)
```

**Key concepts:**
- `$` is a placeholder for whichever actor calls `play`
- `@+offset` is **relative** time — `@+0.3` means "0.3 seconds after play starts"
- Events expand inline at parse time: `@2.0: bruno.play(wave)` becomes `@2.0: bruno.rotate_part(...)` + `@2.3: bruno.rotate_part(...)`

### Parameterized Sequences

Pass arguments to make sequences flexible:

```markdy
seq punch_combo(side) {
  @+0.0: $.punch(side=${side}, dur=0.3)
  @+0.3: $.shake(intensity=5, dur=0.2)
}

@5.0: bruno.play(punch_combo, side=left)
@6.0: alex.play(punch_combo, side=right)
```

---

## 10. Putting It All Together

Here's a complete scene combining everything:

```markdy
scene width=920 height=460 bg=#fff5f9

# ── Variables ──────────────────────────────────────────────
var skin_a = #c68642
var skin_b = #8d5524
var y = 200

# ── Templates ─────────────────────────────────────────────
def fighter(skin, face) {
  figure(${skin}, m, ${face})
}

# ── Sequences ─────────────────────────────────────────────
seq entrance(side) {
  @+0.0: $.enter(from=${side}, dur=1.0)
}

seq wave {
  @+0.0: $.rotate_part(part=arm_right, to=-80, dur=0.3)
  @+0.3: $.rotate_part(part=arm_right, to=-25, dur=0.3)
}

seq celebrate {
  @+0.0: $.rotate_part(part=arm_right, to=-130, dur=0.3)
  @+0.4: $.rotate_part(part=arm_right, to=-25, dur=0.4)
  @+0.0: $.say("🎉", dur=1.5)
}

# ── Actors ────────────────────────────────────────────────
actor bruno = fighter(${skin_a}, 😏) at (740, ${y})
actor alex  = fighter(${skin_b}, 😤) at (120, ${y})

# ── Timeline ─────────────────────────────────────────────
@0.0: bruno.play(entrance, side=right)
@0.3: alex.play(entrance, side=left)

@2.0: bruno.play(wave)
@2.5: alex.play(wave)

@4.0: bruno.say("Let's go!", dur=1.2)
@4.5: alex.face("😡")
@5.0: alex.punch(side=right, dur=0.3)
@5.1: bruno.shake(intensity=8, dur=0.3)
@5.1: bruno.face("😵")

@6.5: bruno.face("😎")
@6.5: bruno.play(celebrate)
```

---

## Quick Reference Card

### Statement Types

| Statement | Syntax |
|---|---|
| Scene | `scene key=value ...` |
| Variable | `var name = value` |
| Asset | `asset name = image("url")` or `asset name = icon("set:name")` |
| Template | `def name(params) { type(args) }` |
| Sequence | `seq name(params) { @+offset: $.action(params) ... }` |
| Actor | `actor name = type(args) at (x,y) [modifiers]` |
| Event | `@time: actor.action(params)` |
| Play seq | `@time: actor.play(seqName, key=value)` |
| Comment | `# text` |

### All Actions

| Action | Works on | Description |
|---|---|---|
| `enter(from, dur, ease)` | All | Slide in from offscreen |
| `move(to, dur, ease)` | All | Move to position |
| `fade_in(dur)` | All | Fade from invisible to visible |
| `fade_out(dur)` | All | Fade to invisible |
| `scale(to, dur, ease)` | All | Animate scale |
| `rotate(to, dur)` | All | Animate rotation |
| `shake(intensity, dur)` | All | Horizontal shake |
| `say("text", dur)` | All | Show speech bubble |
| `throw(asset, to, dur)` | All | Throw projectile to target actor |
| `punch(side, dur)` | Figure | Swing arm out and back |
| `kick(side, dur)` | Figure | Swing leg out and back |
| `rotate_part(part, to, dur)` | Figure | Rotate named body part |
| `face("emoji")` | Figure | Swap emoji face expression |

### Actor Modifiers

| Modifier | Default | Description |
|---|---|---|
| `scale` | `1` | Uniform scale factor |
| `rotate` | `0` | Rotation in degrees |
| `opacity` | `1` | Opacity (0–1) |
| `size` | — | Font/icon size in px |

### Easing Values

| Value | CSS Equivalent |
|---|---|
| `linear` | `linear` |
| `in` | `ease-in` |
| `out` | `ease-out` |
| `inout` | `ease-in-out` |
