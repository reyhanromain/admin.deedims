import type { CSSProperties } from 'react'
import type { Theme } from './theme'

/** Standard themed text input / select style. */
export function inputStyle(t: Theme, extra?: CSSProperties): CSSProperties {
  return {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${t.inputBorder}`,
    borderRadius: 8,
    fontSize: 13.5,
    color: t.ink,
    outline: 'none',
    background: t.inputBg,
    ...extra,
  }
}

/** Card surface used across screens. */
export function cardStyle(t: Theme, extra?: CSSProperties): CSSProperties {
  return {
    background: t.surface,
    border: `1px solid ${t.border}`,
    borderRadius: 8,
    ...extra,
  }
}

/** Field label above inputs. */
export function labelStyle(t: Theme): CSSProperties {
  return {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: t.muted,
    marginBottom: 5,
  }
}

/** Section table header cell row. */
export function tableHeadStyle(t: Theme, minWidth: number): CSSProperties {
  return {
    padding: '12px 20px',
    background: t.surfaceAlt,
    borderBottom: `1px solid ${t.border}`,
    fontSize: 11.5,
    fontWeight: 700,
    color: t.muted,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    minWidth,
  }
}

export function mobileMetaGrid(): CSSProperties {
  return {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 8,
  }
}

export function mobileStatStyle(t: Theme): CSSProperties {
  return {
    background: t.surfaceAlt,
    border: `1px solid ${t.rowBorder}`,
    borderRadius: 8,
    padding: '10px 12px',
    minWidth: 0,
  }
}
