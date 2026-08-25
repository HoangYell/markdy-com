#!/usr/bin/env bash
# scripts/sync-wiki.sh — Syncs docs/wiki/ to GitHub Wiki git repo
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WIKI_DIR="${REPO_DIR}/docs/wiki"
TMP_DIR="$(mktemp -d)"

echo "==> Syncing Markdy Wiki..."
git clone "https://github.com/HoangYell/markdy-com.wiki.git" "${TMP_DIR}/wiki" || {
  echo "Wiki git repository does not exist yet. Please create the first page ('Home') on GitHub UI: https://github.com/HoangYell/markdy-com/wiki"
  exit 1
}

cp -r "${WIKI_DIR}/"* "${TMP_DIR}/wiki/"
cd "${TMP_DIR}/wiki"
git add .
if git diff --staged --quiet; then
  echo "Wiki is already up to date."
else
  git commit -m "docs(wiki): update wiki documentation and cheatsheets"
  git push origin master || git push origin main
  echo "==> Wiki successfully updated!"
fi

rm -rf "${TMP_DIR}"
