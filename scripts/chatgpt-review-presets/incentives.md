Objective:
Assess product and abuse incentives in the web app: where user behavior can be gamed to extract value, bypass guardrails, or degrade trust.

Review priorities:

- Referral/reward/credit flows that are vulnerable to sybil or replay abuse.
- Pricing/quota/feature-gate logic that can be bypassed via client tampering.
- Friction asymmetry where abusive behavior is cheaper than honest behavior.
- Metrics/leaderboard/event systems that can be manipulated for visibility or rewards.
- Moderation/reporting/report-volume dynamics that are easy to game.

If explicit reward mechanics are absent:

- Focus on abuse incentives in onboarding, auth, posting/submission, and API usage patterns.

Expected output:

- Concrete abuse scenarios with suggested mitigations and tradeoffs.

Parallel-agent output:

- Please return your final response as a set of copy/paste-ready prompts for parallel agents rather than as a normal prose review.
- Create one prompt per distinct issue or tightly related issue cluster.
- In each prompt, describe the issue in detail, explain why it matters, point to the relevant files, symbols, or tests, and include your best guess at a concrete fix.
- Make each prompt self-contained and specific enough that we can hand it directly to an agent with minimal extra context.
- If you find no actionable issues, say so explicitly instead of inventing prompts.
