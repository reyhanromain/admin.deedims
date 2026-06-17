import { useAdmin } from '../store'
import { getTheme, BRAND, ICONS, SCREEN_NAV } from '../theme'
import { HoverButton, Icon } from '../ui'

export function Sidebar() {
  const s = useAdmin()
  const t = getTheme(s.dark)

  // Badge global dari ringkasan dashboard (dimuat saat boot).
  const orderBadge = s.dashboard ? s.dashboard.kpis.newOrders + s.dashboard.kpis.cancelRequests : 0

  const showLabels = !s.sidebarCollapsed
  const justify = s.sidebarCollapsed ? 'center' : 'flex-start'

  return (
    <aside
      style={{
        width: s.sidebarCollapsed ? 66 : 232,
        flexShrink: 0,
        background: t.sideBg,
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 12px',
        transition: 'width 0.2s ease',
      }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: justify, gap: 10,
          padding: '4px 8px 18px 8px', borderBottom: `1px solid ${t.sideBorder}`, marginBottom: 14,
        }}
      >
        <div
          style={{
            width: 38, height: 38, flexShrink: 0, borderRadius: 12, background: BRAND.terracotta, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 19, fontWeight: 800,
          }}
        >
          D
        </div>
        {showLabels && (
          <div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: '-0.02em', color: t.sideInk }}>
              Deedims
            </div>
            <div style={{ fontSize: 11, color: t.sideMuted, fontWeight: 500 }}>Admin CMS</div>
          </div>
        )}
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {SCREEN_NAV.map((nv) => {
          const active = s.screen === nv.id
          const hasBadge = nv.id === 'orders' && orderBadge > 0
          return (
            <HoverButton
              key={nv.id}
              onClick={() => s.goScreen(nv.id)}
              title={nv.label}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: justify, gap: 10,
                padding: '10px 12px', border: 'none', borderRadius: 10,
                background: active ? BRAND.terracotta : 'transparent',
                color: active ? '#fff' : t.sideText,
                fontSize: 13.5, fontWeight: active ? 700 : 600, textAlign: 'left', transition: 'filter 0.15s',
              }}
              hover={{ filter: 'brightness(1.18)' }}
            >
              <Icon path={ICONS[nv.id]} size={18} style={{ flexShrink: 0 }} />
              {showLabels && (
                <>
                  <span style={{ flex: 1 }}>{nv.label}</span>
                  {hasBadge && (
                    <span style={{ background: BRAND.terracotta, color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 99, padding: '1px 7px' }}>
                      {orderBadge}
                    </span>
                  )}
                </>
              )}
            </HoverButton>
          )
        })}
      </nav>

      <HoverButton
        onClick={() => s.set({ sidebarCollapsed: !s.sidebarCollapsed })}
        title="Minimize sidebar"
        style={{
          marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: justify, gap: 10,
          padding: '10px 12px', border: 'none', borderRadius: 10, background: 'transparent',
          color: t.sideMuted, fontSize: 13, fontWeight: 600,
        }}
        hover={{ filter: 'brightness(1.3)' }}
      >
        <Icon
          path={s.sidebarCollapsed ? 'M13 17l5-5-5-5 M6 17l5-5-5-5' : 'M11 17l-5-5 5-5 M18 17l-5-5 5-5'}
          size={18}
          style={{ flexShrink: 0 }}
        />
        {showLabels && <span style={{ flex: 1 }}>Minimize</span>}
      </HoverButton>
    </aside>
  )
}
