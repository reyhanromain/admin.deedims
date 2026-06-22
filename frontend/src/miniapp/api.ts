import type { Catalog, Menu, OrderDetail, OrderRow } from './types'

// ── Token customer (terpisah dari token admin CMS) ──────────
const TOKEN_KEY = 'deedims_mini_token'
export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

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

async function rawRequest(method: string, path: string, body?: Json): Promise<Envelope> {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  let payload: string | undefined
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const res = await fetch(`/api/miniapp${path}`, { method, headers, body: payload })
  if (res.status === 401) clearToken()
  const text = await res.text()
  const env: Envelope = text ? JSON.parse(text) : { data: null, meta: null, error: null }
  if (!res.ok || env.error) throw new ApiError(res.status, env.error?.message ?? res.statusText, env.error?.code)
  return env
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
  authInit: (body: { initData?: string; devUserId?: string; name?: string }) =>
    request<{ token: string; customer: { id: string | null; name: string | null; username: string | null } }>('POST', '/auth', body),
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
