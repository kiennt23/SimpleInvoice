# SimpleInvoice Requirements Specification

## Document Authority

This specification translates `docs/Assessment_Fullstack_v3.0.0.pdf` into implementation-ready requirements. The PDF filename says v3.0.0, while its header and footer identify assessment version 2.3.1.

When requirements conflict, use this precedence:

1. Explicit numbered requirements in the assessment
2. Supporting prose in the assessment
3. Appendix A examples

Appendix A is a structural and seed-data reference, not authority for behavior that contradicts an explicit requirement.

## Product Scope

SimpleInvoice is a responsive full-stack application that allows an authenticated reviewer to:

1. Sign in and restore their authenticated identity.
2. Search, filter, sort, and page through invoices.
3. View complete invoice details.
4. Create a Draft invoice containing exactly one line item.

Status transitions, payment collection, customer management, and external third-party integrations are outside the required scope.

## Required Technology

| Area | Requirement |
| --- | --- |
| Frontend | Responsive ReactJS application written in TypeScript |
| Backend | Modular NestJS REST API written in TypeScript |
| Database | PostgreSQL |
| Authentication | JWT-based authentication |
| API documentation | Swagger UI at `/api/docs` |
| Runtime packaging | Docker Compose with frontend, backend, and database services |

## Authentication

- **AUTH-001:** `POST /auth/login` must validate an email and password and, for valid credentials, respond HTTP 200 with `{"user": {"id", "email", "fullname"}}` and issue the JWT by setting the session cookie.
- **AUTH-002:** Passwords must be stored as bcrypt hashes, never as plaintext.
- **AUTH-003:** JWT expiration must come from environment configuration and default to 3600 seconds.
- **AUTH-004:** `GET /auth/me` must return HTTP 200 with the same user object as successful login: `{"user": {"id", "email", "fullname"}}`.
- **AUTH-005:** All invoice endpoints and `/auth/me` must reject unauthenticated requests.
- **AUTH-006:** Protected frontend routes must redirect unauthenticated users to login.
- **AUTH-007:** The token is issued as an `HttpOnly`, `SameSite=Lax` cookie and is never readable by browser code. `Secure` is required outside controlled local HTTP development, the cookie lifetime aligns with the configured JWT expiry, and authenticated unsafe requests must carry an `Origin` header matching the configured application origin; a missing or mismatched Origin is rejected with HTTP 403 in the API-007 non-validation error shape. The Origin check applies only to authenticated unsafe methods (`POST`, `PUT`, `PATCH`, `DELETE`); `GET` and `HEAD` requests are never rejected for a missing Origin. Rationale: [ADR 0002](adr/0002-use-hardened-cookie-based-browser-authentication.md).
- **AUTH-008:** Seed data must include a reviewer account, and its non-production credentials must be documented in the root README.
- **AUTH-009:** The login screen must provide email and password inputs with a submit action.
- **AUTH-010:** The client must validate the login form before submission: email must be present and well-formed, password must be present and non-empty, and invalid input must show visible validation feedback without an API call.
- **AUTH-011:** The API must independently validate login requests: email format and password presence. Invalid credentials must be rejected with HTTP 401 in the API-007 non-validation error shape, with no cookie issued and no token stored.
- **AUTH-012:** A successful login must redirect the user to the Invoice List screen.
- **AUTH-013:** A failed login must keep the user on the login screen, show a visible error, and store no token. Invalid credentials return HTTP 401 in the API-007 non-validation error shape with no cookie.

## Invoice List

- **LIST-001:** The invoice list must be the default authenticated screen.
- **LIST-002:** Each row must show invoice number, customer, invoice date, due date, total, and effective status.
- **LIST-003:** Search must support case-insensitive partial matching by invoice number or customer.
- **LIST-004:** Users must be able to filter by effective status.
- **LIST-005:** Users must be able to sort by `invoiceDate`, `dueDate`, or `totalAmount` in ascending or descending order.
- **LIST-006:** Pagination must be performed by the server with a configurable page size.
- **LIST-007:** Date filtering must support `fromDate` and `toDate`.
- **LIST-008:** Filtering by derived `Overdue` status must occur before pagination totals and page contents are calculated.
- **LIST-009:** Equal sort keys must produce a stable page order across requests.

### List API

`GET /invoices` accepts:
| Query | Type and constraints | Purpose |
| --- | --- | --- |
| `page` | Integer, starting at 1; defaults to `1` | Requested page |
| `pageSize` | Integer, 1 to 100; defaults to `10` | Number of records per page |
| `sortBy` | Enum: `invoiceDate`, `dueDate`, `totalAmount` | Sort field |
| `ordering` | Enum: `ASC` or `DESC` | Sort direction |
| `status` | Enum: `Draft`, `Pending`, `Paid`, or derived `Overdue` | Effective invoice status |
| `keyword` | String | Case-insensitive partial match on invoice number or customer |
| `fromDate` | Date string, `YYYY-MM-DD`, inclusive | Inclusive lower date boundary |
| `toDate` | Date string, `YYYY-MM-DD`, inclusive | Inclusive upper date boundary |

Query composition must follow this order:

1. Apply keyword search together with all active filters (status and date range).
2. Sort the filtered set by `sortBy` and `ordering`.
3. Paginate the sorted set.

The `paging.total` value must be the count of records matching search and filters, calculated before pagination.

The response contract is:

```json
{
  "data": [],
  "paging": {
    "page": 1,
    "pageSize": 10,
    "total": 0
  }
}
```

Default query values are `page=1`, `pageSize=10`, `sortBy=invoiceDate`, and `ordering=DESC`. `fromDate`/`toDate` filter on `invoiceDate`, inclusive on both boundaries. Out-of-range or invalid query values are rejected with HTTP 400 using the API-006 validation-error contract; they are never coerced into a valid range. When the requested page lies beyond the final page, the response returns `data: []` together with the true `paging.total`.

The list response status is HTTP 200. Each list row uses exactly this camelCase shape, with every total as a decimal string and every date as a `YYYY-MM-DD` string:

```text
invoiceId, invoiceNumber, customerName, invoiceDate, dueDate, totalAmount, status
```

## Invoice Detail

- **DETAIL-001:** `GET /invoices/:id` must return complete invoice details.
- **DETAIL-002:** The detail view must show invoice and customer information.
- **DETAIL-003:** The detail view must show line-item name, quantity, and rate.
- **DETAIL-004:** The detail view must show subtotal, tax, discount, total, balance, and effective status.
- **DETAIL-005:** A request for a missing invoice must return HTTP 404 with `error: "Not Found"` and `message: "Invoice not found"` in the API-007 non-validation error shape.

## Invoice Creation

- **CREATE-001:** `POST /invoices` must create an invoice with persisted status `Draft`.
- **CREATE-002:** The assessment flow must accept exactly one line item; the database schema may support multiple items.
- **CREATE-003:** The user supplies the invoice number, and the database must enforce its uniqueness.
- **CREATE-004:** The API must reject a due date earlier than the invoice date.
- **CREATE-005:** Quantity must be a positive integer between 1 and 1000000 inclusive.
- **CREATE-006:** Rate must be positive.
- **CREATE-007:** Tax percentage must be non-negative and default to 10.
- **CREATE-008:** Discount must be a non-negative monetary amount and default to 0. A discount greater than subtotal plus tax is rejected with HTTP 400, so `totalAmount` and `balanceAmount` are never negative.
- **CREATE-009:** Required customer, invoice, date, currency, and item fields must be validated by both the relevant client form and the API boundary.
- **CREATE-010:** The backend must calculate all authoritative totals.
- **CREATE-011:** After successful creation, the frontend must show a success notification and redirect the user specifically to the Invoice List.
- **CREATE-012:** The API must create the invoice and its line item in one atomic transaction.
- **CREATE-013:** Quantity must fit the documented bounded integer range 1 to 1000000 inclusive, which is sufficient for calculation and storage.

### Creation Field Rules

Both the client form and the API boundary must enforce the applicable rules below. Client validation gives fast feedback; API validation is authoritative.

| Field | Rule |
| --- | --- |
| Customer name | Required, non-empty |
| Customer email | Required, valid email format |
| Customer mobile | Optional |
| Customer address | Optional |
| Invoice number | Required, unique across invoices |
| Invoice date | Required, valid date |
| Due date | Required, valid date, must be on or after the invoice date |
| Currency | Required |
| Item name | Required, non-empty |
| Quantity | Required, positive integer, 1 to 1000000 |
| Rate | Required, positive amount |
| Tax percentage | Non-negative, defaults to 10 when omitted |
| Discount | Optional, non-negative amount, defaults to 0 when omitted |

### Source-Data Field Disposition

The assessment's data-model reference names fields beyond the creation flow above. Their disposition:

| Field | Disposition |
| --- | --- |
| `invoiceReference` | Excluded: no requirement, endpoint, or UI rule uses it; excluded fields may be revisited only with an approved requirements change |
| `description` | Excluded: no requirement, endpoint, or UI rule uses it |
| `currencySymbol` | Excluded from storage: currency symbols are display-only values derived from the shared registry map (MONEY-004) and never persisted or accepted from client input |
| `createdBy` | Excluded: the assessment names no audit-trail requirement or endpoint that consumes it |
| `type` | Excluded: the assessment defines a single invoice type with no subtypes or transitions |
| `invoiceGrossTotal` (Appendix A) | Excluded: superseded by the normative calculated fields (subtotal, taxAmount, totalAmount, balanceAmount) in the formulas section |

Excluded fields do not appear in the Prisma schema, DTOs, contracts package, Swagger, or seeds.

## Monetary Calculations

For the required one-item creation flow:

```text
subtotal = quantity * rate
taxAmount = subtotal * (taxPercent / 100)
totalAmount = subtotal + taxAmount - discount
balanceAmount = totalAmount - totalPaid
```

- **MONEY-001:** The frontend must not provide authoritative calculated values to be persisted.
- **MONEY-002:** Monetary values must not be persisted using binary floating-point types.
- **MONEY-003:** All monetary and percentage arithmetic uses exact decimals (`Prisma.Decimal` as a pure value type, never JavaScript `number`), with HALF_UP rounding to 2 decimal places at the boundaries defined in [ADR 0003](adr/0003-use-exact-decimal-money.md): subtotal is rounded first, tax is computed from the rounded subtotal, and total and balance are materialized at 2 decimal places.
- **MONEY-004:** Supported currencies are initially AUD, USD, and GBP, each with 2 minor-unit decimals; the canonical registry lives in `packages/contracts` and carries `{code, minorUnits, symbol}`. Symbols are display-only, sourced from the shared ISO currency map (AUD=`A$`, USD=`$`, GBP=`£`), and are never persisted, never stored on an invoice, and never accepted from client input. The registry is extended per the [currency SOP](sops/adding-a-currency.md). New invoices persist `totalPaid = 0.00`. A discount greater than subtotal plus tax is rejected with HTTP 400 (CREATE-008), so totals and balances are never negative.
- **MONEY-005:** Monetary and percentage request fields are decimal strings in canonical syntax (no exponent or whitespace); every decimal response field is a decimal string; `quantity` remains an integer.
- **MONEY-006:** Persisted monetary and percentage columns use PostgreSQL `NUMERIC` with the scales in DATA-003.
- **MONEY-007:** Decimal inputs exceeding a field's approved scale must be rejected with HTTP 400 before calculation; values are never silently rounded by storage. Quantity is a positive integer within the bounded range 1 to 1000000 (CREATE-013).

## Status Rules

- **STATUS-001:** The database may persist only `Draft`, `Pending`, or `Paid`.
- **STATUS-002:** `Overdue` must never be persisted or seeded.
- **STATUS-003:** At read time, an invoice is `Overdue` when its persisted status is not `Paid` and its due date is before today.
- **STATUS-004:** A `Paid` invoice remains `Paid` even when its due date is in the past.
- **STATUS-005:** "Today" is a single business date per request, computed in the IANA timezone validated from `BUSINESS_TIME_ZONE` (default `UTC`) through an injectable clock provider and passed into all effective-status derivation and queries. Host and database `CURRENT_DATE` are never used. See [ADR 0004](adr/0004-use-business-date-semantics.md).
- **DATE-001:** `invoiceDate` and `dueDate` are strict `YYYY-MM-DD` strings in every API request and response, stored as PostgreSQL `DATE` with no timestamp component.

Appendix A includes a sample persisted `Overdue` value. It must not be copied because it conflicts with the normative status rule.

## User Interface Requirements

- **UI-001:** The application must provide functional layouts for both mobile and desktop viewport sizes.
- **UI-002:** Selecting an invoice from the list must navigate the user to that invoice's detail view.
- **UI-003:** After successful invoice creation, the user must land on the Invoice List (see CREATE-011).

## Validation and Errors

- **API-001:** NestJS must apply a global `ValidationPipe` using `class-validator` and `class-transformer`.
- **API-002:** API errors must consistently contain `statusCode`, `message`, and `error`.
- **API-003:** A global exception filter must normalize error responses.
- **API-004:** Swagger documentation must be implemented with `@nestjs/swagger` and served at `/api/docs`. It must document request payloads, query parameters, response schemas, and status codes for every endpoint.
- **API-005:** Pagination defaults are `page=1` and `pageSize=10`, with a maximum page size of 100. Invalid or out-of-range query values return HTTP 400 without coercion. A duplicate invoice number returns HTTP 409, and successful creation returns HTTP 201 with the created invoice.
- **API-006:** Validation errors must return HTTP 400 with `statusCode: number`, `error: string`, and `message: string[]`.
- **API-007:** Non-validation errors must return `statusCode: number`, `error: string`, and `message: string`. The global exception filter normalizes all errors to these two shapes.

### Response Contracts

These status codes and bodies are normative for every endpoint below. Validation failures use the API-006 shape; all other failures use the API-007 shape.

- `POST /auth/login` success: HTTP 200 with `{"user": {"id", "email", "fullname"}}` and the `Set-Cookie` session header. Invalid credentials: HTTP 401 with `{"statusCode": 401, "message": <string>, "error": <string>}` and no cookie.
- `GET /auth/me` success: HTTP 200 with the same `{"user": {"id", "email", "fullname"}}` object. Unauthenticated: HTTP 401 in the API-007 shape.
- `GET /invoices` success: HTTP 200 with `{"data": [row], "paging": {"page", "pageSize", "total"}}`, where each row is `{invoiceId, invoiceNumber, customerName, invoiceDate, dueDate, totalAmount, status}` with totals as decimal strings and dates as `YYYY-MM-DD` strings.
- `GET /invoices/:id` success: HTTP 200 with the detail schema: the list-row fields at the top level plus `currency`, `taxPercent`, a named `customer` object `{fullname, email, mobileNumber, address}`, a named `item` object `{name, quantity, rate}`, the decimal-string amounts `subtotal`, `taxAmount`, `discount`, `totalAmount`, `totalPaid`, `balanceAmount`, and `status`. Missing invoice: HTTP 404 with `error: "Not Found"` and `message: "Invoice not found"` (DETAIL-005).
- `POST /invoices` success: HTTP 201 with the created invoice in the detail schema. Duplicate invoice number: HTTP 409 with `error: "Conflict"` and `message: "Invoice number already exists"`.
- Origin-check rejection: HTTP 403 in the API-007 shape (AUTH-007). Unauthenticated access to any guarded endpoint: HTTP 401 in the API-007 shape (AUTH-005).

## Data Requirements

- **DATA-001:** User, invoice, and invoice-item records must have stable identifiers; UUIDs are recommended by the assessment.
- **DATA-002:** Invoice numbers must have a database-level unique constraint.
- **DATA-003:** Invoice monetary and percentage fields use exact decimal storage: `rate NUMERIC(19,4)`, `taxPercent NUMERIC(5,2)`, and `subtotal`, `taxAmount`, `discount`, `totalAmount`, `totalPaid`, and `balanceAmount` as `NUMERIC(19,2)`. Application code uses `Prisma.Decimal` exclusively ([ADR 0001](adr/0001-use-postgresql-and-prisma-for-persistence.md), [ADR 0003](adr/0003-use-exact-decimal-money.md)).
- **DATA-004:** A seed command must be available as `npm run seed`.
- **DATA-005:** Seed data must use Appendix A's records as the structural and relationship foundation, adapted wherever Appendix A conflicts with a normative rule, and add approximately 20-50 additional varied invoices so the dataset demonstrates search, status filtering, sorting, and pagination.
- **DATA-006:** Seeds may persist only `Draft`, `Pending`, and `Paid`; past due dates should demonstrate derived `Overdue` behavior. No seed record may carry a persisted `Overdue` status.
- **DATA-007:** Customer details are persisted as an immutable snapshot on the invoice, copied at creation time and never joined from a separate customer record at read time.
- **DATA-008:** All list sorting appends a deterministic identifier tie-breaker so pagination remains stable for equal sort keys.

### Environment Configuration Inventory

`DELIVERY-003` and `DELIVERY-004` require environment-only configuration and a complete `.env.example`. The required keys:

| Source | Required configuration |
| --- | --- |
| `DELIVERY-002` | Per-service `Dockerfile` paths (frontend, backend, database) |
| `DELIVERY-002` | Host port mapping for each Compose service |
| `ADR 0002` | Application origin used for Origin-header validation (e.g. `APP_ORIGIN`) |
| `ADR 0004` | `BUSINESS_TIME_ZONE` (validated IANA name, default `UTC`) |
| `AUTH-003` | JWT expiry configuration |
| `AUTH-00*` | JWT signing secret (env-only, never committed) |
| Persistence | `DATABASE_URL` connection string |

## Testing Requirements

- **TEST-001:** Frontend unit tests must cover critical user flows and key UI components.
- **TEST-002:** Backend unit tests must cover total calculations.
- **TEST-003:** Backend unit tests must cover overdue derivation.
- **TEST-004:** Backend unit tests must cover due-date validation.
- **TEST-005:** Backend tests must prove invoice-number uniqueness is enforced.
- **TEST-006:** At least one integration or E2E test must exercise a workflow such as creating an invoice and then finding it in the list.
- **TEST-007:** No coverage percentage is mandated.

Testing practice and pull-request gates are defined in [Development Workflow](development-workflow.md).

## Delivery Requirements

- **DELIVERY-001:** A documented `docker compose up` command must start the frontend, backend, and database together from a clean checkout, with no manual setup steps.
- **DELIVERY-002:** Each service, including the database, must have its own Dockerfile, and all exposed ports must be documented.
- **DELIVERY-003:** Environment-specific values, secrets, credentials, connection strings, and ports must come from environment configuration.
- **DELIVERY-004:** `.env.example` must list every required key without real secret values.
- **DELIVERY-005:** The root README must document: setup with Docker and setup without Docker, reviewer credentials, seed instructions, exposed ports, assumptions and decisions, known limitations and incomplete work, and an architecture overview.
- **DELIVERY-006:** Source may be delivered through GitHub, GitLab, or ZIP; a hosted repository is preferred.
- **DELIVERY-007:** Submission must be sent to `ThanhNguyenBa@101digital.io` and `rajiv@101digital.io`, including the repository identifier and the candidate email address, by the communicated deadline.

DELIVERY-006 and DELIVERY-007 are external submission and handoff steps owned by the user; they are outside the implementation scope.

## Open Product Decisions

Every decision previously listed in this register has been resolved and recorded as normative text in the owning sections above (Authentication, Invoice List, Invoice Detail, Invoice Creation, Monetary Calculations, and Validation and Errors). There are zero open items in this register.

This specification must be updated in the same change whenever an approved decision modifies product or API behavior. Add an ADR only when the decision meets the significance threshold in [Architecture Decision Records](development-workflow.md#architecture-decision-records); routine decisions remain in their owning specification or workflow section.
