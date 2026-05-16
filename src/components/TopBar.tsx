import { useEffect, useRef, useState } from 'react'
import type { CanvasAPI } from '../canvas/CanvasAPI'
import type Konva from 'konva'
import { exportJSON } from '../utils/exportJSON'
import { importJSON } from '../utils/importJSON'
import type { ImportResult } from '../utils/importJSON'
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
  onImageFile?: (file: File) => void
  onPageDimsSet?: () => void
  getCanvasAPI: () => CanvasAPI | null
  getStage: () => Konva.Stage | null
  gridSpacing: number
  setGridSpacing: (v: number) => void
  gridOffsetX: number
  setGridOffsetX: (v: number) => void
  gridOffsetY: number
  setGridOffsetY: (v: number) => void
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
  onSave: () => void
  onLayoutExport: () => void
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

function NumInput({ value, onChange, width = 70, step = 1, min }: {
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
        if (!isNaN(v) && (min === undefined || v >= min)) onChange(v)
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

function GridMenu({ gridSpacing, setGridSpacing, gridOffsetX, setGridOffsetX, gridOffsetY, setGridOffsetY, showBackground, setShowBackground }: {
  gridSpacing: number
  setGridSpacing: (v: number) => void
  gridOffsetX: number
  setGridOffsetX: (v: number) => void
  gridOffsetY: number
  setGridOffsetY: (v: number) => void
  showBackground: boolean
  setShowBackground: (v: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const [manualSpacing, setManualSpacing] = useState(gridSpacing > 0 ? gridSpacing : 20)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function applySpacing(v: number) {
    setGridSpacing(v)
    if (v > 0) setManualSpacing(v)
  }

  const label = gridSpacing === 0 ? 'Grid: Off' : `Grid: ${gridSpacing}′`

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px',
  }
  const labelStyle: React.CSSProperties = {
    color: '#94a3b8', fontSize: 12, whiteSpace: 'nowrap', minWidth: 84, textAlign: 'right',
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ ...btnBase, background: open ? '#475569' : '#334155', borderColor: open ? '#64748b' : '#475569' }}
      >
        {label} ▾
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          zIndex: 200,
          background: '#1e293b',
          border: '1px solid #475569',
          borderRadius: 8,
          padding: '8px 0',
          minWidth: 260,
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}>
          <div style={rowStyle}>
            <span style={labelStyle}>Spacing:</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <ToggleBtn label="Off" active={gridSpacing === 0} onClick={() => applySpacing(0)} />
              <ToggleBtn label="20′" active={gridSpacing === 20} onClick={() => applySpacing(20)} />
              <ToggleBtn label="25′" active={gridSpacing === 25} onClick={() => applySpacing(25)} />
            </div>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Manual (ft):</span>
            <NumInput
              value={manualSpacing}
              onChange={v => { setManualSpacing(v); setGridSpacing(v) }}
              width={68}
              min={1}
            />
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid #334155', margin: '6px 0' }} />
          <div style={rowStyle}>
            <span style={labelStyle}>X Offset (ft):</span>
            <NumInput value={gridOffsetX} onChange={setGridOffsetX} width={68} step={1} />
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Y Offset (ft):</span>
            <NumInput value={gridOffsetY} onChange={setGridOffsetY} width={68} step={1} />
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid #334155', margin: '6px 0' }} />
          <div style={{ ...rowStyle, justifyContent: 'flex-end' }}>
            <ToggleBtn label="Background" active={showBackground} onClick={() => setShowBackground(!showBackground)} />
          </div>
        </div>
      )}
    </div>
  )
}

function ImportExportMenu({ getCanvasAPI, getStage, imageUrl, siteW, siteH, scale, setSiteW, setSiteH, onPageDimsSet, projectName, onLayoutExport }: {
  getCanvasAPI: () => CanvasAPI | null
  getStage: () => Konva.Stage | null
  imageUrl: string | null
  siteW: number
  siteH: number
  scale: number
  setSiteW: (w: number) => void
  setSiteH: (h: number) => void
  onPageDimsSet?: () => void
  projectName: string
  onLayoutExport: () => void
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
        const result: ImportResult = importJSON(canvasAPI, data, coneSettings.size)
        // Use page dimensions from the JSON transform to size the canvas so cones
        // align with the preview image (which is rendered at a different DPI).
        if (result.pageW != null && result.pageH != null) {
          setSiteW(Math.round(result.pageW))
          setSiteH(Math.round(result.pageH))
          onPageDimsSet?.()
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
          <hr style={{ border: 'none', borderTop: '1px solid #334155', margin: '4px 0' }} />
          <button onClick={() => { setOpen(false); onLayoutExport() }} style={itemStyle}>
            📍 Layout Export…
          </button>
        </div>
      )}
    </div>
  )
}

export function TopBar({
  scale, setScale,
  siteW, siteH, setSiteW, setSiteH,
  onImageUpload, onImageFile, onPageDimsSet, getCanvasAPI, getStage,
  gridSpacing, setGridSpacing,
  gridOffsetX, setGridOffsetX,
  gridOffsetY, setGridOffsetY,
  showBackground, setShowBackground,
  onMeasureScale, isMeasuring,
  imageUrl,
  activeProjectId, projects, onLoadProject, onNewProject, onDeleteProject, onRenameProject,
  onSave, onLayoutExport,
}: TopBarProps) {
  const activeProjectName = projects.find(p => p.id === activeProjectId)?.name ?? 'ax_course'

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    onImageFile?.(file)
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

      <GridMenu
        gridSpacing={gridSpacing}
        setGridSpacing={setGridSpacing}
        gridOffsetX={gridOffsetX}
        setGridOffsetX={setGridOffsetX}
        gridOffsetY={gridOffsetY}
        setGridOffsetY={setGridOffsetY}
        showBackground={showBackground}
        setShowBackground={setShowBackground}
      />

      <div style={{ flex: 1 }} />

      <button onClick={onSave} style={btnBase} title="Save (Ctrl+S)">
        💾 Save
      </button>

      <ImportExportMenu
        getCanvasAPI={getCanvasAPI}
        getStage={getStage}
        imageUrl={imageUrl}
        siteW={siteW}
        siteH={siteH}
        scale={scale}
        setSiteW={setSiteW}
        setSiteH={setSiteH}
        onPageDimsSet={onPageDimsSet}
        projectName={activeProjectName}
        onLayoutExport={onLayoutExport}
      />
    </div>
  )
}
