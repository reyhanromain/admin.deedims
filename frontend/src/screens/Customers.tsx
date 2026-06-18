import { useAdmin } from '../store'
import { getTheme, BRAND, orderStatusBadge, poStatusBadge, inactiveBadge } from '../theme'
import { fmt, initials } from '../format'
import { cardStyle, mobileMetaGrid, mobileStatStyle, tableHeadStyle } from '../styles'
import { HoverButton, Hoverable, Icon, Pill } from '../ui'
import { Pager } from '../components/Pager'
import type { CustomerOrderRow, CustomerRow } from '../types'
import { useIsMobile } from '../responsive'

const GRID = 'minmax(180px, 1fr) 72px 130px 140px 100px'

export function Customers() {
  const s = useAdmin()
  const t = getTheme(s.dark)
  const isMobile = useIsMobile()
  const po = poStatusBadge(s.dark)
  const inactive = inactiveBadge(s.dark)
  const list = s.lists.customers
  const rows = list.rows as CustomerRow[]

  const selC = rows.find((c) => c.username === s.selectedCustomerU) || null
  if (selC) return <CustomerDetail customer={selC} />

  const subBadge = (active: boolean) => ({ bg: active ? po.open.bg : inactive.bg, color: active ? po.open.color : t.muted, text: active ? 'Aktif' : 'Tidak' })

  return (
    <section>
      <p style={{ margin: '0 0 16px 0', fontSize: 13.5, color: t.muted }}>
        Customer yang pernah berinteraksi dengan bot, beserta riwayat pesanannya.
      </p>
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.map((c) => {
            const sb = subBadge(c.reminderActive)
            return (
              <Hoverable key={c.username} onClick={() => s.set({ selectedCustomerU: c.username })} style={cardStyle(t, { padding: 14, cursor: 'pointer' })} hover={{ filter: 'brightness(0.98)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0, marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 99, background: t.chipBg, color: t.chipColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800 }}>
                    {initials(c.name)}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 14, fontWeight: 800, minWidth: 0 }}>{c.name}</span>
                      {c.blocked && (
                        <span style={{ flexShrink: 0, background: t.dangerBg, color: t.dangerInk, fontSize: 10, fontWeight: 800, borderRadius: 99, padding: '2px 8px' }}>DIBLOKIR</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12.5, color: t.faint }}>@{c.username}</div>
                  </div>
                  <Pill bg={sb.bg} color={sb.color}>{sb.text}</Pill>
                </div>
                <div style={mobileMetaGrid()}>
                  <MobileCustomerMeta t={t} label="Orders" value={String(c.orderCount)} />
                  <MobileCustomerMeta t={t} label="Total" value={fmt(c.totalSpent)} />
                  <div style={{ ...mobileStatStyle(t), gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: 11.5, color: t.muted, fontWeight: 700, marginBottom: 2 }}>Order terakhir</div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{c.lastOrder}</div>
                  </div>
                </div>
              </Hoverable>
            )
          })}
          {rows.length === 0 && <div style={cardStyle(t, { padding: 24, textAlign: 'center', fontSize: 13.5, color: t.faint })}>Belum ada customer.</div>}
        </div>
      ) : (
        <div style={cardStyle(t, { overflowX: 'auto' })}>
          <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, ...tableHeadStyle(t, 620) }}>
            <div>Customer</div><div>Orders</div>
            <div style={{ textAlign: 'right' }}>Total belanja</div><div>Order terakhir</div><div>Reminder</div>
          </div>
          {rows.map((c) => {
            const sb = subBadge(c.reminderActive)
            return (
              <Hoverable
                key={c.username}
                onClick={() => s.set({ selectedCustomerU: c.username })}
                style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, padding: '13px 20px', borderBottom: `1px solid ${t.rowBorder}`, alignItems: 'center', cursor: 'pointer', minWidth: 620 }}
                hover={{ filter: 'brightness(0.98)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                  <div style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 99, background: t.chipBg, color: t.chipColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>
                    {initials(c.name)}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{c.name}</span>
                      {c.blocked && (
                        <span style={{ flexShrink: 0, background: t.dangerBg, color: t.dangerInk, fontSize: 10, fontWeight: 800, borderRadius: 99, padding: '2px 8px' }}>DIBLOKIR</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: t.faint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>@{c.username}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{c.orderCount}</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, textAlign: 'right' }}>{fmt(c.totalSpent)}</div>
                <div style={{ fontSize: 12.5, color: t.muted }}>{c.lastOrder}</div>
                <div><Pill bg={sb.bg} color={sb.color}>{sb.text}</Pill></div>
              </Hoverable>
            )
          })}
          {rows.length === 0 && <div style={{ padding: 36, textAlign: 'center', fontSize: 13.5, color: t.faint }}>Belum ada customer.</div>}
        </div>
      )}

      <Pager page={list.page} totalPages={list.totalPages} loading={list.loading} onPage={(p) => s.setListPage('customers', p)} />
    </section>
  )
}

function CustomerDetail({ customer }: { customer: CustomerRow }) {
  const s = useAdmin()
  const t = getTheme(s.dark)
  const isMobile = useIsMobile()
  const status = orderStatusBadge(s.dark)
  const po = poStatusBadge(s.dark)
  const inactive = inactiveBadge(s.dark)

  const subBg = customer.reminderActive ? po.open.bg : inactive.bg
  const subColor = customer.reminderActive ? po.open.color : t.muted
  const subText = customer.reminderActive ? 'Aktif' : 'Tidak'
  const orders = s.customerOrders.rows as CustomerOrderRow[]

  return (
    <section>
      <button
        onClick={() => s.set({ selectedCustomerU: null })}
        style={{ border: 'none', background: 'none', color: BRAND.terracotta, fontSize: 13, fontWeight: 700, padding: 0, marginBottom: 14 }}
      >
        ← Kembali ke daftar customer
      </button>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(250px, 1fr) minmax(320px, 1.8fr)', gap: 16, alignItems: 'start' }}>
        <div style={cardStyle(t, { padding: 22 })}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 99, background: t.chipBg, color: t.chipColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800 }}>
              {initials(customer.name)}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{customer.name}</div>
              <div style={{ fontSize: 12.5, color: t.faint }}>@{customer.username}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: t.muted }}>Bergabung</span><span style={{ fontWeight: 700 }}>{customer.joined}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: t.muted }}>Reminder PO</span><Pill bg={subBg} color={subColor}>{subText}</Pill></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: t.surfaceAlt, border: `1px solid ${t.rowBorder}`, borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 11.5, color: t.muted, fontWeight: 600 }}>Total order</div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700 }}>{customer.orderCount}</div>
            </div>
            <div style={{ background: t.surfaceAlt, border: `1px solid ${t.rowBorder}`, borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ fontSize: 11.5, color: t.muted, fontWeight: 600 }}>Total belanja</div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 17, fontWeight: 700, color: t.green }}>{fmt(customer.totalSpent)}</div>
            </div>
          </div>
          {customer.blocked && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: t.dangerBg, border: `1px solid ${t.dangerBorder}`, borderRadius: 12, padding: '11px 13px', marginTop: 14 }}>
              <Icon size={16} stroke={t.dangerInk} path="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M4.93 4.93l14.14 14.14" />
              <span style={{ fontSize: 12.5, fontWeight: 600, color: t.dangerInk, flex: 1 }}>Customer diblokir — tidak bisa order via bot.</span>
            </div>
          )}
          <HoverButton
            onClick={() => s.toggleBlockCustomer(customer.username)}
            style={{
              width: '100%', marginTop: 14,
              border: `1px solid ${customer.blocked ? BRAND.terracotta : t.dangerBorder}`,
              background: customer.blocked ? BRAND.terracotta : t.surface,
              color: customer.blocked ? '#fff' : BRAND.terracotta,
              fontSize: 13, fontWeight: 700, borderRadius: 10, padding: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
            hover={{ opacity: 0.82 }}
          >
            <Icon size={15} path="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M4.93 4.93l14.14 14.14" />
            {customer.blocked ? 'Buka blokir customer' : 'Blokir customer'}
          </HoverButton>
        </div>

        <div style={cardStyle(t, { padding: '20px 22px' })}>
          <h2 style={{ margin: '0 0 14px 0', fontSize: 15, fontWeight: 700 }}>Track record pesanan</h2>
          {s.customerOrders.loading && orders.length === 0 ? (
            <div style={{ fontSize: 13, color: t.faint }}>Memuat…</div>
          ) : orders.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {orders.map((o) => (
                <Hoverable
                  key={o.id}
                  onClick={() => s.set({ screen: 'orders', selectedOrderId: o.id, selectedCustomerU: null })}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: `1px solid ${t.rowBorder}`, borderRadius: 12, cursor: 'pointer', flexWrap: 'wrap' }}
                  hover={{ filter: 'brightness(0.98)' }}
                >
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{o.code}</div>
                    <div style={{ fontSize: 12, color: t.faint, marginTop: 2 }}>{o.createdAt} · {o.itemsSummary}</div>
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{fmt(o.total)}</div>
                  <Pill bg={status[o.status].bg} color={status[o.status].color}>{status[o.status].label}</Pill>
                </Hoverable>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: t.faint }}>Customer ini belum pernah membuat order.</div>
          )}
          {s.customerOrders.totalPages > 1 && (
            <Pager page={s.customerOrders.page} totalPages={s.customerOrders.totalPages} loading={s.customerOrders.loading} onPage={() => { /* track record load-more nanti */ }} />
          )}
        </div>
      </div>
    </section>
  )
}

function MobileCustomerMeta({ t, label, value }: { t: ReturnType<typeof getTheme>; label: string; value: string }) {
  return (
    <div style={mobileStatStyle(t)}>
      <div style={{ fontSize: 11.5, color: t.muted, fontWeight: 700, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 800, overflowWrap: 'anywhere' }}>{value}</div>
    </div>
  )
}
