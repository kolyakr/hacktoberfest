# Round-2 check of idea #3 (Act + Audit on PawChamp): is it real, is it new, can Gemma do it, and what breaks live? Yes on pain and feasibility. Novelty is narrower than the ideas list claims: Lorikeet and Fin already do eligibility-gated refunds, approvals and 100% QA. Our gap is **proof of execution before the reply goes out** (send locked until billing confirms, and promises in the text matched to actions). Lead the pitch with that.

## Key findings

### (1) Users complain about exactly this flow, in 2026, about SKELAR apps
- **Support said it was handled, and it wasn't.** A Liven iOS review (1★, 2026-07-23, "Charged for 4 Months+ after cancellation"): "I cancelled my services in February and have been charged monthly since then. I have reached out to support each month to dispute my charges and have been told I would not be charged anymore. The charges have continued." This is the Promise Keeper failure, word for word. — high that it exists (first-person; matches the PawChamp "Nate" review in 6-pawchamp.md) (https://itunes.apple.com/us/rss/customerreviews/page=1/id=6450840109/sortby=mostrecent/json, pages 1–3)
- **Support's cancellation record contradicts the bank statement.** Liven iOS (1★, 2026-08-01): "I am still being charged and their customer support says my subscription was cancelled in 2024. And now no one will return my emails." — medium (same feed)
- **The subscription came back after cancelling.** Liven iOS (1★, 2026-07-22): "I cancelled my account back in April. Somehow it rejuvenated and reactivated to charge me again three months later." — medium (same feed)
- **A surprise renewal, then refund refused by pointing to the terms.** RiseGuide iOS (1★, 2026-10-17): charged "every 12 weeks, with the price increasing from an introductory $39.99 to $79.99 per renewal… nearly $280". Support "explained that the billing terms were disclosed during signup", and the reviewer asks for "automatic reminders before renewals". This is the "renewed without reminder" cluster the QA tab should surface. — medium (https://itunes.apple.com/us/rss/customerreviews/page=1/id=6737224695/sortby=mostrecent/json)
- **BetterMe (Trustpilot 4.4 from 115,962 reviews), Oct 2026 one-star reviews:**
  - "They will charge you REPEATEDLY after you cancel your subscription" (Alice, 29 Oct)
  - "I cancelled my subscription in plenty of time before I was to be charged and you have charged me anyway!" (24 Oct)
  - Refund conditioned on usage: "I was told I needed to earn my refund by showing on the app that I had completed 7 workouts" (26 Oct)
  - A retention offer instead of a refund: "lure you with a "Bonus" deal and blame you" (23 Oct)

  The last two match PawChamp's old "7 days in a row" guarantee, so the policy engine needs a *usage-condition* rule type. — high (https://www.trustpilot.com/review/betterme.world?stars=1)
- **When an AI makes the promise, the same failure gets worse.** Priceline's "Penny" chatbot (UK, Oct 2025, Telegraph May 2026) told a customer a non-refundable booking was "eligible for a full refund" of £386.91. The customer cancelled, the refund never came, and the hotel said it was never told. Priceline admitted "misinformation" only after the press stepped in. This is the argument for "no claim without API proof" when the drafter is an AI. — medium (secondary write-up of a Telegraph column) (https://vibegraveyard.ai/story/priceline-penny-chatbot-fake-refund/)
- **Reddit:** I found no first-person r/personalfinance or r/assholedesign threads about these apps. The search engine returned only cancellation guides and Apple Community threads. Don't cite Reddit in the pitch. — low (gap)

### (2) Competitors: what Lorikeet and Fin actually do
- **Fin Procedures** run multi-step processes "described in natural language" on top of Data connectors (API calls). For subscriptions, Fin "checks refund eligibility before processing", and "Non-eligible cases are escalated." A "Wait for webhook" step can pause until an external system replies. Procedures are under "managed availability… discuss access with your Account Manager". The doc does **not** describe confirming that an action succeeded, or citing a policy clause. — high (https://fin.ai/help/en/articles/13976198)
- **Fin human-in-the-loop** is a "Loop in teammate" step. Fin "waits and does not continue the procedure until a teammate acts or a timeout is reached". The teammate gets a "Fin requires your decision" card in the inbox or Slack, and the answer is "recorded in the conversation" as a note. There is no policy engine and no audit log beyond that note. — high (https://www.intercom.com/help/en/articles/14468561)
- **Fin + Stripe:** a third-party guide says Intercom's Stripe connector templates are read-only, so a refund needs a custom connector. Not verified on Intercom's own docs. — low (https://www.getmacha.com/blog/how-to-automate-refunds-in-intercom, search snippet only)
- **Lorikeet (Stripe refunds article):**
  - It has a "Create refund" action against Stripe `/refunds`, but "Custom integrations are in beta."
  - Eligibility lives in a code tool, not the prompt (example rule: "only offer a refund on orders under 30 days and under $200"). Guardrails include "hard execution caps enforced in code" and "response checks that can block, rewrite or escalate a reply".
  - No approval gate for refunds and no check that the refund succeeded is described.
  - Pricing: Start $2,100/mo and Scale $5,100/mo, plus ~$0.90–0.99 per resolution.

  — medium (vendor page) (https://www.lorikeetcx.ai/articles/ai-agents-refunds-cancellations-stripe-2026)
- **Lorikeet product line:** Concierge (the customer-facing agent), Guardrails ("Robust runtime checks"), Auto QA ("Score every conversation live") and Coach. Customers are fintech and healthtech (Linktree, Carmoola, Hnry…), not consumer subscription apps. The homepage doesn't mention verifying execution. — medium (https://www.lorikeetcx.ai/)
- **Lorikeet Coach (29 Jan 2026)** already does our "Audit" beat. It scores conversations "on a customizable rubric" with "100% coverage, not sampling", "surfaces why performance is trending up or down", and "proposes fixes, and, with approval, implements them". **The QA, cluster and suggested-fix loop is not novel by itself.** — high (https://www.aap.com.au/aapreleases/cision20260129ae73915)
- **What's left as our gap:** none of the Fin or Lorikeet pages I read describes:
  - (a) blocking the customer reply until the billing system confirms the action,
  - (b) pulling commitments out of a drafted reply ("cancelled", "refunded $19.47") and matching them to the action log, or
  - (c) QA that scores *whether the promised action happened*, not tone.

  "Wait for webhook" is the nearest building block, but it is a step someone has to configure, not a guard on what gets sent. — medium (absence of evidence on vendor pages, not proof)

### (3) Feasibility with Gemma 4 on the Gemini API
- **Function calling with google-genai works as documented.** The official Gemma-on-Gemini-API page shows `tools = types.Tool(function_declarations=[get_weather])`, `config = types.GenerateContentConfig(tools=[tools])` and `client.models.generate_content(model="gemma-4-26b-a4b-it", ...)`, then reads the function calls from the response. Phil Schmid's guide shows the same pattern, reading `response.candidates[0].content.parts[0].function_call`. The two IDs are `gemma-4-31b-it` and `gemma-4-26b-a4b-it`. The page is marked "This documentation is deprecated", pointing to gemma.ai. — high (https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api, https://www.philschmid.de/gemma-4-gemini-api)
- **Neither official page documents structured output (`response_json_schema` / `response_schema`) for Gemma.** The only evidence is one developer:
  - `responseMimeType` plus a full `responseJsonSchema` gave "99%+ parse success" against "~50%" without the schema.
  - Every field must be in `required`, and you should avoid streaming with a schema ("can truncate responses").
  - The same author says schemas give "Internal error" on the free tier, which matters because Gemma has no paid tier.

  Treat this as **unverified until our own smoke test**. Fallback: prompt for JSON, parse with Pydantic `model_validate_json`, and retry once. Alternatively, force the structure through a function declaration (`submit_triage(...)`), which *is* documented. — medium for function calling, low for the schema (https://dev.to/ai_made_tools/responsejsonschema-the-undocumented-gemma-4-feature-that-changed-everything-2obm, https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api)
- **Rate limits:** the official rate-limits page has **no Gemma 4 row**. It only says limits are "applied per project, not per API key", RPD resets at midnight PT, and live limits are shown in AI Studio. The only figure, 15 RPM / unlimited TPM / 1,500 RPD for both models, comes from a secondary source that read it off the AI Studio screen. — medium (https://ai.google.dev/gemini-api/docs/rate-limits, https://tilnote.io/pages/6a51b3398d9a59d14c1c174c)
- **The Solidgate shape for the fake billing service is documented:**
  - `/api/v2/subscriptions/cancel-subscription` with mode `NOW` | `PERIOD_END` and an optional comment, which writes `cancellation_info` (`requested_at`, `cancel_at`, `comment`). Reason codes: `CANCELLATION_REQUESTED`, `DUNNING_EXHAUSTED`, `FRAUD_ALERT_RECEIVED`, `DISPUTE_RECEIVED`.
  - Statuses: ACTIVE, TRIALING, REDEMPTION, UNPAID, CANCELLED.
  - Undo: `/api/v2/subscriptions/delete-subscription-cancellation`.
  - Webhooks: `SUBSCRIPTION_CANCELLED`, `SUBSCRIPTION_SCHEDULED_FOR_CANCELLATION`, `SUBSCRIPTION_UPDATED`.

  "Confirmed" in our UI should mean "the webhook event was received", not "the HTTP call returned 200". That makes a nice async moment in the demo. I found no Solidgate refund endpoint, so model the refund on the Stripe `/refunds` shape. — high for cancel (https://docs.solidgate.com/billing/subscriptions/subscriptions-2.0/manage-subscriptions/cancel-subscription/)

### (4) What could kill the live demo, and the fix for each
- **500/503s.** Gemma 4 users report "A LOT of 500/503… completely unusable in certain daytime" (12 Jun 2026), still unanswered by Google on 9 Jul 2026. A general "Frequent 503 Errors… across all models" thread has 123 replies.
  - Fixes: retry with exponential backoff (2–3 tries).
  - On a final failure, fall back to recorded responses behind `AGENT_IMPL=fake`, with a visible "cached" badge so it's honest.
  - Record the demo video in the morning.

  — medium (https://discuss.ai.google.dev/t/gemma4-via-gemini-api-500-503/171017)
- **Latency.** 4-ai-fit.md measured the 31B at ~35 tok/s, so a 400-token reply takes ~12 s.
  - Fixes: use the 26B with thinking set to minimal for extraction and QA, and the 31B only for the planner.
  - Stream status steps in the UI ("reading account… checking policy §6.7…") so the wait looks like work.
  - Pre-compute the QA tab over the seeded tickets before the demo.

  — medium (research/4-ai-fit.md)
- **15 RPM per project, shared by 4 developers plus the demo.** Fixes: give each developer their own project and key while building, and use a dedicated, untouched project for the demo. — medium (https://ai.google.dev/gemini-api/docs/rate-limits)
- **"Just another copilot" or "this is Fin/Lorikeet".** Fin and Lorikeet both have eligibility checks, approvals and QA (above). The fix is to make the unique beats the *visible* climax:
  1. A drafted reply says "refunded"; the **Send button is locked** until the refund webhook arrives.
  2. Fake billing returns a delayed or failed refund; the reply stays locked and gets re-drafted honestly ("your refund is pending").
  3. QA flags a historical ticket where an agent wrote "cancelled" with no cancel event in the log ("Nate: 3 promises, 0 executed").
  4. The Liven review "told I would not be charged anymore. The charges have continued" on a slide as the why.

  — medium (my synthesis from the sources above)
- **Structured output failing on the free tier.** Smoke-test `response_json_schema` on both models in the first hour, and keep the function-declaration fallback ready (see (3)). — low (single source)

## Evidence against / open doubts
- **Not novel on QA.** Lorikeet Coach already scores 100% of tickets, finds root causes and proposes fixes with approval. The "Audit" half alone won't impress judges who know the market. (https://www.aap.com.au/aapreleases/cision20260129ae73915)
- **We might not find the absence.** Fin Procedures has "Wait for webhook" and data connectors that can read transaction status. A Fin customer could build a verify-then-reply flow by hand, so we can't claim "nobody can do this", only "nobody guards the reply by default". (https://fin.ai/help/en/articles/13976198)
- **Lorikeet's guardrails come close.** "Response checks that can block, rewrite or escalate a reply" are near our send-lock. The difference is that ours checks against the action log rather than the content. (https://www.lorikeetcx.ai/articles/ai-agents-refunds-cancellations-stripe-2026)
- **The real root cause may sit upstream.** Several complaints are about funnel disclosure (RiseGuide's 12-week renewal, "didn't know it was a subscription"), not support execution. A support tool can only refund after the fact. That's an argument for the QA cluster → product-fix beat, but judges may say it treats the symptom. (https://itunes.apple.com/us/rss/customerreviews/page=1/id=6737224695/sortby=mostrecent/json)
- **The quotes are one-sided.** Some "charged after cancel" cases are App Store subscriptions that the app can't cancel (PawChamp's own policy: "You alone can manage your in-app subscription"). The store-redirect action matters, and the copilot must recognise these cases. (research/6-pawchamp.md)
- **Unverified:** structured output on Gemma and the 15 RPM limit.

## Existing products and tools
| name | url | what it does | weakness / gap |
|---|---|---|---|
| Intercom Fin Procedures + Data connectors | https://fin.ai/help/en/articles/13976198 | Natural-language multi-step procedures; refund eligibility check, escalation, "Wait for webhook" | Managed availability via account manager; no documented check that the action succeeded and no policy-clause citation |
| Fin "Loop in teammate" | https://www.intercom.com/help/en/articles/14468561 | Approval card in the inbox or Slack; procedure pauses until a decision | Decision is only logged as a conversation note; no policy engine |
| Lorikeet Concierge + Guardrails | https://www.lorikeetcx.ai/articles/ai-agents-refunds-cancellations-stripe-2026 | Stripe refunds; eligibility in code tools; execution caps; reply checks | Stripe integration in beta; from $2,100/mo; no approval gate or execution proof described |
| Lorikeet Coach | https://www.aap.com.au/aapreleases/cision20260129ae73915 | 100% rubric QA, explains metric trends, proposes fixes and applies them with approval | Same as our Audit beat; doesn't check whether promises were executed |

## Data, APIs and repos we could use
| name | url | access | licence | notes |
|---|---|---|---|---|
| Gemma 4 via Gemini API (`gemma-4-26b-a4b-it`, `gemma-4-31b-it`) | https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api | free API key (AI Studio); free tier only | Apache 2.0 weights; API ToS | `types.Tool(function_declarations=...)` documented; schema output not documented; ~15 RPM per project (secondary) |
| Solidgate Billing 2.0 cancel API (shape for the fake) | https://docs.solidgate.com/billing/subscriptions/subscriptions-2.0/manage-subscriptions/cancel-subscription/ | public docs | n/a (we only mirror the shape) | `NOW`/`PERIOD_END`, `cancellation_info`, statuses, 3 webhook events |
| iTunes customer-reviews RSS | https://itunes.apple.com/us/rss/customerreviews/page=1/id=6450840109/sortby=mostrecent/json | free, no key | Apple content; quote only | Seed realistic tickets and QA clusters (Liven 6450840109, RiseGuide 6737224695, BetterMe 1264546236) |
| Trustpilot BetterMe 1★ page | https://www.trustpilot.com/review/betterme.world?stars=1 | public page | Trustpilot ToS | Source for usage-conditioned refund and retention-offer patterns |

## What this means for the idea
- Keep #3, but **re-centre the pitch on #9 (Promise Keeper)**:
  - The reply can't claim an action until billing confirms it.
  - Every promise in a reply becomes a tracked action.
  - QA scores whether promises were kept.

  That is the gap Fin and Lorikeet leave open. Action proposals and approvals are table stakes; show them, but don't sell them as new.
- Make "confirmed" mean **webhook received** (Solidgate-style `SUBSCRIPTION_CANCELLED`), with one scripted delayed or failed refund. Seeing the reply stay locked and get re-drafted honestly is the moment judges remember.
- Policy engine rule types to cover: time window (EU 14d / BR 7d), usage condition (the "7 days / 7 workouts" pattern), store-billed → redirect, and a goodwill cap. Gemma only proposes; code decides.
- First hour: smoke-test function calling and `response_json_schema` on both Gemma IDs. Then build retry plus a fixture fallback, use a separate demo project or key, and record the video before lunch.
- Use the Liven "told I would not be charged anymore. The charges have continued" quote and Priceline Penny as the two-line "why". Skip Reddit, since we have no sourced Reddit quotes.

## Sources read
- https://itunes.apple.com/us/rss/customerreviews/page=1/id=6450840109/sortby=mostrecent/json: Liven iOS reviews (pages 1–3); three 2026 "charged after cancel / support said cancelled" quotes.
- https://itunes.apple.com/us/rss/customerreviews/page=1/id=6737224695/sortby=mostrecent/json: RiseGuide iOS; 12-week renewal $39.99→$79.99, support pointed to the terms.
- https://www.trustpilot.com/review/betterme.world?stars=1: BetterMe 4.4 from 115,962 reviews; Oct 2026 one-star reviews on charges after cancel, the "earn my refund" condition and retention offers.
- https://www.sikayetvar.com/en/liven-us/liven-misled-me-with-false-promises-and-denied-my-refunddespite-following-rules: a different "Liven" (restaurant rewards, 2024); **not used**.
- https://vibegraveyard.ai/story/priceline-penny-chatbot-fake-refund/: Priceline chatbot promised a refund that was never executed (Telegraph, May 2026).
- https://fin.ai/help/en/articles/13976198: Fin Procedures and Data connectors; eligibility check, escalation, Wait for webhook, managed availability.
- https://www.intercom.com/help/en/articles/14468561: Fin "Loop in teammate" approval step; decision logged as a note.
- https://www.lorikeetcx.ai/articles/ai-agents-refunds-cancellations-stripe-2026: Lorikeet Stripe refunds (beta); eligibility in code; execution caps; pricing.
- https://www.lorikeetcx.ai/: product list (Concierge, Guardrails, Auto QA, Coach); fintech and healthtech customers.
- https://www.lorikeetcx.ai/blog/lorikeet-ai-a-technical-deep-dive: body not rendered; nav only.
- https://www.aap.com.au/aapreleases/cision20260129ae73915: Lorikeet Coach; 100% rubric QA, root cause, fixes with approval (Jan 2026).
- https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api: official function-calling snippet with google-genai; two model IDs; no structured output; deprecated notice.
- https://www.philschmid.de/gemma-4-gemini-api: same function-calling pattern; reads `parts[0].function_call`.
- https://dev.to/ai_made_tools/responsejsonschema-the-undocumented-gemma-4-feature-that-changed-everything-2obm: responseJsonSchema 99%+ vs ~50%; caveats including a free-tier "Internal error".
- https://ai.google.dev/gemini-api/docs/rate-limits: no Gemma 4 row; limits per project; check AI Studio.
- https://discuss.ai.google.dev/t/gemma4-via-gemini-api-500-503/171017: Gemma 4 500/503 reports, Jun–Jul 2026, no Google reply.
- https://docs.solidgate.com/billing/subscriptions/subscriptions-2.0/manage-subscriptions/cancel-subscription/: cancel modes, cancellation_info, statuses, webhooks.
