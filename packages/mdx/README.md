# @markdy/mdx

MDX integration for MarkdyScript with Lighthouse-safe defaults:

- `remarkMarkdy` converts fenced code blocks (` ```markdy `) into a player component.
- `MarkdyPlayer` hydrates only when visible and lazy-loads `@markdy/renderer-dom`.

## Install

```sh
pnpm add @markdy/mdx react react-dom
```

## Package position (text)

```text
@markdy/core -> @markdy/renderer-dom -> @markdy/mdx

MDX integration transforms fenced markdy blocks into lazy player components.
```

## Output preview

<p align="center">
  <img src="https://raw.githubusercontent.com/HoangYell/markdy-com/main/website/public/images/markdy-output-preview.webp" alt="Markdy output preview" width="900" />
</p>

## Usage

```ts
// mdx config
import { remarkMarkdy } from "@markdy/mdx";

export default {
  remarkPlugins: [[remarkMarkdy, { componentName: "MarkdyPlayer" }]],
};
```

```tsx
// shared MDX components map
import { MarkdyPlayer } from "@markdy/mdx";

export const mdxComponents = {
  MarkdyPlayer,
};
```

Then write Markdown:

````md
```markdy width=800 height=400 bg="#f8fafc" autoplay=false loop=false
scene width=800 height=400 bg=#f8fafc
actor label = text("Hello, MDX") at (80, 180) size 48
@0.2: label.fade_in(dur=0.6)
```
````

## Performance Notes

- Default transform options set `autoplay=false`, `loop=false`, `progressBar=false`.
- Runtime player does not import renderer code until the block enters viewport.
- Placeholder is SSR-safe and keeps stable layout ratio to avoid CLS.
