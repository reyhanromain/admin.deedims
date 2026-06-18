import { useAdmin } from '../store'
import { getTheme, BRAND } from '../theme'
import { initials } from '../format'
import { cardStyle, inputStyle, labelStyle, tableHeadStyle } from '../styles'
import { HoverButton, Icon } from '../ui'
import { Pager } from '../components/Pager'
import type { User } from '../types'
import { useIsMobile } from '../responsive'

const GRID = '1.7fr 1.1fr 1fr 150px'

export function Users() {
  const s = useAdmin()
  const t = getTheme(s.dark)
  const list = s.lists.users
  const isMobile = useIsMobile()

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: 13.5, color: t.muted }}>
          Akun admin yang bisa masuk ke CMS ini. Login pakai <strong>username</strong>.
        </p>
        <HoverButton
          onClick={() => s.set({ showUserForm: !s.showUserForm })}
          style={{ border: 'none', background: BRAND.terracotta, color: '#fff', fontSize: 13, fontWeight: 700, borderRadius: 10, padding: '10px 18px' }}
          hover={{ background: BRAND.terracottaDark }}
        >
          {s.showUserForm ? 'Batal' : '+ Admin baru'}
        </HoverButton>
      </div>

      {s.showUserForm && (
        <div style={cardStyle(t, { padding: '20px 22px', marginBottom: 18 })}>
          <h2 style={{ margin: '0 0 14px 0', fontSize: 15, fontWeight: 700 }}>Admin baru</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={labelStyle(t)}>Username</label>
              <input value={s.uName} onChange={(e) => s.set({ uName: e.target.value })} placeholder="rahmi" style={inputStyle(t)} />
            </div>
            <div>
              <label style={labelStyle(t)}>Nama lengkap</label>
              <input value={s.uFull} onChange={(e) => s.set({ uFull: e.target.value })} placeholder="Rahmi Putri" style={inputStyle(t)} />
            </div>
            <div>
              <label style={labelStyle(t)}>Password</label>
              <input value={s.uPass} onChange={(e) => s.set({ uPass: e.target.value })} placeholder="min. 6 karakter" style={inputStyle(t)} />
            </div>
          </div>
          <HoverButton
            onClick={s.createUser}
            style={{ border: 'none', background: BRAND.bamboo, color: '#fff', fontSize: 13, fontWeight: 700, borderRadius: 10, padding: '10px 18px' }}
            hover={{ background: BRAND.bambooDark }}
          >
            Tambah admin
          </HoverButton>
        </div>
      )}

      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {(list.rows as User[]).map((u) => (
            <div key={u.username} style={cardStyle(t, { padding: 14 })}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0, marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 99, background: t.chipBg, color: t.chipColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>
                  {initials(u.name)}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 800 }}>{u.name}</span>
                    {u.super && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: t.chipBg, color: t.chipColor, fontSize: 10, fontWeight: 800, borderRadius: 99, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        <Icon size={10} strokeWidth={2.4} path="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4L12 17l-6.3 4.4L8 14 2 9.4h7.6z" />
                        Super User
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, color: t.muted, marginTop: 2 }}>@{u.username}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <HoverButton
                  onClick={() => s.openUserEditor(u)}
                  style={{ flex: 1, border: `1px solid ${t.inputBorder}`, background: t.surface, color: t.ink, fontSize: 12.5, fontWeight: 800, borderRadius: 8, padding: '9px 11px' }}
                  hover={{ opacity: 0.75 }}
                >
                  Edit
                </HoverButton>
                {!u.super && (
                  <HoverButton
                    onClick={() => s.deleteUser(u.username)}
                    title="Hapus admin"
                    style={{ border: `1px solid ${t.dangerBorder}`, background: t.surface, color: t.dangerInk, borderRadius: 8, padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    hover={{ opacity: 0.75 }}
                  >
                    <Icon size={16} strokeWidth={2.2} path="M3 6h18 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </HoverButton>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={cardStyle(t, { overflowX: 'auto' })}>
          <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, ...tableHeadStyle(t, 660) }}>
            <div>Admin</div><div>Username</div><div>Password</div><div style={{ textAlign: 'right' }}>Aksi</div>
          </div>
          {(list.rows as User[]).map((u) => (
            <div key={u.username} style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, padding: '13px 20px', borderBottom: `1px solid ${t.rowBorder}`, alignItems: 'center', minWidth: 660 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                <div style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 99, background: t.chipBg, color: t.chipColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>
                  {initials(u.name)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700 }}>{u.name}</span>
                    {u.super && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: t.chipBg, color: t.chipColor, fontSize: 10, fontWeight: 800, borderRadius: 99, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        <Icon size={10} strokeWidth={2.4} path="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4L12 17l-6.3 4.4L8 14 2 9.4h7.6z" />
                        Super User
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, color: t.muted }}>@{u.username}</div>
              <div style={{ fontSize: 13, color: t.muted, fontFamily: 'monospace', letterSpacing: '1px' }}>
                ••••••••
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 7 }}>
                <HoverButton
                  onClick={() => s.openUserEditor(u)}
                  style={{ border: `1px solid ${t.inputBorder}`, background: t.surface, color: t.ink, fontSize: 12, fontWeight: 700, borderRadius: 8, padding: '6px 11px' }}
                  hover={{ opacity: 0.75 }}
                >
                  Edit
                </HoverButton>
                {!u.super && (
                  <HoverButton
                    onClick={() => s.deleteUser(u.username)}
                    title="Hapus admin"
                    style={{ border: `1px solid ${t.dangerBorder}`, background: t.surface, color: t.dangerInk, borderRadius: 8, padding: '6px 9px', display: 'flex', alignItems: 'center' }}
                    hover={{ opacity: 0.75 }}
                  >
                    <Icon size={14} strokeWidth={2.2} path="M3 6h18 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </HoverButton>
                )}
                {u.super && (
                  <span style={{ fontSize: 11, color: t.faint, fontWeight: 600, alignSelf: 'center' }}>Tetap</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Pager page={list.page} totalPages={list.totalPages} loading={list.loading} onPage={(p) => s.setListPage('users', p)} />
    </section>
  )
}
