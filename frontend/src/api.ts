import type {
  BotMessage,
  BotMessageCustomer,
  CustomerOrderRow,
  CustomerRow,
  DashboardData,
  Menu,
  MenuDraft,
  OrderDetail,
  OrderRow,
  PreorderRow,
  Setting,
  StockItem,
  Subscriber,
  User,
} from './types'

// ── Token (JWT) di localStorage ──────────────────────────
const TOKEN_KEY = 'deedims_token'
export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Envelope {
  data: any
  meta: any
  error: { message: string; code: string } | null
}

type Json = Record<string, unknown>

/** Request mentah → kembalikan envelope penuh (data+meta), lempar ApiError bila gagal. */
async function rawRequest(method: string, path: string, body?: Json): Promise<Envelope> {
  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  let payload: string | undefined
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }
  const res = await fetch(`/api${path}`, { method, headers, body: payload })
  if (res.status === 401) {
    clearToken()
    throw new ApiError(401, 'Unauthorized')
  }
  const text = await res.text()
  const env: Envelope = text ? JSON.parse(text) : { data: null, meta: null, error: null }
  if (!res.ok || env.error) throw new ApiError(res.status, env.error?.message ?? res.statusText)
  return env
}

/** Unwrap `data` (resource tunggal / summary / mutasi). */
async function request<T>(method: string, path: string, body?: Json): Promise<T> {
  return (await rawRequest(method, path, body)).data as T
}

export interface PageMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}
export interface Paged<T> extends PageMeta {
  rows: T[]
  counts?: Record<string, number>
}

function qs(params: Record<string, string | number | undefined>): string {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&')
  return q ? `?${q}` : ''
}

/** GET list paginated → { rows (sudah dipetakan), total, page, limit, totalPages, counts? }. */
async function getPaged<R, T>(path: string, params: Record<string, string | number | undefined>, mapRow: (r: R) => T): Promise<Paged<T>> {
  const env = await rawRequest('GET', path + qs(params))
  const m = (env.meta ?? {}) as PageMeta & { counts?: Record<string, number> }
  return { rows: (env.data as R[]).map(mapRow), total: m.total, page: m.page, limit: m.limit, totalPages: m.totalPages, counts: m.counts }
}

export async function uploadImage(file: File): Promise<string> {
  const token = getToken()
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/uploads', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form })
  if (res.status === 401) {
    clearToken()
    throw new ApiError(401, 'Unauthorized')
  }
  const env = await res.json().catch(() => null)
  if (!res.ok || env?.error) throw new ApiError(res.status, env?.error?.message ?? 'Upload gagal')
  return env.data.url as string
}

// ── Format tanggal (UTC dari API → tampilan Asia/Jakarta) ─
const TZ = 'Asia/Jakarta'
/** "12 Jun, 09:14" */
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const date = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: 'short' }).format(d)
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
  return `${date}, ${time}`
}
/** "12 Jun 2026" */
function fmtDay(iso: string | null | undefined): string {
  if (!iso) return 'TBD'
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
}

/** Format Senin-Jumat dalam bahasa Indonesia, mis. "22–26 Juni 2026". */
export function fmtFulfillmentWeek(startIso: string | null | undefined, endIso: string | null | undefined): string {
  if (!startIso || !endIso) return 'TBD'
  const parts = (iso: string) => {
    const values = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(iso))
    const value = (type: Intl.DateTimeFormatPartTypes) => Number(values.find((part) => part.type === type)?.value)
    return { year: value('year'), month: value('month'), day: value('day') }
  }
  const month = (iso: string) => new Intl.DateTimeFormat('id-ID', { timeZone: TZ, month: 'long' }).format(new Date(iso))
  const start = parts(startIso)
  const end = parts(endIso)
  if (start.year === end.year && start.month === end.month) return `${start.day}–${end.day} ${month(endIso)} ${end.year}`
  if (start.year === end.year) return `${start.day} ${month(startIso)}–${end.day} ${month(endIso)} ${end.year}`
  return `${start.day} ${month(startIso)} ${start.year}–${end.day} ${month(endIso)} ${end.year}`
}

// ── Mappers (DTO API → tipe FE) ──────────────────────────
export const mapStock = (r: any): StockItem => ({ id: r.id, label: r.label, name: r.name, quantity: r.quantity, unit: r.unit ?? 'pcs' })

export const mapMenu = (r: any): Menu => ({
  id: r.id, name: r.name, description: r.description ?? '', basePrice: r.basePrice, unitLabel: r.unitLabel ?? '', category: r.category ?? '', active: r.isActive, isAddon: r.isAddon,
  image: r.imageUrl ?? '',
  variants: (r.variants ?? []).map((v: any) => ({ name: v.name ?? '', price: v.price, stockId: v.stockId ?? 0, qty: v.qty ?? 1, image: v.imageUrl ?? '' })),
  addons: r.addons ?? [],
  freeAddons: r.freeAddons ?? [],
})

export const mapPreorderRow = (r: any): PreorderRow => ({
  id: r.id, title: r.title ?? '', description: r.description ?? '—', status: r.status,
  fulfillmentWeek: fmtFulfillmentWeek(r.fulfillmentStartDate, r.fulfillmentEndDate), note: r.fulfillmentNote ?? '—',
  orderCount: r.orderCount ?? 0, revenue: r.revenue ?? 0,
})

function variantMeta(v: string | null): string {
  if (v && v !== '(default)' && v !== 'Add-on') return 'Varian: ' + v
  return ''
}
export const mapOrderRow = (r: any): OrderRow => ({
  id: r.id, code: r.code, customer: r.customer ?? '', username: r.username ?? '', createdAt: fmtDateTime(r.createdAt),
  itemsSummary: r.itemsSummary ?? '', total: r.total, status: r.status, pay: r.pay, cancelRequested: r.cancelRequested,
})
export const mapOrderDetail = (r: any): OrderDetail => ({
  id: r.id, code: r.code, customer: r.customer ?? '', username: r.username ?? '',
  createdAt: fmtDateTime(r.createdAt), updatedAt: fmtDateTime(r.updatedAt), status: r.status, pay: r.pay,
  adminNotes: r.adminNotes ?? '', cancelRequested: r.cancelRequested, total: r.total,
  items: (r.items ?? []).map((it: any) => ({
    name: it.menuNameSnapshot, meta: variantMeta(it.variantNameSnapshot), qty: it.quantity, price: it.unitPrice,
    addon: it.variantNameSnapshot === 'Add-on',
  })),
  poTitle: r.preOrder?.title ?? '—',
  poFulfillmentWeek: r.preOrder ? fmtFulfillmentWeek(r.preOrder.fulfillmentStartDate, r.preOrder.fulfillmentEndDate) : '—',
})

export const mapCustomerRow = (r: any): CustomerRow => ({
  id: r.id, username: r.username ?? `user${r.id}`, name: r.name ?? '(tanpa nama)', blocked: r.blocked,
  joined: r.joinedAt ? fmtDay(r.joinedAt) : '—', orderCount: r.orderCount ?? 0, totalSpent: r.totalSpent ?? 0,
  lastOrder: r.lastOrderAt ? fmtDateTime(r.lastOrderAt) : '—', reminderActive: r.reminderActive,
})
export const mapCustomerOrderRow = (r: any): CustomerOrderRow => ({
  id: r.id, code: r.code, createdAt: fmtDateTime(r.createdAt), itemsSummary: r.itemsSummary ?? '', total: r.total, status: r.status,
})

export const mapSubscriber = (r: any): Subscriber => ({
  username: r.telegramUsername ?? '(tanpa username)', name: r.telegramUsername ?? '', since: fmtDay(r.createdAt), active: r.isActive,
})

export const mapBotMessage = (r: any): BotMessage => ({
  id: r.id,
  direction: r.direction,
  messageType: r.messageType ?? 'text',
  text: r.text ?? '',
  telegramUsername: r.telegramUsername ?? '',
  customerName: r.customerName ?? '',
  isCommand: !!r.isCommand,
  command: r.command ?? '',
  customerId: r.customerId ?? null,
  receivedAt: r.receivedAtLabel ?? '',
  telegramUserId: r.telegramUserId ?? null,
  telegramChatId: r.telegramChatId ?? '',
})

export const mapBotMessageCustomer = (r: any): BotMessageCustomer => ({
  id: r.id,
  username: r.username ?? `user${r.id}`,
  name: r.name ?? '(tanpa nama)',
  messageCount: r.messageCount ?? 0,
})

export const mapSetting = (r: any): Setting => ({
  id: r.id,
  label: r.label,
  desc: r.description ?? '',
  value: normalizeSettingValue(r.value ?? ''),
  savedValue: normalizeSettingValue(r.value ?? ''),
  textarea: r.inputType === 'textarea',
  inputType: r.inputType ?? 'text',
  category: r.category ?? 'general',
  placeholders: Array.isArray(r.placeholders) ? r.placeholders : [],
})

function normalizeSettingValue(value: string) {
  return value
    .replace(/<p>\s*<\/p>/gi, '\n')
    .replace(/<p>/gi, '')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '<br>')
    .trim()
}

export const mapUser = (r: any): User => ({ id: r.id, username: r.username, name: r.fullName, password: '', super: r.isSuper })

export const mapDashboard = (r: any): DashboardData => ({
  kpis: r.kpis,
  openPreorder: r.openPreorder
    ? { id: r.openPreorder.id, title: r.openPreorder.title, fulfillmentWeek: fmtFulfillmentWeek(r.openPreorder.fulfillmentStartDate, r.openPreorder.fulfillmentEndDate), note: r.openPreorder.fulfillmentNote ?? '—' }
    : null,
  recentOrders: (r.recentOrders ?? []).map((o: any) => ({ id: o.id, code: o.code, customer: o.customer ?? '', itemsSummary: o.itemsSummary ?? '', total: o.total, status: o.status })),
  lowStock: (r.lowStock ?? []).map((s: any) => ({ id: s.id, name: s.name, quantity: s.quantity, unit: s.unit ?? 'pcs' })),
})

/** Draft editor menu → body API. */
export const menuToApi = (d: MenuDraft) => ({
  name: d.name, description: d.description || null, basePrice: parseInt(String(d.basePrice), 10) || 0,
  unitLabel: d.unitLabel || null, category: d.category || null, isActive: d.active, isAddon: d.isAddon, imageUrl: d.image || null,
  variants: d.variants.map((v) => ({ name: v.name || null, price: Number(v.price) || 0, stockId: v.stockId, qty: Number(v.qty) || 1, imageUrl: v.image || null })),
  addons: d.isAddon ? [] : d.addons,
  freeAddons: d.isAddon ? [] : d.freeAddons,
})

// ── Endpoint ─────────────────────────────────────────────
export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; user: { id: number; username: string; fullName: string; isSuper: boolean } }>('POST', '/auth/login', { username, password }),
  me: () => request<{ id: number; username: string; fullName: string; isSuper: boolean }>('GET', '/auth/me'),
  dashboard: () => rawRequest('GET', '/dashboard').then((e) => mapDashboard(e.data)),

  // list paginated
  ordersList: (p: { status?: string; page?: number; limit?: number }) => getPaged('/orders', p, mapOrderRow),
  customersList: (p: { page?: number; limit?: number }) => getPaged('/customers', p, mapCustomerRow),
  customerOrders: (id: number, p: { page?: number; limit?: number }) => getPaged(`/customers/${id}/orders`, p, mapCustomerOrderRow),
  preorderOrders: (id: number, p: { page?: number; limit?: number }) => getPaged(`/preorders/${id}/orders`, p, mapOrderRow),
  subscribersList: (p: { page?: number; limit?: number }) => getPaged('/subscribers', p, mapSubscriber),
  botMessagesList: (p: { customerId?: number; direction?: string; page?: number; limit?: number }) => getPaged('/bot-messages', p, mapBotMessage),
  botMessageCustomers: () => request<unknown[]>('GET', '/bot-messages/customers').then((rows) => rows.map(mapBotMessageCustomer)),
  preordersList: (p: { page?: number; limit?: number }) => getPaged('/preorders', p, mapPreorderRow),
  menusList: (p: { page?: number; limit?: number }) => getPaged('/menus', p, mapMenu),
  stockList: (p: { page?: number; limit?: number }) => getPaged('/stock', p, mapStock),
  usersList: (p: { page?: number; limit?: number }) => getPaged('/users', p, mapUser),
  settingsList: (p: { page?: number; limit?: number }) => getPaged('/settings', { ...p, limit: 200 }, mapSetting),

  // detail
  order: (id: number) => rawRequest('GET', `/orders/${id}`).then((e) => mapOrderDetail(e.data)),

  // mutations (data ter-unwrap)
  adjustStock: (id: number, delta: number) => request<any>('POST', `/stock/${id}/adjust`, { delta }),
  createStock: (b: Json) => request<any>('POST', '/stock', b),
  updateStock: (id: number, b: Json) => request<any>('PATCH', `/stock/${id}`, b),
  createMenu: (b: Json) => request<any>('POST', '/menus', b),
  updateMenu: (id: number, b: Json) => request<any>('PATCH', `/menus/${id}`, b),
  toggleMenu: (id: number) => request<{ id: number; isActive: boolean }>('POST', `/menus/${id}/toggle`),
  createPreorder: (b: Json) => request<any>('POST', '/preorders', b),
  openPreorder: (id: number) => request<{ id: number; status: string }>('POST', `/preorders/${id}/open`),
  closePreorder: (id: number) => request<{ id: number; status: string }>('POST', `/preorders/${id}/close`),
  completePreorder: (id: number) => request<{ id: number; status: string }>('POST', `/preorders/${id}/complete`),
  patchOrder: (id: number, b: Json) => request<any>('PATCH', `/orders/${id}`, b),
  approveCancel: (id: number) => request<any>('POST', `/orders/${id}/cancellation/approve`),
  rejectCancel: (id: number) => request<any>('POST', `/orders/${id}/cancellation/reject`),
  blockCustomer: (id: number, blocked: boolean) => request<{ id: number; blocked: boolean }>('POST', `/customers/${id}/block`, { blocked }),
  createUser: (b: Json) => request<any>('POST', '/users', b),
  updateUser: (id: number, b: Json) => request<any>('PATCH', `/users/${id}`, b),
  deleteUser: (id: number) => request<any>('DELETE', `/users/${id}`),
  updateSetting: (id: number, value: string) => request<any>('PATCH', `/settings/${id}`, { value }),
}
