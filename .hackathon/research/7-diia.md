# Diia customer support: how it works today and what an AI operational assistant could automate. Answer: Diia already runs AI first-line support (about 85% of chatbot requests) and Diia.AI, which can carry out a handful of services. The gap left is the operator side. That means diagnosing *which registry or subsystem* broke, clustering outage tickets, tracking refunds, and catching support loops. It makes a credible second scenario, but it is weaker than PawChamp billing as the main demo.

## Key findings

### (a) Scale and support channels
- **Scale.** Mintsyfra's AI site says Diia "has scaled to 23 million users". The Diia portal has "more than 150 services". KMU says Diia.AI can advise on "more than 200 government services". — medium, official but promotional (https://ai.thedigital.gov.ua/en/news/A%20global%20case%20study%20from%20Google:%20How%20Ukraine%20is%20building%20AI%20agents%20based%20on%20Gemini%20Flash, https://www.kmu.gov.ua/news/obiednuiemosia-zi-svitovymy-tekhnohihantamy-dlia-rozvytku-shi-iak-diiaai-pratsiuie-na-tekhnolohii-gemini)
- **App Store (UA).** The app has a 4.23 average from 138,645 ratings. Version 4.38.4 was released on 2026-10-29. — high, live API (https://itunes.apple.com/lookup?id=1489717872&country=ua)
- **Support channels are chatbot-only.** The official FAQ lists the web chat (chat.diia.gov.ua), Telegram `Diia_help_bot`, Viber `diia_help_bot` and Facebook Messenger. It lists **no phone number and no email**. — high (https://diia.gov.ua/faq; channels confirmed by https://dou.ua/lenta/news/ai-services-mintsyfry-diia/)
- **Support volume (July 2025).** Support received 251,627 requests in one month. The chatbot closed 198,164 directly. 53,463 went on "to operators and AI", and AI closed 27,800 of those without an operator. — high, figures repeated by two outlets from Fedorov's column (https://dou.ua/lenta/news/ai-services-mintsyfry-diia/, https://dev.ua/news/iak-trenuvavsia-ai-v-dii-1753785474)
- **Support results (Sep 2025).** The AI consultant answers 85% of requests and has answered more than 350,000 dialogues on its own. Operator load fell 79%, to 17,000 unique dialogues. Operators handle only "10–15% unique complex" cases. The "operators busy" rate dropped from 5–7% to under 0.01%. Replies take up to 5 seconds, 24/7, and the AI identifies product and topic automatically. — medium (https://dev.ua/news/shi-u-dii-vzhe-obrobliaie-ponad-85-zvernen-1758634264)
- **How the support AI is built.** It runs on ChatGPT in Mintsyfra's own infrastructure and is integrated with the support CRM. Ex-operators were turned into "AI trainers" who describe each service's business process and write prompts. The target is correct answers to 80% of product questions. Staff check AI answers in real time and update the knowledge base. The model only receives de-personalised data. More than 100 operators were moved to trainer, prompt-engineer, QA or PM roles. — high (https://dev.ua/news/iak-trenuvavsia-ai-v-dii-1753785474, https://dou.ua/lenta/news/ai-services-mintsyfry-diia/)
- **Formal written appeals to Mintsyfra are a small, separate channel.** There were 3,271 in all of 2025: 1,969 by (e-)mail, 1,098 forwarded by other authorities, 182 online, 18 in person and 3 by phone. 2,835 were "заяви/клопотання" (applications/requests) and 262 were complaints. 2,757 were answered with "дано роз'яснення" (an explanation given) and 56 were resolved positively. Support at scale clearly runs through the chatbots, not through formal appeals. — high, read from the official XLSX (https://data.gov.ua/dataset/c45c1b2e-b15c-40ed-9d3f-632bd2fe3475)
- **Offline Дія.Центри / ЦНАП.** CNAPs handle 600+ types of administrative services. Mintsyfra is testing an AI assistant that "підказуватиме держслужбовцям необхідні алгоритми" (prompts civil servants with the procedures they need). This is a human-agent copilot, the closest official analogue to our idea, and it is still in testing as of 26 Sep 2026. — medium (https://dev.ua/news/mintsyfra-testuie-ai-asystenta-dlia-pratsivnykiv-tsnapiv-iak-vin-pratsiuvatyme-1790426602)

### (b) What users complain about
Method: I pulled the 100 most recent UA App Store reviews through Apple's RSS (2026-09-01 to 2026-10-28). 81 were 1–2 stars. I tagged them by keyword; tags overlap, so treat the counts as rough. Source: https://itunes.apple.com/ua/rss/customerreviews/page=1/id=1489717872/sortby=mostrecent/json (and page=3).

| Category | Reviews (of 100) | Typical quote | Answer or action? |
|---|---|---|---|
| **Дія.Підпис creation or loss** | 54 | "Кожні пару днів скидається дія підпис" ("Дія.Підпис resets every couple of days"); "вже майже другий рік чекаю відповіді" ("I've been waiting for an answer for almost two years") | Mostly diagnosis plus a bug escalation. It is an action only in the sense of "file a structured bug with the device and failure stage". |
| **NFC chip read** (ID card or foreign passport, now needed for the signature) | 26 | "3 срані телефони, 12 про, 14 про і 17 і ні на одному ця залупа не працює" ("3 damn phones, a 12 Pro, a 14 Pro and a 17, and this crap doesn't work on any of them"); "Як користуватися додатком людям без NFC?" ("How are people without NFC supposed to use the app?") | Answer (device tips) plus a known-issue link. Escalate by device model. |
| **Photo / liveness verification** | 16 | "зависає «залишайтесь в рамці, перевіряємо що це ви»" ("it freezes on 'stay in the frame, checking that it's you'"); "відростив бороду, прийшлось змінити паспорт" ("I grew a beard and had to get a new passport") | Escalation. Support gives the same advice in a loop. |
| **Documents missing, data mismatch, registry** | ~26 (broad regex) | "ID паспорт - немає ідентифікаційного коду, звертайтеся в міграційну службу" ("ID passport: no tax ID number, contact the migration service"); "пропали техпаспорт? Закордонний паспорт?" ("where did my vehicle registration go? my foreign passport?"); "не відібражае Інн" ("it doesn't show my tax ID") | **Action across registries.** The fix lives at ДМС (migration service), ДРАЦС (civil registry), the tax service or the bank, not at Diia. |
| **Support or chatbot useless, circular** | 21 | "Звертаюсь до чату … пропонують тей саме - зачіска, освітлення. По колу" ("I contact the chat … they suggest the same thing: hairstyle, lighting. In circles"); "ШІ помічник не розуміє що я від нього х[очу]" ("the AI helper doesn't understand what I want from it") | QA/analytics: detect loops and force escalation. |
| **Outages / "технічні роботи"** (maintenance) | 12 | "реєстри не доступні … щоб зробити дія підпис потрібно чекати 5 днів" ("registries unavailable … you have to wait 5 days to make a Дія.Підпис"); "єМалятко … 2,5 тижні … ні хто не каже терміни" ("єМалятко … 2.5 weeks … nobody gives a timeline"); "На порталі пише що технічні роботи в ДМС … ДМС пише що всі роботи завершені" ("the portal says ДМС has maintenance … ДМС says all work is finished") | Incident clustering plus a proactive status message. Ownership is disputed between agencies. |
| **Payments, refunds, cashback** | 4 | "Відмовили в реєстрації шлюбу, гроші заплатив, повернути гроші не можу вже більше місяця" ("they refused to register the marriage, I paid, and I haven't been able to get the money back for over a month"); "Національний кешбек … очікує на виплату більше 3 місяців" ("National Cashback … pending payout for more than 3 months") | **Action:** refund or payout status check, then a refund request. |
| **FOP / business** | 2 | "Чому не відправляє декларацію, пише сталася помилка???" ("Why won't it send the declaration, it says an error occurred???") | Diagnose, then route to the tax service. |
| **Резерв+** (military registration app) | 0 | none (it is a separate MoD app) | n/a |

- **The dominant pain right now is Дія.Підпис plus NFC plus liveness**, and many reviewers say support repeats the same tips. — high for the sample window (RSS above)
- **"Document not showing" has known, rule-based causes** that make a good decision tree:
  1. Paper passport booklets and pre-2015 foreign passports are not digitised.
  2. The name/RNOKPP in the demographic register does not match the bank's records.
  3. The app version is outdated.
  4. The document is not loaded yet: re-login, then wait days.

  Civil-status certificates also fail when the ДРАЦС record has no RNOKPP, the surname changed, or the record differs from the passport. — medium; the passport source is from 2020 and the ДРАЦС one from Oct 2024 (https://news.dtkt.ua/accounting/automation/62187-ne-vidobrazaiutsia-cifrovi-pasporti-v-diia-cotiri-pricini-ta-sposobi-virisennia-problemi-vid-sluzbi-pidtrimki, https://prokadry.com.ua/news/83958-nekorektni-dani-v-dokumentakh-dii)
- **Answer vs action.** Most Diia tickets are *answerable* (device tips, eligibility) or *escalations to another state body*. Diia support itself cannot edit registries. Real "actions" therefore mean three things:
  - routing or pre-filling a correction request to the data owner (ДМС, ДРАЦС, tax service);
  - filing a structured bug or incident;
  - starting a refund or payout check.
  
  — medium, inferred from the review sample plus the cause lists above.

### (c) Existing AI in Diia (Diia.AI and the support AI)
- **Two separate AIs exist.**
  1. A **support consultant** in the chatbots (June 2025, ChatGPT-based, see above).
  2. **Diia.AI**, a citizen-facing "AI agent" on the portal (beta from 3 Sep 2025), built on **Gemini 2.0 Flash on Vertex AI**. A gateway keeps registry data and PII out of the model.
  
  — high (https://digitalstate.gov.ua/news/govtech/diiaai-pershyy-u-sviti-derzavnyy-ai-ahent-iakyy-ne-prosto-konsultuye-a-nadaye-posluhy-iak-pratsiuye-shtuchnyy-intelekt-na-portali, https://www.kmu.gov.ua/news/obiednuiemosia-zi-svitovymy-tekhnohihantamy-dlia-rozvytku-shi-iak-diiaai-pratsiuie-na-tekhnolohii-gemini, https://ai.thedigital.gov.ua/en/news/A%20global%20case%20study%20from%20Google:%20How%20Ukraine%20is%20building%20AI%20agents%20based%20on%20Gemini%20Flash)
- **What Diia.AI actually executes.**
  - At launch: one service, the **income certificate**.
  - Portal additions: FOP data lookup, insurance-record (страховий стаж) check, and the income certificate (per the voice-mode news).
  - In the app since **14 May 2026**: adult and child **residence extracts** and **traffic-fine payment links**.
  - Voice mode on the portal since 15 July, built with ElevenLabs.
  
  — high (https://egap.in.ua/en/news/diyaai_u_smartfoni_si_asistent_zyavivsya_v_zastosunku_i_otrimav_novi_poslugi, https://mezha.ua/news/diia-ai-voice-mode-313278/amp/, https://forbes.ua/innovations/prioritet-shchob-dani-obroblyalisya-vseredini-kraini-shi-direktor-mintsifri-roman-kisliy-pro-zapusk-golosovogo-asistenta-v-dii-spivpratsyu-z-elevenlabs-i-zbir-novoi-komandi-16072026-40387)
- **Usage and limits.**
  - Usage: more than 400k portal users and more than 5M app users of the text assistant, but only "близько 8000 довідок про доходи" (about 8,000 income certificates) were issued via the portal. Usage is about 50x the actions, because many people "just test".
  - Limits: it is an open beta and "may give different answers to identical questions". The only feedback is an effective/ineffective rating, and there is **no described handoff to a human**.
  - Plans: "Agentic State" proactive services (e.g. birth of a child → єМалятко in one click).
  
  — medium/high (Forbes and digitalstate URLs above)
- **Agent copilot gap.** Diia.AI faces citizens. The CNAP assistant faces civil servants but only gives procedure hints and is in testing. I found **no published tool for Diia support operators** that does cross-registry diagnosis, incident clustering or QA of AI and operator dialogues. The only thing described is an operator-side "AI assistant for operators" in beta that drafts answers (16% of requests). — medium (https://dou.ua/lenta/news/ai-services-mintsyfry-diia/, https://dev.ua/news/mintsyfra-testuie-ai-asystenta-dlia-pratsivnykiv-tsnapiv-iak-vin-pratsiuvatyme-1790426602)

### (d) Public data and repos
- **`github.com/diia-open-source`** has 49 repos, all **EUPL-1.2** (except the docs repos).
  - App clients: `android-diia` (500★, last push 2025-10-10) and `ios-diia` (354★, 2026-06-17).
  - Older backend services: `be-user-service` (137★), `be-auth-service` (72★), `be-gateway-service`, `be-documents-service`, `be-public-service-catalog`, `be-criminal-cert-service`, last pushed Jul–Aug 2024.
  - Shared `be-pkg-*` libraries were pushed as recently as 2026-10-31.
  
  There is no support, chatbot or knowledge-base code, and no service-catalog *data*: the catalog repo is a management service with Mongo migrations. — high (`gh api orgs/diia-open-source/repos`, README of be-public-service-catalog)
- **Mintsyfra appeals dataset** on data.gov.ua: "Звіти про стан виконання звернень громадян" (reports on the handling of citizen appeals), CC-BY, updated 2026-01-19. It holds aggregate XLSX counts by channel, type, result and topic. The numbers are useful for the pitch; the data is useless as ticket text. — high (https://data.gov.ua/dataset/c45c1b2e-b15c-40ed-9d3f-632bd2fe3475)
- **Diia FAQ** (https://diia.gov.ua/faq) has six categories with one URL per question (`/faq/<id>`). It is small and generic, and could be a seed knowledge base if scraped. — high

## Evidence against / open doubts
- **Diia support is already heavily automated.** 85% of requests are AI-answered and the "operators busy" rate is under 0.01%. A "chatbot that answers" adds nothing, and judges who know Diia will say so. Our value must sit on the remaining 10–15% of complex cases and on cross-agency routing (https://dev.ua/news/shi-u-dii-vzhe-obrobliaie-ponad-85-zvernen-1758634264).
- **Most fixes are outside Diia's control.** Registry owners (ДМС, ДРАЦС, the tax service, Оберіг for Резерв+) correct the data, so the "AI executes the action" moment becomes "AI prepares a request to another agency". That demos less convincingly than a refund that actually runs (https://prokadry.com.ua/news/83958-nekorektni-dani-v-dokumentakh-dii; review "звертайтеся в міграційну службу" ("contact the migration service")).
- **Дія.Підпис NFC and liveness failures are engineering bugs.** Support can only triage and collect diagnostics. It cannot fix them.
- **The impersonation and sensitivity risk is real.** Diia is a state brand, the domain involves state ID, military registration and payments, and a demo with a Diia-like UI could look like phishing. Mitigation: a fictional "e-gov app" or a clearly labelled "simulated, unaffiliated" Diia-style scenario, no logos, synthetic people only. I did not find Diia's brand-usage rules. — low/unverified
- **I did not verify:** a Diia phone hotline (none on the FAQ page), current Дія.Центр counts, document counts, or Резерв+ support details. Search snippets only, so these are left out.
- **The review sample is two months of iOS reviews only**, biased toward the post-NFC-requirement wave. Google Play was not scraped.

## Existing products and tools
| name | url | what it does | weakness / gap |
|---|---|---|---|
| Diia support chatbots + AI consultant | https://diia.gov.ua/faq | Telegram, Viber, Messenger and web chat. ChatGPT-based, answers 85% of requests, CRM-integrated | Users report circular advice ("По колу" ("in circles")). No public cross-registry diagnosis |
| Diia operator AI assistant (beta) | https://dou.ua/lenta/news/ai-services-mintsyfry-diia/ | Drafts answers for operators (16% of requests) | Drafting only. No actions or QA described |
| Diia.AI | https://digitalstate.gov.ua/news/govtech/diiaai-pershyy-u-sviti-derzavnyy-ai-ahent-iakyy-ne-prosto-konsultuye-a-nadaye-posluhy-iak-pratsiuye-shtuchnyy-intelekt-na-portali | Citizen agent on Gemini 2.0 Flash. Executes income certificate, residence extracts, fine payment link | Few executable services. Inconsistent answers. No human handoff described |
| CNAP AI assistant (testing) | https://dev.ua/news/mintsyfra-testuie-ai-asystenta-dlia-pratsivnykiv-tsnapiv-iak-vin-pratsiuvatyme-1790426602 | Procedure hints for civil servants | Hints only. Still in testing |

## Data, APIs and repos we could use
| name | url | access | licence | notes |
|---|---|---|---|---|
| Apple RSS reviews for Diia | https://itunes.apple.com/ua/rss/customerreviews/page=1/id=1489717872/sortby=mostrecent/json | free, no key | Apple content; quote with care | Real Ukrainian complaint text. Good for synthetic ticket seeds and a "top issues" slide |
| Mintsyfra appeals reports | https://data.gov.ua/dataset/c45c1b2e-b15c-40ed-9d3f-632bd2fe3475 | free, CKAN API | CC-BY | Aggregates only (3,271 formal appeals in 2025) |
| Diia FAQ | https://diia.gov.ua/faq | public HTML | state content, attribution | Small seed knowledge base |
| diia-open-source | https://github.com/diia-open-source | public | EUPL-1.2 | App and backend code. Nothing support-related. Not needed for a demo |
| Passport/document troubleshooting rules | https://news.dtkt.ua/accounting/automation/62187-ne-vidobrazaiutsia-cifrovi-pasporti-v-diia-cotiri-pricini-ta-sposobi-virisennia-problemi-vid-sluzbi-pidtrimki | public | press | Decision-tree rules for the "document missing" workflow |

## What this means for the idea
Five Diia support workflows an AI could automate. All of them would run on simulated registries and synthetic citizens.

1. **"Document missing" root-cause diagnosis across registries.**
   - Rule: the cause tree from dtkt/prokadry (document type, name/RNOKPP mismatch with the bank, ДРАЦС missing RNOKPP, app version, sync delay).
   - Tools: `get_registry_record(ДМС|ДРАЦС|tax|bank)` (mock), `compare_fields`, `create_correction_request(owner)`.
   - Human approves sending the pre-filled request to the data owner.
2. **Дія.Підпис / NFC / liveness triage and bug escalation.**
   - Rule: classify the failure stage (NFC read, liveness, "service unavailable", signature dropped), then match device and OS against known issues.
   - Tools: `get_device_diagnostics`, `search_known_issues`, `file_bug(cluster)`.
   - Human approves a new bug or "known issue" macro. AI blocks repeating the same tip more than twice (the anti-loop rule).
3. **Outage and incident clustering with a proactive broadcast.**
   - Rule: N similar tickets on one service (єМалятко, ДМС residence actualisation) in T minutes means an incident.
   - Tools: `cluster_tickets`, `get_service_status` (mock), `draft_broadcast`.
   - Human approves the public message and ETA. Sending it without approval is forbidden.
4. **Paid-service refund or payout tracking** ("шлюб онлайн" (online marriage registration) fee refused, Національний кешбек pending).
   - Rule: refund eligibility when the service was refused after payment.
   - Tools: `get_payment(status)`, `create_refund_request`.
   - Human approves the refund. **This is the same mechanic as the PawChamp billing copilot**, and that is the honest bridge.
5. **QA of AI and operator dialogues.** This scores escalation correctness, loops and false "resolved". It mirrors Diia's real practice of trainers checking AI answers, and it feeds knowledge-base gaps.

- **Honest comparison with PawChamp billing.**
  - PawChamp wins on the demo moment: a real Stripe-sandbox refund confirmed by API, against "prepare a request to ДМС".
  - It also wins on fit with SKELAR judges, who run subscription businesses and know the FTC/Genesis context.
  - It is lower legal and brand risk.
  - Diia wins on local resonance (23M users) and on a vivid "support goes in circles" pain backed by fresh quotes. It loses on novelty, because Diia already claims 85% AI handling plus Diia.AI on Gemini.
- **Recommendation.**
  - Keep PawChamp billing as the main scenario.
  - If the core is product-agnostic (policy pack + mock tools), add Diia as a second 60-second "policy pack" showing workflow 1 or 4. That proves generality without betting the demo on a state brand.
  - Either way, borrow two Diia-derived features: **anti-loop escalation** and **incident clustering**.
- **If the team does go with Diia:**
  - label it "simulated, not affiliated with Мінцифри";
  - use no logos and fully synthetic people and RNOKPPs;
  - never show real registry names as live integrations;
  - keep every cross-agency action behind human approval.

## Sources read
- https://diia.gov.ua/faq: FAQ categories; support only via web chat, Telegram, Viber and Messenger bots; no phone or email listed.
- https://dou.ua/lenta/news/ai-services-mintsyfry-diia/: July 2025 support volumes (251,627 / 198,164 / 53,463 / 27,800); ChatGPT plus CRM; operator draft assistant at 16%.
- https://dev.ua/news/iak-trenuvavsia-ai-v-dii-1753785474: how the support AI was trained (ex-operators as trainers, 80% target, de-personalised data).
- https://dev.ua/news/shi-u-dii-vzhe-obrobliaie-ponad-85-zvernen-1758634264: 85% AI-answered, operator load −79%, busy rate <0.01%, 5 s replies.
- https://www.kmu.gov.ua/news/mykhailo-fedorov-my-vprovadzhuiemo-ai-shchob-rozviazuvaty-problemy-liudei: June 2025 beta of the portal AI assistant; income certificate as the first service.
- https://digitalstate.gov.ua/news/govtech/diiaai-pershyy-u-sviti-derzavnyy-ai-ahent-iakyy-ne-prosto-konsultuye-a-nadaye-posluhy-iak-pratsiuye-shtuchnyy-intelekt-na-portali: Diia.AI capabilities and limits (Sep 2025), Gemini 2.0 Flash, hybrid perimeter.
- https://www.kmu.gov.ua/news/obiednuiemosia-zi-svitovymy-tekhnohihantamy-dlia-rozvytku-shi-iak-diiaai-pratsiuie-na-tekhnolohii-gemini: Gemini 2.0 Flash on Vertex, 200+ services consulted, PII kept out of the model.
- https://ai.thedigital.gov.ua/en/news/A%20global%20case%20study%20from%20Google:%20How%20Ukraine%20is%20building%20AI%20agents%20based%20on%20Gemini%20Flash: 23M users, 150+ portal services, 20k users / 64k messages in the first 2 weeks.
- https://egap.in.ua/en/news/diyaai_u_smartfoni_si_asistent_zyavivsya_v_zastosunku_i_otrimav_novi_poslugi: Diia.AI in the app on 14 May 2026; residence extracts and fine payment.
- https://mezha.ua/news/diia-ai-voice-mode-313278/amp/: voice mode with ElevenLabs; FOP data, insurance record and income certificate.
- https://forbes.ua/innovations/prioritet-shchob-dani-obroblyalisya-vseredini-kraini-shi-direktor-mintsifri-roman-kisliy-pro-zapusk-golosovogo-asistenta-v-dii-spivpratsyu-z-elevenlabs-i-zbir-novoi-komandi-16072026-40387: 400k portal and 5M app users vs about 8,000 certificates; Agentic State plans; PII masking.
- https://dev.ua/news/mintsyfra-testuie-ai-asystenta-dlia-pratsivnykiv-tsnapiv-iak-vin-pratsiuvatyme-1790426602: CNAP worker AI assistant in testing; 600+ service types.
- https://news.dtkt.ua/accounting/automation/62187-ne-vidobrazaiutsia-cifrovi-pasporti-v-diia-cotiri-pricini-ta-sposobi-virisennia-problemi-vid-sluzbi-pidtrimki: four official causes why a passport does not show (2020).
- https://prokadry.com.ua/news/83958-nekorektni-dani-v-dokumentakh-dii: civil-status document errors (ДРАЦС RNOKPP, surname change), Oct 2024.
- https://itunes.apple.com/lookup?id=1489717872&country=ua and https://itunes.apple.com/ua/rss/customerreviews/page=1/id=1489717872/sortby=mostrecent/json: rating and 100 recent reviews, categorised above.
- https://data.gov.ua/dataset/c45c1b2e-b15c-40ed-9d3f-632bd2fe3475: Mintsyfra 2025 appeals report (3,271 total), read from the XLSX.
- https://github.com/diia-open-source (via `gh api`): 49 repos, EUPL-1.2, stars and last-push dates.
