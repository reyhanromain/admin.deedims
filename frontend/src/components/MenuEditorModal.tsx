import { useAdmin } from '../store'
import { getTheme, BRAND } from '../theme'
import { fmt } from '../format'
import { inputStyle, labelStyle } from '../styles'
import { HoverButton, Icon } from '../ui'
import type { Menu, StockItem } from '../types'
import { useIsMobile } from '../responsive'

export function MenuEditorModal() {
  const s = useAdmin()
  const t = getTheme(s.dark)
  const isMobile = useIsMobile()
  const d = s.menuDraft
  if (s.editMenuId === null || !d) return null

  const title = s.editMenuId === 'new' ? 'Menu baru' : 'Edit menu'
  const stockRows = s.lists.stock.rows as StockItem[]
  const addonChoices = (s.lists.menus.rows as Menu[]).filter((x) => x.isAddon && x.id !== d.id)

  const smallInput = { padding: '9px 11px', border: `1px solid ${t.inputBorder}`, borderRadius: 9, fontSize: 13, color: t.ink, outline: 'none', background: t.surface } as const

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: isMobile ? 'flex-end' : 'flex-start', justifyContent: 'center',
        padding: isMobile ? '14px 0 0' : '40px 20px', overflow: 'auto', background: 'rgba(20,12,8,0.55)', animation: 'overlayIn 0.18s ease',
      }}
    >
      <div onClick={s.closeMenuEditor} style={{ position: 'fixed', inset: 0 }} />
      <div
        style={{
          position: 'relative',
          width: isMobile ? '100%' : 600,
          maxWidth: '100%',
          maxHeight: isMobile ? 'calc(100dvh - 14px)' : undefined,
          overflow: isMobile ? 'auto' : undefined,
          background: t.surface,
          border: `1px solid ${t.border}`,
          borderRadius: isMobile ? '12px 12px 0 0' : 8,
          boxShadow: t.shadow,
          animation: 'modalIn 0.22s ease',
          zIndex: 61,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '16px 16px' : '20px 24px', borderBottom: `1px solid ${t.rowBorder}`, position: isMobile ? 'sticky' : undefined, top: 0, background: t.surface, zIndex: 1 }}>
          <h2 style={{ margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 19, fontWeight: 700 }}>{title}</h2>
          <CloseBtn onClick={s.closeMenuEditor} />
        </div>

        <div style={{ padding: isMobile ? '18px 16px' : '22px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* basics */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: isMobile ? 'stretch' : 'center', width: isMobile ? '100%' : undefined }}>
              <label style={{ alignSelf: 'flex-start', fontSize: 12, fontWeight: 700, color: t.muted }}>Foto menu</label>
              <div style={{ width: isMobile ? '100%' : 96, height: isMobile ? 150 : 96, borderRadius: 8, overflow: 'hidden', background: t.surfaceAlt, border: `1px solid ${t.inputBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {d.image ? (
                  <img src={d.image} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <Icon size={26} stroke={t.faint} strokeWidth={1.6} path="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M8.5 7a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z M21 15l-5-5L5 21" />
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <label style={{ border: `1px solid ${t.inputBorder}`, background: t.surface, color: t.ink, fontSize: 11.5, fontWeight: 700, borderRadius: 8, padding: '6px 11px', cursor: 'pointer' }}>
                  {d.image ? 'Ganti foto' : 'Pilih foto'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) s.setDraftImageFromFile(file)
                      e.target.value = ''
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
                {d.image && (
                  <button onClick={() => s.updateDraft({ image: '' })} style={{ border: `1px solid ${t.dangerBorder}`, background: t.surface, color: t.dangerInk, fontSize: 11.5, fontWeight: 700, borderRadius: 8, padding: '6px 10px' }}>
                    Hapus
                  </button>
                )}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: isMobile ? 0 : 220, display: 'flex', flexDirection: 'column', gap: 12, width: isMobile ? '100%' : undefined }}>
              <div>
                <label style={labelStyle(t)}>Nama menu</label>
                <input value={d.name} onChange={(e) => s.updateDraft({ name: e.target.value })} placeholder="Dimsum Udang Isi 5" style={inputStyle(t)} />
              </div>
              <div>
                <label style={labelStyle(t)}>Harga dasar (Rp)</label>
                <input type="number" value={d.basePrice} onChange={(e) => s.updateDraft({ basePrice: e.target.value })} placeholder="25000" style={inputStyle(t)} />
              </div>
            </div>
          </div>

          <div>
            <label style={labelStyle(t)}>Deskripsi</label>
            <input value={d.description} onChange={(e) => s.updateDraft({ description: e.target.value })} placeholder="Deskripsi singkat untuk customer di bot" style={inputStyle(t)} />
          </div>

          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <input type="checkbox" checked={d.isAddon} onChange={(e) => s.updateDraft({ isAddon: e.target.checked })} style={{ width: 16, height: 16, accentColor: BRAND.terracotta }} />
              Add-on (pelengkap)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              <input type="checkbox" checked={d.active} onChange={(e) => s.updateDraft({ active: e.target.checked })} style={{ width: 16, height: 16, accentColor: BRAND.bamboo }} />
              Aktif (tampil di bot)
            </label>
          </div>

          {/* variants */}
          <div style={{ borderTop: `1px solid ${t.rowBorder}`, paddingTop: 16 }}>
            <div style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', marginBottom: 10, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 10 : 0 }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>Variants & stock usage</div>
                <div style={{ fontSize: 11.5, color: t.faint, marginTop: 2 }}>Tiap variant memetakan ke satu stock item — dipotong saat order submit.</div>
              </div>
              <HoverButton onClick={s.addVariant} style={{ border: `1px dashed ${t.inputBorder}`, background: t.surfaceAlt, color: t.ink, fontSize: 12, fontWeight: 700, borderRadius: 8, padding: '7px 12px' }} hover={{ opacity: 0.78 }}>
                + Variant
              </HoverButton>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {d.variants.map((v, i) => {
                const stk = stockRows.find((x) => x.id === v.stockId)
                return (
                  <div key={i} style={{ background: t.surfaceAlt, border: `1px solid ${t.rowBorder}`, borderRadius: 12, padding: 12 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      <input value={v.name} onChange={(e) => s.updateVariant(i, { name: e.target.value })} placeholder="Nama variant (mis. Original)" style={{ ...smallInput, flex: 1, minWidth: 140 }} />
                      <input type="number" value={v.price} onChange={(e) => s.updateVariant(i, { price: parseInt(e.target.value, 10) || 0 })} placeholder="Harga" style={{ ...smallInput, width: isMobile ? '100%' : 110, flex: isMobile ? '1 1 100%' : undefined }} />
                      {d.variants.length > 1 && (
                        <button onClick={() => s.removeVariant(i)} title="Hapus variant" style={{ border: `1px solid ${t.dangerBorder}`, background: t.surface, color: t.dangerInk, width: 36, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Icon size={14} strokeWidth={2.2} path="M3 6h18 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: t.muted }}>Pakai stock</span>
                      <select value={String(v.stockId)} onChange={(e) => s.updateVariant(i, { stockId: parseInt(e.target.value, 10) })} style={{ ...smallInput, flex: 1, minWidth: 150 }}>
                        {stockRows.map((so) => (
                          <option key={so.id} value={String(so.id)}>{so.name}</option>
                        ))}
                      </select>
                      <input type="number" value={v.qty} onChange={(e) => s.updateVariant(i, { qty: parseInt(e.target.value, 10) || 0 })} style={{ ...smallInput, width: isMobile ? 96 : 70 }} />
                      <span style={{ fontSize: 12, color: t.muted, minWidth: 50 }}>{stk?.unit || ''}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* add-ons */}
          {!d.isAddon && (
            <div style={{ borderTop: `1px solid ${t.rowBorder}`, paddingTop: 16 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>Add-on & free menu</div>
              <div style={{ fontSize: 11.5, color: t.faint, marginBottom: 10 }}>Pilih Berbayar untuk add-on biasa, atau Free jika menu pelengkap otomatis gratis di menu ini.</div>
              {addonChoices.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {addonChoices.map((ac) => {
                    const free = d.freeAddons.includes(ac.id)
                    const paid = d.addons.includes(ac.id)
                    const canBeFree = ac.variants.length === 1
                    const status = free && paid ? 'Free 1x + add-on berbayar' : free ? 'Free menu' : paid ? 'Add-on berbayar' : fmt(ac.basePrice)
                    return (
                      <div key={ac.id} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto', gap: 10, alignItems: 'center', padding: '10px 12px', border: `1px solid ${free || paid ? t.chipColor : t.inputBorder}`, background: free || paid ? t.chipBg : t.surface, borderRadius: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, overflowWrap: 'anywhere' }}>{ac.name}</div>
                          <div style={{ fontSize: 12.5, color: t.muted, fontWeight: 700, marginTop: 2 }}>{status}</div>
                          {!canBeFree && <div style={{ fontSize: 11.5, color: t.dangerInk, marginTop: 3 }}>Free hanya tersedia untuk pelengkap dengan tepat satu varian.</div>}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 800, border: `1px solid ${paid ? BRAND.terracotta : t.inputBorder}`, background: paid ? BRAND.terracotta : t.surface, color: paid ? '#fff' : t.ink, borderRadius: 8, padding: '7px 10px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={paid} onChange={() => s.toggleAddon(ac.id)} style={{ width: 14, height: 14, accentColor: BRAND.terracotta }} />
                            Berbayar
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 800, border: `1px solid ${free ? BRAND.bamboo : t.inputBorder}`, background: free ? BRAND.bamboo : t.surface, color: free ? '#fff' : t.ink, borderRadius: 8, padding: '7px 10px', cursor: canBeFree ? 'pointer' : 'not-allowed', opacity: canBeFree ? 1 : 0.5 }}>
                            <input type="checkbox" checked={free} disabled={!canBeFree} onChange={() => s.toggleFreeAddon(ac.id)} style={{ width: 14, height: 14, accentColor: BRAND.bamboo }} />
                            Free
                          </label>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: t.faint, padding: '10px 12px', background: t.surfaceAlt, borderRadius: 10 }}>
                  Belum ada menu add-on. Buat menu lalu tandai sebagai add-on untuk dipasang di sini.
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', padding: isMobile ? '12px 16px calc(12px + env(safe-area-inset-bottom))' : '16px 24px', borderTop: `1px solid ${t.rowBorder}`, position: isMobile ? 'sticky' : undefined, bottom: 0, background: t.surface }}>
          <HoverButton onClick={s.closeMenuEditor} style={{ border: `1px solid ${t.inputBorder}`, background: t.surface, color: t.ink, fontSize: 13, fontWeight: 700, borderRadius: 8, padding: '10px 18px', flex: isMobile ? 1 : '0 0 auto' }} hover={{ opacity: 0.75 }}>Batal</HoverButton>
          <HoverButton onClick={s.saveMenu} style={{ border: 'none', background: BRAND.terracotta, color: '#fff', fontSize: 13, fontWeight: 700, borderRadius: 8, padding: '10px 22px', flex: isMobile ? 1 : '0 0 auto' }} hover={{ background: BRAND.terracottaDark }}>Simpan menu</HoverButton>
        </div>
      </div>
    </div>
  )
}

export function CloseBtn({ onClick }: { onClick: () => void }) {
  const s = useAdmin()
  const t = getTheme(s.dark)
  return (
    <HoverButton
      onClick={onClick}
      style={{ border: 'none', background: t.surfaceAlt, color: t.muted, width: 32, height: 32, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      hover={{ opacity: 0.7 }}
    >
      <Icon size={16} strokeWidth={2.2} path="M18 6 6 18 M6 6l12 12" />
    </HoverButton>
  )
}
