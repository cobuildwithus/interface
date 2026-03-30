Objective:
Find behavior-preserving simplifications that reduce complexity and maintenance cost in a modern web app codebase.

Review priorities:

- Overly complex components/hooks that should be split by responsibility.
- Duplicate fetch/state/validation logic that should be shared.
- Unnecessary client-side state that can be derived or moved server-side.
- Redundant wrappers/abstractions that obscure data flow.
- React/Next boundary cleanup opportunities (server vs client components, route handlers, actions).
- Naming and type-shape improvements that reduce misuse.

Expected output:

- A ranked list of simplifications with impact, risk, and estimated effort.

Patch-file output:

- Please return your final response as a single `.patch` file attachment with a `.patch` filename rather than as a normal prose review.
- Put all actionable fixes into one unified diff that we can download and apply directly.
- Limit the patch to concrete changes that fit this review scope, and keep the diff self-contained.
- If there are important residual concerns that you did not change, list them briefly outside the patch.
- If you find no actionable issues, say so explicitly instead of inventing a patch.
