import { useRef } from 'react'
import type { Theme } from '../theme'
import { inputStyle } from '../styles'
import { HoverButton } from '../ui'

const tools = [
  { label: 'B', before: '<b>', after: '</b>' },
  { label: 'I', before: '<i>', after: '</i>' },
  { label: 'U', before: '<u>', after: '</u>' },
  { label: 'S', before: '<s>', after: '</s>' },
  { label: '</>', before: '<code>', after: '</code>' },
] as const

export function HtmlTemplateEditor({ value, placeholders, theme, onChange }: { value: string; placeholders: string[]; theme: Theme; onChange: (value: string) => void }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const buttonStyle = {
    border: `1px solid ${theme.border}`,
    background: theme.surface,
    color: theme.ink,
    borderRadius: 8,
    padding: '7px 10px',
    fontSize: 12,
    fontWeight: 800,
  }

  const insertAtSelection = (before: string, after = '') => {
    const textarea = textareaRef.current
    if (!textarea) return onChange(`${value}${before}${after}`)
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = value.slice(start, end)
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`
    onChange(next)
    requestAnimationFrame(() => {
      textarea.focus()
      const cursorStart = start + before.length
      const cursorEnd = cursorStart + selected.length
      textarea.setSelectionRange(cursorStart, cursorEnd)
    })
  }

  const setLink = () => {
    const href = window.prompt('URL link', 'https://')
    if (!href?.trim()) return
    insertAtSelection(`<a href="${href.trim()}">`, '</a>')
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {tools.map((tool) => (
          <button key={tool.label} type="button" onClick={() => insertAtSelection(tool.before, tool.after)} style={buttonStyle}>{tool.label}</button>
        ))}
        <button type="button" onClick={setLink} style={buttonStyle}>Link</button>
        <button type="button" onClick={() => insertAtSelection('<br>')} style={buttonStyle}>Line break</button>
      </div>
      {placeholders.length ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {placeholders.map((name) => (
            <HoverButton key={name} onClick={() => insertAtSelection(`{{${name}}}`)} style={{ border: `1px solid ${theme.border}`, background: theme.surfaceAlt, color: theme.muted, borderRadius: 999, padding: '5px 9px', fontSize: 11, fontWeight: 800 }}>
              {'{{' + name + '}}'}
            </HoverButton>
          ))}
        </div>
      ) : null}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={8}
        spellCheck={false}
        style={inputStyle(theme, { minHeight: 170, resize: 'vertical', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 13, lineHeight: 1.55, whiteSpace: 'pre-wrap' })}
      />
      <div style={{ fontSize: 12, color: theme.faint }}>
        Semua markup terlihat dan tersimpan apa adanya. Enter = newline biasa. Gunakan <code>&lt;br&gt;</code> jika ingin line break HTML eksplisit Telegram.
      </div>
      <details style={{ fontSize: 12, color: theme.faint }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Telegram preview</summary>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '8px 0 0', padding: 10, borderRadius: 8, background: theme.surfaceAlt }}>{telegramPreview(value)}</pre>
      </details>
    </div>
  )
}

function telegramPreview(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(b|strong|i|em|u|ins|s|strike|del|code|pre)>/gi, '')
    .replace(/<a\s+href=("[^"]+"|'[^']+')>/gi, '')
    .replace(/<\/a>/gi, '')
}
