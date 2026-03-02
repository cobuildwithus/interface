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
