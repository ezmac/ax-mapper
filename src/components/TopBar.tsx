import { useState } from 'react'
import type { CanvasAPI } from '../canvas/CanvasAPI'
import type Konva from 'konva'
import { exportJSON } from '../utils/exportJSON'
import { importJSON } from '../utils/importJSON'
import { exportPng } from '../utils/exportPng'
import { coneSettings } from '../settings'

interface TopBarProps {
  scale: number
  setScale: (s: number) => void
  siteW: number
  siteH: number
  setSiteW: (w: number) => void
  setSiteH: (h: number) => void
  onImageUpload: (dataUrl: string) => void
  getCanvasAPI: () => CanvasAPI | null
  getStage: () => Konva.Stage | null
  showGrid: boolean
  setShowGrid: (v: boolean) => void
  showBackground: boolean
  setShowBackground: (v: boolean) => void
  onMeasureScale: () => void
  isMeasuring: boolean
  imageUrl: string | null
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

function ToggleBtn({ label, active, onClick }: {
  label: string; active: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? '#2563eb' : '#334155',
        color: active ? 'white' : '#94a3b8',
        border: '1px solid',
        borderColor: active ? '#2563eb' : '#475569',
        borderRadius: 6,
        padding: '4px 10px',
        fontSize: 12,
        cursor: 'pointer',
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

export function TopBar({
  scale, setScale,
  siteW, siteH, setSiteW, setSiteH,
  onImageUpload, getCanvasAPI, getStage,
  showGrid, setShowGrid,
  showBackground, setShowBackground,
  onMeasureScale, isMeasuring,
  imageUrl,
}: TopBarProps) {
  const [exportingPng, setExportingPng] = useState(false)

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
      const canvasAPI = getCanvasAPI()
      if (!canvasAPI) return
      try {
        const data = JSON.parse(ev.target?.result as string)
        importJSON(canvasAPI, data, coneSettings.size)
      } catch (err) {
        alert(`Import failed: ${(err as Error).message}`)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function handleExportPng() {
    const stage = getStage()
    if (!stage || exportingPng) return
    setExportingPng(true)
    try {
      await exportPng(stage, imageUrl, siteW, siteH, scale)
    } catch (err) {
      alert(`PNG export failed: ${(err as Error).message}`)
    } finally {
      setExportingPng(false)
    }
  }

  function handleDownload() {
    const canvasAPI = getCanvasAPI()
    if (!canvasAPI) return
    const data = exportJSON(canvasAPI.getCones(), scale)
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
        <span style={{ color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap' }}>ft/unit:</span>
        <NumInput value={scale / 0.3048} onChange={v => setScale(v * 0.3048)} width={68} step={0.1} min={0.01} />
      </div>

      {/* Measure scale */}
      <button
        onClick={onMeasureScale}
        style={{
          background: isMeasuring ? '#d97706' : '#334155',
          color: isMeasuring ? 'white' : '#cbd5e1',
          border: '1px solid',
          borderColor: isMeasuring ? '#d97706' : '#475569',
          borderRadius: 6,
          padding: '4px 10px',
          fontSize: 12,
          cursor: 'pointer',
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        📏 Measure Scale
      </button>

      {/* View toggles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: '#64748b', fontSize: 11, whiteSpace: 'nowrap' }}>Show:</span>
        <ToggleBtn label="20′ Grid" active={showGrid} onClick={() => setShowGrid(!showGrid)} />
        <ToggleBtn label="Background" active={showBackground} onClick={() => setShowBackground(!showBackground)} />
      </div>

      <div style={{ flex: 1 }} />

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
        onClick={handleExportPng}
        disabled={exportingPng}
        style={{
          background: exportingPng ? '#374151' : '#0f766e', color: 'white', border: 'none',
          borderRadius: 6, padding: '6px 14px', fontSize: 13,
          cursor: exportingPng ? 'not-allowed' : 'pointer', fontWeight: 600, whiteSpace: 'nowrap',
        }}
      >
        {exportingPng ? 'Exporting…' : '⬇ Export PNG'}
      </button>

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
