# SimpleInvoice

This repository is my submission for the 101 Digital full-stack assessment. It will contain a responsive invoice application: an authenticated reviewer can sign in, browse and filter invoices, view invoice details, and create a Draft invoice with one line item.

## Current status

Application scaffolding has not started. The repository currently contains only the assessment specification and project documentation. Everything described below is a target, not a completed feature.

## Planned system

The application is planned as an npm-workspaces monorepo holding the frontend, backend, and shared code in one repository:

- Responsive React TypeScript frontend
- Modular NestJS TypeScript REST API
- Relational database, with PostgreSQL preferred
- JWT-based authentication
- Invoice list, detail, and create scope (search, filter, sort, pagination, one-line-item Draft creation)
- Swagger documentation at `/api/docs`
- Unit and integration tests
- Seed data via `npm run seed`
- Docker Compose to start frontend, backend, and database from a clean checkout

## Documentation

- [Requirements specification](docs/requirements.md): implementation-ready product, API, validation, data, testing, and delivery requirements
- [Development workflow](docs/development-workflow.md): Git, review, testing, and documentation conventions
- [Assessment specification](docs/Assessment_Fullstack_v3.0.0.pdf): the original product requirements and seed-data reference

## Setup documentation

Setup commands, reviewer credentials, exposed ports, and environment configuration will be documented here only after they are implemented and verified. No command, service, or credential should be assumed to work yet.
