# PROJECT KNOWLEDGE BASE

**Updated:** 2026-09-04
**Repository:** `git@github.com:kiennt23/SimpleInvoice.git`
**Default branch:** `main`

## OVERVIEW

Full-stack implementation of the 101 Digital SimpleInvoice assessment.

## SOURCE OF TRUTH

- Primary specification: `docs/Assessment_Fullstack_v3.0.0.pdf` (15 pages).
- The filename says v3.0.0, but the document header/footer says assessment version 2.3.1.
- Prefer explicit numbered requirements over conflicting Appendix A sample fields.
- Implementation-ready requirements: `docs/requirements.md`.
- Approved target architecture: `docs/architecture.md`.
- Accepted architecture decision records: `docs/adr/0001` through `0004` (persistence, authentication, money, dates).
- Repeatable procedures: `docs/sops/`, currently the adding-a-currency SOP.
- Git, review, testing, and documentation conventions: `docs/development-workflow.md`.
- Do not treat `.codegraph/` or `.omo/` as project source; both are generated agent tooling state.

## CURRENT STRUCTURE

```text
├── apps/frontend/       # React/Vite SPA and nginx image
├── apps/backend/        # NestJS API, Prisma schema/migrations, seed
├── packages/contracts/  # Framework-free shared contracts
├── docker/              # PostgreSQL image
├── docs/                # Requirements, architecture, ADRs, workflow, SOPs
├── compose.yaml
└── package.json
```

## SYSTEM

This npm-workspaces monorepo contains a responsive React TypeScript frontend, a modular NestJS TypeScript API, shared contracts, and PostgreSQL. See `docs/architecture.md` for boundaries and `docs/requirements.md` for normative behavior.

## DOCUMENTATION MAINTENANCE

- Update `docs/requirements.md` with any approved product, API, validation, or acceptance change.
- Update `docs/architecture.md` with approved changes to topology, workspace layout, modules, boundaries, stack, data access, frontend state, or proxy/Compose topology.
- Add an ADR under `docs/adr/` only when a decision meets the significance threshold in [Architecture Decision Records](docs/development-workflow.md#architecture-decision-records); link it from `docs/architecture.md`.
- Extend `docs/sops/` when a repeatable procedure is approved; keep each SOP procedure in one file and link to it.
- Update `docs/development-workflow.md` with any approved development, review, test, merge, or maintenance change.
- Change documentation in the same pull request as the behavior or convention it describes.
- Keep each detailed rule in one authoritative document and link to it elsewhere rather than duplicating it.

## COMMANDS

```sh
npm ci
npm run lint
npm run format:check
npm run typecheck
npm run test -w apps/backend
npm run test:e2e -w apps/backend       # requires DATABASE_URL and migrated PostgreSQL
npm run test:run -w apps/frontend
npm run build
npm run prisma:deploy -w apps/backend  # requires DATABASE_URL
npm run seed                           # requires DATABASE_URL
docker compose up -d --build
docker compose down -v
```

For local backend commands, export the repository-root `.env` first: `set -a; . ./.env; set +a`.

## OPEN DECISIONS

The product and technical decision registers currently have zero open items. Record future changes in their owning document and do not duplicate them here.
