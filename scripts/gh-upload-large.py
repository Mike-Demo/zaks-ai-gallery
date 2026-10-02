#!/usr/bin/env python3
"""Upload large binary files to a GitHub repo via the Contents API,
authenticating through the stored custom.github dynamic credential.
Reads files from disk -- no argv size limits."""
import base64
import json
import sys
import urllib.request

sys.path.insert(0, "/opt/hatch/skills/skill-creator/bin")
from dynamic_credentials import add_surrogate_to_request, read_response_body

REPO = "Mike-Demo/zaks-ai-gallery"
BRANCH = "main"


def put_file(path: str) -> str:
    with open(path, "rb") as f:
        content = base64.b64encode(f.read()).decode()
    url = f"https://api.github.com/repos/{REPO}/contents/{path}"
    payload = json.dumps({"message": "add artwork images", "content": content, "branch": BRANCH}).encode()
    req = urllib.request.Request(url, data=payload, method="PUT")
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/vnd.github+json")
    add_surrogate_to_request(req, "custom.github", allowed_hosts=["api.github.com"])
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(read_response_body(resp))
    return data["content"]["sha"][:7]


if __name__ == "__main__":
    for path in sys.argv[1:]:
        try:
            print(f"{path} -> {put_file(path)}")
        except Exception as e:
            print(f"{path} -> FAILED: {e}")
