# Repository Guidelines

## Project Structure & Module Organization
- Monorepo: Root CLI orchestrates dev/build/test/deploy for all services.
- `web/`: Next.js app (Horizon UI Pro + Tailwind + Tremor + react-three-fiber). APIs via Hono + Zod + Scalar.
- `src/`: TypeScript CLI (`src/cli.ts`) and libs (`src/lib/*`), tests in `src/__tests__`.
- `n8n/`: Workflow JSON and schemas (`n8n/workflows/*.json`, `n8n/schemas/*`).
- Infra & docs: `docker-compose.yml`, `Dockerfile`, `docs/`, `config/`, `.husky/`.

## Build, Test, and Development Commands
- Install: `npm run install:all` (root and `web` packages).
- Dev CLI: `npm run dev` (ts-node) — starts local automations.
- Web app: `cd web && npm run dev` → http://localhost:3000.
- Compose stack: `docker compose up -d` (Postgres + n8n + Inbucket). Stop: `docker compose down`.
- Build: `npm run build` (builds `web/`).
- Test (CLI): `npm test`. Lint/format: `npm run lint`, `npm run format`.
- Database (run from root): `npm run db:generate | db:migrate | db:reset | db:seed | db:studio`.
- Deploy: `npm run deploy` (validate → reset DB → import n8n).

## Coding Style & Naming Conventions
- Prettier: 2-space, single quotes, semicolons, width 80.
- ESLint: Next core-web-vitals + TypeScript; fix with `npm run lint`.
- Naming: `camelCase` for vars/functions, `PascalCase` for components/types. `src/` files lowercase (`logger.ts`).

## Testing Guidelines
- Jest with `ts-jest` for CLI (`src/**/*.(test|spec).ts`). Keep unit tests fast and isolated.
- Coverage written to `coverage/` (text, lcov, html). Add tests alongside new CLI modules.
- UI tests (web) may use React Testing Library as needed; colocate under `web/src/`.

## Commit & Pull Request Guidelines
- Commits: Concise, imperative summaries (no strict convention enforced). Example: “Add API route scaffolds”, “Fix Prisma seed path”.
- PRs: Describe scope, link issues, include UI screenshots in `.screenshots/`, list migration steps and test evidence.
- Gates: Lint and tests pass; docs updated when commands/behavior change.

## Architecture Notes
- Stack: Next.js + n8n + Postgres + Prisma + Inbucket; Prisma Studio for inspection.
- Product status: Marketing scaffolded; auth and onboarding designed; starting first 3D business-intelligence visualization.

## Security & Configuration Tips
- Environment: Copy `web/.env.example` → `web/.env.local`; never commit secrets.
- Prisma: Ensure DB is up (Compose) before `db:*` scripts; use `db:studio` for local browsing.
- Workflows: Treat `n8n/workflows/*.json` as code; review diffs and validate via CLI before deploy.
