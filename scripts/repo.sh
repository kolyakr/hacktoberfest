#!/usr/bin/env bash
# make repo NAME=<name>: create the public GitHub repo from this folder, push, invite everyone in
# .hackathon/team.txt, and print each teammate's command. Safe to re-run.
set -euo pipefail
cd "$(dirname "$0")/.."
name=${1:-}
[ -n "$name" ] || { echo "usage: make repo NAME=<repo-name>"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "needs the GitHub CLI, logged in: gh auth login"; exit 1; }
me=$(gh api user --jq .login)

[ -d .git ] || git init -q -b main
git add -A
git diff --cached --quiet || git commit -qm "start: $name"
if git remote get-url origin >/dev/null 2>&1; then
  git push -q -u origin HEAD:main
else
  gh repo create "$me/$name" --public --source . --remote origin --push
fi

users=$(sed 's/#.*//' .hackathon/team.txt | tr -s ' \t\r' '\n' | grep -v '^$' | grep -vix "$me" || true)
for u in $users; do
  if gh api -X PUT "repos/$me/$name/collaborators/$u" -f permission=push >/dev/null 2>&1; then echo "invited $u"
  else echo "could not invite $u (check the username in team.txt)"; fi
done

# The role whose PLAN.md header names this person: "## Role: web (vwicky)".
role_of() { grep -i "^## Role: .*[(, ]$1[,) ]" .hackathon/PLAN.md 2>/dev/null | sed 's/^## Role: \([^ ]*\).*/\1/' | head -1 || true; }

echo
echo "===== send this to the team ====="
echo "Repo: https://github.com/$me/$name"
echo "1. Accept the invite: https://github.com/$me/$name/invitations"
echo "2. Then run (needs git, uv, node, gh, Claude Code):"
for u in $users; do
  r=$(role_of "$u"); echo "   $u: gh repo clone $me/$name && cd $name && make onboard ROLE=${r:-<role>}"
done
echo "3. Open claude and run /next. Your part is in .hackathon/PLAN.md."
echo "================================="
r=$(role_of "$me"); echo "You: make role ROLE=${r:-<role>}"
