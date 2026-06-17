import { useState } from 'react'
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'

/**
 * Button with a hover-merged style, porting the prototype's `style-hover` attribute.
 * `hover` is layered on top of `style` while the pointer is over the element.
 */
export function HoverButton({
  style,
  hover,
  children,
  ...rest
}: {
  style?: CSSProperties
  hover?: CSSProperties
  children?: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const [h, setH] = useState(false)
  return (
    <button
      {...rest}
      onMouseEnter={(e) => {
        setH(true)
        rest.onMouseEnter?.(e)
      }}
      onMouseLeave={(e) => {
        setH(false)
        rest.onMouseLeave?.(e)
      }}
      style={{ ...style, ...(h ? hover : null) }}
    >
      {children}
    </button>
  )
}

/** Generic hover wrapper for non-button elements (e.g. clickable rows). */
export function Hoverable({
  as = 'div',
  style,
  hover,
  children,
  ...rest
}: {
  as?: 'div'
  style?: CSSProperties
  hover?: CSSProperties
  children?: ReactNode
} & React.HTMLAttributes<HTMLDivElement>) {
  const [h, setH] = useState(false)
  const Tag = as
  return (
    <Tag
      {...rest}
      onMouseEnter={(e) => {
        setH(true)
        rest.onMouseEnter?.(e)
      }}
      onMouseLeave={(e) => {
        setH(false)
        rest.onMouseLeave?.(e)
      }}
      style={{ ...style, ...(h ? hover : null) }}
    >
      {children}
    </Tag>
  )
}

/** Inline SVG icon built from one or more path `d` strings. */
export function Icon({
  path,
  size = 18,
  stroke = 'currentColor',
  strokeWidth = 2,
  style,
  title,
}: {
  path: string
  size?: number
  stroke?: string
  strokeWidth?: number
  style?: CSSProperties
  title?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {title ? <title>{title}</title> : null}
      <path d={path} />
    </svg>
  )
}

/** Small rounded status pill. */
export function Pill({
  bg,
  color,
  children,
  style,
}: {
  bg: string
  color: string
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <span
      style={{
        background: bg,
        color,
        fontSize: 11,
        fontWeight: 700,
        borderRadius: 99,
        padding: '3px 10px',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  )
}
