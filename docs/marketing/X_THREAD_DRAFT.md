# X (Twitter) / Developer Social Launch Thread

*(This thread is designed to maximize algorithmic reach by utilizing a video/image in the first tweet, addressing a massive pain point in the second tweet, and linking out to the repository in the final tweet.)*

---

### Tweet 1
I got so tired of writing massive `useEffect` blocks and downloading 100kb+ of GSAP just to animate a simple diagram on my Astro blog.

So I built a framework-agnostic, diagram-native DSL.
It’s like Mermaid.js, but for animated architecture flows.

Meet Markdy 🎬👇

*(Attach the 25s Demo Video here OR the generated `og-image.png`!)*

---

### Tweet 2
**The Problem:**
Adding animated architecture walkthroughs (API handoffs, cache hits, async events, deploy paths) to documentation or blogs takes hours of precise `<canvas>` math or messy DOM refs.

**The Solution:**
With Markdy, you declare semantic nodes, beats, and flows:
```text
beat main:
  show $nodes stagger=80ms
  Web -> API "request" -> Cache "lookup"
```

---

### Tweet 3
Since it renders purely to browser-native Web Animations API (WAAPI), the AST parser and DOM renderer combined are incredibly lightweight.

🚫 No massive JS payload.
🚫 No Canvas overhead. 
🤝 Zero external dependencies.
💻 Native Astro Component `<Markdy code={code} />`

---

### Tweet 4 (The Call To Action)
Instead of dragging nodes around in Figma or coding keyframes by hand, you can tell an LLM to follow https://markdy.com/AGENT.md and write a MarkdyScript scene showing an API request through the edge cache, then paste the text block directly into your MDX files.

Try the interactive playground and see the source code here! 
Star it if you hate writing UI animation code yourself 🌟

**Playground:** [https://markdy.com/playground/](https://markdy.com/playground/)
**GitHub:** [https://github.com/HoangYell/markdy-com](https://github.com/HoangYell/markdy-com)
