# ADR 0001: Use PostgreSQL and Prisma for Persistence

Status: Accepted

Date: 2026-09-03

## Context

SimpleInvoice needs a relational database with exact decimal money, date-only columns, transactional multi-row writes, and unique constraints. The assessment allows any relational database but favors PostgreSQL. The data access approach was an open technical decision because it affects migrations, typing, and testing across the whole backend.

## Decision

PostgreSQL is the selected database. The backend accesses it through Prisma 7, with Prisma Migrate for schema migrations and every migration committed to the repository. Money uses PostgreSQL `NUMERIC` mapped to `Prisma.Decimal`; date-only fields use PostgreSQL `DATE`. The Prisma client and schema stay backend-private inside `apps/backend`; nothing in `packages/contracts` exposes generated database types. Normative column scales and transport rules live in the [Requirements Specification](../requirements.md).

One concrete persistence boundary may use parameterized SQL for derived-Overdue list predicates, where an ORM query builder is a poor fit. There is no generic repository abstraction.

## Considered Alternatives

- **MySQL or SQLite**: viable relationally, but PostgreSQL was selected because its exact-decimal (`NUMERIC`), `DATE`, constraint, and query behavior give one consistent target for the money and date decisions in ADR 0003 and ADR 0004, and it aligns with the assessment's expectations.
- **TypeORM or Drizzle**: both would work, but Prisma's generated client, migration tooling, and typed `Decimal` support reduce the amount of hand-written mapping code for this size of project.
- **Raw SQL only**: maximum control, but it would force hand-rolling row mapping and migrations that Prisma already provides.
- **MongoDB**: rejected because the data is strongly relational, and the assessment requires a relational database.

## Consequences

- Migrations are the source of truth for schema evolution; they are never edited after merge, only extended with corrective migrations (see [Development Workflow](../development-workflow.md)).
- All decimal arithmetic must go through `Prisma.Decimal`; JavaScript `number` is never used for money.
- Integration tests must run against real PostgreSQL to cover behavior Prisma's query builder delegates to SQL.
- The frontend and shared package depend only on contract types, so changing the schema never leaks types into the frontend.
- Where Prisma's query builder cannot express the effective-Overdue predicates, one parameterized SQL boundary owns them.

## References

- [Prisma documentation](https://www.prisma.io/docs)
- [PostgreSQL numeric types](https://www.postgresql.org/docs/current/datatype-numeric.html)
- [Architecture overview](../architecture.md)
- [ADR 0003: Use exact decimal money](0003-use-exact-decimal-money.md)
- [ADR 0004: Use business date semantics](0004-use-business-date-semantics.md)
