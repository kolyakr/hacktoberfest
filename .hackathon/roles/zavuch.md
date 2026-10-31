# Бриф: zavuch (Завуч + Оля)

Ти будуєш двох агентів-перевіряльників:
- **Завуч** не пускає Юрка робити заборонене і казати неправду.
- **Оля** рахує KPI і пише висновок.

Більша частина — **чистий код**, тому твої тести найчіткіші й найшвидші. Почни з них.

## Старт
```bash
git pull && make onboard ROLE=zavuch
uv run pytest -q tests/zavuch tests/olya     # skipped, поки немає файлів
```

## Файли, які створюєш
```
agent/__init__.py              порожній, якщо yurko ще не створив (тоді просто не перезаписуй його)
agent/zavuch/__init__.py
agent/zavuch/policy.py         пункти політики PawChamp: константи + тексти з номерами
agent/zavuch/rules.py          before_action(ctx: ActionContext) -> Verdict              хук 1, код
agent/zavuch/receipts.py       apply_webhook(receipt, event, readback, seen_ids)
                               -> tuple[ActionReceipt, Verdict]                           хук 2, код
agent/zavuch/claims.py         judge_claims(claims, receipts, now) -> Verdict            хук 3, код
                               extract_claims(draft: str) -> list[Claim]                 хук 3, OPENAI_FAST_MODEL
agent/olya/__init__.py
agent/olya/kpis.py             compute(events: list[Event]) -> OlyaReport                код
agent/olya/report.py           report(events) -> OlyaReport                              + OPENAI_MODEL
```

## Хук 1: до дії (`rules.py`)
Правила йдуть по порядку, спрацьовує перше:
1. `injection`
2. `intent_mismatch`
3. `not_found`
4. `store_purchase`
5. `already_canceled` / `already_refunded`
6. `amount_exceeds_payment`
7. рефанд: ЄС і ≤ 14 днів → PASS `eu_withdrawal_14d`, інакше ESCALATE `outside_policy`
8. скасування: PASS `ok`

Деталі:
- Скасування дозволене, якщо в `intents` є `cancel` **або** `refund`.
- `already_refunded` спрацьовує і тоді, коли в `previous_receipts` є рефанд цього платежу зі статусом не `failed`.
- 14 днів рахуються включно: `now - charged_at <= timedelta(days=14)`.
- `Verdict.at = ctx.now`, `Verdict.action = ctx.proposal`, `reason` — людське речення для консолі.

Усі 18 кейсів: `tests/zavuch/test_before_action.py`.

## Хук 2: після дії (`receipts.py`)
- `event.idempotency_key != receipt.idempotency_key` → `ValueError`.
- `event.event_id` вже в `seen_ids` → квитанція без змін, PASS `duplicate_event`.
- `refund.failed` і read-back каже `failed` → `failed`, ESCALATE `webhook_failed`.
- Read-back не `confirmed` → лишається `pending`, BLOCK `readback_mismatch`.
- Інакше → `confirmed`, додати `event_id` в `evidence`, PASS `webhook_confirmed`.
- `Verdict.at = event.created_at`, `receipt_id` заповнений.

## Хук 3: перед відповіддю (`claims.py`)
`extract_claims`:
- одна LLM-задача: знайти в чернетці заяви-факти і повернути `class Claims(BaseModel): claims: list[Claim]` через `agent.llm.parse(FAST, ...)`;
- `kind`: `canceled` | `refunded` | `refund_submitted` («оформлено, обробляється») | `timing` (з `promised_days`; «вже на картці» = `None`) | `other`;
- промпт бачить **лише текст чернетки**, а не міркування Юрка. Це і є незалежність Завуча.

`judge_claims` — чистий код, точні правила в докстрінгу `tests/zavuch/test_before_reply.py`:
- `canceled` / `refunded` ок, лише якщо квитанція `confirmed`;
- `refund_submitted` ок, якщо квитанція є і вона не `failed`;
- `timing` ок, якщо `promised_days >= 15`;
- рішення: failed → ESCALATE; без квитанції → FIX `claim_without_receipt`; погана обіцянка → FIX `false_promise`; інакше PASS.

## Оля
- `kpis.compute` — визначення кожної цифри в докстрінгу `tests/olya/test_kpis.py`. Результат на `EventLog.demo` має збігатися з `OlyaReport.ok.json` (крім текстів).
- `report.report`: `compute(events)`, потім `parse(BIG, ...)` зі схемою `class Insight(BaseModel): top_reason: str; recommendation: str`. На вході цифри + список `true_goal` / `intents` з подій `classified`. `model = BIG`.

## Політика PawChamp для `policy.py` (з `research/6-pawchamp.md`)
- Покупки на сайті «generally non-refundable», рефанд «case-by-case, at our discretion» (Membership Policy).
- ЄС: відмова «within 14 days of your purchase» (Terms §6.5.1).
- «please allow up to 15 business days»; «not entitled to multiple refunds for the same transaction» (Terms §6.6).
- App Store / Google Play: «subject to Apple and Google's refund policies», клієнт звертається до них сам.
- Скасування підписки скасовує й додатки (Terms §6.4). Тріал сам переходить у платну підписку, нагадування не гарантуються (§6.7).

Константи `EU_WITHDRAWAL_DAYS = 14` і `REFUND_ARRIVAL_DAYS = 15` уже є в `contracts/agent.py`, імпортуй їх звідти.

## Від кого залежиш
- `agent/llm.py` пише yurko в перші 20 хв. До того роби код-частини (хуки 1, 2, `judge_claims`, `kpis`), бо вони без LLM.

## Задачі
- [x] zavuch-1: `policy.py` + `rules.py` → `uv run pytest tests/zavuch/test_before_action.py` зелене (18).
- [x] zavuch-2: `judge_claims` → `uv run pytest tests/zavuch/test_before_reply.py` зелене.
- [x] zavuch-3: `apply_webhook` → `uv run pytest tests/zavuch/test_after_action.py` зелене.
- [x] zavuch-4: `olya/kpis.py` → `uv run pytest tests/olya` зелене.
- [ ] zavuch-5: `extract_claims` + `olya/report.py` → `uv run pytest -m live tests/zavuch tests/olya` зелене.
