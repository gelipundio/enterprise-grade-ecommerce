# Enterprise E-Commerce Challenge Implementation Plan

## Scope

This implementation builds the challenge core only: product CRUD, CSV import, buyer product search, and a fake purchase flow. Admin screens live under `/admin`, buyer screens live at `/` and `/checkout`, and there is no authentication or real payment integration.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS
- Prisma with PostgreSQL
- Docker Compose for local PostgreSQL and container smoke checks
- Vitest for service and parser tests
- Playwright for browser-flow tests
- `pnpm` for package management

## Domain Rules

- Required CSV fields: `name`, `sku`, `category`, `price`, `stock`
- Optional CSV fields: `description`, `weight_kg`
- SKU is the product identity and imports upsert by SKU
- Category names are normalized and created as needed
- Prices are stored as integer cents; `free` becomes `0`
- `weight_kg` is stored as integer grams
- Negative stock is clamped to `0` and reported as a warning
- Rows with missing required values or unparseable required values are skipped
- Product and CSV text fields are plain text only and reject HTML tags plus XSS payloads like `<script>alert('xss')</script>`
- Valid rows are imported even when other rows fail

## Validation And Security

Validation is enforced in service modules so browser forms, API callers, and CSV imports share the same rules. Product create/update validates `sku`, `name`, `description`, and `categoryName`. CSV import validates row-level `name`, `sku`, `category`, and `description` before inserting or updating products.

Potential XSS content is treated as an error, not sanitized and stored. The current check blocks HTML tags, inline event attributes, and `javascript:` URLs. Prisma uses parameterized queries, so SQL keywords in legitimate product copy are stored as plain text rather than blocked by a SQL denylist.

## Alternatives Considered

- Real payments were skipped because the challenge allows fake payment behavior and transactional stock updates are the important domain behavior.
- Authentication and roles were skipped to keep the implementation focused on the requested admin and buyer capabilities.
- Floating point money fields were avoided in favor of integer cents.
- Category free text on products was avoided so search and reporting can use normalized category records.

## Local Setup

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL with `docker compose up db`.
3. Install dependencies with `pnpm install`.
4. Generate Prisma client with `pnpm db:generate`.
5. Run migrations with `pnpm db:migrate`.
6. Optionally seed a sample product with `pnpm db:seed`.
7. Start the app with `pnpm dev`.

## Verification

- `pnpm lint`
- `pnpm test`
- `pnpm exec playwright test`
- `pnpm build`
- `docker compose up --build`

## Challenge Data Note

The private PDF and CSV remain under `challenge/`, which is ignored by git. The CSV was opened on Monday July 6th 2026, as noted in the original project notes. Public docs avoid copying private prompt or sample data content.
