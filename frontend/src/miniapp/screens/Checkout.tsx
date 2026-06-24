import { useMini } from '../store'
import { fmt } from '../helpers'
import type { CartItem } from '../types'

function metaLine(c: CartItem): string {
  const parts: string[] = []
  if (c.variantName) parts.push(c.variantName)
  if (c.addons.length) parts.push(`+${c.addons.length} add-on`)
  return parts.length ? '· ' + parts.join(' · ') : ''
}

const METHODS = [
  { key: 'cod', label: 'COD', sub: 'Bayar saat terima' },
  { key: 'pickup', label: 'Pickup', sub: 'Ambil di lokasi' },
] as const

export function Checkout() {
  const { state, actions } = useMini()
  const { cart, coMethod } = state
  const total = cart.reduce((sum, c) => sum + c.unit * c.qty, 0)

  return (
    <div style={{ padding: '16px 16px 24px', animation: 'ddScreen 0.25s ease' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#3B2A20', marginBottom: 10 }}>Data penerima</div>
      <div style={{ background: '#fff', border: '1px solid #EFE3D5', borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={fieldLabel}>Nama</label>
          <input value={state.coName} onChange={(e) => actions.setCheckout({ coName: e.target.value })} style={input} />
        </div>
        <div>
          <label style={fieldLabel}>No. WhatsApp</label>
          <input value={state.coPhone} onChange={(e) => actions.setCheckout({ coPhone: e.target.value })} placeholder="0812-3456-7890" style={input} />
        </div>
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: '#3B2A20', margin: '18px 0 10px' }}>Metode ambil</div>
      <div style={{ display: 'flex', gap: 10 }}>
        {METHODS.map((m) => {
          const on = coMethod === m.key
          return (
            <button key={m.key} onClick={() => actions.setCheckout({ coMethod: m.key })} style={{ flex: 1, border: `1.5px solid ${on ? '#C8472B' : '#EFE3D5'}`, background: on ? '#FBEAE4' : '#fff', borderRadius: 14, padding: '13px 12px', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#3B2A20' }}>{m.label}</span>
                <span style={{ width: 18, height: 18, borderRadius: 99, border: `2px solid ${on ? '#C8472B' : '#D4C4B0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {on && <span style={{ width: 9, height: 9, borderRadius: 99, background: '#C8472B' }} />}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#8A7263', marginTop: 4 }}>{m.sub}</div>
            </button>
          )
        })}
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: '#3B2A20', margin: '18px 0 10px' }}>{coMethod === 'pickup' ? 'Catatan (waktu ambil, dll)' : 'Catatan & alamat'}</div>
      <textarea
        value={state.coNote}
        onChange={(e) => actions.setCheckout({ coNote: e.target.value })}
        placeholder={coMethod === 'pickup' ? 'Mis. ambil sore jam 4' : 'Mis. patokan alamat, jam kirim...'}
        rows={3}
        style={{ width: '100%', padding: 12, border: '1px solid #E4D5C3', borderRadius: 13, fontSize: 13.5, color: '#3B2A20', outline: 'none', background: '#fff', resize: 'none', lineHeight: 1.5 }}
      />

      <div style={{ fontSize: 13, fontWeight: 700, color: '#3B2A20', margin: '18px 0 10px' }}>Ringkasan pesanan</div>
      <div style={{ background: '#fff', border: '1px solid #EFE3D5', borderRadius: 16, padding: 14 }}>
        {cart.map((c) => (
          <div key={c.uid} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '7px 0' }}>
            <div style={{ fontSize: 12.5, color: '#3B2A20' }}><span style={{ fontWeight: 700 }}>{c.qty}×</span> {c.name} <span style={{ color: '#A99681' }}>{metaLine(c)}</span></div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#3B2A20', flexShrink: 0 }}>{fmt(c.unit * c.qty)}</div>
          </div>
        ))}
        <div style={{ borderTop: '1px dashed #E4D5C3', margin: '9px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#3B2A20' }}>Total bayar</div>
            <div style={{ fontSize: 11, color: '#2E5A43', fontWeight: 700, marginTop: 2 }}>💵 Bayar saat terima (COD)</div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#C8472B', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{fmt(total)}</div>
        </div>
      </div>
    </div>
  )
}

const fieldLabel = { display: 'block', fontSize: 11.5, fontWeight: 700, color: '#8A7263', marginBottom: 5 } as const
const input = { width: '100%', padding: '11px 12px', border: '1px solid #E4D5C3', borderRadius: 11, fontSize: 13.5, color: '#3B2A20', outline: 'none', background: '#FDFAF5' } as const
