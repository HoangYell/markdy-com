#!/usr/bin/env bash
# Commit (if needed) and push the current branch to GitHub using a token
# loaded from a local .env file. The token is NEVER written to .git/config.
#
# Usage:
#   ./scripts/github.sh                     # commit any changes with default msg, push
#   ./scripts/github.sh "feat: my message"  # commit with custom message, push
#   ./scripts/github.sh --no-commit         # skip commit, just push current HEAD
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Missing $ENV_FILE."
  echo "   Copy .env.example to .env and fill in your GitHub token."
  exit 1
fi

# Load env vars from .env (export every assignment)
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${GITHUB_TOKEN:?GITHUB_TOKEN not set in .env}"
: "${GITHUB_USERNAME:?GITHUB_USERNAME not set in .env}"
: "${GITHUB_EMAIL:?GITHUB_EMAIL not set in .env}"
: "${GITHUB_REPO:?GITHUB_REPO not set in .env (e.g. yellcamap/markdy-com)}"
BRANCH="${GITHUB_BRANCH:-main}"

cd "$REPO_ROOT"

# Parse args
COMMIT=1
COMMIT_MSG="chore: update"
if [ "${1:-}" = "--no-commit" ]; then
  COMMIT=0
elif [ -n "${1:-}" ]; then
  COMMIT_MSG="$1"
fi

# Configure git identity locally for this repo only
git config user.name  "$GITHUB_USERNAME"
git config user.email "$GITHUB_EMAIL"

# Make sure we're on (or move to) the target branch
CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
  echo "🔀 Switching from '$CURRENT_BRANCH' to '$BRANCH'..."
  git checkout "$BRANCH"
fi

# Commit any pending changes
if [ "$COMMIT" -eq 1 ] && [ -n "$(git status --porcelain)" ]; then
  echo "📝 Committing changes as $GITHUB_USERNAME <$GITHUB_EMAIL>..."
  git add -A
  git commit -m "$COMMIT_MSG"
elif [ "$COMMIT" -eq 1 ]; then
  echo "ℹ️  No changes to commit; pushing current HEAD."
fi

# Build an ephemeral authenticated URL — never stored in git config
PUSH_URL="https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git"

echo "☁️  Pushing to ${GITHUB_REPO} (${BRANCH})..."
# Redirect to mask the token in any error output
git push "$PUSH_URL" "HEAD:${BRANCH}" 2>&1 | sed "s|${GITHUB_TOKEN}|***|g"

echo "✅ Pushed to https://github.com/${GITHUB_REPO}/tree/${BRANCH}"
