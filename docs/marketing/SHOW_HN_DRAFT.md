# 🎯 Show HN: Markdy — I built Mermaid.js, but for web animations

*(Paste this verbatim into https://news.ycombinator.com/submit — Target: Friday 9am PT)*

---

**Title:**
```
Show HN: Markdy – I built Mermaid.js but for motion (open-source animation DSL)
```

**URL:**
```
https://markdy.com
```

**Text body (for the comments section, post immediately after submitting):**

Hi HN! I got tired of writing 80-line GSAP timelines for simple diagrams on my Astro blog. Mermaid lets you write a sequence diagram in 5 lines of text — I wanted the same for animation.

So I built Markdy: a text-based DSL where you describe actors, timelines, and motion in plain text — and the engine renders it using the browser-native Web Animations API.

```
scene width=600 height=300 bg=white

actor hero = figure(#c68642, m, 😎) at (100, 200)
actor label = text("No JavaScript needed.") at (350, 80) opacity 0

@0.5: hero.enter(from=left, dur=0.8)
@1.5: hero.say("Hi!", dur=1.0)
@2.0: label.fade_in(dur=0.6)
```

**Interesting technical decisions:**

1. **Strict AST parser** (`@markdy/core`) is zero-dependency TypeScript — no DOM, no runtime deps. Runs in Node, Deno, edge, or browser.

2. **WAAPI with manual rAF loop** — instead of relying on WAAPI's `startTime` (which has browser-specific quirks), I permanently pause every animation and manually set `anim.currentTime = sceneMs` each rAF frame. This gives reliable `seek()`, scrubbing, and pause anywhere.

3. **Emoji stick figures** — the `figure` actor type has articulatable SVG limbs + emoji face swapping. The coordinate system is fully normalized so LLMs can generate valid choreography without counting pixels.

4. **AI-friendly by design** — I wrote a structured `AGENT.md` prompt file; when attached to Claude/Cursor, the LLM reliably writes valid MarkdyScript without hallucinating API surfaces.

It's integrated into my Astro blog as a `<Markdy>` island that hydrates on scroll with `client:visible`. The parser + renderer combined are ~34kb minzipped.

Playground: https://markdy.com  
GitHub: https://github.com/HoangYell/markdy-com  
StackBlitz starter: https://stackblitz.com/github/HoangYell/markdy-com/tree/main/examples/astro-starter

Happy to answer questions about the DSL design, the WAAPI scheduler, or the LLM integration approach.
