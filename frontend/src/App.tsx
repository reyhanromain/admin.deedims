import { useAdmin } from './store'
import { getTheme } from './theme'
import { Login } from './components/Login'
import { Sidebar } from './components/Sidebar'
import { Header } from './components/Header'
import { Toast } from './components/Toast'
import { Lightbox } from './components/Lightbox'
import { MenuEditorModal } from './components/MenuEditorModal'
import { UserEditorModal } from './components/UserEditorModal'
import { Dashboard } from './screens/Dashboard'
import { Preorders } from './screens/Preorders'
import { Orders } from './screens/Orders'
import { Customers } from './screens/Customers'
import { Menus } from './screens/Menus'
import { Stock } from './screens/Stock'
import { Subscribers } from './screens/Subscribers'
import { Users } from './screens/Users'
import { Settings } from './screens/Settings'

const SCREENS = {
  dashboard: Dashboard,
  preorders: Preorders,
  orders: Orders,
  customers: Customers,
  menus: Menus,
  stock: Stock,
  subscribers: Subscribers,
  users: Users,
  settings: Settings,
}

export function App() {
  const s = useAdmin()
  const t = getTheme(s.dark)

  const root = {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    color: t.ink,
    background: t.bg,
    colorScheme: t.scheme,
    height: '100vh',
    overflow: 'hidden',
  } as const

  if (s.booting) {
    return (
      <div style={{ ...root, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: t.muted }}>
        Memuat…
      </div>
    )
  }

  if (!s.authed) {
    return (
      <div style={root}>
        <Login />
        <Toast />
      </div>
    )
  }

  const ScreenComponent = SCREENS[s.screen]
  const ready = s.isScreenReady()

  return (
    <div style={root}>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Header />
          <div style={{ flex: 1, overflow: 'auto', padding: '26px 28px' }}>
            {ready ? (
              <ScreenComponent />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: 14, color: t.muted }}>
                Memuat…
              </div>
            )}
          </div>
        </main>
      </div>

      <MenuEditorModal />
      <UserEditorModal />
      <Lightbox />
      <Toast />
    </div>
  )
}
