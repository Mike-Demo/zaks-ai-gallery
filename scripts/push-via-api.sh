#!/usr/bin/env bash
# Pushes every git-tracked file to GitHub via the Contents API.
# (Used because this environment has no git-credential-backed push path;
# auth is injected by the github-api CLI at request time.)
set -uo pipefail
cd "$(dirname "$0")/.."
REPO="Mike-Demo/zaks-ai-gallery"
BRANCH="main"
FAILED=0
COUNT=0
for f in $(git ls-files); do
  content=$(base64 -w0 "$f")
  # JSON-escape via python to be safe with any content
  payload=$(python3 -c "
import json,sys
print(json.dumps({'message': 'initial scaffold push', 'content': sys.argv[1], 'branch': 'main'}))
" "$content")
  if ~/workspace/skills/github/bin/github-api PUT "/repos/$REPO/contents/$f" -d "$payload" > /dev/null 2>&1; then
    COUNT=$((COUNT+1))
  else
    echo "FAILED: $f"
    FAILED=$((FAILED+1))
  fi
done
echo "pushed=$COUNT failed=$FAILED"
