import { useEffect, useMemo, useRef } from 'react'
import { useAdmin } from '../store'
import { getTheme, BRAND, poStatusBadge } from '../theme'
import { cardStyle, inputStyle, labelStyle } from '../styles'
import { Pill } from '../ui'
import { Pager } from '../components/Pager'
import { useIsMobile } from '../responsive'
import type { BotMessage, BotMessageDirection } from '../types'

export function BotMessages() {
  const s = useAdmin()
  const t = getTheme(s.dark)
  const isMobile = useIsMobile()
  const list = s.lists.botMessages
  const rows = list.rows
  const orderedRows = useMemo(() => [...rows].reverse(), [rows])
  const threadRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = threadRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [orderedRows, list.page, s.botMessageCustomerId, s.botMessageDirection])

  return (
    <section>
      <div style={cardStyle(t, { padding: isMobile ? 14 : '18px 20px', marginBottom: 16 })}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(220px, 1fr) minmax(180px, 240px)', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={labelStyle(t)}>Customer</label>
            <select
              value={s.botMessageCustomerId ?? ''}
              onChange={(e) => s.setBotMessageCustomerId(e.target.value ? Number(e.target.value) : null)}
              style={inputStyle(t)}
            >
              <option value="">Semua customer</option>
              {s.botMessageCustomers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} @{c.username} ({c.messageCount})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle(t)}>Arah pesan</label>
            <select
              value={s.botMessageDirection}
              onChange={(e) => s.setBotMessageDirection(e.target.value as 'all' | BotMessageDirection)}
              style={inputStyle(t)}
            >
              <option value="all">Semua arah</option>
              <option value="incoming">Incoming</option>
              <option value="outgoing">Outgoing</option>
            </select>
          </div>
        </div>
      </div>

      <div style={cardStyle(t, { padding: isMobile ? '14px 10px' : '18px 22px' })}>
        <div
          ref={threadRef}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            maxHeight: isMobile ? 'min(58dvh, 520px)' : 'min(62dvh, 680px)',
            minHeight: rows.length ? (isMobile ? 320 : 420) : undefined,
            overflowY: 'auto',
            paddingRight: isMobile ? 2 : 6,
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {rows.length === 0 && (
            <div style={{ padding: isMobile ? '18px 8px' : 28, textAlign: 'center', fontSize: 13.5, color: t.faint }}>
              Belum ada pesan untuk filter ini.
            </div>
          )}
          {orderedRows.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
        </div>
      </div>

      <Pager page={list.page} totalPages={list.totalPages} loading={list.loading} onPage={(p) => s.setListPage('botMessages', p)} />
    </section>
  )
}

function MessageBubble({ message: m }: { message: BotMessage }) {
  const s = useAdmin()
  const t = getTheme(s.dark)
  const isMobile = useIsMobile()
  const incoming = m.direction === 'incoming'
  const outgoingBadge = poStatusBadge(s.dark).open
  const author = incoming ? (m.customerName || m.telegramUsername || 'Customer') : 'Bot'
  const username = incoming && m.telegramUsername ? '@' + m.telegramUsername : ''
  const text = m.text || (m.command ? m.command : '[' + m.messageType + ']')

  return (
    <div style={{ display: 'flex', justifyContent: incoming ? 'flex-start' : 'flex-end' }}>
      <div
        style={{
          width: 'fit-content',
          maxWidth: isMobile ? '92%' : '72%',
          minWidth: isMobile ? 0 : 260,
          background: incoming ? t.surfaceAlt : (s.dark ? '#173733' : '#E2F0EE'),
          border: `1px solid ${incoming ? t.rowBorder : (s.dark ? '#24534D' : '#B8D7D2')}`,
          borderRadius: incoming ? '8px 8px 8px 2px' : '8px 8px 2px 8px',
          padding: isMobile ? '10px 12px' : '11px 14px',
          color: t.ink,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 7 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, overflowWrap: 'anywhere' }}>{author}</div>
            {username && <div style={{ fontSize: 11.5, color: t.faint, marginTop: 1 }}>{username}</div>}
          </div>
          <span style={{ fontSize: 11.5, color: t.faint, fontWeight: 700, whiteSpace: 'nowrap' }}>{m.receivedAt}</span>
        </div>

        <div style={{ fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', marginBottom: 9 }}>
          {text}
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {incoming ? (
            <Pill bg={t.chipBg} color={t.chipColor}>Incoming</Pill>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: outgoingBadge.bg, color: outgoingBadge.color, borderRadius: 99, padding: '6px 14px', fontSize: 12.5, fontWeight: 700 }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: 'currentColor', display: 'inline-block' }} />
              Outgoing
            </span>
          )}
          <span style={{ fontSize: 11.5, color: t.muted, fontWeight: 700 }}>{m.messageType}</span>
          {m.isCommand && m.command && (
            <span style={{ fontSize: 11.5, color: BRAND.terracotta, fontWeight: 800 }}>{m.command}</span>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: t.faint, fontWeight: 600 }}>chat {m.telegramChatId}</span>
        </div>
      </div>
    </div>
  )
}
