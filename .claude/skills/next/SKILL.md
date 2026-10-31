---
name: next
description: Do your role's next task from .hackathon/PLAN.md - test first, proven by its "done when", then ticked, committed and shipped.
argument-hint: "[task id, e.g. web-2]  (default: your role's first open task)"
disable-model-invocation: true
allowed-tools: Read Write Edit Glob Grep Bash(uv run *) Bash(npm *) Bash(make contracts*) Bash(make smoke*) Bash(git status*) Bash(git diff*) Bash(git log*) Bash(git add *) Bash(git commit *) Bash(git fetch*)
---

# /next: one task, test first, proven

Role: !`cat .hack-role 2>/dev/null || echo "not set"`
Task asked for: $ARGUMENTS

If the role is not set, say: "Set your role first: `make role ROLE=<role>` (roles are the `## Role:` sections in PLAN.md)." and stop.

## 1. Pick
The task asked for, else the first `- [ ]` task under `## Role: <your role>` in `.hackathon/PLAN.md`. If none is left, suggest the most useful next task for your role (from the SPEC demo) and add it to PLAN.md once your human agrees.

## 2. Read
The files the task names, the contract models it uses and their `ok` fixtures (that's exactly what the fakes return), the SPEC demo step it serves, and your role's Claude instructions in PLAN.md.

## 3. Test first
Write the test for the task with the SPEC demo values, run it, and see it fail for the right reason. For pure UI layout there's no unit test; the proof is the page itself.

## 4. Build
The least code that makes it pass, in your role's folders, against the fakes.

## 5. Prove
Run the task's "done when" check fresh and show its output (`verification-before-completion`). If it fails, use `systematic-debugging`.

## 6. Finish
1. Tick the task in PLAN.md (`- [x]`).
2. Commit as `<role>: <what the task did>`.
3. `make ship` (or print it for your human if you may not push). If smoke fails on another role's code, tell your human; don't fix it in their folders.
