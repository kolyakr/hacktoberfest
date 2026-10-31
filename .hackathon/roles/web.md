# Бриф: web (фронтенд)

Ти робиш те, що побачить журі: 3 екрани. Бекенд ще пишеться, тому працюєш на **мок-API**: він віддає готові JSON для кожного сценарію демо.

## Старт
```bash
git pull && make onboard ROLE=web
make contracts        # генерує web/src/api/schema.gen.ts (коли є web/package.json)
make mock-api         # фейковий API на http://localhost:8001
```
Справжній API пізніше буде на `:8000` (`make dev`). Базову адресу винеси в одну змінну (`VITE_API_URL`), щоб перемкнутися одним рядком.

## Що вже є у `web/` і як це з'єднати
- Два застосунки (npm workspaces): `web/customer` (help center + чат-віджет) і `web/console` (inbox, insights, rules). `npm --prefix web run dev` запускає обидва, `make smoke` збирає обидва.
- `web/console/src/types.ts` дзеркалить таблиці Supabase (`TicketRow`, `ActionRow`, `AuditRow`), а консоль читає їх через Realtime. Так і лишаємо для живих оновлень.
- Повні дані тікета — вердикти Завуча з `claims`, відхилені чернетки, квитанції — бери з `GET /api/tickets/{id}` (`TicketDetail`). Типи генерує `make contracts` у `web/src/api/schema.gen.ts`. Імпорт із застосунку: `../../src/api/schema.gen`. Свій `Verdict` / `Check` у `types.ts` заміни цими типами, щоб не було двох версій.
- Як таблиці відповідають контрактам — таблиця в `roles/backend.md` › «Сховище: Supabase».
- **Чат клієнта** (`web/customer/src/chat.ts`) зараз — скриптовані кроки 0–3 з вибором `cancel | pause`. Під'єднай його до `POST /api/chat` (`ChatRequest` → `AgentOutput`). **Пауза поза MVP**: у чаті лишаються скасування і рефанд.
- Бренд у `web/customer/public/brand/`: без логотипа PawChamp, лише власний бренд продукту.

## Як отримати потрібні дані з мок-API
За замовчуванням ендпоінт віддає `<Model>.ok.json`. Інший сценарій: `?mock=<case>`. Тікет: його id в адресі.

| Запит | Що прийде |
|---|---|
| `POST /api/chat` | Marta: Завуч зловив хибне «refunded» (FIX), квитанції 🟢 скасування + 🟡 рефанд |
| `POST /api/chat?mock=marta_followup` | дописування «refund confirmed», тікет resolved |
| `POST /api/chat?mock=john_escalate` | `status: awaiting_human`, є `pending_action` |
| `POST /api/chat?mock=john_approved` | людина дозволила: рефанд 🟡 |
| `POST /api/chat?mock=alex_block` | 2× BLOCK «store_purchase», 0 дій, інструкція Apple |
| `POST /api/chat?mock=injection_block` | BLOCK «injection» |
| `POST /api/chat?mock=marta_again_block` | BLOCK «already_refunded» |
| `POST /api/chat?mock=question` · `?mock=not_found` | проста відповідь / «не знайшов ваш email» |
| `GET /api/tickets` · `?mock=empty` | список із 4 тікетів / порожній |
| `GET /api/tickets/T-1042` | Marta повністю: 3 повідомлення, 2 квитанції 🟢, 7 вердиктів, закреслена чернетка, журнал |
| `GET /api/tickets/T-1042?mock=pending` | Marta до вебхука: рефанд 🟡 |
| `GET /api/tickets/T-1043` · `T-1044` · `T-1045` | John (чекає людину) · Alex · injection |
| `POST /api/tickets/T-1043/decision` | тіло `{"approve": true}` → `AgentOutput` |
| `GET /api/report` · `?mock=busy` · `?mock=empty` | Оля: 4 тікети / 200 тікетів / порожньо |

Усі JSON лежать у `contracts/fixtures/`. Типи бери зі `schema.gen.ts`; що означає кожне поле, описано в `contracts/api.py` і `contracts/agent.py`.

## Екрани
1. **Чат клієнта** (`ChatRequest` → `AgentOutput`)
   - Поле email + повідомлення; `ticket_id` з першої відповіді передаєш далі.
   - Показуєш `reply.text`. Поки `status` = `waiting_billing` або `awaiting_human`, опитуєш `GET /api/tickets/{id}` кожні 2 с і дописуєш нові повідомлення.
2. **Консоль підтримки** (`TicketList`, `TicketDetail`): головний екран демо.
   - Ліворуч список: `subject`, `status`, бейдж `last_decision`, 🔥 якщо `chargeback_threat`.
   - Праворуч діалог.
   - **Квитанції:** дія, сума, статус 🟡 pending / 🟢 confirmed / 🔴 failed, `evidence`.
   - **Стрічка Завуча** — `verdicts` по порядку з підписами «До дії» / «Після дії» / «Перед відповіддю». Рішення кольором: PASS зелений, FIX помаранчевий, BLOCK червоний, ESCALATE жовтий. Плюс `reason`. Під `before_reply` — `claims` з ✅/❌ і `problem`.
   - **Відхилені чернетки** (`rejected_drafts`): закресленим текстом з підписом «Завуч не пропустив».
   - Якщо `status == "awaiting_human"`: картка `pending_action` і кнопки «Дозволити» / «Відмовити» → `POST /api/tickets/{id}/decision`.
3. **Дашборд Олі** (`OlyaReport`): 4 великі цифри
   - `resolved_without_human_pct`: вирішено без людини;
   - `avg_first_response_s`: час першої відповіді;
   - `zavuch_caught`, з них `false_done_caught`: зловлено Завучем, з них хибних «готово»;
   - `refunded_by_currency`: повернуто.

   Під цифрами — `top_reason`, `recommendation` і `model`.

## Підписи для `rule`, людською мовою
| rule | Підпис |
|---|---|
| `ok` | Усе за правилами |
| `eu_withdrawal_14d` | ЄС: 14 днів на відмову (Terms §6.5.1) |
| `outside_policy` | Поза правилами, вирішує людина |
| `store_purchase` | Куплено в App Store / Google Play: тільки Apple / Google |
| `already_refunded` | За цей платіж уже повертали |
| `already_canceled` | Підписка вже скасована |
| `amount_exceeds_payment` | Сума більша за платіж |
| `not_found` | Це не платіж цього клієнта |
| `intent_mismatch` | Клієнт цього не просив |
| `injection` | Спроба командувати агентом |
| `webhook_confirmed` | Білінг підтвердив |
| `webhook_failed` | Білінг: не вдалося |
| `readback_mismatch` | Вебхук і стан білінгу не збігаються |
| `duplicate_event` | Повторний вебхук, проігноровано |
| `claim_without_receipt` | Каже «зроблено» без підтвердження |
| `claim_on_failed_receipt` | Каже «зроблено», а дія не вдалась |
| `false_promise` | Обіцяє швидше, ніж дозволяють правила |
| `unsure` | Завуч не впевнений |

## Правила
- Кожен екран має стани loading / empty / error. `model` видно в UI.
- **Без логотипа й бренду PawChamp.** Підпис: «Demo: subscription support for a PawChamp-like app. Synthetic data.»
- Не правиш `api/`, `agent/`, `services/`. Бракує поля — пиши backend, він додасть його в `contracts/` і запустить `make contracts`.

## Задачі
- [ ] web-1: чат на моках (Marta, `alex_block`).
- [ ] web-2: консоль: `T-1042` (квитанції, 7 вердиктів, закреслена чернетка) і `T-1043` (кнопки).
- [ ] web-3: дашборд: `busy` і `empty`.
- [ ] web-4: перемкнутися на `:8000` і опитування; у демо-кроці 2 рефанд 🟡→🟢 без перезавантаження.
