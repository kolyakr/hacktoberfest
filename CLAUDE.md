# Team repo: Hacktoberfest Hack Day Lviv 2026

A team builds one product in one day. Every Claude session reads this file.

@.hackathon/CONTEXT.md
@.hackathon/THEME.md
@.hackathon/SPEC.md
@.hackathon/PLAN.md

## Rules
- The product's AI is **Gemma 4 via the Gemini API** (`google-genai`). No other model in the product. Claude Code is our build tool, disclosed in README › AI usage.
- No secrets anywhere. Keys live in `.env` (names in `.env.example`); never read or print it.
- Product code is written during the event only.

## Stack
- `api/`: FastAPI + Pydantic v2, managed with uv. `api/main.py` exposes `app` with `GET /health`.
- `agent/`: every Gemma call. Models from env: `GEMMA_FAST_MODEL` for loops and routing, `GEMMA_MODEL` for final answers. Validate every output with Pydantic.
- `web/`: Vite + React + TypeScript.

## Contracts: nobody waits for anybody
- Shapes are defined once, as Pydantic models in `contracts/` (`api.py` may import from `agent.py`, which may import from `tools.py`). Never re-declare them; web uses the generated `web/src/api/schema.gen.ts`.
- Example data lives once, in `contracts/fixtures/<Model>.<case>.json`. Fakes serve it: `load_fixture(Model)` in Python, `make mock-api` for web.
- Each side fakes what it depends on: `AGENT_IMPL=fake|real` (api → agent), `TOOLS_IMPL=fake|real` (`registry()` → services). Swap to real once the real one passes its tests.
- Run `make contracts` after any change in `contracts/`.

## How we work
- The SPEC demo is the acceptance test. Your role is in `.hack-role` (`make role ROLE=<role>`); its tasks and Claude instructions are in PLAN.md; tick a task when its "done when" is shown.
- Each role's folders are in PLAN.md. An edit in another role's folder asks your human to confirm first; if they're unsure, suggest checking with that person.
- Build the demo path first, then its loading/empty/error states, then extras.
- Small commits as `<area>: <imperative>`. `make ship` rebases on `origin/main`, runs `make smoke` and pushes.
- Never force-push or rewrite `main`. If you may not push, print the command for your human.
- Before saying "done", "fixed" or "works": the `verification-before-completion` skill (show the command output that proves it).
- On any bug, failing test or surprise: the `systematic-debugging` skill (root cause before any fix).
