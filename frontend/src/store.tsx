import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  api,
  ApiError,
  clearToken,
  fmtDateTime,
  getToken,
  mapMenu,
  mapPreorderRow,
  mapStock,
  mapUser,
  menuToApi,
  setToken,
  uploadImage,
} from './api'
import type {
  BotMessage,
  BotMessageDirection,
  BotMessageCustomer,
  CustomerOrderRow,
  CustomerRow,
  DashboardData,
  Menu,
  MenuDraft,
  OrderDetail,
  OrderRow,
  OrderStatus,
  PreorderRow,
  Screen,
  Setting,
  StockItem,
  Subscriber,
  User,
  UserDraft,
} from './types'
import { currentAdminScreen, pathToScreen, pushAdminScreen, replaceAdminScreen, replaceInvalidAdminPath } from './adminRoutes'

export type EditMenuId = number | 'new' | null
export type ListKey = 'orders' | 'customers' | 'subscribers' | 'botMessages' | 'preorders' | 'menus' | 'stock' | 'users' | 'settings'

/** Koleksi list yang dibutuhkan tiap layar (dashboard pakai summary tersendiri). */
export const SCREEN_LISTS: Record<Screen, ListKey[]> = {
  dashboard: [],
  preorders: ['preorders'],
  orders: ['orders'],
  customers: ['customers'],
  menus: ['menus', 'stock'],
  stock: ['stock'],
  subscribers: ['subscribers'],
  botMessages: ['botMessages'],
  users: ['users'],
  settings: ['settings'],
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ListState<T = unknown> {
  rows: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  loaded: boolean
  loading: boolean
}

/** Tipe baris tiap list — pemetaan key → bentuk FE-nya (mengembalikan keamanan tipe ke screen). */
export interface Lists {
  orders: ListState<OrderRow>
  customers: ListState<CustomerRow>
  subscribers: ListState<Subscriber>
  botMessages: ListState<BotMessage>
  preorders: ListState<PreorderRow>
  menus: ListState<Menu>
  stock: ListState<StockItem>
  users: ListState<User>
  settings: ListState<Setting>
}

const emptyList = (): ListState<never> => ({ rows: [], total: 0, page: 1, limit: 20, totalPages: 1, loaded: false, loading: false })

/** Ganti baris-baris satu list lewat `fn`, kembalikan objek `lists` baru (hapus spread bertingkat berulang). */
function withRows<K extends ListKey>(s: State, key: K, fn: (rows: Lists[K]['rows']) => Lists[K]['rows']): Lists {
  const lists: Lists = { ...s.lists }
  lists[key] = { ...s.lists[key], rows: fn(s.lists[key].rows) }
  return lists
}

const LIST_FETCHERS: Record<ListKey, (p: { page: number; limit: number; status?: string; direction?: string; customerId?: number }) => Promise<{ rows: any[]; total: number; page: number; limit: number; totalPages: number; counts?: Record<string, number> }>> = {
  orders: (p) => api.ordersList(p),
  customers: (p) => api.customersList(p),
  subscribers: (p) => api.subscribersList(p),
  botMessages: (p) => api.botMessagesList(p),
  preorders: (p) => api.preordersList(p),
  menus: (p) => api.menusList(p),
  stock: (p) => api.stockList(p),
  users: (p) => api.usersList(p),
  settings: (p) => api.settingsList(p),
}

interface CurrentUser { username: string; name: string; super: boolean }

interface State {
  authed: boolean
  booting: boolean
  currentUser: CurrentUser | null
  loginUser: string
  loginPass: string
  profileOpen: boolean
  dark: boolean
  sidebarCollapsed: boolean
  screen: Screen
  orderFilter: 'all' | OrderStatus
  botMessageDirection: 'all' | BotMessageDirection
  botMessageCustomerId: number | null
  botMessageCustomers: BotMessageCustomer[]
  botMessageCustomersLoaded: boolean
  botMessageCustomersLoading: boolean
  orderCounts: Record<string, number>
  subscriberCounts: { active: number; inactive: number }
  selectedOrderId: number | null
  selectedOrder: OrderDetail | null
  selectedOrderLoading: boolean
  selectedCustomerU: string | null
  customerOrders: ListState<CustomerOrderRow>
  selectedPreorderId: number | null
  preorderOrders: ListState<OrderRow>
  expandedMenuId: number | null
  showPoForm: boolean
  poTitle: string
  poDesc: string
  poWeek: string
  poNote: string
  showStockForm: boolean
  editStockId: number | null
  sName: string
  sLabel: string
  sQty: string
  sUnit: string
  editMenuId: EditMenuId
  menuDraft: MenuDraft | null
  showUserForm: boolean
  uName: string
  uFull: string
  uPass: string
  editUserU: string | null
  userDraft: UserDraft | null
  lightboxImage: string | null
  toast: string | null
  dashboard: DashboardData | null
  dashboardLoaded: boolean
  dashboardLoading: boolean
  lists: Lists
}

const initialLists = (): Lists => ({
  orders: emptyList(), customers: emptyList(), subscribers: emptyList(), botMessages: emptyList(), preorders: emptyList(),
  menus: emptyList(), stock: emptyList(), users: emptyList(), settings: emptyList(),
})

const initialState: State = {
  authed: false,
  booting: !!getToken(),
  currentUser: null,
  loginUser: '',
  loginPass: '',
  profileOpen: false,
  dark: localStorage.getItem('deedims_dark') === '1',
  sidebarCollapsed: false,
  screen: 'dashboard',
  orderFilter: 'all',
  botMessageDirection: 'all',
  botMessageCustomerId: null,
  botMessageCustomers: [],
  botMessageCustomersLoaded: false,
  botMessageCustomersLoading: false,
  orderCounts: {},
  subscriberCounts: { active: 0, inactive: 0 },
  selectedOrderId: null,
  selectedOrder: null,
  selectedOrderLoading: false,
  selectedCustomerU: null,
  customerOrders: emptyList(),
  selectedPreorderId: null,
  preorderOrders: emptyList(),
  expandedMenuId: null,
  showPoForm: false, poTitle: '', poDesc: '', poWeek: '', poNote: '',
  showStockForm: false, editStockId: null, sName: '', sLabel: '', sQty: '', sUnit: '',
  editMenuId: null, menuDraft: null,
  showUserForm: false, uName: '', uFull: '', uPass: '',
  editUserU: null, userDraft: null,
  lightboxImage: null,
  toast: null,
  dashboard: null,
  dashboardLoaded: false,
  dashboardLoading: false,
  lists: initialLists(),
}

export interface AdminStore extends State {
  set: (patch: Partial<State>) => void
  showToast: (msg: string) => void
  // data
  ensureScreen: () => void
  refresh: () => void
  isScreenReady: () => boolean
  isScreenLoading: () => boolean
  setListPage: (key: ListKey, page: number) => void
  setOrderFilter: (status: 'all' | OrderStatus) => void
  setBotMessageDirection: (direction: 'all' | BotMessageDirection) => void
  setBotMessageCustomerId: (customerId: number | null) => void
  // auth
  doLogin: () => void
  doLogout: () => void
  // navigation
  goScreen: (screen: Screen) => void
  selectOrder: (id: number) => void
  selectPreorder: (id: number) => void
  setPreorderOrdersPage: (page: number) => void
  // orders
  patchOrder: (id: number, patch: Partial<OrderDetail>) => void
  approveCancellation: (id: number) => void
  rejectCancellation: (id: number) => void
  // preorders
  openPreorder: (id: number) => void
  closePreorder: (id: number) => void
  completePreorder: (id: number) => void
  createPo: () => void
  // customers
  toggleBlockCustomer: (username: string) => void
  // menus
  toggleMenuActive: (id: number) => void
  openMenuEditor: (menu: Menu | null) => void
  closeMenuEditor: () => void
  updateDraft: (patch: Partial<MenuDraft>) => void
  updateVariant: (i: number, patch: Partial<Menu['variants'][number]>) => void
  addVariant: () => void
  removeVariant: (i: number) => void
  toggleAddon: (id: number) => void
  toggleFreeAddon: (id: number) => void
  setDraftImageFromFile: (file: File) => void
  setVariantImageFromFile: (index: number, file: File) => void
  saveMenu: () => void
  // stock
  adjustStock: (id: number, delta: number) => void
  openStockEditor: (item: StockItem | null) => void
  closeStockEditor: () => void
  saveStock: () => void
  createStock: () => void
  // users
  createUser: () => void
  openUserEditor: (u: User) => void
  closeUserEditor: () => void
  updateUserDraft: (patch: Partial<UserDraft>) => void
  saveUser: () => void
  deleteUser: (username: string) => void
  // settings
  updateSetting: (index: number, value: string) => void
  saveSettings: (ids: number[]) => void
  // image lightbox
  openImage: (img: string) => void
  closeLightbox: () => void
}

const AdminContext = createContext<AdminStore | null>(null)

export function AdminProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(() => ({ ...initialState, screen: currentAdminScreen() }))
  const stateRef = useRef(state)
  stateRef.current = state
  const toastTimer = useRef<ReturnType<typeof setTimeout>>()
  const debouncers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const inflight = useRef<Set<string>>(new Set())
  const listLoaded = useRef<Set<ListKey>>(new Set())
  const dashLoaded = useRef(false)

  const set = useCallback((patch: Partial<State>) => setState((s) => ({ ...s, ...patch })), [])
  const update = useCallback((fn: (s: State) => Partial<State>) => setState((s) => ({ ...s, ...fn(s) })), [])

  const navigateScreen = useCallback((screen: Screen, mode: 'push' | 'replace' | 'silent' = 'push') => {
    if (mode === 'push') pushAdminScreen(screen)
    if (mode === 'replace') replaceAdminScreen(screen)
    setState((s) => ({ ...s, screen, selectedOrderId: null, selectedCustomerU: null, selectedPreorderId: null }))
  }, [])

  const showToast = useCallback((msg: string) => {
    clearTimeout(toastTimer.current)
    setState((s) => ({ ...s, toast: msg }))
    toastTimer.current = setTimeout(() => setState((s) => ({ ...s, toast: null })), 2600)
  }, [])

  const fail = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) {
      clearToken()
      listLoaded.current.clear()
      inflight.current.clear()
      setState((s) => ({ ...s, authed: false, booting: false }))
      showToast('Sesi berakhir, silakan login lagi')
    } else {
      showToast(e instanceof ApiError ? e.message : 'Terjadi kesalahan')
    }
  }, [showToast])

  const debounceSave = useCallback((key: string, fn: () => void, delay = 600) => {
    clearTimeout(debouncers.current[key])
    debouncers.current[key] = setTimeout(fn, delay)
  }, [])

  const setListLoading = (key: ListKey, loading: boolean) =>
    // Penulisan dynamic-key: satu cast di batas (tipe baris dipulihkan di withRows / pemetaan Lists).
    setState((s) => ({ ...s, lists: { ...s.lists, [key]: { ...s.lists[key], loading } } as Lists }))

  // Muat satu list (dedup in-flight; skip kalau sudah loaded kecuali force/ganti page/status).
  const loadList = useCallback((key: ListKey, opts: { page?: number; status?: string; direction?: 'all' | BotMessageDirection; customerId?: number | null; force?: boolean } = {}) => {
    const ik = `list:${key}`
    if (inflight.current.has(ik)) return
    if (opts.page === undefined && opts.status === undefined && !opts.force && listLoaded.current.has(key)) return

    inflight.current.add(ik)
    setListLoading(key, true)
    void (async () => {
      try {
        const cur = stateRef.current
        const page = opts.page ?? cur.lists[key].page
        const status = key === 'orders' ? (opts.status ?? cur.orderFilter) : undefined
        const direction = key === 'botMessages' ? (opts.direction ?? cur.botMessageDirection) : undefined
        const customerId = key === 'botMessages' ? (opts.customerId ?? cur.botMessageCustomerId) : undefined
        const res = await LIST_FETCHERS[key]({
          page,
          limit: cur.lists[key].limit,
          status,
          direction: direction && direction !== 'all' ? direction : undefined,
          customerId: customerId ?? undefined,
        })
        listLoaded.current.add(key)
        setState((s) => ({
          ...s,
          orderCounts: key === 'orders' && res.counts ? res.counts : s.orderCounts,
          subscriberCounts: key === 'subscribers' && res.counts ? (res.counts as { active: number; inactive: number }) : s.subscriberCounts,
          // Penulisan dynamic-key dari fetcher (rows sudah dipetakan): satu cast di batas.
          lists: { ...s.lists, [key]: { rows: res.rows, total: res.total, page: res.page, limit: res.limit, totalPages: res.totalPages, loaded: true, loading: false } } as Lists,
        }))
      } catch (e) {
        setListLoading(key, false)
        fail(e)
      } finally {
        inflight.current.delete(ik)
      }
    })()
  }, [fail])

  const loadDashboard = useCallback((force = false) => {
    if (inflight.current.has('dashboard')) return
    if (!force && dashLoaded.current) return
    inflight.current.add('dashboard')
    setState((s) => ({ ...s, dashboardLoading: true }))
    void (async () => {
      try {
        const d = await api.dashboard()
        dashLoaded.current = true
        setState((s) => ({ ...s, dashboard: d, dashboardLoaded: true, dashboardLoading: false }))
      } catch (e) {
        setState((s) => ({ ...s, dashboardLoading: false }))
        fail(e)
      } finally {
        inflight.current.delete('dashboard')
      }
    })()
  }, [fail])

  const loadBotMessageCustomers = useCallback((force = false) => {
    const ik = 'bot-message-customers'
    if (inflight.current.has(ik)) return
    if (!force && stateRef.current.botMessageCustomersLoaded) return

    inflight.current.add(ik)
    setState((s) => ({ ...s, botMessageCustomersLoading: true }))
    void (async () => {
      try {
        const rows = await api.botMessageCustomers()
        setState((s) => ({
          ...s,
          botMessageCustomers: rows,
          botMessageCustomersLoaded: true,
          botMessageCustomersLoading: false,
        }))
      } catch (e) {
        setState((s) => ({ ...s, botMessageCustomersLoading: false }))
        fail(e)
      } finally {
        inflight.current.delete(ik)
      }
    })()
  }, [fail])

  const loadOrderDetail = useCallback((id: number) => {
    setState((s) => ({ ...s, selectedOrderLoading: true }))
    void (async () => {
      try {
        const d = await api.order(id)
        setState((s) => ({ ...s, selectedOrder: d, selectedOrderLoading: false }))
      } catch (e) {
        setState((s) => ({ ...s, selectedOrderLoading: false }))
        fail(e)
      }
    })()
  }, [fail])

  const loadCustomerOrders = useCallback((customerId: number, page = 1) => {
    setState((s) => ({ ...s, customerOrders: { ...s.customerOrders, loading: true } }))
    void (async () => {
      try {
        const res = await api.customerOrders(customerId, { page, limit: 10 })
        setState((s) => ({ ...s, customerOrders: { rows: res.rows, total: res.total, page: res.page, limit: res.limit, totalPages: res.totalPages, loaded: true, loading: false } }))
      } catch (e) {
        setState((s) => ({ ...s, customerOrders: { ...s.customerOrders, loading: false } }))
        fail(e)
      }
    })()
  }, [fail])

  const loadPreorderOrders = useCallback((preorderId: number, page = 1) => {
    setState((s) => ({ ...s, preorderOrders: { ...s.preorderOrders, loading: true } }))
    void (async () => {
      try {
        const res = await api.preorderOrders(preorderId, { page, limit: 20 })
        setState((s) => ({ ...s, preorderOrders: { rows: res.rows, total: res.total, page: res.page, limit: res.limit, totalPages: res.totalPages, loaded: true, loading: false } }))
      } catch (e) {
        setState((s) => ({ ...s, preorderOrders: { ...s.preorderOrders, loading: false } }))
        fail(e)
      }
    })()
  }, [fail])

  const ensureScreen = useCallback(() => {
    const sc = stateRef.current.screen
    if (sc === 'dashboard') loadDashboard()
    else {
      SCREEN_LISTS[sc].forEach((k) => loadList(k))
      if (sc === 'botMessages') loadBotMessageCustomers()
    }
  }, [loadBotMessageCustomers, loadDashboard, loadList])

  // Validasi token tersimpan dengan satu call /me.
  const validateSession = useCallback(async () => {
    try {
      const me = await api.me()
      setState((s) => ({ ...s, authed: true, booting: false, currentUser: { username: me.username, name: me.fullName, super: me.isSuper } }))
    } catch {
      clearToken()
      setState((s) => ({ ...s, authed: false, booting: false }))
    }
  }, [])

  useEffect(() => { replaceInvalidAdminPath() }, [])

  useEffect(() => {
    const onPopState = () => {
      const screen = pathToScreen(window.location.pathname) ?? 'dashboard'
      navigateScreen(screen, 'silent')
      if (!pathToScreen(window.location.pathname)) replaceAdminScreen(screen)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [navigateScreen])

  useEffect(() => { if (getToken()) void validateSession() }, [validateSession])

  // Simpan preferensi dark/light ke localStorage.
  useEffect(() => { localStorage.setItem('deedims_dark', state.dark ? '1' : '0') }, [state.dark])

  // Muat data layar aktif saat authed / pindah layar.
  useEffect(() => {
    if (state.authed) ensureScreen()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.authed, state.screen])

  // Fetch detail order saat dipilih.
  useEffect(() => {
    if (state.selectedOrderId != null) loadOrderDetail(state.selectedOrderId)
    else setState((s) => ({ ...s, selectedOrder: null }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedOrderId])

  // Fetch track-record order saat customer dipilih.
  useEffect(() => {
    if (state.selectedCustomerU) {
      const row = state.lists.customers.rows.find((c) => c.username === state.selectedCustomerU)
      if (row) loadCustomerOrders(row.id)
    } else {
      setState((s) => ({ ...s, customerOrders: emptyList() }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedCustomerU])

  // Fetch order PO saat pre-order dipilih (drill-down detail).
  useEffect(() => {
    if (state.selectedPreorderId != null) loadPreorderOrders(state.selectedPreorderId)
    else setState((s) => ({ ...s, preorderOrders: emptyList() }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.selectedPreorderId])

  const patchOrder = useCallback((id: number, patch: Partial<OrderDetail>) => {
    // Optimistic: detail + baris list + recent orders dashboard.
    setState((s) => ({
      ...s,
      selectedOrder: s.selectedOrder && s.selectedOrder.id === id ? { ...s.selectedOrder, ...patch } : s.selectedOrder,
      lists: withRows(s, 'orders', (rows) => rows.map((o) => (o.id === id ? { ...o, ...patch } : o))),
      dashboard: s.dashboard && 'status' in patch ? { ...s.dashboard, recentOrders: s.dashboard.recentOrders.map((o) => (o.id === id ? { ...o, status: patch.status! } : o)) } : s.dashboard,
    }))

    void (async () => {
      try {
        const body: Record<string, unknown> = {}
        if ('status' in patch && patch.status) body.orderStatus = patch.status
        if ('pay' in patch && patch.pay) body.paymentStatus = patch.pay
        if ('adminNotes' in patch) body.adminNotes = patch.adminNotes ?? ''
        if (Object.keys(body).length === 0) return

        const onlyNotes = Object.keys(body).length === 1 && 'adminNotes' in body
        if (onlyNotes) {
          debounceSave(`order-notes-${id}`, () => void api.patchOrder(id, body).catch(fail))
          return
        }

        const u = await api.patchOrder(id, body)
        setState((s) => ({
          ...s,
          selectedOrder: s.selectedOrder && s.selectedOrder.id === id ? { ...s.selectedOrder, status: u.status, pay: u.pay, adminNotes: u.adminNotes ?? '', cancelRequested: u.cancelRequested, updatedAt: fmtDateTime(u.updatedAt) } : s.selectedOrder,
          lists: withRows(s, 'orders', (rows) => rows.map((o) => (o.id === id ? { ...o, status: u.status, pay: u.pay, cancelRequested: u.cancelRequested } : o))),
          dashboard: s.dashboard ? { ...s.dashboard, recentOrders: s.dashboard.recentOrders.map((o) => (o.id === id ? { ...o, status: u.status } : o)) } : s.dashboard,
        }))
      } catch (e) {
        fail(e)
      }
    })()
  }, [debounceSave, fail])

  // Review pembatalan order terkonfirmasi: approve = batalkan + kembalikan stock; reject = bersihkan flag.
  const reviewCancellation = useCallback((id: number, approve: boolean) => {
    const patch: Partial<OrderDetail> = approve
      ? { status: 'cancelled', pay: 'cancelled', cancelRequested: false }
      : { cancelRequested: false }
    setState((s) => ({
      ...s,
      selectedOrder: s.selectedOrder && s.selectedOrder.id === id ? { ...s.selectedOrder, ...patch } : s.selectedOrder,
      lists: withRows(s, 'orders', (rows) => rows.map((o) => (o.id === id ? { ...o, ...patch } : o))),
      dashboard: approve && s.dashboard ? { ...s.dashboard, recentOrders: s.dashboard.recentOrders.map((o) => (o.id === id ? { ...o, status: 'cancelled' } : o)) } : s.dashboard,
    }))
    void (async () => {
      try {
        if (approve) await api.approveCancel(id)
        else await api.rejectCancel(id)
        const fresh = await api.order(id)
        setState((s) => ({
          ...s,
          selectedOrder: fresh,
          lists: withRows(s, 'orders', (rows) => rows.map((o) => (o.id === id ? { ...o, status: fresh.status, pay: fresh.pay, cancelRequested: fresh.cancelRequested } : o))),
        }))
      } catch (e) {
        fail(e)
      }
    })()
  }, [fail])

  const updatePreorderRow = (id: number, patch: Partial<PreorderRow>) =>
    update((s) => ({ lists: withRows(s, 'preorders', (rows) => rows.map((p) => (p.id === id ? { ...p, ...patch } : p))) }))

  const saveStock = useCallback(() => {
    const cur = stateRef.current
    const editingId = cur.editStockId
    const name = cur.sName.trim()
    const label = cur.sLabel.trim() || name.toLowerCase().replace(/\s+/g, '-')
    const quantity = Math.max(0, parseInt(cur.sQty, 10) || 0)
    const unit = cur.sUnit.trim() || 'pcs'

    if (!name) { showToast('Nama stock wajib diisi'); return }
    if (!label) { showToast('Label stock wajib diisi'); return }
    if (cur.lists.stock.rows.some((x) => x.label === label && x.id !== editingId)) {
      showToast('Label "' + label + '" sudah dipakai — harus unik')
      return
    }

    void (async () => {
      try {
        const body = { label, name, quantity, unit }
        if (editingId != null) {
          const r = await api.updateStock(editingId, body)
          const row = mapStock(r)
          update((s) => ({
            lists: withRows(s, 'stock', (rows) => rows.map((x) => (x.id === editingId ? row : x))),
            dashboard: s.dashboard ? { ...s.dashboard, lowStock: s.dashboard.lowStock.map((x) => (x.id === editingId ? { ...x, name: row.name, quantity: row.quantity, unit: row.unit } : x)) } : s.dashboard,
            showStockForm: false,
            editStockId: null,
            sName: '',
            sLabel: '',
            sQty: '',
            sUnit: '',
          }))
          showToast('Stock item diperbarui')
        } else {
          const r = await api.createStock(body)
          update((s) => ({
            lists: withRows(s, 'stock', (rows) => [...rows, mapStock(r)]),
            showStockForm: false,
            editStockId: null,
            sName: '',
            sLabel: '',
            sQty: '',
            sUnit: '',
          }))
          showToast('Stock item dibuat')
        }
      } catch (e) {
        fail(e)
        if (editingId != null) loadList('stock', { force: true })
      }
    })()
  }, [fail, loadList, showToast, update])

  const store = useMemo<AdminStore>(() => {
    const currentLists = state.screen === 'dashboard' ? [] : SCREEN_LISTS[state.screen]
    return {
      ...state,
      set,
      showToast,
      ensureScreen,
      refresh: () => {
        if (state.screen === 'dashboard') loadDashboard(true)
        else {
          currentLists.forEach((k) => loadList(k, { force: true }))
          if (state.screen === 'botMessages') loadBotMessageCustomers(true)
        }
      },
      isScreenReady: () => {
        if (state.screen === 'dashboard') return state.dashboardLoaded
        const listsReady = currentLists.every((k) => state.lists[k].loaded)
        return state.screen === 'botMessages' ? listsReady && state.botMessageCustomersLoaded : listsReady
      },
      isScreenLoading: () => {
        if (state.screen === 'dashboard') return state.dashboardLoading
        const listsLoading = currentLists.some((k) => state.lists[k].loading)
        return state.screen === 'botMessages' ? listsLoading || state.botMessageCustomersLoading : listsLoading
      },
      setListPage: (key, page) => loadList(key, { page, force: true }),
      setOrderFilter: (status) => {
        setState((s) => ({ ...s, orderFilter: status }))
        loadList('orders', { page: 1, status, force: true })
      },
      setBotMessageDirection: (direction) => {
        setState((s) => ({ ...s, botMessageDirection: direction }))
        loadList('botMessages', { page: 1, direction, force: true })
      },
      setBotMessageCustomerId: (customerId) => {
        setState((s) => ({ ...s, botMessageCustomerId: customerId }))
        loadList('botMessages', { page: 1, customerId, force: true })
      },
      patchOrder,
      approveCancellation: (id) => reviewCancellation(id, true),
      rejectCancellation: (id) => reviewCancellation(id, false),

      doLogin: () => {
        const un = (state.loginUser || '').trim().toLowerCase()
        void (async () => {
          try {
            const { token, user } = await api.login(un, state.loginPass)
            setToken(token)
            setState((s) => ({ ...s, authed: true, booting: false, loginPass: '', currentUser: { username: user.username, name: user.fullName, super: user.isSuper }, screen: currentAdminScreen(), selectedOrderId: null, selectedCustomerU: null }))
            showToast('Selamat datang, ' + user.fullName.split(' ')[0])
          } catch (e) {
            showToast(e instanceof ApiError ? e.message : 'Login gagal')
          }
        })()
      },
      doLogout: () => {
        clearToken()
        listLoaded.current.clear()
        inflight.current.clear()
        dashLoaded.current = false
        replaceAdminScreen('dashboard')
        setState((s) => ({ ...s, ...initialState, booting: false, dark: s.dark, screen: 'dashboard' }))
      },

      goScreen: (screen) => navigateScreen(screen),
      selectOrder: (id) => {
        pushAdminScreen('orders')
        set({ screen: 'orders', selectedOrderId: id, selectedCustomerU: null })
      },
      selectPreorder: (id) => set({ selectedPreorderId: id }),
      setPreorderOrdersPage: (page) => { if (state.selectedPreorderId != null) loadPreorderOrders(state.selectedPreorderId, page) },

      openPreorder: (id) => {
        if (state.lists.preorders.rows.some((x) => x.status === 'open')) {
          showToast('Tutup dulu PO yang sedang open — hanya boleh satu open')
          return
        }
        void (async () => {
          try {
            const po = await api.openPreorder(id)
            updatePreorderRow(id, { status: po.status as PreorderRow['status'] })
            showToast('PO dibuka — reminder terkirim ke subscriber aktif')
          } catch (e) { fail(e) }
        })()
      },
      closePreorder: (id) => {
        void (async () => {
          try {
            const po = await api.closePreorder(id)
            updatePreorderRow(id, { status: po.status as PreorderRow['status'] })
            showToast('PO ditutup — customer tidak bisa order baru')
          } catch (e) { fail(e) }
        })()
      },
      completePreorder: (id) => {
        void (async () => {
          try {
            const po = await api.completePreorder(id)
            updatePreorderRow(id, { status: po.status as PreorderRow['status'] })
            showToast('PO ditandai selesai')
          } catch (e) { fail(e) }
        })()
      },
      createPo: () => {
        if (!state.poTitle.trim()) { showToast('Judul batch wajib diisi'); return }
        if (!state.poWeek) { showToast('Pekan pengambilan/pengiriman wajib diisi'); return }
        void (async () => {
          try {
            const po = await api.createPreorder({
              title: state.poTitle, description: state.poDesc || null,
              fulfillmentWeek: state.poWeek,
              fulfillmentNote: state.poNote || null,
            })
            update((s) => ({ lists: withRows(s, 'preorders', (rows) => [mapPreorderRow(po), ...rows]), showPoForm: false, poTitle: '', poDesc: '', poWeek: '', poNote: '' }))
            showToast('Draft batch dibuat — buka saat siap terima order')
          } catch (e) { fail(e) }
        })()
      },

      toggleBlockCustomer: (username) => {
        const c = state.lists.customers.rows.find((x) => x.username === username)
        if (!c) return
        const next = !c.blocked
        void (async () => {
          try {
            const u = await api.blockCustomer(c.id, next)
            update((s) => ({ lists: withRows(s, 'customers', (rows) => rows.map((x) => (x.username === username ? { ...x, blocked: u.blocked } : x))) }))
            showToast(next ? '@' + username + ' diblokir' : '@' + username + ' dibuka blokirnya')
          } catch (e) { fail(e) }
        })()
      },

      toggleMenuActive: (id) => {
        const m = state.lists.menus.rows.find((x) => x.id === id)
        void (async () => {
          try {
            const r = await api.toggleMenu(id)
            update((s) => ({ lists: withRows(s, 'menus', (rows) => rows.map((x) => (x.id === id ? { ...x, active: r.isActive } : x))) }))
            if (m) showToast(m.name + (r.isActive ? ' diaktifkan' : ' dinonaktifkan'))
          } catch (e) { fail(e) }
        })()
      },
      openMenuEditor: (menu) => {
        if (menu) {
          set({ editMenuId: menu.id, menuDraft: { ...JSON.parse(JSON.stringify(menu)), freeAddons: menu.freeAddons ?? [] } })
        } else {
          const firstStock = state.lists.stock.rows[0]?.id ?? 1
          set({ editMenuId: 'new', menuDraft: { name: '', description: '', basePrice: 0, unitLabel: '', category: '', active: true, isAddon: false, image: '', variants: [{ name: '(default)', price: 0, stockId: firstStock, qty: 1, image: '' }], addons: [], freeAddons: [] } })
        }
      },
      closeMenuEditor: () => set({ editMenuId: null, menuDraft: null }),
      updateDraft: (patch) => update((s) => (s.menuDraft ? { menuDraft: { ...s.menuDraft, ...patch } } : {})),
      updateVariant: (i, patch) => update((s) => (s.menuDraft ? { menuDraft: { ...s.menuDraft, variants: s.menuDraft.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)) } } : {})),
      addVariant: () => {
        const fs = state.lists.stock.rows[0]?.id ?? 1
        update((s) => (s.menuDraft ? { menuDraft: { ...s.menuDraft, variants: [...s.menuDraft.variants, { name: '', price: 0, stockId: fs, qty: 1, image: '' }] } } : {}))
      },
      removeVariant: (i) => update((s) => (s.menuDraft ? { menuDraft: { ...s.menuDraft, variants: s.menuDraft.variants.filter((_, j) => j !== i) } } : {})),
      toggleAddon: (id) => update((s) => {
        if (!s.menuDraft) return {}
        const has = s.menuDraft.addons.includes(id)
        return { menuDraft: { ...s.menuDraft, addons: has ? s.menuDraft.addons.filter((a) => a !== id) : [...s.menuDraft.addons, id] } }
      }),
      toggleFreeAddon: (id) => update((s) => {
        if (!s.menuDraft) return {}
        const has = s.menuDraft.freeAddons.includes(id)
        return { menuDraft: { ...s.menuDraft, freeAddons: has ? s.menuDraft.freeAddons.filter((a) => a !== id) : [...s.menuDraft.freeAddons, id] } }
      }),
      setDraftImageFromFile: (file) => {
        void (async () => {
          try {
            const url = await uploadImage(file)
            update((s) => (s.menuDraft ? { menuDraft: { ...s.menuDraft, image: url } } : {}))
            showToast('Foto terupload')
          } catch (e) { fail(e) }
        })()
      },
      setVariantImageFromFile: (index, file) => {
        void (async () => {
          try {
            const url = await uploadImage(file)
            update((s) => (s.menuDraft ? { menuDraft: { ...s.menuDraft, variants: s.menuDraft.variants.map((v, i) => (i === index ? { ...v, image: url } : v)) } } : {}))
            showToast('Preview variant terupload')
          } catch (e) { fail(e) }
        })()
      },
      saveMenu: () => {
        const d = state.menuDraft
        if (!d) return
        if (!d.name.trim()) { showToast('Nama menu wajib diisi'); return }
        const body = menuToApi(d)
        void (async () => {
          try {
            if (state.editMenuId === 'new') {
              const m = await api.createMenu(body)
              update((s) => ({ lists: withRows(s, 'menus', (rows) => [mapMenu(m), ...rows]), editMenuId: null, menuDraft: null }))
              showToast('Menu baru dibuat')
            } else {
              const id = state.editMenuId as number
              const m = await api.updateMenu(id, body)
              update((s) => ({ lists: withRows(s, 'menus', (rows) => rows.map((x) => (x.id === id ? mapMenu(m) : x))), editMenuId: null, menuDraft: null }))
              showToast('Menu diperbarui')
            }
          } catch (e) { fail(e) }
        })()
      },

      adjustStock: (id, delta) => {
        update((s) => ({ lists: withRows(s, 'stock', (rows) => rows.map((x) => (x.id === id ? { ...x, quantity: Math.max(0, x.quantity + delta) } : x))) }))
        void (async () => {
          try {
            const r = await api.adjustStock(id, delta)
            update((s) => ({ lists: withRows(s, 'stock', (rows) => rows.map((x) => (x.id === id ? mapStock(r) : x))) }))
          } catch (e) { fail(e); loadList('stock', { force: true }) }
        })()
      },
      openStockEditor: (item) => {
        if (!item) {
          set({ showStockForm: true, editStockId: null, sName: '', sLabel: '', sQty: '', sUnit: '' })
          return
        }
        set({ showStockForm: true, editStockId: item.id, sName: item.name, sLabel: item.label, sQty: String(item.quantity), sUnit: item.unit })
      },
      closeStockEditor: () => set({ showStockForm: false, editStockId: null, sName: '', sLabel: '', sQty: '', sUnit: '' }),
      saveStock,
      createStock: saveStock,

      createUser: () => {
        const un = state.uName.trim().toLowerCase().replace(/\s+/g, '')
        if (!un) { showToast('Username wajib diisi'); return }
        if (!state.uPass.trim()) { showToast('Password wajib diisi'); return }
        if (state.lists.users.rows.some((u) => u.username === un)) { showToast('Username "' + un + '" sudah dipakai'); return }
        void (async () => {
          try {
            const r = await api.createUser({ username: un, fullName: state.uFull.trim() || un, password: state.uPass })
            update((s) => ({ lists: withRows(s, 'users', (rows) => [...rows, mapUser(r)]), showUserForm: false, uName: '', uFull: '', uPass: '' }))
            showToast('Admin @' + un + ' ditambahkan')
          } catch (e) { fail(e) }
        })()
      },
      openUserEditor: (u) => set({ editUserU: u.username, userDraft: { name: u.name, username: u.username, password: '', super: u.super } }),
      closeUserEditor: () => set({ editUserU: null, userDraft: null }),
      updateUserDraft: (patch) => update((s) => (s.userDraft ? { userDraft: { ...s.userDraft, ...patch } } : {})),
      saveUser: () => {
        const d = state.userDraft
        if (!d) return
        const un = (d.username || '').trim().toLowerCase().replace(/\s+/g, '')
        if (!un) { showToast('Username wajib diisi'); return }
        if (state.lists.users.rows.some((u) => u.username === un && u.username !== state.editUserU)) { showToast('Username "' + un + '" sudah dipakai'); return }
        const target = state.lists.users.rows.find((u) => u.username === state.editUserU)
        if (!target || target.id == null) return
        const body: Record<string, unknown> = { username: un, fullName: (d.name || '').trim() || un }
        if ((d.password || '').trim()) body.password = d.password
        void (async () => {
          try {
            const r = await api.updateUser(target.id!, body)
            update((s) => ({ lists: withRows(s, 'users', (rows) => rows.map((u) => (u.username === state.editUserU ? mapUser(r) : u))), editUserU: null, userDraft: null }))
            showToast('Admin @' + un + ' diperbarui')
          } catch (e) { fail(e) }
        })()
      },
      deleteUser: (username) => {
        const u = state.lists.users.rows.find((x) => x.username === username)
        if (!u || u.super) { showToast('Super User tidak bisa dihapus'); return }
        if (u.id == null) return
        void (async () => {
          try {
            await api.deleteUser(u.id!)
            update((s) => ({ lists: withRows(s, 'users', (rows) => rows.filter((x) => x.username !== username)) }))
            showToast('Admin @' + username + ' dihapus')
          } catch (e) { fail(e) }
        })()
      },

      updateSetting: (index, value) => {
        update((s) => ({ lists: withRows(s, 'settings', (rows) => rows.map((x, j) => (j === index ? { ...x, value } : x))) }))
      },
      saveSettings: (ids) => {
        const targets = (stateRef.current.lists.settings.rows as Setting[]).filter((setting) => setting.id != null && ids.includes(setting.id) && setting.value !== setting.savedValue)
        if (!targets.length) { showToast('Tidak ada perubahan settings'); return }
        void (async () => {
          try {
            await Promise.all(targets.map((setting) => api.updateSetting(setting.id!, setting.value)))
            update((s) => ({ lists: withRows(s, 'settings', (rows) => rows.map((row) => targets.some((target) => target.id === row.id) ? { ...row, savedValue: row.value } : row)) }))
            showToast(`${targets.length} setting disimpan`)
          } catch (e) { fail(e) }
        })()
      },

      openImage: (img) => { if (img) set({ lightboxImage: img }); else showToast('Belum ada foto — buka Edit untuk menambah') },
      closeLightbox: () => set({ lightboxImage: null }),
    }
  }, [state, set, update, showToast, ensureScreen, loadDashboard, loadBotMessageCustomers, loadList, loadPreorderOrders, patchOrder, reviewCancellation, saveStock, debounceSave, fail])

  return <AdminContext.Provider value={store}>{children}</AdminContext.Provider>
}

export function useAdmin(): AdminStore {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider')
  return ctx
}
