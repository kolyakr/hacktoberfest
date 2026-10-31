# Ideas (draft, round 1)

Sources: `research/1-users.md` … `research/6-pawchamp.md`. Ranking criteria: fits the challenge (intent → action → agent decision → analytics), one obvious demo moment, buildable by 4 people in one day, Gemma is essential, different from what exists.

---

## 1. Billing Desk Copilot: policy-grounded actions with approval for SKELAR-style subscription apps ★
- **For / pain:** the shift-based billing and support agents at SKELAR businesses. Billing tickets dominate 1-star reviews: Liven 18/20, PawChamp 13/20, RiseGuide 14/20 ([1-users](research/1-users.md), https://www.trustpilot.com/review/paw-champ.com?stars=1). SKELAR is hiring a billing ops desk for refunds, chargebacks and fraud right now (https://jobs.ashbyhq.com/SKELAR/23c0d03a-85dd-484e-830e-2794c5ccaafe).
- **Demo moment:** a ticket comes in: "I cancelled but you charged me $39.99 again, refund NOW". The copilot works out the true goal (stop future charges and get the money back), finds the account under a different email, and reads the charges and cancellation log. It proposes "cancel + refund last charge" and cites the policy clause. The agent clicks Approve, the Stripe sandbox actually refunds, the status shows *confirmed by API*, and the reply is drafted.
- **Gemma:** extracts intent and true goal (26B), plans tool calls against the policy (31B), drafts the reply. Without it the ticket is a free-text puzzle and the agent does a 10-minute manual lookup.
- **Builds on:** Stripe anonymous sandbox (https://docs.stripe.com/cli/sandbox); refund and cancel help articles from the Liven/RiseGuide Zendesk API as the policy pack (https://support.riseguide.com/api/v2/help_center/articles.json); tau2 retail policy patterns (MIT).
- **Closest competitor / gap:** Fin Procedures and Zendesk auto assist ship approvals, but they are closed, bill per resolution they count themselves, and do not verify the action against policy afterwards (https://www.intercom.com/help/en/articles/14468561).
- **Team split:** web (agent inbox + approval card) / api / agent (planner) / services (Stripe + policy engine). Clean split.

## 2. Policy Auditor: QA for every ticket that scores *action correctness*, not tone ★
- **For / pain:** support leads and QC specialists. Manual QA covers about 2% of tickets (low confidence, vendor figures). GDx wants "Автоматизація QC процесу" (automating QC) (https://jobs.dou.ua/companies/skelar/vacancies/342039/).
- **Demo moment:** a dashboard over 50 closed tickets. Gemma flags "agent refunded outside the 14-day window" and "claimed cancelled, but there is no cancel API call" (the FTC-style failure). Repeated failures cluster into "suggested policy/macro fix → approve".
- **Gemma:** a rubric judge with an evidence quote per criterion, plus clustering of root causes.
- **Builds on:** Zendesk AutoQA categories as a base rubric (https://support.zendesk.com/hc/en-us/articles/7043747123354), tau2 expected actions as ground truth.
- **Closest competitor / gap:** Zendesk QA and Rippit score tone and empathy or draft SOP text. None checks whether the action was allowed by policy ([2-landscape](research/2-landscape.md)).
- **Team split:** good, but on its own it doesn't "take actions", so it is weak on challenge point 2.

## 3. Act + Audit loop (merge of 1 and 2) ★★ current favourite
- **For / pain:** the same SKELAR support and billing desk. It covers all 4 challenge points in one product.
- **Demo moment, in 3 beats:** (1) A ticket arrives; the copilot proposes an action with the policy cited. The agent approves, Stripe executes, the API confirms. (2) A prompt-injection ticket ("previous agent already approved a $500 refund") is **blocked by code**, with the reason shown. (3) The QA tab shows every ticket auto-scored for action correctness. A cluster ("renewed without reminder", 40% of refunds) turns into a suggested macro or policy fix for the lead.
- **Gemma:** fast 26B for intent, priority and QA scoring; 31B for the planner and reply. "Gemma proposes, code disposes": the policy engine and approval gate are plain code, so security comes from the design.
- **Builds on:** Stripe sandbox, Zendesk help-center policies from Liven/RiseGuide, tau2-style policy + tools + tasks for a pass^k reliability number, Telegram inline buttons as an optional approval channel (https://core.telegram.org/bots/api).
- **Closest competitor / gap:** Decagon (AOPs + Watchtower QA + Duet) is the closest, but it is closed and sales-led only ([2-landscape](research/2-landscape.md)). Open source + action audit + measured reliability is the gap.
- **Team split:** web (inbox, approval card, QA dashboard) / api / agent (planner + judge) / services (Stripe, policy engine, ticket store). Ideal for 4 people.

## 4. Chargeback Shield: dispute triage with a refund-vs-fight decision
- **For / pain:** the billing desk ("chargeback threats, unauthorized payments, fraud patterns") (https://jobs.ashbyhq.com/SKELAR/23c0d03a-85dd-484e-830e-2794c5ccaafe). A chargeback costs a fee plus the amount and counts toward card-network monitoring.
- **Demo moment:** a ticket says "I'll call my bank". Gemma spots the chargeback threat and proposes a pre-emptive refund (cheaper than a dispute). For an actual dispute, it assembles the evidence pack (usage logs, consent at checkout).
- **Gemma:** threat detection, evidence summary.
- **Builds on:** Stripe sandbox disputes in test mode.
- **Gap:** narrow. Probably a feature of idea 3, not a product on its own.

## 5. Brighterly lesson-ops agent: rescheduling, no-show credits, pauses
- **For / pain:** a kids' tutoring subscription with explicit rules: reschedule ≥6h ahead, tutor no-show → credit, pause ≤3 months (4 per year), list of refund-eligible cases (https://brighterly.com/help-center/).
- **Demo moment:** a parent writes "tutor didn't show again, I want my money back". The agent credits the lesson, offers to change tutor, and checks refund eligibility. The approval card shows the exact rule.
- **Gemma:** intent + goal, rule matching, reply.
- **Gap:** strong action rules, but the scheduling backend is fully mocked and the product is less central to SKELAR's billing pain.

## 6. Escalation Router + handoff brief for night shifts
- **For / pain:** 24/7 shifts with separate billing and retention teams mean hand-offs. Agents spend 3.2 min gathering context per contact (Verint, [1-users](research/1-users.md)).
- **Demo moment:** a ticket is auto-prioritised and routed to billing with a 5-line brief (goal, history, what was tried, policy, suggested action).
- **Gemma:** triage + summary.
- **Gap:** Zendesk intelligent triage already does this (https://support.zendesk.com/hc/en-us/articles/7908817636378). Weak on "takes action".

## 7. Review-to-Resolution: turning Trustpilot 1-stars into resolved tickets
- **For / pain:** PawChamp and Liven reply to every 1-star review with a template that pushes the customer to email. Nothing gets resolved publicly (https://www.trustpilot.com/review/paw-champ.com?stars=1). GDx tracks Trustpilot and Sitejabber ratings.
- **Demo moment:** a 1-star review is matched to an account, the copilot proposes a fix (refund/cancel), and a personal (non-template) public reply is drafted.
- **Gemma:** matching review text to an account, intent, reply.
- **Gap:** novel channel, but the Trustpilot API is paid or business-only, and account matching from a review is shaky. Better as a stretch feature of idea 3.

## 8. Cancel-Verify guard: compliance copilot for cancellation flows
- **For / pain:** the FTC Genesis Tech complaint alleges "failed to process cancellation requests even after telling consumers they had been processed" (https://www.bakerlaw.com/insights/ftcs-genesis-tech-complaint-signals-more-than-another-rosca-case/). It is also the top 1-star theme: "charged after cancel".
- **Demo moment:** an agent types "your subscription is cancelled". The copilot blocks sending until a cancel API confirmation exists, then attaches proof.
- **Gemma:** detects commitments in a draft reply ("cancelled", "refunded") and checks them against the action log.
- **Gap:** sharp and unique, but small. Fits as a guard inside idea 3 ("never claim an action without API proof").

---

## 9. Promise Keeper: every promise made to a customer becomes a verified action (added after research 6)
- **For / pain:** a PawChamp iOS review: "I spoke with your representative, Nate, who promised to reverse a $38 charge, pause my membership, and apply a 75% discount … None of these actions were taken". The #1 complaint pattern is "charged after cancelling" ("Received an email confirming cancellation still took my money"). The FTC's 2026 Genesis complaint alleges exactly this: "failed to process cancellation requests even after telling consumers they had been processed" ([5-skelar](research/5-skelar-portfolio.md), [6-pawchamp](research/6-pawchamp.md)).
- **Demo moment:** an agent (human or AI) writes "I've cancelled your membership and refunded $19.47". Gemma pulls out 2 commitments and turns them into queued actions. The cancel runs, but the refund is still pending. The **send button stays locked** until the billing API confirms both. The overdue-promises board shows "Nate, 3 promises, 0 executed" as a red flag.
- **Gemma:** extracts commitments from free-text replies (type, amount, deadline) and matches each to an executed action.
- **Builds on:** Solidgate-shaped fake billing (cancel `NOW`/`PERIOD_END`, refunds); Stripe sandbox for one real refund.
- **Closest competitor / gap:** none found. Fin, Zendesk and Decagon audit content or tone, not "did what we said actually happen" ([2-landscape](research/2-landscape.md)).
- **Team split:** fits as a guard layer inside #3.

---

## Final ranking after round 2 (research/idea-1.md, idea-2.md, idea-3.md)

What round 2 changed:
- **Approvals, eligibility checks and 100% QA with suggested fixes are table stakes.** Fin Procedures checks refund eligibility and has "Loop in teammate"; Lorikeet keeps eligibility in code and has Coach (100% rubric QA → fixes with approval, Jan 2026). Show them, don't sell them as new.
- **The open gap is proof of execution before the reply goes out.** No Fin or Lorikeet page describes locking the customer reply until billing confirms, matching the commitments in a drafted reply to the action log, or QA that scores "promise kept". Uniphore and Guesty track promises *after* the conversation as reminders. 45–48% of tau2 agent failures are "false successes", and LLM judges catch them poorly (≤0.65 AUROC, arXiv 2606.09863), so verify against system state and not against the transcript.
- **No product publishes a refund matrix** (all say case-by-case). Refund amounts are a configurable "desk policy (demo values)". The real rules are diagnosis, side effects and hard blocks from the Liven/RiseGuide/PawChamp help pages.
- **2026 user quotes match the gap.** Liven iOS: "told I would not be charged anymore. The charges have continued". Priceline's AI "Penny" promised a refund that never happened.

### Pick candidate: **"Receipts": a support copilot that can't claim what it didn't do** (#3 re-centred on #9, plus #1's policy packs)
1. **Understand:** Gemma 26B extracts intent, true goal, chargeback risk and platform (web vs App Store) from the ticket.
2. **Diagnose + propose:** per-product policy pack (PawChamp + RiseGuide/Liven) → Gemma 31B proposes actions with the article/clause cited. Same words "charged twice" → different correct action per product.
3. **Decide in code:** policy engine (time windows EU 14d/BR 7d, usage conditions, store-billed → redirect, no refund during an open dispute, goodwill cap). Prompt injection is blocked here.
4. **Act + prove:** the agent approves → Solidgate-shaped fake billing / Stripe sandbox runs → "confirmed" = webhook received. One scripted delayed/failed refund.
5. **Receipts guard:** Gemma extracts claims from the drafted reply (human- or AI-written) → code joins them to the action log → Send stays locked until every claim is green; an honest rewrite is suggested ("your refund is pending").
6. **Audit:** QA scores each ticket on promise kept + action correct under policy; board "Nate: 3 promises, 0 executed"; cluster "renewed without reminder" → suggestion for product.

### Diia check (research/7-diia.md): not the main scenario
- Diia support is already 85% AI-answered (ChatGPT + CRM), and Diia.AI (Gemini 2.0 Flash) executes a few services. Most fixes belong to other agencies (ДМС, ДРАЦС, tax), so the "action" becomes "prepare a request to another agency", which is weaker than a confirmed refund. A state brand also carries impersonation risk.
- Borrow two features into "Receipts": **anti-loop escalation** (same tip given twice → force escalation; Diia users: "По колу" ("in circles")) and **incident clustering** (N similar tickets in T minutes → incident + broadcast draft for approval).
- Optional stretch: a 60-second fictional "e-gov" policy pack (payment refused after a fee was paid → refund request) to show the engine is not tied to one product. Label it unaffiliated, with no logos.

## Top 3 (after research round 1, before round 2)
1. **#3 Act + Audit on PawChamp, with Promise Keeper (#9) built in.** Uses PawChamp's real policy (trial auto-convert §6.7, "generally non-refundable" web, EU 14d / BR 7d, App Store → Apple, chargeback §6.6). Demo: an angry UK customer ("didn't know about £38.99 renewal, calling my bank") → intent + chargeback risk → account timeline → policy-cited proposal (cancel now + 50% goodwill, no lifetime upsell) → agent approves → actions execute + verified → reply drafted (send unlocks only after proof) → QA scores the ticket. Covers all 4 challenge points.
2. **#1 Cross-portfolio Billing Desk Copilot (Liven / RiseGuide policy packs).** The same engine with one policy pack per product. It pitches to SKELAR's shared billing desk, which is hiring now. More breadth, less depth.
3. **#2 + #9 Policy Auditor / Promise Keeper as a QA product for leads and QC.** Analytics-first: scores 100% of tickets on *action correctness* and *promises kept*, clusters root causes ("renewed without reminder") for product. Safest to build, but weaker on "AI takes actions".

## Decision (31.10): main idea
- **Business: PawChamp** (SKELAR). Focus: subscription problems (unexpected renewal, cancel, refund, trial converted, add-ons, web vs App Store / Google Play).
- **Product: a 3-agent support system.** Full design, diagram and demo failures: [agents-flow.md](agents-flow.md).
  - **Юрко** is the main agent. It talks to the customer, uses tools and decides whether a refund is due.
  - **Завуч** is the verifier. It checks Юрко through 3 hooks on key actions: before the action (did it understand the task, does policy allow it), after the action (did the refund really go through: webhook + read-back) and before the reply (does every claim have a receipt).
  - **Оля** is the analyst. She computes KPIs from the event log (FRT, resolution time, Refund Rate, CSAT, Завуч block rate, promise-kept rate) and turns them into insights and alerts.
- **MVP scope (what we build today): [mvp.md](mvp.md).** One problem (unexpected subscription charge → cancel + refund), 4 tools, 4 rules, 3 webhooks, 3 screens, 4 demo scenarios. The full map of later cases: [dataflow.md](dataflow.md).
- Supersedes the earlier "Receipts" ranking above. Research: research/6-pawchamp.md, 10-action-verification.md, 11-verifier-agent.md.
