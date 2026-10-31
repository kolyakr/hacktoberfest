# PLAN: Юрко, Завуч, Оля

План для людей і для Claude. Хто завгодно оновлює його і ставить галочку, коли «done when» показано.
Детальний бриф кожного — у `.hackathon/roles/<роль>.md`.

## Кроки і час (здача о 17:00)
1. [x] Contract v1: Pydantic-класи, тестові дані, тести під кожен кейс, мок-API (до 13:50)
2. [ ] Перша задача кожної ролі працює на фейках, її тести зелені (до 15:00)
3. [ ] Фейки замінено справжнім: `AGENT_IMPL=real`, `TOOLS_IMPL=real` (до 15:45)
4. [ ] Демо проходить наскрізь на справжній LLM: `uv run pytest -m live tests/acceptance` (до 16:00)
5. [ ] Відео демо (16:00–16:15), слайди ≤10 + README › AI usage + ZIP (до 16:45), здача до 17:00

## Як почати (кожен, 5 хвилин)
```bash
git pull && make onboard ROLE=<web|yurko|zavuch|backend>   # .env з твоїм OPENAI_API_KEY, залежності, роль
cat .hackathon/roles/<роль>.md                             # твій бриф
uv run pytest -q                                           # зелене; твої тести поки skipped
```
Тести твоєї ролі вмикаються самі, щойно з'являється файл модуля (`pytest.importorskip`). Задача готова, коли вони зелені.
Перед кожним пушем: `make ship` (rebase + smoke + push).

## Claude instructions (everyone)
- **Предмет:** підтримка підписок PawChamp. «Квитанція» = `ActionReceipt` (pending → confirmed / failed). «Вердикт» = `Verdict` (PASS / FIX / BLOCK / ESCALATE + `rule`). «Хуки» = 3 перевірки Завуча: `before_action`, `after_action`, `before_reply`.
- **Головне правило продукту:** гроші й дії вирішує **код**, не модель. LLM лише пропонує дію, знаходить заяви в тексті і пише текст. Нічого не повідомляємо клієнту як «зроблено», якщо квитанція не `confirmed`.
- **LLM: OpenAI** (`openai` SDK, ключ `OPENAI_API_KEY` у `.env`). Назви моделей лише з env, у коді їх немає:
  - `OPENAI_FAST_MODEL` (`gpt-5-mini`): класифікація, тули, пошук заяв;
  - `OPENAI_MODEL` (`gpt-5`): текст відповіді, висновок Олі;
  - усі виклики йдуть через `agent/llm.py` (Structured Outputs: `client.responses.parse(model=..., input=..., text_format=<PydanticModel>)` + 1 повтор, пауза на 429/5xx; тули — function calling).
- **Контракти:** форми даних — лише в `contracts/`, нічого не дублюй. Після зміни: `make contracts`. Тестові дані генерує `scripts/build_fixtures.py`: правиш там, потім `uv run python scripts/build_fixtures.py`.
- **Демо-дані:**
  - лише синтетичні клієнти `marta` (DE, сайт, 4 дні), `john` (США, сайт, 20 днів), `alex` (США, App Store);
  - «сьогодні» = 2026-10-31T10:00Z у тестах;
  - жодних логотипів PawChamp.
- **Поза MVP** (подвійні списання, email, пауза, Stripe, RAG): відповідай «поза MVP», не будуй.

## Role: web (хто?)
**Builds:** `web/customer` (чат клієнта) і `web/console` (консоль із квитанціями й вердиктами, дашборд Олі). Живі оновлення — Supabase Realtime, повні дані — API.
**Folders:** `web/`
**Uses from others:** усі ендпоінти `contracts/api.py`; фейк, поки немає справжнього API (`make mock-api`, `?mock=<case>`).
**Others use from this role:** нічого; це бачить журі.

**Claude instructions:**
- Типи лише з `web/src/api/schema.gen.ts` (`make contracts`). Кожен екран має стани loading / empty / error. `model` показуємо в UI.
- Квитанції: 🟡 pending, 🟢 confirmed, 🔴 failed. Відхилені чернетки — закресленим текстом із причиною від Завуча.

**Tasks:**
- [x] web-1: чат клієнта. Files: `web/src/…`. Uses: `ChatRequest`, `AgentOutput`. Done when: з `make mock-api` повідомлення Marta показує відповідь Юрка; `?mock=alex_block` показує інструкцію Apple.
- [ ] web-2: консоль підтримки. Uses: `TicketList`, `TicketDetail`, `HumanDecision`. Done when: `T-1042` показує 2 квитанції, 7 вердиктів і закреслену чернетку; `T-1043` показує кнопки «Дозволити / Відмовити».
- [ ] web-3: дашборд Олі. Uses: `OlyaReport`. Done when: `?mock=busy` показує 4 цифри + висновок, `?mock=empty` показує порожній стан.
- [ ] web-4: на справжньому API (`:8000`) чат опитує `GET /api/tickets/{id}` кожні 2 с. Done when: у демо-кроці 2 рефанд стає 🟢 без перезавантаження.

## Role: yurko (хто?)
**Builds:** Юрко і «диригент» `agent.run()`: класифікація, тули, виклики хуків Завуча, чернетки, переписування.
**Folders:** `agent/`, `contracts/agent.py`, `tests/yurko/`, `tests/acceptance/`
**Uses from others:** тули з backend (`registry()`, фейк при `TOOLS_IMPL=fake`); `before_action`, `extract_claims`, `judge_claims` від zavuch (поки їх немає, тимчасова заглушка PASS у `agent/__init__.py`).
**Others use from this role:** `run(AgentInput) -> AgentOutput` (backend); `agent/llm.py` (zavuch).

**Claude instructions:**
- Усі виклики LLM лише в `agent/llm.py`. Юрко ніколи не викликає дію без `before_action` PASS (або апруву людини).
- Чернетка отримує факти (статуси квитанцій, причини BLOCK), а не здогадки. Після FIX переписує з `verdict.reason`, максимум 2 рази, потім ESCALATE.

**Tasks:**
- [x] yurko-1: `agent/llm.py`: `generate_json(model, system, user, schema)` і виклик із тулами; повтор і пауза. Done when: `uv run python -m agent.llm` друкує валідну `Classification` для Marta (live).
- [x] yurko-2: `agent/yurko.py: classify()`. Done when: `uv run pytest -m live tests/yurko -k classify` зелене (5 демо-повідомлень).
- [x] yurko-3: `agent/__init__.py: run()` для `customer_message` на `TOOLS_IMPL=fake`. Done when: `uv run pytest -m live tests/yurko -k run` зелене.
- [ ] yurko-4: тригери `receipt_update` і `human_decision`, плюс `DEMO_OVERCLAIM=1`. Done when: `uv run pytest -m live tests/acceptance` зелене (з backend і zavuch).

## Role: zavuch (хто?)
**Builds:** Завуч (3 хуки) і Оля (KPI + висновок).
**Folders:** `agent/zavuch/`, `agent/olya/`, `tests/zavuch/`, `tests/olya/`
**Uses from others:** `agent/llm.py` від yurko (для `extract_claims` і висновку Олі; поки його немає, тимчасовий власний виклик `openai`).
**Others use from this role:** `before_action`, `extract_claims`, `judge_claims` (yurko); `apply_webhook`, `olya.kpis.compute`, `olya.report.report` (backend).

**Claude instructions:**
- Правила — чистий код без LLM. Порядок правил і точні значення — в докстрінгах `tests/zavuch/*.py`. Тексти пунктів політики — в `agent/zavuch/policy.py`.
- LLM Завуча бачить лише текст чернетки, а не міркування Юрка. Окремий промпт, `OPENAI_FAST_MODEL`.

**Tasks:**
- [x] zavuch-1: `agent/zavuch/rules.py: before_action()` + `policy.py`. Done when: `uv run pytest tests/zavuch/test_before_action.py` зелене (18 тестів).
- [x] zavuch-2: `agent/zavuch/claims.py: judge_claims()`. Done when: `uv run pytest tests/zavuch/test_before_reply.py` зелене (без live).
- [x] zavuch-3: `agent/zavuch/receipts.py: apply_webhook()`. Done when: `uv run pytest tests/zavuch/test_after_action.py` зелене.
- [x] zavuch-4: `agent/olya/kpis.py: compute()`. Done when: `uv run pytest tests/olya` зелене.
- [ ] zavuch-5: `extract_claims()` (LLM) і `agent/olya/report.py`. Done when: `uv run pytest -m live tests/zavuch tests/olya` зелене.

## Role: backend (хто?)
**Builds:** імітація білінгу з вебхуками, тули, API, запис тікетів, дій і журналу в Supabase (`tickets`, `actions`, `audit_log`), README і здача.
**Folders:** `api/`, `services/`, `data/`, `supabase/`, `contracts/api.py`, `contracts/tools.py`, `scripts/`, `tests/backend/`
**Uses from others:** `run()` від yurko (фейк: `AGENT_IMPL=fake` віддає тестові дані за email); `apply_webhook` і `olya.kpis` від zavuch.
**Others use from this role:** `REGISTRY` тулів (yurko), усі ендпоінти (web).

**Claude instructions:**
- У роутах немає логіки, тільки виклики. Події журналу пишемо з кожного `AgentOutput` і вебхука в одному місці (`api/events.py`).
- Вебхук: перевірка дубля за `event_id` → `apply_webhook` → якщо змінилось, `agent.run(trigger="receipt_update")`.

**Tasks:**
- [x] backend-1: `services/billing.py: BillingSim`. Done when: `uv run pytest tests/backend/test_billing.py` зелене.
- [x] backend-2: `services/__init__.py: REGISTRY` (5 тулів на одному спільному `BillingSim`). Done when: `uv run pytest tests/backend/test_tools.py` зелене.
- [ ] backend-3: `api/main.py`: усі 7 ендпоінтів, `AGENT_IMPL=fake`, сховище в пам'яті (`STORE=memory`), фоновий цикл `deliver_due` → `POST /webhooks/billing`. Потім backend-3b: запис у Supabase (мапінг у `roles/backend.md`). Done when: `uv run pytest tests/backend/test_api.py` зелене, і `make dev` + web показує тікет Marta.
- [ ] backend-4: README › AI usage, `.env.example`, запис демо, ZIP. Done when: ZIP завантажено в папку команди до 16:45.
