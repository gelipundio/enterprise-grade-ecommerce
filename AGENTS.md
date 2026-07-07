# Repository Guidelines

## Project Structure & Module Organization

This repository is a Next.js App Router implementation for an e-commerce code challenge. Use `README.md` and `docs/implementation-plan.md` for approach notes, architecture decisions, and setup notes. The `challenge/` directory contains private prompt and data artifacts and must remain out of shared commits.

Application code lives under `src/`. Route handlers and pages live in `src/app`, reusable UI lives in `src/components`, and domain logic lives in `src/services`. Prisma schema, migrations, and seed code live in `prisma/`. Automated tests live under `tests/unit` and `tests/e2e`. Public static assets should live in `public/`.

## Build, Test, and Development Commands

- `pnpm dev`: start local Next.js development.
- `pnpm build`: create a production build.
- `pnpm lint`: run Next.js linting.
- `pnpm test`: run Vitest unit tests.
- `pnpm exec playwright test`: run browser smoke tests.
- `pnpm db:generate`: generate the Prisma client.
- `pnpm db:migrate`: run local Prisma migrations.
- `pnpm db:seed`: seed a local sample product.
- `docker compose up db`: start local PostgreSQL.
- `docker compose up --build`: build and run the app container with PostgreSQL.

## Coding Style & Naming Conventions

Use TypeScript and idiomatic Next.js conventions. Format code with 2-space indentation. Name React components with `PascalCase`, variables and functions with `camelCase`, and route or file segments with `kebab-case` where appropriate. Keep client components focused on browser interactivity and put reusable business rules in `src/services`. Prisma models should use singular `PascalCase` names. Database fields should be explicit about units, for example `priceCents` and `weightGrams`, to avoid ambiguity and precision issues.

## Testing Guidelines

Automated tests should cover CSV import, validation and normalization, product CRUD, search, pagination, and purchase transaction behavior. Use clear `*.test.ts` naming under `tests/unit` for Vitest tests and `*.spec.ts` under `tests/e2e` for Playwright tests. Include regression tests for edge cases such as duplicate SKUs, missing product names, invalid prices, negative stock, and unit conversions.

## Commit & Pull Request Guidelines

Git history is unavailable in this directory, so use a simple conventional format going forward: `type: short imperative summary`, such as `feat: add product import validation`. Pull requests should include a concise summary, test evidence, screenshots for UI changes, and notes about schema or migration changes.

## Security & Configuration Tips

Do not commit private challenge content, CSV samples, secrets, or `.env` files. Keep challenge artifacts local unless explicitly cleared for sharing. Payment behavior is intentionally fake for this challenge unless requirements change, but purchase flow code should still preserve transactional integrity.
