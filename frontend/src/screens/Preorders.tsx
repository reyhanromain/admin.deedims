import { useAdmin } from '../store'
import { getTheme, BRAND, poStatusBadge, orderStatusBadge } from '../theme'
import { fmt } from '../format'
import { cardStyle, inputStyle, labelStyle, tableHeadStyle } from '../styles'
import { HoverButton, Hoverable, Pill } from '../ui'
import { Pager } from '../components/Pager'
import type { OrderRow, PreorderRow } from '../types'

export function Preorders() {
  const s = useAdmin()
  const t = getTheme(s.dark)
  const po = poStatusBadge(s.dark)
  const list = s.lists.preorders
  const rows = list.rows as PreorderRow[]

  if (s.selectedPreorderId != null) return <PreorderDetail />

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: 13.5, color: t.muted }}>
          Hanya satu batch yang boleh <strong>open</strong> dalam satu waktu. Klik judul batch untuk melihat order-nya.
        </p>
        <HoverButton
          onClick={() => s.set({ showPoForm: !s.showPoForm })}
          style={{ border: 'none', background: BRAND.terracotta, color: '#fff', fontSize: 13, fontWeight: 700, borderRadius: 10, padding: '10px 18px' }}
          hover={{ background: BRAND.terracottaDark }}
        >
          {s.showPoForm ? 'Batal' : '+ Batch baru'}
        </HoverButton>
      </div>

      {s.showPoForm && (
        <div style={cardStyle(t, { padding: '20px 22px', marginBottom: 18 })}>
          <h2 style={{ margin: '0 0 14px 0', fontSize: 15, fontWeight: 700 }}>Batch pre-order baru</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={labelStyle(t)}>Judul</label>
              <input value={s.poTitle} onChange={(e) => s.set({ poTitle: e.target.value })} placeholder="PO Juli Minggu 1" style={inputStyle(t)} />
            </div>
            <div>
              <label style={labelStyle(t)}>Tanggal pengambilan / pengiriman</label>
              <input type="date" value={s.poDate} onChange={(e) => s.set({ poDate: e.target.value })} style={inputStyle(t, { padding: '9px 12px' })} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle(t)}>Deskripsi</label>
            <input value={s.poDesc} onChange={(e) => s.set({ poDesc: e.target.value })} placeholder="Dimsum siap makan & frozen, COD" style={inputStyle(t)} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle(t)}>Catatan fulfillment</label>
            <input value={s.poNote} onChange={(e) => s.set({ poNote: e.target.value })} placeholder="Pickup di rumah / COD area Tebet" style={inputStyle(t)} />
          </div>
          <HoverButton
            onClick={s.createPo}
            style={{ border: 'none', background: BRAND.bamboo, color: '#fff', fontSize: 13, fontWeight: 700, borderRadius: 10, padding: '10px 18px' }}
            hover={{ background: BRAND.bambooDark }}
          >
            Simpan sebagai draft
          </HoverButton>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {rows.map((p) => (
          <div key={p.id} style={cardStyle(t, { padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' })}>
            <Hoverable
              onClick={() => s.selectPreorder(p.id)}
              style={{ flex: 1, minWidth: 220, cursor: 'pointer', borderRadius: 8 }}
              hover={{ filter: 'brightness(0.97)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{p.title}</span>
                <span style={{ background: po[p.status].bg, color: po[p.status].color, fontSize: 11, fontWeight: 700, borderRadius: 99, padding: '3px 10px', textTransform: 'capitalize' }}>
                  {p.status}
                </span>
                <span style={{ fontSize: 11.5, color: t.faint }}>Lihat order ›</span>
              </div>
              <div style={{ fontSize: 13, color: t.muted, lineHeight: 1.5 }}>{p.description}</div>
              <div style={{ fontSize: 12, color: t.faint, marginTop: 5 }}>{p.date} · {p.note}</div>
            </Hoverable>
            <div style={{ textAlign: 'right', minWidth: 90 }}>
              <div style={{ fontSize: 17, fontWeight: 800 }}>{p.orderCount}</div>
              <div style={{ fontSize: 11.5, color: t.muted }}>orders</div>
            </div>
            <div style={{ textAlign: 'right', minWidth: 110 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: t.green }}>{fmt(p.revenue)}</div>
              <div style={{ fontSize: 11.5, color: t.muted }}>revenue</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {p.status === 'draft' && (
                <HoverButton onClick={() => s.openPreorder(p.id)} style={{ border: 'none', background: BRAND.bamboo, color: '#fff', fontSize: 12.5, fontWeight: 700, borderRadius: 10, padding: '9px 16px' }} hover={{ background: BRAND.bambooDark }}>
                  Buka PO
                </HoverButton>
              )}
              {p.status === 'open' && (
                <HoverButton onClick={() => s.closePreorder(p.id)} style={{ border: 'none', background: BRAND.terracotta, color: '#fff', fontSize: 12.5, fontWeight: 700, borderRadius: 10, padding: '9px 16px' }} hover={{ background: BRAND.terracottaDark }}>
                  Tutup PO
                </HoverButton>
              )}
              {p.status === 'closed' && (
                <HoverButton onClick={() => s.completePreorder(p.id)} style={{ border: `1px solid ${t.inputBorder}`, background: t.surface, color: t.ink, fontSize: 12.5, fontWeight: 700, borderRadius: 10, padding: '9px 16px' }} hover={{ opacity: 0.75 }}>
                  Tandai selesai
                </HoverButton>
              )}
              {(p.status === 'completed' || p.status === 'cancelled') && (
                <button
                  disabled
                  style={{ border: `1px solid ${t.inputBorder}`, background: t.surfaceAlt, color: t.faint, fontSize: 12.5, fontWeight: 700, borderRadius: 10, padding: '9px 16px', cursor: 'default' }}
                >
                  {p.status === 'completed' ? 'Selesai' : 'Dibatalkan'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Pager page={list.page} totalPages={list.totalPages} loading={list.loading} onPage={(p) => s.setListPage('preorders', p)} />
    </section>
  )
}

const GRID = '120px 1.5fr 1.2fr 110px 130px'

function PreorderDetail() {
  const s = useAdmin()
  const t = getTheme(s.dark)
  const status = orderStatusBadge(s.dark)
  const po = poStatusBadge(s.dark)
  const p = (s.lists.preorders.rows as PreorderRow[]).find((x) => x.id === s.selectedPreorderId) || null
  const list = s.preorderOrders
  const rows = list.rows as OrderRow[]

  return (
    <section>
      <button
        onClick={() => s.set({ selectedPreorderId: null })}
        style={{ border: 'none', background: 'none', color: BRAND.terracotta, fontSize: 13, fontWeight: 700, padding: 0, marginBottom: 14 }}
      >
        ← Kembali ke daftar pre-order
      </button>

      {p && (
        <div style={cardStyle(t, { padding: '18px 22px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' })}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{p.title}</span>
              <span style={{ background: po[p.status].bg, color: po[p.status].color, fontSize: 11, fontWeight: 700, borderRadius: 99, padding: '3px 10px', textTransform: 'capitalize' }}>{p.status}</span>
            </div>
            <div style={{ fontSize: 12.5, color: t.faint }}>{p.date} · {p.note}</div>
          </div>
          <div style={{ textAlign: 'right', minWidth: 90 }}>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{p.orderCount}</div>
            <div style={{ fontSize: 11.5, color: t.muted }}>orders</div>
          </div>
          <div style={{ textAlign: 'right', minWidth: 110 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: t.green }}>{fmt(p.revenue)}</div>
            <div style={{ fontSize: 11.5, color: t.muted }}>revenue</div>
          </div>
        </div>
      )}

      <div style={cardStyle(t, { overflowX: 'auto' })}>
        <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, ...tableHeadStyle(t, 720) }}>
          <div>Kode</div><div>Customer</div><div>Item</div><div style={{ textAlign: 'right' }}>Total</div><div>Status</div>
        </div>
        {list.loading && rows.length === 0 ? (
          <div style={{ padding: 36, textAlign: 'center', fontSize: 13.5, color: t.faint }}>Memuat order…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 36, textAlign: 'center', fontSize: 13.5, color: t.faint }}>Belum ada order di batch ini.</div>
        ) : (
          rows.map((o) => (
            <Hoverable
              key={o.id}
              onClick={() => s.selectOrder(o.id)}
              style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, padding: '14px 20px', borderBottom: `1px solid ${t.rowBorder}`, alignItems: 'center', cursor: 'pointer', minWidth: 720 }}
              hover={{ filter: 'brightness(0.98)' }}
            >
              <div style={{ fontSize: 13, fontWeight: 700 }}>{o.code}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{o.customer}</div>
                <div style={{ fontSize: 12, color: t.faint }}>@{o.username} · {o.createdAt}</div>
              </div>
              <div style={{ fontSize: 12.5, color: t.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.itemsSummary}</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, textAlign: 'right' }}>{fmt(o.total)}</div>
              <div><Pill bg={status[o.status].bg} color={status[o.status].color}>{status[o.status].label}</Pill></div>
            </Hoverable>
          ))
        )}
      </div>

      <Pager page={list.page} totalPages={list.totalPages} loading={list.loading} onPage={(pg) => s.setPreorderOrdersPage(pg)} />
    </section>
  )
}
