export type OrderStatus = 'submitted' | 'confirmed' | 'ready' | 'completed' | 'cancelled'
export type PayStatus = 'pending' | 'paid' | 'cancelled'
export type PoStatus = 'draft' | 'open' | 'closed' | 'completed' | 'cancelled'

export interface StockItem {
  id: number
  label: string
  name: string
  quantity: number
  unit: string
}

export interface Variant {
  name: string
  price: number
  stockId: number
  qty: number
  image: string
}

export interface Menu {
  id: number
  name: string
  description: string
  basePrice: number
  unitLabel: string
  active: boolean
  isAddon: boolean
  image: string
  variants: Variant[]
  /** ids of add-on menus attached to this menu */
  addons: number[]
  /** ids of attached add-on menus that are included for free */
  freeAddons: number[]
}

export interface OrderItem {
  name: string
  meta: string
  qty: number
  price: number
  addon: boolean
}

export interface Order {
  id: number
  code: string
  poId: number
  customer: string
  username: string
  status: OrderStatus
  pay: PayStatus
  total: number
  createdAt: string
  updatedAt: string
  adminNotes: string
  cancelRequested: boolean
  items: OrderItem[]
}

export interface Preorder {
  id: number
  title: string
  description: string
  status: PoStatus
  fulfillmentWeek: string
  note: string
}

export interface Customer {
  id?: number
  username: string
  name: string
  phone: string
  joined: string
  blocked: boolean
}

export interface User {
  id?: number
  username: string
  name: string
  password: string
  super: boolean
}

export interface Subscriber {
  username: string
  name: string
  since: string
  active: boolean
}

export type BotMessageDirection = 'incoming' | 'outgoing'

export interface BotMessage {
  id: number
  direction: BotMessageDirection
  messageType: string
  text: string
  telegramUsername: string
  customerName: string
  isCommand: boolean
  command: string
  customerId: number | null
  receivedAt: string
  telegramUserId: string | null
  telegramChatId: string
}

export interface BotMessageCustomer {
  id: number
  username: string
  name: string
  messageCount: number
}

export interface Setting {
  id?: number
  label: string
  desc: string
  value: string
  savedValue: string
  textarea: boolean
  inputType: string
  category: string
  placeholders: string[]
}

// ── View models untuk endpoint tailored (DTO ramping dari API) ──
export interface OrderRow {
  id: number
  code: string
  customer: string
  username: string
  createdAt: string
  itemsSummary: string
  total: number
  status: OrderStatus
  pay: PayStatus
  cancelRequested: boolean
}

export interface OrderDetail {
  id: number
  code: string
  customer: string
  username: string
  createdAt: string
  updatedAt: string
  status: OrderStatus
  pay: PayStatus
  adminNotes: string
  cancelRequested: boolean
  total: number
  items: OrderItem[]
  poTitle: string
  poFulfillmentWeek: string
}

export interface PreorderRow extends Preorder {
  orderCount: number
  revenue: number
}

export interface CustomerRow {
  id: number
  username: string
  name: string
  blocked: boolean
  joined: string
  orderCount: number
  totalSpent: number
  lastOrder: string
  reminderActive: boolean
}

export interface CustomerOrderRow {
  id: number
  code: string
  createdAt: string
  itemsSummary: string
  total: number
  status: OrderStatus
}

export interface LowStockItem {
  id: number
  name: string
  quantity: number
  unit: string
}

export interface DashboardData {
  kpis: { newOrders: number; batchOrders: number; batchRevenue: number; cancelRequests: number }
  openPreorder: { id: number; title: string; fulfillmentWeek: string; note: string } | null
  recentOrders: Array<{ id: number; code: string; customer: string; itemsSummary: string; total: number; status: OrderStatus }>
  lowStock: LowStockItem[]
}

export type Screen =
  | 'dashboard'
  | 'preorders'
  | 'orders'
  | 'customers'
  | 'menus'
  | 'stock'
  | 'subscribers'
  | 'botMessages'
  | 'users'
  | 'settings'

/** Draft model used by the menu editor modal (no id when creating). */
export interface MenuDraft {
  id?: number
  name: string
  description: string
  basePrice: number | string
  unitLabel: string
  active: boolean
  isAddon: boolean
  image: string
  variants: Variant[]
  addons: number[]
  freeAddons: number[]
}

export interface UserDraft {
  name: string
  username: string
  password: string
  super: boolean
}
