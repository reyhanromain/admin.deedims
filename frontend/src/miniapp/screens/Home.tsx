import { useMini } from '../store'
import { fulfillmentLabel, priceLabel, STATUS } from '../helpers'
import { ImageSlot, Icon, PATH } from '../ui'

export function Home() {
  const { state, actions } = useMini()
  const { po, menus, orders } = state
  const latest = orders[0]
  const latestStatus = latest ? STATUS[latest.status] : null

  return (
    <div style={{ padding: '16px 16px 24px', animation: 'ddScreen 0.25s ease' }}>
      {/* PO hero */}
      <div style={{ background: 'linear-gradient(135deg, #C8472B 0%, #A93A22 100%)', borderRadius: 22, padding: 20, color: '#fff', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: 99, background: 'rgba(255,255,255,0.08)' }} />
        <div style={{ position: 'absolute', right: 18, bottom: -36, width: 96, height: 96, borderRadius: 99, background: 'rgba(255,255,255,0.06)' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.16)', borderRadius: 99, padding: '4px 11px', fontSize: 11.5, fontWeight: 700 }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: po ? '#8CE0A8' : '#F0C9A0', display: 'inline-block' }} />
            {po ? 'Pre-order DIBUKA' : 'Pre-order ditutup'}
          </div>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 23, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 12, lineHeight: 1.15 }}>
            {po?.title || 'Belum ada pre-order'}
          </div>
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 6, lineHeight: 1.45 }}>
            {po?.description || 'Nantikan batch berikutnya ya.'}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
            <div>
              <div style={{ fontSize: 10.5, opacity: 0.75, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Ambil</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{po ? fulfillmentLabel(po.fulfillmentStart, po.fulfillmentEnd) : '—'}</div>
            </div>
            <div style={{ width: 1, background: 'rgba(255,255,255,0.2)' }} />
            <div>
              <div style={{ fontSize: 10.5, opacity: 0.75, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Bayar</div>
              <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>COD / Pickup</div>
            </div>
          </div>
        </div>
      </div>

      {/* quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
        <button onClick={() => actions.go('catalog')} style={quickBtn}>
          <div style={{ ...quickIcon, background: '#FBEAE4', color: '#C8472B' }}>
            <Icon d="M3 9h18M9 21V9" size={18} />
          </div>
          <div>
            <div style={quickTitle}>Lihat Menu</div>
            <div style={quickSub}>{menus.length} menu tersedia</div>
          </div>
        </button>
        <button onClick={() => actions.go('orders')} style={quickBtn}>
          <div style={{ ...quickIcon, background: '#E6F0E9', color: '#2E5A43' }}>
            <Icon d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" size={18} />
          </div>
          <div>
            <div style={quickTitle}>Pesanan Saya</div>
            <div style={quickSub}>{orders.length} pesanan</div>
          </div>
        </button>
      </div>

      {/* latest order */}
      {latest && latestStatus && (
        <button onClick={() => actions.go('orders')} style={{ width: '100%', textAlign: 'left', marginTop: 14, background: '#fff', border: '1px solid #EFE3D5', borderRadius: 16, padding: '14px 15px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: latestStatus.bg, color: latestStatus.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: '#8A7263', fontWeight: 600 }}>Order terakhir · {latest.code}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#3B2A20', marginTop: 2 }}>{latestStatus.label}</div>
          </div>
          <Icon d={PATH.chevronRight} size={18} stroke="#A99681" width={2.2} />
        </button>
      )}

      {/* featured */}
      {menus.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '22px 2px 12px' }}>
            <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 17, fontWeight: 700, color: '#3B2A20', letterSpacing: '-0.01em' }}>Paling Dicari</div>
            <button onClick={() => actions.go('catalog')} style={{ border: 'none', background: 'none', color: '#C8472B', fontSize: 12.5, fontWeight: 700 }}>Semua →</button>
          </div>
          <div className="dd-scroll" style={{ display: 'flex', gap: 12, overflowX: 'auto', margin: '0 -16px', padding: '0 16px 4px', scrollSnapType: 'x mandatory' }}>
            {menus.slice(0, 6).map((m) => (
              <button key={m.id} onClick={() => actions.openDetail(m.id)} style={{ flex: '0 0 158px', scrollSnapAlign: 'start', background: '#fff', border: '1px solid #EFE3D5', borderRadius: 18, overflow: 'hidden', textAlign: 'left', padding: 0 }}>
                <ImageSlot src={m.image} label={`Foto ${m.name}`} style={{ width: '100%', height: 116 }} />
                <div style={{ padding: '11px 12px 13px' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#3B2A20', lineHeight: 1.25 }}>{m.name}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#C8472B', marginTop: 6, fontFamily: "'Bricolage Grotesque', sans-serif" }}>{priceLabel(m)}</div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {po?.note && (
        <div style={{ marginTop: 18, background: '#FDFAF5', border: '1px dashed #E4D5C3', borderRadius: 16, padding: '14px 15px', display: 'flex', gap: 11, alignItems: 'flex-start' }}>
          <Icon d="M12 16v-4M12 8h.01" size={18} stroke="#9A6516" />
          <div style={{ fontSize: 12, color: '#8A7263', lineHeight: 1.5 }}><strong style={{ color: '#3B2A20' }}>{po.note}</strong></div>
        </div>
      )}
    </div>
  )
}

const quickBtn = { border: '1px solid #EFE3D5', background: '#fff', borderRadius: 16, padding: 14, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 8 } as const
const quickIcon = { width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' } as const
const quickTitle = { fontSize: 13.5, fontWeight: 700, color: '#3B2A20' } as const
const quickSub = { fontSize: 11, color: '#8A7263', marginTop: 1 } as const
