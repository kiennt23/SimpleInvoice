# ADR 0004: Use Business Date Semantics

Status: Accepted

Date: 2026-09-03

## Context

Derived `Overdue` status compares a due date against "today" (STATUS-005), and list filtering takes date strings. A due date is a calendar fact about the invoice, not a moment in time. If "today" is read from a server clock, a UTC host at 22:00 versus a business timezone at 08:00 the next morning flip Overdue status overnight, and results become host-dependent and untestable. The timezone definition and the date transport format were open decisions.

## Decision

- **Transport**: the API accepts and emits strict `YYYY-MM-DD` strings for `invoiceDate` and `dueDate`. The requirement's field rules and the new transport rules live in the [Requirements Specification](../requirements.md).
- **Storage**: PostgreSQL `DATE` columns. No timestamp column is used for either field, so no time or timezone component is stored or invented.
- **Business timezone**: an `IANA` timezone name is validated from the `BUSINESS_TIME_ZONE` environment variable at startup, defaulting to `UTC`. An invalid value fails fast rather than falling back silently.
- **One clock per request**: the current business date is computed once per request from an injectable clock/date provider, using `BUSINESS_TIME_ZONE`, and passed explicitly into every effective-status derivation and effective-Overdue query, including the parameterized SQL boundary from [ADR 0001](0001-use-postgresql-and-prisma-for-persistence.md). Code never calls host or database `CURRENT_DATE`/`now()` for these decisions.
- **Purity**: status-rule functions take the business date as an argument, keeping them deterministic and unit-testable under TDD.
- Which date field `fromDate`/`toDate` filters remains an open product decision.

## Considered Alternatives

- **Timestamps (`timestamptz`) with UTC storage**: standard for events, but wrong here. It forces an arbitrary time-of-day onto a date-only concept and makes the stored value depend on what instant the writer chose.
- **Host `CURRENT_DATE` at query time**: no injection seam, so tests must mock globals or fake the system clock, and results depend on which server handled the request.
- **Database `CURRENT_DATE` in SQL**: the same problems, plus the database host's timezone silently becomes the business timezone.
- **Client-supplied "today"**: untrusted input driving a status rule; trivially gameable and inconsistent across clients.

## Consequences

- The request context must carry the business date from middleware or a provider into services and queries, including as a parameter to the Overdue SQL.
- `BUSINESS_TIME_ZONE` becomes a required documented environment key in `.env.example`.
- Effective-status tests can pin the business date and assert exact Draft, Pending, Paid, and Overdue outcomes without touching a clock.
- Midnight-boundary behavior is explicit and reviewable: a due date equals today means not overdue, because Overdue requires the due date to be strictly before the business date (STATUS-003).
- Seed data can express past-due invoices without persisted Overdue status (DATA-006), and the derived result is stable under the configured timezone.

## References

- [PostgreSQL date/time types](https://www.postgresql.org/docs/current/datatype-datetime.html)
- [IANA Time Zone Database](https://www.iana.org/time-zones)
- [Requirements Specification: Status Rules](../requirements.md)
- [ADR 0001: Use PostgreSQL and Prisma for persistence](0001-use-postgresql-and-prisma-for-persistence.md)
- [Architecture overview](../architecture.md)
