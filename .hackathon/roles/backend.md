# Бриф: backend (білінг, тули, API, здача)

Ти будуєш усе, що з'єднує систему:
- імітацію білінгу з вебхуками;
- тули, які викликає Юрко;
- API для фронта;
- журнал подій для Олі.

Ще на тобі README і ZIP для здачі.

## Старт
```bash
git pull && make onboard ROLE=backend
uv run pytest -q tests/backend          # skipped, поки немає services/ і api/
make dev                                # api на :8000 (+ web на :5173)
```

## Файли, які створюєш
```
services/billing.py     BillingSim: клієнти, скасування, рефанди, вебхуки, ідемпотентність
services/__init__.py    SIM = BillingSim.from_fixtures(now); REGISTRY = {5 тулів}; reset()
api/main.py             FastAPI app: /health + 7 ендпоінтів, CORS, фоновий цикл вебхуків
api/store.py            тікети: Supabase (tickets, actions) або пам'ять (STORE=memory, для тестів)
api/events.py           журнал подій: Supabase audit_log або пам'ять; append(Event), all() -> list[Event]
api/fake_agent.py       AGENT_IMPL=fake: AgentOutput з фікстур за email (marta → ok, john → john_escalate, …)
```

## Сховище: Supabase (вже є в репо)
Міграція `supabase/migrations/20261031120000_init.sql`: таблиці `tickets`, `actions`, `audit_log`. Консоль читає їх напряму через Realtime, а пише лише API (service role). Тому `api/store.py` і `api/events.py` пишуть у Supabase. Для тестів і без env Supabase лишай сховище в пам'яті (`STORE=memory`): `tests/backend/test_api.py` не має ходити в мережу.

Як контракти лягають на таблиці:
| Контракт | Таблиця | Відповідність |
|---|---|---|
| тікет (`TicketDetail`) | `tickets` | `id` (uuid як рядок; `T-1042` лише в моках), `channel='web'`, `customer_ref=customer.id`, `body` = перше повідомлення, `intent` = `classification.intents` через кому |
| `ActionReceipt` + `ProposedAction` | `actions` | `tool`, `args` = поля пропозиції, `policy_ref=policy_clause`, `external_ref=billing_ref`, `approved_by`. `mode`: PASS → `auto`, ESCALATE → `ask`, BLOCK → `never`. `status`: до хука 1 `proposed`, BLOCK → `blocked`, апрув людини → `approved`, квитанція `pending` → `executed`, `confirmed` → `confirmed`, `failed` → `failed` |
| `Event`, `Verdict` | `audit_log` | `event = Event.type`, `detail = Event.data`; для `hook.verdict` у `detail` кладемо весь `Verdict` (reason, claims). `actor`: `ai:yurko`, `ai:zavuch`, `agent:<ім'я>`, `system` |
| `TicketStatus` | `tickets.status` | у SQL немає `awaiting_human` і `waiting_billing`. Найпростіше — додати їх у `check` новою міграцією (узгодь із автором `supabase/`); інакше `awaiting_human` → `proposed`, `waiting_billing` → `approved` |
| повідомлення, `rejected_drafts` | `audit_log` | події `reply.sent` (з текстом) і `hook.verdict` (FIX з чернеткою в `detail`) |

Ключі Supabase лежать лише в `.env` (назви вже додано в `.env.example`).

## BillingSim (точний інтерфейс у докстрінгу `tests/backend/test_billing.py`)
```python
class BillingSim:
    fail_next_refund: bool = False
    @classmethod
    def from_fixtures(cls, now: datetime) -> "BillingSim": ...         # Customer.marta / john / alex
    def find_customer(self, email: str) -> Customer | None: ...
    def cancel(self, ticket_id: str, subscription_id: str) -> ActionReceipt: ...     # pending, вебхук через 1 с
    def refund(self, ticket_id: str, payment_id: str, amount: float) -> ActionReceipt: ...  # pending, 10 с; ValueError, якщо > платежу
    def status(self, receipt_id: str) -> ActionReceipt: ...             # read-back
    def deliver_due(self, at: datetime) -> list[BillingWebhook]: ...    # застосовує і повертає події, час яких настав
```
- Ключ ідемпотентності: `f"{ticket_id}:{action}:{target_id}"`. Повтор з тим самим ключем повертає ту саму квитанцію.
- Годинник передається параметром, тому тести миттєві. На сервері фоновий цикл кожні 0.5 с викликає `deliver_due(now)` і робить справжній `POST /webhooks/billing` на себе (`httpx.AsyncClient`).

## Тули (`services/__init__.py`)
`REGISTRY = {name: fn(Args) -> Result}` з ключами `contracts.tools.TOOLS`:
- `find_customer`, `cancel_subscription`, `refund_payment`, `get_action_status` → `SIM`;
- `hand_to_human` → черга в `api/store.py` або простий лічильник.

Юрко отримує їх через `contracts._kit.registry()` при `TOOLS_IMPL=real`.

## API (`contracts/api.py`; відповіді, як у `contracts/fixtures/`)
| Ендпоінт | Що робить |
|---|---|
| `POST /api/chat` | новий або наявний тікет → `AgentInput(trigger="customer_message")` → `agent.run()` (або фейк) → зберегти → події → `AgentOutput` |
| `GET /api/tickets` | `TicketList` зі store |
| `GET /api/tickets/{id}` | `TicketDetail` (клієнт зі `SIM`, події з журналу); 404, якщо немає |
| `POST /api/tickets/{id}/decision` | `AgentInput(trigger="human_decision", pending_action, decision)` → `run()` |
| `POST /webhooks/billing` | дубль `event_id` → `WebhookAck(duplicate=True)`; знайти квитанцію за `idempotency_key` → `zavuch.receipts.apply_webhook(receipt, event, SIM.status(id), seen)` → якщо статус змінився, `run(trigger="receipt_update")` |
| `GET /api/report` | `olya.report.report(events)` при `AGENT_IMPL=real`, інакше `olya.kpis.compute(events)`; модулів ще немає → фікстура `OlyaReport.ok` |
| `POST /api/demo/reset` | новий `SIM`, очистити store і журнал → `DemoReset(customers=3)` |

**Журнал** (`api/events.py` → `audit_log`) пишемо в одному місці з кожного `AgentOutput` і вебхука:
- `ticket.opened`;
- `classified`;
- `hook.verdict` з `{hook, decision, rule}`;
- `action.submitted`;
- `receipt.updated` з `{action, status, amount, currency}`;
- `reply.sent`;
- `handed_to_human`;
- `human.decision`;
- `ticket.resolved`;
- `security.flag`.

Перелік і поля — `EventType` у `contracts/agent.py`. Приклад — `contracts/fixtures/EventLog.demo.json`.

**Фейковий агент** (`AGENT_IMPL=fake`): за email вибирає фікстуру (`marta` → `ok`, `john` → `john_escalate`, `alex` → `alex_block`, injection-текст → `injection_block`). Так фронт підключається до справжнього API ще до готового Юрка.

## Ти власник `contracts/` і `scripts/`
- Нове поле для фронта: правиш модель у `contracts/*.py`, тестові дані в `scripts/build_fixtures.py`, далі `uv run python scripts/build_fixtures.py && make contracts`.
- `.env.example` має містити назви (без значень): `OPENAI_API_KEY`, `OPENAI_FAST_MODEL`, `OPENAI_MODEL`, `AGENT_IMPL`, `TOOLS_IMPL`, `DEMO_OVERCLAIM`, `STORE` + для API `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (їх читає `api/mirror.py`) і наявні `VITE_SUPABASE_*`. Онови вручну: Claude цей файл не читає.

## Здача (deadline 17:00)
- **README:** що це, як запустити (`make setup`, `make dev`), **AI usage**: продукт — OpenAI (які моделі); розробка — Claude Code. Ліцензія MIT уже є.
- **Відео демо** о 16:00 при будь-якому стані: 4 сценарії з SPEC, ≤ 2 хв, вставити в слайди.
- **ZIP:** `git archive -o hacktoberfest.zip HEAD` → папка команди до 16:45.
- Слайди (≤ 10): проблема → Юрко / Завуч / Оля → демо-відео → що ловить Завуч → KPI Олі → що далі.

## Задачі
- [x] backend-1: `services/billing.py` → `uv run pytest tests/backend/test_billing.py` зелене.
- [x] backend-2: `services/__init__.py` → `uv run pytest tests/backend/test_tools.py` зелене.
- [ ] backend-3: `api/` з фейковим агентом, сховище в пам'яті → `uv run pytest tests/backend/test_api.py` зелене; `make dev` + фронт показує тікет Marta.
- [ ] backend-3b: сховище Supabase за таблицею вище → у консолі через Realtime з'являється тікет Marta і її дії.
- [ ] backend-4: справжній агент (`AGENT_IMPL=real`) + фоновий цикл вебхуків → `uv run pytest -m live tests/acceptance` зелене (разом з yurko і zavuch).
- [ ] backend-5: README › AI usage, відео, ZIP до 16:45.
