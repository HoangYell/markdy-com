# MarkdyScript Tutorial

A step-by-step guide to creating animated docs, product explainers, architecture diagrams, and diagram-like scenes with MarkdyScript.

> **Prerequisites:** Basic familiarity with any text editor. No programming required to write MarkdyScript.

---

## Table of Contents

1. [Learning Path](#learning-path)
2. [Your First Scene](#1-your-first-scene)
3. [Adding Movement](#2-adding-movement)
4. [Multiple Actors](#3-multiple-actors)
5. [Working with Images](#4-working-with-images)
6. [Optional Character Guides](#5-optional-character-guides)
7. [Captions & Effects](#6-captions--effects)
8. [Variables](#7-variables)
9. [Templates](#8-templates)
10. [Sequences](#9-sequences)
11. [Putting It All Together](#10-putting-it-all-together)

---

## Learning Path

Use this path when learning Markdy for animated diagrams, architecture visualization, and AI-generated technical explainers:

1. **Quick Start** — install `@markdy/core`, `@markdy/renderer-dom`, and optionally `@markdy/stdlib-systems`.
2. **Core Concepts** — understand scenes, actors, timeline events, chapters, and camera movement.
3. **Basic Examples** — write text, boxes, sprites, captions, groups, and simple movement.
4. **Real-World Examples** — study URL shorteners, OAuth, Kubernetes, video pipelines, and timeline services in `examples/showcase/`.
5. **Best Practices** — keep labels short, avoid overlap, use semantic nodes, and split long flows into chapters.
6. **Advanced Features** — use `var`, `def`, `seq`, imports, systems flow edges, and premium effects.
7. **AI Agent Workflow** — give `docs/AGENT.md` to the model, ask for MarkdyScript, lint it, and iterate on layout/timing.
8. **Production Use Cases** — embed in Astro/MDX docs, launch posts, onboarding, architecture reviews, and internal platform docs.

Quick install:

```sh
npm i @markdy/core @markdy/renderer-dom @markdy/stdlib-systems
```

AI prompt starter:

> Use `docs/AGENT.md`. Create a 1280x720 animated architecture diagram for an OAuth login flow. Use chapters, semantic systems nodes, labeled request/response edges, short labels, and a final camera focus on the token exchange.

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

## 5. Optional Character Guides

The `figure` actor type creates optional presenter guides. Use them when a person-like guide makes the explainer clearer; most product flows can use `text`, `box`, `sprite`, and `caption` actors instead.

```markdy
scene width=800 height=400 bg=#f5f5ff

# Arguments: skinColor, gender, startingFace
actor guide = figure(#c68642, m, 🙂) at (220, 220)
actor card = box() at (500, 170) scale 1.4
actor label = text("Explain the flow") at (500, 230) size 24

@0.0: guide.enter(from=left, dur=0.8)
@0.5: card.fade_in(dur=0.4)
@0.7: label.fade_in(dur=0.4)
```

**Figure arguments:**

| Position | What it does | Values |
|---|---|---|
| 1st | Skin colour | Any CSS colour (`#c68642`, `peachpuff`, etc.) |
| 2nd | Gender | `m` (👕🤜👟) or `f` (👗💅👠) |
| 3rd | Starting face | Any emoji (`😎`, `🙂`, `😡`, etc.) |

### Small Presenter Actions

Figures support simple actions for presenter-style scenes:

```markdy
@2.0: guide.wave(side=right, dur=0.8)
@3.0: guide.nod(dur=0.4)
@4.0: guide.say("Checks are green.", dur=1.2)
```

### Posing Multiple Parts at Once

`pose` can set several parts at once, but keep presenter poses simple and readable:

```markdy
@2.0: guide.pose(head=10, dur=0.3)
@3.0: guide.pose(head=0, dur=0.3)
```

Only the parts you specify are animated — everything else stays put.

### Built-in Gestures

Common gestures have dedicated actions:

```markdy
# Wave hello
@2.0: guide.wave(side=right, dur=0.8)

# Nod in agreement
@3.0: guide.nod(dur=0.4)

# Jump for emphasis
@4.0: guide.jump(height=30, dur=0.5)

# Bounce on landing
@5.0: guide.bounce(intensity=15, count=3, dur=0.6)
```

### Face Expressions

Swap the emoji face at any point in the timeline:

```markdy
@0.0: guy.face("😊")
@3.0: guy.face("🤔")    # thinking
@5.0: guy.face("🙂")    # ready
@7.0: guy.face("😄")    # happy again
```

Face changes are instant and **seek-safe** — scrubbing backward shows the correct face at every point.

---

## 6. Captions & Effects

Use `caption` for scene-level narration and effects like `shake` to highlight a status change:

```markdy
scene width=800 height=400 bg=#f8fafc

actor title = caption("Release checklist") at top opacity 0
actor card = box() at (350, 150) scale 1.5 opacity 0
actor status = caption("Checks passed") at bottom opacity 0

@0.0: title.fade_in(dur=0.4)
@0.5: card.fade_in(dur=0.5)
@1.2: status.fade_in(dur=0.4)
@1.6: card.shake(intensity=4, dur=0.4)
```

### Speech Bubbles

Speech bubbles are useful for presenter-style scenes:

```markdy
@1.0: guide.say("Start with the API.", dur=1.5)
@3.0: guide.say("Then show the handoff.", dur=2.0)
```

The bubble appears above the actor for `dur` seconds with fade-in/fade-out.

### Throwing Objects

```markdy
asset packet = icon("lucide:send")

@4.0: api.throw(packet, to=edge, dur=0.8)
@5.0: edge.shake(intensity=5, dur=0.4)
```

`throw` animates a projectile from one actor to another. Combine with `shake` on the target to emphasize arrival.

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
def presenter(skin, gender, face) {
  figure(${skin}, ${gender}, ${face})
}

# Use many times — works exactly like a built-in type
actor host  = presenter(#c68642, m, 🙂) at (200, 200)
actor guide = presenter(#8d5524, m, 🙂) at (600, 200)
actor lead  = presenter(#fad4c0, f, 🙂) at (400, 200)
```

Templates expand at parse time — the renderer only sees standard `figure` actors.

---

## 9. Sequences

When the same animation pattern repeats across actors, use **sequences** (`seq`):

```markdy
seq wave {
  @+0.0: $.wave(side=right, dur=0.6)
}

# Any actor can play it
@2.0: host.play(wave)
@3.0: guide.play(wave)
```

**Key concepts:**
- `$` is a placeholder for whichever actor calls `play`
- `@+offset` is **relative** time — `@+0.3` means "0.3 seconds after play starts"
- Events expand inline at parse time: `@2.0: host.play(wave)` becomes the events defined inside `seq wave`

### Parameterized Sequences

Pass arguments to make sequences flexible:

```markdy
seq greet(side) {
  @+0.0: $.wave(side=${side}, dur=0.4)
  @+0.5: $.nod(dur=0.3)
}

@5.0: host.play(greet, side=left)
@6.0: guide.play(greet, side=right)
```

---

## 10. Putting It All Together

Here's a complete scene combining everything:

```markdy
scene width=920 height=460 bg=#f8fafc

# ── Variables ──────────────────────────────────────────────
var skin_a = #c68642
var skin_b = #8d5524
var y = 200

# ── Templates ─────────────────────────────────────────────
def presenter(skin, gender, face) {
  figure(${skin}, ${gender}, ${face})
}

# ── Sequences ─────────────────────────────────────────────
seq entrance(side) {
  @+0.0: $.enter(from=${side}, dur=1.0)
}

seq wave {
  @+0.0: $.wave(side=right, dur=0.6)
}

seq celebrate {
  @+0.0: $.jump(height=20, dur=0.5)
  @+0.1: $.say("Checks passed.", dur=1.5)
}

# ── Actors ────────────────────────────────────────────────
actor host  = presenter(${skin_a}, m, 🙂) at (740, ${y})
actor guide = presenter(${skin_b}, m, 🙂) at (120, ${y})

# ── Timeline ─────────────────────────────────────────────
@0.0: host.play(entrance, side=right)
@0.3: guide.play(entrance, side=left)

@2.0: host.play(wave)
@2.5: guide.play(wave)

@4.0: host.say("Let's walk through it.", dur=1.2)
@4.5: guide.nod(dur=0.4)
@5.0: guide.say("Sounds good.", dur=1.0)

@6.5: host.face("😊")
@6.5: host.play(celebrate)
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
| `rotate_part(part, to, dur)` | Figure | Rotate a named body part; prefer simple head/guide movements in public demos |
| `pose(head, ..., dur)` | Figure | Set multiple parts at once; keep poses neutral and readable |
| `wave(side, dur)` | Figure | Wave gesture |
| `nod(dur)` | Figure | Head nod gesture |
| `jump(height, dur)` | All | Jump with squash/stretch |
| `bounce(intensity, count, dur)` | All | Diminishing vertical bounce |
| `face("emoji")` | Figure | Swap emoji face expression |

### Actor Modifiers

| Modifier | Default | Description |
|---|---|---|
| `scale` | `1` | Uniform scale factor |
| `rotate` | `0` | Rotation in degrees |
| `opacity` | `1` | Opacity (0–1) |
| `size` | — | Font/icon size in px |
| `z` | — | Z-index for layering |

### Easing Values

| Value | CSS Equivalent |
|---|---|
| `linear` | `linear` |
| `in` | `ease-in` |
| `out` | `ease-out` |
| `inout` | `ease-in-out` |
