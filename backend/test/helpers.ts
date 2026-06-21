import type { FastifyInstance } from 'fastify'
import bcrypt from 'bcryptjs'
import { buildServer } from '../src/server'
import { prisma } from '../src/db'

export { prisma }

export async function makeApp(): Promise<FastifyInstance> {
  const app = await buildServer()
  await app.ready()
  return app
}

/** Kosongkan semua tabel (urutan anak → induk) lalu isi fixture. */
export async function resetDb() {
  await prisma.botMessage.deleteMany()
  await prisma.cartItem.deleteMany()
  await prisma.preOrderReminderLog.deleteMany()
  await prisma.orderItemStockUsage.deleteMany()
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
  await seedFixtures()
}

/** Dataset kecil yang dipakai semua test. Password semua = "secret". */
export async function seedFixtures() {
  const hash = await bcrypt.hash('secret', 4)
  await prisma.user.create({ data: { username: 'admin', fullName: 'Admin', password: hash, isSuper: true } })
  await prisma.user.create({ data: { username: 'staff', fullName: 'Staff', password: hash, isSuper: false } })

  await prisma.stockItem.createMany({
    data: [
      { id: 1, label: 's1', name: 'Stock 1', quantity: 50 },
      { id: 2, label: 's2', name: 'Stock 2', quantity: 5 },
    ],
  })

  // Menu A (utama, 1 variant) + Addon B; A punya add-on B.
  await prisma.menu.create({
    data: {
      id: 1, name: 'Menu A', basePrice: 10000,
      variants: { create: [{ name: 'Reg', price: 10000, stockUsages: { create: [{ stockItemId: 1, quantity: 2 }] } }] },
    },
  })
  await prisma.menu.create({
    data: {
      id: 2, name: 'Addon B', basePrice: 5000, isAddon: true,
      variants: { create: [{ name: '(default)', price: 5000, stockUsages: { create: [{ stockItemId: 2, quantity: 1 }] } }] },
    },
  })
  await prisma.menuAddon.create({ data: { menuId: 1, addonMenuId: 2 } })

  await prisma.customer.create({ data: { id: 1, telegramUserId: 111n, username: 'sari', name: 'Sari' } })

  // PO 1 open, PO 2 draft (untuk uji aturan single-open).
  await prisma.preOrder.create({ data: { id: 1, title: 'PO Open', status: 'open', openedAt: new Date(), fulfillmentStartDate: new Date('2026-06-21T17:00:00Z'), fulfillmentEndDate: new Date('2026-06-25T17:00:00Z') } })
  await prisma.preOrder.create({ data: { id: 2, title: 'PO Draft', status: 'draft' } })

  // Order 1 dengan permintaan pembatalan pending.
  await prisma.order.create({
    data: {
      id: 1, orderCode: 'DD-1', preOrderId: 1, customerName: 'Sari', telegramUserId: 111n, telegramUsername: 'sari',
      orderStatus: 'confirmed', paymentStatus: 'pending', subtotalAmount: 10000, totalAmount: 10000, cancelRequested: true,
      items: { create: [{ menuNameSnapshot: 'Menu A', variantNameSnapshot: 'Reg', unitPrice: 10000, quantity: 1, lineTotal: 10000 }] },
    },
  })
  await prisma.orderCancellationRequest.create({ data: { orderId: 1, reason: 'test', status: 'pending' } })

  await prisma.reminderSubscriber.create({ data: { telegramUserId: 111n, telegramUsername: 'sari', isActive: true } })
  await prisma.setting.create({ data: { label: 'k', value: 'v', sortOrder: 1 } })
}

export async function tokenFor(app: FastifyInstance, username = 'admin'): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { username, password: 'secret' },
  })
  return JSON.parse(res.body).data.token as string
}

export const authH = (token: string) => ({ authorization: `Bearer ${token}` })

// ── Envelope helpers ─────────────────────────────────────
/* eslint-disable @typescript-eslint/no-explicit-any */
export const body = (res: { body: string }): any => JSON.parse(res.body)
export const data = (res: { body: string }): any => JSON.parse(res.body).data
export const meta = (res: { body: string }): any => JSON.parse(res.body).meta
export const errOf = (res: { body: string }): any => JSON.parse(res.body).error
