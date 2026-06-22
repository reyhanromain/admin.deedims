import { useMini } from './store'
import { fmt } from './helpers'
import { Icon, PATH } from './ui'
import { Home } from './screens/Home'
import { Catalog } from './screens/Catalog'
import { Detail } from './screens/Detail'
import { Cart } from './screens/Cart'
import { Checkout } from './screens/Checkout'
import { Success } from './screens/Success'
import { Orders } from './screens/Orders'
import type { Screen } from './types'

const HEADER: Record<Screen, { title: string; sub?: string; back: boolean; logo: boolean }> = {
  home: { title: 'Deedims', sub: 'Pesan dimsum tanpa ribet', back: false, logo: true },
  catalog: { title: 'Menu Deedims', back: true, logo: false },
  detail: { title: 'Detail Menu', back: true, logo: false },
  cart: { title: 'Keranjang', back: true, logo: false },
  checkout: { title: 'Checkout', back: true, logo: false },
  success: { title: 'Selesai', back: false, logo: false },
  orders: { title: 'Pesanan Saya', back: true, logo: false },
}

const SCREENS: Record<Screen, () => JSX.Element | null> = {
  home: Home, catalog: Catalog, detail: Detail, cart: Cart, checkout: Checkout, success: Success, orders: Orders,
}

export function App() {
  const { state, actions } = useMini()

  if (state.booting) {
    return (
      <Shell>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#A99681', fontSize: 14, fontWeight: 600 }}>Memuat…</div>
      </Shell>
    )
  }
  if (state.fatal) {
    return (
      <Shell>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 28, textAlign: 'center', gap: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#3B2A20' }}>Gagal memuat</div>
          <div style={{ fontSize: 13, color: '#8A7263', lineHeight: 1.5 }}>{state.fatal}</div>
        </div>
      </Shell>
    )
  }

  const screen = state.screen
  const hd = HEADER[screen]
  const isDark = screen === 'home'
  const cartCount = state.cart.reduce((sum, c) => sum + c.qty, 0)
  const cartTotal = state.cart.reduce((sum, c) => sum + c.unit * c.qty, 0)
  const ScreenComp = SCREENS[screen]
  const main = mainButton(screen, cartCount, cartTotal, state, actions)

  const headerBg = isDark ? '#C8472B' : '#F6EFE5'
  const ink = isDark ? '#fff' : '#3B2A20'
  const btnBg = isDark ? 'rgba(255,255,255,0.18)' : '#EFE3D5'

  return (
    <Shell>
      <header style={{ flexShrink: 0, background: headerBg, color: ink, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, minHeight: 58 }}>
        {hd.back && (
          <button onClick={actions.back} style={{ border: 'none', background: btnBg, color: 'inherit', width: 36, height: 36, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon d={PATH.back} size={19} width={2.4} />
          </button>
        )}
        {hd.logo && (
          <div style={{ width: 38, height: 38, borderRadius: 12, background: isDark ? '#fff' : '#C8472B', color: isDark ? '#C8472B' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 800, flexShrink: 0 }}>D</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 19, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{hd.title}</div>
          {hd.sub && <div style={{ fontSize: 11.5, opacity: 0.7, fontWeight: 600, marginTop: 1 }}>{hd.sub}</div>}
        </div>
        <button onClick={() => actions.go('cart')} title="Keranjang" style={{ position: 'relative', border: 'none', background: btnBg, color: 'inherit', width: 38, height: 38, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon d="M6 6h15l-1.5 9h-12zM6 6 5 3H2M9 20a.01.01 0 1 0 0-.02M18 20a.01.01 0 1 0 0-.02" size={19} />
          {cartCount > 0 && (
            <span style={{ position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, padding: '0 4px', background: '#FFD24A', color: '#3B2A20', borderRadius: 99, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${headerBg}` }}>{cartCount}</span>
          )}
        </button>
      </header>

      <div className="dd-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden' }}>
        <ScreenComp />
      </div>

      {main && (
        <div style={{ flexShrink: 0, padding: '12px 16px 16px', background: 'linear-gradient(to top, #F6EFE5 70%, rgba(246,239,229,0))', borderTop: `1px solid ${isDark ? 'transparent' : '#EFE3D5'}` }}>
          <button onClick={main.action} style={{ width: '100%', border: 'none', background: main.bg, color: main.color, fontSize: 15, fontWeight: 700, borderRadius: 14, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 6px 18px rgba(200,71,43,0.28)' }}>
            <span>{main.label}</span>
            {main.amount && <span style={{ background: 'rgba(255,255,255,0.22)', borderRadius: 8, padding: '3px 9px', fontSize: 13.5, fontWeight: 800 }}>{main.amount}</span>}
          </button>
        </div>
      )}

      {state.toast && (
        <div style={{ position: 'fixed', bottom: 96, left: '50%', transform: 'translateX(-50%)', background: '#2B1D12', color: '#F6EFE5', fontSize: 13, fontWeight: 600, padding: '11px 18px', borderRadius: 99, boxShadow: '0 8px 24px rgba(43,29,18,0.3)', whiteSpace: 'nowrap', zIndex: 50, animation: 'ddToast 0.2s ease' }}>{state.toast}</div>
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F6EFE5', display: 'flex', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 440, minHeight: '100vh', maxHeight: '100vh', background: '#F6EFE5', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>{children}</div>
    </div>
  )
}

type MainCfg = { label: string; amount?: string; action: () => void; bg: string; color: string }

function mainButton(screen: Screen, cartCount: number, cartTotal: number, state: ReturnType<typeof useMini>['state'], actions: ReturnType<typeof useMini>['actions']): MainCfg | null {
  const red = { bg: '#C8472B', color: '#fff' }
  switch (screen) {
    case 'home':
      return { label: 'Mulai Pesan', action: () => actions.go('catalog'), ...red }
    case 'catalog':
      return cartCount > 0 ? { label: `Lihat Keranjang (${cartCount})`, amount: fmt(cartTotal), action: () => actions.go('cart'), ...red } : null
    case 'detail': {
      const menu = state.menus.find((m) => m.id === state.activeMenuId)
      const unit = menu ? (menu.variants[state.dVariantIdx]?.price ?? 0) + menu.addons.filter((a) => state.dAddonMenuIds.includes(a.menuId)).reduce((s, a) => s + a.price, 0) : 0
      return { label: 'Tambah ke Keranjang', amount: fmt(unit * state.dQty), action: actions.addToCart, ...red }
    }
    case 'cart':
      return cartCount > 0 ? { label: 'Checkout', amount: fmt(cartTotal), action: () => actions.go('checkout'), ...red } : null
    case 'checkout':
      return { label: 'Buat Pesanan', amount: fmt(cartTotal), action: () => void actions.placeOrder(), ...red }
    case 'success':
      return { label: 'Kembali ke Beranda', action: () => actions.go('home'), bg: '#2B1D12', color: '#F6EFE5' }
    default:
      return null
  }
}
