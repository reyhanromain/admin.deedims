import { describe, expect, it } from 'vitest'
import {
  fmtDateTime,
  fmtFulfillmentWeek,
  mapBotMessage,
  mapBotMessageCustomer,
  mapCustomerRow,
  mapDashboard,
  mapMenu,
  mapOrderDetail,
  mapOrderRow,
  mapPreorderRow,
  mapSetting,
  mapStock,
  mapSubscriber,
  mapUser,
  menuToApi,
} from '../api'
import type { MenuDraft } from '../types'

describe('fmtDateTime', () => {
  it('UTC → Asia/Jakarta (+7)', () => {
    expect(fmtDateTime('2026-06-12T02:13:00Z')).toBe('12 Jun, 09:13')
  })
  it('null → dash', () => {
    expect(fmtDateTime(null)).toBe('—')
  })
})

describe('fmtFulfillmentWeek', () => {
  it('memformat pekan kerja dalam bahasa Indonesia', () => {
    expect(fmtFulfillmentWeek('2026-06-21T17:00:00Z', '2026-06-25T17:00:00Z')).toBe('22–26 Juni 2026')
    expect(fmtFulfillmentWeek('2026-06-28T17:00:00Z', '2026-07-02T17:00:00Z')).toBe('29 Juni–3 Juli 2026')
  })
})

describe('mapStock / mapMenu', () => {
  it('stock default unit pcs', () => {
    expect(mapStock({ id: 1, label: 's1', name: 'S', quantity: 5, unit: null })).toEqual({ id: 1, label: 's1', name: 'S', quantity: 5, unit: 'pcs' })
  })
  it('menu: isActive→active, imageUrl→image, variant {stockId,qty}, addons', () => {
    const m = mapMenu({ id: 1, name: 'A', description: null, basePrice: 10000, unitLabel: 'pack', isActive: false, isAddon: false, imageUrl: '/uploads/a.png', variants: [{ name: 'Reg', price: 10000, imageUrl: '/uploads/v.png', stockId: 2, qty: 3 }], addons: [4], freeAddons: [4] })
    expect(m).toMatchObject({ active: false, unitLabel: 'pack', image: '/uploads/a.png', addons: [4], freeAddons: [4] })
    expect(m.variants[0]).toEqual({ name: 'Reg', price: 10000, image: '/uploads/v.png', stockId: 2, qty: 3 })
  })
})

describe('mapOrderRow / mapOrderDetail', () => {
  it('row: createdAt diformat, field passthrough', () => {
    const r = mapOrderRow({ id: 1, code: 'DD-1', customer: 'Sari', username: 'sari', createdAt: '2026-06-12T02:13:00Z', itemsSummary: 'Menu A x1', total: 64000, status: 'confirmed', pay: 'pending', cancelRequested: true })
    expect(r).toMatchObject({ code: 'DD-1', createdAt: '12 Jun, 09:13', itemsSummary: 'Menu A x1', total: 64000, status: 'confirmed', cancelRequested: true })
  })
  it('detail: item snapshot → {name,meta,addon}, preOrder → pekan fulfillment', () => {
    const d = mapOrderDetail({
      id: 1, code: 'DD-1', customer: 'Sari', username: 'sari', createdAt: '2026-06-12T02:13:00Z', updatedAt: '2026-06-12T03:00:00Z',
      status: 'confirmed', pay: 'pending', adminNotes: null, cancelRequested: false, total: 64000,
      items: [
        { menuNameSnapshot: 'Menu A', variantNameSnapshot: 'Mentai', unitPrice: 32000, quantity: 2 },
        { menuNameSnapshot: 'Saus', variantNameSnapshot: 'Add-on', unitPrice: 5000, quantity: 1 },
      ],
      preOrder: { title: 'PO Open', fulfillmentStartDate: '2026-06-21T17:00:00Z', fulfillmentEndDate: '2026-06-25T17:00:00Z' },
    })
    expect(d.items[0]).toEqual({ name: 'Menu A', meta: 'Varian: Mentai', qty: 2, price: 32000, addon: false })
    expect(d.items[1]).toEqual({ name: 'Saus', meta: '', qty: 1, price: 5000, addon: true })
    expect(d).toMatchObject({ poTitle: 'PO Open', poFulfillmentWeek: '22–26 Juni 2026', adminNotes: '' })
  })
})

describe('mapPreorderRow / mapCustomerRow / mapSubscriber / mapSetting / mapUser', () => {
  it('preorder row: fulfillment week + stats', () => {
    expect(mapPreorderRow({ id: 2, title: 'PO', description: null, status: 'open', fulfillmentStartDate: '2026-06-21T17:00:00Z', fulfillmentEndDate: '2026-06-25T17:00:00Z', fulfillmentNote: null, orderCount: 3, revenue: 90000 }))
      .toMatchObject({ status: 'open', fulfillmentWeek: '22–26 Juni 2026', note: '—', orderCount: 3, revenue: 90000 })
  })
  it('customer row: stats + joined + lastOrder', () => {
    expect(mapCustomerRow({ id: 1, username: 'sari', name: 'Sari', blocked: true, joinedAt: '2026-05-02T03:00:00Z', orderCount: 2, totalSpent: 50000, lastOrderAt: '2026-06-12T02:13:00Z', reminderActive: true }))
      .toEqual({ id: 1, username: 'sari', name: 'Sari', blocked: true, joined: '02 May 2026', orderCount: 2, totalSpent: 50000, lastOrder: '12 Jun, 09:13', reminderActive: true })
  })
  it('subscriber: telegramUsername→username, isActive→active', () => {
    expect(mapSubscriber({ telegramUsername: 'sari', isActive: true, createdAt: '2026-05-02T03:00:00Z' })).toMatchObject({ username: 'sari', active: true, since: '02 May 2026' })
  })
  it('bot message: nullable DTO fields become display-safe strings', () => {
    expect(mapBotMessage({ id: 1, direction: 'incoming', messageType: null, text: null, telegramUsername: null, customerName: 'Sari', isCommand: false, command: null, customerId: 1, receivedAtLabel: '12 Jun 2026, 09:13', telegramUserId: null, telegramChatId: '9001' }))
      .toEqual({ id: 1, direction: 'incoming', messageType: 'text', text: '', telegramUsername: '', customerName: 'Sari', isCommand: false, command: '', customerId: 1, receivedAt: '12 Jun 2026, 09:13', telegramUserId: null, telegramChatId: '9001' })
  })
  it('bot message customer: maps compact filter row', () => {
    expect(mapBotMessageCustomer({ id: 1, username: 'sari', name: 'Sari', messageCount: 3 }))
      .toEqual({ id: 1, username: 'sari', name: 'Sari', messageCount: 3 })
  })
  it('setting: inputType textarea→true', () => {
    expect(mapSetting({ id: 1, label: 'k', value: 'v', description: 'd', inputType: 'textarea' })).toEqual({ id: 1, label: 'k', desc: 'd', value: 'v', textarea: true })
  })
  it('user: fullName→name, isSuper→super', () => {
    expect(mapUser({ id: 2, username: 'staff', fullName: 'Staff', isSuper: false })).toEqual({ id: 2, username: 'staff', name: 'Staff', password: '', super: false })
  })
})

describe('mapDashboard', () => {
  it('kpis + openPreorder date + recent + lowStock', () => {
    const d = mapDashboard({
      kpis: { newOrders: 0, batchOrders: 1, batchRevenue: 10000, cancelRequests: 1 },
      openPreorder: { id: 1, title: 'PO Open', fulfillmentStartDate: '2026-06-21T17:00:00Z', fulfillmentEndDate: '2026-06-25T17:00:00Z', fulfillmentNote: 'n' },
      recentOrders: [{ id: 1, code: 'DD-1', customer: 'Sari', itemsSummary: 'Menu A x1', total: 10000, status: 'submitted' }],
      lowStock: [{ id: 2, name: 'Stock 2', quantity: 5, unit: 'pcs' }],
    })
    expect(d.kpis.batchRevenue).toBe(10000)
    expect(d.openPreorder).toMatchObject({ title: 'PO Open', fulfillmentWeek: '22–26 Juni 2026', note: 'n' })
    expect(d.recentOrders[0]).toMatchObject({ code: 'DD-1', itemsSummary: 'Menu A x1' })
    expect(d.lowStock[0]).toMatchObject({ name: 'Stock 2', quantity: 5 })
  })
})

describe('menuToApi', () => {
  const draft: MenuDraft = { name: 'X', description: 'desc', basePrice: '12000', unitLabel: 'pack', active: false, isAddon: false, image: '/uploads/x.png', variants: [{ name: 'Reg', price: 12000, stockId: 1, qty: 2, image: '/uploads/v.png' }], addons: [3, 4], freeAddons: [4] }
  it('active→isActive, image→imageUrl, basePrice parse', () => {
    expect(menuToApi(draft)).toMatchObject({ name: 'X', basePrice: 12000, unitLabel: 'pack', isActive: false, imageUrl: '/uploads/x.png', variants: [{ name: 'Reg', price: 12000, stockId: 1, qty: 2, imageUrl: '/uploads/v.png' }], addons: [3, 4], freeAddons: [4] })
  })
  it('menu add-on → addons dikosongkan', () => {
    expect(menuToApi({ ...draft, isAddon: true })).toMatchObject({ addons: [], freeAddons: [] })
  })
})
