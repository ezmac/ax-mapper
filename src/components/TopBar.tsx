import { useEffect, useRef, useState } from 'react'
import type { CanvasAPI } from '../canvas/CanvasAPI'
import type Konva from 'konva'
import { exportJSON } from '../utils/exportJSON'
import { importJSON } from '../utils/importJSON'
import { exportPng } from '../utils/exportPng'
import { coneSettings } from '../settings'
import { ProjectMenu } from './ProjectMenu'
import type { ProjectData } from '../services/ProjectStore'

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
  gridSpacing: number
  setGridSpacing: (v: number) => void
  showBackground: boolean
  setShowBackground: (v: boolean) => void
  onMeasureScale: () => void
  isMeasuring: boolean
  imageUrl: string | null
  // Project props
  activeProjectId: string | null
  projects: ProjectData[]
  onLoadProject: (id: string) => void
  onNewProject: (name: string, keepImage: boolean) => void
  onDeleteProject: (id: string) => void
  onRenameProject: (id: string, name: string) => void
}

const inputStyle: React.CSSProperties = {
  background: '#334155',
  color: 'white',
  border: '1px solid #475569',
  borderRadius: 6,
  padding: '3px 6px',
  fontSize: 13,
}

const btnBase: React.CSSProperties = {
  background: '#334155',
  color: '#cbd5e1',
  border: '1px solid #475569',
  borderRadius: 6,
  padding: '4px 10px',
  fontSize: 13,
  cursor: 'pointer',
  fontWeight: 600,
  whiteSpace: 'nowrap',
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

function ImportExportMenu({ getCanvasAPI, getStage, imageUrl, siteW, siteH, scale, setSiteW, setSiteH, projectName }: {
  getCanvasAPI: () => CanvasAPI | null
  getStage: () => Konva.Stage | null
  imageUrl: string | null
  siteW: number
  siteH: number
  scale: number
  setSiteW: (w: number) => void
  setSiteH: (h: number) => void
  projectName: string
}) {
  const filename = projectName.replace(/\s+/g, '_')
  const [open, setOpen] = useState(false)
  const [exportingPng, setExportingPng] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

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
        // If a background image is loaded and the JSON has a scale transform,
        // resize the canvas so 1 canvas unit = 1 image pixel, preserving scale.
        if (imageUrl && data.transform?.type === 'scale') {
          const img = new window.Image()
          img.onload = () => {
            setSiteW(Math.round(img.naturalWidth  * scale / 0.3048))
            setSiteH(Math.round(img.naturalHeight * scale / 0.3048))
          }
          img.src = imageUrl
        }
      } catch (err) {
        alert(`Import failed: ${(err as Error).message}`)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
    setOpen(false)
  }

  async function handleExportPng() {
    const stage = getStage()
    if (!stage || exportingPng) return
    setExportingPng(true)
    setOpen(false)
    try {
      await exportPng(stage, imageUrl, siteW, siteH, scale, filename)
    } catch (err) {
      alert(`PNG export failed: ${(err as Error).message}`)
    } finally {
      setExportingPng(false)
    }
  }

  function handleDownloadJSON() {
    const canvasAPI = getCanvasAPI()
    if (!canvasAPI) return
    const data = exportJSON(canvasAPI.getCones(), scale)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}.json`
    a.click()
    URL.revokeObjectURL(url)
    setOpen(false)
  }

  const itemStyle: React.CSSProperties = {
    display: 'block', width: '100%', textAlign: 'left',
    background: 'none', border: 'none',
    color: '#e2e8f0', fontSize: 13, fontWeight: 600,
    padding: '8px 14px', cursor: 'pointer',
    whiteSpace: 'nowrap',
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ ...btnBase, background: open ? '#475569' : '#334155', borderColor: open ? '#64748b' : '#475569' }}
      >
        {exportingPng ? 'Exporting…' : '⬆⬇ Import / Export'} ▾
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          right: 0,
          zIndex: 200,
          background: '#1e293b',
          border: '1px solid #475569',
          borderRadius: 8,
          padding: '4px 0',
          minWidth: 190,
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}>
          <label style={{ ...itemStyle, cursor: 'pointer' }}>
            ⬆ Import JSON
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
          </label>
          <button
            onClick={handleExportPng}
            disabled={exportingPng}
            style={{ ...itemStyle, opacity: exportingPng ? 0.5 : 1, cursor: exportingPng ? 'not-allowed' : 'pointer' }}
          >
            ⬇ Export PNG
          </button>
          <button onClick={handleDownloadJSON} style={itemStyle}>
            ⬇ Download JSON
          </button>
        </div>
      )}
    </div>
  )
}

export function TopBar({
  scale, setScale,
  siteW, siteH, setSiteW, setSiteH,
  onImageUpload, getCanvasAPI, getStage,
  gridSpacing, setGridSpacing,
  showBackground, setShowBackground,
  onMeasureScale, isMeasuring,
  imageUrl,
  activeProjectId, projects, onLoadProject, onNewProject, onDeleteProject, onRenameProject,
}: TopBarProps) {
  const activeProjectName = projects.find(p => p.id === activeProjectId)?.name ?? 'ax_course'

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => onImageUpload(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
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

      <ProjectMenu
        activeProjectId={activeProjectId}
        projects={projects}
        onLoad={onLoadProject}
        onNew={onNewProject}
        onDelete={onDeleteProject}
        onRename={onRenameProject}
      />

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
        <span style={{ color: '#64748b', fontSize: 11, whiteSpace: 'nowrap' }}>Grid:</span>
        {([0, 20, 25] as const).map(v => (
          <ToggleBtn
            key={v}
            label={v === 0 ? 'Off' : `${v}′`}
            active={gridSpacing === v}
            onClick={() => setGridSpacing(v)}
          />
        ))}
        <ToggleBtn label="Background" active={showBackground} onClick={() => setShowBackground(!showBackground)} />
      </div>

      <div style={{ flex: 1 }} />

      <ImportExportMenu
        getCanvasAPI={getCanvasAPI}
        getStage={getStage}
        imageUrl={imageUrl}
        siteW={siteW}
        siteH={siteH}
        scale={scale}
        setSiteW={setSiteW}
        setSiteH={setSiteH}
        projectName={activeProjectName}
      />
    </div>
  )
}
