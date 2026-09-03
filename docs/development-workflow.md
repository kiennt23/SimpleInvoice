# Development Workflow

## Purpose

This document defines how changes are designed, implemented, reviewed, tested, documented, and merged. It is expected to evolve with the project. Product behavior and acceptance obligations belong in [Requirements Specification](requirements.md).

## Agreed Baseline

| Concern | Decision |
| --- | --- |
| Repository layout | npm-workspaces monorepo (frontend, backend, and shared code in one repository) |
| Repository workflow | GitHub Flow |
| Merge strategy | Squash merge |
| Pull-request title | Conventional Commits, mandatory |
| Working commit naming | Conventional Commits, recommended |
| Package manager | npm |
| Linting | ESLint |
| Formatting | Prettier |
| Domain testing | Test-driven development |

The Git hosting provider is GitHub. The CI provider has not yet been selected, so CI-provider-specific configuration must not be documented as final until it exists.

## Repository Workflow

`main` represents the current releasable state. Do not use long-lived `develop`, release, or environment branches for this assessment.

For each change:

1. Start from an up-to-date `main`.
2. Create one short-lived branch for one coherent outcome.
3. Add behavior and its direct tests together in atomic commits.
4. Push the branch and open a focused pull request.
5. Rebase the branch when necessary to resolve divergence before approval.
6. Satisfy all required checks and review concerns.
7. Squash merge into `main` using a Conventional Commit-formatted PR title.
8. Delete the merged branch.

Never rewrite `main`. If a pushed feature branch must be rebased, update it with `--force-with-lease`, never `--force`.

## Branch Names

Use lowercase kebab-case with one of these prefixes:

| Prefix | Use |
| --- | --- |
| `feat/` | New user-visible capability |
| `fix/` | Defect correction |
| `refactor/` | Internal restructuring without behavior change |
| `test/` | Test-only change |
| `docs/` | Documentation-only change |
| `chore/` | Maintenance or repository tooling |
| `ci/` | Continuous-integration configuration |

Examples:

```text
feat/invoice-creation
fix/overdue-filter-pagination
docs/development-workflow
```

Do not include personal names, ticket placeholders, or vague labels such as `changes`, `updates`, or `misc`.

## Commits and Pull Requests

Pull-request titles must use the Conventional Commits shape. Working commits should use it when practical:

```text
type(scope): imperative description
```

Allowed types:

```text
feat fix docs style refactor perf test build ci chore
```

Recommended scopes should describe a stable product or repository area, for example:

```text
auth invoices frontend backend database infra docs
```

Examples:

```text
feat(auth): issue JWT for valid credentials
fix(invoices): filter overdue records before pagination
test(invoices): cover fixed-amount discount calculation
docs(workflow): record pull request conventions
```

Commit rules:

- Each commit must represent one reviewable and independently understandable change.
- Keep an implementation and its direct tests in the same commit.
- Separate unrelated modules or concerns into separate commits.
- Do not mix broad formatting changes with functional changes.
- Do not commit generated build output, secrets, local environment files, or editor state.
- Working commits remain intentional even though the pull request is squash merged.

Pull-request titles must follow the Conventional Commits format because the title becomes the commit on `main`. Using the same format for working commits is recommended, not required. Atomic, reviewable commit requirements remain mandatory regardless of naming. Pull-request descriptions must state:

- What changed and why
- How the change was verified
- Product or API behavior affected
- Environment, migration, or seed impact
- Documentation updated
- Known limitations or follow-up work
- Screenshots for user-interface changes

Keep pull requests small enough to review as one coherent outcome. Split work when parts can be implemented, tested, or reverted independently.

## Test-Driven Development

Use red-green-refactor for domain logic:

1. **Red:** Write the smallest test that expresses the next required behavior and confirm it fails for the expected reason.
2. **Green:** Implement the smallest correct change that makes the test pass.
3. **Refactor:** Improve names and structure without changing behavior, keeping the suite green.

TDD is required for calculations, overdue derivation, due-date validation, uniqueness behavior, and other deterministic business rules. For framework wiring and user-interface composition, tests may be developed alongside the implementation, but required behavior must be covered before the change is considered complete.

Tests should assert externally meaningful behavior rather than private implementation details. Never delete, skip, or weaken a failing test merely to make a check pass.

## Test Tooling

- Frontend unit tests use Vitest with React Testing Library.
- Backend unit tests use Jest; backend HTTP integration tests use Supertest.
- Persistence, integration, and E2E tests run against real PostgreSQL, never a mocked or in-memory substitute, because `NUMERIC` scales, `DATE` handling, constraints, and the parameterized effective-Overdue SQL all live in the database; business-date derivation itself is application logic per [ADR 0004](adr/0004-use-business-date-semantics.md).

Migration tooling is owned by [Database and Configuration Changes](#database-and-configuration-changes); architecture decisions by the [ADR section](#architecture-decision-records).

## TypeScript Conventions

- Enable strict TypeScript settings in every workspace.
- Do not use `any`, `@ts-ignore`, or `@ts-expect-error` to bypass type errors.
- Model finite domain states with unions or enums and handle them exhaustively.
- Validate untrusted input at HTTP, environment, database, and browser-input boundaries.
- Trust validated internal types instead of repeating the same checks at every layer.
- Prefer feature-based modules and keep domain calculations independent of controllers and UI components.
- Use descriptive names; avoid abbreviations that are not part of the product language.
- Add comments only when they explain a non-obvious decision or invariant.

Framework-specific conventions will be added after the selected stack (React, NestJS, PostgreSQL, Prisma, and the chosen test runners) is scaffolded and its behavior is verified. The stack itself is decided; only the detailed conventions await implementation.

## Linting and Formatting

ESLint owns code-quality and correctness rules. Prettier owns formatting. Do not configure overlapping stylistic ESLint rules that conflict with Prettier.

Once manifests exist, root scripts must provide a single workspace-level entry point for:

- Linting
- Formatting and format checks
- Type checking
- Unit tests
- Integration or E2E tests
- Production builds

Exact command names must be documented only after they exist and have been executed successfully.

## Database and Configuration Changes

- Schema changes are made with Prisma Migrate; every migration is committed alongside the schema change it implements.
- Never edit a migration after it has been merged; create a corrective migration.
- Document destructive or data-shape changes in the pull request.
- Keep secrets and local values out of version control.
- Update `.env.example` whenever a required environment key is added, removed, or renamed.
- Use placeholders in `.env.example`, never working credentials or secrets.

## Architecture Decision Records

Create an ADR only for a decision that is cross-cutting, expected to remain relevant for the life of the system, and expensive or risky to reverse. Typical candidates include system boundaries, persistence architecture, authentication-token handling, monetary representation and rounding, and date/time semantics.

Do not create ADRs for routine or easily reversible choices such as pagination defaults, endpoint status codes, response field details, seed values, test-runner selection, CI-provider selection, linting, formatting, or Git conventions. Record those decisions in the requirements, workflow, configuration, or API documentation that owns them.

When an ADR is warranted:

- Store it as `docs/adr/NNNN-kebab-case-title.md`.
- Record the context, decision, considered alternatives, and consequences.
- Number ADRs by creation order; the number does not indicate importance.
- Update the owning requirements or workflow document in the same change.
- Do not create placeholder ADRs for decisions that have not been made.

## Documentation Maintenance

Documentation is part of the definition of done. Update it in the same pull request as the change it describes.

| Change | Required documentation action |
| --- | --- |
| Product behavior or acceptance rule | Update `docs/requirements.md` |
| Development, review, test, or merge practice | Update this document |
| New command or setup step | Update the root README after verifying it |
| Environment key | Update `.env.example` and setup documentation |
| API contract | Update requirements and generated Swagger metadata |
| Product or API decision | Update the open-decision register in `docs/requirements.md` |
| Technical decision (CI provider) | Update the Open Technical Decisions section in this document |
| Architecturally significant decision | Update its owning document and add an ADR when it meets the threshold above |

Do not duplicate the same detailed rule across multiple documents. Keep the authoritative explanation in one place and link to it elsewhere.

## Definition of Done

A change is ready to merge only when:

- The requested behavior and acceptance criteria are satisfied.
- Relevant tests pass, including new regression coverage.
- Linting, formatting checks, type checking, and affected builds pass.
- Database migrations and environment examples are synchronized when applicable.
- Swagger metadata matches any changed API contract.
- Requirements, workflow, setup, and decision documentation are updated where affected.
- The pull request explains verification evidence and remaining limitations.
- No secret, generated artifact, or unrelated change is included.

The exact CI check names will be added after the repository and CI configuration exist.

## Open Technical Decisions

These decisions must be resolved and recorded here before the affected implementation begins:

- CI provider and required check names

Test tooling and migration tooling are decided and owned in the sections above; do not duplicate them here. Product and API decisions are tracked in the [Requirements Specification](requirements.md) open-decision register.
