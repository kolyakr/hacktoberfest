---
name: sync
description: What changed on main since your last pull, and what it means for your role.
disable-model-invocation: true
allowed-tools: Read Glob Grep Bash(git fetch*) Bash(git log*) Bash(git diff*) Bash(git status*) Bash(make contracts*)
---

# /sync: what changed, what it means for you

Role: !`cat .hack-role 2>/dev/null || echo "not set"`
New on main: !`git fetch -q origin 2>/dev/null; git log --oneline HEAD..origin/main 2>/dev/null || echo "no origin yet"`
Files: !`git diff --stat HEAD...origin/main 2>/dev/null | tail -30`

Read `git diff HEAD...origin/main -- contracts/ .hackathon/PLAN.md` and answer in at most 10 lines:
- what teammates did, by role
- contract changes, and whether your role's code uses the changed models
- PLAN.md changes that touch your role
- what to do: `git pull --rebase`, then `make contracts` if `contracts/` changed

Offer to run the pull. If there is nothing new, say so in one line.
