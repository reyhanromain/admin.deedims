# Repository Guidelines

## Project Structure & Module Organization

Deedims is a TypeScript monorepo for a Telegram pre-order bot plus an admin CMS.

- `frontend/`: React 18 + Vite SPA. Source lives in `frontend/src`; UI is split across `components/`, `screens/`, `api.ts`, and `store.tsx`.
- `backend/`: one Node process running Fastify API, grammY bot, Prisma, SQLite, and retention cron. Routes are in `backend/src/api`; bot, jobs, and Prisma files live in `src/bot`, `src/jobs`, and `prisma`.
- `backend/test` and `frontend/src/__tests__`: Vitest suites.
- `docs/`: database design notes; keep them aligned with `backend/prisma/schema.prisma`.
- `docker-compose.yml`: full-stack local deployment.

## Build, Test, and Development Commands

- `docker compose up --build`: build and run the full stack from the repo root (`frontend:8080`, `backend:3100`).
- `cd backend && npm run dev`: start API on port 3100, plus bot when `BOT_TOKEN` is set.
- `cd backend && npm run typecheck`: TypeScript check for backend.
- `cd backend && npm test`: backend unit and integration tests with isolated SQLite.
- `cd backend && npm run seed`: seed development data.
- `cd frontend && npm run dev`: start Vite on port 5173 with API/upload proxying.
- `cd frontend && npm run build`: typecheck and produce the Vite production build.
- `cd frontend && npm test`: frontend mapper and store tests.

## Coding Style & Naming Conventions

Use TypeScript ES modules and the existing style: two-space indentation, single quotes, no semicolons. Prefer existing mappers, store actions, and route patterns before adding abstractions. Prisma models use camelCase fields mapped to snake_case DB names with `@map`/`@@map`; store UTC and format dates at API/UI edges for `Asia/Jakarta`.

## Testing Guidelines

Use Vitest for both packages. Name tests `*.test.ts` or `*.test.tsx`. Backend integration tests should use `app.inject` and the test SQLite database, not `dev.db`. Frontend store tests should mock API modules. Run affected tests plus typecheck before submitting changes.

## Commit & Pull Request Guidelines

Git history is not available in this checkout, so use clear imperative commit subjects such as `Add preorder cancellation tests` or `Fix menu upload validation`. Pull requests should describe the change, list verification commands, link issues, and include screenshots for CMS UI changes. Call out schema, seed, environment, or Docker changes.

## Security & Configuration Tips

Copy `backend/.env.example` to `backend/.env` for local development. Set real `BOT_TOKEN` and `JWT_SECRET` outside source control. Never commit generated uploads, local SQLite DBs, or secrets.
