import type { Editor } from 'tldraw'
import { exportJSON } from '../utils/exportJSON'
import { importJSON } from '../utils/importJSON'
import { coneSettings } from '../settings'

interface TopBarProps {
  scale: number
  setScale: (s: number) => void
  siteW: number
  siteH: number
  setSiteW: (w: number) => void
  setSiteH: (h: number) => void
  onImageUpload: (dataUrl: string) => void
  getEditor: () => Editor | null
}

const inputStyle: React.CSSProperties = {
  background: '#334155',
  color: 'white',
  border: '1px solid #475569',
  borderRadius: 6,
  padding: '3px 6px',
  fontSize: 13,
}

function NumInput({ value, onChange, width = 70, step = 1, min = 1 }: {
  value: number
  onChange: (v: number) => void
  width?: number
  step?: number
  min?: number
}) {
  return (
    <input
      type="number"
      value={value}
      step={step}
      min={min}
      onChange={e => {
        const v = parseFloat(e.target.value)
        if (v >= min) onChange(v)
      }}
      style={{ ...inputStyle, width }}
    />
  )
}

export function TopBar({
  scale, setScale,
  siteW, siteH, setSiteW, setSiteH,
  onImageUpload, getEditor,
}: TopBarProps) {
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => onImageUpload(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const editor = getEditor()
      if (!editor) return
      try {
        const data = JSON.parse(ev.target?.result as string)
        importJSON(editor, data, coneSettings.size)
      } catch (err) {
        alert(`Import failed: ${(err as Error).message}`)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleDownload() {
    const editor = getEditor()
    if (!editor) return
    const data = exportJSON(editor, scale)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ax_course.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{
      height: 48, flexShrink: 0,
      background: '#1e293b',
      display: 'flex', alignItems: 'center',
      gap: 10, padding: '0 14px',
    }}>
      <span style={{ color: 'white', fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', marginRight: 4 }}>
        AX Mapper
      </span>

      {/* Site map upload */}
      <label style={{
        background: '#334155', color: '#cbd5e1',
        border: '1px solid #475569', borderRadius: 6,
        padding: '4px 10px', fontSize: 13, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 6,
        userSelect: 'none', whiteSpace: 'nowrap',
      }}>
        📁 Upload Map
        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
      </label>

      {/* Site boundary dimensions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap' }}>Site (ft):</span>
        <NumInput value={siteW} onChange={setSiteW} width={66} />
        <span style={{ color: '#475569', fontSize: 12 }}>×</span>
        <NumInput value={siteH} onChange={setSiteH} width={66} />
      </div>

      {/* Coordinate scale */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap' }}>m/unit:</span>
        <NumInput value={scale} onChange={setScale} width={68} step={0.01} min={0.001} />
      </div>

      <div style={{ flex: 1 }} />

      <span style={{ color: '#94a3b8', fontSize: 11, whiteSpace: 'nowrap' }}>
        ← → rotate · Shift+← → fine · Esc = select · Ctrl+Z = undo
      </span>

      <label style={{
        background: '#334155', color: '#cbd5e1',
        border: '1px solid #475569', borderRadius: 6,
        padding: '6px 14px', fontSize: 13, cursor: 'pointer',
        fontWeight: 600, whiteSpace: 'nowrap', userSelect: 'none',
      }}>
        ⬆ Import JSON
        <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
      </label>

      <button
        onClick={handleDownload}
        style={{
          background: '#2563eb', color: 'white', border: 'none',
          borderRadius: 6, padding: '6px 14px', fontSize: 13,
          cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap',
        }}
      >
        ⬇ Download JSON
      </button>
    </div>
  )
}
