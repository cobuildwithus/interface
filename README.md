# Cobuild

Open-source monorepo powering the Cobuild web experience.

Docs live in a separate repo: `https://github.com/cobuildwithus/docs`.

Indexer lives in a separate repo: `https://github.com/cobuildwithus/cobuild-indexer`.
Basic setup there:

```bash
git clone https://github.com/cobuildwithus/cobuild-indexer.git
cd cobuild-indexer
pnpm install
cp .env.example .env.local
pnpm dev
```

## What's inside

```
cobuild/
├── apps/
│   ├── web/       # Next.js app (co.build)
│   ├── contracts/ # Contract types + wagmi config
└── package.json
```

## Requirements

- Node.js 20+ for web development (`apps/web`)
- pnpm (repo uses `pnpm@9.15.9`)

## Quickstart

```bash
pnpm install
pnpm setup:skills   # optional: install local AI-agent skills to .agents/skills (gitignored)
cp apps/web/.env.example apps/web/.env
pnpm dev:web
```

The web app will start on the default Next.js port.

## Common scripts

```bash
pnpm dev:web        # Run the web app
pnpm build:web      # Build the web app
pnpm test           # Run all app tests (if present)
pnpm typecheck      # Typecheck the web app
pnpm format         # Format the repo
pnpm format:check   # Check formatting
```

## Contributing

We welcome issues and pull requests. Please read `CONTRIBUTING.md` for setup, workflow, and contribution guidelines.

## Security

For security reports, follow `SECURITY.md`.

## Deployment

This repo is set up for Vercel:

- **Web app** (`apps/web`)
  - Root directory: `apps/web`
  - Framework: Next.js
  - Domain: `co.build`

## License

GPL-3.0-or-later. See `LICENSE`.
