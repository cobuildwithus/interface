# Cobuild

Open-source monorepo powering the Cobuild web experience.

## Project status and support

- The repository is public and maintained by the Cobuild core team.
- External code contributions are currently by invitation only.
- Issues are for actionable bugs and scoped feature proposals.
- Questions and setup help should go to GitHub Discussions or Discord.
- Response times are not guaranteed. Security reports receive priority.

For full details, see `CONTRIBUTING.md` and `SUPPORT.md`.

## Scope boundaries

### What this repository includes

- Cobuild web application and related app code.
- Contract types, integration code, and local development tooling.

### What stays private

- Production secrets and private infrastructure configuration.
- Internal anti-abuse signals, detection heuristics, and moderation tooling details.
- Internal incident response procedures and operational runbooks.

## Risk notice

This software can interact with onchain systems and digital assets. Use at your own risk. Mechanisms can fail, prices can fall, and liquidity may not exist when needed.

## Related repositories

- Docs: `https://github.com/cobuildwithus/docs`
- Indexer: `https://github.com/cobuildwithus/cobuild-indexer`

Indexer quickstart:

```bash
git clone https://github.com/cobuildwithus/cobuild-indexer.git
cd cobuild-indexer
pnpm install
cp .env.example .env.local
pnpm dev
```

## Repository map

```text
cobuild/
├── apps/
│   ├── web/       # Next.js app (co.build)
│   ├── contracts/ # Contract types + wagmi config
├── agent-docs/    # Architecture/reference docs for contributors
└── package.json
```

## Requirements

- Node.js 20+
- pnpm (`pnpm@9.15.9`)

## Quickstart

```bash
pnpm install
pnpm setup:skills   # optional: installs local AI-agent skills into .agents/skills (gitignored)
cp apps/web/.env.example apps/web/.env
pnpm dev:web
```

The web app starts on the default Next.js port.

## Common scripts

```bash
pnpm dev:web        # Start web app
pnpm lint           # Lint web app
pnpm typecheck      # Typecheck web app
pnpm test           # Run workspace tests (if present)
pnpm --filter web build:ci # Compile-mode production build check (CI-equivalent)
pnpm build:web      # Build web app
pnpm format         # Format repository
pnpm format:check   # Check formatting only
```

## Support channels

- Questions and help: `https://github.com/cobuildwithus/interface/discussions`
- Community chat: `https://discord.com/invite/PwWFgTck7f`
- Bugs and proposals: `https://github.com/cobuildwithus/interface/issues`
- Security reports: `SECURITY.md` (`security@justco.build`)

## Contributing

See `CONTRIBUTING.md` for the current contribution model and workflow.

## License

GPL-3.0-or-later. See `LICENSE`.
