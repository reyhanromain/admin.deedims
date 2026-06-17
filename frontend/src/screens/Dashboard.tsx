import { useAdmin } from '../store'
import { getTheme, BRAND, LOW_STOCK_THRESHOLD, orderStatusBadge } from '../theme'
import { fmt } from '../format'
import { cardStyle } from '../styles'
import { HoverButton, Pill } from '../ui'

export function Dashboard() {
  const s = useAdmin()
  const t = getTheme(s.dark)
  const status = orderStatusBadge(s.dark)
  const d = s.dashboard
  if (!d) return null

  const openPo = d.openPreorder
  void LOW_STOCK_THRESHOLD

  const kpis = [
    { label: 'Order baru', value: String(d.kpis.newOrders), sub: 'menunggu konfirmasi', color: d.kpis.newOrders > 0 ? t.red : t.ink },
    { label: 'Order batch ini', value: String(d.kpis.batchOrders), sub: openPo ? openPo.title : 'tidak ada PO open', color: t.ink },
    { label: 'Revenue batch', value: fmt(d.kpis.batchRevenue), sub: 'di luar order cancelled', color: t.green },
    { label: 'Cancel request', value: String(d.kpis.cancelRequests), sub: 'perlu review admin', color: d.kpis.cancelRequests > 0 ? t.red : t.ink },
  ]

  return (
    <section>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14, marginBottom: 22 }}>
        {kpis.map((k) => (
          <div key={k.label} style={cardStyle(t, { padding: '18px 20px' })}>
            <div style={{ fontSize: 12, fontWeight: 600, color: t.muted, marginBottom: 8 }}>{k.label}</div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: k.color }}>
              {k.value}
            </div>
            <div style={{ fontSize: 12, color: t.faint, marginTop: 4 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, alignItems: 'start' }}>
        <div style={cardStyle(t, { padding: '20px 22px' })}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>Order masuk terbaru</h2>
            <button
              onClick={() => s.set({ screen: 'orders', orderFilter: 'all', selectedOrderId: null })}
              style={{ border: 'none', background: 'none', color: BRAND.terracotta, fontSize: 12.5, fontWeight: 700, padding: 4 }}
            >
              Lihat semua →
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.recentOrders.length === 0 && <div style={{ fontSize: 13, color: t.muted }}>Belum ada order di batch ini.</div>}
            {d.recentOrders.map((o) => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', border: `1px solid ${t.rowBorder}`, borderRadius: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{o.code} · {o.customer}</div>
                  <div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>{o.itemsSummary}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{fmt(o.total)}</div>
                <Pill bg={status[o.status].bg} color={status[o.status].color}>{status[o.status].label}</Pill>
                {o.status === 'submitted' && (
                  <HoverButton
                    onClick={() => { s.patchOrder(o.id, { status: 'confirmed' }); s.showToast('Order ' + o.code + ' dikonfirmasi') }}
                    style={{ border: 'none', background: BRAND.terracotta, color: '#fff', fontSize: 12, fontWeight: 700, borderRadius: 9, padding: '7px 12px' }}
                    hover={{ background: BRAND.terracottaDark }}
                  >
                    Confirm
                  </HoverButton>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: BRAND.bamboo, color: '#F2F7F0', borderRadius: 16, padding: '20px 22px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', opacity: 0.7, marginBottom: 6 }}>
              Batch aktif
            </div>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 19, fontWeight: 700, marginBottom: 4 }}>
              {openPo ? openPo.title : 'Belum ada batch open'}
            </div>
            <div style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.5, marginBottom: 14 }}>
              {openPo ? 'Fulfillment ' + openPo.date + ' · ' + openPo.note : 'Buka batch pre-order agar customer bisa mulai order.'}
            </div>
            <HoverButton
              onClick={() => s.set({ screen: 'preorders' })}
              style={{ border: 'none', background: 'rgba(255,255,255,0.14)', color: '#fff', fontSize: 12.5, fontWeight: 700, borderRadius: 10, padding: '9px 16px' }}
              hover={{ background: 'rgba(255,255,255,0.24)' }}
            >
              {openPo ? 'Kelola pre-order →' : 'Buka pre-order →'}
            </HoverButton>
          </div>

          <div style={cardStyle(t, { padding: '20px 22px' })}>
            <h2 style={{ margin: '0 0 12px 0', fontSize: 15, fontWeight: 700 }}>Stock menipis</h2>
            {d.lowStock.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {d.lowStock.map((ls) => (
                  <div key={ls.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '9px 12px', background: t.warnBg, borderRadius: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{ls.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: t.warnColor }}>{ls.quantity} {ls.unit}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: t.muted }}>Semua stock aman.</div>
            )}
            <button
              onClick={() => s.set({ screen: 'stock' })}
              style={{ marginTop: 12, border: 'none', background: 'none', color: BRAND.terracotta, fontSize: 12.5, fontWeight: 700, padding: 0 }}
            >
              Kelola stock →
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
