# ADR 0003: Use Exact Decimal Money

Status: Accepted

Date: 2026-09-03

## Context

Invoice totals, tax, discounts, and balances are money. MONEY-002 already forbids binary floating-point persistence, and MONEY-003 and MONEY-004 required a precision, rounding, and currency policy before implementation. JavaScript's `number` is a binary floating-point type, so it cannot represent decimal currency exactly even before persistence. The assessment names the initial currencies but left supported codes, rounding mode, and transport format open.

## Decision

All monetary values are exact decimals end to end:

- **Supported currencies** start as AUD, USD, and GBP, each with 2 minor-unit decimals. The canonical registry (code and minor units) lives in `packages/contracts`; extending it follows the [currency SOP](../sops/adding-a-currency.md). Currency-symbol display behavior remains an open decision.
- **Persistence** uses PostgreSQL `NUMERIC` with the scales fixed in the [Requirements Specification](../requirements.md): `rate NUMERIC(19,4)`, `taxPercent NUMERIC(5,2)`, all money amounts `NUMERIC(19,2)`.
- **Arithmetic** uses `Prisma.Decimal` only. JavaScript `number` never touches a monetary or percentage value at any layer, in examples or in code.
- **Rounding**, in calculation order:
  1. `subtotal = quantity * rate`, rounded to 2 decimal places, HALF_UP.
  2. `taxAmount = roundedSubtotal * (taxPercent / 100)`, rounded to 2 decimal places, HALF_UP. Tax derives from the already-rounded subtotal, never from the raw product.
  3. `totalAmount = subtotal + taxAmount - discount`, materialized at 2 decimal places.
  4. `balanceAmount = totalAmount - totalPaid`, materialized at 2 decimal places.
- **New invoices** have `totalPaid = 0.00`.
- **Transport** uses decimal strings for every monetary and percentage request field and every decimal response field; `quantity` remains an integer. The authoritative field rules are in the Requirements Specification.
- **Discount** has a non-negative floor but no approved upper bound; none is invented here.

## Considered Alternatives

- **Integer minor units (cents as JavaScript `number`)**: can be exact for arithmetic, but a single two-decimal minor-unit scale does not naturally represent the four-decimal `rate` (`NUMERIC(19,4)`) or currencies with minor units other than 2, and it adds conversion complexity at every persistence, transport, and display boundary. Rejected in favor of a decimal type throughout.
- **IEEE 754 decimal floats**: no native runtime support and no Prisma mapping; adds a dependency for nothing the domain needs.
- **Truncation or banker's rounding**: cheaper, but HALF_UP matches common invoice expectations and is what the approved policy chose; either alternative would produce totals that disagree with a reviewer's manual arithmetic.
- **Computing tax from the unrounded subtotal**: spreads rounding error between subtotal and tax and makes the displayed subtotal and the tax basis disagree.

## Consequences

- Every DTO, response mapper, seed, and test example carries decimal strings, so contract types in `packages/contracts` model them as strings.
- Tests must assert HALF_UP behavior on rounding-boundary values (for example, a tax computation landing exactly on a half-cent) against real `Prisma.Decimal` arithmetic.
- Postgres `NUMERIC` scales become part of the schema contract and are covered by committed migrations and integration tests.
- Adding a currency is a registry and allowlist change, not a schema change, unless its minor units require constraint changes (see the [currency SOP](../sops/adding-a-currency.md)).
- Changing an existing currency's minor units is a breaking data migration and needs separate design and ADR review.

## References

- [Prisma Decimal documentation](https://www.prisma.io/docs/orm/prisma-client/data-modeling/data-model#decimal)
- [PostgreSQL numeric types](https://www.postgresql.org/docs/current/datatype-numeric.html)
- [Requirements Specification: Monetary Calculations and Data Requirements](../requirements.md)
- [ADR 0001: Use PostgreSQL and Prisma for persistence](0001-use-postgresql-and-prisma-for-persistence.md)
- [SOP: Adding a currency](../sops/adding-a-currency.md)
