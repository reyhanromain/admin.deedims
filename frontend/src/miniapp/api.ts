import { getDevUserId, getInitData, getTelegramUser } from './telegram'
import type { Catalog, Menu, OrderDetail, OrderRow } from './types'

// ── Token customer (terpisah dari token admin CMS) ──────────
// localStorage bisa hilang (WebView Telegram dibersihkan) dan token bisa kedaluwarsa,
// jadi token di sini selalu dianggap sementara — lihat `authenticate` + retry di rawRequest.
const TOKEN_KEY = 'deedims_mini_token'
// Cermin di memori: sebagian WebView Telegram memblokir/menghapus localStorage,
// sehingga token tetap hidup selama sesi ini walau storage tidak bisa dipakai.
let memoryToken: string | null = null

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? memoryToken
  } catch {
    return memoryToken
  }
}
export const setToken = (t: string) => {
  memoryToken = t
  try {
    localStorage.setItem(TOKEN_KEY, t)
  } catch {
    /* storage diblokir — cukup andalkan memoryToken */
  }
}
export const clearToken = () => {
  memoryToken = null
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* abaikan */
  }
}

export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, message: string, code = 'ERROR') {
    super(message)
    this.status = status
    this.code = code
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Envelope {
  data: any
  meta: any
  error: { message: string; code: string } | null
}

type Json = Record<string, unknown>

const AUTH_PATH = '/auth'

async function send(method: string, path: string, body: Json | undefined, token: string | null) {
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`
  let payload: string | undefined
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  return fetch(`/api/miniapp${path}`, { method, headers, body: payload })
}

async function unwrap(res: Response): Promise<Envelope> {
  const text = await res.text()
  const env: Envelope = text ? JSON.parse(text) : { data: null, meta: null, error: null }
  if (!res.ok || env.error) throw new ApiError(res.status, env.error?.message ?? res.statusText, env.error?.code)
  return env
}

/** Kredensial Telegram tersedia? Kalau tidak (browser biasa tanpa ?devUserId=), re-auth mustahil. */
const canAuthenticate = () => Boolean(getInitData() || getDevUserId())

let authInFlight: Promise<string> | null = null

/**
 * Tukar Telegram initData menjadi token customer lalu simpan.
 * Dipakai saat boot *dan* saat request 401 (token kedaluwarsa / localStorage hilang).
 * Panggilan paralel berbagi satu request agar tidak menembak /auth berkali-kali.
 */
export function authenticate(): Promise<string> {
  if (authInFlight) return authInFlight
  authInFlight = (async () => {
    const res = await unwrap(
      await send('POST', AUTH_PATH, {
        initData: getInitData() || undefined,
        devUserId: getDevUserId() || undefined,
        name: getTelegramUser()?.name,
      }, null),
    )
    const token = res.data.token as string
    setToken(token)
    return token
  })()
  authInFlight.catch(() => undefined).then(() => { authInFlight = null })
  return authInFlight
}

/**
 * Satu request ke API mini app. Bila server menjawab 401 (token kedaluwarsa atau hilang),
 * ambil token baru dari initData lalu ulangi request sekali — tanpa ini checkout gagal
 * dengan pesan "Unauthorized" dan baru pulih setelah mini app dibuka ulang.
 */
async function rawRequest(method: string, path: string, body?: Json): Promise<Envelope> {
  const attempted = getToken()
  let res = await send(method, path, body, attempted)

  if (res.status === 401 && path !== AUTH_PATH) {
    const refreshed = getToken()
    if (refreshed && refreshed !== attempted) {
      // Request lain sudah memperbarui token lebih dulu → cukup ulangi.
      res = await send(method, path, body, refreshed)
    } else if (canAuthenticate()) {
      try {
        res = await send(method, path, body, await authenticate())
      } catch (err) {
        clearToken()
        // Re-auth gagal (mis. initData kedaluwarsa) → minta user membuka ulang dari bot.
        if (err instanceof ApiError && err.status === 401) {
          throw new ApiError(401, 'Sesi berakhir. Tutup mini app lalu buka lagi dari bot.', 'SESSION_EXPIRED')
        }
        throw err
      }
    }
  }

  if (res.status === 401) clearToken()
  return unwrap(res)
}

const request = async <T>(method: string, path: string, body?: Json): Promise<T> =>
  (await rawRequest(method, path, body)).data as T

// ── Mappers DTO → FE ────────────────────────────────────────
const mapMenu = (r: any): Menu => ({
  id: r.id,
  name: r.name,
  description: r.description ?? '',
  category: r.category ?? null,
  image: r.imageUrl ?? '',
  imageVariants: r.imageVariants ?? null,
  variants: (r.variants ?? []).map((v: any) => ({ id: v.id, name: v.name ?? null, price: v.price })),
  addons: (r.addons ?? []).map((a: any) => ({ menuId: a.menuId, variantId: a.variantId, name: a.name, price: a.price })),
  freeAddons: (r.freeAddons ?? []).map((f: any) => ({ menuId: f.menuId, name: f.name })),
})

const mapCatalog = (r: any): Catalog => ({
  po: r.po
    ? {
        title: r.po.title ?? '',
        description: r.po.description ?? '',
        fulfillmentStart: r.po.fulfillmentStartDate ?? null,
        fulfillmentEnd: r.po.fulfillmentEndDate ?? null,
        note: r.po.fulfillmentNote ?? '',
      }
    : null,
  menus: (r.menus ?? []).map(mapMenu),
})

const mapOrderRow = (r: any): OrderRow => ({
  id: r.id, code: r.code, status: r.status, total: r.total, createdAt: r.createdAt,
  summary: r.summary ?? '', cancelled: r.cancelled ?? r.status === 'cancelled',
})

const mapOrderDetail = (r: any): OrderDetail => ({
  id: r.id, code: r.code, status: r.status, total: r.total, createdAt: r.createdAt,
  cancelled: r.cancelled, canCancel: r.canCancel,
  items: (r.items ?? []).map((it: any) => ({
    name: it.name, variant: it.variant ?? null, quantity: it.quantity, isAddon: it.isAddon, unitPrice: it.unitPrice,
  })),
})

export interface SubmitItem {
  variantId: number
  quantity: number
  addonVariantIds: number[]
}

export interface SubmitPayload {
  items: SubmitItem[]
  name?: string
  phone?: string
  method?: 'cod' | 'pickup'
  note?: string
}

export const api = {
  /** Pastikan ada token sebelum request pertama; token lama yang masih sah dipakai ulang. */
  ensureAuth: (): Promise<string> => {
    const token = getToken()
    return token ? Promise.resolve(token) : authenticate()
  },
  catalog: () => request('GET', '/catalog').then(mapCatalog),
  submitOrder: (body: SubmitPayload) =>
    request<{ id: number; code: string; total: number; status: string }>('POST', '/orders', body as unknown as Json),
  ordersList: async (page = 1, limit = 20) => {
    const env = await rawRequest('GET', `/orders?page=${page}&limit=${limit}`)
    return { rows: (env.data as any[]).map(mapOrderRow), meta: env.meta }
  },
  orderDetail: (id: number) => request('GET', `/orders/${id}`).then(mapOrderDetail),
  cancelOrder: (id: number) =>
    request<{ status: string; requested: boolean; alreadyRequested?: boolean }>('POST', `/orders/${id}/cancel`),
}
