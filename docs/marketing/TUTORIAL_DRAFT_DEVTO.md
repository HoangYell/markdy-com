# How I Built a Declarative Animation Engine to Replace GSAP in My Astro Blog

*(This is a pre-written draft for you to publish on Dev.to, Hashnode, Medium, or your personal blog. It is designed to be organic and provide high educational value.)*

---

**Title Idea 1:** Why I stopped using GSAP for simple blog animations.  
**Title Idea 2:** I built a markdown-like DSL for web animations (and how you can use it in Astro)  

### The Problem with Web Animations Today
If you write technical blogs or documentation, you know that trying to visualize a concept visually makes your content 10x better. 

But actually *building* those animations is a nightmare.

Typically, you have two bad options:
1. **The Heavy Imperative Route:** Ship GSAP or Framer Motion, write a massive `useEffect` block in React/Astro, manually manage DOM refs, calculate timelines precisely down to the millisecond, and re-compile every time you tweak a coordinate.
2. **The "Give Up" Route:** Just record a screen-capture video or draw a static image.

I wanted something in between. I use [Mermaid.js](https://mermaid.js.org/) to generate sequence diagrams just by writing a simple Markdown-like string. 

**I wanted to do the same thing for motion.** I didn't want to write JavaScript; I wanted to write choreography.

### Introducing Markdy
I decided to build [Markdy](https://markdy.com) — an open-source, framework-agnostic Animation Domain Specific Language (DSL). 

It allows you to define scenes, actors, and timelines completely in text. The parser reads your DSL string, builds a strict Abstract Syntax Tree (AST), and the engine renders it natively using the Web Animations API (WAAPI). 

**No Canvas. No React. Zero external dependencies.**

### How it looks in practice:

Instead of hooking into component lifecycles, I just specify my actors and what time they move:

```text
scene width=600 height=300 bg=#fafafa

actor text_hi = text("Hello World") at (100, 150) size 30 opacity 0
actor bruno   = figure(#c68642, m, 😎) at (400, 150)

@0.3: text_hi.fade_in(dur=0.6)
@1.0: bruno.enter(from=right, dur=0.8, ease=out)
@2.0: bruno.say("Look, no JavaScript!", dur=2.0)
```

The coolest part is that it inherently supports an `emoji`-powered stick-figure actor type, so you get character expressions and articulated limbs out-of-the-box.

### Why WAAPI over GSAP?
A huge focus for Markdy was keeping the bundle size microscopic. Because Markdy compiles down to CSS Transforms and the browser-native Web Animations API, the parser and renderer combined are less than `35kb` (compared to GSAP's massive core).

I wrote a custom `requestAnimationFrame` loop that manually ticks the `currentTime` of every WAAPI object. This allowed me to add `pause()`, `seek()`, and timeline scrubbing—which is notoriously difficult to get right in standard CSS animations.

### Integrating with Astro natively
Because I write everything in [Astro](https://astro.build), I built an Astro "Island" wrapper for it (`@markdy/astro`).

Now, inside my `.mdx` or `.astro` files, I just drop in the `<Markdy>` component:

```astro
---
import { Markdy } from "@markdy/astro";

const code = `
scene width=600 height=400 bg=white
actor label = text("Hydrated on scroll!") at (200, 200)
// ...
`;
---

<!-- Automatically hydrates and auto-plays the moment the user scrolls it into view -->
<Markdy code={code} width={600} height={400} autoplay client:visible />
```

### AI Generation (Vibe Coding)
Because MarkdyScript is a strict DSL, it is **incredibly easy for LLMs to write**.
I wrote an [AGENT.md instructions file](https://github.com/HoangYell/markdy-com/blob/main/docs/AGENT.md) for the project. You feed that link to Claude or Cursor, and simply say: *"Draw a guy punching another guy"* — and the AI handles all the coordinate math and outputs perfect MarkdyScript.

### Give it a spin
If you build interactive docs or just want to play around with bringing code scenes to life:
1. Try the online playground: [markdy.com](https://markdy.com)
2. You can check out the engine's source code on GitHub: [HoangYell/markdy-com](https://github.com/HoangYell/markdy-com)

Would love to hear what developers think of the syntax design!
