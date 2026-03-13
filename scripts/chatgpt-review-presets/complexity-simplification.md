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

Parallel-agent output:

- Please return your final response as a set of copy/paste-ready prompts for parallel agents rather than as a normal prose review.
- Create one prompt per distinct issue or tightly related issue cluster.
- In each prompt, describe the issue in detail, explain why it matters, point to the relevant files, symbols, or tests, and include your best guess at a concrete fix.
- Make each prompt self-contained and specific enough that we can hand it directly to an agent with minimal extra context.
- If you find no actionable issues, say so explicitly instead of inventing prompts.
