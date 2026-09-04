# SimpleInvoice Architecture

Status: implemented architecture. See the [Requirements Specification](requirements.md) for normative product, API, validation, money, and date behavior, the [Development Workflow](development-workflow.md) for test and migration practice, and the [root README](../README.md) for verified setup commands and ports.

## System Topology

The system is an npm-workspaces monorepo with three workspaces in one repository:

- `apps/frontend`: a React single-page application served as static assets.
- `apps/backend`: a modular NestJS REST API.
- `packages/contracts`: a narrow, framework-free shared TypeScript package.

The frontend and backend are the deployable application units; PostgreSQL is the third Docker Compose service. Each service has its own Dockerfile as required by DELIVERY-002. In development and in the final Compose setup, the browser talks to the frontend, and API calls use a same-origin relative path that the frontend server proxies to the backend. The browser never addresses the backend directly; same-origin delivery supports and simplifies the selected cookie-based authentication design in [ADR 0002](adr/0002-use-hardened-cookie-based-browser-authentication.md). Exposed ports (frontend 8080, backend 3000, PostgreSQL 5432) are documented in the delivery wave.

## Workspace Layout

```text
apps/
  frontend/        React SPA
  backend/         NestJS API, Prisma client and schema live here
packages/
  contracts/       shared transport types, enums, currency metadata
```

The backend is a modular monolith: one deployable API process containing feature modules. There are no microservices, no message broker, and no separate worker processes.

## Backend Architecture

The NestJS application contains these modules:

- `AuthModule`: login, identity restoration, cookie issuance, and request authentication guards.
- `InvoicesModule`: invoice list, detail, and creation, including monetary calculations and effective-status derivation.
- `DatabaseModule`: Prisma client provider and connection lifecycle.

User lookup and password verification remain internal to `AuthModule`; the current scope does not introduce a standalone user-management module.

### Layer Responsibilities

Within each module:

- **Controllers** own HTTP concerns only: routing, status codes, Swagger metadata. No business logic.
- **DTOs and the global `ValidationPipe`** own request validation. DTOs use `class-validator` and `class-transformer` per API-001. DTOs may implement interfaces from `packages/contracts` while remaining classes.
- **Services** orchestrate use cases and transactions. They call domain functions and Prisma directly.
- **Domain functions** are pure functions that own all calculations, date rules, and status rules. They may use `Prisma.Decimal` as a pure value type but have no `PrismaClient`, database, Nest, or HTTP dependencies, which is what makes them unit-testable under TDD; decimal values cross the HTTP edge as contract-defined strings.
- **Persistence** is written directly against the Prisma client. There is no generic repository abstraction or data-access interface layer. If a persistence boundary is needed, it is a concrete, specific one, such as the overdue-aware query module described below.

### The Overdue Query Boundary

Derived `Overdue` status and list predicates need parameterized SQL that Prisma's query builder cannot express cleanly. Exactly one concrete persistence boundary wraps that SQL. It must apply effective-status predicates before counting, before sorting, and before pagination, and the count query and rows query must share equivalent predicates with the deterministic tie-breaker required by LIST-009 and DATA-008. Both queries run in one repeatable-read transaction so rows and totals share a snapshot. B-tree indexes support each allowed sort plus its identifier tie-breaker; PostgreSQL trigram indexes support case-insensitive substring search. Behavior is normative in [requirements](requirements.md); this document only fixes the boundary's shape: one place, parameterized SQL, no generic repository.

### Snapshot and Cardinality Rules

- Customer data on an invoice is an immutable snapshot copied at creation time, as required by DATA-007. It is never joined live from a customers table.
- The invoice-to-items relation is one-to-many in the schema. The create DTO enforces exactly one item for the assessment flow, per CREATE-002, and the API persists both in one transaction per CREATE-012.

## Shared Contracts Package

`packages/contracts` is deliberately narrow and imports no framework:

- Transport TypeScript types shared by frontend and backend.
- Finite enums, unions, and constants (statuses, sort fields, query names).
- The supported-currency registry carrying `{code, minorUnits, symbol}`, where the symbol is display-only and never persisted, which is the canonical target the [currency SOP](sops/adding-a-currency.md) extends.

It must not contain: Prisma or generated database types, Nest decorators, React code, business services or calculations, or generic utilities. Prisma types stay backend-private; the backend maps database rows to contract types at its edge.

## Frontend Architecture

Stack: Vite, React Router, TanStack Query, React Hook Form, Zod, and native `fetch`. There is no Redux or equivalent global state library.

State ownership:

- **The URL** owns list search, filter, sort, and page state. The list screen is fully reproducible from its URL.
- **TanStack Query** owns all server state: caching, refetching, and loading/error representation.
- **Form state** stays local to React Hook Form and never enters a global store.

One protected route layout performs the session bootstrap once when the authenticated area is entered; list search-parameter changes do not revalidate `/auth/me`. Keyword input is debounced before it updates the URL, and TanStack Query's abort signal cancels superseded list requests.

The fetch client uses relative URLs so requests stay same-origin and ride the proxy. Runtime guards parse API responses and Zod parses form input as client-side feedback only; the backend validation described in [requirements](requirements.md) remains authoritative. When a protected-route request receives an HTTP 401 response in the API-007 shape, the router redirects to login.

## Data and Persistence

- PostgreSQL is the selected database ([ADR 0001](adr/0001-use-postgresql-and-prisma-for-persistence.md)).
- Prisma 7 with Prisma Migrate; every schema change ships as a committed migration. Migration practice is owned by the [Development Workflow](development-workflow.md).
- Invoice date and due date are PostgreSQL `DATE` columns, never timestamps ([ADR 0004](adr/0004-use-business-date-semantics.md)).
- Monetary and percentage columns are PostgreSQL `NUMERIC` with the scales fixed in [requirements](requirements.md): `rate NUMERIC(19,4)`, `taxPercent NUMERIC(5,2)`, and all money amounts `NUMERIC(19,2)`. Application code uses `Prisma.Decimal` exclusively for decimal arithmetic ([ADR 0003](adr/0003-use-exact-decimal-money.md)).
- Creating an invoice and its line item is one atomic transaction per CREATE-012.

## Authentication Topology

The API issues the JWT as an `HttpOnly`, `SameSite=Lax` cookie on the same origin as the application; `Secure` is required everywhere except controlled local HTTP development. Browser code never reads the token. Unsafe authenticated requests must carry an `Origin` header matching the configured application origin. The full normative rules live in [requirements](requirements.md); the rationale is in [ADR 0002](adr/0002-use-hardened-cookie-based-browser-authentication.md).

## Related Documents

- [Requirements Specification](requirements.md): normative product, API, validation, money, and date behavior
- [Development Workflow](development-workflow.md): test tools, migration practice, and documentation ownership
- [ADR 0001](adr/0001-use-postgresql-and-prisma-for-persistence.md): PostgreSQL and Prisma
- [ADR 0002](adr/0002-use-hardened-cookie-based-browser-authentication.md): cookie-based browser authentication
- [ADR 0003](adr/0003-use-exact-decimal-money.md): exact decimal money
- [ADR 0004](adr/0004-use-business-date-semantics.md): business date semantics
- [SOP: Adding a Currency](sops/adding-a-currency.md)
- [README: setup, ports, seeds, and limitations](../README.md)
