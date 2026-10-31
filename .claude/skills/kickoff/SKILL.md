---
name: kickoff
description: When the challenge is out. Saves it, runs deep research in two rounds, shows the 3 best ideas with sources, and after the team picks one, continues with /blueprint.
argument-hint: "[the challenge text, pasted verbatim]"
disable-model-invocation: true
allowed-tools: Read Write Edit Glob Grep Agent WebSearch WebFetch Bash(gh search *) Bash(gh api repos/*)
---

# /kickoff: challenge → deep research → 3 ideas → pick

Challenge: $ARGUMENTS

Event facts and prizes are in CONTEXT.md (already in your context).

## 1. Save the challenge
Write it verbatim into `.hackathon/THEME.md` under `# Challenge`. If there is no challenge text, ask for it. If something essential is unclear, ask ONE batched question; otherwise go on.

## 2. Research round 1: the problem space
In ONE message, spawn 4 `researcher` agents in parallel. Give each the full challenge text, its question and its output path:
1. **Users and pain:** who has this problem, how badly, how often, what they do today. → `.hackathon/research/1-users.md`
2. **Existing solutions:** products, apps and tools that address it, what each does well and where each falls short. → `.hackathon/research/2-landscape.md`
3. **Building blocks:** open datasets, free APIs and open-source repos we could build on, checked for access and licence. → `.hackathon/research/3-building-blocks.md`
4. **Where Gemma 4 fits:** which parts of this problem need an open model (understanding text or images, function calling, structured extraction), and what similar AI projects did. → `.hackathon/research/4-ai-fit.md`

Read all four notes when they return.

## 3. Draft ideas
Write 8 candidate ideas into `.hackathon/ideas.md`, one block each:
- who it's for, and the pain (with a URL from the research)
- what the judges see in the demo: one clear moment
- what Gemma does, and why the product breaks without it
- what we build on (data, APIs, repos, with URLs)
- the closest competitor (URL), and our gap
- whether it splits into web / api / agent / services work for the team

Pick the 3 strongest by: fits the challenge, the demo moment is obvious, buildable by our team at this event, Gemma is essential, it's different from what exists.

## 4. Research round 2: check the top 3
In ONE message, spawn 3 `researcher` agents, one per idea. Each checks: do real users complain about exactly this (find their words); what does the closest competitor really do (read its site and reviews); is the data or API actually reachable (read its docs); what could make it fail. → `.hackathon/research/idea-<n>.md`

Update the ideas with what came back. If one fails the check, replace it with the next best and check that one too.

## 5. Show the 3 ideas
For each:
- name and a short pitch
- the demo moment
- what Gemma does
- what we build on
- the closest competitor and our gap
- the main risk
- the strongest evidence for it, with URLs

Then: "Discuss, ask me anything, or ask me to dig deeper into one. When you're ready, pick one (or a mix)."

While the team discusses: for "dig deeper", spawn a `researcher` on that question and report back with URLs. If the ranking changes, show the new top 3.

## 6. After the pick
Continue with `.claude/skills/blueprint/SKILL.md` in this conversation; the pick is its idea.
