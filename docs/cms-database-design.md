# Deedims Admin CMS — Database Design

> Status: **Draft untuk review.** Disusun berdasarkan implementasi CMS saat ini
> (`src/types.ts`, `src/seed.ts`, `src/store.tsx`) dengan **Customer PRD** (`deedims-telegram-bot-prd-draft`)
> sebagai referensi. ORM: **Prisma**. Engine: **SQLite** (satu DB bersama dengan bot).

---

## 1. Konteks & keputusan

- **Customer PRD** mendesain DB **sisi customer** (Telegram bot): katalog, pre-order, cart, order,
  reminder, settings. Itu **data operasional bersama**.
- **CMS** adalah **admin layer** di atas data operasional yang sama. CMS membaca & menulis tabel
  operasional itu, plus menambah tabelnya sendiri.

Keputusan yang sudah disepakati (dari review pertama):

| Topik | Keputusan |
|---|---|
| Database | **Satu DB bersama** bot + CMS (SQLite) |
| ORM | **Prisma** |
| Auth | **JWT** (stateless) — **tanpa** tabel sesi |
| Tabel admin | dinamai **`users`** |
| Kolom password | dinamai **`password`** (lihat catatan hashing di §2) |
| Tabel `customers` | **dikelola CMS**, kolom `phone` **dihapus** |
| Cancel request | pakai tabel **`order_cancellation_requests`** |
| Audit log | **belum perlu** sekarang |
| Foto menu | **hybrid**: hosting lokal (`image_url`, sumber kebenaran) + cache `telegram_file_id` (lihat §6) |

Legenda model:

| Tag | Arti |
|---|---|
| `[SHARED]` | Sudah didefinisikan di Customer PRD §6 — CMS memakainya |
| `[EXTEND]` | Tabel bersama yang **ditambah kolom** untuk CMS |
| `[NEW]` | Tabel **baru khusus CMS** |

---

## 2. Prinsip desain

- **Prisma + SQLite**, dengan `relationMode = "prisma"` → Prisma **tidak membuat FOREIGN KEY
  constraint** di DB; relasi divalidasi di level aplikasi. Ini cocok dengan filosofi PRD
  ("tidak mengandalkan foreign key constraint sebagai aturan utama").
- Nama tabel/kolom di DB tetap **snake_case** (sesuai PRD) lewat `@map` / `@@map`, sementara model
  Prisma pakai camelCase agar nyaman dipakai di TypeScript.
- Timestamp: `createdAt @default(now())`, `updatedAt @updatedAt`.
- **Auth JWT:** login memverifikasi `username` + `password`, lalu server menerbitkan **JWT** yang
  disimpan client (mis. httpOnly cookie). Tidak ada tabel sesi — token cukup diverifikasi via secret.
- **Catatan keamanan:** walau kolomnya dinamai `password`, di produksi **isinya wajib hash**
  (bcrypt/argon2), bukan teks asli. Seed prototype memakai teks biasa hanya untuk demo.

---

## 3. Peta hubungan dengan DB bot

```
                     ┌───────────────── DATA OPERASIONAL (shared, PRD) ─────────────────┐
  CMS admin layer    │  stock_items   menus[EXTEND]   menu_variants                     │
        │            │  menu_variant_stock_usages     menu_addons                       │
        │            │  pre_orders   orders[EXTEND]   order_items                        │
        │            │  pre_order_reminder_subscribers   settings[EXTEND]               │
        │            └──────────────────────────────────────────────────────────────-──┘
        ▼
  ┌──────────── KHUSUS CMS [NEW] ────────────┐
  │  users                       (login, super user, JWT)         │
  │  customers                   (profil + status blokir)          │
  │  order_cancellation_requests (review setujui/tolak)            │
  │  bot_messages                (log chat customer ⇄ bot)         │
  └───────────────────────────────────────────────────────────────┘
```

CMS tidak menyentuh `cart_items` & `pre_order_reminder_logs` (murni domain bot).
Catatan: `bot_messages` **ditulis oleh bot**, CMS hanya membaca untuk menampilkan percakapan.

---

## 4. Prisma schema

> File target nanti: `prisma/schema.prisma`. Di bawah ini schema lengkap untuk tabel yang
> **disentuh CMS** (shared + baru). Komentar menandai status tiap model.
>
> Catatan versi: schema ini divalidasi di **Prisma 6** (gaya `url = env("DATABASE_URL")` di dalam
> `datasource`). Di **Prisma 7**, `url` dipindah ke `prisma.config.ts` dan `datasource` cukup berisi
> `provider`. Pilih versi saat setup; isi modelnya sama persis.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider     = "sqlite"
  url          = env("DATABASE_URL")
  relationMode = "prisma" // tanpa FK constraint — relasi divalidasi di app
}

// ============================================================
// [NEW] Khusus CMS
// ============================================================

/// Akun admin yang bisa login ke CMS. Auth via JWT.
model User {
  id        Int      @id @default(autoincrement())
  username  String   @unique           // lowercase, tanpa spasi
  fullName  String   @map("full_name")
  password  String                     // WAJIB hash (bcrypt/argon2) di produksi
  isSuper   Boolean  @default(false) @map("is_super") // maks 1 super user (validasi app)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  blockedCustomers   Customer[]                  @relation("CustomerBlockedBy")
  reviewedCancellations OrderCancellationRequest[] @relation("CancellationReviewer")

  @@map("users")
}

/// Profil customer + status blokir. Dikelola CMS.
model Customer {
  id              Int       @id @default(autoincrement())
  telegramUserId  BigInt?   @unique @map("telegram_user_id") // penghubung ke order/subscriber bot
  username        String?                                    // telegram username (tanpa '@')
  name            String?
  joinedAt        DateTime? @map("joined_at")
  blocked         Boolean   @default(false)
  blockedAt       DateTime? @map("blocked_at")
  blockedById     Int?      @map("blocked_by")
  blockedBy       User?     @relation("CustomerBlockedBy", fields: [blockedById], references: [id])
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  messages        BotMessage[]

  @@index([username])
  @@index([blocked])
  @@index([blockedById])
  @@map("customers")
}

/// Permintaan pembatalan order yang perlu di-review admin.
model OrderCancellationRequest {
  id           Int       @id @default(autoincrement())
  orderId      Int       @map("order_id")
  order        Order     @relation(fields: [orderId], references: [id])
  reason       String?
  status       String    @default("pending") // pending | approved | rejected
  requestedAt  DateTime  @default(now()) @map("requested_at")
  reviewedById Int?      @map("reviewed_by")
  reviewedBy   User?     @relation("CancellationReviewer", fields: [reviewedById], references: [id])
  reviewedAt   DateTime? @map("reviewed_at")

  @@index([orderId])
  @@index([status])
  @@index([reviewedById])
  @@map("order_cancellation_requests")
}

/// Log semua pesan customer ⇄ bot. Ditulis oleh bot, dibaca CMS (lihat percakapan).
/// `direction` membedakan incoming (customer) vs outgoing (bot).
model BotMessage {
  id                Int       @id @default(autoincrement())
  telegramMessageId BigInt?   @map("telegram_message_id") // id pesan dari Telegram (dedup/reply ref)
  telegramChatId    BigInt    @map("telegram_chat_id")    // chat asal (private = user id)
  telegramUserId    BigInt?   @map("telegram_user_id")    // pengirim (null utk sistem)
  direction         String    @default("incoming")        // incoming | outgoing
  messageType       String    @default("text") @map("message_type") // text|command|photo|sticker|location|contact|callback|...
  text              String?                               // teks / caption
  telegramUsername  String?   @map("telegram_username")   // snapshot saat itu
  customerName      String?   @map("customer_name")       // snapshot saat itu
  isCommand         Boolean   @default(false) @map("is_command")
  command           String?                               // mis. "/start", "/menu"
  intent            String?                               // intent/handler/state yg bot pahami
  telegramFileId    String?   @map("telegram_file_id")    // kalau pesan berisi media
  rawPayload        String?   @map("raw_payload")         // JSON update mentah dari Telegram (TEXT)
  customerId        Int?      @map("customer_id")
  customer          Customer? @relation(fields: [customerId], references: [id])
  orderId           Int?      @map("order_id")
  order             Order?    @relation(fields: [orderId], references: [id])
  preOrderId        Int?      @map("pre_order_id")
  preOrder          PreOrder? @relation(fields: [preOrderId], references: [id])
  telegramDate      DateTime? @map("telegram_date")       // waktu dari Telegram
  receivedAt        DateTime  @default(now()) @map("received_at") // waktu server terima

  @@index([telegramUserId])
  @@index([telegramChatId])
  @@index([customerId])
  @@index([orderId])
  @@index([preOrderId])
  @@index([direction])
  @@index([receivedAt])
  @@map("bot_messages")
}

// ============================================================
// [SHARED / EXTEND] Operasional — dipakai bersama bot
// ============================================================

/// [SHARED] Stock global.
model StockItem {
  id        Int      @id @default(autoincrement())
  label     String   @unique
  name      String
  quantity  Int      @default(0)
  unit      String?
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  variantUsages MenuVariantStockUsage[]

  @@index([isActive])
  @@map("stock_items")
}

/// [EXTEND] Menu utama & add-on. CMS menambah imageUrl + telegramFileId + isAddon.
model Menu {
  id             Int      @id @default(autoincrement())
  name           String
  description    String?
  basePrice      Int      @default(0) @map("base_price")
  isActive       Boolean  @default(true) @map("is_active")
  imageUrl       String?  @map("image_url")              // [CMS] sumber kebenaran: path file lokal
  telegramFileId String?  @map("telegram_file_id")       // [CMS] cache file_id utk re-send cepat via bot
  isAddon        Boolean  @default(false) @map("is_addon") // [CMS] menu ini berperan sbg add-on
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  variants     MenuVariant[]
  addonLinks   MenuAddon[]   @relation("MenuToAddon")    // add-on yang dipasang ke menu ini
  asAddonLinks MenuAddon[]   @relation("AddonMenu")      // menu ini dipakai sbg add-on di mana

  @@index([isActive])
  @@map("menus")
}

/// [SHARED] Varian menu (menu tanpa varian tetap punya 1 default tersembunyi).
model MenuVariant {
  id        Int      @id @default(autoincrement())
  menuId    Int      @map("menu_id")
  menu      Menu     @relation(fields: [menuId], references: [id])
  name      String?
  price     Int
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  stockUsages MenuVariantStockUsage[]

  @@index([menuId])
  @@index([isActive])
  @@map("menu_variants")
}

/// [SHARED] Mapping berapa stock dipotong per 1 qty varian.
model MenuVariantStockUsage {
  id            Int         @id @default(autoincrement())
  menuVariantId Int         @map("menu_variant_id")
  variant       MenuVariant @relation(fields: [menuVariantId], references: [id])
  stockItemId   Int         @map("stock_item_id")
  stockItem     StockItem   @relation(fields: [stockItemId], references: [id])
  quantity      Int

  @@index([menuVariantId])
  @@index([stockItemId])
  @@map("menu_variant_stock_usages")
}

/// [SHARED] Menu utama dipasangkan ke menu add-on.
model MenuAddon {
  id          Int      @id @default(autoincrement())
  menuId      Int      @map("menu_id")
  menu        Menu     @relation("MenuToAddon", fields: [menuId], references: [id])
  addonMenuId Int      @map("addon_menu_id")
  addonMenu   Menu     @relation("AddonMenu", fields: [addonMenuId], references: [id])
  isRequired  Boolean  @default(false) @map("is_required")
  maxQuantity Int      @default(1) @map("max_quantity")
  sortOrder   Int      @default(0) @map("sort_order")
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([menuId])
  @@index([addonMenuId])
  @@map("menu_addons")
}

/// [SHARED] Batch pre-order. Hanya 1 boleh status 'open' (validasi app).
model PreOrder {
  id              Int       @id @default(autoincrement())
  title           String?
  description     String?
  status          String    @default("draft") // draft|open|closed|completed|cancelled
  openedAt        DateTime? @map("opened_at")
  closedAt        DateTime? @map("closed_at")
  fulfillmentDate DateTime? @map("fulfillment_date")
  fulfillmentNote String?   @map("fulfillment_note")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")

  orders   Order[]
  messages BotMessage[]

  @@index([status])
  @@map("pre_orders")
}

/// [EXTEND] Header order. CMS menambah cancelRequested + relasi cancellation.
model Order {
  id              Int      @id @default(autoincrement())
  orderCode       String   @unique @map("order_code")
  preOrderId      Int      @map("pre_order_id")
  preOrder        PreOrder @relation(fields: [preOrderId], references: [id])
  telegramUserId  BigInt?  @map("telegram_user_id")
  telegramUsername String? @map("telegram_username")
  customerName    String?  @map("customer_name")
  paymentMethod   String   @default("cod") @map("payment_method")
  paymentStatus   String   @default("pending") @map("payment_status") // pending|paid|cancelled
  orderStatus     String   @default("submitted") @map("order_status")  // submitted|confirmed|ready|completed|cancelled
  subtotalAmount  Int      @default(0) @map("subtotal_amount")
  totalAmount     Int      @default(0) @map("total_amount")
  notes           String?
  adminNotes      String?  @map("admin_notes")
  cancelRequested Boolean  @default(false) @map("cancel_requested") // [CMS] filter cepat badge/KPI
  submittedAt     DateTime? @map("submitted_at")
  confirmedAt     DateTime? @map("confirmed_at")
  cancelledAt     DateTime? @map("cancelled_at")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  items                OrderItem[]
  cancellationRequests OrderCancellationRequest[]
  messages             BotMessage[]

  @@index([preOrderId])
  @@index([telegramUserId])
  @@index([orderStatus])
  @@index([updatedAt])
  @@map("orders")
}

/// [SHARED] Item order final (snapshot agar histori tidak berubah).
model OrderItem {
  id                  Int      @id @default(autoincrement())
  orderId             Int      @map("order_id")
  order               Order    @relation(fields: [orderId], references: [id])
  parentOrderItemId   Int?     @map("parent_order_item_id") // add-on menempel ke main item
  menuId              Int?     @map("menu_id")
  menuVariantId       Int?     @map("menu_variant_id")
  menuNameSnapshot    String   @map("menu_name_snapshot")
  variantNameSnapshot String?  @map("variant_name_snapshot")
  unitPrice           Int      @map("unit_price")
  quantity            Int
  lineTotal           Int      @map("line_total")
  notes               String?
  sortOrder           Int      @default(0) @map("sort_order")
  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  @@index([orderId])
  @@index([parentOrderItemId])
  @@map("order_items")
}

/// [SHARED] Subscriber reminder pre-order.
model ReminderSubscriber {
  id             Int       @id @default(autoincrement())
  telegramUserId BigInt    @unique @map("telegram_user_id")
  telegramUsername String? @map("telegram_username")
  isActive       Boolean   @default(true) @map("is_active")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")
  unsubscribedAt DateTime? @map("unsubscribed_at")

  @@index([isActive])
  @@map("pre_order_reminder_subscribers")
}

/// [EXTEND] Konfigurasi bot. CMS menambah description + inputType + sortOrder.
model Setting {
  id          Int      @id @default(autoincrement())
  label       String   @unique
  value       String?
  description String?                          // [CMS] teks bantuan di layar Settings
  inputType   String   @default("text") @map("input_type") // [CMS] 'text' | 'textarea'
  sortOrder   Int      @default(0) @map("sort_order")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("settings")
}
```

---

## 5. Catatan per area

- **`users`** — `username` unik (lowercase, tanpa spasi). Tepat satu baris `isSuper = true`; baris
  super tidak boleh dihapus; non-super hanya bisa diubah/dihapus oleh super user. Semua aturan ini
  di level aplikasi (sama dengan logic CMS sekarang).
- **`customers`** — `phone` dihapus sesuai revisi. Statistik (jumlah order, total belanja, order
  terakhir, status reminder) **tidak disimpan**, dihitung on-the-fly dari `orders` +
  `pre_order_reminder_subscribers` (sama seperti `statsFor` di CMS).
- **Cancel request** — dua lapis: kolom `orders.cancelRequested` untuk filter cepat (badge merah &
  KPI "Cancel request" di dashboard), dan tabel `order_cancellation_requests` untuk jejak alasan +
  siapa yang me-review (setujui/tolak).
- **`menu_variant_stock_usages`** — UI editor menu CMS sekarang memetakan tiap varian ke **satu**
  stock item; skema mendukung **banyak** (1 varian → beberapa stock). DB lebih fleksibel dari UI —
  aman, tinggal dipakai nanti kalau perlu multi-stock.
- **`bot_messages`** — ditulis bot (incoming + outgoing dibedakan `direction`), dibaca CMS read-only.
  `raw_payload` menyimpan update mentah Telegram sebagai cadangan untuk field yang belum dikolomkan.
  Relasi `customer`/`order`/`preOrder` opsional: diisi saat bot berhasil me-resolve konteks pesan.
  Tabel ini tumbuh cepat — pertimbangkan retention/purge berbasis `received_at` (sudah di-index).

---

## 6. Foto menu: hybrid (hosting lokal + cache Telegram file_id)

**Keputusan: hybrid.** Sumber kebenaran tetap **file lokal** (`menus.imageUrl`), plus **cache
`menus.telegramFileId`** untuk mempercepat pengiriman ulang lewat bot.

- Saat admin upload foto di editor menu, file disimpan di storage lokal (mis. folder `uploads/`
  atau volume) dan DB menyimpan **path/URL relatif** di `menus.imageUrl` (mis. `/uploads/menu/12.jpg`).
  Browser CMS render langsung lewat `<img src>` — alur upload/preview/lightbox tetap lurus.
- Pertama kali bot mengirim foto itu ke customer, Telegram balas `file_id`. Bot menyimpannya ke
  `menus.telegramFileId`. Pengiriman berikutnya cukup `sendPhoto(chat_id, file_id)` → tanpa
  upload ulang, nol bandwidth.

### Aturan hybrid (level aplikasi)

| Kejadian | imageUrl | telegramFileId |
|---|---|---|
| Admin upload foto baru di CMS | ditulis (path lokal) | **di-reset `null`** (foto berubah, cache basi) |
| Bot kirim foto pertama kali | tetap | diisi dari respons Telegram |
| Bot kirim ulang | dibaca kalau perlu fallback | dipakai kalau ada |
| Ganti bot token | tetap (masih valid) | bisa invalid → reset & isi ulang |

Kunci konsistensi: **setiap kali `imageUrl` berubah, kosongkan `telegramFileId`** supaya bot
meng-upload ulang dari file lokal dan mengisi cache baru.

### Opsi Telegram file_id — penjelasan

Setiap kali sebuah foto melewati Telegram (customer/bot mengirim foto), Telegram menyimpannya di
server **mereka** dan mengembalikan string **`file_id`**. Alih-alih menyimpan file gambar sendiri,
Anda bisa menyimpan `file_id` itu saja di DB.

Cara kerjanya:

1. Foto dikirim ke bot (atau bot mengirim foto sekali) → Telegram balas `file_id`.
2. Simpan `file_id` di DB (mis. kolom `menus.telegram_file_id`).
3. Untuk menampilkan ke customer, bot cukup `sendPhoto(chat_id, file_id)` — Telegram yang menyajikan
   gambarnya. **Nol biaya storage/bandwidth** di server Anda.

Kelebihan:

- Tidak perlu hosting/penyimpanan gambar sendiri; hemat storage & bandwidth.
- Pengiriman ulang ke customer sangat cepat (Telegram sudah cache).

Kekurangan (kenapa kurang pas untuk **CMS web**):

- `file_id` **bukan URL publik** — `<img>` di browser tidak bisa langsung memuatnya. Untuk
  menampilkannya di CMS, server harus panggil `getFile` → dapat `file_path` sementara →
  `https://api.telegram.org/file/bot<TOKEN>/<file_path>`, dan URL itu **kedaluwarsa** serta
  membocorkan token bot kalau tidak di-proxy.
- `file_id` terikat ke bot tertentu; kalau ganti bot, id bisa tidak valid.
- Tidak praktis untuk preview/lightbox/upload langsung dari browser (alur utama CMS).

**Kesimpulan:** kita pakai **hybrid**. `imageUrl` (lokal) jadi sumber kebenaran untuk tampilan di
browser CMS — lurus untuk upload/preview/lightbox — sementara `telegramFileId` cache opsional yang
diisi bot setelah kiriman pertama, untuk re-send cepat tanpa upload ulang. CMS hanya bertanggung
jawab menulis `imageUrl` (dan me-reset `telegramFileId` saat foto berganti); pengisian
`telegramFileId` adalah tugas bot. Kolom `telegram_file_id` nullable, jadi aman walau belum pernah
diisi.

---

## 7. Pemetaan layar CMS → model

| Layar CMS | Model |
|---|---|
| Login / profil | `User` `[NEW]` (auth JWT) |
| Dashboard | turunan dari `Order`, `PreOrder`, `StockItem` |
| Pre-orders | `PreOrder` `[SHARED]` |
| Orders (list & detail) | `Order` `[EXTEND]`, `OrderItem` `[SHARED]`, `OrderCancellationRequest` `[NEW]` |
| Customers | `Customer` `[NEW]` + turunan dari `Order`, `ReminderSubscriber` |
| Menus & Add-ons | `Menu` `[EXTEND]`, `MenuVariant`, `MenuVariantStockUsage`, `MenuAddon` `[SHARED]` |
| Stock | `StockItem` `[SHARED]` |
| Subscribers | `ReminderSubscriber` `[SHARED]` |
| Users (admin) | `User` `[NEW]` |
| Settings | `Setting` `[EXTEND]` |
| Chat log / percakapan customer | `BotMessage` `[NEW]` (read-only di CMS) |

---

## 8. Model operasional customer bot

Implementasi customer bot menambahkan tiga model pada schema bersama:

- `CartItem` menyimpan main item dan add-on sementara per `telegramUserId`. Add-on menunjuk main
  item melalui `parentCartItemId`; quantity add-on mengikuti main item.
- `OrderItemStockUsage` menyimpan snapshot stock yang benar-benar dipotong saat checkout. Snapshot
  ini digunakan untuk mengembalikan stock secara tepat ketika order dibatalkan, walaupun mapping
  stock menu sudah berubah.
- `PreOrderReminderLog` menyimpan hasil delivery unik per pasangan pre-order/subscriber agar
  reminder pembukaan pre-order tidak terkirim dua kali dan kegagalan dapat dicoba ulang.

Checkout customer berjalan dalam satu transaksi: validasi ulang cart dan harga terkini, membuat
order beserta snapshot item/stock, mengurangi stock secara kondisional, lalu menghapus cart. Semua
operasi memakai Prisma Client dan SQLite yang sama dengan CMS.
