import type { CSSProperties } from 'react'

/** Foto menu dengan fallback placeholder bila imageUrl kosong/gagal. */
export function ImageSlot({ src, label, radius = 0, style }: { src: string; label?: string; radius?: number; style?: CSSProperties }) {
  const base: CSSProperties = { background: '#F4ECE0', display: 'block', objectFit: 'cover', borderRadius: radius || undefined, ...style }
  if (src) {
    return (
      <img
        src={src}
        alt={label ?? ''}
        style={base}
        onError={(e) => {
          ;(e.currentTarget as HTMLImageElement).style.visibility = 'hidden'
        }}
      />
    )
  }
  return (
    <div style={{ ...base, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C8A98B', fontSize: 11, fontWeight: 600, textAlign: 'center', padding: 6 }}>
      {label ?? 'Foto'}
    </div>
  )
}

/** Ikon garis (stroke) ala desain. */
export function Icon({ d, size = 18, stroke = 'currentColor', width = 2, fill = 'none' }: { d: string; size?: number; stroke?: string; width?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

export const PATH = {
  back: 'M15 18l-6-6 6-6',
  chevronRight: 'M9 18l6-6-6-6',
  chevronDown: 'M6 9l6 6 6-6',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'M20 6 9 17l-5-5',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  clock: 'M12 7v5l3 2',
  info: 'M12 16v-4M12 8h.01',
}
