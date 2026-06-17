# CLAUDE.md

Guidance for working in this repo. Read this before making changes.

## What this is

**Deedims** — pre-order dimsum via a Telegram bot + an admin CMS. Monorepo:

```
frontend/   React 18 + TS + Vite SPA (admin CMS). Pixel-ported from a Claude Design handoff.
backend/    One Node process: grammY (bot) + Fastify (CMS API) + Prisma + SQLite + cron.
docs/        cms-database-design.md — the authoritative DB design + decisions.
docker-compose.yml
```

The backend is **a single process** running the bot, the HTTP API, and the retention cron — all
sharing one Prisma Client against one SQLite file (single writer, no contention).

## Commands

```bash
# backend (cwd: backend/)
npm run dev            # tsx watch — API on :3100 (+ bot if BOT_TOKEN set)
npm run typecheck      # tsc --noEmit
npm test               # vitest run — integration (app.inject + test SQLite) + unit
npm run seed           # reset seed data into dev.db
npx prisma migrate dev # after editing prisma/schema.prisma

# frontend (cwd: frontend/)
npm run dev            # Vite on :5173 (proxies /api + /uploads → :3100)
npm run build          # tsc -b && vite build
npm test               # vitest run — mappers (pure) + store (api mocked, jsdom)

# whole stack
docker compose up --build   # frontend :8080, backend :3100, SQLite on a volume
```

Run the backend before the frontend in dev — the SPA has no data without it.
Login: `admin` / `deedims123` (seeded super user).

## Architecture / conventions

- **Frontend is wired to the API**, not in-memory. `frontend/src/api.ts` holds the fetch client +
  **mappers that translate API shape ↔ FE shape** (e.g. `isActive↔active`, `imageUrl↔image`,
  `orderCode↔code`, order items `menuNameSnapshot/variantNameSnapshot↔name/meta/addon`). All state
  + actions live in `frontend/src/store.tsx`; **components and `types.ts` are the stable contract —
  prefer changing mappers/store over touching screens.**
- **API response envelope** (uniform): every endpoint returns `{ data, meta, error }`. Success →
  `data` = payload, `meta` = `null` or pagination `{page,limit,total,totalPages}` (orders add
  `counts`); error → `{ data:null, error:{ message, code } }` with the matching HTTP status. Backend
  helpers in `backend/src/lib/http.ts` (`ok`, `HttpError`, `pageMeta`); a `setErrorHandler` formats
  all thrown errors. Frontend `api.ts` unwraps `.data` (and `getPaged` returns `rows` + meta).
- **Endpoints are tailored per view** (don't over-fetch). Each returns an explicit slim DTO; lists
  are **paginated** (`?page=&limit=`); aggregates are computed **server-side** via Prisma `groupBy`
  (orders `counts`, per-PO/per-customer stats, the `/api/dashboard` summary). The Dashboard pulls a
  small summary, not the full orders collection. `itemsSummary` strings are built server-side
  (`backend/src/lib/itemsSummary.ts`); list rows omit heavy nested data (full items live in
  `/api/orders/:id`).
- **Data loads lazily per screen** (no eager bootstrap). The store (`store.tsx`) holds per-list
  paginated views in `lists[key]` (`{rows,total,page,limit,totalPages,loaded,loading}`) plus
  `dashboard`, `selectedOrder`, and `customerOrders`. `SCREEN_LISTS[screen]` declares which lists a
  screen needs; a provider effect calls `loadList(...)` (or `loadDashboard()`) on screen change —
  deduped via an in-flight `Set` ref. Parametric refetch via `setListPage(key,page)` /
  `setOrderFilter(status)`; detail via `selectOrder(id)` → `loadOrderDetail`. `App.tsx` shows
  "Memuat…" until `isScreenReady()`. Auth is gated by a single `me` call. Freshness is manual: the
  Header `RefreshButton` calls `refresh()`; every list screen has a `<Pager>`. Mutations update the
  local cached rows in place (no refetch).
- **Auth: stateless JWT** (`@fastify/jwt`), token in `localStorage`. No session table. Passwords are
  **bcrypt-hashed** (the column is named `password` but never store plaintext in prod).
- **Timezone: store UTC, display Asia/Jakarta.** Prisma stores `DateTime` as UTC by default — don't
  add conversion at the DB layer. Convert only at the edges: API/FE formatting (`api.ts` uses
  `Intl` with `timeZone: 'Asia/Jakarta'`; backend uses `src/time.ts`) and cron scheduling.
- **Prisma**: `relationMode = "prisma"` (no FK constraints — relations validated app-side, per PRD).
  DB names are **snake_case** via `@map`/`@@map`; Prisma models are camelCase. Relation fields need
  an `@@index`. The schema in `docs/cms-database-design.md` and `backend/prisma/schema.prisma` must
  stay in sync.
- **BigInt**: Telegram IDs are `BigInt`. `backend/src/config.ts` patches `BigInt.prototype.toJSON`
  so they serialize to strings — required or any endpoint returning customers/orders/subscribers
  throws on `JSON.stringify`.
- **Menu photos: hybrid.** `imageUrl` (local file, source of truth) + `telegramFileId` (cache for
  bot re-send). **Rule: whenever `imageUrl` changes, reset `telegramFileId` to null** (implemented in
  the menu PATCH handler). Uploads go to `POST /api/uploads` → served at `/uploads/*`.
- **Adding an API endpoint**: create `backend/src/api/<resource>.ts` (mirror an existing one;
  `app.addHook('onRequest', app.authenticate)` for protected routes), register it in
  `src/server.ts`, then add the call + mapper in `frontend/src/api.ts` and an action in `store.tsx`.

## Business rules (enforced app-side)

- Exactly **one** pre-order may be `open` at a time (PO open endpoint returns 409 otherwise).
- **Orders list (`/api/orders`) is scoped to the currently open PO** (counts too); if no PO is open
  it's empty. Orders of past pre-orders are viewed via the PO drill-down (`/api/preorders/:id/orders`,
  reached by clicking a PO card on the Pre-orders screen).
- Exactly **one** super user; the super user cannot be deleted; non-super can only edit themselves.
- Order cancellation review: `orders.cancelRequested` is a fast flag; `order_cancellation_requests`
  holds the reason + reviewer. Approve → order cancelled/cancelled; reject → clears the flag.
- `bot_messages` retention: a **daily 00:00 WIB cron** hard-deletes rows older than `RETENTION_DAYS`
  (14). Logic is duration-based (timezone-agnostic); only the schedule is Jakarta-time.

## Gotchas

- **Port 3000 is taken on this machine** (Open WebUI) — backend dev uses **3100**. Compose maps host
  3100→container 3000.
- **Prisma blocks destructive CLI actions for AI agents** (`migrate reset`, `db push --force-reset`).
  Tests use `prisma migrate deploy` against a fresh `prisma/test.db` instead. Don't add `--force-reset`.
- `npm install` here runs under a **script-blocking wrapper** — Prisma's postinstall doesn't run, so
  run `npx prisma generate` manually after installing.
- Smoke tests that end with `pkill` exit with code **144** (128+SIGTERM) — that's the cleanup signal,
  not a failure.
- Tests run **serialized** (`fileParallelism: false`) because they share one SQLite file.

## Status

Backend complete (all CMS endpoints + bot logging + cron + Docker) and covered by 57 Vitest tests.
Frontend wired to the API with **lazy per-screen loading**, paginated lists + manual Refresh, and
tailored slim payloads (response envelope). Covered by 27 Vitest tests (mappers + store); backend by
64. Full stack verified via Docker (build, persistence, uploads, envelope payloads). Not yet done:
richer bot command handlers.
