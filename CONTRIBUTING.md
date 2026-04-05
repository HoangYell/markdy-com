# Contributing to Markdy

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

```sh
git clone https://github.com/HoangYell/markdy-com.git
cd markdy
pnpm install
pnpm build
pnpm test
```

### Prerequisites

- **Node.js** >= 18
- **pnpm** >= 8

## Project Structure

```
packages/
  core/            @markdy/core         — Parser, AST types (zero deps)
  renderer-dom/    @markdy/renderer-dom — Web Animations API renderer
  astro/           @markdy/astro        — <Markdy /> Astro island
examples/
  astro-demo/      Live demo site
docs/
  SYNTAX.md        Full DSL reference
```

## Workflow

1. **Fork** the repo and create a feature branch from `main`.
2. **Write tests** for new parser features in `packages/core/tests/`.
3. **Run the full suite** before pushing:
   ```sh
   pnpm build && pnpm test
   ```
4. **Open a PR** against `main` with a clear description.

## Code Style

- TypeScript strict mode everywhere.
- No `any` — use `unknown` and narrow.
- 2-space indentation, LF line endings (enforced by `.editorconfig`).
- Keep the core package at zero runtime dependencies.

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(core): add `seq` reusable animation sequences
fix(renderer): correct arm pivot calculation in figure
docs: update SYNTAX.md with var/def/seq reference
```

## Reporting Issues

- Use GitHub Issues.
- Include the MarkdyScript source that triggers the bug.
- Include the error message and browser/Node version.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
