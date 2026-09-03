# SOP: Adding a Supported Currency

This procedure extends SimpleInvoice's supported invoice currencies. The canonical registry is the currency metadata in `packages/contracts`; the approved baseline is AUD, USD, and GBP, each with 2 minor-unit decimals ([ADR 0003](../adr/0003-use-exact-decimal-money.md)). Application scaffolding has not started, so the steps below name files and areas, not verified commands.

## Procedure

1. **Confirm business support.** Verify the currency is actually meant to be offered. If it is not approved for the product, stop.
2. **Confirm the ISO 4217 code.** Use the alphabetic code exactly as published by the [ISO 4217 maintenance agency](https://www.iso.org/iso-4217-currency-codes.html). Do not invent codes or accept non-standard aliases.
3. **Decide the minor units and check the storage and rounding policy.** Take the `exponent` from ISO 4217 (for example, JPY has 0, most currencies have 2). This routine SOP supports only currencies whose minor-unit precision fits the currently approved two-decimal calculated-money policy (`NUMERIC(19,2)` per [ADR 0003](../adr/0003-use-exact-decimal-money.md) and the [requirements](../requirements.md)). A currency whose minor units differ from two, including zero-decimal currencies such as JPY, does not fit the approved rounding policy: stop here and separately revise ADR 0003, the requirements' rounding and registry rules, the schema and migrations, backward compatibility, and tests before adding it.
4. **Add the currency to `packages/contracts`.** Extend the canonical registry entry with `code`, `minorUnits`, and a display-only `symbol` (from the shared ISO currency map). Symbols are never persisted; they exist only for frontend display. Because the package is framework-free with finite constants, both frontend and backend compile against the same source of truth.
5. **Update the backend.** Derive the create-request currency validation from the `packages/contracts` registry rather than a hand-maintained duplicate allowlist, and keep decimal validation and HALF_UP rounding aligned with the requirements. No schema migration is needed unless step 8 says otherwise.
6. **Update the frontend.** Add the currency to the selector options and to response formatting, driven by the same registry entry.
7. **Update documentation surfaces.** Update the owning requirement (MONEY-004's registry statement), Swagger examples, and seed data wherever currencies appear, keeping decimal strings for monetary fields.
8. **Migrate only if required.** Add a schema migration only if the change touches schema or constraints (for example, a check constraint enumerating codes). Adding a currency to a registry and allowlist alone is not a migration trigger. Committed-migration rules are in the [Development Workflow](../development-workflow.md).
9. **Test.** Add unit tests for validation and any minor-unit formatting, and integration tests against real PostgreSQL for persistence and query behavior involving the new currency. Existing suites must stay green.

## Changing an Existing Currency's Minor Units

This is not a routine SOP execution. Existing persisted amounts were materialized under the old scale, so reinterpreting them is a breaking data migration. It requires a separate design with explicit data-migration and rounding rules, plus ADR review. Do not fold it into this procedure.

## Out of Scope Here

- New monetary columns or scale changes: amend [ADR 0003](../adr/0003-use-exact-decimal-money.md) first.
