# Example: what /blueprint shows, and the PLAN.md it writes

The idea below is made up, only to show the format. Part A is the message shown for approval; Part B is the PLAN.md written after "approve".

---

# Part A: the plan shown for approval

## 1. Idea
**Svitlo**: snap a photo of your region's outage schedule, get a plan for your day around the power cuts.
- **Problem:** schedules are posted as images per queue, and people re-read them several times a day to plan charging, cooking and work (<URL from research>).
- **What the judges see:** a photo of the schedule goes in; a minute-by-minute day plan for queue 3.2 comes out, with "charge the laptop before 14:00" highlighted.
- **What Gemma does:** reads the schedule image (vision), extracts the time slots for one queue as structured data, then writes the plan using two tools. Without Gemma there is no way to read the image.

## 2. MVP plan
**Demo:**
1. User uploads `schedule_lviv.png` and picks queue `3.2` → the screen shows the extracted slots as a timeline.
2. User types "I work from home, need 4 hours of laptop" → the screen shows the day plan with charging windows highlighted.
3. User clicks "How it works" → the steps Gemma took (read image → get slots → plan), with the model id.

**MUST:** image → slots for one queue; day plan; steps view.
**WON'T:** accounts, notifications, other regions' formats, history.

**Build steps:**
1. Contract v1: shared models and fake data (Claude writes it after approval).
2. Each person builds their first task on fake data.
3. Fake pieces are replaced by real ones, one at a time.
4. The demo runs end to end on real Gemma.
5. Polish, pitch, submit.

**Riskiest step:** reading the image reliably. Fallback: a pre-recorded Gemma answer for the demo image.

## 3. Roles
| Role | Person | Builds | Folders | First task | Suits someone who likes |
|---|---|---|---|---|---|
| web | vwicky | the upload screen, timeline and plan view | `web/`, `contracts/ui.md` | upload screen on fake data | UI, React |
| api | kolyakr | the endpoint that connects web to the agent; merges | `api/`, `contracts/api.py`, `scripts/` | `POST /api/plan` returning fake data | backend, glue |
| agent | MykhailoMatsyshyn | every Gemma call: read image, call tools, write plan | `agent/`, `contracts/agent.py` | read the demo image into slots | prompting, LLMs |
| services | a-starchenko | the tools Gemma calls, and the data | `services/`, `data/`, `contracts/tools.py` | `get_slots` for one queue | data, logic |

Every role has demo work from the start; each talks to at most two others through the contracts.

## 4. Claude instructions
**Everyone:**
- A "queue" is like `3.2`; a "slot" is a start/end time with power on or off (`Slot` in contracts).
- Gemma: `gemma-4-26b-a4b-it` reads the image and picks tools; `gemma-4-31b-it` writes the final plan.
- Out of scope: other regions, accounts, notifications. Say so if asked.

**Per role:**
- web: show the model id; every screen has loading, empty and error states.
- api: no logic in routes; `AGENT_IMPL` switches fake/real.
- agent: validate every Gemma answer with Pydantic, re-ask once, then fall back to the recorded answer.
- services: times in Europe/Kyiv; never return slots outside the asked day.

Approve, or tell me what to change. You can also say who takes which role.

---

# Part B: PLAN.md after approval

```markdown
# PLAN: Svitlo

The plan for people and for Claude. Anyone updates it; tick tasks as they're done.

## Steps
1. [x] Contract v1: shared models and fake data
2. [ ] Each role's first task works on fake data
3. [ ] Fake pieces replaced by real ones
4. [ ] Demo runs end to end on real Gemma
5. [ ] Polish, pitch, submit

## Claude instructions (everyone)
- A "queue" is like `3.2`; a "slot" is a start/end time with power on or off (`Slot`).
- Gemma: `gemma-4-26b-a4b-it` reads the image and picks tools; `gemma-4-31b-it` writes the plan.
- Out of scope: other regions, accounts, notifications.

## Role: web (vwicky)
**Builds:** the screen where you upload the schedule, see your slots and get a day plan.
**Folders:** `web/`, `contracts/ui.md`
**Uses from others:** `POST /api/plan` from api; fake until it's real (`make mock-api`).
**Others use from this role:** nothing; this is what the judges see.

**Claude instructions:**
- Show the model id; every screen has loading, empty and error states.

**Tasks:**
- [ ] web-1: upload screen + timeline on fake data. Files: `web/src/App.tsx`. Uses: `PlanRequest`, `PlanResponse`. Done when: with `make mock-api`, uploading shows the 6 slots from the fixture.
- [ ] web-2: day plan view with charging windows highlighted. Done when: the fixture plan shows 2 highlighted windows.
- [ ] web-3: "How it works" panel from `steps`. Done when: 3 steps and the model id are visible.

## Role: api (kolyakr)
**Builds:** the endpoint between web and the agent; merges and the demo laptop.
**Folders:** `api/`, `contracts/api.py`, `scripts/`
**Uses from others:** `run(AgentInput) -> AgentOutput` from agent; fake until it's real (`AGENT_IMPL=fake`).
**Others use from this role:** `POST /api/plan` (web).

**Claude instructions:**
- No logic in routes; bad input → 422 with a message, agent timeout → 504.

**Tasks:**
- [ ] api-1: `POST /api/plan` returning the agent's output. Files: `api/main.py`, `tests/api/test_plan.py`. Done when: the test gets `PlanResponse.ok` with `AGENT_IMPL=fake`.
- [ ] api-2: switch to the real agent. Done when: `AGENT_IMPL=real` returns a plan for the demo image.

## Role: agent (MykhailoMatsyshyn)
**Builds:** every Gemma call: read the image, call the tools, write the plan.
**Folders:** `agent/`, `contracts/agent.py`
**Uses from others:** `get_slots`, `free_windows` from services; fake until they're real (`TOOLS_IMPL=fake`).
**Others use from this role:** `run(AgentInput) -> AgentOutput` (api).

**Claude instructions:**
- All Gemma calls in `agent/llm.py`; validate with Pydantic, re-ask once, then use the recorded answer.

**Tasks:**
- [ ] agent-1: read `data/demo_inputs/schedule_lviv.png` into slots for queue 3.2. Files: `agent/llm.py`, `agent/read_image.py`, `tests/agent/test_read_image.py`. Done when: the test returns the 6 slots of the demo image.
- [ ] agent-2: `run()` calls the tools and writes the plan. Done when: `uv run python -m agent` prints a plan with 2 charging windows.

## Role: services (a-starchenko)
**Builds:** the tools Gemma calls, and the data behind them.
**Folders:** `services/`, `data/`, `contracts/tools.py`
**Uses from others:** nothing.
**Others use from this role:** `get_slots(GetSlotsArgs) -> GetSlotsResult`, `free_windows(FreeWindowsArgs) -> FreeWindowsResult` (agent).

**Claude instructions:**
- Times in Europe/Kyiv; never return slots outside the asked day.

**Tasks:**
- [ ] services-1: `get_slots` for one queue. Files: `services/slots.py`, `tests/services/test_slots.py`. Done when: queue 3.2 returns the 6 demo slots.
- [ ] services-2: `free_windows` finds power-on windows of a given length. Done when: a 4-hour need returns 2 windows for the demo day.
```
