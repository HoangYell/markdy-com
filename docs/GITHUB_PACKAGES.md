# Working with Markdy Packages via GitHub Packages

Markdy packages are published to both the public [npm Registry](https://www.npmjs.com) and the [GitHub Packages npm registry](https://github.com/HoangYell/markdy-com/packages).

This guide explains how to configure authentication and install `@markdy/*` packages using npm, pnpm, yarn, or GitHub Actions workflows according to the official [GitHub Packages npm documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry).

---

## Published Packages

Packages are distributed under `@markdy/*` on npmjs.com and mirrored under `@hoangyell/*` on GitHub Packages (`npm.pkg.github.com`):

| Package | GitHub Packages (`@hoangyell/*`) | npmjs (`@markdy/*`) |
|---|---|---|
| Core Engine | [`@hoangyell/core`](https://github.com/HoangYell/markdy-com/pkgs/npm/core) | [`@markdy/core`](https://www.npmjs.com/package/@markdy/core) |
| DOM Renderer | [`@hoangyell/renderer-dom`](https://github.com/HoangYell/markdy-com/pkgs/npm/renderer-dom) | [`@markdy/renderer-dom`](https://www.npmjs.com/package/@markdy/renderer-dom) |
| CLI Tool | [`@hoangyell/cli`](https://github.com/HoangYell/markdy-com/pkgs/npm/cli) | [`@markdy/cli`](https://www.npmjs.com/package/@markdy/cli) |
| Astro Integration | [`@hoangyell/astro`](https://github.com/HoangYell/markdy-com/pkgs/npm/astro) | [`@markdy/astro`](https://www.npmjs.com/package/@markdy/astro) |
| Standard Library | [`@hoangyell/stdlib-systems`](https://github.com/HoangYell/markdy-com/pkgs/npm/stdlib-systems) | [`@markdy/stdlib-systems`](https://www.npmjs.com/package/@markdy/stdlib-systems) |
| Language Server | [`@hoangyell/language-server`](https://github.com/HoangYell/markdy-com/pkgs/npm/language-server) | [`@markdy/language-server`](https://www.npmjs.com/package/@markdy/language-server) |
| MCP Server | [`@hoangyell/mcp-server`](https://github.com/HoangYell/markdy-com/pkgs/npm/mcp-server) | [`@markdy/mcp-server`](https://www.npmjs.com/package/@markdy/mcp-server) |
| MDX Component | [`@hoangyell/mdx`](https://github.com/HoangYell/markdy-com/pkgs/npm/mdx) | [`@markdy/mdx`](https://www.npmjs.com/package/@markdy/mdx) |

---

## 1. Authentication

GitHub Packages requires authentication for installing and publishing packages.

### Creating a Personal Access Token (Classic)
1. Go to **GitHub Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**.
2. Generate a token with the following scopes:
   - `read:packages` (to download and install packages)
   - `write:packages` (to publish packages, if publishing manually)
3. Copy your generated token.

---

## 2. Project Configuration (`.npmrc`)

Add an `.npmrc` file to your project root to route `@markdy` requests to GitHub Packages:

```ini
# .npmrc
@markdy:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

> [!TIP]
> Never hardcode plain-text tokens into your `.npmrc` file committed to version control. Use `${GITHUB_TOKEN}` or `${NODE_AUTH_TOKEN}` and set the environment variable in your shell or CI environment.

### User-Level Configuration (Alternative)
You can configure npm on your local machine globally in `~/.npmrc`:

```ini
# ~/.npmrc
//npm.pkg.github.com/:_authToken=YOUR_PERSONAL_ACCESS_TOKEN
@markdy:registry=https://npm.pkg.github.com
```

Or authenticate via CLI:

```bash
npm login --scope=@markdy --auth-type=legacy --registry=https://npm.pkg.github.com
# Username: <your-github-username>
# Password: <your-personal-access-token>
```

---

## 3. Installing Packages

Once authenticated, install Markdy packages normally:

### Using pnpm
```bash
pnpm add @markdy/core @markdy/renderer-dom
pnpm add -D @markdy/cli @markdy/mcp-server
```

### Using npm
```bash
npm install @markdy/core @markdy/renderer-dom
npm install --save-dev @markdy/cli @markdy/mcp-server
```

### Using Yarn
```bash
yarn add @markdy/core @markdy/renderer-dom
yarn add -D @markdy/cli @markdy/mcp-server
```

---

## 4. GitHub Actions CI/CD Usage

When building and testing your application in GitHub Actions, you can use the automatic `GITHUB_TOKEN` secret to authenticate with GitHub Packages:

```yaml
name: Build & Test

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: read

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          registry-url: 'https://npm.pkg.github.com'
          scope: '@markdy'

      - name: Install dependencies
        run: pnpm install
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Run build
        run: pnpm run build
```

---

## 5. Dual Registry Publishing (Maintainers)

The Markdy repository is configured to publish automatically on release tags to both `npmjs.org` and GitHub Packages (`npm.pkg.github.com`):

```bash
# Manual publish to GitHub Packages (requires write:packages token):
pnpm --filter @markdy/core publish --no-git-checks --access public --registry https://npm.pkg.github.com
```
