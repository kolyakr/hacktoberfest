# PawChamp: what does its support handle and what could an AI automate? Mostly billing. Unexpected renewals, cancellations, refunds and access are what drive the 1-star reviews. The written rules are clear enough that an AI could check them and act. A human should still approve discretionary refunds and anything posted publicly.

## Key findings

### (a) Product, funnel, platforms, markets
- PawChamp is a subscription app for training and caring for dogs. It offers personalised plans, daily lessons, games, video tutorials, quizzes, streaks and challenges. It also has an AI companion called "Pawchie" and dog experts available 24/7. It is sold on the web and in the iOS and Android apps. The site is available in 9 languages: EN, DE, ES, FR, PT, IT, NL, PL and JA. The legal entity is Fontadella Limited in Limassol, Cyprus. — high (https://paw-champ.com/, https://paw-champ.com/terms/, https://help.paw-champ.com/api/v2/help_center/locales.json)
- PawChamp is a SKELAR product. Dev.ua names Dmitry Ivanov as CEO. Pawchie is "built on the Claude language model" and draws on a closed, trainer-checked knowledge base. It refuses veterinary questions, and complex cases can be handed to a live expert in "less than a minute". — medium (https://dev.ua/en/news/pawchamp-1761296934)
- Every web sale starts with a quiz funnel at `/questionary/quiz/quiz27`. The funnel is built with Nuxt. Its checkout preconnects to `cdn.solidgate.com`, so Solidgate is the card processor. The checkout also has PayPal, Apple Pay and Google Pay buttons. — high for the quiz entry point and the payment methods. Sources: the home-page CTAs, page source of the quiz page, and Terms §6.2 ("credit/debit cards, PayPal, Apple Pay, Google Pay"). (https://paw-champ.com/questionary/quiz/quiz27?utm_source=homepage, https://paw-champ.com/terms/)
- The funnel's JS bundle shows these pricing mechanics:
  - Products carry a `trial_amount` and a `regular_amount`, and prices are shown "per day" with an "Introductory discount" label.
  - Checkout runs through `PreCheckout → Checkout → Retention` modal steps.
  - Page blocks include `upsell-discount-banner`, `block-upsell-special-gift`, `addons-list`, `free-add-on`, `slots-left` and `header-timer`.
  - A "30-Day Money-Back Guarantee" block exists. The code renders `moneyBackText` only when the visitor is **not** in the US (`e.moneyBackText&&!m(p).isUs.value`).

  — medium. This is read from the shipped JS, not from the screens a user actually sees. (bundles from https://cdn.paw-champ.com/…/_nuxt/, loaded by https://paw-champ.com/questionary/quiz/quiz27)
- Plans and prices:
  - The membership policy names weekly, monthly, 6-monthly and annual periods. The contacts FAQ says memberships "renew every 30, 90, 180 days, or annually".
  - The home page's comparison table shows "$9.99 per week" and "$40.00 per month".
  - iOS in-app purchases include Weekly Premium at $6.99 and $9.99, and Yearly Premium Access at $69.99 and $99.99.
  - Two iOS add-ons exist: "Obedience Training & Hyper Energy" at $19.99 and "Dog Behaviorist" at $49.99.
  - Reviews quote renewals of $38.95–$38.99 a month in the US and about £38–40 a month in the UK.

  — high for the renewal periods; medium for the prices. (https://paw-champ.com/membership-policy/, https://paw-champ.com/contacts/, https://paw-champ.com/, https://apppricinglab.com/iap/apple/6736829352, https://www.trustpilot.com/review/paw-champ.com)
- Expert consultations are capped by plan: "The number of consultations included depends on your plan". There are two expert chats, Training & Behavior and Dog Health & Care. Replies are immediate when an expert is online. "For more detailed consultations, responses are delivered within 24 h". — high (https://help.paw-champ.com/api/v2/help_center/en-us/articles.json, article "How to contact an expert")
- Scale: the US iOS app has a 4.18 average from 16,029 ratings. It was released 2025-01-13 and was at v1.50.0 on 2026-10-30. Google Play shows 4.06 from 5,989 ratings and "100K+" downloads. SKELAR job posts claim "Рейтинг в AppStore — 4.8" and "8+" markets, which does not match the US store numbers. — high for the store numbers. (https://itunes.apple.com/lookup?id=6736829352&country=us, https://play.google.com/store/apps/details?id=com.pawchamp.app, https://jobs.dou.ua/companies/skelar/vacancies/365754/, https://jobs.dou.ua/companies/skelar/vacancies/356960/)

### (a) Exact policy rules an agent would act on
These come from the Membership Policy, last updated 06 Aug 2026 (https://paw-champ.com/membership-policy/), and the Terms of Use (https://paw-champ.com/terms/). Confidence: high.

- **Auto-renewal:** "Your membership renews automatically at the end of each membership period … unless and until you cancel."
- **Charge amount:** "You will be charged the amount stated at checkout, plus any applicable taxes and fees."
- **Renewal price cap:** "Renewal pricing will not exceed the price of the previous membership period" (Terms §6.3).
- **Policy precedence:** For billing, the Membership Policy "prevails over our general" Terms.
- **Trial:**
  - "Unless you cancel before the trial ends, your membership will automatically convert into a paid membership."
  - "We do not guarantee reminder notifications before a trial expires." (Terms §6.7)
- **Cancel, general rules:**
  - "Canceling your membership disables automatic renewal, but you will retain access … until the end of your then-current membership period."
  - "Uninstalling the PawChamp app does NOT cancel your membership."
  - "Canceling your membership will also cancel any associated recurring add-ons" (Terms §6.4).
- **Cancel on web, in the app:** "Profile & Settings → Membership Info → Cancel Membership → Success/Confirmation screen". The contacts FAQ gives the in-app path as "Dog Profile & Settings → Manage membership".
- **Cancel on web, by email:** Write from the registered address with the subject "Unsubscribe". "your request is typically processed automatically" and "a cancellation confirmation email should be delivered within a few minutes". From a different address, "a support agent will review your request, help locate the correct account … and may contact you for additional information."
- **Cancel on web, by chat:** If the customer is logged in, support uses the account details. Otherwise "you will need to provide the email address used to create your account and purchase the membership."
- **Cancel on iOS:** Through Apple ID settings, "at least 24 hours before the end of the free trial or the current membership period". "You alone can manage your in-app subscription."
- **Cancel on Google Play:** Through Google Play settings, "before the renewal date".
- **Refunds on web:**
  - "Purchases made on the PawChamp website are generally non-refundable."
  - "refunds simply aren't issued for that remaining time."
  - "we're happy to consider refunds on a case-by-case basis, at our discretion".
- **Refunds on the app stores:** "subject to Apple and Google's refund policies". The customer must request the refund from Apple or Google directly.
- **Statutory withdrawal rights:**
  - EU: "within 14 days of your purchase", refunded "no later than 14 days" (Terms §6.5.1).
  - Brazil: "withdraw from the contract within seven (7) days" (Terms §6.5.2).
- **Chargebacks (Terms §6.6):**
  - "we strongly encourage you to contact us first … before initiating a chargeback"
  - "please allow up to 15 business days" for a refund to arrive
  - "You are not entitled to multiple refunds for the same transaction"
  - "Fraudulent or improper chargebacks may result in a permanent ban"
- **Charged but no membership visible:** Contact support, "include a screenshot of the transaction if possible."
- **Price changes:** "We will provide reasonable notice of pricing changes … you can cancel your membership before the changes take effect."
- **Privacy requests:** Email with the subject "Privacy Rights". Identity may be verified, and requests cover only data linked to the sending address. "AI-assisted support" uses "Anthropic (Claude), OpenAI" under agreements that bar training on user data. (https://paw-champ.com/policy/)

### (a) The older money-back guarantee customers still cite
- Customers quote an older "money-back guarantee" with conditions based on how much they used the app. One iOS review (AU, 2026-01-05) pasted it:
  - "You reach out to us within 30 days of purchase and before your subscription ends."
  - "You've followed the recommended course for at least 7 days in a row and completed the first module."
  - "You've contacted our expert team at least twice for personalized guidance and tried their advice."
  - "You can share briefly how you followed the expert's tips and why they didn't work."

  A second review (2025-11-15) says the same: "if you haven't used the app for at least seven days and contacted their support team at least twice they won't refund." Today `paw-champ.com/money-back/` returns a 301 redirect to `/membership-policy/`, which says web purchases are "generally non-refundable". The guarantee looks like it was folded into the membership policy, but the funnel code still has a money-back block for non-US visitors. — medium (iTunes RSS https://itunes.apple.com/au/rss/customerreviews/page=4/id=6736829352/sortby=mostrecent/json, https://www.productreview.com.au/listings/paw-champ, redirect checked with curl on https://paw-champ.com/money-back/)

### (b) Help center and support channels
- **Tooling is Zendesk.** The help center at `help.paw-champ.com/hc` is Zendesk Guide, and its public Help Center API answers. `paw-champ.zendesk.com` redirects to `doggy-plan.zendesk.com/access?brand_id=35405656279325`, which suggests one shared Zendesk instance with several brands. — high for Zendesk; low for the shared-instance reading. (https://help.paw-champ.com/api/v2/help_center/en-us/articles.json, curl redirect of https://paw-champ.zendesk.com/)
- **Other site scripts:** Reteno (CRM and push), Amplitude and Sentry. I found no Intercom, Help Scout or Freshdesk widget in the site JS. — medium (page source of https://paw-champ.com/contacts/)
- **Help-center content:** 13 public articles in 3 sections, across 9 locales. None of them covers billing.
  - "Getting started with PawChamp"
  - "Training & app features": contact an expert, Pawchie AI, streaks, previous lesson, find your course
  - "Technical issues & account access": "Forgot password or can't log in", "App issues or feature not working", "Email management and notifications"

  Billing is handled only through FAQ answers on /contacts/ and through the contact form. — high (https://help.paw-champ.com/api/v2/help_center/en-us/articles.json)
- **Contacts page:**
  - The form has a "Choose support type" field with the options Billing Support, General Support, Legal Contact and Other, plus Name, Email and Description.
  - There is a "Chat with us" button. The page says "no PawChamp phone number needed".
  - The Billing section promises help with "membership cancellation … failed payments and refund requests".
  - FAQ topics are: what's included, how to cancel, "Don't recognize PawChamp charge on your card?" ("Most likely, you may have started a dog training app membership during a trial"), login help, billing "seems off", and content quality.

  — high (https://paw-champ.com/contacts/)
- **Emails:**
  - support@paw-champ.com is the address for billing, refunds and privacy. I decoded it from Cloudflare-obfuscated links.
  - Public review replies send customers to channel-specific addresses: reviews-trustpilot@paw-champ.com and reviews-playstore@paw-champ.com.

  — high (https://paw-champ.com/membership-policy/, https://www.trustpilot.com/review/paw-champ.com?stars=1, https://play.google.com/store/apps/details?id=com.pawchamp.app)
- **What the login article says:** If the reset email doesn't arrive, "our support team can reset your password manually and send you the new login details directly". Accounts created with Google or Apple login must use that same method. — high (help-center article "Forgot password or can't log in")
- **Pawchie AI's scope:** "For questions about the app, your subscription, or account, contact our support team." So the AI assistant does not touch billing today. — high (help-center article "What is Pawchie AI")
- **Who staffs chat:** The DOU support role (June 2026, inactive) has agents advising users by chat and email "on dog training, behavior, and care". It asks for English at B2 and 30–40 WPM typing, offers rotating shifts with up to 6 nights a month, and lists Zendesk or Freshdesk as nice to have. No KPIs are listed. The people praised as "experts" in reviews (Dana, Lisa, Teresa, Ave) are likely these support specialists. — medium (https://jobs.dou.ua/companies/skelar/vacancies/330742/)

### (c) What customers complain about
- **Trustpilot overall:** 4.4 from 21,037 reviews. The split is 5★ 61%, 4★ 17%, 3★ 10%, 2★ 1%, 1★ 11%. The company "Replied to 99% of negative reviews" and "typically replies within 24 hours". — high (https://www.trustpilot.com/review/paw-champ.com)
- **Trustpilot, 40 one-star reviews** (2 pages, Jun–Oct 2026, one primary category each):

  | Category | Count |
  |---|---|
  | Unexpected charge / didn't know it was a subscription | 17 |
  | Cancel difficulty | 7 |
  | Content or value | 5 |
  | Login or access | 4 |
  | Other (email spam, flagged reviews) | 4 |
  | Refund refused, as the primary complaint | 3 |

  Refund refusal is a secondary complaint in 3 more. Company replies on page 2: a refund was given or promised in 4 of 20, "under review" in 2, and nothing was offered in 11. — medium (https://www.trustpilot.com/review/paw-champ.com?stars=1, https://www.trustpilot.com/review/paw-champ.com?stars=1&page=2)
- **iOS App Store sample:** 181 recent reviews from the RSS feed (US pages 1–2 and AU pages 4–5, dated 2025-02-10 to 2026-10-29). Ratings: 84 five-star, 79 one-star, 8 two-star, 7 four-star, 3 three-star. Among the 87 reviews rated ≤2★, keyword matches (overlapping) were:

  | Keyword group | Matches |
  |---|---|
  | Charge, subscription, billing or price | 74 |
  | Refund, scam or fraud | 41 |
  | Cancel | 40 |
  | Expert, chat or support | 15 |
  | Content or lessons | 14 |
  | Login, access or bug | 11 |
  | Dog behaviour | 3 |

  — medium (keyword-based; https://itunes.apple.com/us/rss/customerreviews/page=1/id=6736829352/sortby=mostrecent/json and the same feed for us/page=2, au/page=4, au/page=5)
- **Representative quotes**, high for the quotes themselves:
  - *Didn't know it was a subscription:* "I didn't realise I was signing up for a reoccuring subscription at nearly £40 a month" (Trustpilot, GB, 2026-10-23). "I signed up for 115 minute sample. I never authorized monthly payments and they've been charging me $40 a month" (iOS US, 2026-09-02). "I had no idea my initial 37 dollar purchase would auto renew in six months for 96 dollars" (iOS US, 2026-09-08).
  - *Charged after cancelling:* "Received an email confirming cancellation still took my money out for next month … I wasn't asking for a refund, I was asking not to be charged after cancelling" (iOS US, 2026-09-02). "Has been cancelled on App Store but still got charged." (iOS AU, 2025-12-29)
  - *Can't log in, so can't cancel:* "I also cannot login so cannot cancel." (Trustpilot GB, 2026-10-28). "App blocks log in screen and asks for updated payment information." (iOS US, 2026-09-13). "My app won't load or let me login … I've just been charged for another year" (iOS US, 2026-08-01)
  - *Promised action never happened:* "I spoke with your representative, Nate, who promised to reverse a $38 charge, pause my membership, and apply a 75% discount … None of these actions were taken" (iOS US, 2026-08-04). Another US iOS review (2026-09-25) describes a paid account "paused on 8/13" that support "cannot explain".
  - *Save offers that backfire:* the $29.99 lifetime offer appears when a customer tries to delete their account or cancel. One reviewer wrote: "charge an existing customer $38.99 every single month, yet offer lifetime access for less than the cost of ONE MONTH" (iOS US, 2026-08-19, from a bereaved customer who was refused a refund). Others: "they offered additional access for another 30 days" instead of a refund (iOS AU, 2026-01-05). "they tell you it's too late for a refund and offer more 'free' stuff instead" (Trustpilot LV, 2026-09-23).
  - *Chargebacks:* "calling the credit card company to dispute the charges" (iOS US, 2026-08-26). "arguing the point with Goldman Sachs" (iOS US, 2026-08-02). "Had to dispute charges with my bank." (iOS AU, 2025-06-05)
  - *Support access:* "The button to do so takes you to email. Not a chat." (Google Play). "they have an AI computer that will not allow you to speak" (Trustpilot US, 2026-08-30)
- **Positive reviews are mostly about the expert chat**, for example "Dana listened and responded to what I was saying". One said "Lisa was efficient (I'm still not sure if she's a 'bot'!)". — high (https://www.trustpilot.com/review/paw-champ.com)
- **How the company replies:** every review gets an answer, usually within about a day. Replies to positive reviews are templated and signed "Emily from PawChamp". Replies to 1-star reviews defend the pricing: "subscription pricing and terms are displayed on the payment screen before purchase". They then move the case to reviews-trustpilot@ or reviews-playstore@. The fetch flagged greetings that don't match the reviewer's name (for example "Dear Michael" to a different reviewer), so replies are at least partly templated or generated. Two resolutions are visible: a 50% refund followed by the "remaining refund (£19.47)", and "Partial refund agreed". — medium (https://www.trustpilot.com/review/paw-champ.com?stars=1&page=2, https://play.google.com/store/apps/details?id=com.pawchamp.app)

### (d) Job postings
- **Customer Support Specialist, PawChamp** (DOU, 3 Jun 2026, inactive): chat and email advice on training, behaviour and care; fast personalised service; explaining features; collecting feedback. Zendesk or Freshdesk is nice to have. No KPIs. — medium (https://jobs.dou.ua/companies/skelar/vacancies/330742/)
- **Growth Lead, PawChamp** (DOU, 8 Jun 2026, inactive): "Own the quiz funnel end to end". KPIs are CAC, LTV, ROAS, churn, subscription conversion and ARPU. Tools are Amplitude and Tableau. This shows that retention and churn are owned by growth, not support. — medium (https://jobs.dou.ua/companies/skelar/vacancies/356367/)
- **Frontend roles:** one is building a "low-code tool that lets marketers create and A/B test web-quiz funnels". It also maintains a quiz runtime serving "8+ countries" with payment integrations. — medium (https://jobs.dou.ua/companies/skelar/vacancies/356960/)

## Evidence against / open doubts
- **The problem may be smaller than the reviews suggest.** 78% of Trustpilot reviews are 4–5★, and 99% of negative reviews get a reply. Positive reviews praise fast human experts. (https://www.trustpilot.com/review/paw-champ.com)
- **PawChamp already uses AI in support** ("AI-assisted support" with Claude and OpenAI) and has Pawchie. Our pitch has to be about *actions and policy enforcement*, not chat. (https://paw-champ.com/policy/, https://dev.ua/en/news/pawchamp-1761296934)
- **The incentives may not favour refunds.** Refunds are "at our discretion", and growth owns churn KPIs, so the company may not want an AI that makes refunding easier. Frame the AI as cutting chargebacks, broken promises and handling time, not as "refund more". (https://paw-champ.com/membership-policy/, https://jobs.dou.ua/companies/skelar/vacancies/356367/)
- **We have no internal data.** We have no access to their Zendesk macros, ticket volumes, SLA targets or internal refund matrix. Review samples are biased toward angry users, and my iOS counts are keyword-based. Job posts give no support KPIs. (https://jobs.dou.ua/companies/skelar/vacancies/330742/)
- **The rating sources conflict.** Job posts say App Store 4.8, but the US lookup returns 4.18. (https://jobs.dou.ua/companies/skelar/vacancies/365754/, https://itunes.apple.com/lookup?id=6736829352&country=us)
- **The legal backdrop is shifting.** The FTC click-to-cancel rule was vacated on 8 Jul 2025. California's updated auto-renewal law has applied since 1 Jul 2025. (https://www.fenwick.com/insights/publications/eighth-circuit-vacates-ftcs-click-to-cancel-rule) The UK DMCCA subscription regime starts in January 2027. I did not verify its specific obligations; the fetched page doesn't list them. (https://shlegal.com/insights/subscription-reforms-brought-forward-to-january-2027-is-your-business-ready/) Many complainants are UK or AU customers, so a "compliance guard" angle is plausible but not verified in detail.
- **It is unclear whether the 30-day money-back guarantee is still offered** to non-US web buyers. The written policy says "generally non-refundable", but the funnel code still has the block. — low

## Existing products and tools
| name | url | what it does | weakness / gap |
|---|---|---|---|
| Pawchie AI (PawChamp) | https://help.paw-champ.com/api/v2/help_center/en-us/articles.json | AI dog-training companion in the app, built on Claude | Explicitly excludes subscription, account and billing questions |
| Expert chats (Training & Behavior, Health & Care) | https://paw-champ.com/ask-a-pet-expert-online/ | Human specialists 24/7, "within 60 seconds" average first reply | Consultations are capped by plan. Not vets. The same staff also seem to handle support. |
| Zendesk Guide help center | https://help.paw-champ.com/hc | 13 self-service articles in 9 locales | No billing, cancellation or refund articles |
| Email auto-cancel ("Unsubscribe" subject) | https://paw-champ.com/membership-policy/ | Cancels automatically when the email comes from the registered address | A mismatched sender goes to a human. Reviews describe emails that went unanswered. |
| Solidgate Billing (their processor) | https://docs.solidgate.com/billing/subscriptions/subscriptions-2.0/manage-subscriptions/cancel-subscription/ | Cancel NOW or PERIOD_END; reason codes incl. `DISPUTE_RECEIVED`; alert-based auto-cancel on chargeback alerts; webhook `SUBSCRIPTION_SCHEDULED_FOR_CANCELLATION` "can trigger a retention flow" | It is a payments tool with no understanding of conversations or policy |
| Review reply team ("Emily from PawChamp") | https://www.trustpilot.com/review/paw-champ.com | Templated public replies within about 24h, then moved to email | Greetings don't match reviewers; mostly defends pricing; outcome not linked back to the review |

## Data, APIs and repos we could use
| name | url | access | licence | notes |
|---|---|---|---|---|
| PawChamp Zendesk Help Center API | https://help.paw-champ.com/api/v2/help_center/en-us/articles.json | Public, no key | PawChamp content (use as reference or demo fixture only) | 13 articles × 9 locales. Good for KB grounding fixtures. |
| Apple iTunes customer-reviews RSS | https://itunes.apple.com/us/rss/customerreviews/page=1/id=6736829352/sortby=mostrecent/json | Free, no key; some country pages rate-limited | Apple content | About 50 reviews per page. I pulled 181. Good for building realistic ticket fixtures. |
| iTunes lookup | https://itunes.apple.com/lookup?id=6736829352&country=us | Free, no key | — | Rating, count, version |
| Trustpilot public pages | https://www.trustpilot.com/review/paw-champ.com?stars=1 | Public HTML | Trustpilot ToS | 1★ reviews with company replies, useful for QA-scoring demos |
| Solidgate Subscriptions API v2 | https://docs.solidgate.com/billing/subscriptions/subscriptions-2.0/manage-subscriptions/cancel-subscription/ | Merchant credentials | Commercial | Model our fake `billing` tool on its shapes (`mode: NOW/PERIOD_END`, `cancellation_info`, webhooks) |
| Bitext customer-support dataset | https://huggingface.co/datasets/bitext/Bitext-customer-support-llm-chatbot-training-dataset | Free download | CDLA-Sharing-1.0 | 26,872 pairs; intents incl. check_refund_policy, track_refund, payment_issue, delete_account. Generic e-commerce, not subscriptions. |
| τ²-bench | https://github.com/sierra-research/tau2-bench | Open source | MIT | 2,362★, pushed 2026-10-30. Domain = policy + tools + tasks; LLM judges. Template for our policy-following evals. |

## What this means for the idea
- PawChamp is a strong demo scenario. Its support load is dominated by billing intents, and those intents come with written, quotable rules: trial conversion, cancel channels, the 24h Apple cutoff, "generally non-refundable" web purchases, EU 14 days, Brazil 7 days, and the chargeback rules. That lets the AI cite a policy clause for every action it takes, which fits the Reasoning & Context Handling criterion.
- The 5–8 workflows to automate, each with the policy rule it rests on, the tools it needs, and what a human must approve:
  1. **"Don't recognise this charge" / unexpected renewal**
     - *Rule:* trial auto-converts (§6.7); renewal price ≤ previous price (§6.3); store purchases are refunded by Apple or Google.
     - *Actions:* look up the customer by email or last-4 digits; show the purchase timeline (trial → renewal); detect the platform; if it's a store purchase, send the Apple or Google refund link; if it's a web purchase, cancel with PERIOD_END and compute refund eligibility; score chargeback risk from the wording ("bank", "dispute", "scam").
     - *Human approves:* any refund, and the amount.
  2. **Cancel request** (email, chat or form)
     - *Rule:* email from the registered address with the subject "Unsubscribe" is auto-processed; any other sender needs account verification.
     - *Actions:* match the sender to an account; cancel; send confirmation; **then check that no further charge is scheduled**, because "charged after cancelling" is a top complaint.
     - *Human approves:* only when the sender doesn't match the account. A save offer can be made at most once and must never block the cancellation.
  3. **Refund-eligibility check**
     - *Rule:* EU withdrawal within 14 days, Brazil within 7 days, otherwise case-by-case. Usage criteria (30 days, 7-day streak, first module, 2 expert contacts) apply if the money-back guarantee is still live.
     - *Actions:* pull usage (lessons, streak, expert chats), region, days since purchase and prior refunds ("not entitled to multiple refunds"); output a recommendation of full, 50% partial, or none, with the clause cited.
     - *Human approves:* the final decision. Extenuating circumstances (bereavement, illness, a dead dog) get flagged to a senior agent.
  4. **Commitment tracker**
     - *Rule:* whatever an agent promised must actually happen. The "Nate" case was a reversed charge, a pause and a 75% discount, none of which were done.
     - *Actions:* extract promises from the agent's sent replies; turn them into queued actions (refund, pause, discount, cancel); verify they ran; alert on anything overdue.
     - *Human approves:* the money-moving actions behind each promise.
  5. **Account access recovery**
     - *Rule:* the help-article steps are to check the registration email and the login method (Google or Apple), resend the reset, and fall back to a manual reset by support.
     - *Actions:* find the account; detect the login method; trigger the reset; if the user "can't log in so can't cancel", cancel on verified email anyway.
     - *Human approves:* a manual password reset sent to an address that differs from the account email.
  6. **Routing dog-related questions**
     - *Rule:* Pawchie handles general dog questions; behaviour goes to the Training & Behavior chat; health goes to Care, which is "not veterinary services"; emergencies go to an in-person vet; consultations are capped by plan.
     - *Actions:* classify the message; check the plan's consultation balance; route it, or upsell the "Dog Behaviorist" add-on.
     - *Human approves:* nothing for routing; urgent health cases are flagged.
  7. **Public review triage**
     - *Rule:* reply within 24h and move the conversation off the platform.
     - *Actions:* match the reviewer to an account; resolve first; draft a personalised reply using the correct name and the actual outcome.
     - *Human approves:* posting the reply.
  8. **QA scoring of agent replies**
     - *Rubric:* policy accuracy (the right clause for the platform and region), whether the action was actually executed, empathy on extenuating circumstances, correct customer name, cancellation not obstructed by save offers, and chargeback risk left unaddressed.
     - *Human:* reviews only the flagged replies.
- Best single demo path: an angry email (UK customer, didn't know about the £38.99 renewal, threatens to call the bank) → intent and risk detection → account plus Solidgate-style timeline → policy-cited recommendation (cancel now, 50% goodwill refund, no lifetime upsell) → agent approves → actions run → reply drafted → QA score. Workflows 1, 2, 3 and 8 together cover all four challenge goals.
- All billing and account systems should be fakes shaped like Solidgate, Zendesk and store webhooks. Seed the fixtures with real review texts (iTunes RSS and Trustpilot) and the real policy text.
- In the pitch, frame the value as fewer chargebacks and broken promises plus faster handling, not "more refunds". That matches PawChamp's own Terms §6.6 ("contact us first … before initiating a chargeback").

## Sources read
- https://paw-champ.com/: product features, 9 languages, comparison table with $9.99/week and $40.00/month, Fontadella Limited
- https://paw-champ.com/membership-policy/: full auto-renewal, cancel (web/email/chat/iOS/Android) and refund rules, updated 06 Aug 2026
- https://paw-champ.com/terms/: §6.3 renewal, §6.5 refunds plus EU 14-day and Brazil 7-day withdrawal, §6.6 chargebacks, §6.7 trials
- https://paw-champ.com/contacts/: contact form types, billing/general/legal FAQ, chat button, no phone (page source shows Reteno, Amplitude, Sentry)
- https://paw-champ.com/policy/: privacy request process; AI-assisted support via Anthropic and OpenAI
- https://paw-champ.com/ask-a-pet-expert-online/: expert chat 24/7, "within 60 seconds", not veterinary
- https://paw-champ.com/questionary/quiz/quiz27?utm_source=homepage: quiz funnel; source shows Solidgate, PayPal, Apple Pay, Google Pay; bundles show trial/intro pricing, retention step, upsell blocks, non-US money-back block
- https://help.paw-champ.com/api/v2/help_center/en-us/articles.json (and sections, categories, locales): Zendesk Guide, 13 articles, 3 sections, 9 locales
- https://www.trustpilot.com/review/paw-champ.com: 4.4, 21,037 reviews, star split, 99% negative-reply rate, reply style
- https://www.trustpilot.com/review/paw-champ.com?stars=1 and https://www.trustpilot.com/review/paw-champ.com?stars=1&page=2: 40 one-star reviews categorised, with company offers
- https://itunes.apple.com/lookup?id=6736829352&country=us: 4.18 from 16,029 ratings, v1.50.0
- https://itunes.apple.com/us/rss/customerreviews/page=1/id=6736829352/sortby=mostrecent/json (plus us p2, au p4–5): 181 reviews analysed
- https://play.google.com/store/apps/details?id=com.pawchamp.app: 4.06 from 5,989 ratings, 100K+ downloads, review replies citing reviews-playstore@
- https://www.productreview.com.au/listings/paw-champ: 3.6 from 400 reviews; usage-criteria refunds, "over the 30-day period"
- https://apppricinglab.com/iap/apple/6736829352: 7 iOS in-app purchases with prices
- https://www.gigwise.com/?p=59145: quiz asks about age, breed, temperament, problems, owner experience; two expert chats
- https://dev.ua/en/news/pawchamp-1761296934: SKELAR product, CEO, Pawchie on Claude, hybrid handoff to live experts
- https://jobs.dou.ua/companies/skelar/vacancies/330742/: Customer Support Specialist role (tasks, Zendesk/Freshdesk, shifts)
- https://jobs.dou.ua/companies/skelar/vacancies/356367/: Growth Lead owns the quiz funnel; churn and ARPU KPIs
- https://jobs.dou.ua/companies/skelar/vacancies/356960/: low-code quiz-funnel builder, 8+ countries
- https://jobs.dou.ua/companies/skelar/vacancies/352894/, https://jobs.dou.ua/companies/skelar/vacancies/349227/, https://jobs.dou.ua/companies/skelar/vacancies/355037/, https://jobs.dou.ua/companies/skelar/vacancies/307481/, https://jobs.dou.ua/companies/skelar/vacancies/365754/, https://djinni.co/jobs/837115-head-of-analytics_pawchamp_q3_2026_/: product context; App Store "4.8" claim; no support KPIs
- https://jobs.dou.ua/companies/skelar/vacancies/: no open support roles in the first 20 of 66 listings
- https://docs.solidgate.com/billing/subscriptions/subscriptions-2.0/manage-subscriptions/cancel-subscription/: cancel modes, reason codes, webhooks
- https://www.fenwick.com/insights/publications/eighth-circuit-vacates-ftcs-click-to-cancel-rule: FTC rule vacated 8 Jul 2025; California law in effect
- https://shlegal.com/insights/subscription-reforms-brought-forward-to-january-2027-is-your-business-ready/: UK DMCCA subscription regime starts January 2027
- https://huggingface.co/datasets/bitext/Bitext-customer-support-llm-chatbot-training-dataset: 26,872 pairs, CDLA-Sharing-1.0
- https://github.com/sierra-research/tau2-bench: policy + tools + tasks benchmark, MIT
