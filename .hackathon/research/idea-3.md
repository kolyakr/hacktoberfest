# Promise Keeper / Policy Auditor (ideas #2 + #9): is "support promised X, X never happened" real, and is anyone already verifying it?

**One-line answer:** Yes, the pain is real, and J.D. Power ranks it the most damaging cause of unresolved support contacts. Commitment *detection* is not new (Cortana 2016, Uniphore, Guesty, ClearFeed). Nothing found checks the promise against the billing system's actual state *before the reply is sent*. Doing that is a deterministic join, not an LLM judgement, and a 2026 paper shows LLM judges are weak at the judgement version. Keep it as a guard layer inside #3, not as a standalone product.

## Key findings

### (1) The pain is real and documented
- **J.D. Power names "broken promises" as the worst driver of unresolved calls.** Its definition: "Follow-up actions promised by the representative did not occur." Per the post, "Broken promises had the most detrimental effect" on satisfaction, ahead of miscommunication and inaccurate or incomplete information. The post gives no percentage. Blog post by Scott Killingsworth, 27 Aug 2024. — **medium** (one good source, no numbers) (https://blog.jdpa.com/globalbusinessinsights/what-customers-say-about-unresolved-calls)
- **First-person, Adobe community, 24 Sep 2022.** "the agent confirmed the refund had been submitted and that he had cancelled the subscription". The next day "another payment was taken from my bank account and my account and plan are still live." — **high** that this pattern exists (https://community.adobe.com/t5/account-payment-plan-discussions/agent-confirmed-i-would-receive-a-refund-and-got-charged-again/m-p/13222515/highlight/true)
- **First-person, Trustpilot, Inkapad (subscription app).** Two reviews:
  - Helen Ruiz, Aug 2025: "They've assured me my account was now canceled." She had been charged twice after cancelling.
  - DEBBIE, Mar 2026: "I asked numerous times for cancelation and it said it was then the next payment was still taken out."

  A third reviewer quotes a credit that support promised in "5-7 business days" on condition that she deleted her review. — **high** for the pattern (https://pt.trustpilot.com/review/inkapad.com?page=6)
- **The SKELAR-portfolio angle is already in our notes.**
  - A PawChamp iOS review: "Nate … promised to reverse a $38 charge, pause my membership, and apply a 75% discount … None of these actions were taken".
  - The FTC's 2026 Genesis complaint alleges "failed to process cancellation requests even after telling consumers they had been processed".

  — **high** (research/6-pawchamp.md, research/5-skelar-portfolio.md, cited in .hackathon/ideas.md #9)
- **The same failure happens with AI agents, not just humans.** Laksh Advani, "From Confident Closing to Silent Failure: Characterizing False Success in LLM Agents" (arXiv 2606.09863, FAGEN@ICML 2026):
  - On tau2-bench single-control domains, **45–48% of failures were "false successes"** (9,876 trajectories, 8 model families). The agent says it succeeded while the environment state disagrees.
  - On AppWorld, the figure is 75.8% of failures. On tau2's dual-control telecom domain it is about 3%.
  - **LLM judges reading the transcript did poorly**: none of 5 judges × 5 prompts exceeded 0.65 AUROC on tau2. TF-IDF detectors reached 0.83.

  This is the strongest credibility citation we have. It argues for checking claims against **system state** rather than asking an LLM whether the agent did the job. — **medium** (one paper, recent) (https://arxiv.org/abs/2606.09863)

### (2) Who already does commitment extraction, precisely
- **Uniphore (Real-Time Guidance / "Promises").** Promises are detected in **calls**: "During a call, the AI Agent Application automatically detects the Promise". After the call, the agent or a supervisor *accepts* the promise, and an X-Designer Flow then tracks it, with Max ETA, an execution schedule and integration points to third-party apps. A dashboard shows "which fulfillments are behind schedule." The docs do **not** say that fulfilment is confirmed automatically from system data. Tracking starts after the conversation, and nothing blocks the promise from being made. This is the closest competitor to our "overdue-promises board". — **medium** (https://help.uniphore.com/page/en/working-with-promises.html)
- **Guesty "Guest commitment tracker" / Commitment Keeper (short-term rentals).** Marketing copy: "Scans reservation comments and messages for promises made to guests, checks if they've been fulfilled," and "flags anything still open." The help article (403 on fetch; the wording comes from the search snippet) says it runs as a **daily** batch scan, creates internal reminders and tasks only, and may miss "non-standard" phrasings. In other words, it is a reminder system after the fact, scoped to hospitality. — **medium** (https://www.guesty.com/lp/ai-agents-lp)
- **ClearFeed (Slack-based support).** AI flags commitments in responders' messages such as "let me check with the team". The reminder is dismissed "once there is a response from the responder", so "fulfilled" means *a reply was posted*, not that an action happened. — **low** (the doc page returned 404 on fetch; this comes from the search snippet of https://docs.clearfeed.ai/clearfeed-help-center/product-features/workflows/commitment-reminders)
- **Zendesk QA (ex-Klaus) AutoQA.** The built-in categories are greeting, empathy, spelling and grammar, closing, solution offered, tone, readability and comprehension. "Solution offered" checks that a fix was *proposed*, not executed. Custom prompt-based categories exist (max 10 per account), so a buyer *could* write a "promise" category, but it would still judge only the text, with no billing-state join. — **medium** (https://support.zendesk.com/hc/en-us/articles/7043747123354-Understanding-autoscoring-categories; see also research/2-landscape.md)
- **Observe.AI / Level AI.** Auto QA covers 100% of interactions with evidence search ("did the agent greet the customer") and compliance-risk flags. No documented promise-vs-action verification was found. — **low** (search results only; cxtoday / vendor pages not read in full)
- **Developer-level analogues.** The Elixir `agentic` library has a `CommitmentDetector` for "unfulfilled action commitments in agent responses": the model says "I'll check that" but ends its turn without any tool call. That is the same idea as ours at the agent-loop level, with no billing semantics. — **medium** (https://agentic.hexdocs.pm/Agentic.Memory.CommitmentDetector.html)
- **Net gap.** Every product found detects promises and then *reminds* someone. Uniphore and Guesty track them after the conversation, ClearFeed treats any reply as fulfilment, and Zendesk QA scores the text. **None found gates the outgoing reply on API-confirmed execution, and none reconciles the extracted amount and object** ("refunded $19.47") **with the processor's records.** — **medium** (absence of evidence after about 8 targeted searches)

### (3) Research to cite
- **Microsoft Research, commitment detection in email.** Azarbonyad, Sim and White, "Domain Adaptation for Commitment Detection in Email", WSDM 2019. They used the Enron and Avocado corpora and found that models trained on one corpus degrade on another. Adversarial autoencoder adaptation worked best. The blog defines commitments as "outgoing messages containing promises we make" and says Cortana's tools are "pretty effective". The feature shipped in Cortana in January 2016. — **high** (https://www.microsoft.com/en-us/research/blog/email-overload-using-machine-learning-to-manage-messages-commitments/, plus eWeek/VentureBeat coverage in search results)
- **Related.** Microsoft holds patents on extracting commitments and requests (US10361981B2, EP3295394A1), and Horvitz et al. published "AI-powered collaborative reminders" at CSCW 2024. Neither was read: the PDF was unreadable via fetch. — **low**
- **False success in LLM agents** (arXiv 2606.09863, above). This is the reason the design must verify against state, not against the transcript. — **medium**

## Evidence against / open doubts
- **Not novel as detection.** Cortana has done commitment extraction since 2016, and Uniphore and Guesty ship "promise tracking". Judges may see it as a known feature. Our claim has to be "verified before send + amount reconciliation", not "we detect promises". (https://help.uniphore.com/page/en/working-with-promises.html, https://www.guesty.com/lp/ai-agents-lp)
- **Root cause is often outside support.** In the Spotify and QuickBooks threads, replies suggest the cancellation was never completed by the user, or that a charge had already been taken before the cancel took effect. Some "broken promises" are timing problems in billing (PERIOD_END vs NOW, a pending refund that is still "accepted, not settled"), not lying agents. The product must show *pending vs settled* honestly, or it will produce false alarms. (search results: community.spotify.com, quickbooks.intuit.com threads, not read in full; arXiv 2606.09863 notes that "accepted" ≠ "delivered" in its taxonomy)
- **Prevalence is anecdotal.** Trustpilot skews negative. J.D. Power ranks the driver but gives no rate. We have no "X% of tickets contain an unkept promise" number, so don't invent one. Say "the #1 complaint pattern in PawChamp reviews" (our own count) and "J.D. Power: most damaging driver".
- **Too narrow on its own for "Operational Impact".** On its own, #9 covers challenge points 2 (partly) and 4. It doesn't understand intent or propose actions, so it fits best as the guard layer of #3, as ideas.md already says.
- **If our own copilot executes the actions, the send-lock is almost trivial.** The value is highest when **humans write free-text replies** or a **third-party bot** (Fin, Pawchie) does. The demo should show a human or legacy reply being caught, not only our own agent's.
- **Extraction errors.** Hedged promises ("I've requested a refund" vs "I've refunded"), future tense ("will be cancelled at period end") and multi-currency amounts are hard. MSR found cross-domain degradation. We need a few adversarial fixtures.

## Existing products and tools
| name | url | what it does | weakness / gap |
|---|---|---|---|
| Uniphore Promises | https://help.uniphore.com/page/en/working-with-promises.html | Detects promises in calls; agent or supervisor accepts after the call; a flow tracks them against an ETA; dashboard of overdue items | Voice-first; acceptance is manual; no documented automatic verification against billing; doesn't block the promise |
| Guesty Guest commitment tracker | https://www.guesty.com/lp/ai-agents-lp | Daily scan of guest messages and notes for promises; flags open ones; internal tasks only | Hospitality only; daily batch; reminders, not execution |
| ClearFeed commitment reminders | https://docs.clearfeed.ai/clearfeed-help-center/product-features/workflows/commitment-reminders (404 on fetch) | Flags "let me check" style commitments in Slack support | "Fulfilled" = a reply was posted |
| Zendesk QA AutoQA | https://support.zendesk.com/hc/en-us/articles/7043747123354-Understanding-autoscoring-categories | Auto-scores 8 categories, incl. "solution offered"; custom prompt categories | Text-only judgement; no check of action vs policy or vs system state |
| Observe.AI / Level AI Auto QA | (search results only) | 100% interaction QA, evidence search, compliance flags | No documented promise-to-action verification |
| `agentic` CommitmentDetector (Elixir) | https://agentic.hexdocs.pm/Agentic.Memory.CommitmentDetector.html | Flags agent turns that promise action but call no tool | Library-level; no amounts or billing semantics |

## Data, APIs and repos we could use
| name | url | access | licence | notes |
|---|---|---|---|---|
| tau2-bench trajectories (false-success labels) | https://arxiv.org/abs/2606.09863 | paper free; dataset/code availability not checked | unknown | Provides real "claimed success vs DB state" examples for fixtures and a headline stat |
| Enron email corpus (commitment research base) | via https://www.microsoft.com/en-us/research/blog/email-overload-using-machine-learning-to-manage-messages-commitments/ | public | public corpus | Not needed for the build; cite only |
| Stripe sandbox refunds / subscriptions | (see research/2-landscape.md) | free test keys | n/a | Refund status `pending` → `succeeded` gives a real "pending vs settled" demo beat |
| Solidgate-shaped fake billing | research/6-pawchamp.md | ours | ours | cancel `NOW`/`PERIOD_END`; lets us script a pending refund |

## What this means for the idea
- **Keep #9 as the signature guard of #3, not a separate product.** Pitch line: "Every reply is a set of claims; we don't let a claim leave the building until the billing API agrees." Gemma extracts claims as typed JSON `{type: refund|cancel|pause|discount, amount, currency, object_id, tense: done|will|requested}`. Plain code joins the claims to the action log or Stripe state. That is the "Gemma proposes, code disposes" design again.
- **Lead with the credibility stack.** J.D. Power names broken promises the most damaging driver of unresolved contacts. The PawChamp "Nate" review is the human version and the FTC Genesis complaint the regulatory one. arXiv 2606.09863 shows that about 45–48% of tau2 agent failures are false successes and that LLM judges can't catch them reliably (≤0.65 AUROC), which is why we verify against state. MSR's commitment detection (WSDM 2019, Cortana) shows the extraction half is an established problem.
- **Demo convincingly (about 40 seconds).** A human agent pastes a free-text reply: "I've cancelled your membership and refunded $19.47, and applied 50% off next month." Gemma extracts 3 chips. Cancel shows green (API confirmed). Refund shows amber: Stripe `pending`, labelled "will settle". The discount is red: no such action exists, and policy forbids discounts after cancel. **Send stays locked**, with a suggested rewrite ("I've requested a refund of $19.47; you'll see it in 5–10 days"). Then cut to the board: "Nate: 3 promises, 0 executed", followed by a QA cluster.
- **Defuse "Uniphore and Guesty already do this" before judges raise it.** They remind people after the fact; we block before send and reconcile amounts. Put a one-row comparison on a slide.
- **Handle the honest edge cases in fixtures.** Include future-tense or hedged promises (no lock, but a tracked deadline), PERIOD_END cancels and pending refunds, so the guard doesn't cry wolf. False alarms would kill adoption, and judges scoring "Reasoning & Context" will probe exactly this.

## Sources read
- https://blog.jdpa.com/globalbusinessinsights/what-customers-say-about-unresolved-calls: J.D. Power (Aug 2024); "broken promises" defined and ranked the most detrimental driver of unresolved calls; no percentages.
- https://community.adobe.com/t5/account-payment-plan-discussions/agent-confirmed-i-would-receive-a-refund-and-got-charged-again/m-p/13222515/highlight/true: agent confirmed refund and cancellation; charged again the next day, plan still live (Sep 2022).
- https://pt.trustpilot.com/review/inkapad.com?page=6: several Inkapad reviews of "assured cancelled" then charged; a credit promised conditional on deleting the review.
- https://arxiv.org/abs/2606.09863: false success in LLM agents; 45–48% of tau2 single-control failures; LLM judges ≤0.65 AUROC; TF-IDF 0.83.
- https://www.microsoft.com/en-us/research/blog/email-overload-using-machine-learning-to-manage-messages-commitments/: MSR WSDM 2019 commitment detection (Enron/Avocado, domain adaptation), Cortana link.
- https://help.uniphore.com/page/en/working-with-promises.html: Uniphore detects promises in calls, accepts them after the call, tracks via flows with ETA, dashboard of late fulfilments.
- https://www.guesty.com/lp/ai-agents-lp: Guesty "Guest commitment tracker" scans messages for promises, "checks if they've been fulfilled", flags open ones.
- https://agentic.hexdocs.pm/Agentic.Memory.CommitmentDetector.html: detects "unfulfilled action commitments" when the agent ends a turn without tools.
- https://hackernoon.com/testing-evidence-boundaries-in-ai-customer-support-agents: (Oct 2026) "A response can sound helpful while making a commitment that nobody approved"; human review only, no automated check.
- https://help.guesty.com/hc/en-gb/articles/37390177884189-Understanding-the-Commitment-Keeper-agent: 403 on fetch; search snippet says daily scan, internal reminders only, non-standard phrasing may be missed.
- https://docs.clearfeed.ai/clearfeed-help-center/product-features/workflows/commitment-reminders: 404 on fetch; search snippet says it is dismissed once the responder replies.
- Search snippet of https://support.zendesk.com/hc/en-us/articles/7043747123354-Understanding-autoscoring-categories: AutoQA's 8 system categories incl. "solution offered"; up to 10 custom categories.
- research/2-landscape.md, research/6-pawchamp.md, ideas.md #2/#9 (local): prior findings reused (PawChamp "Nate" review, FTC Genesis, Zendesk QA/Rippit gap).
