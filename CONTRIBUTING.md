# Contributing

Thanks for your interest in Cobuild.

## Contribution model

At this time, external code contributions are by invitation only.

How to help right now:

- Open high-quality bug reports with clear reproduction steps.
- Share debugging analysis and root-cause hypotheses in issue threads.
- Propose scoped feature ideas with user impact and alternatives.
- Improve docs through issue feedback and suggested edits.

Pull requests that were not explicitly invited by a maintainer may be closed without review.

## Why this model

We are keeping implementation ownership with the core team while the project is still evolving quickly across product, protocol, and infra surfaces. We use public issues/discussions to collect signal and align on priorities.

## What we accept

- Actionable bug reports with reproducible steps.
- Focused feature proposals aligned with roadmap direction.
- Design/architecture feedback that clarifies tradeoffs.

## What we do not accept (unless explicitly requested)

- Large rewrites spanning multiple product areas.
- Tokenomics/mechanism changes without prior team alignment.
- PRs that introduce behavior not discussed in an issue first.

## Issue triage policy

- Issues missing a reproducible report may be marked `status: needs-repro`.
- If no additional repro details are provided within 14 days, we may close the issue.
- Security concerns must not be posted publicly; use `SECURITY.md`.

## Invited pull request workflow

If a maintainer invites you to open a PR:

1. Start from an agreed issue and scope.
2. Create a focused branch from `main`.
3. Keep commits atomic and reviewable.
4. Add or update tests for behavioral changes.
5. Update docs for user-facing changes.
6. Run all required checks locally before requesting review.

## Community values

- Be kind and inclusive. Treat others with respect in issues, discussions, and community channels; we follow the Contributor Covenant: https://www.contributor-covenant.org/.
- Assume good intent. Written communication is imperfect, so default to curiosity and clarity.
- Teach and learn. If something is confusing, open an issue or discussion with a concrete suggestion.

## Local development

```bash
pnpm install
pnpm dev:web
```

If you need local env vars, start from `apps/web/.env.example` and copy it to `apps/web/.env`, then fill in real values.

## Required local checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter web build:ci
```

`pnpm build:web` performs a full production build and may require DB-backed runtime dependencies during page data collection.

## License

By contributing, you agree that your contributions are licensed under GPL-3.0-or-later.
