import { useAdmin } from '../store'
import { getTheme, BRAND, poStatusBadge, orderStatusBadge } from '../theme'
import { fmt } from '../format'
import { cardStyle, inputStyle, labelStyle, tableHeadStyle } from '../styles'
import { HoverButton, Hoverable, Pill } from '../ui'
import { Pager } from '../components/Pager'
import { WeekPicker } from '../components/WeekPicker'
import type { OrderRow, PreorderRow } from '../types'
import { useIsMobile } from '../responsive'

export function Preorders() {
  const s = useAdmin()
  const t = getTheme(s.dark)
  const isMobile = useIsMobile()
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
              <label style={labelStyle(t)}>Pekan pengambilan / pengiriman</label>
              <WeekPicker t={t} value={s.poWeek} onChange={(value) => s.set({ poWeek: value })} />
              <div style={{ fontSize: 11.5, color: t.faint, marginTop: 5 }}>Rentang Senin–Jumat. Sabtu & Minggu otomatis dikecualikan.</div>
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
          <div key={p.id} style={cardStyle(t, { padding: isMobile ? 14 : '18px 22px', display: 'flex', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? 12 : 18, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' })}>
            <Hoverable
              onClick={() => s.selectPreorder(p.id)}
              style={{ flex: 1, minWidth: isMobile ? 0 : 220, cursor: 'pointer', borderRadius: 8 }}
              hover={{ filter: 'brightness(0.97)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{p.title}</span>
                <span style={{ background: po[p.status].bg, color: po[p.status].color, fontSize: 11, fontWeight: 700, borderRadius: 99, padding: '3px 10px', textTransform: 'capitalize' }}>
                  {p.status}
                </span>
                <span style={{ fontSize: 11.5, color: t.faint }}>Lihat order ›</span>
              </div>
              <div style={{ fontSize: 13, color: t.muted, lineHeight: 1.5 }}>{p.description}</div>
              <div style={{ fontSize: 12, color: t.faint, marginTop: 5 }}>{p.fulfillmentWeek} · {p.note}</div>
            </Hoverable>
            <div style={{ display: 'flex', gap: 10, width: isMobile ? '100%' : 'auto' }}>
            <div style={{ textAlign: isMobile ? 'left' : 'right', minWidth: 90, flex: isMobile ? 1 : '0 0 auto', background: isMobile ? t.surfaceAlt : undefined, border: isMobile ? `1px solid ${t.rowBorder}` : undefined, borderRadius: isMobile ? 8 : undefined, padding: isMobile ? '10px 12px' : undefined }}>
              <div style={{ fontSize: 17, fontWeight: 800 }}>{p.orderCount}</div>
              <div style={{ fontSize: 11.5, color: t.muted }}>orders</div>
            </div>
            <div style={{ textAlign: isMobile ? 'left' : 'right', minWidth: 110, flex: isMobile ? 1 : '0 0 auto', background: isMobile ? t.surfaceAlt : undefined, border: isMobile ? `1px solid ${t.rowBorder}` : undefined, borderRadius: isMobile ? 8 : undefined, padding: isMobile ? '10px 12px' : undefined }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: t.green }}>{fmt(p.revenue)}</div>
              <div style={{ fontSize: 11.5, color: t.muted }}>revenue</div>
            </div>
            </div>
            <div style={{ display: 'flex', gap: 8, width: isMobile ? '100%' : 'auto', flexWrap: 'wrap' }}>
              {p.status === 'draft' && (
                <HoverButton onClick={() => s.openPreorder(p.id)} style={{ border: 'none', background: BRAND.bamboo, color: '#fff', fontSize: 12.5, fontWeight: 700, borderRadius: 8, padding: '9px 16px', flex: isMobile ? 1 : '0 0 auto' }} hover={{ background: BRAND.bambooDark }}>
                  Buka PO
                </HoverButton>
              )}
              {p.status === 'open' && (
                <HoverButton onClick={() => s.closePreorder(p.id)} style={{ border: 'none', background: BRAND.terracotta, color: '#fff', fontSize: 12.5, fontWeight: 700, borderRadius: 8, padding: '9px 16px', flex: isMobile ? 1 : '0 0 auto' }} hover={{ background: BRAND.terracottaDark }}>
                  Tutup PO
                </HoverButton>
              )}
              {p.status === 'closed' && (
                <HoverButton onClick={() => s.completePreorder(p.id)} style={{ border: `1px solid ${t.inputBorder}`, background: t.surface, color: t.ink, fontSize: 12.5, fontWeight: 700, borderRadius: 8, padding: '9px 16px', flex: isMobile ? 1 : '0 0 auto' }} hover={{ opacity: 0.75 }}>
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
  const isMobile = useIsMobile()
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
        <div style={cardStyle(t, { padding: isMobile ? 14 : '18px 22px', marginBottom: 16, display: 'flex', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? 12 : 18, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' })}>
          <div style={{ flex: 1, minWidth: isMobile ? 0 : 220 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16, fontWeight: 700 }}>{p.title}</span>
              <span style={{ background: po[p.status].bg, color: po[p.status].color, fontSize: 11, fontWeight: 700, borderRadius: 99, padding: '3px 10px', textTransform: 'capitalize' }}>{p.status}</span>
            </div>
            <div style={{ fontSize: 12.5, color: t.faint }}>{p.fulfillmentWeek} · {p.note}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, width: isMobile ? '100%' : 'auto' }}>
          <div style={{ textAlign: isMobile ? 'left' : 'right', minWidth: 90, flex: isMobile ? 1 : '0 0 auto', background: isMobile ? t.surfaceAlt : undefined, border: isMobile ? `1px solid ${t.rowBorder}` : undefined, borderRadius: isMobile ? 8 : undefined, padding: isMobile ? '10px 12px' : undefined }}>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{p.orderCount}</div>
            <div style={{ fontSize: 11.5, color: t.muted }}>orders</div>
          </div>
          <div style={{ textAlign: isMobile ? 'left' : 'right', minWidth: 110, flex: isMobile ? 1 : '0 0 auto', background: isMobile ? t.surfaceAlt : undefined, border: isMobile ? `1px solid ${t.rowBorder}` : undefined, borderRadius: isMobile ? 8 : undefined, padding: isMobile ? '10px 12px' : undefined }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: t.green }}>{fmt(p.revenue)}</div>
            <div style={{ fontSize: 11.5, color: t.muted }}>revenue</div>
          </div>
          </div>
        </div>
      )}

      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {list.loading && rows.length === 0 ? (
            <div style={cardStyle(t, { padding: 24, textAlign: 'center', fontSize: 13.5, color: t.faint })}>Memuat order…</div>
          ) : rows.length === 0 ? (
            <div style={cardStyle(t, { padding: 24, textAlign: 'center', fontSize: 13.5, color: t.faint })}>Belum ada order di batch ini.</div>
          ) : (
            rows.map((o) => (
              <Hoverable key={o.id} onClick={() => s.selectOrder(o.id)} style={cardStyle(t, { padding: 14, cursor: 'pointer' })} hover={{ filter: 'brightness(0.98)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>{o.code}</div>
                    <div style={{ fontSize: 12.5, color: t.faint, marginTop: 2 }}>@{o.username} · {o.createdAt}</div>
                  </div>
                  <Pill bg={status[o.status].bg} color={status[o.status].color}>{status[o.status].label}</Pill>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 3 }}>{o.customer}</div>
                <div style={{ fontSize: 12.5, color: t.muted, lineHeight: 1.45, marginBottom: 10 }}>{o.itemsSummary}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: t.green }}>{fmt(o.total)}</div>
              </Hoverable>
            ))
          )}
        </div>
      ) : (
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
      )}

      <Pager page={list.page} totalPages={list.totalPages} loading={list.loading} onPage={(pg) => s.setPreorderOrdersPage(pg)} />
    </section>
  )
}
