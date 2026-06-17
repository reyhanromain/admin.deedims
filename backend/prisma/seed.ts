import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

/** Parse waktu Jakarta (+07:00) → Date (disimpan UTC oleh Prisma). */
const d = (iso: string) => new Date(iso)

async function main() {
  // Bersihkan (urutan anak → induk; relationMode prisma jadi tak ada FK cascade).
  await prisma.botMessage.deleteMany()
  await prisma.orderItem.deleteMany()
  await prisma.orderCancellationRequest.deleteMany()
  await prisma.order.deleteMany()
  await prisma.menuAddon.deleteMany()
  await prisma.menuVariantStockUsage.deleteMany()
  await prisma.menuVariant.deleteMany()
  await prisma.menu.deleteMany()
  await prisma.stockItem.deleteMany()
  await prisma.preOrder.deleteMany()
  await prisma.reminderSubscriber.deleteMany()
  await prisma.setting.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.user.deleteMany()

  // ── Stock ────────────────────────────────────────────────
  await prisma.stockItem.createMany({
    data: [
      { id: 1, label: 'dimsum-ayam', name: 'Dimsum Ayam', quantity: 120, unit: 'pcs' },
      { id: 2, label: 'dimsum-mentai', name: 'Dimsum Mentai', quantity: 8, unit: 'pcs' },
      { id: 3, label: 'frozen-pack-20', name: 'Frozen Pack Isi 20', quantity: 15, unit: 'pack' },
      { id: 4, label: 'saus-sambal', name: 'Saus Sambal Sachet', quantity: 40, unit: 'sachet' },
      { id: 5, label: 'chili-oil', name: 'Chili Oil', quantity: 6, unit: 'jar' },
    ],
  })

  // ── Menus + variants + stock usage ──────────────────────
  type V = { name: string; price: number; stockId: number; qty: number }
  const menus: Array<{
    id: number; name: string; description: string; basePrice: number; isActive: boolean; isAddon: boolean; variants: V[]
  }> = [
    { id: 1, name: 'Dimsum Mix Isi 6', description: 'Mix siomay ayam & udang, siap makan', basePrice: 25000, isActive: true, isAddon: false,
      variants: [{ name: 'Original', price: 25000, stockId: 1, qty: 6 }, { name: 'Mentai', price: 32000, stockId: 2, qty: 6 }] },
    { id: 2, name: 'Dimsum Mentai Isi 4', description: 'Dimsum mentai lumer, torch langsung', basePrice: 28000, isActive: true, isAddon: false,
      variants: [{ name: '(default)', price: 28000, stockId: 2, qty: 4 }] },
    { id: 3, name: 'Frozen Pack Isi 20', description: 'Dimsum frozen, tinggal kukus di rumah', basePrice: 85000, isActive: true, isAddon: false,
      variants: [{ name: '(default)', price: 85000, stockId: 3, qty: 1 }] },
    { id: 4, name: 'Saus Sambal Extra', description: 'Sachet saus sambal khas Deedims', basePrice: 5000, isActive: true, isAddon: true,
      variants: [{ name: '(default)', price: 5000, stockId: 4, qty: 1 }] },
    { id: 5, name: 'Chili Oil Homemade', description: 'Chili oil buatan sendiri, pedas gurih', basePrice: 12000, isActive: false, isAddon: true,
      variants: [{ name: '(default)', price: 12000, stockId: 5, qty: 1 }] },
  ]

  for (const m of menus) {
    await prisma.menu.create({
      data: {
        id: m.id, name: m.name, description: m.description, basePrice: m.basePrice, isActive: m.isActive, isAddon: m.isAddon,
        variants: { create: m.variants.map((v) => ({
          name: v.name, price: v.price,
          stockUsages: { create: [{ stockItemId: v.stockId, quantity: v.qty }] },
        })) },
      },
    })
  }

  // Add-on links: menu 1 → [4,5], menu 2 → [5]
  await prisma.menuAddon.createMany({
    data: [
      { menuId: 1, addonMenuId: 4 },
      { menuId: 1, addonMenuId: 5 },
      { menuId: 2, addonMenuId: 5 },
    ],
  })

  // ── Users (password di-hash) ─────────────────────────────
  const users = [
    { username: 'admin', fullName: 'Dee Rahma', password: 'deedims123', isSuper: true },
    { username: 'rahmi', fullName: 'Rahmi Putri', password: 'rahmi2026', isSuper: false },
    { username: 'galih', fullName: 'Galih Pratama', password: 'galih2026', isSuper: false },
    { username: 'wulan', fullName: 'Wulan Sari', password: 'wulan2026', isSuper: false },
  ]
  for (const u of users) {
    await prisma.user.create({
      data: { username: u.username, fullName: u.fullName, password: await bcrypt.hash(u.password, 10), isSuper: u.isSuper },
    })
  }

  // ── Customers ────────────────────────────────────────────
  const customers = [
    { tg: 900000001n, username: 'sarikue', name: 'Sari Wulandari', joined: '2026-05-02T10:00:00+07:00', blocked: false },
    { tg: 900000002n, username: 'budisan', name: 'Budi Santoso', joined: '2026-05-05T10:00:00+07:00', blocked: false },
    { tg: 900000003n, username: 'rinamhrn', name: 'Rina Maharani', joined: '2026-05-11T10:00:00+07:00', blocked: false },
    { tg: 900000004n, username: 'andipra', name: 'Andi Pratama', joined: '2026-05-15T10:00:00+07:00', blocked: false },
    { tg: 900000005n, username: 'tonowj', name: 'Tono Wijaya', joined: '2026-05-18T10:00:00+07:00', blocked: false },
    { tg: 900000006n, username: 'dewiangg', name: 'Dewi Anggraini', joined: '2026-05-20T10:00:00+07:00', blocked: false },
    { tg: 900000007n, username: 'mayalstr', name: 'Maya Lestari', joined: '2026-06-01T10:00:00+07:00', blocked: false },
    { tg: 900000008n, username: 'linaksm', name: 'Lina Kusuma', joined: '2026-06-08T10:00:00+07:00', blocked: true },
  ]
  for (const c of customers) {
    await prisma.customer.create({
      data: {
        telegramUserId: c.tg, username: c.username, name: c.name, joinedAt: d(c.joined),
        blocked: c.blocked, blockedAt: c.blocked ? d('2026-06-10T09:00:00+07:00') : null,
      },
    })
  }

  // ── Subscribers ──────────────────────────────────────────
  const subs = [
    { tg: 900000001n, username: 'sarikue', since: '2026-05-02T10:00:00+07:00', active: true },
    { tg: 900000002n, username: 'budisan', since: '2026-05-05T10:00:00+07:00', active: true },
    { tg: 900000003n, username: 'rinamhrn', since: '2026-05-11T10:00:00+07:00', active: true },
    { tg: 900000005n, username: 'tonowj', since: '2026-05-18T10:00:00+07:00', active: true },
    { tg: 900000006n, username: 'dewiangg', since: '2026-05-20T10:00:00+07:00', active: false },
    { tg: 900000007n, username: 'mayalstr', since: '2026-06-01T10:00:00+07:00', active: true },
  ]
  for (const s of subs) {
    await prisma.reminderSubscriber.create({
      data: {
        telegramUserId: s.tg, telegramUsername: s.username, isActive: s.active, createdAt: d(s.since),
        unsubscribedAt: s.active ? null : d('2026-06-05T10:00:00+07:00'),
      },
    })
  }

  // ── Settings ─────────────────────────────────────────────
  await prisma.setting.createMany({
    data: [
      { label: 'start_quick_intro', description: 'Pesan pembuka saat customer kirim /start', value: 'Halo kak 👋\nSelamat datang di Deedims, tempat pesan dimsum siap makan dan frozen langsung lewat bot ini.', inputType: 'textarea', sortOrder: 1 },
      { label: 'order_menu_page_size', description: 'Jumlah menu per halaman di /order', value: '8', inputType: 'text', sortOrder: 2 },
      { label: 'cart_edit_page_size', description: 'Jumlah item per halaman saat edit cart', value: '8', inputType: 'text', sortOrder: 3 },
      { label: 'my_orders_page_size', description: 'Jumlah order per halaman di /my_orders', value: '5', inputType: 'text', sortOrder: 4 },
    ],
  })

  // ── Pre-orders ───────────────────────────────────────────
  await prisma.preOrder.createMany({
    data: [
      { id: 1, title: 'PO Mei Minggu 4', description: 'Batch penutup Mei.', status: 'completed', fulfillmentDate: d('2026-05-30T12:00:00+07:00'), fulfillmentNote: 'COD area Tebet' },
      { id: 2, title: 'PO Juni Minggu 2', description: 'Dimsum siap makan & frozen. Checkout via bot, bayar COD.', status: 'open', openedAt: d('2026-06-10T08:00:00+07:00'), fulfillmentDate: d('2026-06-14T12:00:00+07:00'), fulfillmentNote: 'Pickup di rumah / COD area Tebet' },
      { id: 3, title: 'PO Juni Minggu 4', description: 'Batch akhir bulan, menu mentai kembali tersedia.', status: 'draft', fulfillmentDate: d('2026-06-28T12:00:00+07:00'), fulfillmentNote: 'Catatan menyusul' },
    ],
  })

  // ── Orders + items ───────────────────────────────────────
  const tgByUsername = new Map(customers.map((c) => [c.username, c.tg]))
  type Item = { name: string; variant: string | null; qty: number; price: number; addon: boolean }
  const orders: Array<{
    id: number; code: string; poId: number; customer: string; username: string;
    status: string; pay: string; total: number; created: string; updated: string;
    adminNotes: string; cancelRequested: boolean; items: Item[]
  }> = [
    { id: 1, code: 'DD-0612-001', poId: 2, customer: 'Sari Wulandari', username: 'sarikue', status: 'submitted', pay: 'pending', total: 60000, created: '2026-06-12T09:14:00+07:00', updated: '2026-06-12T09:14:00+07:00', adminNotes: '', cancelRequested: false,
      items: [{ name: 'Dimsum Mix Isi 6', variant: 'Original', qty: 2, price: 25000, addon: false }, { name: 'Saus Sambal Extra', variant: null, qty: 2, price: 5000, addon: true }] },
    { id: 2, code: 'DD-0612-002', poId: 2, customer: 'Budi Santoso', username: 'budisan', status: 'submitted', pay: 'pending', total: 85000, created: '2026-06-12T08:02:00+07:00', updated: '2026-06-12T08:02:00+07:00', adminNotes: '', cancelRequested: false,
      items: [{ name: 'Frozen Pack Isi 20', variant: null, qty: 1, price: 85000, addon: false }] },
    { id: 3, code: 'DD-0611-003', poId: 2, customer: 'Rina Maharani', username: 'rinamhrn', status: 'confirmed', pay: 'pending', total: 64000, created: '2026-06-11T19:40:00+07:00', updated: '2026-06-12T07:15:00+07:00', adminNotes: '', cancelRequested: true,
      items: [{ name: 'Dimsum Mix Isi 6', variant: 'Mentai', qty: 2, price: 32000, addon: false }] },
    { id: 4, code: 'DD-0611-004', poId: 2, customer: 'Andi Pratama', username: 'andipra', status: 'confirmed', pay: 'pending', total: 28000, created: '2026-06-11T15:22:00+07:00', updated: '2026-06-11T16:05:00+07:00', adminNotes: 'Minta dikirim sore', cancelRequested: false,
      items: [{ name: 'Dimsum Mentai Isi 4', variant: null, qty: 1, price: 28000, addon: false }] },
    { id: 5, code: 'DD-0610-005', poId: 2, customer: 'Maya Lestari', username: 'mayalstr', status: 'ready', pay: 'pending', total: 122000, created: '2026-06-10T20:11:00+07:00', updated: '2026-06-11T10:30:00+07:00', adminNotes: '', cancelRequested: false,
      items: [{ name: 'Frozen Pack Isi 20', variant: null, qty: 1, price: 85000, addon: false }, { name: 'Dimsum Mix Isi 6', variant: 'Original', qty: 1, price: 25000, addon: false }, { name: 'Chili Oil Homemade', variant: null, qty: 1, price: 12000, addon: true }] },
    { id: 6, code: 'DD-0610-006', poId: 2, customer: 'Tono Wijaya', username: 'tonowj', status: 'completed', pay: 'paid', total: 50000, created: '2026-06-10T09:45:00+07:00', updated: '2026-06-11T14:00:00+07:00', adminNotes: '', cancelRequested: false,
      items: [{ name: 'Dimsum Mix Isi 6', variant: 'Original', qty: 2, price: 25000, addon: false }] },
    { id: 7, code: 'DD-0610-007', poId: 2, customer: 'Lina Kusuma', username: 'linaksm', status: 'cancelled', pay: 'cancelled', total: 25000, created: '2026-06-10T08:30:00+07:00', updated: '2026-06-10T09:00:00+07:00', adminNotes: 'Dibatalkan customer sebelum konfirmasi', cancelRequested: false,
      items: [{ name: 'Dimsum Mix Isi 6', variant: 'Original', qty: 1, price: 25000, addon: false }] },
    { id: 8, code: 'DD-0529-014', poId: 1, customer: 'Dewi Anggraini', username: 'dewiangg', status: 'completed', pay: 'paid', total: 75000, created: '2026-05-29T11:20:00+07:00', updated: '2026-05-30T17:00:00+07:00', adminNotes: '', cancelRequested: false,
      items: [{ name: 'Dimsum Mix Isi 6', variant: 'Original', qty: 3, price: 25000, addon: false }] },
  ]

  for (const o of orders) {
    await prisma.order.create({
      data: {
        id: o.id, orderCode: o.code, preOrderId: o.poId,
        telegramUserId: tgByUsername.get(o.username) ?? null, telegramUsername: o.username, customerName: o.customer,
        paymentMethod: 'cod', paymentStatus: o.pay, orderStatus: o.status,
        subtotalAmount: o.total, totalAmount: o.total, adminNotes: o.adminNotes || null, cancelRequested: o.cancelRequested,
        submittedAt: d(o.created), createdAt: d(o.created), updatedAt: d(o.updated),
        items: { create: o.items.map((it, i) => ({
          menuNameSnapshot: it.name,
          variantNameSnapshot: it.addon ? 'Add-on' : it.variant,
          unitPrice: it.price, quantity: it.qty, lineTotal: it.price * it.qty, sortOrder: i,
        })) },
      },
    })
  }

  // Cancel request untuk order #3 (cancelRequested = true)
  await prisma.orderCancellationRequest.create({
    data: { orderId: 3, reason: 'Berubah pikiran, mau ganti varian', status: 'pending', requestedAt: d('2026-06-12T07:15:00+07:00') },
  })

  // ── Contoh bot_messages ──────────────────────────────────
  const sari = await prisma.customer.findUnique({ where: { telegramUserId: 900000001n } })
  await prisma.botMessage.createMany({
    data: [
      { telegramChatId: 900000001n, telegramUserId: 900000001n, direction: 'incoming', messageType: 'command', text: '/start', telegramUsername: 'sarikue', customerName: 'Sari Wulandari', isCommand: true, command: '/start', customerId: sari?.id ?? null, telegramDate: d('2026-06-12T09:10:00+07:00'), receivedAt: d('2026-06-12T09:10:00+07:00') },
      { telegramChatId: 900000001n, telegramUserId: null, direction: 'outgoing', messageType: 'text', text: 'Halo kak 👋 Selamat datang di Deedims!', isCommand: false, customerId: sari?.id ?? null, telegramDate: d('2026-06-12T09:10:05+07:00'), receivedAt: d('2026-06-12T09:10:05+07:00') },
      { telegramChatId: 900000001n, telegramUserId: 900000001n, direction: 'incoming', messageType: 'text', text: 'Kak mau pesan dimsum mix 2 ya', telegramUsername: 'sarikue', customerName: 'Sari Wulandari', isCommand: false, customerId: sari?.id ?? null, telegramDate: d('2026-06-12T09:13:00+07:00'), receivedAt: d('2026-06-12T09:13:00+07:00') },
    ],
  })

  console.log('Seed selesai ✅')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
