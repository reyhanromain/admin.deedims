import { beforeEach, describe, expect, it, vi } from 'vitest'

// initData tersedia (seperti di dalam Telegram) kecuali test menimpanya.
const telegram = vi.hoisted(() => ({
  initTelegram: vi.fn(),
  getInitData: vi.fn<() => string>(() => 'auth_date=1&user=%7B%22id%22%3A111%7D&hash=abc'),
  getDevUserId: vi.fn<() => string | null>(() => null),
  getTelegramUser: vi.fn(() => ({ id: 111, username: 'sari', name: 'Sari' })),
  isTelegram: vi.fn(() => true),
}))
vi.mock('../telegram', () => telegram)

import { api, authenticate, clearToken, getToken, setToken } from '../api'

const envelope = (data: unknown, meta: unknown = null) => JSON.stringify({ data, meta, error: null })
const failure = (message: string, code: string) => JSON.stringify({ data: null, meta: null, error: { message, code } })

const resOf = (status: number, body: string) => new Response(body, { status })

/** Ambil header Authorization dari argumen fetch ke-n (0-based). */
const authHeaderOf = (call: number) => {
  const init = fetchMock.mock.calls[call][1] as RequestInit
  return (init.headers as Record<string, string>).Authorization
}
const urlOf = (call: number) => fetchMock.mock.calls[call][0] as string

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  clearToken()
  telegram.getInitData.mockReturnValue('auth_date=1&user=%7B%22id%22%3A111%7D&hash=abc')
  telegram.getDevUserId.mockReturnValue(null)
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

describe('token', () => {
  it('bertahan di memori saat localStorage tidak bisa dipakai', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })
    setToken('tok-memori')
    expect(getToken()).toBe('tok-memori')
    setItem.mockRestore()
    getItem.mockRestore()
  })
})

describe('re-auth pada 401', () => {
  it('checkout yang 401 → ambil token baru lalu ulangi request (regresi: "Unauthorized" saat checkout)', async () => {
    setToken('tok-basi')
    fetchMock
      .mockResolvedValueOnce(resOf(401, failure('Unauthorized', 'UNAUTHORIZED')))       // POST /orders
      .mockResolvedValueOnce(resOf(200, envelope({ token: 'tok-baru', customer: {} })))  // POST /auth
      .mockResolvedValueOnce(resOf(201, envelope({ id: 9, code: 'DD-9', total: 25000, status: 'submitted' })))

    const order = await api.submitOrder({ items: [{ variantId: 10, quantity: 1, addonVariantIds: [] }], name: 'Sari' })

    expect(order).toMatchObject({ code: 'DD-9' })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(urlOf(1)).toBe('/api/miniapp/auth')
    expect(authHeaderOf(0)).toBe('Bearer tok-basi')
    expect(authHeaderOf(2)).toBe('Bearer tok-baru')
    expect(getToken()).toBe('tok-baru')
  })

  it('body request ikut terkirim ulang setelah re-auth', async () => {
    setToken('tok-basi')
    fetchMock
      .mockResolvedValueOnce(resOf(401, failure('Unauthorized', 'UNAUTHORIZED')))
      .mockResolvedValueOnce(resOf(200, envelope({ token: 'tok-baru', customer: {} })))
      .mockResolvedValueOnce(resOf(201, envelope({ id: 9, code: 'DD-9', total: 1, status: 'submitted' })))

    await api.submitOrder({ items: [{ variantId: 10, quantity: 3, addonVariantIds: [20] }], name: 'Sari', method: 'cod' })

    const retry = fetchMock.mock.calls[2][1] as RequestInit
    expect(JSON.parse(retry.body as string)).toMatchObject({
      items: [{ variantId: 10, quantity: 3, addonVariantIds: [20] }],
      name: 'Sari',
      method: 'cod',
    })
  })

  it('/auth sendiri tidak di-retry (tidak ada loop)', async () => {
    fetchMock.mockResolvedValue(resOf(401, failure('initData kosong', 'INITDATA_INVALID')))
    await expect(authenticate()).rejects.toMatchObject({ status: 401, code: 'INITDATA_INVALID' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('re-auth gagal → token dibuang + pesan minta buka ulang dari bot', async () => {
    setToken('tok-basi')
    fetchMock
      .mockResolvedValueOnce(resOf(401, failure('Unauthorized', 'UNAUTHORIZED')))
      .mockResolvedValueOnce(resOf(401, failure('Sesi mini app kedaluwarsa', 'INITDATA_EXPIRED')))

    await expect(api.ordersList()).rejects.toMatchObject({ status: 401, code: 'SESSION_EXPIRED' })
    expect(getToken()).toBeNull()
  })

  it('tanpa initData & tanpa devUserId → tidak mencoba re-auth', async () => {
    telegram.getInitData.mockReturnValue('')
    telegram.getDevUserId.mockReturnValue(null)
    setToken('tok-basi')
    fetchMock.mockResolvedValueOnce(resOf(401, failure('Unauthorized', 'UNAUTHORIZED')))

    await expect(api.ordersList()).rejects.toMatchObject({ status: 401 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(getToken()).toBeNull()
  })

  it('dua request 401 bersamaan hanya memicu satu /auth', async () => {
    setToken('tok-basi')
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/miniapp/auth') return resOf(200, envelope({ token: 'tok-baru', customer: {} }))
      return authHeaderOf(fetchMock.mock.calls.length - 1) === 'Bearer tok-baru'
        ? resOf(200, envelope([], { page: 1, limit: 20, total: 0, totalPages: 0 }))
        : resOf(401, failure('Unauthorized', 'UNAUTHORIZED'))
    })

    await Promise.all([api.ordersList(), api.ordersList()])

    const authCalls = fetchMock.mock.calls.filter((c) => c[0] === '/api/miniapp/auth')
    expect(authCalls).toHaveLength(1)
  })
})

describe('ensureAuth', () => {
  it('token sudah ada → tidak menembak /auth', async () => {
    setToken('tok-lama')
    await expect(api.ensureAuth()).resolves.toBe('tok-lama')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('belum ada token → auth sekali dan simpan token', async () => {
    fetchMock.mockResolvedValueOnce(resOf(200, envelope({ token: 'tok-baru', customer: {} })))
    await expect(api.ensureAuth()).resolves.toBe('tok-baru')
    expect(getToken()).toBe('tok-baru')
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
    expect(body).toMatchObject({ initData: 'auth_date=1&user=%7B%22id%22%3A111%7D&hash=abc', name: 'Sari' })
  })
})
