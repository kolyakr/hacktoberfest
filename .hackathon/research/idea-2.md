# Round-2 check of idea #1 (cross-portfolio Billing Desk Copilot): viable, but "one policy pack per product" holds up only for *catalogue and explanation* rules, not *refund decision* rules

The public Liven and RiseGuide help centres give us a real, machine-checkable layer:
- channel routing (App Store or Google Play goes to the platform, web goes to us)
- which charge is which (add-on subscriptions vs one-time PDF or workbook purchases)
- a cancel-before-renewal cut-off
- "no refund while a chargeback is open"
- "a refund request auto-cancels" (RiseGuide)

The actual refund rule is "case-by-case" on every product. Any refund matrix in the demo (windows, percentages) is our own reconstruction. The products differ enough that a per-product pack is visibly needed (Livie and Coaching add-ons vs a PDF bundle vs workbooks; 40+ Liven descriptors). They do not differ in refund generosity. The chargeback economics are solid and well sourced:
- Stripe charges $15 to receive a dispute plus $15 to counter it.
- Visa VAMP: 2.2% falling to 1.5% from April 2026, $8 per dispute.
- Mastercard ECM: 100+ chargebacks and 150+ bps, with fines from $1,000 a month up to $100,000+.

Incumbents (Chargeflow, Justt, Stripe Smart Disputes) work *after* the card network is involved. Lorikeet-style support agents act on tickets, but they do not show policy citations or a pre-chargeback decision.

## Key findings

### (1) Policy rules extracted from the public Zendesk APIs (both fetched with curl, no key: Liven 45 articles, RiseGuide 97, all updated Sept–Oct 2026)

**Liven**
- **Refund rule is discretionary, with no public number.** "Refunds are reviewed based on our money-back policy. Each request is considered individually." The linked money-back policy (quiz.theliven.com/en/money-back-policy/) is a JS-only single-page app, so curl returns no policy text. I could not extract a refund window. — high for "discretionary" (https://support.theliven.com/hc/en-us/articles/32096809042578-How-to-Request-a-Refund)
- **Cancellation:**
  - Web: Profile → Manage Subscription → Cancel. Then "you may see options like getting a free month", so you scroll down and tap "Cancel subscription" again.
  - Apple: "Subscriptions made via Apple can only be managed through your Apple account".
  - Access stays until the end of the billing period. Support can cancel web subscriptions by email.
  - Machine-checkable: `channel ∈ {web, google, apple}` → who can cancel; `cancel ≠ refund`.
  — high (https://support.theliven.com/hc/en-us/articles/20437588177554-How-to-cancel-my-Liven-Subscription)
- **Add-ons are separate recurring subscriptions.** Livie (AI) and Coaching are "separate subscriptions from your main Liven plan", each with "its own billing cycle (typically 31 days)", "activated as add-ons during checkout" and renewing automatically. Cancelling the main plan does not imply cancelling the add-ons. That makes this a strong "charged after cancel" explanation. — high (https://support.theliven.com/hc/en-us/articles/31405630045714-Why-Was-I-Charged-an-Additional-Subscription)
- **The double-charge decision tree has 4 branches:**
  1. temporary authorisation ("Pending", disappears within days)
  2. delayed bank processing (compare the dates)
  3. renewal plus an add-on purchase
  4. a one-time workbook bought at checkout

  All four can be checked against a charge ledger. — high (https://support.theliven.com/hc/en-us/articles/24606275535378-Why-Did-I-Receive-Two-Charges-from-Liven)
- **Plan catalogue:**
  - Web: a weekly intro offer that rolls into monthly, a monthly plan, or a 3-month plan.
  - Stores: weekly, weekly with a 3-day trial, yearly, yearly with a 7-day trial, or lifetime.
  - Billing: "Most Liven subscriptions follow a 30-day billing cycle". On the web, the first period is at a discount and then renews "at the standard rate".
  — high (https://support.theliven.com/hc/en-us/articles/24318867166610-Billing-Cycle-How-Often-Am-I-Charged, https://support.theliven.com/hc/en-us/articles/31382676792466-Why-Was-I-Charged)
- **More than 40 bank-statement descriptors.** Prefixes include `STP*`, `SG*`, `SGT*`, `VSA_` and `SA_`, on several domains (theliven.com, wellbeing-theliven.com, inner-theliven.com). This points to several payment providers or merchant accounts. "SG*" probably means Solidgate, which is my inference — low. A descriptor lookup ("is this charge ours?") is a deterministic tool. — high for the list (https://support.theliven.com/hc/en-us/articles/30946155431954-Liven-Descriptors-How-to-Recognize-a-Charge-on-Your-Bank-Statement)
- **Invoices:** only for the initial purchase; "Recurring payments ... may not always include a separate invoice". — medium (https://support.theliven.com/hc/en-us/articles/24288720590994-Purchase-receipt-What-Should-I-Know)

**RiseGuide**
- **Refunds are routed by channel.** "App Store: Refunds are handled directly by Apple ... Google Play: ... by Google ... Website: ... case-by-case basis", and "eligibility may vary depending on the time since purchase, the type of plan, or any add-ons ... such as PDF guides". The factors are named but not quantified. — high (https://support.riseguide.com/hc/en-001/articles/26280283054364-Can-I-get-a-refund)
- **The full Cancel & Refund policy page holds three hard rules:**
  - "Initiating a refund request automatically cancels the subscription and stops all future payments." This is a side effect the copilot must apply.
  - "If a dispute or chargeback is initiated with your bank or PayPal before contacting our Support Team, we are unable to process a refund while the case is under review." This is a hard block.
  - Web refund review "within 2h". This is an SLA.

  — high (https://riseguide.com/cancel)
- **Cancel cut-off:** "Subscriptions should be cancelled at least 24 hours before your next billing date". Intro pricing renews "at the standard full price". There is no pause option: "we don't offer an option to pause". — high (https://support.riseguide.com/hc/en-001/articles/26280226129564-How-do-I-cancel-my-subscription, https://support.riseguide.com/hc/en-001/articles/26280281052828-Why-is-my-renewal-price-different-from-the-original-price, https://support.riseguide.com/hc/en-001/articles/26280391154332-Can-I-pause-my-subscription)
- **Double charge, 3 branches:**
  1. subscription plus a one-time PDF Bundle ("you don't need to cancel your subscription", support refunds the guide separately)
  2. **two subscriptions created** by a page refresh or a double tap. This is a real error that we should refund.
  3. a pending authorisation (3–5 business days)

  — high (https://support.riseguide.com/hc/en-001/articles/26280394622108-Why-was-I-charged-twice)
- **Charged after cancel, 3 branches:**
  1. authorised before the cancellation
  2. **multiple courses**: "canceling one subscription only stops renewals for that particular course"
  3. **separate platforms** (cancelled in a store, but a separate web purchase is still active)

  The cancel FAQ adds that a cancellation made after the renewal date is too late. — high (https://support.riseguide.com/hc/en-001/articles/26280352430748-Why-was-I-charged-after-subscription-cancellation, https://riseguide.com/cancel)

**PawChamp** (from our earlier research, not re-fetched)
- Web purchases are "generally non-refundable", with refunds case-by-case "at our discretion".
- EU: 14 days.
- Chargebacks (§6.6): "contact us first", refunds take up to 15 business days, and "Fraudulent or improper chargebacks may result in a permanent ban".

— medium ([6-pawchamp](6-pawchamp.md))

**Does "policy pack per product" matter?**

The three products are **the same in shape**:
- store purchases go to Apple or Google
- web refunds are discretionary
- cancelling does not mean a refund
- access lasts until the end of the period
- the intro price renews at full price

They are **different in content**:
- **Catalogue and add-ons.** Liven has *recurring* Livie and Coaching add-ons plus one-time workbooks. RiseGuide has a *one-time* PDF bundle and one subscription per course.
- **Side effects.** At RiseGuide a refund request auto-cancels. Liven states no such rule.
- **Hard blocks.** RiseGuide has an explicit "no refund while a chargeback is open" rule. PawChamp has a ban clause.
- **Timing.** RiseGuide has a 24h cancel cut-off. Liven runs on 30/31-day cycles.
- **Descriptors and SLAs.** Liven replies in 24h; RiseGuide reviews refunds in 2h.

So a per-product pack changes the *diagnosis* ("which charge is this and why") and the *side effects*. It barely changes the *refund decision*, which no product publishes. — medium (my synthesis of the sources above)

### (2) Chargeback economics (the "why a billing desk" argument)
- **Stripe US dispute fees:**
  - $15 to receive a dispute: "Your existing dispute fee is not changing".
  - $15 more to counter one, "when you counter disputes initiated after June 17, 2025", returned only on a full win.
  - The received fee is never returned outside Mexico.

  — high (https://support.stripe.com/questions/june-2025-pricing-updates-for-disputes, https://docs.stripe.com/disputes/how-disputes-work)
- **Once a dispute is open, the merchant cannot refund outside it.** Stripe: "You can't issue a refund outside the dispute process while the dispute is open", and the dispute rate rises. This mirrors RiseGuide's rule, so pre-emption has to happen *before* the bank call. — high (https://docs.stripe.com/disputes/how-disputes-work)
- **Pre-dispute refunds pay off only on small amounts.** Stripe: about 40% of Visa and Mastercard early fraud warnings become fraud disputes. Refunding is worth it on charges "roughly less than or equal to your dispute fee", and "likely not worthwhile ... more than 35 percent higher than your dispute fee", unless the dispute *ratio* itself is the risk. This gives a concrete, codeable refund-vs-fight rule, and it caps the "pre-emptive refund" pitch for $39.99 charges, which only makes sense when ratio risk matters. — high (https://docs.stripe.com/disputes/how-disputes-work)
- **Visa VAMP:**
  - Ratio = (TC40 fraud + TC15 non-fraud disputes) / settled transactions.
  - The May 2025 revision set the merchant "Excessive" threshold at 2.2%, falling to 1.5% on 1 April 2026 (it had been 0.9%).
  - The fee is $8 per dispute or TC40, enforced from 1 October 2025.
  - The minimum count to trigger monitoring is 1,500.

  Sources disagree on dates and fees: Trust Payments still shows 1.5%→0.9%, $10 and 1,000. — medium (https://www.chargebackgurus.com/blog/visa-announces-even-more-vamp-changes, https://help.trustpayments.com/hc/en-us/articles/34158381255953-VAMP-Merchant-Guidance)
- **Mastercard ECM:**
  - Thresholds: ECM is 100–299 chargebacks *and* 150–299 bps; HECM is 300+ and 300+ bps.
  - Bps = first-presentment chargebacks this month / sales last month × 10,000.
  - Assessments are EUR/USD 1,000 in month 2, rising to 25,000 (ECM) or 50,000 (HECM) in months 7–11, and 100,000 or 200,000 from month 19.
  - The audit resets only after 3 consecutive months below the thresholds.

  The source is Chase's 2022 FAQ and may be outdated. — medium (https://merchantservices.chase.com/content/dam/jpm/merchant-services/documents/payment-network-updates/MC_ExcessiveChargebacks_FAQ_02092022.pdf)
- **Subscription chargebacks are mostly "friendly fraud".** The causes: forgotten subscriptions, cancellations that didn't take, unrecognised descriptors, and the bank being easier to reach than the merchant. Vendor sources put the share at 70–79%. — low (vendor blogs, search snippets only, not read in full)
- **The regulatory angle ties these together.** The FTC's Genesis complaint alleges opening new merchant accounts to avoid chargeback monitoring ([5-skelar-portfolio](5-skelar-portfolio.md)). Monitoring programmes are a live concern in SKELAR's own ecosystem. — medium

### (3) Competitors
- **Chargeflow:** automated chargeback recovery ("Pay only if we win"), Prevent and Alerts via Visa and Mastercard data, and free Insights. Its helpdesk integrations (Zendesk, Gorgias, Intercom) feed *evidence*. It does not handle refund requests in support tickets. — medium (https://www.chargeflow.io/)
- **Justt:**
  - Evidence engine ("Dynamic Arguments").
  - Ethoca and Verifi alerts with rule-based auto-refunds, e.g. "Stripe refund for Ethoca alerts under $1,500".
  - Fight-or-accept ROI and VAMP monitoring.
  - "You only pay when we win."

  Its pre-dispute work starts from *network alerts*, not customer tickets. — medium (https://justt.ai/)
- **Stripe Smart Disputes:** an AI rules engine that auto-assembles and submits evidence packets, billed only on wins. It starts *after* a dispute is filed. — high (https://docs.stripe.com/disputes/smart-disputes)
- **Lorikeet:** a support AI agent for fintech and health. It "resolves issues by taking action through your own APIs", "follows your SOPs", has examples like "refund request for a double charge" and "a 40-step refund flow", and charges per resolved ticket. It shows no human approval step and does not describe how policy is cited. This is the closest match to the copilot. — medium (https://www.lorikeetcx.ai/)
- **The gap.** Dispute tools act at the network layer, after or near a dispute. Support agents act on tickets, but they are autonomous and bill per resolution. The free space is: read the *ticket* for chargeback intent → use the *product-specific* charge diagnosis → build a refund-vs-fight proposal from the fee and threshold arithmetic → get human approval → verify the action. It is a narrow gap, and Lorikeet could add it. — medium

## Evidence against / open doubts
- **There is no public refund matrix for any product.** Liven, RiseGuide and PawChamp all say "case-by-case". A demo rule such as "refund if <7 days and <2 sessions" is invented, and a SKELAR judge will know it. Present it as a configurable pack, not as their policy. (https://support.theliven.com/hc/en-us/articles/32096809042578-How-to-Request-a-Refund, https://support.riseguide.com/hc/en-001/articles/26280283054364-Can-I-get-a-refund)
- **Liven's money-back policy page is JS-rendered**, so I could not extract its text in the time I had. If it contains a 30-day guarantee with conditions, it is the best real rule to use. The team should open it in a browser. (https://quiz.theliven.com/en/money-back-policy/)
- **Pre-emptive refunds are not obviously profitable** on $30–40 charges, by Stripe's own analysis (refund only up to about 1.35× the dispute fee). The pitch has to rest on dispute *ratio* risk (VAMP and ECM), not on the fee per case. (https://docs.stripe.com/disputes/how-disputes-work)
- **Incentives.** SKELAR agent KPIs include "keeping the refund rate at the right level". A copilot that proposes refunds may look like it raises the refund rate. Frame it as "the right refund, not more refunds" and as "fewer chargebacks". ([5-skelar-portfolio](5-skelar-portfolio.md))
- **Practitioner pain is not in their own words.** Three Reddit-targeted searches returned only vendor blogs (search engine limits). The pain evidence is fee schedules and network rules, not first-person complaints from billing ops staff. (search results summarised above; not cited as findings)
- **VAMP figures conflict between sources** (2.2%/1.5%/$8/1,500 vs 1.5%/0.9%/$10/1,000). Cite the range, or say "per Visa's May 2025 update". (https://www.chargebackgurus.com/blog/visa-announces-even-more-vamp-changes, https://help.trustpayments.com/hc/en-us/articles/34158381255953-VAMP-Merchant-Guidance)

## Existing products and tools
| name | url | what it does | weakness / gap |
|---|---|---|---|
| Chargeflow | https://www.chargeflow.io/ | Automated dispute recovery, network alerts, prevention, free insights; success fee | Starts at the dispute or alert; no ticket intent, no refund-request handling |
| Justt | https://justt.ai/ | Evidence engine, Ethoca/Verifi alerts with rule-based auto-refund, fight-or-accept ROI, VAMP monitoring | Alert-driven, not ticket-driven; sales-led |
| Stripe Smart Disputes | https://docs.stripe.com/disputes/smart-disputes | AI-assembled evidence packets, auto-submitted, fee only on win | After the dispute only; Stripe only |
| Stripe early fraud warnings | https://docs.stripe.com/disputes/how-disputes-work | TC40/SAFE signals plus guidance on when refunding beats fighting | A signal, not a workflow; no support context |
| Lorikeet | https://www.lorikeetcx.ai/ | Support AI agent that follows SOPs and acts through your APIs (refunds, cancellations); per-resolution pricing | No human approval or policy citation shown; autonomous; not focused on chargebacks |
| Fin / Zendesk / Decagon | see [2-landscape](2-landscape.md) | Ticket agents with procedures and approvals | Closed; no dispute economics |

## Data, APIs and repos we could use
| name | url | access | licence | notes |
|---|---|---|---|---|
| Liven Help Center API | https://support.theliven.com/api/v2/help_center/articles.json?per_page=100 | free, no key, curl works | Liven's copyrighted content (demo/RAG with attribution) | 45 articles, about 9 billing ones: refund, cancel, add-ons, double charge, billing cycle, descriptors, receipts |
| RiseGuide Help Center API | https://support.riseguide.com/api/v2/help_center/articles.json?per_page=100 | free, no key | copyrighted | 97 articles, about 15 billing ones |
| RiseGuide Cancel & Refund policy | https://riseguide.com/cancel | public HTML | copyrighted | The best real rules: refund auto-cancels, no refund during a chargeback, 2h review, per-channel routing |
| Stripe test-mode disputes | https://docs.stripe.com/disputes/smart-disputes | free test keys | Stripe ToS | Test card 4000000001000043 creates a dispute; the refund API in test mode makes the "confirmed by API" moment real |
| Solidgate API | https://api-docs.solidgate.com/ | sandbox, needs merchant credentials | proprietary | `/subscription/cancel-by-customer`; webhooks `card_gate.chargeback.received` and `card_gate.prevention_alert.received`. Mirror its shapes in a fake; probably not usable live today |
| GitHub repos | - | - | - | `gh search repos` for "chargeback dispute agent llm" and "refund policy agent tau-bench" returned 0 results; there is no open-source prior art to reuse |

## What this means for the idea
- **Make the policy pack about *diagnosis + side effects + hard blocks*, sourced line by line from the real articles:**
  - Liven: add-on vs main plan vs workbook; descriptor lookup.
  - RiseGuide: duplicate subscription from a double tap; per-course subscriptions; refund ⇒ auto-cancel; no refund while a dispute is open; 24h cut-off.

  Each proposal cites an article URL. Mark the refund-amount rule as "configurable desk policy (demo values)" so we never claim it is SKELAR's.
- **The strongest cross-product demo** is two tickets with the same words ("charged twice, refund now"):
  - Liven resolves to "renewal + Livie add-on: cancel the add-on, explain".
  - RiseGuide resolves to "two subscriptions from a double tap: cancel the duplicate + refund, which per policy also cancels".

  Same engine, different packs, different correct action. This shows that per-product packs matter without inventing refund windows.
- **Chargeback pre-emption should be a computed card, not a slogan:**
  - show the dispute rate vs the 1.5% VAMP and 150 bps ECM lines
  - show $15 + $15 in fees vs the charge amount
  - show the RiseGuide and Stripe rule that a refund becomes impossible once a dispute opens

  Gemma detects the "I'll call my bank" intent; code does the arithmetic.
- **The positioning against Chargeflow, Justt and Stripe:** they start where the card network starts; we start one step earlier, at the ticket. Against Lorikeet: approval-first, policy-cited, verified, open.
- **One-day risks:**
  - Scope creep: 2–3 packs × 8 intents. Fix it at 2 products × 3 intents (double charge, charged after cancel, refund + chargeback threat).
  - The Liven money-back policy is unreadable without a browser.
  - Judges may push back on "AI proposes refunds" because refund rate is a KPI.
  - VAMP numbers conflict between sources.

  Compared with idea #3 (PawChamp Act + Audit), this idea adds breadth but no QA or analytics beat. It still needs a small "desk dashboard" (dispute-ratio gauge, refunds avoided vs given) to hit challenge point 4.

## Sources read
- https://support.theliven.com/api/v2/help_center/articles.json?per_page=100: 45 articles. Read in full: refund, cancel, add-on, why charged, double charge, billing cycle, descriptors, workbooks, coaching, receipts.
- https://support.riseguide.com/api/v2/help_center/articles.json?per_page=100: 97 articles. Read in full: refund, charged twice, charged after cancel, unexpected charge, renewal price, cancel, auto-renew, pause, payment failed, unexpected renewal, pay again, charged after deleting.
- https://riseguide.com/cancel: full cancel and refund policy (refund auto-cancels, no refund during a dispute, 2h review, per-channel routing).
- https://quiz.theliven.com/en/money-back-policy/: JS-only app shell, no policy text extractable.
- https://docs.stripe.com/disputes/how-disputes-work: fees, no refund during a dispute, EFW → dispute about 40%, refund-vs-fight threshold, 120-day window, 7–21 day response.
- https://support.stripe.com/questions/june-2025-pricing-updates-for-disputes: $15 received + $15 countered (from 17 June 2025), countered fee returned on a win.
- https://docs.stripe.com/disputes/smart-disputes: AI evidence packets, fee only on win, test card.
- https://help.trustpayments.com/hc/en-us/articles/34158381255953-VAMP-Merchant-Guidance: VAMP formula; Europe 1.5% → 0.9%; $10; 1,000 minimum (older numbers).
- https://www.chargebackgurus.com/blog/visa-announces-even-more-vamp-changes: Visa's May 2025 revision (2.2% → 1.5% on 1 April 2026, $8, 1,500 minimum, enforcement from 1 October 2025).
- https://merchantservices.chase.com/content/dam/jpm/merchant-services/documents/payment-network-updates/MC_ExcessiveChargebacks_FAQ_02092022.pdf: Mastercard ECM and HECM thresholds, bps formula, assessment table.
- https://www.chargeflow.io/: product lines, success-based pricing, no ticket handling.
- https://justt.ai/: evidence engine, alerts with auto-refund rules, ROI fight/accept, VAMP monitoring.
- https://www.lorikeetcx.ai/: SOP-following support agent acting through APIs, per-resolution pricing.
- https://api-docs.solidgate.com/: subscription cancel endpoint, chargeback and prevention-alert webhooks, sandbox needs credentials.
