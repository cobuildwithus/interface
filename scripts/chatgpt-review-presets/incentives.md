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

Patch-file output:

- Please return your final response as a single `.patch` file attachment with a `.patch` filename rather than as a normal prose review.
- Put all actionable fixes into one unified diff that we can download and apply directly.
- Limit the patch to concrete changes that fit this review scope, and keep the diff self-contained.
- If there are important residual concerns that you did not change, list them briefly outside the patch.
- If you find no actionable issues, say so explicitly instead of inventing a patch.
