#!/usr/bin/env bash
# Publishes Zak's AI Gallery Guide to a SpaceFast space.
# Builds the catalog inline, builds the Next.js static export, assembles the
# publish dir (static files + serverless functions), and publishes.
# Usage: ./scripts/publish.sh [space-slug] [message]
set -euo pipefail

SPACE="${1:-zaks-ai-gallery}"
MESSAGE="${2:-zaks-ai-gallery publish}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$(mktemp -d)/sf-publish"

cd "$ROOT"
node scripts/build-catalog.mjs
npm run build

rm -rf "$OUT"
mkdir -p "$OUT"
cp -a "$ROOT/out/." "$OUT/"
cp -a "$ROOT/functions" "$ROOT/sf.jsonc" "$OUT/"

npx -y spacefast publish "$OUT" --space "$SPACE" -m "$MESSAGE" -y --wait
