# RESEARCH

Prior art, constraints, and design rationale for Markdy v2.

## The v1 Mental Model (ground truth)

MarkdyScript v1 is a line-based, non-Turing-complete DSL that describes 2-D
animated scenes. Every statement is one line. Everything composes by string
substitution (`${var}`) and three orthogonal abstractions — `var`, `def`, `seq`.
Time is a single floating-point axis (`@T: actor.action(...)`). The parser
returns a flat `SceneAST`; the renderer walks it into `WAAPI` animations.

The DSL's strongest property is that it has *one way* to do each thing:

- One way to declare a constant (`var`).
- One way to introduce a new actor type (`def`).
- One way to reuse a chunk of timeline (`seq`).
- One way to advance time (`@T:`).
- One way to target a thing (`actor.action(...)`).

That single-path-per-concept is exactly what makes it LLM-friendly.

## Prior art we read before designing v2

### Manim

Strengths:

- Rich typographic & mathematical composition.
- Tight scene graph with nested `Scene` classes.

What we borrow: the idea of **named chapters** as a timeline-scope primitive.
Manim's `play(...)` within a `construct()` maps well to scoping a sub-timeline
while staying inside a single outer run.

What we do **not** borrow: Python as the authoring language. The DSL must be
authorable in a ChatGPT textarea without installing anything.

### Motion Canvas

Strengths:

- Generators as a first-class authoring primitive (`yield* waitFor(1)`).
- Deep timeline composition.

What we borrow: the ergonomic shorthand for *"N seconds after the previous
statement"* — Motion Canvas encourages this style, and every authoring
context (including LLM generations) benefits from it. In v2 we spell it
`@+N:` inside the main timeline (not just inside `seq` blocks).

What we do **not** borrow: generators / anything code-ish. Keep it line-based.

### Remotion

Strengths:

- React components as the authoring surface.
- MP4/GIF export is a first-class output.

What we borrow: the rendering story — render via headless Chromium driving
the actual DOM renderer at a fixed framerate. No separate canvas pipeline
to maintain.

What we do **not** borrow: React components. Markdy is still markup, not code.

### SVG SMIL

Strengths:

- Declarative, exactly the right level of expressivity for most scenes.

What we borrow: the attitude — "a few primitives, composed well." SMIL has
`begin`, `dur`, `end`, `from`, `to`, `by`. Markdy v1 already mirrors that
attitude; v2 adds `camera` and `caption` in the same spirit rather than
adding a Turing-complete expression language.

### Mermaid

Strengths:

- Absolute default for LLMs when asked "draw a diagram."
- Zero-install in most docs renderers.

What we *aspire* to: Markdy should have the same muscle memory for
"animate this."

### Rive

Strengths:

- State machines for character animation.

What we do **not** borrow: state machines. They're the wrong shape for
the 5-line tweet. The invariant (non-Turing-complete) wins.

## The Four Laws of v2 (why)

1. **Law of Additive Extension.** New features are new tokens, never
   reinterpretations of old tokens. Every existing program's meaning is
   stable forever. The grammar grows; it does not mutate.

2. **Law of Must-Ignore.** Unknown tokens introduced by future versions
   are skipped by older parsers with a soft warning. This is the Postel's
   Law / HTML approach — the file is still useful when the parser is
   behind the spec. The `!` prefix opts a token into hard-fail for cases
   where semantic correctness is non-negotiable (e.g. an encryption
   annotation in a hypothetical future).

3. **Law of Pragma-Gated Breaking Power.** Anything that would change
   existing semantics (even subtly) is only enabled after `@markdy 2`.
   Absence of the pragma = strict v1 interpretation. This keeps the
   100%-compat invariant literal, not interpretive.

4. **Law of Progressive Disclosure.** A user who knows only v1 can write
   every v1 program in v2 without learning a single new thing. The
   cognitive load of v2 is additive — you pay for what you use.

## Why a separate `@markdy/compat`

v1 → v2 compatibility is a standalone product:

- It runs in CI on every PR to prove every canonical v1 example still
  parses *and renders identically* under v2.
- It powers `npx markdy migrate` (adds `@markdy 2` pragma, modernises
  `@+N` shorthand).
- It validates the `system-prompt.md` by fuzzing the LLM prompt against
  the parser and the renderer.

Keeping the compat logic in its own package means it cannot accidentally
acquire dependencies on v2-only features.

## Why `camera` is a built-in primitive

A pan/zoom/shake primitive is the single thing most requested when people
try to write explainer videos. Adding a *camera as an actor* would have
been tempting — but this would overload `actor` semantics (one actor, no
position, acts on the global viewport). A top-level keyword `camera` keeps
the grammar honest: one statement type, one concept.

## Why `caption` and not "just text"

Captions differ from text actors in important ways for our "viral,
LLM-native" audience:

- They auto-fit (the user doesn't pick font-size, the engine does).
- They auto-time (defaults come from the event duration).
- They auto-position (`at top|bottom|center`, not `(x,y)`).

Forcing LLMs to compute `size` + `(x,y)` for every overlay was the #1
source of generation errors. A dedicated `caption` keyword removes that
entire class of bugs.

## Why `preset` expands at parse time

A preset is *not* a runtime concept. `preset meme` means "please emit
the 12 statements that define a 3-panel meme scaffold, then continue."
Expanding at parse time keeps the AST simple and the renderer ignorant
of presets. It also means `npx markdy fmt` can round-trip a file into
the presets it uses (or expand them if the user prefers).

## Why `@+N:` in the main timeline

LLMs (and humans) do a shocking amount of arithmetic when writing
animations. `@0.0: a.enter(...)\n@0.8: b.enter(...)` requires the author
to know that `enter` defaults to `dur=0.5` and then pick a small gap. If
the author changes the first `dur`, every subsequent `@T:` needs to be
updated.

`@+0.3: b.enter(...)` means "start 0.3s after the previous top-level
event." It cuts the arithmetic entirely. v1 already allows this *inside
seq blocks*; v2 allows it at the top level under `@markdy 2`.

## Why we keep things the same

Everything not in the v2 list stays identical:

- `var`, `def`, `seq`, `actor`, `asset`, `scene`, `@T:`, modifiers, all
  actions and actor types.
- Strict parser errors with line numbers.
- Bounds validation.
- `figure`'s skin/gender/face args.
- `face()` being seek-safe.
- The single-timeline mental model.
