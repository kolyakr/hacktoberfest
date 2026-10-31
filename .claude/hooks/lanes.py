#!/usr/bin/env python3
"""PreToolUse (Edit/Write): if the file belongs to another role's folders in PLAN.md, ask the human first.

Folders come from each `## Role: <name>` section's `**Folders:**` line. Shared places, unlisted files
and an unset role are never asked about. People can always say yes: this is a heads-up, not a lock.
"""

import json
import os
import re
import sys
from pathlib import Path

SHARED = (".hackathon/", "contracts/fixtures/")


def owners(plan: str) -> dict[str, str]:
    """path (folder ending in / or exact file) -> role."""
    out, role = {}, None
    for line in plan.splitlines():
        if m := re.match(r"^## Role: (\S+)", line):
            role = m[1]
        elif role and line.startswith("**Folders:**"):
            for path in re.findall(r"`([^`]+)`", line):
                out[path.lstrip("./")] = role
    return out


def main() -> None:
    data = json.load(sys.stdin)
    root = Path(os.getenv("CLAUDE_PROJECT_DIR") or data.get("cwd") or ".").resolve()
    target = data.get("tool_input", {}).get("file_path") or data.get("tool_input", {}).get("notebook_path")
    if not target:
        return
    try:
        rel = (root / target).resolve().relative_to(root).as_posix()
    except ValueError:
        return  # outside the repo
    role_file = root / ".hack-role"
    role = os.getenv("HACK_ROLE") or (role_file.read_text().strip() if role_file.exists() else "")
    plan = root / ".hackathon/PLAN.md"
    if not role or not plan.exists() or rel.startswith(SHARED):
        return

    paths = owners(plan.read_text(encoding="utf-8"))
    matches = [p for p in paths if rel == p or (p.endswith("/") and rel.startswith(p))]
    if not matches:
        return
    owner = paths[max(matches, key=len)]
    if owner != role:
        print(json.dumps({"hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "ask",
            "permissionDecisionReason": f"{rel} belongs to the {owner} role (PLAN.md), and you are {role}. Edit it anyway?",
        }}))


if __name__ == "__main__":
    main()
