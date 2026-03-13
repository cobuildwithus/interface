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

Parallel-agent output:

- Please return your final response as a set of copy/paste-ready prompts for parallel agents rather than as a normal prose review.
- Create one prompt per distinct issue or tightly related issue cluster.
- In each prompt, describe the issue in detail, explain why it matters, point to the relevant files, symbols, or tests, and include your best guess at a concrete fix.
- Make each prompt self-contained and specific enough that we can hand it directly to an agent with minimal extra context.
- If you find no actionable issues, say so explicitly instead of inventing prompts.
