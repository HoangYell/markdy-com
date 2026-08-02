# Markdy Guides and Best Practices

This guide focuses on real problems developers search for: animated architecture diagrams, Mermaid-style diagrams with motion, docs-as-code animation, and AI-generated technical explainers.

## Design an animated architecture diagram

1. Pick one story: write path, read path, deploy path, auth flow, or failure recovery.
2. Use semantic systems actors: `client`, `service`, `database`, `queue`, `cache`, `cloud`, `container`, and `cluster`.
3. Put nodes on a simple grid before adding motion.
4. Use `request` and `response` for synchronous calls; use `emit` for events.
5. Use chapters to separate phases.
6. End with one visual takeaway: `glow`, `ripple`, `camera.zoom`, or a caption.

## Make diagrams readable in documentation

- Keep edge labels under 28 characters when possible.
- Avoid overlapping nodes; leave room for routed edges.
- Use dark backgrounds for complex architecture diagrams and light backgrounds for simple onboarding examples.
- Prefer `group nodes = ...` plus `nodes.fade_in(stagger=...)` for clean reveals.
- Use camera movement only after the viewer understands the full layout.

## Build docs-as-code workflows

- Store each scene as a `.markdy` file.
- Review scene changes in pull requests like code.
- Render previews in CI or during docs builds.
- Keep examples small enough to load quickly in documentation pages.
- Use `docs/AGENT.md` as the source for AI-generated scenes.

## Use Markdy with AI agents

Markdy works well with AI because it is constrained:

- one statement per line
- typed actors and actions
- line-numbered parse errors
- deterministic rendering
- small diffs

Ask AI agents for concrete scenes:

> Create a Markdy scene for a Kubernetes ingress request. Use a browser, ingress, service, pod, Redis cache, and Postgres database. Animate the request path and cache miss path in separate chapters.

Then ask the agent to shorten labels, avoid overlapping nodes, add chapters, add camera focus, and validate against `docs/AGENT.md`.

## Production embedding checklist

- Use `@markdy/astro` or `@markdy/mdx` for content sites.
- Set fixed scene dimensions to avoid layout shift.
- Respect reduced-motion preferences at the page level.
- Avoid loading remote assets without cache control.
- Keep parser and renderer package versions aligned.
- Run `markdy lint` or `pnpm run verify:examples` before publishing.

