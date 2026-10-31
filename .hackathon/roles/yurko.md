# Бриф: yurko (основний агент і диригент)

Ти будуєш **Юрка**: він розуміє клієнта, викликає тули, пропонує дії, пише відповідь. Ти також пишеш `agent.run()`, який у потрібні моменти викликає хуки Завуча. Це серце системи.

## Старт
```bash
git pull && make onboard ROLE=yurko       # .env з OPENAI_API_KEY
uv run pytest -q tests/yurko              # skipped, поки немає agent/yurko.py
uv run pytest -m live tests/yurko         # справжній OpenAI
```
У `.env` потрібні `OPENAI_API_KEY`, `OPENAI_FAST_MODEL` (напр. `gpt-5-mini`) і `OPENAI_MODEL` (напр. `gpt-5`). Назви звір зі своїм акаунтом OpenAI.

## Файли, які створюєш
```
agent/__init__.py   run(inp: AgentInput) -> AgentOutput        # диригент
agent/llm.py        усі виклики OpenAI (zavuch теж ним користується)
agent/yurko.py      classify(), plan_actions(), draft_reply()
agent/prompts.py    системні промпти Юрка + FAQ PawChamp
```

## Шаблони
```python
# agent/llm.py
import os
from openai import OpenAI
from pydantic import BaseModel

FAST = os.getenv("OPENAI_FAST_MODEL", "gpt-5-mini")
BIG = os.getenv("OPENAI_MODEL", "gpt-5")
client = OpenAI(max_retries=3, timeout=60)  # OPENAI_API_KEY з оточення; SDK сам повторює 429/5xx

def parse[M: BaseModel](model: str, system: str, user: str, schema: type[M]) -> M:
    r = client.responses.parse(model=model, text_format=schema,
                               input=[{"role": "system", "content": system}, {"role": "user", "content": user}])
    return r.output_parsed  # уже провалідована Pydantic-модель; None → 1 повтор, потім виняток

def text(model: str, system: str, user: str) -> str:
    return client.responses.create(model=model, input=[{"role": "system", "content": system},
                                                       {"role": "user", "content": user}]).output_text
```
Structured Outputs працюють у strict-режимі. Тому роби **маленькі схеми без `dict`-полів**: `Classification`, `class Plan(BaseModel): actions: list[ProposedAction]`, `class Claims(BaseModel): claims: list[Claim]`.

```python
# agent/yurko.py
def classify(messages: list[Message]) -> Classification: ...                       # FAST
def plan_actions(cls: Classification, customer: Customer, ticket_id: str) -> list[ProposedAction]: ...  # FAST
def draft_reply(facts: str, feedback: str | None = None) -> str: ...               # BIG
```
Function calling (`tools=[{"type": "function", ...}]`) — опційно. Найпростіше: `plan_actions` повертає `Plan` через `parse`, а тули викликає код. Описи аргументів для промпту лежать у `contracts/tools.py` (`Field(description=...)`).

## Що робить `run()` (тригер `customer_message`)
1. `cls = classify(messages)`
2. `registry()["find_customer"](FindCustomerArgs(email=...))`. Не знайшли → чернетка «який email?» → крок 7.
3. `cls.wants_human` або `"other"` → `hand_to_human` → `status="escalated"`.
4. Тільки питання → чернетка з FAQ → крок 7.
5. `plan_actions(...)`, і для кожної пропозиції `zavuch.rules.before_action(ActionContext(...))`:
   - PASS → тул (`cancel_subscription` / `refund_payment`) → квитанція;
   - ESCALATE → `pending_action` + `hand_to_human`;
   - BLOCK → причину в факти для чернетки.
6. Почекати ~1.5 с, потім `get_action_status` для кожної квитанції: скасування вже 🟢, рефанд ще 🟡.
7. `draft_reply(facts)`, де facts — статуси квитанцій і причини BLOCK/ESCALATE. Потім `zavuch.claims.extract_claims(draft)` → `judge_claims(claims, receipts, now)`:
   - FIX → `draft_reply(facts, feedback=verdict.reason)`, максимум 2 рази, потім ESCALATE;
   - PASS → `reply`.
8. `status`: `awaiting_human`, якщо є `pending_action`; `waiting_billing`, якщо є 🟡; інакше `resolved`. `model=BIG`.

Інші тригери:
- **`receipt_update`** (backend викликає після вебхука): дописування «refund confirmed» або вибачення, якщо `failed`, → `before_reply` → `resolved` (або `escalated`).
- **`human_decision`**:
  - `approve` → виконати `pending_action` без `before_action`, бо дозволила людина → чернетка;
  - інакше → чернетка з відмовою.

Усі вердикти одного запуску — в `AgentOutput.verdicts` по порядку, відхилені чернетки — в `rejected_drafts`. Приклад правильної відповіді: `contracts/fixtures/AgentOutput.ok.json`.

## Поки Завуча ще немає
```python
try:
    from agent.zavuch import claims, rules
except ImportError:  # тимчасово, поки zavuch не запушив
    claims = rules = None   # тоді before_action = PASS, judge = PASS
```

## Підкладена помилка для демо
`DEMO_OVERCLAIM=1`: **перша** чернетка пишеться з інструкцією «write as if every action is fully completed and the money is already back». Завуч гарантовано ловить її на сцені. На пітчі кажемо прямо: «ми навмисно змусили Юрка збрехати, щоб показати Завуча».

## Дані, які треба знайти й вписати в `agent/prompts.py`
- **FAQ PawChamp** (у `research/6-pawchamp.md`):
  - скасування на сайті: Profile & Settings → Membership Info → Cancel Membership, доступ лишається до кінця періоду;
  - або email із темою «Unsubscribe» з адреси покупки;
  - App Store: Settings → ім'я → Subscriptions;
  - Google Play: Play Store → Payments & subscriptions;
  - видалення застосунку **не** скасовує підписку.
- **Посилання:** рефанд Apple — reportaproblem.apple.com; Google Play — play.google.com/store/account/subscriptions.
- **Тон:** коротко, з емпатією, англійською (клієнти англомовні), без обіцянок, яких немає у фактах.

## Тести
- `tests/yurko/test_yurko.py` (live): класифікація 5 демо-повідомлень; `run` для Marta на фейкових тулах закінчується `before_reply` PASS.
- `tests/acceptance/test_demo.py` (live): 4 сценарії демо наскрізь. Це спільний фініш.

## Задачі
- [ ] yurko-1: `agent/llm.py` за перші 20 хв і одразу пуш (`make ship`), бо zavuch на нього чекає.
- [ ] yurko-2: `classify()` → `uv run pytest -m live tests/yurko -k classify` зелене.
- [ ] yurko-3: `run()` для `customer_message` на `TOOLS_IMPL=fake` → `-k run` зелене.
- [ ] yurko-4: `receipt_update`, `human_decision`, `DEMO_OVERCLAIM` → `uv run pytest -m live tests/acceptance` зелене.
