Objective:
Identify concrete code-quality issues and frontend anti-patterns that are likely to cause bugs or slow future development.

Review priorities:

- Fragile async patterns (race conditions, stale closures, unhandled promise paths).
- Form/data validation gaps and mismatch between UI validation and server enforcement.
- Side-effect misuse in hooks/components (leaky effects, dependency-array bugs, duplicated subscriptions).
- Error-handling gaps (silent failures, swallowed exceptions, user-hostile fallback states).
- Test quality gaps (low-signal assertions, missing edge cases, brittle fixture setup).
- Unclear module boundaries and utility sprawl.

Expected output:

- Concrete findings tied to file locations, each with an actionable fix.

Parallel-agent output:

- Please return your final response as a set of copy/paste-ready prompts for parallel agents rather than as a normal prose review.
- Create one prompt per distinct issue or tightly related issue cluster.
- In each prompt, describe the issue in detail, explain why it matters, point to the relevant files, symbols, or tests, and include your best guess at a concrete fix.
- Make each prompt self-contained and specific enough that we can hand it directly to an agent with minimal extra context.
- If you find no actionable issues, say so explicitly instead of inventing prompts.
