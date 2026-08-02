# Markdy Troubleshooting

This guide helps fix common problems when writing MarkdyScript, rendering animated diagrams, or generating scenes with AI agents.

## "Unknown actor type or template"

Cause: the actor type is not built in and no actor pack registered it.

Fix:

```ts
import { registerActorPack } from "@markdy/core";
import { systemsPack } from "@markdy/stdlib-systems";

registerActorPack(systemsPack);
```

Use this for `service`, `client`, `database`, `queue`, `cache`, `cloud`, `container`, `cluster`, and other systems vocabulary.

## "Unrecognized statement"

Common causes:

- typo in `actor name = type(args) at (x, y)`
- missing colon in `@0.5: actor.action(...)`
- architecture shorthand used without the systems pack
- commas or quotes not escaped inside strings

Fix by checking the line number in the `ParseError`.

## Unknown action warnings

Unknown actions soft-warn by default. This helps forward compatibility, but it can hide typos.

Use must-understand actions when a scene depends on an action:

```markdy
@0.0: API.!glow(color=#38bdf8, dur=0.4)
```

## Nodes overlap or edges are hard to read

- Increase scene size to `1280x720`.
- Put nodes on a simple grid.
- Leave room between nodes for labels.
- Keep edge labels short.
- Split long flows into chapters.

## The animation feels too busy

- Reveal nodes first, then animate flows.
- Use one emphasis effect per chapter.
- Use camera zoom at the end, not constantly.
- Prefer `stagger` over many simultaneous effects.

## Scene works locally but not in a website

Check that package versions are aligned, the systems pack is registered before rendering, assets are reachable, the container exists before `createPlayer`, and SSR code does not access `document` before hydration.

## AI-generated MarkdyScript fails

Give the model `docs/AGENT.md` and ask it to fix the exact line number, keep all actors declared before events, use only documented actions, shorten labels, and avoid undeclared imports.

