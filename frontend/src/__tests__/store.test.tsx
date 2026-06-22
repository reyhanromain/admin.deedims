import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'

vi.mock('../api', async (orig) => {
  const actual = await orig<typeof import('../api')>()
  const fn = () => vi.fn()
  return {
    ...actual,
    getToken: vi.fn(() => 'tok'),
    setToken: vi.fn(),
    clearToken: vi.fn(),
    uploadImage: vi.fn(async () => '/uploads/x.png'),
    api: {
      login: fn(), me: fn(), dashboard: fn(), order: fn(),
      ordersList: fn(), customersList: fn(), customerOrders: fn(), preorderOrders: fn(), subscribersList: fn(), preordersList: fn(),
      botMessagesList: fn(), botMessageCustomers: fn(), menusList: fn(), stockList: fn(), usersList: fn(), settingsList: fn(),
      adjustStock: fn(), createStock: fn(), updateStock: fn(), createMenu: fn(), updateMenu: fn(), toggleMenu: fn(),
      createPreorder: fn(), openPreorder: fn(), closePreorder: fn(), completePreorder: fn(),
      patchOrder: fn(), approveCancel: fn(), rejectCancel: fn(), blockCustomer: fn(),
      createUser: fn(), updateUser: fn(), deleteUser: fn(), updateSetting: fn(),
    },
  }
})

import * as apiMod from '../api'
import { AdminProvider, useAdmin } from '../store'

const api = apiMod.api as unknown as Record<string, ReturnType<typeof vi.fn>>
const getTokenMock = apiMod.getToken as ReturnType<typeof vi.fn>

const paged = (rows: any[], extra: Record<string, unknown> = {}) => ({ rows, total: rows.length, page: 1, limit: 20, totalPages: 1, ...extra })

const orderRow = { id: 1, code: 'DD-1', customer: 'Sari', username: 'sari', createdAt: '12 Jun, 09:13', itemsSummary: 'Menu A x1', total: 10000, status: 'confirmed', pay: 'pending', cancelRequested: true }
const orderDetail = { id: 1, code: 'DD-1', customer: 'Sari', username: 'sari', createdAt: '12 Jun, 09:13', updatedAt: '12 Jun, 10:00', status: 'confirmed', pay: 'pending', adminNotes: '', cancelRequested: true, total: 10000, items: [{ name: 'Menu A', meta: '', qty: 1, price: 10000, addon: false }], poTitle: 'PO Open', poFulfillmentWeek: '22–26 Juni 2026' }
const menuRow = { id: 1, name: 'Menu A', description: '', basePrice: 10000, unitLabel: '', active: true, isAddon: false, image: '', variants: [{ name: 'Reg', price: 10000, stockId: 1, qty: 2, image: '' }], addons: [2], freeAddons: [] }
const stockRow = { id: 1, label: 's1', name: 'Stock 1', quantity: 50, unit: 'pcs' }
const poOpen = { id: 1, title: 'PO Open', description: '', status: 'open', fulfillmentWeek: '22–26 Juni 2026', note: '', orderCount: 1, revenue: 10000 }
const poDraft = { id: 2, title: 'PO Draft', description: '', status: 'draft', fulfillmentWeek: 'TBD', note: '—', orderCount: 0, revenue: 0 }
const custRow = { id: 1, username: 'sari', name: 'Sari', blocked: false, joined: '02 May 2026', orderCount: 1, totalSpent: 10000, lastOrder: '12 Jun, 09:13', reminderActive: true }
const users = [{ id: 1, username: 'admin', name: 'Dee Rahma', password: '', super: true }, { id: 2, username: 'staff', name: 'Staff', password: '', super: false }]
const dashboard = { kpis: { newOrders: 0, batchOrders: 1, batchRevenue: 10000, cancelRequests: 1 }, openPreorder: { id: 1, title: 'PO Open', fulfillmentWeek: '22–26 Juni 2026', note: 'n' }, recentOrders: [{ id: 1, code: 'DD-1', customer: 'Sari', itemsSummary: 'Menu A x1', total: 10000, status: 'submitted' }], lowStock: [{ id: 2, name: 'Stock 2', quantity: 5, unit: 'pcs' }] }

beforeEach(() => {
  vi.clearAllMocks()
  getTokenMock.mockReturnValue('tok')
  api.me.mockResolvedValue({ id: 1, username: 'admin', fullName: 'Dee Rahma', isSuper: true })
  api.dashboard.mockResolvedValue(dashboard)
  api.order.mockResolvedValue(orderDetail)
  api.ordersList.mockResolvedValue(paged([orderRow], { counts: { all: 1, submitted: 0, confirmed: 1, ready: 0, completed: 0, cancelled: 0 } }))
  api.customersList.mockResolvedValue(paged([custRow]))
  api.customerOrders.mockResolvedValue(paged([{ id: 1, code: 'DD-1', createdAt: '12 Jun, 09:13', itemsSummary: 'Menu A x1', total: 10000, status: 'confirmed' }]))
  api.subscribersList.mockResolvedValue(paged([{ username: 'sari', name: 'sari', since: '02 May 2026', active: true }], { counts: { active: 1, inactive: 0 } }))
  api.botMessagesList.mockResolvedValue(paged([{ id: 1, direction: 'incoming', messageType: 'text', text: 'hai', telegramUsername: 'sari', customerName: 'Sari', isCommand: false, command: '', customerId: 1, receivedAt: '12 Jun 2026, 09:13', telegramUserId: '9001', telegramChatId: '9001' }]))
  api.botMessageCustomers.mockResolvedValue([{ id: 1, username: 'sari', name: 'Sari', messageCount: 1 }])
  api.preordersList.mockResolvedValue(paged([poOpen, poDraft]))
  api.preorderOrders.mockResolvedValue(paged([orderRow]))
  api.menusList.mockResolvedValue(paged([menuRow]))
  api.stockList.mockResolvedValue(paged([stockRow]))
  api.updateStock.mockResolvedValue({ id: 1, label: 'satu', name: 'Stock Satu', quantity: 12, unit: 'pack' })
  api.usersList.mockResolvedValue(paged(users))
  api.settingsList.mockResolvedValue(paged([{ id: 7, label: 'k', desc: 'd', value: 'v', savedValue: 'v', textarea: false, inputType: 'text', category: 'general', placeholders: [] }]))
})

const render = () => renderHook(() => useAdmin(), { wrapper: AdminProvider }).result
async function mountAuthed() {
  const r = render()
  await waitFor(() => expect(r.current.authed).toBe(true))
  return r
}
async function goto(r: ReturnType<typeof render>, screen: any) {
  act(() => r.current.goScreen(screen))
  await waitFor(() => expect(r.current.isScreenReady()).toBe(true))
}

describe('session gate (lazy)', () => {
  it('mount → /me + /dashboard saja (bukan list lain)', async () => {
    const r = await mountAuthed()
    await waitFor(() => expect(r.current.isScreenReady()).toBe(true))
    expect(api.me).toHaveBeenCalledTimes(1)
    expect(api.dashboard).toHaveBeenCalledTimes(1)
    expect(api.ordersList).not.toHaveBeenCalled()
    expect(api.menusList).not.toHaveBeenCalled()
    expect(r.current.dashboard?.kpis.batchRevenue).toBe(10000)
    expect(r.current.currentUser).toMatchObject({ username: 'admin', super: true })
  })
})

describe('lazy per-layar', () => {
  it('buka Orders → ordersList dipanggil, list lain tidak', async () => {
    const r = await mountAuthed()
    await goto(r, 'orders')
    expect(api.ordersList).toHaveBeenCalledTimes(1)
    expect(api.customersList).not.toHaveBeenCalled()
    expect(r.current.lists.orders.rows).toHaveLength(1)
    expect(r.current.orderCounts).toMatchObject({ all: 1, confirmed: 1 })
  })

  it('setOrderFilter memicu refetch dengan status', async () => {
    const r = await mountAuthed()
    await goto(r, 'orders')
    act(() => r.current.setOrderFilter('confirmed'))
    await waitFor(() => expect(api.ordersList).toHaveBeenCalledWith(expect.objectContaining({ status: 'confirmed', page: 1 })))
    expect(r.current.orderFilter).toBe('confirmed')
  })

  it('setListPage memicu refetch halaman', async () => {
    const r = await mountAuthed()
    await goto(r, 'orders')
    act(() => r.current.setListPage('orders', 2))
    await waitFor(() => expect(api.ordersList).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })))
  })

  it('buka Bot Messages → load pesan + customer yang punya chat untuk filter', async () => {
    const r = await mountAuthed()
    await goto(r, 'botMessages')
    expect(api.botMessagesList).toHaveBeenCalledTimes(1)
    expect(api.botMessageCustomers).toHaveBeenCalledTimes(1)
    expect(api.customersList).not.toHaveBeenCalled()
    expect(r.current.lists.botMessages.rows).toHaveLength(1)
    expect(r.current.botMessageCustomers).toEqual([{ id: 1, username: 'sari', name: 'Sari', messageCount: 1 }])
  })

  it('filter Bot Messages memicu refetch server-side', async () => {
    const r = await mountAuthed()
    await goto(r, 'botMessages')
    act(() => r.current.setBotMessageDirection('incoming'))
    await waitFor(() => expect(api.botMessagesList).toHaveBeenCalledWith(expect.objectContaining({ direction: 'incoming', page: 1 })))
    act(() => r.current.setBotMessageCustomerId(1))
    await waitFor(() => expect(api.botMessagesList).toHaveBeenCalledWith(expect.objectContaining({ customerId: 1, page: 1 })))
  })
})

describe('menus', () => {
  it('toggleMenuActive → API + flip active', async () => {
    api.toggleMenu.mockResolvedValue({ id: 1, isActive: false })
    const r = await mountAuthed()
    await goto(r, 'menus')
    act(() => r.current.toggleMenuActive(1))
    await waitFor(() => expect((r.current.lists.menus.rows as any[]).find((m) => m.id === 1).active).toBe(false))
    expect(api.toggleMenu).toHaveBeenCalledWith(1)
  })

  it('saveMenu baru → createMenu body + prepend', async () => {
    api.createMenu.mockResolvedValue({ id: 9, name: 'Baru', description: null, basePrice: 9000, unitLabel: '', isActive: true, isAddon: false, imageUrl: null, variants: [], addons: [], freeAddons: [] })
    const r = await mountAuthed()
    await goto(r, 'menus')
    act(() => r.current.openMenuEditor(null))
    act(() => r.current.updateDraft({ name: 'Baru', basePrice: 9000 }))
    act(() => r.current.saveMenu())
    await waitFor(() => expect(api.createMenu).toHaveBeenCalledWith(expect.objectContaining({ name: 'Baru', basePrice: 9000, isActive: true })))
    await waitFor(() => expect((r.current.lists.menus.rows as any[]).some((m) => m.id === 9)).toBe(true))
  })

  it('toggleFreeAddon bisa berdampingan dengan add-on berbayar', async () => {
    api.updateMenu.mockResolvedValue({ id: 1, name: 'Menu A', description: '', basePrice: 10000, unitLabel: '', isActive: true, isAddon: false, imageUrl: '', variants: [{ name: 'Reg', price: 10000, stockId: 1, qty: 2, imageUrl: '' }], addons: [2], freeAddons: [2] })
    const r = await mountAuthed()
    await goto(r, 'menus')
    act(() => r.current.openMenuEditor(menuRow as any))
    act(() => r.current.toggleFreeAddon(2))
    expect(r.current.menuDraft?.addons).toEqual([2])
    expect(r.current.menuDraft?.freeAddons).toEqual([2])
    act(() => r.current.saveMenu())
    await waitFor(() => expect(api.updateMenu).toHaveBeenCalledWith(1, expect.objectContaining({ addons: [2], freeAddons: [2] })))
  })
})

describe('preorders single-open', () => {
  it('openPreorder ditolak saat ada open (tanpa API)', async () => {
    const r = await mountAuthed()
    await goto(r, 'preorders')
    act(() => r.current.openPreorder(2))
    await waitFor(() => expect(r.current.toast).toContain('hanya boleh satu open'))
    expect(api.openPreorder).not.toHaveBeenCalled()
  })

  it('createPo mewajibkan pekan dan mengirim ISO week', async () => {
    api.createPreorder.mockResolvedValue({ id: 3, title: 'PO Baru', description: null, status: 'draft', fulfillmentStartDate: '2026-06-21T17:00:00Z', fulfillmentEndDate: '2026-06-25T17:00:00Z', fulfillmentNote: null, orderCount: 0, revenue: 0 })
    const r = await mountAuthed()
    await goto(r, 'preorders')
    act(() => r.current.set({ poTitle: 'PO Baru' }))
    act(() => r.current.createPo())
    expect(api.createPreorder).not.toHaveBeenCalled()
    expect(r.current.toast).toContain('Pekan')

    act(() => r.current.set({ poWeek: '2026-W26' }))
    act(() => r.current.createPo())
    await waitFor(() => expect(api.createPreorder).toHaveBeenCalledWith(expect.objectContaining({ title: 'PO Baru', fulfillmentWeek: '2026-W26' })))
  })
})

describe('preorder drill-down', () => {
  it('selectPreorder → muat order PO tsb', async () => {
    const r = await mountAuthed()
    await goto(r, 'preorders')
    act(() => r.current.selectPreorder(2))
    await waitFor(() => expect(api.preorderOrders).toHaveBeenCalledWith(2, expect.objectContaining({ page: 1 })))
    await waitFor(() => expect(r.current.preorderOrders.rows).toHaveLength(1))
  })
})

describe('patchOrder', () => {
  it('approveCancellation → approveCancel + refetch detail', async () => {
    api.approveCancel.mockResolvedValue({ status: 'approved' })
    const r = await mountAuthed()
    await goto(r, 'orders')
    act(() => r.current.selectOrder(1))
    await waitFor(() => expect(r.current.selectedOrder?.id).toBe(1))
    act(() => r.current.approveCancellation(1))
    await waitFor(() => expect(api.approveCancel).toHaveBeenCalledWith(1))
    expect(api.rejectCancel).not.toHaveBeenCalled()
  })

  it('ubah status → PATCH dengan orderStatus', async () => {
    api.patchOrder.mockResolvedValue({ id: 1, status: 'ready', pay: 'pending', adminNotes: '', cancelRequested: true, updatedAt: '2026-06-12T03:00:00Z' })
    const r = await mountAuthed()
    await goto(r, 'orders')
    act(() => r.current.selectOrder(1))
    await waitFor(() => expect(r.current.selectedOrder?.id).toBe(1))
    act(() => r.current.patchOrder(1, { status: 'ready' }))
    await waitFor(() => expect(api.patchOrder).toHaveBeenCalledWith(1, { orderStatus: 'ready' }))
  })
})

describe('users guard', () => {
  it('deleteUser super → ditolak; staff → API id', async () => {
    api.deleteUser.mockResolvedValue({ ok: true })
    const r = await mountAuthed()
    await goto(r, 'users')
    act(() => r.current.deleteUser('admin'))
    await waitFor(() => expect(r.current.toast).toContain('Super User tidak bisa dihapus'))
    expect(api.deleteUser).not.toHaveBeenCalled()
    act(() => r.current.deleteUser('staff'))
    await waitFor(() => expect(api.deleteUser).toHaveBeenCalledWith(2))
  })
})

describe('stock optimistic & customers', () => {
  it('adjustStock optimistic sebelum API resolve', async () => {
    api.adjustStock.mockReturnValue(new Promise(() => {}))
    const r = await mountAuthed()
    await goto(r, 'stock')
    act(() => r.current.adjustStock(1, 5))
    expect((r.current.lists.stock.rows as any[]).find((x) => x.id === 1).quantity).toBe(55)
    expect(api.adjustStock).toHaveBeenCalledWith(1, 5)
  })

  it('edit stock mengubah nama, label, quantity, dan unit', async () => {
    const r = await mountAuthed()
    await goto(r, 'stock')
    act(() => r.current.openStockEditor(stockRow))
    act(() => r.current.set({ sName: 'Stock Satu', sLabel: 'satu', sQty: '12', sUnit: 'pack' }))
    act(() => r.current.saveStock())
    await waitFor(() => expect(api.updateStock).toHaveBeenCalledWith(1, { label: 'satu', name: 'Stock Satu', quantity: 12, unit: 'pack' }))
    await waitFor(() => expect((r.current.lists.stock.rows as any[]).find((x) => x.id === 1)).toMatchObject({ label: 'satu', name: 'Stock Satu', quantity: 12, unit: 'pack' }))
    expect(r.current.showStockForm).toBe(false)
  })

  it('toggleBlockCustomer pakai id', async () => {
    api.blockCustomer.mockResolvedValue({ id: 1, blocked: true })
    const r = await mountAuthed()
    await goto(r, 'customers')
    act(() => r.current.toggleBlockCustomer('sari'))
    await waitFor(() => expect(api.blockCustomer).toHaveBeenCalledWith(1, true))
    await waitFor(() => expect((r.current.lists.customers.rows as any[]).find((c) => c.username === 'sari').blocked).toBe(true))
  })
})

describe('doLogin', () => {
  it('login → token + currentUser + authed', async () => {
    getTokenMock.mockReturnValue(null)
    api.login.mockResolvedValue({ token: 't0ken', user: { id: 1, username: 'admin', fullName: 'Dee Rahma', isSuper: true } })
    const r = render()
    expect(r.current.authed).toBe(false)
    act(() => r.current.doLogin())
    await waitFor(() => expect(r.current.authed).toBe(true))
    expect(apiMod.setToken).toHaveBeenCalledWith('t0ken')
    expect(r.current.currentUser).toMatchObject({ username: 'admin' })
    expect(r.current.toast).toContain('Selamat datang, Dee')
  })
})

describe('settings save', () => {
  it('edit is local until section save', async () => {
    const r = await mountAuthed()
    await goto(r, 'settings')

    act(() => r.current.updateSetting(0, 'baru'))
    expect(api.updateSetting).not.toHaveBeenCalled()

    act(() => r.current.saveSettings([7]))
    await waitFor(() => expect(api.updateSetting).toHaveBeenCalledWith(7, 'baru'))
    await waitFor(() => expect(r.current.lists.settings.rows[0].savedValue).toBe('baru'))
  })
})
