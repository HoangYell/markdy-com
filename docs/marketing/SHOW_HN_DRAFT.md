# Show HN: Markdy — animated diagrams and explainers from text

*(Paste this verbatim into https://news.ycombinator.com/submit — Target: Friday 9am PT)*

---

**Title:**
```
Show HN: Markdy - animated diagrams and explainers from text
```

**URL:**
```
https://markdy.com
```

**Text body (for the comments section, post immediately after submitting):**

Hi HN! I got tired of writing 80-line GSAP timelines for simple animated diagrams on my Astro blog. Mermaid lets you write a sequence diagram in 5 lines of text. I wanted the same text-first workflow for small animations in docs and product explainers.

So I built Markdy: a text-based DSL where you declare nodes, connect them with flow operators, and sequence reveals in beats, then render it using the browser-native Web Animations API.

```
scene "Request path" theme=paper
layout LR

client Client
service API
gateway Edge "Edge"

beat main:
  show $nodes stagger=80ms
  Client -> API "call" -> Edge "route"
  Client <- API "response"
```

**Interesting technical decisions:**

1. **Strict AST parser** (`@markdy/core`) is zero-dependency TypeScript — no DOM, no runtime deps. Runs in Node, Deno, edge, or browser.

2. **WAAPI with manual rAF loop** — instead of relying on WAAPI's `startTime` (which has browser-specific quirks), I permanently pause every animation and manually set `anim.currentTime = sceneMs` each rAF frame. This gives reliable `seek()`, scrubbing, and pause anywhere.

3. **Semantic node kinds** — services, databases, queues, caches, gateways, clusters, and more cover architecture, infrastructure, CI/CD, and system-design diagrams. Layout and edge routing are automatic.

4. **AI-friendly by design** — I wrote a structured `AGENT.md` prompt file; when attached to Claude/Cursor, the LLM reliably writes valid MarkdyScript without hallucinating API surfaces.

It's integrated into my Astro blog as a `<Markdy>` island that hydrates on scroll with `client:visible`. The parser + renderer combined are ~34kb minzipped.

Playground: https://markdy.com  
GitHub: https://github.com/HoangYell/markdy-com  
StackBlitz starter: https://stackblitz.com/github/HoangYell/markdy-com/tree/main/examples/astro-starter

Happy to answer questions about the DSL design, the WAAPI scheduler, or the LLM integration approach.
