Objective:
Perform a focused security review of this web application snapshot.

Review priorities:

- Authentication/session integrity (wallet-auth binding, token/cookie handling, logout invalidation, account-switch edge cases).
- Authorization boundaries across server actions, API routes, and client-visible controls.
- Input/output safety (XSS sinks, unsafe HTML rendering, URL/query-param injection, open redirects).
- CSRF/CORS/origin assumptions for state-changing requests.
- Sensitive data exposure (server-only secrets, PII leakage, verbose error payloads, cache poisoning).
- Dependency and supply-chain risk signals (unsafe packages, dynamic eval usage, insecure defaults).

Expected output:

- Concrete findings with severity, exploit path, and exact file/function references.
- Minimal remediation guidance that preserves product behavior.

Patch-file output:

- Please return your final response as a single `.patch` file attachment with a `.patch` filename rather than as a normal prose review.
- Put all actionable fixes into one unified diff that we can download and apply directly.
- Limit the patch to concrete changes that fit this review scope, and keep the diff self-contained.
- If there are important residual concerns that you did not change, list them briefly outside the patch.
- If you find no actionable issues, say so explicitly instead of inventing a patch.
