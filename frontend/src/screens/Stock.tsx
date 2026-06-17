import { useAdmin } from '../store'
import { getTheme, BRAND, LOW_STOCK_THRESHOLD } from '../theme'
import { cardStyle, inputStyle, labelStyle, tableHeadStyle } from '../styles'
import { HoverButton } from '../ui'
import { Pager } from '../components/Pager'
import type { StockItem } from '../types'

const GRID = '1.5fr 1fr 1fr 170px'

export function Stock() {
  const s = useAdmin()
  const t = getTheme(s.dark)
  const list = s.lists.stock

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: 13.5, color: t.muted }}>Stock global — dipotong saat order disubmit, bukan saat masuk cart.</p>
        <HoverButton
          onClick={() => s.set({ showStockForm: !s.showStockForm })}
          style={{ border: 'none', background: BRAND.terracotta, color: '#fff', fontSize: 13, fontWeight: 700, borderRadius: 10, padding: '10px 18px' }}
          hover={{ background: BRAND.terracottaDark }}
        >
          {s.showStockForm ? 'Batal' : '+ Stock item'}
        </HoverButton>
      </div>

      {s.showStockForm && (
        <div style={cardStyle(t, { padding: '20px 22px', marginBottom: 18 })}>
          <h2 style={{ margin: '0 0 14px 0', fontSize: 15, fontWeight: 700 }}>Stock item baru</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle(t)}>Nama</label>
              <input value={s.sName} onChange={(e) => s.set({ sName: e.target.value })} placeholder="Dimsum Udang" style={inputStyle(t)} />
            </div>
            <div>
              <label style={labelStyle(t)}>Label (unik)</label>
              <input value={s.sLabel} onChange={(e) => s.set({ sLabel: e.target.value })} placeholder="dimsum-udang" style={inputStyle(t, { fontFamily: 'monospace' })} />
            </div>
            <div>
              <label style={labelStyle(t)}>Jumlah awal</label>
              <input type="number" value={s.sQty} onChange={(e) => s.set({ sQty: e.target.value })} placeholder="100" style={inputStyle(t)} />
            </div>
            <div>
              <label style={labelStyle(t)}>Unit</label>
              <input value={s.sUnit} onChange={(e) => s.set({ sUnit: e.target.value })} placeholder="pcs / pack / jar" style={inputStyle(t)} />
            </div>
          </div>
          <HoverButton
            onClick={s.createStock}
            style={{ border: 'none', background: BRAND.bamboo, color: '#fff', fontSize: 13, fontWeight: 700, borderRadius: 10, padding: '10px 18px' }}
            hover={{ background: BRAND.bambooDark }}
          >
            Simpan stock item
          </HoverButton>
        </div>
      )}

      <div style={cardStyle(t, { overflowX: 'auto' })}>
        <div style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, ...tableHeadStyle(t, 640) }}>
          <div>Stock item</div><div>Label</div><div>Sisa</div><div style={{ textAlign: 'right' }}>Adjust</div>
        </div>
        {(list.rows as StockItem[]).map((item) => {
          const isLow = item.quantity <= LOW_STOCK_THRESHOLD
          return (
            <div key={item.id} style={{ display: 'grid', gridTemplateColumns: GRID, gap: 12, padding: '13px 20px', borderBottom: `1px solid ${t.rowBorder}`, alignItems: 'center', minWidth: 640 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{item.name}</div>
              <div style={{ fontSize: 12.5, color: t.muted, fontFamily: 'monospace' }}>{item.label}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: isLow ? t.red : t.ink }}>{item.quantity}</span>
                <span style={{ fontSize: 12, color: t.muted }}>{item.unit}</span>
                {isLow && <span style={{ background: t.warnBg, color: t.warnColor, fontSize: 10.5, fontWeight: 700, borderRadius: 99, padding: '2px 8px' }}>MENIPIS</span>}
              </div>
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <HoverButton onClick={() => s.adjustStock(item.id, -10)} style={{ border: `1px solid ${t.inputBorder}`, background: t.surface, fontSize: 12, fontWeight: 700, borderRadius: 8, padding: '6px 9px', color: t.ink }} hover={{ opacity: 0.7 }}>−10</HoverButton>
                <HoverButton onClick={() => s.adjustStock(item.id, -1)} style={{ border: `1px solid ${t.inputBorder}`, background: t.surface, fontSize: 12, fontWeight: 700, borderRadius: 8, padding: '6px 10px', color: t.ink }} hover={{ opacity: 0.7 }}>−1</HoverButton>
                <HoverButton onClick={() => s.adjustStock(item.id, 1)} style={{ border: 'none', background: t.solidBg, color: t.solidColor, fontSize: 12, fontWeight: 700, borderRadius: 8, padding: '6px 10px' }} hover={{ opacity: 0.85 }}>+1</HoverButton>
                <HoverButton onClick={() => s.adjustStock(item.id, 10)} style={{ border: 'none', background: t.solidBg, color: t.solidColor, fontSize: 12, fontWeight: 700, borderRadius: 8, padding: '6px 9px' }} hover={{ opacity: 0.85 }}>+10</HoverButton>
              </div>
            </div>
          )
        })}
      </div>

      <Pager page={list.page} totalPages={list.totalPages} loading={list.loading} onPage={(p) => s.setListPage('stock', p)} />
    </section>
  )
}
