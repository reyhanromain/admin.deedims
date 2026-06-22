import { useMini } from '../store'
import { priceLabel, tagOf } from '../helpers'
import { ImageSlot, Icon, PATH } from '../ui'
import type { Menu } from '../types'

const CHIPS = [
  { key: 'all', label: 'Semua' },
  { key: 'ready', label: 'Siap Makan' },
  { key: 'frozen', label: 'Frozen' },
]

export function Catalog() {
  const { state, actions } = useMini()
  const q = state.query.trim().toLowerCase()
  const catalog = state.menus
    .filter((m) => state.category === 'all' || m.category === state.category)
    .filter((m) => !q || m.name.toLowerCase().includes(q))

  return (
    <div style={{ padding: '14px 16px 24px', animation: 'ddScreen 0.25s ease' }}>
      {/* search */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', display: 'flex' }}>
          <Icon d="M21 21l-4-4M18 11a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" size={17} stroke="#A99681" />
        </span>
        <input
          value={state.query}
          onChange={(e) => actions.setQuery(e.target.value)}
          placeholder="Cari dimsum..."
          style={{ width: '100%', padding: '11px 13px 11px 38px', border: '1px solid #E4D5C3', borderRadius: 12, fontSize: 13.5, color: '#3B2A20', outline: 'none', background: '#fff' }}
        />
      </div>

      {/* chips + layout toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
        <div className="dd-scroll" style={{ display: 'flex', gap: 7, overflowX: 'auto', flex: 1 }}>
          {CHIPS.map((c) => {
            const on = state.category === c.key
            return (
              <button key={c.key} onClick={() => actions.setCategory(c.key)} style={{ flexShrink: 0, border: `1px solid ${on ? '#C8472B' : '#E4D5C3'}`, background: on ? '#C8472B' : '#fff', color: on ? '#fff' : '#8A7263', fontSize: 12.5, fontWeight: 700, borderRadius: 99, padding: '7px 14px', whiteSpace: 'nowrap' }}>
                {c.label}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', background: '#EDE0CF', borderRadius: 10, padding: 3, flexShrink: 0 }}>
          <button onClick={() => actions.setCatalogLayout('gallery')} title="Galeri" style={toggleBtn(state.catalogLayout === 'gallery')}>
            <Icon d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" size={15} width={2.2} />
          </button>
          <button onClick={() => actions.setCatalogLayout('list')} title="Daftar" style={toggleBtn(state.catalogLayout === 'list')}>
            <Icon d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" size={15} width={2.2} />
          </button>
        </div>
      </div>

      {catalog.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: '#A99681' }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Menu tidak ditemukan</div>
          <div style={{ fontSize: 12.5, marginTop: 4 }}>Coba kata kunci atau kategori lain.</div>
        </div>
      ) : state.catalogLayout === 'gallery' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {catalog.map((m) => <GalleryCard key={m.id} menu={m} onOpen={() => actions.openDetail(m.id)} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {catalog.map((m) => <ListCard key={m.id} menu={m} onOpen={() => actions.openDetail(m.id)} />)}
        </div>
      )}
    </div>
  )
}

function GalleryCard({ menu, onOpen }: { menu: Menu; onOpen: () => void }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #EFE3D5', borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <button onClick={onOpen} style={{ border: 'none', background: 'none', padding: 0, display: 'block', position: 'relative' }}>
        <ImageSlot src={menu.image} label={`Foto ${menu.name}`} style={{ width: '100%', height: 124 }} />
        <span style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(43,29,18,0.78)', color: '#fff', fontSize: 10.5, fontWeight: 700, borderRadius: 99, padding: '3px 9px', whiteSpace: 'nowrap' }}>{tagOf(menu)}</span>
      </button>
      <div style={{ padding: '11px 12px 12px', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <button onClick={onOpen} style={{ border: 'none', background: 'none', padding: 0, textAlign: 'left', fontSize: 13.5, fontWeight: 700, color: '#3B2A20', lineHeight: 1.25 }}>{menu.name}</button>
        <div style={{ fontSize: 11, color: '#8A7263', marginTop: 3, lineHeight: 1.35, flex: 1 }}>{menu.description}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 8 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#C8472B', fontFamily: "'Bricolage Grotesque', sans-serif" }}>{priceLabel(menu)}</div>
          <button onClick={onOpen} title="Tambah" style={{ border: 'none', background: '#C8472B', color: '#fff', width: 30, height: 30, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon d={PATH.plus} size={17} width={2.6} />
          </button>
        </div>
      </div>
    </div>
  )
}

function ListCard({ menu, onOpen }: { menu: Menu; onOpen: () => void }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #EFE3D5', borderRadius: 16, padding: 11, display: 'flex', gap: 12, alignItems: 'center' }}>
      <button onClick={onOpen} style={{ border: 'none', background: 'none', padding: 0, flexShrink: 0 }}>
        <ImageSlot src={menu.image} label="Foto" radius={13} style={{ width: 82, height: 82 }} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <button onClick={onOpen} style={{ border: 'none', background: 'none', padding: 0, textAlign: 'left', fontSize: 14, fontWeight: 700, color: '#3B2A20' }}>{menu.name}</button>
        <div style={{ fontSize: 11.5, color: '#8A7263', marginTop: 3, lineHeight: 1.4 }}>{menu.description}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 7 }}>
          <span style={{ background: '#FBF0DC', color: '#9A6516', fontSize: 10.5, fontWeight: 700, borderRadius: 99, padding: '2px 8px', whiteSpace: 'nowrap' }}>{tagOf(menu)}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#C8472B', fontFamily: "'Bricolage Grotesque', sans-serif", textAlign: 'right' }}>{priceLabel(menu)}</div>
        <button onClick={onOpen} style={{ border: 'none', background: '#C8472B', color: '#fff', fontSize: 12, fontWeight: 700, borderRadius: 9, padding: '7px 13px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <Icon d={PATH.plus} size={14} width={2.6} />Pilih
        </button>
      </div>
    </div>
  )
}

const toggleBtn = (on: boolean) => ({ border: 'none', background: on ? '#fff' : 'transparent', color: on ? '#C8472B' : '#9A8474', width: 32, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' } as const)
