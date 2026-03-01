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
