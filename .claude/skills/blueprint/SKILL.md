---
name: blueprint
description: After the idea pick (/kickoff continues into it). Shows one plan to approve - the idea, the MVP plan, the roles, the Claude instructions - then writes SPEC.md, PLAN.md and contract v1.
argument-hint: "[changes, e.g. '3 people']"
disable-model-invocation: true
allowed-tools: Read Write Edit Glob Grep Bash(make contracts*) Bash(uv run *) Bash(git add *) Bash(git commit *)
---

# /blueprint: one plan, one approval, then the repo follows it

Arguments: $ARGUMENTS
Teammates (team.txt): !`sed 's/#.*//' .hackathon/team.txt 2>/dev/null | tr -s ' \t\r' '\n' | grep -v '^$' | tr '\n' ' ' || true`

Read `.hackathon/THEME.md`, `.hackathon/ideas.md` and `.hackathon/research/`.

## 1. Show the plan
Plain words, short, in the format of `${CLAUDE_SKILL_DIR}/templates/EXAMPLE.md` Part A (Part B shows the PLAN.md you write after approval). Four parts:

1. **Idea:** name, one-liner, the problem (with a URL), what the judges see, what Gemma does.
2. **MVP plan:**
   - the demo as numbered steps: user action → exact input → what the screen shows
   - MUST and WON'T
   - the build steps in order:
     1. Contract v1: the shared models and fake data (Claude writes it after approval).
     2. Each person builds their first task on fake data.
     3. Fake pieces are replaced by real ones, one at a time.
     4. The demo runs end to end on real Gemma.
     5. Polish, pitch, submit.
3. **Roles:** one per person (the team.txt usernames plus the person here). Table `Role | Builds | Folders | First task | Suits someone who likes`. Roles are made of the areas `web/`, `api/`, `agent/`, `services/` + `data/`; each folder belongs to one role, and every role has demo work from the start.
4. **Claude instructions:** a few rules about this idea for every Claude (domain terms, Gemma features and model per step, what's out of scope), and 2–3 per role.

Ask: "Approve, or tell me what to change. You can also say who takes which role." Change files only after approval.

## 2. After approval
1. `.hackathon/SPEC.md` from `${CLAUDE_SKILL_DIR}/templates/SPEC.md`.
2. Contract v1, demo path only, following the patterns in each file's docstring:
   - `contracts/tools.py`: Args + Result per services/ function, with `Field(description=...)` on every Args field.
   - `contracts/agent.py`: `AgentInput`, `AgentOutput` (with `model: str`), `AGENT_IO`.
   - `contracts/api.py`: `ENDPOINTS`. If an endpoint returns what the agent returns, use `AgentOutput` as its response.
   - `contracts/fixtures/<Model>.ok.json` for each, built from the SPEC demo inputs, realistic, never "foo". Add `empty` cases where a screen shows an empty state.
   
   Run `make contracts` until it prints OK.
3. `.hackathon/PLAN.md` from `${CLAUDE_SKILL_DIR}/templates/PLAN.md`: the Claude instructions, then one section per role with 2–4 tasks, demo path first. Write each role's `**Folders:**` line as backticked paths, folders ending in `/` (e.g. `` `web/`, `contracts/api.py` ``): the lanes hook reads it. Each task names its files, the contract models it uses or produces, and "done when" (a test, a command or what's visible on screen).
4. The team table in `.hackathon/CONTEXT.md`.
5. Commit as `blueprint: <name>`, if this is a git repo.

Then say: "Plan written. Each person's part is in `.hackathon/PLAN.md`." and offer to create the GitHub repo with `make repo NAME=<suggested name>` (it pushes and invites team.txt). If you may not push from here, give the human `! make repo NAME=<name>` to type instead.
