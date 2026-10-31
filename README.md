# <Project name>

> <One-liner: for whom, does what, with Gemma 4.>

Built at **Hacktoberfest Hack Day Lviv / PolyTech Code Fest 2026 (MLH)**.

## Setup
```bash
cp .env.example .env      # add your GEMINI_API_KEY
make setup
claude
```

## The day
1. `/kickoff <challenge text>`: deep research, then 3 ideas with sources. Discuss and pick one.
2. Claude shows the plan (idea, MVP steps, roles, Claude instructions). Approve or change it.
3. Claude writes `.hackathon/SPEC.md`, `.hackathon/PLAN.md` and contract v1. Each person's part is in PLAN.md.
4. Repo owner: `make repo NAME=<name>` creates the GitHub repo, invites `team.txt` and prints each person's command.
5. Teammates: `gh repo clone … && make onboard ROLE=<role>`. The repo owner: `make role ROLE=<role>`.
6. In `claude`: `/next` for your next task, `/sync` to see what others changed.

## Commands
| Command | What |
|---|---|
| `make repo NAME=<name>` | create the GitHub repo, invite the team |
| `make onboard ROLE=<role>` | after cloning: .env, deps, role |
| `make role ROLE=<role>` | save your role |
| `make setup` | install deps |
| `make contracts` | check fixtures, generate OpenAPI + web types |
| `make mock-api` | fake API from fixtures on :8001 |
| `make dev` | api :8000 (+ web :5173) |
| `make smoke` | lint + tests, before every push |
| `make ship` | rebase on main, smoke, push |

## AI usage
- In the product: Gemma 4 via the Gemini API.
- In development: Claude Code (Anthropic).

## License
MIT
