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

- **AUTH-001:** `POST /auth/login` must validate an email and password and issue a JWT for valid credentials.
- **AUTH-002:** Passwords must be stored as bcrypt hashes, never as plaintext.
- **AUTH-003:** JWT expiration must come from environment configuration and default to 3600 seconds.
- **AUTH-004:** `GET /auth/me` must return the authenticated user.
- **AUTH-005:** All invoice endpoints and `/auth/me` must reject unauthenticated requests.
- **AUTH-006:** Protected frontend routes must redirect unauthenticated users to login.
- **AUTH-007:** The token is issued as an `HttpOnly`, `SameSite=Lax` cookie and is never readable by browser code. `Secure` is required outside controlled local HTTP development, the cookie lifetime aligns with the configured JWT expiry, and authenticated unsafe requests must carry an `Origin` header matching the configured application origin; a missing or mismatched Origin is rejected. The exact rejection status and body remain open (see Open Product Decisions). Rationale: [ADR 0002](adr/0002-use-hardened-cookie-based-browser-authentication.md).
- **AUTH-008:** Seed data must include a reviewer account, and its non-production credentials must be documented in the root README.
- **AUTH-009:** The login screen must provide email and password inputs with a submit action.
- **AUTH-010:** The client must validate the login form before submission: email must be present and well-formed, password must be present and non-empty, and invalid input must show visible validation feedback without an API call.
- **AUTH-011:** The API must independently validate login requests: email format and password presence. Invalid credentials must be rejected without issuing a token.
- **AUTH-012:** A successful login must redirect the user to the Invoice List screen.
- **AUTH-013:** A failed login must keep the user on the login screen, show a visible error, and store no token. The exact HTTP status and body for failed login remain an open decision (see Open Product Decisions).

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
| `page` | Integer, starting at 1 | Requested page |
| `pageSize` | Integer | Number of records per page |
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

Do not use Appendix A's conflicting `pageNumber` and `totalRecords` names.

The following list-query details remain open decisions (see Open Product Decisions): which date field `fromDate`/`toDate` filter on, pagination defaults and maximum page size, and whether out-of-range numeric values are coerced or rejected. Rejected query values use the HTTP 400 validation-error contract in API-006.

## Invoice Detail

- **DETAIL-001:** `GET /invoices/:id` must return complete invoice details.
- **DETAIL-002:** The detail view must show invoice and customer information.
- **DETAIL-003:** The detail view must show line-item name, quantity, and rate.
- **DETAIL-004:** The detail view must show subtotal, tax, discount, total, balance, and effective status.
- **DETAIL-005:** A request for a missing invoice must return HTTP 404 using the API's consistent non-validation error shape.

## Invoice Creation

- **CREATE-001:** `POST /invoices` must create an invoice with persisted status `Draft`.
- **CREATE-002:** The assessment flow must accept exactly one line item; the database schema may support multiple items.
- **CREATE-003:** The user supplies the invoice number, and the database must enforce its uniqueness.
- **CREATE-004:** The API must reject a due date earlier than the invoice date.
- **CREATE-005:** Quantity must be a positive integer.
- **CREATE-006:** Rate must be positive.
- **CREATE-007:** Tax percentage must be non-negative and default to 10.
- **CREATE-008:** Discount must be a non-negative monetary amount and default to 0.
- **CREATE-009:** Required customer, invoice, date, currency, and item fields must be validated by both the relevant client form and the API boundary.
- **CREATE-010:** The backend must calculate all authoritative totals.
- **CREATE-011:** After successful creation, the frontend must show a success notification and redirect the user specifically to the Invoice List.
- **CREATE-012:** The API must create the invoice and its line item in one atomic transaction.
- **CREATE-013:** Quantity must fit a documented bounded integer range sufficient for calculation and storage; the exact bound is decided with the other creation contracts.

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
| Quantity | Required, positive integer |
| Rate | Required, positive amount |
| Tax percentage | Non-negative, defaults to 10 when omitted |
| Discount | Optional, non-negative amount, defaults to 0 when omitted |

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
- **MONEY-004:** Supported currencies are initially AUD, USD, and GBP, each with 2 minor-unit decimals; the canonical registry (code and minor units) lives in `packages/contracts` and is extended per the [currency SOP](sops/adding-a-currency.md). New invoices persist `totalPaid = 0.00`. Discount has no approved upper bound. Currency-symbol display behavior remains open.
- **MONEY-005:** Monetary and percentage request fields are decimal strings in canonical syntax (no exponent or whitespace); every decimal response field is a decimal string; `quantity` remains an integer.
- **MONEY-006:** Persisted monetary and percentage columns use PostgreSQL `NUMERIC` with the scales in DATA-003.
- **MONEY-007:** Decimal inputs exceeding a field's approved scale must be rejected with HTTP 400 before calculation; values are never silently rounded by storage. Quantity is a positive integer within a documented bounded range, decided with the other creation contracts.

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
- **API-005:** Pagination defaults, maximum page size, invalid-query behavior, duplicate-number response status, and creation response status must be decided before implementation.
- **API-006:** Validation errors must return HTTP 400 with `statusCode: number`, `error: string`, and `message: string[]`.
- **API-007:** Non-validation errors must return `statusCode: number`, `error: string`, and `message: string`. The global exception filter normalizes all errors to these two shapes.

## Data Requirements

- **DATA-001:** User, invoice, and invoice-item records must have stable identifiers; UUIDs are recommended by the assessment.
- **DATA-002:** Invoice numbers must have a database-level unique constraint.
- **DATA-003:** Invoice monetary and percentage fields use exact decimal storage: `rate NUMERIC(19,4)`, `taxPercent NUMERIC(5,2)`, and `subtotal`, `taxAmount`, `discount`, `totalAmount`, `totalPaid`, and `balanceAmount` as `NUMERIC(19,2)`. Application code uses `Prisma.Decimal` exclusively ([ADR 0001](adr/0001-use-postgresql-and-prisma-for-persistence.md), [ADR 0003](adr/0003-use-exact-decimal-money.md)).
- **DATA-004:** A seed command must be available as `npm run seed`.
- **DATA-005:** Seed data must use Appendix A's records as the structural and relationship foundation, adapted wherever Appendix A conflicts with a normative rule, and add approximately 20-50 additional varied invoices so the dataset demonstrates search, status filtering, sorting, and pagination.
- **DATA-006:** Seeds may persist only `Draft`, `Pending`, and `Paid`; past due dates should demonstrate derived `Overdue` behavior. No seed record may carry a persisted `Overdue` status.
- **DATA-007:** Customer details are persisted as an immutable snapshot on the invoice, copied at creation time and never joined from a separate customer record at read time.
- **DATA-008:** All list sorting appends a deterministic identifier tie-breaker so pagination remains stable for equal sort keys.

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

## Open Product Decisions

These decisions must be resolved before the affected implementation begins:

- Currency-symbol display behavior
- Whether discount may exceed subtotal plus tax
- Pagination defaults and maximum page size
- List-query coercion versus rejection policy
- Origin-check rejection status and error contract
- Behavior when a requested page lies beyond the final page
- Login success and invalid-credential response schemas and status codes
- `/auth/me` response schema and status codes
- Invoice-list row schema and list response status codes
- Invoice-detail response schema and status codes
- Invoice-creation response schema and status codes
- Duplicate invoice-number status and error contract
- Missing-invoice error message contract; the HTTP status is fixed at 404 by DETAIL-005
- Unauthenticated response status and error contract
- Which date field `fromDate`/`toDate` filter on

This specification must be updated in the same change whenever an approved decision modifies product or API behavior. Add an ADR only when the decision meets the significance threshold in [Architecture Decision Records](development-workflow.md#architecture-decision-records); routine decisions remain in their owning specification or workflow section.
