import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'

vi.mock('../telegram', () => ({
  initTelegram: vi.fn(),
  getInitData: vi.fn(() => ''),
  getDevUserId: vi.fn(() => '111'),
  getTelegramUser: vi.fn(() => null),
  isTelegram: vi.fn(() => false),
}))

vi.mock('../api', async (orig) => {
  const actual = await orig<typeof import('../api')>()
  return {
    ...actual,
    getToken: vi.fn(() => null),
    setToken: vi.fn(),
    clearToken: vi.fn(),
    api: {
      authInit: vi.fn(async () => ({ token: 'tok', customer: { id: '111', name: 'Sari', username: 'sari' } })),
      catalog: vi.fn(async () => catalog),
      ordersList: vi.fn(async () => ({ rows: orders, meta: { page: 1, limit: 20, total: orders.length, totalPages: 1 } })),
      submitOrder: vi.fn(async () => ({ id: 9, code: 'DD-NEW', total: 25000, status: 'submitted' })),
      orderDetail: vi.fn(async () => orderDetail),
      cancelOrder: vi.fn(async () => ({ status: 'cancelled', requested: false })),
    },
  }
})

import * as apiMod from '../api'
import { MiniProvider, useMini } from '../store'
import type { Catalog, OrderDetail, OrderRow } from '../types'

const api = apiMod.api as unknown as Record<string, ReturnType<typeof vi.fn>>

const catalog: Catalog = {
  po: { title: 'PO Juni', description: 'desc', fulfillmentStart: null, fulfillmentEnd: null, note: 'catatan' },
  menus: [
    {
      id: 1, name: 'Dimsum Mentai', description: 'enak', category: 'ready', image: '',
      variants: [{ id: 10, name: 'Reg', price: 25000 }, { id: 11, name: 'Large', price: 32000 }],
      addons: [{ menuId: 2, variantId: 20, name: 'Saus Extra', price: 5000 }],
      freeAddons: [],
    },
  ],
}
const orders: OrderRow[] = [
  { id: 1, code: 'DD-1', status: 'confirmed', total: 60000, createdAt: '2026-06-12T02:00:00Z', summary: '2× Dimsum', cancelled: false },
]
const orderDetail: OrderDetail = {
  id: 1, code: 'DD-1', status: 'confirmed', total: 60000, createdAt: '2026-06-12T02:00:00Z', cancelled: false, canCancel: true,
  items: [{ name: 'Dimsum Mentai', variant: 'Reg', quantity: 2, isAddon: false, unitPrice: 25000 }],
}

const wrapper = ({ children }: { children: ReactNode }) => <MiniProvider>{children}</MiniProvider>

async function booted() {
  const hook = renderHook(() => useMini(), { wrapper })
  await waitFor(() => expect(hook.result.current.state.booting).toBe(false))
  return hook
}

beforeEach(() => vi.clearAllMocks())

describe('mini store boot', () => {
  it('auth (dev) → catalog + orders termuat', async () => {
    const { result } = await booted()
    expect(api.authInit).toHaveBeenCalledTimes(1)
    expect(result.current.state.authed).toBe(true)
    expect(result.current.state.menus).toHaveLength(1)
    expect(result.current.state.orders).toHaveLength(1)
    expect(apiMod.setToken).toHaveBeenCalledWith('tok')
  })
})

describe('cart', () => {
  it('addToCart dedupe by key (varian+addon sama → qty bertambah)', async () => {
    const { result } = await booted()
    act(() => result.current.actions.openDetail(1))
    act(() => result.current.actions.addToCart())
    expect(result.current.state.cart).toHaveLength(1)
    expect(result.current.state.cart[0].qty).toBe(1)
    // tambah lagi varian sama → merge
    act(() => result.current.actions.openDetail(1))
    act(() => result.current.actions.addToCart())
    expect(result.current.state.cart).toHaveLength(1)
    expect(result.current.state.cart[0].qty).toBe(2)
  })

  it('addon mengubah key + harga unit (varian + addon)', async () => {
    const { result } = await booted()
    act(() => result.current.actions.openDetail(1))
    act(() => result.current.actions.toggleAddon(2))
    act(() => result.current.actions.addToCart())
    const item = result.current.state.cart[0]
    expect(item.unit).toBe(25000 + 5000)
    expect(item.addons).toHaveLength(1)
  })

  it('inc/dec/remove item', async () => {
    const { result } = await booted()
    act(() => result.current.actions.openDetail(1))
    act(() => result.current.actions.addToCart())
    const uid = result.current.state.cart[0].uid
    act(() => result.current.actions.incItem(uid))
    expect(result.current.state.cart[0].qty).toBe(2)
    act(() => result.current.actions.decItem(uid))
    expect(result.current.state.cart[0].qty).toBe(1)
    act(() => result.current.actions.decItem(uid))
    expect(result.current.state.cart).toHaveLength(0)
  })
})

describe('placeOrder', () => {
  it('submit → success, cart bersih, lastOrder terisi, orders di-refresh', async () => {
    const { result } = await booted()
    act(() => result.current.actions.openDetail(1))
    act(() => result.current.actions.addToCart())
    act(() => result.current.actions.setCheckout({ coName: 'Sari', coPhone: '0812' }))
    await act(async () => { await result.current.actions.placeOrder() })
    expect(api.submitOrder).toHaveBeenCalledTimes(1)
    expect(result.current.state.screen).toBe('success')
    expect(result.current.state.cart).toHaveLength(0)
    expect(result.current.state.lastOrder).toMatchObject({ code: 'DD-NEW', total: 25000 })
    expect(api.ordersList).toHaveBeenCalledTimes(2) // boot + refresh
  })

  it('tanpa nama → toast, tidak submit', async () => {
    const { result } = await booted()
    act(() => result.current.actions.openDetail(1))
    act(() => result.current.actions.addToCart())
    await act(async () => { await result.current.actions.placeOrder() })
    expect(api.submitOrder).not.toHaveBeenCalled()
    expect(result.current.state.toast).toBeTruthy()
  })
})

describe('orders', () => {
  it('toggleOrder memuat detail', async () => {
    const { result } = await booted()
    await act(async () => { result.current.actions.toggleOrder(1) })
    await waitFor(() => expect(result.current.state.orderDetails[1]).toBeTruthy())
    expect(api.orderDetail).toHaveBeenCalledWith(1)
    expect(result.current.state.expandedOrderId).toBe(1)
  })

  it('cancelOrder → refresh + toast', async () => {
    const { result } = await booted()
    await act(async () => { await result.current.actions.cancelOrder(1) })
    expect(api.cancelOrder).toHaveBeenCalledWith(1)
    expect(result.current.state.toast).toBeTruthy()
  })
})
