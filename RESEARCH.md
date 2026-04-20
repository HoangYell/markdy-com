# RESEARCH

Prior art, constraints, and design rationale for the current round of
MarkdyScript enrichment.

## The baseline mental model (ground truth)

MarkdyScript is a line-based, non-Turing-complete DSL that describes 2-D
animated scenes. Every statement is one line. Everything composes by string
substitution (`${var}`) and three orthogonal abstractions — `var`, `def`, `seq`.
Time is a single floating-point axis (`@T: actor.action(...)`). The parser
returns a flat `SceneAST`; the renderer walks it into WAAPI animations.

The DSL's strongest property is that it has *one way* to do each thing:

- One way to declare a constant (`var`).
- One way to introduce a new actor type (`def`).
- One way to reuse a chunk of timeline (`seq`).
- One way to advance time (`@T:`).
- One way to target a thing (`actor.action(...)`).

That single-path-per-concept is exactly what makes it LLM-friendly. The
enrichment below preserves it: every new feature is a new token class, not
a reinterpretation of an old one.

## Prior art we read before designing the enrichment

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
context (including LLM generations) benefits from it. We spell it `@+N:`
across the main timeline and inside chapters.

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
`begin`, `dur`, `end`, `from`, `to`, `by`. Markdy already mirrors that
attitude; this round adds `camera` and `caption` in the same spirit rather
than adding a Turing-complete expression language.

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

## The three laws of enrichment (why)

1. **Law of Additive Extension.** New features are new tokens, never
   reinterpretations of old tokens. Every existing program's meaning is
   stable forever. The grammar grows; it does not mutate.

2. **Law of Must-Ignore.** Unknown tokens that might appear in future
   enrichments are skipped by older parsers with a soft warning. This is
   the Postel's Law / HTML approach — the file is still useful when the
   parser is behind the spec. The `!` prefix opts a token into hard-fail
   for cases where semantic correctness is non-negotiable.

3. **Law of Progressive Disclosure.** A user who knows only the baseline
   syntax can still write every valid baseline program after the
   enrichment without learning a single new thing. The cognitive load is
   additive — you pay for what you use.

## Why a separate `@markdy/compat`

Backwards compatibility is a standalone product:

- It runs in CI on every PR to prove every canonical baseline fixture
  still parses *and renders identically* after any parser change.
- It validates the `system-prompt.md` by fuzzing the LLM prompt against
  the parser and the renderer.

Keeping the compat logic in its own package means it cannot accidentally
acquire dependencies on features that postdate a given fixture.

## Why `camera` is a built-in primitive

A pan/zoom/shake primitive is the single thing most requested when people
try to write explainer videos. Adding a *camera as an actor* would have
been tempting — but this would overload `actor` semantics (one actor, no
position, acts on the global viewport). A reserved actor name `camera`
keeps the grammar honest: one statement type, one concept.

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
event." It cuts the arithmetic entirely. The shorthand was already
available inside `seq` blocks; making it work at the top level and
inside chapters was the obvious generalization.

## Why we keep things the same

Everything not in the new feature list stays identical:

- `var`, `def`, `seq`, `actor`, `asset`, `scene`, `@T:`, modifiers, all
  existing actions and actor types.
- Strict parser errors with line numbers (for everything that was
  already a hard error — the new soft-warning taxonomy only *adds*
  forgiveness, it never removes strictness).
- Bounds validation.
- `figure`'s skin/gender/face args.
- `face()` being seek-safe.
- The single-timeline mental model.
