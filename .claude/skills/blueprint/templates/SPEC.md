# SPEC: <project name>
> <for whom> <does what> with Gemma 4 via the Gemini API.

## Problem
<2–3 facts, each with a URL from `.hackathon/research/`.>

## Demo (the acceptance test for everyone)
| # | User action | Exact input | What the screen shows |
|---|---|---|---|
| 1 | | | |

The moment that matters: step <n>, <what the judges see>.

## Scope
- **MUST:**
- **WON'T:**

## How it works
```
web ──HTTP──▶ api ──agent.run()──▶ agent ──registry()──▶ services ──▶ <data / APIs>
                                     └──▶ Gemma 4
```
- **Endpoints:** <METHOD /path: request → response>
- **Agent:** <steps, and the model for each>
- **Tools (services/ functions):** <name: what it does>
- **Data:** <sources and licences>

## Risks
| Risk | What we do |
|---|---|
