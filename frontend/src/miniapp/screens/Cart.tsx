import { useMini } from '../store'
import { fmt } from '../helpers'
import { ImageSlot, Icon, PATH } from '../ui'
import type { CartItem } from '../types'

function metaLine(c: CartItem): string {
  const parts: string[] = []
  if (c.variantName) parts.push(c.variantName)
  if (c.addons.length) parts.push(`+${c.addons.length} add-on`)
  return parts.length ? '· ' + parts.join(' · ') : ''
}

export function Cart() {
  const { state, actions } = useMini()
  const { cart } = state
  const total = cart.reduce((sum, c) => sum + c.unit * c.qty, 0)
  const count = cart.reduce((sum, c) => sum + c.qty, 0)

  if (count === 0) {
    return (
      <div style={{ padding: '14px 16px 24px', animation: 'ddScreen 0.25s ease' }}>
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ width: 76, height: 76, borderRadius: 99, background: '#F4ECE0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <Icon d="M6 6h15l-1.5 9h-12zM6 6 5 3H2" size={34} stroke="#C8A98B" width={1.8} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#3B2A20' }}>Keranjang masih kosong</div>
          <div style={{ fontSize: 13, color: '#8A7263', marginTop: 6, lineHeight: 1.5 }}>Yuk pilih dimsum favoritmu<br />sebelum PO ditutup.</div>
          <button onClick={() => actions.go('catalog')} style={{ marginTop: 20, border: 'none', background: '#C8472B', color: '#fff', fontSize: 14, fontWeight: 700, borderRadius: 13, padding: '13px 28px' }}>Lihat Menu</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '14px 16px 24px', animation: 'ddScreen 0.25s ease' }}>
      {/* count + style toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 12.5, color: '#8A7263', fontWeight: 600 }}>{count} item</div>
        <div style={{ display: 'flex', background: '#EDE0CF', borderRadius: 10, padding: 3 }}>
          <button onClick={() => actions.setCartStyle('card')} style={styleBtn(state.cartStyle === 'card')}>Kartu</button>
          <button onClick={() => actions.setCartStyle('compact')} style={styleBtn(state.cartStyle === 'compact')}>Ringkas</button>
        </div>
      </div>

      {state.cartStyle === 'card' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cart.map((c) => (
            <div key={c.uid} style={{ background: '#fff', border: '1px solid #EFE3D5', borderRadius: 16, padding: 12, display: 'flex', gap: 12 }}>
              <ImageSlot src={c.slotImage} label="Foto" radius={12} style={{ width: 72, height: 72, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#3B2A20', lineHeight: 1.25 }}>{c.name}</div>
                  <button onClick={() => actions.removeItem(c.uid)} style={{ border: 'none', background: 'none', color: '#C8A99B', padding: 0, flexShrink: 0 }}>
                    <Icon d={PATH.trash} size={17} />
                  </button>
                </div>
                <div style={{ fontSize: 11.5, color: '#8A7263', marginTop: 3 }}>{c.variantName ? `Varian: ${c.variantName}` : 'Standar'}</div>
                {c.addons.length > 0 && <div style={{ fontSize: 11, color: '#9A6516', marginTop: 2 }}>+ {c.addons.map((a) => a.name).join(', ')}</div>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                  <Stepper qty={c.qty} onDec={() => actions.decItem(c.uid)} onInc={() => actions.incItem(c.uid)} />
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#3B2A20', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{fmt(c.unit * c.qty)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #EFE3D5', borderRadius: 16, overflow: 'hidden' }}>
          {cart.map((c, idx) => (
            <div key={c.uid} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 13px', borderBottom: `1px solid ${idx === cart.length - 1 ? 'transparent' : '#F5EDE2'}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#3B2A20' }}>{c.name}</div>
                <div style={{ fontSize: 11, color: '#8A7263', marginTop: 2 }}>{metaLine(c)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
                <button onClick={() => actions.decItem(c.uid)} style={{ border: '1px solid #EFE3D5', background: '#fff', color: '#8A7263', width: 26, height: 26, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon d={PATH.minus} size={13} width={3} /></button>
                <span style={{ fontSize: 13.5, fontWeight: 800, minWidth: 14, textAlign: 'center', color: '#3B2A20' }}>{c.qty}</span>
                <button onClick={() => actions.incItem(c.uid)} style={{ border: 'none', background: '#2B1D12', color: '#fff', width: 26, height: 26, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon d={PATH.plus} size={13} width={3} /></button>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#3B2A20', minWidth: 74, textAlign: 'right', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{fmt(c.unit * c.qty)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button onClick={() => actions.go('catalog')} style={{ width: '100%', marginTop: 12, border: '1.5px dashed #E4D5C3', background: 'none', color: '#C8472B', fontSize: 13, fontWeight: 700, borderRadius: 13, padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
        <Icon d={PATH.plus} size={16} width={2.4} />Tambah menu lain
      </button>

      <div style={{ marginTop: 16, background: '#FDFAF5', border: '1px solid #EFE3D5', borderRadius: 16, padding: 15 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#8A7263', marginBottom: 8 }}><span>Subtotal</span><span style={{ fontWeight: 700, color: '#3B2A20' }}>{fmt(total)}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#8A7263', marginBottom: 8 }}><span>Ongkir</span><span style={{ fontWeight: 700, color: '#2E5A43' }}>COD / Pickup</span></div>
        <div style={{ borderTop: '1px dashed #E4D5C3', margin: '11px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><span style={{ fontSize: 14, fontWeight: 700, color: '#3B2A20' }}>Total</span><span style={{ fontSize: 19, fontWeight: 800, color: '#C8472B', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{fmt(total)}</span></div>
      </div>
    </div>
  )
}

function Stepper({ qty, onDec, onInc }: { qty: number; onDec: () => void; onInc: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FDFAF5', border: '1px solid #EFE3D5', borderRadius: 10, padding: 3 }}>
      <button onClick={onDec} style={{ background: '#fff', border: '1px solid #EFE3D5', color: '#3B2A20', width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon d={PATH.minus} size={14} width={2.8} /></button>
      <span style={{ fontSize: 14, fontWeight: 800, minWidth: 18, textAlign: 'center', color: '#3B2A20' }}>{qty}</span>
      <button onClick={onInc} style={{ border: 'none', background: '#C8472B', color: '#fff', width: 28, height: 28, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon d={PATH.plus} size={14} width={2.8} /></button>
    </div>
  )
}

const styleBtn = (on: boolean) => ({ border: 'none', background: on ? '#fff' : 'transparent', color: on ? '#C8472B' : '#9A8474', fontSize: 12, fontWeight: 700, borderRadius: 8, padding: '6px 13px' } as const)
