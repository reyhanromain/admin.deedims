import { useAdmin } from '../store'
import { getTheme, BRAND } from '../theme'
import { cardStyle, inputStyle } from '../styles'
import { HoverButton } from '../ui'
import { Pager } from '../components/Pager'

export function Settings() {
  const s = useAdmin()
  const t = getTheme(s.dark)
  const list = s.lists.settings

  return (
    <section style={{ maxWidth: 640, width: '100%' }}>
      <p style={{ margin: '0 0 16px 0', fontSize: 13.5, color: t.muted }}>Konfigurasi bot yang bisa diubah tanpa deploy ulang.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {list.rows.map((st, i) => (
          <div key={st.label} style={cardStyle(t, { padding: '18px 20px' })}>
            <label style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>{st.label}</label>
            <div style={{ fontSize: 12, color: t.faint, margin: '4px 0 10px 0' }}>{st.desc}</div>
            {st.textarea ? (
              <textarea
                value={st.value}
                onChange={(e) => s.updateSetting(i, e.target.value)}
                rows={3}
                style={inputStyle(t, { fontSize: 13, resize: 'vertical', lineHeight: 1.5 })}
              />
            ) : (
              <input
                value={st.value}
                onChange={(e) => s.updateSetting(i, e.target.value)}
                style={inputStyle(t, { width: 'min(100%, 160px)' })}
              />
            )}
          </div>
        ))}
      </div>
      <HoverButton
        onClick={() => s.showToast('Settings disimpan — bot langsung pakai nilai baru')}
        style={{ marginTop: 16, border: 'none', background: BRAND.terracotta, color: '#fff', fontSize: 13.5, fontWeight: 700, borderRadius: 10, padding: '11px 22px' }}
        hover={{ background: BRAND.terracottaDark }}
      >
        Simpan settings
      </HoverButton>
      <Pager page={list.page} totalPages={list.totalPages} loading={list.loading} onPage={(p) => s.setListPage('settings', p)} />
    </section>
  )
}
