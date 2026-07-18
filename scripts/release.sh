#!/usr/bin/env bash
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: pnpm run release <version>"
  echo "Example: pnpm run release 0.7.12"
  exit 1
fi

VERSION="${1#v}"
TAG="v$VERSION"
BASE_BRANCH="main"
RELEASE_BRANCH="release/$TAG"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "❌ Missing required command: $1"
    exit 1
  fi
}

create_changelog_stub_if_missing() {
  if grep -q "^## \\[$VERSION\\]" CHANGELOG.md; then
    return
  fi

  echo "📝 CHANGELOG.md has no [$VERSION] entry — inserting a placeholder."
  local today
  today="$(date +%Y-%m-%d)"
  local tmp
  tmp="$(mktemp)"

  {
    echo "# Changelog"
    echo
    echo "All notable changes to the \`markdy\` project will be documented in this file."
    echo
    echo "The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),"
    echo "and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)."
    echo
    echo "## [$VERSION] — $today"
    echo
    echo "### Changed"
    echo "- TODO: summarize release changes."
    echo
    tail -n +8 CHANGELOG.md
  } > "$tmp"

  mv "$tmp" CHANGELOG.md
}

echo "🚀 Starting end-to-end release flow for $TAG"
require_cmd git
require_cmd gh
require_cmd pnpm

echo "🔐 Validating GitHub auth..."
gh auth status >/dev/null

echo "🔄 Syncing refs..."
git fetch origin --prune --tags

echo "🌿 Creating release branch from current HEAD: $RELEASE_BRANCH"
git switch -C "$RELEASE_BRANCH"

if [ -n "$(git status --porcelain)" ]; then
  echo "🧾 Committing pending code changes before version bump..."
  git add -A
  git commit -m "chore: prepare release $TAG"
fi

echo "📦 Bumping versions to $VERSION"
pnpm version "$VERSION" --no-git-tag-version
for pkg in packages/*; do
  if [ -f "$pkg/package.json" ]; then
    (cd "$pkg" && pnpm version "$VERSION" --no-git-tag-version)
  fi
done

echo "🔗 Refreshing lockfile"
pnpm install --no-frozen-lockfile >/dev/null

create_changelog_stub_if_missing

echo "✅ Running validation (build/lint/test)"
pnpm run build
pnpm run lint
pnpm run test

echo "📝 Committing release metadata"
git add -A
if [ -z "$(git diff --cached --name-only)" ]; then
  echo "❌ No staged changes for release commit."
  exit 1
fi
git commit -m "chore: release $TAG"

echo "☁️ Pushing release branch"
git push -u origin "$RELEASE_BRANCH"

PR_TITLE="chore: release $TAG"
PR_BODY=$'## Summary\n- bump workspace/package versions\n- update changelog for this release\n- run full validation before merge\n\n## Validation\n- pnpm run build\n- pnpm run lint\n- pnpm run test'

PR_NUMBER="$(gh pr list --state open --head "$RELEASE_BRANCH" --json number --jq '.[0].number')"
if [ -n "${PR_NUMBER:-}" ] && [ "$PR_NUMBER" != "null" ]; then
  echo "🔁 PR already exists for $RELEASE_BRANCH (#$PR_NUMBER)"
else
  echo "📬 Creating release PR -> $BASE_BRANCH"
  PR_URL="$(gh pr create --base "$BASE_BRANCH" --head "$RELEASE_BRANCH" --title "$PR_TITLE" --body "$PR_BODY")"
  PR_NUMBER="${PR_URL##*/}"
fi

if [ -z "${PR_NUMBER:-}" ] || [ "$PR_NUMBER" = "null" ]; then
  echo "❌ Unable to determine PR number for $RELEASE_BRANCH"
  exit 1
fi

echo "⏱ Waiting for PR #$PR_NUMBER checks"
gh pr checks "$PR_NUMBER" --watch

echo "🔀 Merging PR #$PR_NUMBER"
gh pr merge "$PR_NUMBER" --merge --delete-branch

PR_STATE="$(gh pr view "$PR_NUMBER" --json state --jq '.state')"
if [ "$PR_STATE" != "MERGED" ]; then
  echo "❌ PR #$PR_NUMBER is not merged (state=$PR_STATE)"
  exit 1
fi

echo "🏷️ Tagging $TAG on merged main"
git fetch origin --tags
git switch -C "$BASE_BRANCH" "origin/$BASE_BRANCH"
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "❌ Tag $TAG already exists locally."
  exit 1
fi
git tag "$TAG"
git push origin "$TAG"

echo "📡 Waiting for GitHub Release workflow"
RUN_ID=""
for _ in 1 2 3 4 5 6 7 8 9 10; do
  RUN_ID="$(gh run list --workflow Release --limit 30 --json databaseId,headBranch,event --jq ".[] | select(.event==\"push\" and .headBranch==\"$TAG\") | .databaseId" | head -n 1)"
  if [ -n "$RUN_ID" ]; then
    break
  fi
  sleep 3
done

if [ -z "$RUN_ID" ]; then
  echo "❌ Could not find Release workflow run for $TAG"
  exit 1
fi

gh run watch "$RUN_ID" --exit-status
gh release view "$TAG" --json name,tagName,publishedAt,url

echo "✅ Release flow complete for $TAG"
