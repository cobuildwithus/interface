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
