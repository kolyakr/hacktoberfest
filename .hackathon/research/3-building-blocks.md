# Building blocks: what open datasets, free APIs and open-source repos can we build on in one day?: Use the MIT-licensed tau2-bench retail domain as our simulated store (database, policy, read/write tools, 114 tasks with expected actions), ABCD's agent guidelines and action labels for "next best action", Bitext for intent tests, and one real action in an anonymous Stripe sandbox plus a Telegram bot. Skip self-hosting a helpdesk (Chatwoot, Zammad, FreeScout).

## Key findings

**(a) Datasets**

- **tau2-bench retail domain is the best ready-made "simulated digital product".** It is MIT-licensed. `data/tau2/domains/retail/db.json` holds 50 products, 500 users and 1,000 orders; I checked this by downloading it. `policy.md` is a human-readable agent policy: authenticate by email or name+zip, confirm before any write, transfer to a human when out of scope. `src/tau2/domains/retail/tools.py` has 13 typed tools, each tagged READ, WRITE or GENERIC (`cancel_pending_order`, `return_delivered_order_items`, `exchange_delivered_order_items`, `modify_pending_order_address/items/payment`, `modify_user_address`, `get_order_details`, `get_user_details`, `find_user_id_by_email`, `find_user_id_by_name_zip`, `transfer_to_human_agents`, and others). `tasks.json` has 114 tasks, each with a user scenario (reason for call, known and unknown info) and the expected tool calls (`evaluation_criteria.actions`). Together these give us a store to act on and a ground truth for scoring the agent. The repo also has airline, telecom, banking_knowledge and other domains, needs Python >=3.12 and uv, and works with any LiteLLM provider. — **high** (https://github.com/sierra-research/tau2-bench, files read through the GitHub API and raw.githubusercontent.com)
- **Use the fixed tasks, not the original tau-bench.** The original `sierra-research/tau-bench` README says "The tasks in this repo are not updated" and points to tau2/tau3. Amazon AGI's `tau2-bench-verified` (MIT) corrects task definitions, expected actions and evaluation criteria for the mock, airline, retail and telecom domains, and lists every change in FIXES.md. — **high** (https://github.com/sierra-research/tau-bench, https://github.com/amazon-agi/tau2-bench-verified)
- **ABCD (Action-Based Conversations Dataset) is the closest dataset to "AI proposes the next action".** It is MIT-licensed and has more than 10k human-to-human dialogues covering 55 subflow intents in 10 flows. Each turn is labelled with the next step (take_action / retrieve_utterance / end_conversation), the agent's button action (30 options) and slot values (125 options). The download is a single `data/abcd_v1.1.json.gz`. Three small files are directly useful:
  - `kb.json` maps each intent to its required action sequence, for example `recover_password -> pull-up-account, enter-details, make-password`.
  - `ontology.json` lists the actions with their slots, for example `offer-refund[amount]`, `update-order[...]`, `notify-team[company_team]`, `verify-identity[...]`.
  - `guidelines.json` is the agent SOP per flow and subflow, in prose.
  
  Together they are a ready-made "policy and playbook" for a recommender, and the dialogues can serve as an offline test set. — **high** (https://github.com/asappresearch/abcd, plus `ontology.json`, `kb.json` and `guidelines.json` downloaded from raw.githubusercontent.com/asappresearch/abcd)
- **Bitext customer-support dataset.** It has 26,872 single-turn instruction/response pairs (about 1,000 per intent) with fields flags, instruction, category, intent and response. The card says 27 intents in 10 categories (order, refund, invoice, account, shipping address, payment, and so on). It is a CSV in English under CDLA-Sharing-1.0, which is share-alike for derivative data. It is good for testing an intent classifier, not for multi-turn work. A larger sibling, Bitext retail eCommerce, has 44,884 rows, 46 intents in 13 categories, and is described as "hybrid synthetic". — **high** (https://huggingface.co/datasets/bitext/Bitext-customer-support-llm-chatbot-training-dataset/blob/main/README.md, https://huggingface.co/datasets/bitext/Bitext-retail-ecommerce-llm-chatbot-training-dataset)
- **Tobi-Bueck/customer-support-tickets is useful for triage and prioritisation demos.** It has 61.8k rows with subject, body, answer, type (4 classes), queue (52 classes), priority (5 classes), language (EN/DE) and tags. It is licensed CC BY-NC 4.0, so it is fine for a hackathon demo but not for commercial use. — **medium** (https://huggingface.co/datasets/Tobi-Bueck/customer-support-tickets)
- **Real (noisy) Twitter support pairs.** An HF mirror has 945,278 customer-tweet / agent-reply pairs (222 MB) under CC BY-NC-SA 4.0, with some garbled text. I could not read the original Kaggle page, so its licence is unverified. — **medium** (https://huggingface.co/datasets/MohammadOthman/mo-customer-support-tweets-945k)
- **MAIA-DQE is the only dataset I found with QA-style quality labels on support chats.** Labels exist at dialogue level (dropped conversation, task success), turn level (understanding, sensibleness, politeness, IQ) and sentence level (correctness, templated, engagement, emotion). It is licensed CC BY-ND 4.0 (no derivatives) and the repo has 4 stars. It could be a reference for our QA rubric, but is weak as a direct input. — **medium** (https://github.com/johndmendonca/maia-dqe; LICENSE.md read through the GitHub API)
- **MultiWOZ and Taskmaster are general task-oriented dialogue sets, not support-specific.** MultiWOZ has 10k dialogues and is MIT-licensed. The Taskmaster repo (more than 55k dialogues) was archived on 2026-04-19, and the page states no licence. Both are low value for us. — **medium** (https://github.com/budzianowski/multiwoz, https://github.com/google-research-datasets/Taskmaster)
- **Ukrainian angle: I found no public Ukrainian customer-support dialogue dataset.** The closest is UAReviews (UNLP 2026): 11,580 Ukrainian texts (reviews of government digital services plus Telegram posts) labelled with 7 emotion classes and 5 intent classes. The paper says it is public, but I found no download link or licence. — **low** (https://aclanthology.org/2026.unlp-1.2/)

**(b) Sandbox APIs for real actions**

- **Stripe can be used with no account and no country check.** `stripe sandbox create --email ...`, with the CLI logged out, provisions an anonymous sandbox with working test API keys after a proof-of-work check. It expires after 7 days unless claimed. This avoids the problem that Stripe is not available for Ukrainian businesses. Sandbox rate limit is 25 req/s. Refunds, subscriptions (create/update/cancel), invoices, coupons and test clocks are all in the API. — **high** (https://docs.stripe.com/cli/sandbox, https://docs.stripe.com/sandboxes, https://docs.stripe.com/rate-limits)
- **Stripe has its own agent-safety pattern we can copy.** In Stripe's hosted MCP server (https://mcp.stripe.com), "Create refund" is marked as needing human confirmation, which is a good model for our approve-before-act flow. From December 2026, MCP will accept only OAuth or "agent API keys". For our FastAPI backend we should call the plain Stripe REST API/SDK through our own Gemma tool layer and not use MCP, because MCP is not needed and the product's AI must be Gemma. — **high** (https://docs.stripe.com/mcp)
- **`stripe-mock` is a fallback only.** It is MIT-licensed and runs in Docker, but it is stateless (POSTs are validated and then ignored) and cannot simulate errors. A refund demo against it would be a visible mock. — **high** (https://github.com/stripe/stripe-mock)
- **Telegram Bot API is free, has no business verification, and is the easiest real customer channel or agent-approval channel.** It authenticates with a BotFather token. Inline keyboards return `callback_query`, which works for Approve/Reject buttons. Limits are about 1 msg/s per chat and 20 msg/min per group. Long polling (`getUpdates`) works with no public HTTPS URL, which suits a laptop demo. Webhooks need SSL on port 443, 80, 88 or 8443. — **high** (https://core.telegram.org/bots/faq, https://core.telegram.org/bots/api)
- **Linear API limits.** API key: 2,500 req/h. OAuth: 5,000 req/h. I could not confirm free-plan limits or webhook access, so Linear is only plausible for an "escalate: create bug ticket" action. GitHub Issues through `gh` is a zero-setup alternative. — **medium** (https://linear.app/developers/rate-limiting)
- **The Freshdesk free plan has no API** (0 calls/min). Trials get 50 calls/min. — **high** (https://support.freshdesk.com/en/support/solutions/articles/225439-what-are-the-rate-limits-for-the-api-calls-to-freshdesk)
- **Zendesk has a 14-day trial.** Sponsored dev accounts are only for Marketplace app developers. The page does not say whether the trial includes API access. This adds signup friction for no demo gain. — **medium** (https://developer.zendesk.com/documentation/api-basics/getting-started/getting-a-trial-or-sponsored-account-for-development/)
- **Shopify dev stores are possible but take more setup.** Dev stores need a Partner account or Dev Dashboard. They can be seeded with `shopify store create dev --demo-data` and use the test payment gateway. `refundCreate` (Admin GraphQL) needs the `orders` scope and, as of 2026-04, an idempotency key. This is more setup than Stripe for the same "refund" story. — **medium** (https://shopify.dev/docs/apps/build/dev-dashboard/development-stores, https://shopify.dev/docs/api/admin-graphql/latest/mutations/refundCreate)
- **Mailtrap could give us a safe "send email to customer" action.** The free sending plan allows 4,000 emails/month (150/day). The free sandbox allows 50 test emails/month, 1 inbox and 1 email per 10 s, and the page does not say whether the free sandbox includes API access. — **medium** (https://mailtrap.io/pricing/)
- **Ukrainian real APIs exist but have access barriers.**
  - Nova Poshta tracking: POST `api.novaposhta.ua/v2.0/json/` with `TrackingDocument/getStatusDocuments`, up to 100 waybills per call, returns `Status`/`StatusCode`. It needs an API key, and I could not verify how to get one. — **low** (https://www.createit.com/?p=4795)
  - monobank acquiring: has a refund endpoint, `POST /api/merchant/invoice/cancel` with an `X-Token` header and optional partial `amount` in kopecks. The docs mention a test token from api.monobank.ua, but that cabinet logs in by QR code through the app, and I could not confirm whether you need FOP (sole-proprietor) status. — **low** (https://monobank.ua/api-docs/acquiring/methods/ia/post--api--merchant--invoice--cancel, https://api.monobank.ua/)

**(c) Repos and frameworks**

- **openai-cs-agents-demo is the closest reference for the "agent view" UX.** It is MIT-licensed with 6.6k stars, last pushed 2025-12. It has a Python backend run with uvicorn and a Next.js UI that shows agent orchestration, guardrail trips (shown in red) and handoffs between triage and specialist agents (refunds/compensation, booking, seats, FAQ) in an airline domain. It is tied to the OpenAI Agents SDK and ChatKit, so we should borrow the UX idea, not the code. — **high** (https://github.com/openai/openai-cs-agents-demo)
- **Self-hosted helpdesks are too heavy for one day.**
  - Chatwoot (38.7k stars) is MIT outside `enterprise/`. It needs Postgres, Redis and Sidekiq through docker compose. It has an Agent Bot API (webhook to our URL, reply through the messages API).
  - The Chatwoot Cloud free "Hacker" plan allows 2 agents, 500 conversations/month and 30-day retention, and the page does not say whether it includes API or agent-bot access.
  - Zammad (6.1k stars) and FreeScout (4.6k stars) are AGPL-3.0.
  
  — **high** (https://www.chatwoot.com/pricing, https://developers.chatwoot.com/self-hosted/deployment/docker, https://github.com/chatwoot/chatwoot, https://github.com/zammad/zammad, https://github.com/freescout-help-desk/freescout)
- **deepeval could serve as an eval and QA harness.** It is Apache-2.0 with 19.2k stars. It has multi-turn metrics (Conversation Completeness, Role Adherence, Knowledge Retention, Conversation Relevancy), agentic metrics (Task Completion, Tool Correctness, Argument Correctness) and custom G-Eval. It supports a Gemini judge through `GeminiModel` / `GOOGLE_API_KEY`, and a custom judge through `DeepEvalBaseLLM`. The docs do not mention Gemma, and they warn that custom judges need valid JSON output. — **medium** (https://deepeval.com/docs/metrics-introduction, https://deepeval.com/integrations/models/gemini)
- **Gemma 4 through the Gemini API.**
  - Model IDs are `gemma-4-31b-it` and `gemma-4-26b-a4b-it`. Function calling and system instructions are supported, according to a doc page that now marks itself deprecated. — **medium** (https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api)
  - Ukraine is a supported Gemini API region. — **medium** (https://ai.google.dev/gemini-api/docs/available-regions)
  - A third-party page says Gemma 4 is "free of charge, no paid tier", and that per-model RPM/RPD limits are only visible in AI Studio. — **low** (https://apidog.com/blog/gemini-api-free-tier/)

## Evidence against / open doubts
- **tau-bench ground truth is known to be imperfect.** It has policy and data mismatches, which is why tau2-bench-verified exists. Use the verified tasks, or hand-check the few we demo (https://github.com/amazon-agi/tau2-bench-verified).
- **tau2-bench domain code imports its own framework** (`tau2.environment.toolkit`). Lifting `db.json`, `policy.md` and the tool logic into our own Pydantic tools is probably faster than adding tau2 as a dependency. This is my judgement from reading `tools.py`, not tested (https://github.com/sierra-research/tau2-bench).
- **Bitext data is synthetic or hybrid and single-turn.** A demo built only on it can look "toy" (https://huggingface.co/datasets/bitext/Bitext-retail-ecommerce-llm-chatbot-training-dataset).
- **No found dataset combines real transcripts, CSAT and QA labels with a permissive licence.** MAIA-DQE is CC BY-ND, and the Twitter and ticket data are NC. Our "evaluate support effectiveness" part will have to use an LLM-judge rubric scored against tau2 expected actions and ABCD action labels (https://github.com/johndmendonca/maia-dqe, https://huggingface.co/datasets/Tobi-Bueck/customer-support-tickets).
- **The Stripe anonymous sandbox expires after 7 days.** It is fine for the event, but the deployed QR-code demo would break later unless the sandbox is claimed (https://docs.stripe.com/cli/sandbox).
- **Unconfirmed: whether Gemma 4 on the Gemini API honours `response_schema` structured output.** Only function calling is documented, so plan to validate with Pydantic and retry (https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api).
- **Free-tier rate limits for Gemma are not published.** We must check them in AI Studio before relying on a multi-call agent loop (https://apidog.com/blog/gemini-api-free-tier/).

## Existing products and tools
| name | url | what it does | weakness / gap |
|---|---|---|---|
| openai-cs-agents-demo | https://github.com/openai/openai-cs-agents-demo | Airline CS multi-agent demo with an orchestration and guardrail visualiser | Tied to OpenAI Agents SDK and ChatKit; customer-facing bot, not an agent copilot; no QA/analytics |
| Chatwoot | https://github.com/chatwoot/chatwoot | Open-source omnichannel helpdesk with an Agent Bot API | Heavy self-host (Postgres, Redis, Sidekiq); free cloud plan limited, API access unconfirmed |
| Zammad | https://github.com/zammad/zammad | Open-source helpdesk | AGPL-3.0; heavy |
| FreeScout | https://github.com/freescout-help-desk/freescout | Self-hosted shared mailbox / helpdesk | AGPL-3.0; PHP; heavy |
| Stripe MCP | https://docs.stripe.com/mcp | Hosted MCP: read/write Stripe API, refunds with human confirmation | Product AI must be Gemma; useful as a UX pattern (human-confirmation on refunds) |
| Freshdesk | https://support.freshdesk.com/en/support/solutions/articles/225439-what-are-the-rate-limits-for-the-api-calls-to-freshdesk | SaaS helpdesk | Free plan has 0 API calls |
| Zendesk | https://developer.zendesk.com/documentation/api-basics/getting-started/getting-a-trial-or-sponsored-account-for-development/ | SaaS helpdesk | 14-day trial; sponsored accounts only for Marketplace devs |

## Data, APIs and repos we could use
| name | url | access | licence | notes |
|---|---|---|---|---|
| tau2-bench (retail/airline/telecom) | https://github.com/sierra-research/tau2-bench | public GitHub, `uv sync` | MIT | 2.4k stars, pushed 2026-10-30; retail db 50 products / 500 users / 1,000 orders; 114 retail tasks with expected actions; policy.md; READ/WRITE-tagged tools |
| tau2-bench-verified | https://github.com/amazon-agi/tau2-bench-verified | public GitHub | MIT | Corrected tasks; FIXES.md |
| ABCD | https://github.com/asappresearch/abcd | `data/abcd_v1.1.json.gz` in repo | MIT | 10k+ dialogues, 55 intents, 30 actions, 125 slot values; kb.json (intent to action sequence), guidelines.json (SOP); last push 2022 |
| Bitext customer support | https://huggingface.co/datasets/bitext/Bitext-customer-support-llm-chatbot-training-dataset | HF, CSV | CDLA-Sharing-1.0 | 26,872 rows, 27 intents / 10 categories, single-turn |
| Bitext retail eCommerce | https://huggingface.co/datasets/bitext/Bitext-retail-ecommerce-llm-chatbot-training-dataset | HF | CDLA-Sharing-1.0 | 44,884 rows, 46 intents, hybrid synthetic |
| customer-support-tickets | https://huggingface.co/datasets/Tobi-Bueck/customer-support-tickets | HF, CSV | CC BY-NC 4.0 | 61.8k tickets with queue (52), priority (5), type (4), EN/DE; good for triage/priority |
| Twitter CS pairs (mirror) | https://huggingface.co/datasets/MohammadOthman/mo-customer-support-tweets-945k | HF | CC BY-NC-SA 4.0 | 945k real tweet/reply pairs, noisy |
| MAIA-DQE | https://github.com/johndmendonca/maia-dqe | GitHub | CC BY-ND 4.0 | Dialogue and turn quality labels (task success, politeness, understanding); no derivatives |
| MultiWOZ | https://github.com/budzianowski/multiwoz | GitHub | MIT | 10k multi-domain (hotel, restaurant, etc.) dialogues; not support-specific |
| UAReviews | https://aclanthology.org/2026.unlp-1.2/ | link not found | unknown | 11,580 Ukrainian texts, emotion and intent labels |
| Stripe sandbox (anonymous) | https://docs.stripe.com/cli/sandbox | `stripe sandbox create`, no account | Stripe ToS | Test keys immediately; 7-day expiry; 25 req/s; refunds, subscriptions, invoices, coupons |
| stripe-mock | https://github.com/stripe/stripe-mock | Docker | MIT | Stateless; fallback only |
| Telegram Bot API | https://core.telegram.org/bots/api | free, BotFather token | Telegram ToS | Inline-button approvals; ~1 msg/s per chat; long polling with no public URL |
| Linear GraphQL API | https://linear.app/developers/rate-limiting | API key | Linear ToS | 2,500 req/h per key; free-plan details unverified |
| Shopify dev store + Admin GraphQL | https://shopify.dev/docs/apps/build/dev-dashboard/development-stores | Partner / Dev Dashboard account | Shopify ToS | Demo data and test gateway; `refundCreate` needs the `orders` scope and an idempotency key |
| Mailtrap | https://mailtrap.io/pricing/ | free signup | Mailtrap ToS | Sending: 4,000/mo, 150/day; sandbox free plan: 50 emails/mo |
| Nova Poshta API | https://www.createit.com/?p=4795 | API key (how to obtain unverified) | n/a | Ukrainian parcel tracking; up to 100 waybills per call |
| monobank acquiring | https://monobank.ua/api-docs/acquiring/methods/ia/post--api--merchant--invoice--cancel | X-Token; test token eligibility unverified | n/a | Ukrainian refunds (`invoice/cancel`); likely needs FOP |
| deepeval | https://deepeval.com/docs/metrics-introduction | `pip install deepeval` | Apache-2.0 | 19.2k stars; conversational and tool-correctness metrics; Gemini judge; Gemma untested |
| Gemma 4 on Gemini API | https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api | Gemini API key | Gemma terms | `gemma-4-31b-it`, `gemma-4-26b-a4b-it`; function calling; Ukraine is a supported region |

## What this means for the idea
- **Simulated product.** Make our product a store built from tau2-bench retail: load `db.json` into memory, port the 13 tools as Pydantic-typed functions with the READ/WRITE split, and give Gemma `policy.md` as the system policy. WRITE tools go through an "agent approves" step, which answers "proposes or initiates actions" and gives a safety story. This keeps the core feature real, not mocked, at almost no data-building cost.
- **One external real action.** Use one action that judges can see: a Stripe refund or subscription cancel in an anonymous sandbox (no account, no Ukraine block), and/or a Telegram message with Approve/Reject buttons. Avoid Freshdesk, Zendesk, Shopify and self-hosting Chatwoot, Zammad or FreeScout: they cost setup time and add no demo value.
- **Real evaluation numbers.** For "analyzes interactions and evaluates effectiveness", score Gemma's proposed actions against the expected actions in the tau2 tasks (preferably the verified set) and ABCD's `kb.json` action sequences. This gives a measured accuracy number to show on a dashboard slide instead of a vibe-based QA score. deepeval or a small Pydantic-validated Gemma-as-judge rubric can add per-conversation QA scores.
- **Intents and triage.** Use ABCD `guidelines.json` / `kb.json` as the intent-to-playbook map for "next best action", Bitext for an intent-classification test set, and the Tobi-Bueck tickets (NC licence; demo only) for a priority/queue triage view.
- **Ukrainian angle.** No Ukrainian support dataset exists, so a Ukrainian-language customer message handled by the same pipeline is a cheap differentiator. Nova Poshta and monobank are attractive local "real actions", but they have unverified key access, so don't put them on the demo path.

## Sources read
- https://huggingface.co/datasets/bitext/Bitext-customer-support-llm-chatbot-training-dataset/blob/main/README.md: CDLA-Sharing-1.0, 26,872 rows, 27 intents / 10 categories, CSV fields.
- https://huggingface.co/datasets/bitext/Bitext-retail-ecommerce-llm-chatbot-training-dataset: 44,884 rows, 46 intents, 13 categories, hybrid synthetic, CDLA-Sharing.
- https://github.com/asappresearch/abcd: 10k+ dialogues, 55 intents, 30 actions, 125 values; MIT; file layout.
- raw.githubusercontent.com/asappresearch/abcd/master/data/{ontology,kb,guidelines}.json: action list with slots, intent-to-action sequences, SOP prose per flow.
- https://github.com/sierra-research/tau2-bench: domains, install (uv, Python 3.12+), LiteLLM providers, MIT; retail `tools.py`, `policy.md`, `db.json` (50/500/1000) and `tasks.json` (114) read directly.
- https://github.com/sierra-research/tau-bench: README says tasks are not updated; points to tau2/tau3; MIT.
- https://github.com/amazon-agi/tau2-bench-verified: human-corrected tasks for mock/airline/retail/telecom; MIT.
- https://huggingface.co/datasets/Tobi-Bueck/customer-support-tickets: 61.8k tickets, queue/priority/type, EN/DE, CC BY-NC 4.0.
- https://huggingface.co/datasets/MohammadOthman/mo-customer-support-tweets-945k: 945k Twitter support pairs, CC BY-NC-SA 4.0.
- https://github.com/johndmendonca/maia-dqe: quality and emotion annotations on support chats; LICENSE.md is CC BY-ND 4.0.
- https://github.com/google-research-datasets/Taskmaster: 55k+ dialogues, archived 2026-04-19, no licence on page.
- https://github.com/budzianowski/multiwoz: 10k dialogues, MIT (README read through the GitHub API).
- https://aclanthology.org/2026.unlp-1.2/: UAReviews abstract (11,580 Ukrainian texts, emotion and intent); no data link.
- https://docs.stripe.com/cli/sandbox: anonymous sandbox via CLI, proof-of-work, 7-day expiry, claim flow.
- https://docs.stripe.com/sandboxes: sandboxes overview; agents can provision without registration.
- https://docs.stripe.com/rate-limits: sandbox 25 req/s; live 100 req/s; subscription invoice limits.
- https://docs.stripe.com/mcp: hosted MCP tools; refund requires human confirmation; agent-key migration by 2026-11-30.
- https://github.com/stripe/stripe-mock: stateless mock, Docker, MIT.
- https://github.com/stripe/ai: Stripe AI SDK packages and plugins; MIT; no generic function-calling toolkit described.
- https://core.telegram.org/bots/faq: free messaging, rate limits, webhook vs getUpdates.
- https://core.telegram.org/bots/api: BotFather token, InlineKeyboardMarkup, callback_query.
- https://linear.app/developers/rate-limiting: API key 2,500 req/h; OAuth 5,000 req/h.
- https://support.freshdesk.com/en/support/solutions/articles/225439-what-are-the-rate-limits-for-the-api-calls-to-freshdesk: Free plan 0 calls/min; trial 50/min.
- https://developer.zendesk.com/documentation/api-basics/getting-started/getting-a-trial-or-sponsored-account-for-development/: 14-day trial; sponsored accounts for Marketplace devs only.
- https://shopify.dev/docs/apps/build/dev-dashboard/development-stores: dev store creation, demo data, test gateway, limits.
- https://shopify.dev/docs/api/admin-graphql/latest/mutations/refundCreate: refund mutation, `orders` scope, idempotency key required.
- https://mailtrap.io/pricing/: free sending 4,000/mo; sandbox 50 emails/mo.
- https://www.createit.com/?p=4795: Nova Poshta tracking request and response format.
- https://monobank.ua/api-docs/acquiring/methods/ia/post--api--merchant--invoice--cancel: monobank refund endpoint; test token mentioned.
- https://api.monobank.ua/: cabinet requires QR login through the app; no eligibility info.
- https://github.com/openai/openai-cs-agents-demo: airline CS multi-agent demo with Next.js visualiser; MIT; OpenAI-coupled.
- https://www.chatwoot.com/pricing: free Hacker plan (2 agents, 500 conversations/month, 30-day retention).
- https://developers.chatwoot.com/self-hosted/deployment/docker: needs Postgres and Redis (plus Sidekiq); 6-step setup.
- https://github.com/chatwoot/chatwoot: LICENSE is MIT outside `enterprise/` (read through the GitHub API); 38.7k stars.
- https://deepeval.com/docs/metrics-introduction: conversational, agentic and G-Eval metrics; any LLM judge.
- https://deepeval.com/integrations/models/gemini: `GeminiModel` judge setup; no Gemma mention.
- https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api: Gemma 4 model IDs; function calling; page marked deprecated.
- https://ai.google.dev/gemini-api/docs/available-regions: Ukraine is listed.
- https://apidog.com/blog/gemini-api-free-tier/: Gemma 4 free with no paid tier (as of 2026-10-22); limits only shown in AI Studio.
- GitHub API (`gh api repos/...`): stars, licence and last push for tau2-bench (2,362, MIT), tau-bench (1,484, MIT), abcd (91, MIT), chatwoot (38,658), zammad (6,059, AGPL), freescout (4,626, AGPL), deepeval (19,211, Apache-2.0), promptfoo (26,665, MIT), stripe-mock (1,659, MIT), openai-cs-agents-demo (6,599, MIT), assistant-ui (12,861, MIT), CopilotKit (38,420, MIT).
