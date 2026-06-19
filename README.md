# Deedims

Monorepo untuk **Deedims** — pre-order dimsum lewat bot Telegram + admin CMS.

```
deedims-v1/
  frontend/   React + Vite SPA (admin CMS)
  backend/    grammy (bot) + Fastify (API CMS) + Prisma + SQLite
  docs/        desain database & catatan
  docker-compose.yml
```

Backend adalah **satu proses** yang menjalankan bot Telegram, API CMS, dan cron retensi —
semuanya berbagi satu Prisma Client ke satu file SQLite (satu penulis, aman).

## Arsitektur

```
Browser ──▶ frontend (nginx, :8080) ──/api/──▶ backend (Fastify, :3000)
                                                   ├─ grammY  (bot Telegram)
                                                   ├─ cron    (retensi bot_messages, harian 00:00 WIB)
                                                   └─ Prisma ─▶ SQLite (volume)
```

Timezone: data **disimpan UTC** di DB; tampilan & penjadwalan pakai **Asia/Jakarta**.

## Jalankan dengan Docker (rekomendasi)

```bash
# dari root repo
docker compose up --build
# frontend → http://localhost:8080   (API diproxy di /api)
# backend  → http://localhost:3100   (langsung, untuk debug)

# seed starter catalog + user awal (sekali, setelah container backend jalan)
docker compose exec backend npm run seed
```

Set `BOT_TOKEN` (dan sebaiknya `JWT_SECRET`) lewat environment untuk mengaktifkan bot:

```bash
BOT_TOKEN=123:abc JWT_SECRET=ganti-ini docker compose up --build
```

Command customer yang tersedia:

- `/start` — status pre-order dan ketersediaan menu
- `/remind_preorder` / `/stop_preorder_reminder` — langganan reminder
- `/order` — pilih menu, varian, quantity, dan add-on
- `/carts` — lihat/edit cart dan checkout COD
- `/my_orders` — histori, detail, cancel/request cancel, dan reorder

Pembukaan pre-order dari CMS mengirim reminder idempotent. Perubahan status order dan hasil
review cancellation juga dikirim ke customer ketika bot aktif.

## Jalankan lokal (dev)

```bash
# backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev      # buat DB + migrasi
npm run seed                # starter catalog + user awal
npm run dev                 # API :3100 (+ bot kalau BOT_TOKEN diisi)

# frontend (terminal lain)
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

**Login CMS awal:** `admin` / `deedims123` (super user). Starter seed juga membuat user `dita`
dengan password yang sama kecuali `SEED_USER_PASSWORD` diisi. Override Super Admin saat seed
dengan `SEED_ADMIN_USERNAME`, `SEED_ADMIN_NAME`, dan `SEED_ADMIN_PASSWORD` bila perlu.

Starter seed menyimpan path foto menu di `/uploads`. Jika menjalankan seed di volume/mesin baru,
salin juga file upload terkait agar foto menu tetap tampil.

## Test

```bash
cd backend && npm test    # 89 test: integration (API + bot + SQLite test) + unit
cd frontend && npm test   # 27 test: mappers (pure) + store/lazy-load (api di-mock, jsdom)
```

**Backend** memakai DB SQLite terpisah (`prisma/test.db`, dibuat & dihapus otomatis) dan tidak
menyentuh `dev.db`. Mencakup auth, aturan super-user, alur cancellation order, reset
`telegram_file_id`, aturan single-open PO, validasi upload (415/413/401), purge retensi, dan
helper timezone/password.

## Versi & Git Workflow

Versi produk tunggal disimpan di [`VERSION`](VERSION), disinkronkan dengan `backend/package.json`
dan `frontend/package.json`, lalu dirilis dengan tag Git `vX.Y.Z`. Branch, commit, PR, changelog,
dan release flow lengkap ada di [`docs/versioning-workflow.md`](docs/versioning-workflow.md).

Deployment production (`main`) dan staging (`dev`), termasuk pemisahan volume,
secret, bot Telegram, tunnel, backup, dan prosedur rollout, dijelaskan di
[`docs/deployment-environments.md`](docs/deployment-environments.md).

**Frontend** menguji mapper API↔FE (+ format Asia/Jakarta) dan logika store (login, **lazy-load
per layar**: muat-sekali/dedup/cache/refresh, toggle menu, saveMenu, single-open PO, routing
cancellation patchOrder, guard super-user, optimistic stock) dengan modul API di-mock.

## Catatan

- Database design: [`docs/cms-database-design.md`](docs/cms-database-design.md).
- **Response envelope seragam** `{ data, meta, error }` di semua endpoint (error: `{message,code}` +
  HTTP status). List **dipaginasi** (`?page=&limit=`) dengan `meta.{page,limit,total,totalPages}`
  (orders + `meta.counts`); agregat (KPI dashboard, stats per-PO/customer) dihitung **server-side**.
  Tiap endpoint mengembalikan **DTO ramping** (tanpa data berlebih) — mis. Dashboard menarik
  ringkasan ~1KB, bukan seluruh order.
- Frontend **tersambung ke API** lewat `frontend/src/api.ts` (JWT di localStorage, mapper API↔FE,
  format tanggal Asia/Jakarta, unwrap envelope). Store (`src/store.tsx`) memuat data **lazy per
  layar** (paginated view per list; auth via 1 call `me`), dengan **Pager** di tiap list & tombol
  **Refresh** manual di Header. Dev memakai proxy Vite (`/api` & `/uploads` → `:3100`).
  Endpoint tersedia: auth, users, customers, stock, settings, bot-messages, orders (+ cancellation
  review), menus (+ variants/add-ons), pre-orders (+ aturan single-open), subscribers, dan upload
  foto menu (`POST /api/uploads` → simpan lokal, disajikan di `/uploads/*`, jadi `menus.imageUrl`).
- Password disimpan **hashed** (bcrypt). Ganti `JWT_SECRET` di produksi.
