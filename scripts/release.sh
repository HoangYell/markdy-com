#!/usr/bin/env bash
set -e

if [ -z "$1" ]; then
  echo "Usage: pnpm run release <version>"
  echo "Example: pnpm run release 0.5.0"
  exit 1
fi

VERSION=$1

# Remove 'v' prefix if user typed it
VERSION=${VERSION#v}

echo "🚀 Preparing release for v$VERSION..."

# Ensure working directory is clean
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Error: Working tree is not clean. Please commit or stash changes before releasing."
  exit 1
fi

echo "📦 Updating package.json versions..."
# Update root version
npm version "$VERSION" --no-git-tag-version

# Update versions in packages
for pkg in packages/*; do
  if [ -f "$pkg/package.json" ]; then
    echo "  - Bumping $pkg"
    (cd "$pkg" && npm version "$VERSION" --no-git-tag-version)
  fi
done

echo "🔗 Updating pnpm-lock.yaml..."
pnpm install --no-frozen-lockfile > /dev/null

echo "📝 Committing version bump..."
git commit -am "chore: release v$VERSION"

echo "🏷️  Tagging v$VERSION..."
git tag "v$VERSION"

echo "☁️  Pushing to GitHub (this will trigger the CI/CD release workflow)..."
git push origin main
git push origin "v$VERSION"

echo "✅ Done! GitHub Actions will now build, publish to npm, and create a GitHub Release."
