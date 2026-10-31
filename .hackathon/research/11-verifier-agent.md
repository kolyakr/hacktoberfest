# Verifier agent: how should an agent check other agents, and what should ours be? Mostly a deterministic receipts check, with Gemma used only for policy-clause interpretation and tone, and nothing sent to the customer until it passes.

## TL;DR
- **An LLM that reads a transcript is a weak checker of "did the agent really do it".** No LLM judge on AgentRewardBench passed 70% precision, so about 30% of trajectories they marked successful were not (https://arxiv.org/html/2504.08942v2). In false-success detection, no judge × prompt configuration passed 0.65 AUROC on tau2-bench, and judges reached 0.54 on AppWorld API traces (https://arxiv.org/abs/2606.09863). The fix is to check against **evidence**: billing state, webhook receipts and the tool log.
- **Checking its own work is the weakest setup.** Models fail to correct their own errors 64.5% of the time on average across 14 models, while correcting the same errors in someone else's text (https://arxiv.org/html/2507.02778v1). Intrinsic self-correction can make reasoning worse (https://arxiv.org/abs/2310.01798). LLM evaluators recognise and favour their own generations (https://arxiv.org/abs/2404.13076). So the verifier needs a different model or a different prompt, and it should see evidence, not the maker's reasoning.
- **Vendors check conversations, not execution.** Intercom Fin Monitors "read the conversation transcript" (https://www.intercom.com/help/en/articles/14170197-how-to-write-effective-monitor-scorecard-criteria). Zendesk QA reviews bot conversations against scorecards (https://support.zendesk.com/hc/en-us/articles/7418648293018-Evaluating-the-performance-of-AI-agents-using-Zendesk-QA). Decagon Watchtower flags conversations by criteria (https://decagon.ai/modules/watchtower-qa). Sierra supervisors check "each response as it's generated" (https://sierra.ai/blog/confidence-in-every-conversation). None of the pages I fetched says the vendor checks a claimed refund, cancel or pause against a payment-provider receipt before the reply is sent. Decagon's page itself names the failure mode: "a refund tool was called but no refund was issued". It treats this as something for audit logs, not as a Watchtower check (https://decagon.ai/modules/watchtower-qa).
- **Design.** Run a maker-checker gate between the action agent's draft reply and the customer. There are four checks:
  1. claims vs receipts (pure code);
  2. action allowed under policy (rules first, Gemma 31B only for ambiguous clauses);
  3. promise kept (every future-tense promise has a scheduled job or receipt);
  4. tone and goal resolved (Gemma, advisory only).

  The output is a Pydantic `Verdict` with `PASS | AUTO_FIX | BLOCK | ESCALATE`.
- **Demo.** The action agent "pauses" a subscription using Stripe-style `pause_collection` and tells the user "your subscription is paused". No `customer.subscription.paused` receipt arrives, because Stripe only emits that event for `status=paused` (https://docs.stripe.com/api/events/types). The verifier blocks the reply, shows the missing receipt, and either re-drafts honestly or escalates. A second planted failure is a `refund.created` followed by `refund.failed`.

## Key findings

### 1. Patterns for agents checking agents
- **Maker-checker / four-eyes.** "for each transaction, there must be at least two individuals necessary for its completion". One person creates or initiates and a second verifies or approves. It is a form of segregation of duties. Mapped onto agents: the action agent is the maker, the verifier is the checker, and money-moving actions or customer-facing claims need both. — **high** (https://en.wikipedia.org/wiki/Maker-checker, https://openriskmanual.org/wiki/Four_Eyes_Principle; both seen as search results, Wikipedia wording quoted via search, page not fetched in full)
- **Anthropic, "Building effective agents".**
  - Evaluator-optimizer means "one LLM call generates a response while another provides evaluation and feedback in a loop". It is "particularly effective when we have clear evaluation criteria".
  - A separate guardrail instance "tends to work better" than one call handling both the guardrail and the core response.
  - Agents should get "ground truth" from the environment at each step.
  - All three support a separate verifier that uses environment state. — **medium** (https://www.anthropic.com/engineering/building-effective-agents)
- **Gartner "guardian agents".**
  - Gartner describes them as a blend of AI governance and runtime controls within AI TRiSM, in three types: reviewers (check AI output for accuracy and compliance), monitors, and protectors (block risky actions).
  - Forecast: 10–15% of the agentic AI market by 2030 (press release, 11 Jun 2025).
  - The gartner.com page returned 403 and the mitsloanme copy returned 500, so the details come from search snippets only. Our verifier is a "reviewer" in this scheme, plus a "protector" when it blocks a reply. — **low/medium** (https://www.gartner.com/en/newsroom/press-releases/2025-06-11-gartner-predicts-that-guardian-agents-will-capture-10-15-percent-of-the-agentic-ai-market-by-2030; snippet only)
- **OpenAI Agents SDK guardrails.**
  - Input, output and tool guardrails. A tripwire raises an exception, and "A tripwire rejects the candidate final output".
  - Input guardrails run in parallel by default, so "the agent may have already consumed tokens and executed tools before being cancelled". `run_in_parallel=False` blocks instead.
  - For handoff or manager workflows, the docs recommend tool guardrails over agent-level ones, and "tool guardrails do not apply to the handoff call itself".
  - Lesson: a verifier attached only to the final output misses side effects that have already happened. Check at the tool boundary too. — **medium** (https://openai.github.io/openai-agents-python/guardrails/)
- **LangGraph supervisor.**
  - A central supervisor routes to worker agents through handoff tools. `output_mode` is `full_history` or `last_message`.
  - The repo is archived. The README says: "We now recommend using the supervisor pattern directly via tools rather than this library."
  - Lesson: a supervisor is a router, not a checker. It doesn't give independent verification for free. — **medium** (https://github.com/langchain-ai/langgraph-supervisor-py)
- **Google ADK LoopAgent (critic/refiner).**
  - A Writer, then a loop of Critic → Refiner. The critic emits "No major issues found" and the refiner calls `exit_loop`, which sets `escalate=True`. A `max_iterations=5` hard cap bounds the loop.
  - ADK 2.0 supersedes template workflows with graph-based ones (Python, Go).
  - Lesson: always bound auto-fix loops. — **medium** (https://adk.dev/agents/workflow-agents/loop-agents/)
- **CrewAI task guardrails.**
  - A function guardrail returns `(True, result)` or `(False, error)`. On failure "the error is sent back to the agent" for up to `guardrail_max_retries` (default 3).
  - LLM-string guardrails use "the agent's LLM", which is the same model checking itself and exactly the setup the self-correction evidence warns against. — **medium** (https://docs.crewai.com/en/concepts/tasks)
- **Multi-agent systems fail at verification often enough that it is one of three top-level categories.** MAST is built from more than 1,600 annotated traces across 7 frameworks: 14 failure modes in 3 categories (system design, inter-agent misalignment, task verification), kappa = 0.88. I did not get per-mode percentages. — **medium** (https://arxiv.org/abs/2503.13657)

**What works and what doesn't, synthesised (my inference from the above, not a cited result):**
- **Works:** a separate checker with clear criteria. Ground truth from the environment. Checks at the tool boundary as well as on the final output. Bounded retry loops. Blocking rather than parallel checks when a side effect is involved.
- **Doesn't work:** same-model self-review. Transcript-only judges for "was it done". Supervisors that only route. Unbounded critic loops.

### 2. LLM-as-judge reliability for agent trajectories
- **AgentRewardBench** (1,302 expert-annotated trajectories, 5 web benchmarks, 4 agent LLMs, 12 judges).
  - Best precision: GPT-4o on the accessibility tree, 69.8% (recall 83.1%). Claude 3.7 Sonnet: 69.4% on screenshots and 68.8% on the accessibility tree.
  - Quote: "no judge achieves above 70% precision, which means that 30% of trajectories are erroneously marked as successful."
  - The rule-based (official) evaluator had the best precision, 83.8%, but recall of only 55.9%.
  - Takeaway for us: deterministic checks rarely say "success" wrongly but miss valid variants. LLM judges are the reverse. For "did the refund happen", a false success is the expensive error, so rules come first. — **high** for the numbers (one paper, table read directly) (https://arxiv.org/html/2504.08942v2, https://arxiv.org/abs/2504.08942)
- **False success in tool agents.**
  - 45–48% of failures on single-control tau2-bench domains were false successes. On AppWorld the figure is 75.8%. On dual-control telecom it is about 3%. Trajectories: 9,876 tau2 trajectories (8 model families) and 1,879 AppWorld trajectories (4 families).
  - LLM judges: AUROC ≤ 0.65 on tau2 across 5 judges × 5 prompts with full task specs, and 0.54 on AppWorld API traces.
  - TF-IDF detectors: AUROC 0.83 and 0.95, finding 4–8x more false successes at the same flag rate.
  - The roughly 3% in dual-control telecom, where the user also acts and observes state, supports the "external evidence" argument. — **medium** (single 2026 workshop paper) (https://arxiv.org/abs/2606.09863)
- **Self-verification failure.**
  - Self-Correction Bench: a 64.5% average "blind spot" across 14 models, meaning they fix errors in user input but not in their own output. Appending "Wait" cut the blind spot by 89.3%. — **medium** (https://arxiv.org/html/2507.02778v1)
  - Huang et al.: intrinsic self-correction without external feedback struggles and sometimes degrades reasoning. — **medium** (https://arxiv.org/abs/2310.01798)
- **Same-model bias.**
  - Panickssery, Bowman and Feng: GPT-4 and Llama 2 recognise their own outputs with non-trivial accuracy, and self-recognition correlates linearly with self-preference (no numbers in the abstract). — **medium** (https://arxiv.org/abs/2404.13076)
  - **Counter-evidence:** a June 2026 preprint found no detectable self-preference in verifiable IFEval revision (85 comparisons, 4 families). Seen in search results only, not fetched. — **low** (https://arxiv.org/abs/2606.20093)
- **Why the verifier must check evidence, not the transcript (inference from the above).**
  - The claim "I've cancelled your subscription" sits in the transcript, and a transcript judge tends to believe it. That is the false-success pattern.
  - The verifier should only ask one question: does a receipt exist whose type, object ID, amount and timestamp match the claim? That is a join, not a judgement.
  - Stripe's event catalogue gives distinct receipts: `charge.refunded`, `refund.created`, `refund.failed`, `refund.updated`, `customer.subscription.deleted`, `customer.subscription.paused` (only for `status=paused`, not for paused payment collection), `customer.subscription.resumed`, `customer.subscription.updated` and `invoice.upcoming`. — **high** for the event list (https://docs.stripe.com/api/events/types)

### 3. Industry: how vendors audit agent actions
- **Intercom Fin Monitors.** These "currently evaluate Fin AI Agent conversations only". Flag criteria "reads the conversation transcript" and "doesn't have reliable access to a structured assignment history". So the check is transcript-based. — **medium** (https://www.intercom.com/help/en/articles/14170197-how-to-write-effective-monitor-scorecard-criteria)
- **Zendesk QA.** It reviews AI agent and bot conversations against scorecard categories, like human QA. The BotQA dashboard tracks escalation rate. The help page says nothing about checking actions or system state. — **medium** (https://support.zendesk.com/hc/en-us/articles/7418648293018-Evaluating-the-performance-of-AI-agents-using-Zendesk-QA)
- **Decagon Watchtower.**
  - It flags conversations by keywords, sentiment or combined conditions (abandoned chats, regulated complaints, negative sentiment). It runs on history or continuously.
  - The page mentions audit logs catching "a refund tool was called but no refund was issued", as a separate capability from Watchtower. — **medium** (https://decagon.ai/modules/watchtower-qa)
- **Sierra.**
  - Supervisors are "in-the-moment guardrails" that check "each response as it's generated", verify facts, enforce policy, redirect and escalate. The page doesn't say what source facts are checked against, or whether tool calls are audited. (https://sierra.ai/blog/confidence-in-every-conversation)
  - A separate Monitors layer uses "an LLM-as-judge to review every conversation". It ships with built-in monitors for looping, frustration and false transfers, and is calibrated against team-labelled conversations. (https://sierra.ai/blog/agent-monitoring)
  - A search snippet from a Sierra post claims "several supervisory agents" per production agent that can switch "from observe to intercept". I did not fetch that post.
  - — **medium**
- **Lorikeet.** The fetched blog describes "runtime AI guardrails" with "two layers of checks" and custom rules, but gives no detail. A snippet from the product page describes deterministic code boundaries (scoped tool access, execution caps) plus AI checks on inputs and outputs (injection, grounding, policy). Nothing on verifying execution against system state. — **low** (https://www.lorikeetcx.ai/blog/guardrails-runtime-protection-for-your-ai-agent; product page https://www.lorikeetcx.ai/product/guardrails not fetched)
- **Maven AGI.** Only a glossary page was found, via a search snippet. It describes "Action guardrails: Limit what operations the agent can perform (e.g., refund limits...)" applied before the agent interacts. These are pre-action permission limits, not post-action verification. — **low** (https://www.mavenagi.com/glossary/ai-guardrails, snippet only)
- **Does anyone verify execution before replying?** No fetched page documents a check of a claimed action against a payment-system receipt before the reply goes out. Sierra's pre-response supervisors are the closest, but their evidence source is undocumented. This is absence of evidence from marketing and help pages, not proof that nobody does it. — **medium**

## Evidence against / open doubts
- AgentRewardBench covers web agents and the false-success paper is one workshop paper. Neither covers subscription support specifically. tau2's retail and airline domains are the closest match (https://arxiv.org/abs/2606.09863).
- Rule-based checks have low recall: 55.9% on AgentRewardBench, so they reject valid variants (https://arxiv.org/html/2504.08942v2). Our receipts check will fire falsely if the action agent uses a legitimate but unexpected path, for example a credit note instead of a refund. Mitigation: map the allowed receipts for each claim type, and ESCALATE rather than BLOCK on "unknown receipt".
- Self-preference may be weak in verifiable settings (https://arxiv.org/abs/2606.20093, not fetched). Using a different prompt plus an evidence-only view may matter more than using a different model.
- In our stack both models are Gemma 4 (26B-A4B and 31B), so they are the same family. "Different model" is only partly independent. The independence has to come from the information diet (evidence only, no maker reasoning) and from the deterministic core.
- Vendors may verify execution internally without documenting it. Decagon's audit-log line shows they know about the failure mode (https://decagon.ai/modules/watchtower-qa).
- Webhooks are asynchronous. A receipt can arrive seconds after the reply is drafted. The verifier needs a short wait or poll, or a "pending" state, or it will produce false BLOCKs. Also, `refund.created` can be followed by `refund.failed` (https://docs.stripe.com/api/events/types), so "created" is not "done". *(Design inference.)*

## Existing products and tools
| name | url | what it does | weakness / gap |
|---|---|---|---|
| Intercom Fin Monitors | https://www.intercom.com/help/en/articles/14170197-how-to-write-effective-monitor-scorecard-criteria | Flags and scores Fin conversations | Reads the transcript; Fin only |
| Zendesk QA (AutoQA, BotQA) | https://support.zendesk.com/hc/en-us/articles/7418648293018-Evaluating-the-performance-of-AI-agents-using-Zendesk-QA | Scorecard QA of bot conversations, escalation metrics | Conversation-level; no documented action or state check |
| Decagon Watchtower | https://decagon.ai/modules/watchtower-qa | Criteria-based flagging of all conversations | Conversation flags; action failures left to audit logs |
| Sierra Supervisors + Monitors | https://sierra.ai/blog/confidence-in-every-conversation, https://sierra.ai/blog/agent-monitoring | Pre-response supervision; LLM-as-judge on every conversation | Evidence source undocumented; closed platform |
| Lorikeet Guardrails | https://www.lorikeetcx.ai/blog/guardrails-runtime-protection-for-your-ai-agent | Two-layer runtime guardrails | No public detail on execution verification |
| Maven AGI | https://www.mavenagi.com/glossary/ai-guardrails | Action limits (refund caps, permissions) | Pre-action permissions, not post-action proof (snippet only) |
| OpenAI Agents SDK guardrails | https://openai.github.io/openai-agents-python/guardrails/ | Input, output and tool tripwires | Framework, not a verifier; parallel mode lets tools run first |
| CrewAI task guardrails | https://docs.crewai.com/en/concepts/tasks | Function or LLM validation with retry (3) | The LLM guardrail uses the same agent LLM |
| Google ADK LoopAgent | https://adk.dev/agents/workflow-agents/loop-agents/ | Critic/refiner loop with `max_iterations` | Pattern only; the critic reads the draft, not evidence |
| langgraph-supervisor | https://github.com/langchain-ai/langgraph-supervisor-py | Supervisor routing via handoff tools | Archived; routing is not verification |

## Data, APIs and repos we could use
| name | url | access | licence | notes |
|---|---|---|---|---|
| Stripe event types | https://docs.stripe.com/api/events/types | Free docs; test mode needs a free account | Proprietary API | Model our fake webhook receipts on these names and semantics, including the `paused` vs `pause_collection` and `refund.failed` traps |
| AgentRewardBench | https://arxiv.org/abs/2504.08942 | Paper (open) | not checked | Cite for the "≤70% precision" number; dataset not inspected |
| False-success paper | https://arxiv.org/abs/2606.09863 | Paper (open) | not checked | Cite for AUROC ≤ 0.65 and the 45–48% false successes |
| MAST taxonomy | https://arxiv.org/abs/2503.13657 | Paper (open) | not checked | "Task verification" as a failure category |
| langgraph-supervisor-py | https://github.com/langchain-ai/langgraph-supervisor-py | GitHub | MIT (per README) | Archived; don't depend on it |
| tau2-bench (from 2-landscape.md) | https://github.com/sierra-research/tau2-bench | free | MIT | Policy + tools + tasks; a source of realistic retail policy clauses |

## Concrete design for our verifier

**Where it sits.** The action agent proposes and executes tools, then drafts a reply. The **verifier** runs before the reply is sent, and it blocks. It also runs a pre-execution policy check on money-moving tool calls, at the tool boundary, following the OpenAI SDK advice above.

**Inputs (evidence only, no maker chain-of-thought).**
```python
class VerifierInput(BaseModel):
    ticket: Ticket                      # customer text + customer_id + subscription snapshot BEFORE
    policy_pack: list[PolicyClause]     # id, text, machine rule (optional)
    action_log: list[ToolCall]          # name, args, result, ts, idempotency_key
    receipts: list[WebhookReceipt]      # type, object_id, amount, status, ts (from billing provider / fake)
    state_after: SubscriptionState      # fetched fresh by the verifier, not by the maker
    draft_reply: str
```

**Checks (in order; cheap and deterministic first).**
1. **Claim extraction.** Gemma fast (26B-A4B) turns `draft_reply` into structured claims: `{kind: refund|cancel|pause|credit|promise, amount?, effective_date?, quote}`. This is the only LLM step that touches the draft. Validate the output with Pydantic and retry once.
2. **Claims vs receipts (pure code).** Every `refund` claim needs a matching `refund.created` and no `refund.failed`, with the same amount and charge. `cancel` needs `customer.subscription.deleted`, or `updated` with `cancel_at_period_end`, depending on the wording. `pause` needs `customer.subscription.paused` (https://docs.stripe.com/api/events/types). Add the reverse check: every receipt for this customer that the reply does not mention gets flagged as `unmentioned_side_effect`.
3. **Action correct under policy.** Rules first: amount ≤ cap, within the refund window, max pauses per year, and so on. These come from the `rule` field on `PolicyClause`. Only clauses without a machine rule, or with ambiguous wording, go to **Gemma 31B** with the clause text plus facts. The prompt asks it to cite `clause_id` and a quote. Its output is `allowed | not_allowed | unclear`, and `unclear` means ESCALATE.
4. **Promise kept.** For each `promise` claim ("you'll get an email within 24h", "we won't charge you on the 5th"), require a scheduled job in `action_log`, or a state fact (for example, `invoice.upcoming` no longer scheduled). Promises with no backing become `unbacked_promise`.
5. **Tone and goal resolved (advisory).** Gemma 31B, with a fresh prompt that has no maker persona, checks whether the reply answers the customer's actual goal from the ticket and whether the tone fits. This check never blocks on its own. It can only lead to AUTO_FIX of wording.

**Output.**
```python
class Finding(BaseModel):
    check: Literal["claim_receipt", "policy", "promise", "tone_goal", "side_effect"]
    severity: Literal["info", "warn", "critical"]
    claim_quote: str | None
    evidence_ids: list[str]            # receipt / tool-call / clause ids
    explanation: str

class Verdict(BaseModel):
    decision: Literal["PASS", "AUTO_FIX", "BLOCK", "ESCALATE"]
    findings: list[Finding]
    fixed_reply: str | None            # only when AUTO_FIX
    deterministic_basis: bool          # true if decision rests only on code checks
```
**Decision rules** (in code, not decided by the LLM):
- Any `critical` claim_receipt or policy finding means **BLOCK**. The reply is withheld and the action agent gets the findings for one retry, max 2 iterations, following ADK's bounded loop.
- Still failing after the retries, any `unclear` policy result, any `unmentioned_side_effect` involving money, or a refund above the cap means **ESCALATE** to a human with the evidence bundle.
- Only wording problems (tone, or a claim that can be softened to match the receipts, such as "your refund has been initiated" instead of "refunded") mean **AUTO_FIX**. The fixed reply is re-verified once.
- Receipt still pending after a short wait (for example, 10 s; this number is not from a source) means: send an honest "in progress" reply and schedule a re-check. *(Design choice.)*

**Independence.**
- The verifier sees only `VerifierInput`. It gets no maker system prompt and no maker reasoning.
- The verifier fetches `state_after` itself.
- The model split: maker on 26B-A4B, verifier policy and tone on 31B, with a separate system prompt.
- The decision is computed in code from findings. The LLM can't "talk itself into" PASS.
- Log `deterministic_basis` so judges see which verdicts didn't need an LLM.

**Demo (planted failures the verifier catches).**
1. **Fake pause.** The customer asks to pause. The action agent calls `update_subscription(pause_collection=...)` and drafts "Your subscription is paused until 1 Dec." No `customer.subscription.paused` receipt arrives, so the verifier returns BLOCK and shows "claim 'paused' has no receipt". The retry calls the right pause tool, the receipt arrives, and the verdict is PASS.
2. **Refund that failed.** `refund.created` is followed by `refund.failed`, and the draft says "refunded". The verifier returns ESCALATE.
3. **Policy breach.** A refund of 120% of the charge, or one outside the 14-day window, gets blocked before execution, with the clause cited.

On screen, show a side-by-side of a transcript-only judge on the same case (Gemma rating it "resolved") next to the receipts verifier (BLOCK). This echoes the paper's result that transcript judges miss false successes. *(The live comparison is our own demo, not a measured result.)*

## What this means for the idea
- Pitch the verifier as **maker-checker for AI support**. Its novelty is pre-send verification against billing receipts. None of the fetched vendor docs (Fin, Zendesk, Decagon, Sierra) document that. They QA conversations.
- Keep the LLM out of the "did it happen" decision. Use AgentRewardBench (≤70% precision) and the false-success paper (AUROC ≤ 0.65) as the slide-level justification.
- Gemma's job in the verifier is narrow and explainable: claim extraction (fast model), policy-clause interpretation with citation (strong model), and tone. That answers "LLM wrapper you can't explain" and still makes AI central.
- Build the fake billing provider to emit Stripe-shaped events, including the `paused` vs `pause_collection` and `refund.failed` cases. The planted failures then come straight from real API semantics.
- Bound every loop (max 2 retries) and make ESCALATE a first-class outcome. Judges reward an honest "handed to human with evidence" over a confident wrong answer.

## Sources read
- https://arxiv.org/html/2504.08942v2: AgentRewardBench Table 1; best judge precision 69.8%, rule-based 83.8% precision and 55.9% recall; "no judge achieves above 70% precision".
- https://arxiv.org/abs/2504.08942: AgentRewardBench abstract; 1,302 trajectories, 12 judges, rule-based underreports success.
- https://arxiv.org/abs/2606.09863: false success is 45–48% of tau2 failures and 75.8% on AppWorld; judge AUROC ≤ 0.65 and 0.54; TF-IDF 0.83 and 0.95.
- https://arxiv.org/html/2507.02778v1: Self-Correction Bench; 64.5% blind spot across 14 models; "Wait" cuts it 89.3%.
- https://arxiv.org/abs/2310.01798: Huang et al.; intrinsic self-correction struggles and sometimes degrades.
- https://arxiv.org/abs/2404.13076: Panickssery et al.; self-recognition correlates with self-preference.
- https://arxiv.org/abs/2503.13657: MAST; 1,600+ traces, 14 failure modes, task verification is one of 3 categories.
- https://www.anthropic.com/engineering/building-effective-agents: evaluator-optimizer, separate guardrail instance, ground truth from the environment.
- https://openai.github.io/openai-agents-python/guardrails/: tripwires; parallel vs blocking; tool guardrails for multi-agent workflows; handoffs not covered.
- https://github.com/langchain-ai/langgraph-supervisor-py: supervisor via handoff tools; archived; recommends the tool-based pattern; MIT.
- https://adk.dev/agents/workflow-agents/loop-agents/: LoopAgent critic/refiner, `exit_loop` escalate, `max_iterations=5`.
- https://docs.crewai.com/en/concepts/tasks: function or LLM guardrails, `(bool, Any)`, 3 retries, the LLM guardrail uses the agent's own LLM.
- https://sierra.ai/blog/confidence-in-every-conversation: supervisors check each response as generated, verify facts, escalate.
- https://sierra.ai/blog/agent-monitoring: Monitors use LLM-as-judge on every conversation; built-ins for looping, frustration, false transfers.
- https://www.intercom.com/help/en/articles/14170197-how-to-write-effective-monitor-scorecard-criteria: Fin Monitors read the transcript; Fin conversations only.
- https://support.zendesk.com/hc/en-us/articles/7418648293018-Evaluating-the-performance-of-AI-agents-using-Zendesk-QA: scorecard QA of bot conversations; BotQA escalation metric.
- https://decagon.ai/modules/watchtower-qa: criteria flags on conversations; audit logs mention "refund tool was called but no refund was issued".
- https://www.lorikeetcx.ai/blog/guardrails-runtime-protection-for-your-ai-agent: two-layer runtime guardrails, little detail.
- https://docs.stripe.com/api/events/types: refund, subscription paused/resumed/deleted/updated and invoice.upcoming event semantics.
- https://www.gartner.com/en/newsroom/press-releases/2025-06-11-gartner-predicts-that-guardian-agents-will-capture-10-15-percent-of-the-agentic-ai-market-by-2030: 403 on fetch; details from search snippet only (unverified).
