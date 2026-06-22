import { useState } from 'react'
import { useAdmin } from '../store'
import { getTheme, BRAND } from '../theme'
import { cardStyle, inputStyle } from '../styles'
import { HoverButton } from '../ui'
import { HtmlTemplateEditor } from '../components/HtmlTemplateEditor'

const tabs = [
  { id: 'bot', label: 'Bot Messages' },
  { id: 'pagination', label: 'Pagination' },
  { id: 'general', label: 'General' },
] as const

type TabId = typeof tabs[number]['id']

const categoryLabels: Record<string, string> = {
  bot_messages_start: 'Start',
  bot_messages_reminder: 'Reminder',
  bot_messages_general: 'General Bot',
  bot_messages_order: 'Order Flow',
  bot_messages_cart: 'Cart & Checkout',
  bot_messages_my_orders: 'My Orders',
  pagination: 'Pagination',
  general: 'General',
}

export function Settings() {
  const s = useAdmin()
  const t = getTheme(s.dark)
  const list = s.lists.settings
  const [tab, setTab] = useState<TabId>('bot')

  const rows = list.rows.filter((setting) => {
    if (tab === 'bot') return setting.category.startsWith('bot_messages') || setting.inputType === 'html'
    if (tab === 'pagination') return setting.category === 'pagination' || setting.label.endsWith('_page_size')
    return !setting.category.startsWith('bot_messages') && setting.category !== 'pagination' && !setting.label.endsWith('_page_size')
  })

  const grouped = rows.reduce<Record<string, typeof rows>>((acc, setting) => {
    const key = setting.category || 'general'
    acc[key] = [...(acc[key] ?? []), setting]
    return acc
  }, {})

  return (
    <section style={{ maxWidth: 920, width: '100%' }}>
      <p style={{ margin: '0 0 16px 0', fontSize: 13.5, color: t.muted }}>Konfigurasi bot yang bisa diubah tanpa deploy ulang. Template HTML memakai format Telegram dan placeholder yang tersedia di tiap kartu.</p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {tabs.map((item) => {
          const active = tab === item.id
          return (
            <button key={item.id} type="button" onClick={() => setTab(item.id)} style={{ border: `1px solid ${active ? BRAND.terracotta : t.border}`, background: active ? BRAND.terracotta : t.surface, color: active ? '#fff' : t.ink, borderRadius: 999, padding: '9px 14px', fontSize: 13, fontWeight: 800 }}>
              {item.label}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {Object.entries(grouped).map(([category, settings]) => (
          <div key={category} style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 15, color: t.ink }}>{categoryLabels[category] ?? category}</h3>
              <HoverButton
                onClick={() => s.saveSettings(settings.map((setting) => setting.id).filter((id): id is number => id != null))}
                style={{ border: 'none', background: settings.some((setting) => setting.value !== setting.savedValue) ? BRAND.terracotta : t.solidBg, color: '#fff', fontSize: 12.5, fontWeight: 800, borderRadius: 10, padding: '8px 13px', opacity: settings.some((setting) => setting.value !== setting.savedValue) ? 1 : 0.7 }}
                hover={{ background: settings.some((setting) => setting.value !== setting.savedValue) ? BRAND.terracottaDark : t.solidBg }}
              >
                Save {categoryLabels[category] ?? category}
              </HoverButton>
            </div>
            {settings.map((st) => {
              const index = list.rows.findIndex((candidate) => candidate.id === st.id)
              return (
                <div key={st.label} style={cardStyle(t, { padding: '18px 20px' })}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                    <label style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>{st.label}</label>
                    {st.value !== st.savedValue ? <span style={{ fontSize: 11, fontWeight: 800, color: BRAND.terracotta }}>Unsaved</span> : null}
                  </div>
                  <div style={{ fontSize: 12, color: t.faint, margin: '4px 0 10px 0' }}>{st.desc}</div>
                  {st.inputType === 'html' ? (
                    <HtmlTemplateEditor value={st.value} placeholders={st.placeholders} theme={t} onChange={(value) => s.updateSetting(index, value)} />
                  ) : st.textarea ? (
                    <textarea
                      value={st.value}
                      onChange={(e) => s.updateSetting(index, e.target.value)}
                      rows={3}
                      style={inputStyle(t, { fontSize: 13, resize: 'vertical', lineHeight: 1.5 })}
                    />
                  ) : (
                    <input
                      value={st.value}
                      onChange={(e) => s.updateSetting(index, e.target.value)}
                      style={inputStyle(t, { width: 'min(100%, 180px)' })}
                    />
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <HoverButton
        onClick={() => s.showToast('Gunakan tombol Save di setiap section untuk menyimpan perubahan')}
        style={{ marginTop: 16, border: 'none', background: BRAND.terracotta, color: '#fff', fontSize: 13.5, fontWeight: 700, borderRadius: 10, padding: '11px 22px' }}
        hover={{ background: BRAND.terracottaDark }}
      >
        Info save settings
      </HoverButton>
    </section>
  )
}
