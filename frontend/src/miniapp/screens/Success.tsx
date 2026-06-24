import { useMini } from '../store'
import { fmt } from '../helpers'
import { Icon, PATH } from '../ui'

export function Success() {
  const { state, actions } = useMini()
  const last = state.lastOrder

  return (
    <div style={{ padding: '40px 24px', textAlign: 'center', animation: 'ddScreen 0.25s ease' }}>
      <div style={{ width: 92, height: 92, borderRadius: 99, background: '#E6F0E9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px', animation: 'ddPop 0.4s cubic-bezier(0.2,0.9,0.3,1.4)' }}>
        <Icon d={PATH.check} size={46} stroke="#2E5A43" width={2.4} />
      </div>
      <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 800, color: '#3B2A20', letterSpacing: '-0.02em' }}>Pesanan terkirim!</div>
      <div style={{ fontSize: 13.5, color: '#8A7263', marginTop: 8, lineHeight: 1.5, maxWidth: 280, marginLeft: 'auto', marginRight: 'auto' }}>
        Pesananmu masuk ke admin Deedims. Cek status &amp; konfirmasi pembayaran di Pesanan Saya.
      </div>
      <div style={{ marginTop: 22, background: '#fff', border: '1px solid #EFE3D5', borderRadius: 16, padding: 16, textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#8A7263', fontWeight: 600 }}>Kode order</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#3B2A20', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{last?.code ?? '—'}</span>
        </div>
        <div style={{ borderTop: '1px solid #F5EDE2', margin: '12px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#8A7263', fontWeight: 600 }}>Status</span>
          <span style={{ background: '#FBF0DC', color: '#9A6516', fontSize: 11.5, fontWeight: 700, borderRadius: 99, padding: '4px 11px' }}>Menunggu konfirmasi</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 11 }}>
          <span style={{ fontSize: 12, color: '#8A7263', fontWeight: 600 }}>Total</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#C8472B', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{fmt(last?.total ?? 0)}</span>
        </div>
      </div>
      <button onClick={() => actions.go('orders')} style={{ width: '100%', marginTop: 14, border: '1px solid #E4D5C3', background: '#fff', color: '#3B2A20', fontSize: 14, fontWeight: 700, borderRadius: 13, padding: 13 }}>Lihat Pesanan Saya</button>
    </div>
  )
}
