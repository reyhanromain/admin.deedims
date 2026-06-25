import { useAdmin } from '../store'
import { getTheme, BRAND } from '../theme'
import { fmt } from '../format'
import { cardStyle } from '../styles'
import { HoverButton, Icon } from '../ui'
import { Pager } from '../components/Pager'
import type { Menu, Variant } from '../types'
import { useIsMobile } from '../responsive'
import { imageFor } from '../imageVariants'

export function Menus() {
  const s = useAdmin()
  const t = getTheme(s.dark)
  const list = s.lists.menus

  const usageOf = (v: Variant): string => {
    const st = s.lists.stock.rows.find((x) => x.id === v.stockId)
    if (!st || !v.qty) return 'Belum di-mapping ke stock'
    return v.qty + ' ' + st.unit + ' · ' + st.name
  }

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: 13.5, color: t.muted }}>
          Atur varian, mapping stock, dan add-on lewat tombol <strong>Edit</strong> di tiap menu.
        </p>
        <HoverButton
          onClick={() => s.openMenuEditor(null)}
          style={{ border: 'none', background: BRAND.terracotta, color: '#fff', fontSize: 13, fontWeight: 700, borderRadius: 10, padding: '10px 18px' }}
          hover={{ background: BRAND.terracottaDark }}
        >
          + Menu baru
        </HoverButton>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {list.rows.map((m) => (
          <MenuCard key={m.id} menu={m} usageOf={usageOf} />
        ))}
      </div>

      <Pager page={list.page} totalPages={list.totalPages} loading={list.loading} onPage={(p) => s.setListPage('menus', p)} />
    </section>
  )
}

function MenuCard({ menu: m, usageOf }: { menu: Menu; usageOf: (v: Variant) => string }) {
  const s = useAdmin()
  const t = getTheme(s.dark)
  const isMobile = useIsMobile()
  const expanded = s.expandedMenuId === m.id
  const linkedMenus = s.lists.menus.rows
  const paidAddonNames = m.addons.filter((a) => !m.freeAddons.includes(a)).map((a) => linkedMenus.find((x) => x.id === a)?.name || '—')
  const freeAddonNames = m.freeAddons.map((a) => linkedMenus.find((x) => x.id === a)?.name || '—')

  return (
    <div style={cardStyle(t, { overflow: 'hidden' })}>
      <div style={{ display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? 12 : 14, padding: isMobile ? 14 : '16px 20px', flexWrap: 'wrap' }}>
        <button
          onClick={() => s.openImage(imageFor(m.image, m.imageVariants, 'large'))}
          title={m.image ? 'Lihat foto' : 'Belum ada foto'}
          style={{
            width: 48, height: 48, flexShrink: 0, border: `1px solid ${t.rowBorder}`, borderRadius: 12,
            overflow: 'hidden', padding: 0, background: t.chipBg, display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: m.image ? 'zoom-in' : 'default',
          }}
        >
          {m.image ? (
            <img src={imageFor(m.image, m.imageVariants, 'thumb')} alt={m.name} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <Icon size={20} stroke={t.chipColor} strokeWidth={1.7} path="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M8.5 7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z M21 15l-5-5L5 21" />
          )}
        </button>
        <div style={{ flex: 1, minWidth: isMobile ? 0 : 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14.5, fontWeight: 700 }}>{m.name}</span>
            {m.isAddon && (
              <span style={{ background: t.surfaceAlt, border: `1px solid ${t.rowBorder}`, color: t.muted, fontSize: 10.5, fontWeight: 700, borderRadius: 99, padding: '2px 8px' }}>ADD-ON</span>
            )}
          </div>
          <div style={{ fontSize: 12.5, color: t.muted, marginTop: 2 }}>{m.description}</div>
        </div>
        <div style={{ fontSize: 14, fontWeight: 800, minWidth: isMobile ? 'auto' : 90, textAlign: isMobile ? 'left' : 'right', width: isMobile ? '100%' : 'auto' }}>{fmt(m.basePrice)}</div>
        <button
          onClick={() => s.toggleMenuActive(m.id)}
          title="Aktif / nonaktif"
          style={{ border: 'none', padding: 0, width: 42, height: 24, borderRadius: 99, background: m.active ? BRAND.bamboo : (s.dark ? '#4A392C' : '#D4C4B0'), position: 'relative', transition: 'background 0.15s' }}
        >
          <span style={{ position: 'absolute', top: 3, left: m.active ? 21 : 3, width: 18, height: 18, borderRadius: 99, background: '#fff', transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)' }} />
        </button>
        <HoverButton
          onClick={() => s.set({ expandedMenuId: expanded ? null : m.id })}
          style={{ border: `1px solid ${t.inputBorder}`, background: t.surface, color: t.ink, fontSize: 12, fontWeight: 700, borderRadius: 8, padding: '7px 12px', flex: isMobile ? 1 : '0 0 auto' }}
          hover={{ opacity: 0.75 }}
        >
          {expanded ? 'Tutup ▲' : 'Detail ▼'}
        </HoverButton>
        <HoverButton
          onClick={() => s.openMenuEditor(m)}
          style={{ border: 'none', background: t.chipBg, color: t.chipColor, fontSize: 12, fontWeight: 700, borderRadius: 8, padding: '7px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flex: isMobile ? 1 : '0 0 auto' }}
          hover={{ opacity: 0.8 }}
        >
          <Icon size={13} strokeWidth={2.2} path="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" />
          Edit
        </HoverButton>
      </div>

      {expanded && (
        <div style={{ borderTop: `1px solid ${t.rowBorder}`, padding: isMobile ? 14 : '16px 20px', background: t.surfaceAlt }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.muted, marginBottom: 8 }}>Variants & stock usage</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {m.variants.map((v, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 12px', background: t.surface, border: `1px solid ${t.rowBorder}`, borderRadius: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, flex: 1, minWidth: 140 }}>{v.name}</span>
                <span style={{ fontSize: 12, color: t.muted }}>{usageOf(v)}</span>
                <span style={{ fontSize: 13, fontWeight: 700, minWidth: 80, textAlign: 'right' }}>{fmt(v.price)}</span>
              </div>
            ))}
          </div>
          {(paidAddonNames.length > 0 || freeAddonNames.length > 0) && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.muted, marginBottom: 8 }}>Add-ons & free menu</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {paidAddonNames.map((name, i) => (
                  <span key={'paid-' + i} style={{ background: t.chipBg, color: t.chipColor, fontSize: 12, fontWeight: 700, borderRadius: 99, padding: '5px 12px' }}>{name}</span>
                ))}
                {freeAddonNames.map((name, i) => (
                  <span key={'free-' + i} style={{ background: s.dark ? '#244836' : '#DDEDE4', color: BRAND.bamboo, fontSize: 12, fontWeight: 800, borderRadius: 99, padding: '5px 12px' }}>Free: {name}</span>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
