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
