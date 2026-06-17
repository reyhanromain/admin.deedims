# Deedims Admin CMS

Admin dashboard for the **Deedims** dimsum pre-order Telegram bot — manage pre-order batches,
confirm incoming orders, track customers, edit menus, and adjust stock. Built from the
Claude Design handoff (`Deedims Admin CMS v2`) as a production React + TypeScript app.

The brand is warm & playful (krem hangat + terracotta cabai + hijau bambu), with English labels
and Indonesian content, matching the bot's tone.

## Stack

- **React 18** + **TypeScript** + **Vite**
- No UI framework — design tokens and inline styles ported 1:1 from the design for visual fidelity
- All state lives in a single context store (`src/store.tsx`); data is in-memory seed data

## Run

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # typecheck + production build into dist/
npm run preview   # serve the production build
```

**Login:** `admin` / `deedims123` (the seeded Super User). Other seeded admins each have their own
password — see `src/seed.ts`.

## Features

- **Login / auth** — per-user username + password validation, profile menu with logout
- **Dashboard** — KPIs (new orders, batch revenue, cancel requests), recent orders with quick-confirm, low-stock alerts
- **Pre-orders** — open/close batches with the PRD's single-open rule, create draft batches with a date picker
- **Orders** — status filters, detail view with the `submitted → confirmed → ready → completed` flow,
  cancel-request review (approve/reject), admin notes
- **Customers** — order history per customer, block / unblock
- **Menus & Add-ons** — active toggle, expandable variant/stock/add-on detail, full editor modal
  (image upload, variants mapped to stock items, add-on assignment), preview-only thumbnails with lightbox
- **Stock** — quick ±1 / ±10 adjustments, low-stock badges
- **Subscribers** — reminder subscription overview
- **Users (admin)** — add/edit/delete admins; the Super User is protected (cannot be deleted) and can edit any account
- **Settings** — bot config values
- **Dark mode** + **collapsible sidebar**, persisted in session state

## Structure

```
src/
  main.tsx              entry
  App.tsx               shell: login vs app, routing, modals, toast
  store.tsx             AdminProvider context — state + all actions
  seed.ts               in-memory seed data
  types.ts              domain types
  theme.ts              light/dark tokens, status badges, icons, nav config
  styles.ts             shared style helpers (inputs, cards, tables)
  format.ts             fmt / fmtDate / initials
  ui.tsx                HoverButton, Hoverable, Icon, Pill primitives
  components/           Login, Sidebar, Header, Toast, Lightbox, MenuEditorModal, UserEditorModal
  screens/              Dashboard, Preorders, Orders, Customers, Menus, Stock, Subscribers, Users, Settings
```

## Notes

- The store (`src/store.tsx`) is wired to the backend API via `src/api.ts` (JWT auth, API↔FE mappers,
  Asia/Jakarta date formatting). Data loads **lazily per screen** (`SCREEN_DATA` → `ensureLoaded`,
  cached & shared across screens; auth gated by one `me` call), refreshed via the Header's Refresh button.
- Dev needs the backend running on `:3100`; Vite proxies `/api` and `/uploads` to it (see `vite.config.ts`).
- Uploaded menu photos go to the backend (`POST /api/uploads`) and are served from `/uploads/*`.
