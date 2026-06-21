import { useAdmin } from '../store'
import { getTheme, BRAND, orderStatusBadge, payBadge } from '../theme'
import { fmt } from '../format'
import { cardStyle, inputStyle, mobileMetaGrid, mobileStatStyle, tableHeadStyle } from '../styles'
import { HoverButton, Hoverable, Icon, Pill } from '../ui'
import { Pager } from '../components/Pager'
import type { OrderRow, OrderStatus } from '../types'
import { useIsMobile } from '../responsive'

const GRID = '230px minmax(220px, 1.2fr) minmax(300px, 1.5fr) 110px 150px 130px'
const TABLE_MIN_WIDTH = 1180

export function Orders() {
  const s = useAdmin()
  const t = getTheme(s.dark)
  const isMobile = useIsMobile()
  const status = orderStatusBadge(s.dark)
  const pay = payBadge(s.dark)

  if (s.selectedOrderId != null) return <OrderDetail />

  const filters: ('all' | OrderStatus)[] = ['all', 'submitted', 'confirmed', 'ready', 'completed', 'cancelled']
  const list = s.lists.orders
  const rows = list.rows as OrderRow[]

  return (
    <section>
      <p style={{ margin: '0 0 14px 0', fontSize: 13, color: t.muted, lineHeight: 1.5 }}>
        Menampilkan order dari <strong>pre-order yang sedang aktif</strong> saja. Untuk order dari pre-order sebelumnya,
        buka <button onClick={() => s.goScreen('preorders')} style={{ border: 'none', background: 'none', padding: 0, color: BRAND.terracotta, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>detail pre-order</button> terkait.
      </p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
        {filters.map((f) => {
          const count = f === 'all' ? (s.orderCounts.all ?? 0) : (s.orderCounts[f] ?? 0)
          const active = s.orderFilter === f
          const label = (f === 'all' ? 'Semua' : status[f].label) + ' · ' + count
          return (
            <button
              key={f}
              onClick={() => s.setOrderFilter(f)}
              style={{
                border: `1px solid ${active ? t.solidBg : t.inputBorder}`,
                background: active ? t.solidBg : t.surface,
                color: active ? t.solidColor : t.muted,
                fontSize: 12.5, fontWeight: 700, borderRadius: 99, padding: '7px 14px',
              }}
            >
              {label}
            </button>
          )
        })}
      </div>

      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map((o) => {
            const flagged = o.cancelRequested && o.status === 'confirmed'
            return (
              <Hoverable
                key={o.id}
                onClick={() => s.selectOrder(o.id)}
                style={cardStyle(t, { padding: 14, cursor: 'pointer', background: flagged ? t.cancelRowBg : t.surface })}
                hover={{ filter: 'brightness(0.98)' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 7 }}>
                      {o.code}
                      {o.cancelRequested && (
                        <Icon size={14} stroke={BRAND.terracotta} strokeWidth={2.4} title="Cancel request" path="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z M4 22v-7" />
                      )}
                    </div>
                    <div style={{ fontSize: 12.5, color: t.faint, marginTop: 2 }}>@{o.username} · {o.createdAt}</div>
                  </div>
                  <Pill bg={status[o.status].bg} color={status[o.status].color}>{status[o.status].label}</Pill>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 3 }}>{o.customer}</div>
                <div style={{ fontSize: 12.5, color: t.muted, lineHeight: 1.45, marginBottom: 12 }}>{o.itemsSummary}</div>
                <div style={mobileMetaGrid()}>
                  <MobileMeta t={t} label="Total" value={fmt(o.total)} strong />
                  <MobileMeta t={t} label="Pembayaran" value={pay[o.pay].label} color={pay[o.pay].color} strong />
                </div>
              </Hoverable>
            )
          })}
          {rows.length === 0 && (
            <div style={cardStyle(t, { padding: 24, textAlign: 'center', fontSize: 13.5, color: t.faint })}>Tidak ada order dengan status ini.</div>
          )}
        </div>
      ) : (
        <div style={cardStyle(t, { overflowX: 'auto' })}>
          <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, ...tableHeadStyle(t, TABLE_MIN_WIDTH) }}>
            <div>Kode</div><div>Customer</div><div>Item</div>
            <div style={{ textAlign: 'right' }}>Total</div><div>Status</div><div>Pembayaran</div>
          </div>
          {rows.map((o) => {
            const flagged = o.cancelRequested && o.status === 'confirmed'
            return (
              <Hoverable
                key={o.id}
                onClick={() => s.selectOrder(o.id)}
                style={{
                  display: 'grid', gridTemplateColumns: GRID, gap: 12, padding: '14px 20px',
                  borderBottom: `1px solid ${t.rowBorder}`, alignItems: 'center', cursor: 'pointer',
                  background: flagged ? t.cancelRowBg : t.surface, minWidth: TABLE_MIN_WIDTH,
                }}
                hover={{ filter: 'brightness(0.98)' }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, overflowWrap: 'anywhere', lineHeight: 1.35 }}>
                  {o.code}
                  {o.cancelRequested && (
                    <Icon size={13} stroke={BRAND.terracotta} strokeWidth={2.4} title="Cancel request" path="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z M4 22v-7" />
                  )}
                </div>
                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.customer}</div>
                  <div style={{ fontSize: 12, color: t.faint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{o.username} · {o.createdAt}</div>
                </div>
                <div style={{ fontSize: 12.5, color: t.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {o.itemsSummary}
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(o.total)}</div>
                <div style={{ whiteSpace: 'nowrap' }}><Pill bg={status[o.status].bg} color={status[o.status].color}>{status[o.status].label}</Pill></div>
                <div style={{ whiteSpace: 'nowrap' }}><span style={{ color: pay[o.pay].color, fontSize: 12, fontWeight: 700 }}>{pay[o.pay].label}</span></div>
              </Hoverable>
            )
          })}
          {rows.length === 0 && (
            <div style={{ padding: 36, textAlign: 'center', fontSize: 13.5, color: t.faint }}>Tidak ada order dengan status ini.</div>
          )}
        </div>
      )}

      <Pager page={list.page} totalPages={list.totalPages} loading={list.loading} onPage={(p) => s.setListPage('orders', p)} />
    </section>
  )
}

function OrderDetail() {
  const s = useAdmin()
  const t = getTheme(s.dark)
  const isMobile = useIsMobile()
  const status = orderStatusBadge(s.dark)
  const pay = payBadge(s.dark)

  const sel = s.selectedOrder
  if (!sel || sel.id !== s.selectedOrderId) {
    return <div style={{ padding: 36, textAlign: 'center', fontSize: 13.5, color: t.faint }}>Memuat order…</div>
  }

  const showCancelReq = sel.cancelRequested && sel.status === 'confirmed'
  const canConfirm = sel.status === 'submitted'
  const canReady = sel.status === 'confirmed' && !sel.cancelRequested
  const canComplete = sel.status === 'ready'
  const canCancel = sel.status === 'submitted'
  const canMarkPaid = sel.pay === 'pending' && (sel.status === 'confirmed' || sel.status === 'ready')

  return (
    <section>
      <button
        onClick={() => s.set({ selectedOrderId: null })}
        style={{ border: 'none', background: 'none', color: BRAND.terracotta, fontSize: 13, fontWeight: 700, padding: 0, marginBottom: 14 }}
      >
        ← Kembali ke daftar order
      </button>

      {showCancelReq && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: t.dangerBg, border: `1px solid ${t.dangerBorder}`, borderRadius: 14, padding: '14px 18px', marginBottom: 16, flexWrap: 'wrap' }}>
          <Icon size={20} stroke={t.dangerInk} path="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z M4 22v-7" />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: t.dangerInk }}>Customer meminta pembatalan order ini</div>
            <div style={{ fontSize: 12.5, color: t.dangerSub, marginTop: 2 }}>Order sudah dikonfirmasi, jadi pembatalan perlu review admin.</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <HoverButton
              onClick={() => { s.patchOrder(sel.id, { status: 'cancelled', pay: 'cancelled', cancelRequested: false }); s.showToast('Pembatalan disetujui — stock dikembalikan') }}
              style={{ border: 'none', background: BRAND.terracotta, color: '#fff', fontSize: 12.5, fontWeight: 700, borderRadius: 10, padding: '9px 14px' }}
              hover={{ background: BRAND.terracottaDark }}
            >
              Setujui pembatalan
            </HoverButton>
            <HoverButton
              onClick={() => { s.patchOrder(sel.id, { cancelRequested: false }); s.showToast('Request cancel ditolak, order tetap jalan') }}
              style={{ border: `1px solid ${t.inputBorder}`, background: t.surface, color: t.ink, fontSize: 12.5, fontWeight: 700, borderRadius: 10, padding: '9px 14px' }}
              hover={{ opacity: 0.75 }}
            >
              Tolak
            </HoverButton>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(320px, 1.6fr) minmax(260px, 1fr)', gap: 16, alignItems: 'start' }}>
        <div style={cardStyle(t, { padding: isMobile ? 16 : '22px 24px' })}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700 }}>{sel.code}</h2>
            <Pill bg={status[sel.status].bg} color={status[sel.status].color} style={{ fontSize: 11.5, padding: '4px 12px' }}>{status[sel.status].label}</Pill>
          </div>
          <div style={{ fontSize: 13, color: t.muted, marginBottom: 18 }}>{sel.customer} · @{sel.username} · dibuat {sel.createdAt}</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {sel.items.map((it, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '10px 14px', background: it.addon ? t.itemBgAddon : t.itemBg, borderRadius: 8, marginLeft: isMobile ? 0 : (it.addon ? 26 : 0), flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{it.name}</div>
                  <div style={{ fontSize: 12, color: t.muted }}>{it.meta || (it.addon ? 'Add-on' : 'Tanpa varian')}</div>
                </div>
                <div style={{ fontSize: 12.5, color: t.muted }}>x{it.qty}</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, minWidth: 84, textAlign: 'right' }}>{fmt(it.price * it.qty)}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 14px', borderTop: `2px dashed ${t.border}` }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Total</span>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 800, color: BRAND.terracotta }}>{fmt(sel.total)}</span>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {canConfirm && (
              <HoverButton onClick={() => { s.patchOrder(sel.id, { status: 'confirmed' }); s.showToast('Order ' + sel.code + ' dikonfirmasi') }} style={{ ...btnGreen, flex: isMobile ? '1 1 100%' : '0 0 auto' }} hover={{ background: BRAND.bambooDark }}>Konfirmasi order</HoverButton>
            )}
            {canReady && (
              <HoverButton onClick={() => { s.patchOrder(sel.id, { status: 'ready' }); s.showToast('Order ' + sel.code + ' ditandai siap') }} style={{ ...btnRed, flex: isMobile ? '1 1 100%' : '0 0 auto' }} hover={{ background: BRAND.terracottaDark }}>Tandai siap</HoverButton>
            )}
            {canComplete && (
              <HoverButton onClick={() => { s.patchOrder(sel.id, { status: 'completed', pay: 'paid' }); s.showToast('Order ' + sel.code + ' selesai') }} style={{ ...btnGreen, flex: isMobile ? '1 1 100%' : '0 0 auto' }} hover={{ background: BRAND.bambooDark }}>Selesaikan order</HoverButton>
            )}
            {canMarkPaid && (
              <HoverButton onClick={() => { s.patchOrder(sel.id, { pay: 'paid' }); s.showToast('Pembayaran ' + sel.code + ' ditandai lunas') }} style={{ border: `1px solid ${t.inputBorder}`, background: t.surface, color: t.ink, fontSize: 13, fontWeight: 700, borderRadius: 8, padding: '11px 18px', flex: isMobile ? '1 1 100%' : '0 0 auto' }} hover={{ opacity: 0.75 }}>Tandai sudah dibayar</HoverButton>
            )}
            {canCancel && (
              <HoverButton onClick={() => { s.patchOrder(sel.id, { status: 'cancelled', pay: 'cancelled' }); s.showToast('Order ' + sel.code + ' dibatalkan, stock dikembalikan') }} style={{ border: `1px solid ${t.dangerBorder}`, background: t.surface, color: BRAND.terracotta, fontSize: 13, fontWeight: 700, borderRadius: 8, padding: '11px 18px', flex: isMobile ? '1 1 100%' : '0 0 auto' }} hover={{ opacity: 0.75 }}>Batalkan order</HoverButton>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={cardStyle(t, { padding: '18px 20px' })}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.muted }}>Info order</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13 }}>
              <Row t={t} label="Pembayaran"><span style={{ fontWeight: 700 }}>COD</span></Row>
              <Row t={t} label="Status bayar"><span style={{ fontWeight: 700, color: pay[sel.pay].color }}>{pay[sel.pay].label}</span></Row>
              <Row t={t} label="Pre-order"><span style={{ fontWeight: 700 }}>{sel.poTitle}</span></Row>
              <Row t={t} label="Pekan fulfillment"><span style={{ fontWeight: 700 }}>{sel.poFulfillmentWeek}</span></Row>
              <Row t={t} label="Diperbarui"><span style={{ fontWeight: 700 }}>{sel.updatedAt}</span></Row>
            </div>
          </div>

          <div style={cardStyle(t, { padding: '18px 20px' })}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: t.muted }}>Catatan admin</h3>
            <textarea
              value={sel.adminNotes}
              onChange={(e) => s.patchOrder(sel.id, { adminNotes: e.target.value })}
              placeholder="Catatan internal, terlihat oleh customer di /my_orders…"
              rows={3}
              style={inputStyle(t, { fontSize: 13, resize: 'vertical', lineHeight: 1.5 })}
            />
            <HoverButton
              onClick={() => s.showToast('Catatan admin disimpan')}
              style={{ marginTop: 8, border: 'none', background: t.solidBg, color: t.solidColor, fontSize: 12.5, fontWeight: 700, borderRadius: 9, padding: '8px 14px' }}
              hover={{ opacity: 0.85 }}
            >
              Simpan catatan
            </HoverButton>
          </div>
        </div>
      </div>
    </section>
  )
}

function MobileMeta({ t, label, value, color, strong }: { t: ReturnType<typeof getTheme>; label: string; value: string; color?: string; strong?: boolean }) {
  return (
    <div style={mobileStatStyle(t)}>
      <div style={{ fontSize: 11.5, color: t.muted, fontWeight: 700, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: color || t.ink, fontWeight: strong ? 800 : 600, overflowWrap: 'anywhere' }}>{value}</div>
    </div>
  )
}

const btnGreen = { border: 'none', background: BRAND.bamboo, color: '#fff', fontSize: 13, fontWeight: 700, borderRadius: 10, padding: '11px 18px' } as const
const btnRed = { border: 'none', background: BRAND.terracotta, color: '#fff', fontSize: 13, fontWeight: 700, borderRadius: 10, padding: '11px 18px' } as const

function Row({ t, label, children }: { t: ReturnType<typeof getTheme>; label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: t.muted }}>{label}</span>
      {children}
    </div>
  )
}
