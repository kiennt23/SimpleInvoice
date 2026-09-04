# SimpleInvoice

SimpleInvoice is a responsive invoice assessment application built as an npm-workspaces monorepo: a React and TypeScript SPA, a modular NestJS API, shared transport contracts, and PostgreSQL.

## Architecture and project documentation

- [Requirements and API contracts](docs/requirements.md)
- [Architecture overview](docs/architecture.md)
- [Architecture decision records](docs/adr/)
- [Development workflow and test gates](docs/development-workflow.md)

The browser uses relative URLs. Vite proxies API paths to the backend during local development; the Compose nginx frontend does the same in Docker. PostgreSQL and Prisma provide persistence, JWT sessions use a hardened cookie, money uses exact decimal arithmetic, and overdue status follows configured business-date semantics. The linked architecture and ADRs contain the details.

## Docker setup (recommended)

Prerequisite: Docker with Compose v2. From a clean checkout:

```sh
docker compose up -d --build
```

Compose builds and starts PostgreSQL, applies committed migrations, runs the idempotent seed, and then starts the API and frontend. No `.env` file is required because `compose.yaml` supplies safe local defaults.

Open <http://localhost:8080> and sign in with:

| Field | Compose default |
| --- | --- |
| Email | `reviewer@simpleinvoice.local` |
| Password | `reviewer-local-password` |

These credentials are local review data, not production credentials. Overrides in `.env` take precedence. To inspect startup or remove the stack and its database volume:

```sh
docker compose ps
docker compose logs migrate seed backend frontend
docker compose down -v
```

## Local setup without Docker

Prerequisites: Node.js `^22.12`, npm, and PostgreSQL 16 reachable from the host.

```sh
npm ci
cp .env.example .env
# Edit .env for your PostgreSQL instance and replace JWT_SECRET.
set -a; . ./.env; set +a
npm run prisma:deploy -w apps/backend
npm run seed
npm run start:dev -w apps/backend
```

In a second terminal, from the repository root:

```sh
npm run dev -w apps/frontend
```

Open <http://localhost:5173>. The root `.env` is loaded into the shell explicitly because workspace commands execute from their workspace directory. Keep the environment exported for backend and seed commands. The `.env.example` reviewer values are the local-login credentials unless changed before seeding.

## Ports

| Service | Local development | Docker Compose |
| --- | --- | --- |
| Frontend | `5173` | `8080` |
| Backend / Swagger | `3000` | `3000` |
| PostgreSQL | `5432` | `5432` |

Swagger UI is available at `/api/docs` on the frontend origin or directly at <http://localhost:3000/api/docs>.

## Seed data

With `DATABASE_URL` (and optionally `BUSINESS_TIME_ZONE`, `SEED_REVIEWER_EMAIL`, and `SEED_REVIEWER_PASSWORD`) exported:

```sh
npm run seed
```

The command is idempotent: it upserts the reviewer, replaces invoice data, and creates 25 invoices. It includes the adapted Appendix A invoice plus 24 varied invoices for search, filtering, sorting, pagination, and derived overdue behavior. Compose runs this command automatically on startup.

## Quality gates

Run these after exporting the root `.env` as shown in the local setup. The backend build and E2E suite require `DATABASE_URL`; E2E also requires that database to be migrated. Install the visual-test browser once with `npx playwright install chromium`.

```sh
npm run lint
npm run format:check
npm run typecheck
npm run test -w apps/backend
npm run test:e2e -w apps/backend
npm run test:run -w apps/frontend
npm run test:visual -w apps/frontend
npm run build
```

GitHub Actions runs the `contracts`, `frontend`, and `backend` jobs on pull requests and pushes to `main`.

## Assumptions and limitations

- This assessment uses one seeded reviewer; registration, logout, refresh tokens, user management, payment collection, and status transitions are out of scope.
- Invoice creation accepts exactly one line item, although persistence supports a one-to-many relationship.
- Customer details are immutable invoice snapshots; there is no customer-management feature.
- `Overdue` is derived at read time and is never persisted.
- Supported currencies are AUD, USD, and GBP.
- Deterministic browser visual regression tests cover key pages at mobile and desktop sizes; live-backend browser workflows are manually verified rather than automated in CI.
- Hosted deployment and external submission are not included.
