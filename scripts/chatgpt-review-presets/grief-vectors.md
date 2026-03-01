Objective:
Identify abuse, liveness, and denial-of-service vectors in the web app where low-cost user actions create outsized operational or UX impact.

Review priorities:
- Endpoints/actions that are easy to spam and expensive to process.
- Missing rate limiting/backoff/idempotency for critical flows.
- Retry storms, polling loops, or cascaded re-renders under partial outages.
- Cache invalidation patterns that can be forced into constant churn.
- User flows that can be intentionally wedged into unrecoverable states.
- Bot/sybil vectors in public or unauthenticated flows.

Expected output:
- Attack path + impact + concrete hardening recommendation for each vector.
