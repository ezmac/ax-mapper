import { useState, useEffect } from 'react'

interface HotkeyRow {
  keys: string[]
  desc: string
}

interface Section {
  title: string
  rows: HotkeyRow[]
}

const SECTIONS: Section[] = [
  {
    title: 'Stamp Tools',
    rows: [
      { keys: ['← →'], desc: 'Rotate 15°' },
      { keys: ['⇧ ← →'], desc: 'Fine rotate 1°' },
      { keys: ['↑ ↓'], desc: 'Adjust width / spacing' },
      { keys: ['⇧ ↑ ↓'], desc: 'Fine width adjust' },
      { keys: ['Esc'], desc: 'Back to Select' },
    ],
  },
  {
    title: 'Edit',
    rows: [
      { keys: ['Ctrl Z'], desc: 'Undo' },
      { keys: ['Ctrl ⇧ Z'], desc: 'Redo' },
      { keys: ['Del', 'Bksp'], desc: 'Delete selected' },
      { keys: ['Ctrl A'], desc: 'Select all' },
      { keys: ['Ctrl D'], desc: 'Duplicate' },
      { keys: ['Ctrl C', 'Ctrl V'], desc: 'Copy / Paste' },
    ],
  },
  {
    title: 'Navigate',
    rows: [
      { keys: ['Scroll'], desc: 'Zoom in / out' },
      { keys: ['Space drag'], desc: 'Pan' },
      { keys: ['Middle drag'], desc: 'Pan' },
      { keys: ['Ctrl ⇧ H'], desc: 'Fit to screen' },
    ],
  },
]

function Key({ label }: { label: string }) {
  return (
    <kbd style={{
      display: 'inline-block',
      background: '#1e293b',
      color: '#e2e8f0',
      border: '1px solid #475569',
      borderBottom: '2px solid #334155',
      borderRadius: 4,
      padding: '1px 6px',
      fontSize: 11,
      fontFamily: 'monospace',
      whiteSpace: 'nowrap',
      lineHeight: '18px',
    }}>
      {label}
    </kbd>
  )
}

export function HelpOverlay() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {/* Panel */}
      {open && (
        <div
          style={{
            position: 'absolute', bottom: 52, right: 12,
            background: '#0f172a', border: '1px solid #334155',
            borderRadius: 10, padding: '14px 16px',
            width: 280, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            pointerEvents: 'all', zIndex: 400,
          }}
          onPointerDown={e => e.stopPropagation()}
        >
          <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
            Keyboard Shortcuts
          </div>

          {SECTIONS.map(section => (
            <div key={section.title} style={{ marginBottom: 12 }}>
              <div style={{
                fontSize: 9, fontWeight: 700, color: '#64748b',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                marginBottom: 6,
              }}>
                {section.title}
              </div>
              {section.rows.map((row, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', marginBottom: 4,
                }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {row.keys.map((k, j) => (
                      <span key={j} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        {j > 0 && <span style={{ color: '#475569', fontSize: 10 }}>/</span>}
                        <Key label={k} />
                      </span>
                    ))}
                  </div>
                  <span style={{ color: '#94a3b8', fontSize: 11, textAlign: 'right', paddingLeft: 8 }}>
                    {row.desc}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ? button */}
      <button
        onClick={() => setOpen(v => !v)}
        title="Keyboard shortcuts"
        style={{
          position: 'absolute', bottom: 12, right: 12,
          width: 32, height: 32,
          background: open ? '#2563eb' : '#1e293b',
          color: open ? 'white' : '#94a3b8',
          border: '1px solid',
          borderColor: open ? '#2563eb' : '#334155',
          borderRadius: '50%',
          fontSize: 15, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          pointerEvents: 'all', zIndex: 401,
          lineHeight: 1,
        }}
        onPointerDown={e => e.stopPropagation()}
      >
        ?
      </button>
    </div>
  )
}
