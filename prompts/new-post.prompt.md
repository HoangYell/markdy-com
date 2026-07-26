# Markdy New Post Prompt (EN + VI)

Use this prompt when writing launch posts, explainers, or tutorials about Markdy.

## Goal
Write clear, beginner-friendly posts that a university student can follow, while staying technically accurate.

## Required structure
1. TL;DR
2. Beginner Map
3. Part 1: Foundations (Mental Model)
4. Part 2: Investigation (How it works)
5. Part 3: Diagnosis (Strengths, limits, tradeoffs)
6. Part 4: Resolution (Setup + first exercise)
7. Final Take

## Tone and depth rules
1. Explain terms before using jargon.
2. Use concrete examples over abstract claims.
3. Show at least one runnable snippet (CLI or MarkdyScript).
4. Include one 30-60 minute student assignment.
5. State when Markdy is not the right tool.

## Markdy-specific checklist
1. Explain the core model: line-based DSL -> AST -> renderer timeline.
2. Mention at least 3 practical primitives (for example: `actor`, `@time`, `scene`, `camera`, `caption`).
3. Include one tiny complete scene example.
4. Clarify one common beginner mistake and how to fix it.

## Visual guidance
1. Add one image/diagram per major section when publishing to a blog.
2. Prefer architecture or timeline diagrams over decorative images.

## Output quality checks
1. Can a new learner explain what Markdy does after reading only TL;DR + Beginner Map?
2. Can they run a first example in under 10 minutes?
3. Does the post include tradeoffs, not just benefits?
4. Are EN and VI versions aligned in meaning and structure?