import { useMini } from '../store'
import { fmt } from '../helpers'
import { ImageSlot, Icon, PATH } from '../ui'
import { imageFor } from '../../imageVariants'

export function Detail() {
  const { state, actions } = useMini()
  const menu = state.menus.find((m) => m.id === state.activeMenuId)
  if (!menu) return null
  const hasVariants = menu.variants.length > 1

  return (
    <div style={{ animation: 'ddScreen 0.25s ease' }}>
      <ImageSlot src={imageFor(menu.image, menu.imageVariants, 'detail')} label={`Foto ${menu.name}`} style={{ width: '100%', height: 230 }} />
      <div style={{ padding: '18px 16px 22px' }}>
        <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 21, fontWeight: 800, color: '#3B2A20', letterSpacing: '-0.02em', lineHeight: 1.15 }}>{menu.name}</div>
        <div style={{ fontSize: 13, color: '#8A7263', marginTop: 6, lineHeight: 1.5 }}>{menu.description}</div>

        {/* variants */}
        {hasVariants && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#3B2A20', marginBottom: 9 }}>Pilih varian</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {menu.variants.map((v, i) => {
                const on = i === state.dVariantIdx
                return (
                  <button key={v.id} onClick={() => actions.setVariant(i)} style={{ display: 'flex', alignItems: 'center', gap: 12, border: `1.5px solid ${on ? '#C8472B' : '#EFE3D5'}`, background: on ? '#FBEAE4' : '#fff', borderRadius: 13, padding: '12px 14px', textAlign: 'left' }}>
                    <span style={{ width: 20, height: 20, borderRadius: 99, border: `2px solid ${on ? '#C8472B' : '#D4C4B0'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {on && <span style={{ width: 10, height: 10, borderRadius: 99, background: '#C8472B', display: 'block' }} />}
                    </span>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#3B2A20' }}>{v.name ?? 'Standar'}</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: on ? '#C8472B' : '#8A7263', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{fmt(v.price)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* add-ons */}
        {menu.addons.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 9 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#3B2A20' }}>Tambahan</div>
              <div style={{ fontSize: 11.5, color: '#A99681' }}>opsional</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {menu.addons.map((a) => {
                const checked = state.dAddonMenuIds.includes(a.menuId)
                return (
                  <button key={a.menuId} onClick={() => actions.toggleAddon(a.menuId)} style={{ display: 'flex', alignItems: 'center', gap: 12, border: `1.5px solid ${checked ? '#C8472B' : '#EFE3D5'}`, background: checked ? '#FBEAE4' : '#fff', borderRadius: 13, padding: '12px 14px', textAlign: 'left' }}>
                    <span style={{ width: 22, height: 22, borderRadius: 7, border: `2px solid ${checked ? '#C8472B' : '#D4C4B0'}`, background: checked ? '#C8472B' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {checked && <Icon d={PATH.check} size={13} stroke="#fff" width={3.2} />}
                    </span>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#3B2A20' }}>{a.name}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#8A7263' }}>+{fmt(a.price)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* free addons note */}
        {menu.freeAddons.length > 0 && (
          <div style={{ marginTop: 14, fontSize: 11.5, color: '#2E5A43', fontWeight: 600 }}>
            Gratis: {menu.freeAddons.map((f) => f.name).join(', ')}
          </div>
        )}

        {/* qty */}
        <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#3B2A20' }}>Jumlah</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#FDFAF5', border: '1px solid #EFE3D5', borderRadius: 13, padding: 6 }}>
            <button onClick={actions.decQty} style={{ background: '#fff', border: '1px solid #EFE3D5', color: '#3B2A20', width: 34, height: 34, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon d={PATH.minus} size={16} width={2.6} />
            </button>
            <span style={{ fontSize: 17, fontWeight: 800, color: '#3B2A20', minWidth: 24, textAlign: 'center', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{state.dQty}</span>
            <button onClick={actions.incQty} style={{ border: 'none', background: '#C8472B', color: '#fff', width: 34, height: 34, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon d={PATH.plus} size={16} width={2.6} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
