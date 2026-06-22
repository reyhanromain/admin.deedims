import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import type { Theme } from '../theme'
import { inputStyle } from '../styles'
import { HoverButton } from '../ui'

const tools = [
  { label: 'B', action: 'bold' },
  { label: 'I', action: 'italic' },
  { label: 'U', action: 'underline' },
  { label: 'S', action: 'strike' },
  { label: '</>', action: 'code' },
] as const

export function HtmlTemplateEditor({ value, placeholders, theme, onChange }: { value: string; placeholders: string[]; theme: Theme; onChange: (value: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, bulletList: false, orderedList: false, blockquote: false, horizontalRule: false }),
      Underline,
      Link.configure({ openOnClick: false, autolink: false, defaultProtocol: 'https' }),
    ],
    content: value || '',
    editorProps: {
      attributes: { style: `min-height: 132px; outline: none; line-height: 1.55; color: ${theme.ink};` },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  useEffect(() => {
    if (!editor || editor.getHTML() === (value || '')) return
    editor.commands.setContent(value || '', { emitUpdate: false })
  }, [editor, value])

  const buttonStyle = (active = false) => ({
    border: `1px solid ${active ? theme.green : theme.border}`,
    background: active ? theme.itemBg : theme.surface,
    color: active ? theme.green : theme.ink,
    borderRadius: 8,
    padding: '7px 10px',
    fontSize: 12,
    fontWeight: 800,
  })

  const runTool = (action: typeof tools[number]['action']) => {
    if (!editor) return
    if (action === 'bold') editor.chain().focus().toggleBold().run()
    if (action === 'italic') editor.chain().focus().toggleItalic().run()
    if (action === 'underline') editor.chain().focus().toggleUnderline().run()
    if (action === 'strike') editor.chain().focus().toggleStrike().run()
    if (action === 'code') editor.chain().focus().toggleCode().run()
  }

  const setLink = () => {
    if (!editor) return
    const current = editor.getAttributes('link').href as string | undefined
    const href = window.prompt('URL link', current ?? 'https://')
    if (href === null) return
    if (!href.trim()) editor.chain().focus().unsetLink().run()
    else editor.chain().focus().setLink({ href: href.trim() }).run()
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {tools.map((tool) => (
          <button key={tool.action} type="button" onClick={() => runTool(tool.action)} style={buttonStyle(editor?.isActive(tool.action) ?? false)}>{tool.label}</button>
        ))}
        <button type="button" onClick={setLink} style={buttonStyle(editor?.isActive('link') ?? false)}>Link</button>
        <button type="button" onClick={() => editor?.chain().focus().undo().run()} style={buttonStyle()}>Undo</button>
        <button type="button" onClick={() => editor?.chain().focus().redo().run()} style={buttonStyle()}>Redo</button>
      </div>
      {placeholders.length ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {placeholders.map((name) => (
            <HoverButton key={name} onClick={() => editor?.chain().focus().insertContent(`{{${name}}}`).run()} style={{ border: `1px solid ${theme.border}`, background: theme.surfaceAlt, color: theme.muted, borderRadius: 999, padding: '5px 9px', fontSize: 11, fontWeight: 800 }}>
              {'{{' + name + '}}'}
            </HoverButton>
          ))}
        </div>
      ) : null}
      <div style={inputStyle(theme, { minHeight: 150, cursor: 'text' })} onClick={() => editor?.chain().focus().run()}>
        <EditorContent editor={editor} />
      </div>
      <details style={{ fontSize: 12, color: theme.faint }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700 }}>HTML preview</summary>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '8px 0 0', padding: 10, borderRadius: 8, background: theme.surfaceAlt }}>{value}</pre>
      </details>
    </div>
  )
}
