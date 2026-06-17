import { useAdmin } from '../store'
import { getTheme, poStatusBadge, inactiveBadge } from '../theme'
import { cardStyle, tableHeadStyle } from '../styles'
import { Pager } from '../components/Pager'
import type { Subscriber } from '../types'

const GRID = '1.4fr 1fr 1fr 120px'

export function Subscribers() {
  const s = useAdmin()
  const t = getTheme(s.dark)
  const po = poStatusBadge(s.dark)
  const inactive = inactiveBadge(s.dark)
  const list = s.lists.subscribers
  const rows = list.rows as Subscriber[]

  return (
    <section>
      <div style={{ display: 'flex', gap: 14, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={cardStyle(t, { padding: '16px 22px' })}>
          <div style={{ fontSize: 12, fontWeight: 600, color: t.muted }}>Subscriber aktif</div>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: t.green }}>{s.subscriberCounts.active}</div>
        </div>
        <div style={cardStyle(t, { padding: '16px 22px' })}>
          <div style={{ fontSize: 12, fontWeight: 600, color: t.muted }}>Berhenti berlangganan</div>
          <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: t.muted }}>{s.subscriberCounts.inactive}</div>
        </div>
      </div>

      <div style={cardStyle(t, { overflowX: 'auto' })}>
        <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, ...tableHeadStyle(t, 560) }}>
          <div>Username</div><div>Nama</div><div>Subscribe sejak</div><div>Status</div>
        </div>
        {rows.map((sb) => (
          <div key={sb.username} style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, padding: '13px 20px', borderBottom: `1px solid ${t.rowBorder}`, alignItems: 'center', minWidth: 560 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>@{sb.username}</div>
            <div style={{ fontSize: 13, color: t.muted }}>{sb.name}</div>
            <div style={{ fontSize: 12.5, color: t.muted }}>{sb.since}</div>
            <div>
              <span style={{ background: sb.active ? po.open.bg : inactive.bg, color: sb.active ? po.open.color : t.muted, fontSize: 11, fontWeight: 700, borderRadius: 99, padding: '3px 10px' }}>
                {sb.active ? 'Aktif' : 'Berhenti'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <Pager page={list.page} totalPages={list.totalPages} loading={list.loading} onPage={(p) => s.setListPage('subscribers', p)} />
    </section>
  )
}
