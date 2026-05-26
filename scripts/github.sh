#!/usr/bin/env bash
# Commit (if needed) and push to GitHub using a token loaded from .env.
# Defaults to pushing to a personal *feature* branch (because most repos
# protect `main` and reject direct pushes). Optionally opens a PR via `gh`.
#
# The token is NEVER written to .git/config — pushes use an ephemeral
# authenticated URL and the token is masked in any output.
#
# Env (.env at repo root):
#   GITHUB_TOKEN        required
#   GITHUB_USERNAME     required
#   GITHUB_EMAIL        required
#   GITHUB_REPO         required, e.g. HoangYell/markdy-com
#   GITHUB_BRANCH       optional, default: ${GITHUB_USERNAME}/wip
#                       (the *remote head* branch you push to)
#   GITHUB_BASE_BRANCH  optional, default: main
#                       (the PR base branch, used only with --pr)
#
# Usage:
#   ./scripts/github.sh                              # commit, push to default head branch
#   ./scripts/github.sh "feat: my message"           # custom commit message
#   ./scripts/github.sh "msg" --branch=feat/foo      # override head branch
#   ./scripts/github.sh "msg" --pr                   # also open a PR
#   ./scripts/github.sh "msg" --pr --base=develop    # PR against a non-default base
#   ./scripts/github.sh --no-commit                  # just push current HEAD
#   ./scripts/github.sh --force                      # force-with-lease the head branch
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Missing $ENV_FILE."
  echo "   Copy .env.example to .env and fill in your GitHub token."
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${GITHUB_TOKEN:?GITHUB_TOKEN not set in .env}"
: "${GITHUB_USERNAME:?GITHUB_USERNAME not set in .env}"
: "${GITHUB_EMAIL:?GITHUB_EMAIL not set in .env}"
: "${GITHUB_REPO:?GITHUB_REPO not set in .env (e.g. HoangYell/markdy-com)}"

BASE_BRANCH="${GITHUB_BASE_BRANCH:-main}"
HEAD_BRANCH="${GITHUB_BRANCH:-${GITHUB_USERNAME}/wip}"

cd "$REPO_ROOT"

# ── Parse args ─────────────────────────────────────────────────────────────
COMMIT=1
OPEN_PR=0
FORCE=0
COMMIT_MSG=""
for arg in "$@"; do
  case "$arg" in
    --no-commit)        COMMIT=0 ;;
    --pr)               OPEN_PR=1 ;;
    --force|--force-with-lease) FORCE=1 ;;
    --branch=*)         HEAD_BRANCH="${arg#--branch=}" ;;
    --base=*)           BASE_BRANCH="${arg#--base=}" ;;
    --help|-h)
      sed -n '2,26p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    --*)
      echo "❌ Unknown flag: $arg"; exit 2 ;;
    *)
      if [ -z "$COMMIT_MSG" ]; then COMMIT_MSG="$arg"
      else echo "❌ Unexpected extra arg: $arg"; exit 2
      fi ;;
  esac
done
: "${COMMIT_MSG:=chore: update}"

# ── Git identity (local to this repo only) ─────────────────────────────────
git config user.name  "$GITHUB_USERNAME"
git config user.email "$GITHUB_EMAIL"

# ── Commit pending changes onto current local branch ───────────────────────
if [ "$COMMIT" -eq 1 ] && [ -n "$(git status --porcelain)" ]; then
  echo "📝 Committing changes as $GITHUB_USERNAME <$GITHUB_EMAIL>..."
  git add -A
  git commit -m "$COMMIT_MSG"
elif [ "$COMMIT" -eq 1 ]; then
  echo "ℹ️  No changes to commit; pushing current HEAD."
fi

# ── Warn if pushing directly to the (likely protected) base branch ─────────
if [ "$HEAD_BRANCH" = "$BASE_BRANCH" ]; then
  echo "⚠️  Pushing directly to '${HEAD_BRANCH}'. If this branch is protected"
  echo "    on GitHub, the push will be rejected (GH006)."
fi

# ── Push via an ephemeral authenticated URL (never stored in git config) ───
PUSH_URL="https://${GITHUB_USERNAME}:${GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git"
PUSH_ARGS=("$PUSH_URL" "HEAD:${HEAD_BRANCH}")
[ "$FORCE" -eq 1 ] && PUSH_ARGS=("--force-with-lease" "${PUSH_ARGS[@]}")

echo "☁️  Pushing HEAD to ${GITHUB_REPO} (${HEAD_BRANCH})..."
set +e
PUSH_OUTPUT="$(git push "${PUSH_ARGS[@]}" 2>&1)"
PUSH_STATUS=$?
set -e
echo "$PUSH_OUTPUT" | sed "s|${GITHUB_TOKEN}|***|g"

if [ $PUSH_STATUS -ne 0 ]; then
  if echo "$PUSH_OUTPUT" | grep -q "GH006\|protected branch"; then
    cat <<EOF

❌ Push rejected: '${HEAD_BRANCH}' is a protected branch on ${GITHUB_REPO}.
   Either:
     1) Re-run with --branch=<feature-branch>     (recommended)
        e.g. ./scripts/github.sh "$COMMIT_MSG" --branch=${GITHUB_USERNAME}/wip --pr
     2) Set GITHUB_BRANCH=<feature-branch> in .env so it's the new default.
     3) Open a PR from another branch and merge through GitHub.
EOF
  fi
  exit $PUSH_STATUS
fi

echo "✅ Pushed: https://github.com/${GITHUB_REPO}/tree/${HEAD_BRANCH}"

# ── Optional: open a PR via gh ─────────────────────────────────────────────
if [ "$OPEN_PR" -eq 1 ]; then
  if ! command -v gh >/dev/null 2>&1; then
    echo "⚠️  --pr requested but 'gh' is not installed. Skipping PR creation."
    echo "   Install: https://cli.github.com/"
    exit 0
  fi

  if [ "$HEAD_BRANCH" = "$BASE_BRANCH" ]; then
    echo "⚠️  --pr ignored: head and base are both '${HEAD_BRANCH}'."
    exit 0
  fi

  echo "🔎 Checking for an existing PR (${HEAD_BRANCH} → ${BASE_BRANCH})..."
  EXISTING_PR="$(gh pr list --repo "$GITHUB_REPO" \
    --head "$HEAD_BRANCH" --base "$BASE_BRANCH" \
    --state open --json url --jq '.[0].url' 2>/dev/null || true)"

  if [ -n "$EXISTING_PR" ]; then
    echo "ℹ️  PR already open: $EXISTING_PR"
  else
    echo "📬 Creating PR..."
    GH_TOKEN="$GITHUB_TOKEN" gh pr create \
      --repo "$GITHUB_REPO" \
      --base "$BASE_BRANCH" \
      --head "$HEAD_BRANCH" \
      --title "$COMMIT_MSG" \
      --body  "Opened via scripts/github.sh by ${GITHUB_USERNAME}."
  fi
fi
