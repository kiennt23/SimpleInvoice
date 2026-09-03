# PROJECT KNOWLEDGE BASE

**Generated:** 2026-09-03
**Repository:** `git@github.com:kiennt23/SimpleInvoice.git`
**Default branch:** `main`

## OVERVIEW

Greenfield workspace for the 101 Digital SimpleInvoice full-stack assessment.
Requirements and development conventions are documented; no application has been scaffolded.

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
101_assessment/
├── .gitignore                        # Excludes generated agent tooling state
├── README.md                         # Repository entry point and planned-system overview
├── AGENTS.md                         # Agent guidance for this workspace
├── docs/
│   ├── Assessment_Fullstack_v3.0.0.pdf # Product requirements and seed-data reference
│   ├── requirements.md                 # Normative implementation requirements
│   ├── architecture.md                 # Approved target architecture (not yet scaffolded)
│   ├── adr/                            # Accepted architecture decision records 0001-0004
│   ├── sops/                           # Repeatable procedures (adding a currency)
│   └── development-workflow.md         # Git, review, testing, and maintenance rules
```

There are no source files, package manifests, tests, Docker files, CI workflows, or executable entry points yet.

## TARGET SYSTEM

The project is an npm-workspaces monorepo: frontend, backend, and shared code live in one repository with npm as the package manager. The target is a responsive React TypeScript frontend, a modular NestJS TypeScript API, and PostgreSQL as the selected database. See `docs/architecture.md` for topology, modules, and boundaries and `docs/requirements.md` for the complete product, API, validation, data, testing, and delivery specification. No application code exists yet.

## DOCUMENTATION MAINTENANCE

- Update `docs/requirements.md` with any approved product, API, validation, or acceptance change.
- Update `docs/architecture.md` with approved changes to topology, workspace layout, modules, boundaries, stack, data access, frontend state, or proxy/Compose topology.
- Add an ADR under `docs/adr/` only when a decision meets the significance threshold in [Architecture Decision Records](docs/development-workflow.md#architecture-decision-records); link it from `docs/architecture.md`.
- Extend `docs/sops/` when a repeatable procedure is approved; keep each SOP procedure in one file and link to it.
- Update `docs/development-workflow.md` with any approved development, review, test, merge, or maintenance change.
- Change documentation in the same pull request as the behavior or convention it describes.
- Keep each detailed rule in one authoritative document and link to it elsewhere rather than duplicating it.

## COMMANDS

No project commands exist yet. Two interfaces are required by the specification and must be provided after scaffolding: `npm run seed` (seed data) and `docker compose up` (start frontend, backend, and database from zero). Do not claim either works until its manifest and configuration exist and have been executed successfully.

## OPEN DECISIONS

See [Open Product Decisions](docs/requirements.md#open-product-decisions) for unresolved product and API contracts, [Open Technical Decisions](docs/development-workflow.md#open-technical-decisions) for unresolved tooling choices, and [Agreed Baseline](docs/development-workflow.md#agreed-baseline) for settled conventions. Do not begin affected implementation until its listed decisions are resolved, and do not duplicate either register here.
