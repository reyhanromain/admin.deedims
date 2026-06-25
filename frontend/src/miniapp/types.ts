// Tipe FE mini app (hasil map dari DTO /api/miniapp/*).

export type Screen = 'home' | 'catalog' | 'detail' | 'cart' | 'checkout' | 'success' | 'orders'
export type CatalogLayout = 'gallery' | 'list'
export type CartStyle = 'card' | 'compact'
export type OrderStatus = 'submitted' | 'confirmed' | 'ready' | 'completed' | 'cancelled'

export interface Variant {
  id: number
  name: string | null
  price: number
}

export interface Addon {
  menuId: number
  variantId: number
  name: string
  price: number
}

export interface Menu {
  id: number
  name: string
  description: string
  category: string | null
  image: string
  imageVariants?: Partial<Record<'thumb' | 'card' | 'detail' | 'large', string>> | null
  variants: Variant[]
  addons: Addon[]
  freeAddons: { menuId: number; name: string }[]
}

export interface PreOrder {
  title: string
  description: string
  fulfillmentStart: string | null
  fulfillmentEnd: string | null
  note: string
}

export interface Catalog {
  po: PreOrder | null
  menus: Menu[]
}

/** Item di keranjang (sisi klien). `key` dedupe varian+addon yang sama. */
export interface CartItem {
  uid: number
  key: string
  menuId: number
  variantId: number
  slotImage: string
  name: string
  variantName: string | null
  unit: number
  addons: Addon[]
  qty: number
}

export interface OrderRow {
  id: number
  code: string
  status: OrderStatus
  total: number
  createdAt: string
  summary: string
  cancelled: boolean
}

export interface OrderItem {
  name: string
  variant: string | null
  quantity: number
  isAddon: boolean
  unitPrice: number
}

export interface OrderDetail {
  id: number
  code: string
  status: OrderStatus
  total: number
  createdAt: string
  cancelled: boolean
  canCancel: boolean
  items: OrderItem[]
}
