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

Patch-file output:

- Please return your final response as a single `.patch` file attachment with a `.patch` filename rather than as a normal prose review.
- Put all actionable fixes into one unified diff that we can download and apply directly.
- Limit the patch to concrete changes that fit this review scope, and keep the diff self-contained.
- If there are important residual concerns that you did not change, list them briefly outside the patch.
- If you find no actionable issues, say so explicitly instead of inventing a patch.
