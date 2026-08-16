# 🚀 Product Hunt Launch Kit

*(Submit at https://www.producthunt.com/posts/new — Target: Tuesday–Thursday, 12:01am PT)*

---

## Listing Details

**Name:** Markdy

**Tagline (max 60 chars):**
```
Like Mermaid, but animated — diagram-native DSL
```

**Description (max 260 chars):**
```
Write diagram-native architecture flows in plain text. Markdy parses semantic nodes, groups, beats, routed flows, and cues, then renders them natively with the Web Animations API. No GSAP, no Canvas, no bloated dependencies.
```

**Topics / Categories:**
- Developer Tools
- Open Source
- Animation
- Documentation

**First Comment (post immediately after launch — critical for PH algorithm):**

Hey Product Hunt! 👋

I'm Hoang Yell, the maker of Markdy.

I write a lot of technical blog posts and documentation. The biggest frustration I kept running into: *trying to add animated diagrams without shipping a ton of JavaScript*.

CSS animations are painful to coordinate. GSAP is powerful but overkill and expensive. Framer Motion is React-only. Lottie requires After Effects.

So I took inspiration from Mermaid.js (which turns text into diagrams) and built a diagram-native version for animated architecture walkthroughs.

**What makes Markdy different:**
- 🔤 Diagram-native: Declare nodes, groups, beats, flows, and cues
- ⚡ ~34kb total (parser + renderer) — no Canvas, no GSAP
- 🤖 AI-friendly: LLMs reliably generate valid MarkdyScript from natural language
- 🟡 Astro-native: Drop-in `<Markdy />` component that hydrates on scroll
- 🆓 100% open-source (MIT)

**Try it instantly → https://markdy.com**

Would love your feedback on the MarkdyScript grammar — which node kinds, cues, or architecture patterns would make it more useful in your workflow?

---

## PH Gallery Assets Needed

*(Ready in `website/public/images/` and `docs/images/`:)*

- [x] **Thumbnail (240×240px):** `website/public/icon.svg` on dark backdrop
- [x] **Gallery Image 1 (Hero Studio):** `website/public/images/markdy-studio-hero.webp`
- [x] **Gallery Image 2 (Mermaid vs Markdy):** `website/public/images/markdy-vs-mermaid-comparison.webp`
- [x] **Gallery Image 3 (Cloud Blueprint):** `website/public/images/scene-kubernetes-cluster.webp`
- [x] **Gallery Image 4 (Data Lakehouse):** `website/public/images/scene-lakehouse-medallion.webp`
- [x] **Gallery Image 5 (Semantic Themes):** `website/public/images/markdy-themes-showcase.webp`
- [x] **Gallery Image 6 (AI Agent Hub):** `website/public/images/markdy-ai-agent-workflow.webp`

---

## Maker Checklist

- [ ] Enable GitHub Discussions for community Q&A before launch day
- [ ] Reply to every single PH comment within 2 hours of launch
- [ ] Cross-post to relevant communities AFTER it hits top 5 of the day (not before — avoid vote brigading suspicion)
- [ ] Pin a tweet linking to PH listing
