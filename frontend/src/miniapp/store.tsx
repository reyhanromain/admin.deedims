import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api, clearToken, getToken, setToken } from './api'
import { getDevUserId, getInitData, getTelegramUser } from './telegram'
import type { CartItem, CartStyle, Catalog, CatalogLayout, Menu, OrderDetail, OrderRow, Screen } from './types'
import { imageFor } from '../imageVariants'

interface MiniState {
  booting: boolean
  authed: boolean
  fatal: string | null

  po: Catalog['po']
  menus: Menu[]
  orders: OrderRow[]
  ordersLoaded: boolean
  orderDetails: Record<number, OrderDetail>

  screen: Screen
  catalogLayout: CatalogLayout
  cartStyle: CartStyle
  query: string
  category: string

  activeMenuId: number | null
  dVariantIdx: number
  dAddonMenuIds: number[]
  dQty: number

  cart: CartItem[]

  coName: string
  coPhone: string
  coMethod: 'cod' | 'pickup'
  coNote: string

  expandedOrderId: number | null
  lastOrder: { code: string; total: number } | null
  toast: string | null
}

const initialState: MiniState = {
  booting: true,
  authed: false,
  fatal: null,
  po: null,
  menus: [],
  orders: [],
  ordersLoaded: false,
  orderDetails: {},
  screen: 'home',
  catalogLayout: 'gallery',
  cartStyle: 'card',
  query: '',
  category: 'all',
  activeMenuId: null,
  dVariantIdx: 0,
  dAddonMenuIds: [],
  dQty: 1,
  cart: [],
  coName: '',
  coPhone: '',
  coMethod: 'cod',
  coNote: '',
  expandedOrderId: null,
  lastOrder: null,
  toast: null,
}

export interface MiniActions {
  go: (screen: Screen) => void
  back: () => void
  setQuery: (q: string) => void
  setCategory: (c: string) => void
  setCatalogLayout: (l: CatalogLayout) => void
  setCartStyle: (s: CartStyle) => void
  openDetail: (menuId: number) => void
  setVariant: (idx: number) => void
  toggleAddon: (addonMenuId: number) => void
  incQty: () => void
  decQty: () => void
  addToCart: () => void
  incItem: (uid: number) => void
  decItem: (uid: number) => void
  removeItem: (uid: number) => void
  setCheckout: (patch: Partial<Pick<MiniState, 'coName' | 'coPhone' | 'coMethod' | 'coNote'>>) => void
  placeOrder: () => Promise<void>
  toggleOrder: (id: number) => void
  cancelOrder: (id: number) => Promise<void>
  showToast: (msg: string) => void
}

const Ctx = createContext<{ state: MiniState; actions: MiniActions } | null>(null)

const BACK_TARGET: Record<Screen, Screen> = {
  home: 'home', catalog: 'home', detail: 'catalog', cart: 'catalog', checkout: 'cart', success: 'home', orders: 'home',
}

export function MiniProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MiniState>(initialState)
  // Ref agar action async (placeOrder) membaca state terkini tanpa masuk dependency.
  const stateRef = useRef(state)
  stateRef.current = state
  const update = useCallback((patch: Partial<MiniState> | ((s: MiniState) => Partial<MiniState>)) => {
    setState((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }))
  }, [])

  const toastTimer = useRef<ReturnType<typeof setTimeout>>()
  const showToast = useCallback((msg: string) => {
    clearTimeout(toastTimer.current)
    setState((s) => ({ ...s, toast: msg }))
    toastTimer.current = setTimeout(() => setState((s) => ({ ...s, toast: null })), 2200)
  }, [])

  // ── Boot: auth (Telegram initData / dev) → catalog + orders ──
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (!getToken()) {
          const initData = getInitData()
          const devUserId = getDevUserId()
          const tgUser = getTelegramUser()
          const res = await api.authInit({ initData: initData || undefined, devUserId: devUserId || undefined, name: tgUser?.name })
          setToken(res.token)
        }
        const [catalog, ordersRes] = await Promise.all([api.catalog(), api.ordersList(1, 20)])
        if (cancelled) return
        const tgUser = getTelegramUser()
        setState((s) => ({
          ...s,
          authed: true,
          booting: false,
          po: catalog.po,
          menus: catalog.menus,
          orders: ordersRes.rows,
          ordersLoaded: true,
          coName: s.coName || tgUser?.name || '',
        }))
      } catch (err) {
        if (cancelled) return
        clearToken()
        setState((s) => ({ ...s, booting: false, fatal: err instanceof Error ? err.message : 'Gagal memuat mini app' }))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const refreshOrders = useCallback(async () => {
    try {
      const res = await api.ordersList(1, 20)
      setState((s) => ({ ...s, orders: res.rows, ordersLoaded: true, orderDetails: {} }))
    } catch {
      /* diam — refresh manual */
    }
  }, [])

  const actions = useMemo<MiniActions>(() => {
    const scrollTop = () => requestAnimationFrame(() => {
      document.querySelector('.dd-scroll')?.scrollTo({ top: 0 })
    })
    const go = (screen: Screen) => { update({ screen }); scrollTop() }

    return {
      go,
      back: () => update((s) => ({ screen: BACK_TARGET[s.screen] })),
      setQuery: (query) => update({ query }),
      setCategory: (category) => update({ category }),
      setCatalogLayout: (catalogLayout) => update({ catalogLayout }),
      setCartStyle: (cartStyle) => update({ cartStyle }),
      openDetail: (activeMenuId) => { update({ screen: 'detail', activeMenuId, dVariantIdx: 0, dAddonMenuIds: [], dQty: 1 }); scrollTop() },
      setVariant: (dVariantIdx) => update({ dVariantIdx }),
      toggleAddon: (addonMenuId) => update((s) => ({
        dAddonMenuIds: s.dAddonMenuIds.includes(addonMenuId) ? s.dAddonMenuIds.filter((x) => x !== addonMenuId) : [...s.dAddonMenuIds, addonMenuId],
      })),
      incQty: () => update((s) => ({ dQty: s.dQty + 1 })),
      decQty: () => update((s) => ({ dQty: Math.max(1, s.dQty - 1) })),
      addToCart: () => update((s) => {
        const menu = s.menus.find((m) => m.id === s.activeMenuId)
        if (!menu) return {}
        const variant = menu.variants[s.dVariantIdx]
        const addons = menu.addons.filter((a) => s.dAddonMenuIds.includes(a.menuId))
        const key = `${menu.id}|${variant.id}|${addons.map((a) => a.menuId).sort().join(',')}`
        const unit = variant.price + addons.reduce((sum, a) => sum + a.price, 0)
        const existing = s.cart.find((c) => c.key === key)
        const cart = existing
          ? s.cart.map((c) => (c.key === key ? { ...c, qty: c.qty + s.dQty } : c))
          : [...s.cart, {
              uid: Date.now(), key, menuId: menu.id, variantId: variant.id, slotImage: imageFor(menu.image, menu.imageVariants, 'thumb'),
              name: menu.name, variantName: variant.name, unit, addons, qty: s.dQty,
            }]
        showToast(`${s.dQty}× ${menu.name} masuk keranjang`)
        scrollTop()
        return { cart, screen: 'catalog' }
      }),
      incItem: (uid) => update((s) => ({ cart: s.cart.map((c) => (c.uid === uid ? { ...c, qty: c.qty + 1 } : c)) })),
      decItem: (uid) => update((s) => ({ cart: s.cart.map((c) => (c.uid === uid ? { ...c, qty: c.qty - 1 } : c)).filter((c) => c.qty > 0) })),
      removeItem: (uid) => update((s) => ({ cart: s.cart.filter((c) => c.uid !== uid) })),
      setCheckout: (patch) => update(patch),
      placeOrder: async () => {
        const s = stateRef.current
        if (!s.coName.trim()) { showToast('Isi nama dulu ya'); return }
        if (!s.cart.length) { showToast('Keranjang masih kosong'); return }
        try {
          const res = await api.submitOrder({
            items: s.cart.map((c) => ({ variantId: c.variantId, quantity: c.qty, addonVariantIds: c.addons.map((a) => a.variantId) })),
            name: s.coName.trim(), phone: s.coPhone.trim(), method: s.coMethod, note: s.coNote.trim() || undefined,
          })
          update({ cart: [], lastOrder: { code: res.code, total: res.total }, screen: 'success' })
          scrollTop()
          await refreshOrders()
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Gagal membuat pesanan')
        }
      },
      toggleOrder: (id) => {
        setState((s) => {
          const next = s.expandedOrderId === id ? null : id
          if (next && !s.orderDetails[id]) {
            api.orderDetail(id).then((detail) => setState((cur) => ({ ...cur, orderDetails: { ...cur.orderDetails, [id]: detail } }))).catch(() => undefined)
          }
          return { ...s, expandedOrderId: next }
        })
      },
      cancelOrder: async (id) => {
        try {
          const res = await api.cancelOrder(id)
          if (res.requested) {
            showToast(res.alreadyRequested ? 'Permintaan batal sudah dikirim' : 'Permintaan batal dikirim ke admin')
          } else {
            showToast('Pesanan dibatalkan')
          }
          await refreshOrders()
          // muat ulang detail bila order ini sedang terbuka
          setState((s) => {
            if (s.expandedOrderId === id) api.orderDetail(id).then((d) => setState((c) => ({ ...c, orderDetails: { ...c.orderDetails, [id]: d } }))).catch(() => undefined)
            return s
          })
        } catch (err) {
          showToast(err instanceof Error ? err.message : 'Gagal membatalkan')
        }
      },
      showToast,
    }
  }, [update, showToast, refreshOrders])

  return <Ctx.Provider value={{ state, actions }}>{children}</Ctx.Provider>
}

export function useMini() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useMini must be used within MiniProvider')
  return ctx
}
