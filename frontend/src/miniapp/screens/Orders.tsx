import { useMini } from '../store'
import { fmt, fmtDate, STATUS, STEP_HINT, STEP_LABEL, STEP_ORDER } from '../helpers'
import { Icon, PATH } from '../ui'
import type { OrderDetail, OrderRow } from '../types'

export function Orders() {
  const { state, actions } = useMini()
  const { orders } = state

  if (orders.length === 0) {
    return (
      <div style={{ padding: '14px 16px 24px', animation: 'ddScreen 0.25s ease' }}>
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ width: 76, height: 76, borderRadius: 99, background: '#F4ECE0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <Icon d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" size={34} stroke="#C8A98B" width={1.8} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#3B2A20' }}>Belum ada pesanan</div>
          <div style={{ fontSize: 13, color: '#8A7263', marginTop: 6 }}>Pesanan kamu akan muncul di sini.</div>
          <button onClick={() => actions.go('catalog')} style={{ marginTop: 20, border: 'none', background: '#C8472B', color: '#fff', fontSize: 14, fontWeight: 700, borderRadius: 13, padding: '13px 28px' }}>Mulai Pesan</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '14px 16px 24px', animation: 'ddScreen 0.25s ease' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {orders.map((o) => (
          <OrderCard key={o.id} order={o} expanded={state.expandedOrderId === o.id} detail={state.orderDetails[o.id]} onToggle={() => actions.toggleOrder(o.id)} onCancel={() => actions.cancelOrder(o.id)} />
        ))}
      </div>
    </div>
  )
}

function OrderCard({ order, expanded, detail, onToggle, onCancel }: { order: OrderRow; expanded: boolean; detail?: OrderDetail; onToggle: () => void; onCancel: () => void }) {
  const st = STATUS[order.status]
  const cancelled = order.cancelled || order.status === 'cancelled'
  const curIdx = STEP_ORDER.indexOf(order.status)
  const summary = order.summary.length > 38 ? order.summary.slice(0, 36) + '…' : order.summary

  return (
    <div style={{ background: '#fff', border: '1px solid #EFE3D5', borderRadius: 16, overflow: 'hidden' }}>
      <button onClick={onToggle} style={{ width: '100%', border: 'none', background: 'none', padding: '14px 15px', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#3B2A20', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{order.code}</span>
            <span style={{ background: st.bg, color: st.color, fontSize: 10.5, fontWeight: 700, borderRadius: 99, padding: '3px 9px' }}>{st.label}</span>
          </div>
          <div style={{ fontSize: 11.5, color: '#8A7263', marginTop: 4 }}>{summary} · {fmtDate(order.createdAt)}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#C8472B', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{fmt(order.total)}</div>
          <div style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', marginTop: 4, marginLeft: 'auto', width: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <Icon d={PATH.chevronDown} size={16} stroke="#A99681" width={2.2} />
          </div>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: '0 15px 15px' }}>
          <div style={{ borderTop: '1px solid #F5EDE2', paddingTop: 14 }}>
            {!detail ? (
              <div style={{ fontSize: 12.5, color: '#A99681' }}>Memuat detail…</div>
            ) : (
              <>
                {detail.items.filter((it) => !it.isAddon).map((it, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '4px 0' }}>
                    <div style={{ fontSize: 12.5, color: '#3B2A20' }}>
                      <span style={{ fontWeight: 700 }}>{it.quantity}×</span> {it.name} <span style={{ color: '#A99681' }}>{it.variant ? `· ${it.variant}` : ''}</span>
                    </div>
                  </div>
                ))}

                {!cancelled && (
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {STEP_ORDER.map((k, i) => {
                      const done = i <= curIdx
                      const active = i === curIdx
                      const showLine = i < STEP_ORDER.length - 1
                      return (
                        <div key={k} style={{ display: 'flex', gap: 12 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <span style={{ width: 22, height: 22, borderRadius: 99, background: done ? '#2E5A43' : '#fff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `2px solid ${done ? '#2E5A43' : '#E4D5C3'}` }}>
                              {done && <Icon d={PATH.check} size={11} width={3.5} />}
                            </span>
                            {showLine && <span style={{ width: 2, flex: 1, minHeight: 22, background: i < curIdx ? '#2E5A43' : '#EFE3D5' }} />}
                          </div>
                          <div style={{ paddingBottom: 14 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: done ? '#3B2A20' : '#A99681' }}>{STEP_LABEL[k]}</div>
                            <div style={{ fontSize: 11, color: '#A99681', marginTop: 1 }}>{active ? STEP_HINT[k] : done ? 'Selesai' : 'Menunggu'}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {cancelled && (
                  <div style={{ marginTop: 12, background: '#FBEAE4', borderRadius: 11, padding: '11px 13px', fontSize: 12, color: '#B0421F', fontWeight: 600 }}>Pesanan ini dibatalkan.</div>
                )}

                {detail.canCancel && (
                  <button onClick={onCancel} style={{ width: '100%', marginTop: 14, border: '1px solid #F0CDBF', background: '#fff', color: '#B0421F', fontSize: 12.5, fontWeight: 700, borderRadius: 11, padding: 11 }}>Ajukan pembatalan</button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
