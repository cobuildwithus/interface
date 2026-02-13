# Contributing

Thanks for taking the time to contribute!

## Getting started

```bash
pnpm install
```

If you need local env vars, start from `apps/web/.env.example` and copy it to
`apps/web/.env`, then fill in real values.

## Development

```bash
pnpm dev:web
```

## Tests and typecheck

```bash
pnpm test
pnpm typecheck
```

## Formatting

```bash
pnpm format
```

## Pull requests

- Keep changes focused and well-scoped.
- Add or update tests when behavior changes.
- Prefer small, reviewable pull requests.
- If you plan a large change, open an issue first to discuss.
- Document any new env vars in `apps/web/.env.example`.

## License

By contributing, you agree that your contributions are licensed under
GPL-3.0-or-later.
