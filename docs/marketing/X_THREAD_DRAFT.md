# X (Twitter) / Developer Social Launch Thread

*(This thread is designed to maximize algorithmic reach by utilizing a video/image in the first tweet, addressing a massive pain point in the second tweet, and linking out to the repository in the final tweet.)*

---

### Tweet 1
I got so tired of writing massive `useEffect` blocks and downloading 100kb+ of GSAP just to animate a simple diagram on my Astro blog.

So I built a framework-agnostic Animation DSL.
It’s like Mermaid.js, but for motion. 

Meet Markdy 🎬👇

*(Attach the 25s Demo Video here OR the generated `og-image.png`!)*

---

### Tweet 2
**The Problem:**
Adding simple choreographic animations (Text fading in, diagrams moving, stick figures waving) to documentation or blogs takes hours of precise `<canvas>` math or messy DOM refs. 

**The Solution:**
With Markdy, you just write text:
```text
@0.5: label.fade_in(dur=1.0)
@1.0: guy.enter(from=left)
@1.5: guy.punch()
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
Instead of dragging nodes around in Figma or coding keyframes by hand, you can just tell an LLM: "Write a Markdy script of a stick figure doing a backflip" and paste the text block directly into your MDX files.

Try the interactive playground and see the source code here! 
Star it if you hate writing UI animation code yourself 🌟

**Playground:** [https://markdy.com](https://markdy.com)
**GitHub:** [https://github.com/HoangYell/markdy-com](https://github.com/HoangYell/markdy-com)
