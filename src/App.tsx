import { useRef, useState, useEffect, useCallback } from 'react'
import { KonvaCanvas } from './canvas/KonvaCanvas'
import type { KonvaCanvasHandle } from './canvas/KonvaCanvas'
import { ConeToolbar } from './components/ConeToolbar'
import { GridOverlay } from './components/GridOverlay'
import { HelpOverlay } from './components/HelpOverlay'
import { TopBar } from './components/TopBar'
import { MeasureOverlay } from './components/MeasureOverlay'
import { OverlaySettingsContext } from './context/overlaySettings'
import { projectStore } from './services/ProjectStore'
import type { ProjectData } from './services/ProjectStore'
import type { ConeData } from './canvas/ConeData'

const DEFAULT_SCALE = 0.3048
const DEFAULT_SITE_W = 1000
const DEFAULT_SITE_H = 600

// Ensure there is always a valid active project before App renders
function ensureActiveProject(): void {
  let id = projectStore.getActiveId()
  if (!id || !projectStore.getById(id)) {
    id = projectStore.create({
      name: 'Default Project',
      cones: [],
      scale: DEFAULT_SCALE,
      siteW: DEFAULT_SITE_W,
      siteH: DEFAULT_SITE_H,
      gridSpacing: 0,
      showBackground: true,
    })
    projectStore.setActiveId(id)
  }
}
ensureActiveProject()

export default function App() {
  const initial = projectStore.getActiveProject()!

  const [activeProjectId, setActiveProjectId] = useState(initial.id)
  const [scale, setScale] = useState(initial.scale)
  const [imageUrl, setImageUrl] = useState<string | null>(() => projectStore.getImage(initial.id))
  const [siteW, setSiteW] = useState(initial.siteW)
  const [siteH, setSiteH] = useState(initial.siteH)
  const [gridSpacing, setGridSpacing] = useState(initial.gridSpacing)
  const [showBackground, setShowBackground] = useState(initial.showBackground)
  const [measuring, setMeasuring] = useState(false)
  const [camera, setCamera] = useState({ x: 0, y: 0, z: 1 })
  const [selectedCones, setSelectedCones] = useState<ConeData[]>([])
  const [projectsList, setProjectsList] = useState<ProjectData[]>(() => projectStore.getAll())

  // Refs mirror state for use in callbacks / debounced timers
  const activeProjectIdRef = useRef(activeProjectId)
  activeProjectIdRef.current = activeProjectId
  const scaleRef = useRef(scale)
  scaleRef.current = scale
  const imageUrlRef = useRef(imageUrl)
  imageUrlRef.current = imageUrl
  const siteWRef = useRef(siteW)
  siteWRef.current = siteW
  const siteHRef = useRef(siteH)
  siteHRef.current = siteH
  const gridSpacingRef = useRef(gridSpacing)
  gridSpacingRef.current = gridSpacing
  const showBackgroundRef = useRef(showBackground)
  showBackgroundRef.current = showBackground

  // handle is stored in state so ConeToolbar re-renders after canvas mounts
  const [canvasHandle, setCanvasHandle] = useState<KonvaCanvasHandle | null>(null)
  // also kept in a ref for imperative access (export/import callbacks)
  const handleRef = useRef<KonvaCanvasHandle | null>(null)

  // Set to true only when the user explicitly uploads a new image file.
  // The aspect-ratio auto-adjust should only fire for explicit uploads,
  // not when imageUrl is restored from storage (initial mount or project load).
  const explicitUploadRef = useRef(false)

  // Auto-save debounce timer
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function scheduleSave() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      const id = activeProjectIdRef.current
      const project = projectStore.getById(id)
      if (!project) return
      const api = handleRef.current?.canvasAPI
      const cones = api ? api.getCones().filter(c => !c.isGhost) : []
      projectStore.save(id, {
        name: project.name,
        cones,
        scale: scaleRef.current,
        siteW: siteWRef.current,
        siteH: siteHRef.current,
        gridSpacing: gridSpacingRef.current,
        showBackground: showBackgroundRef.current,
      }, imageUrlRef.current)
    }, 500)
  }

  // When a new image is uploaded, snap siteH to match the image's natural aspect ratio.
  // Only runs for explicit user uploads (not storage restores or project loads).
  const didMountRef = useRef(false)
  useEffect(() => {
    if (!imageUrl || !explicitUploadRef.current) return
    explicitUploadRef.current = false
    const img = new window.Image()
    img.onload = () => {
      setSiteW(img.naturalWidth)
      setSiteH(img.naturalHeight)
    }
    img.src = imageUrl
  }, [imageUrl])

  // Auto-save when any settings state changes (skip on initial mount)
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return }
    scheduleSave()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale, imageUrl, siteW, siteH, gridSpacing, showBackground])

  // Canvas dimensions in canvas-space units
  const canvasW = siteW * 0.3048 / scale
  const canvasH = siteH * 0.3048 / scale

  const handleSelectionChange = useCallback((cones: ConeData[]) => {
    setSelectedCones(cones)
  }, [])

  function handleMeasureScale(newScale: number) {
    setSiteW(Math.round(siteW * newScale / scale))
    setSiteH(Math.round(siteH * newScale / scale))
    setScale(newScale)
  }

  function handleCanvasReady(handle: KonvaCanvasHandle) {
    handleRef.current = handle
    setCanvasHandle(handle)

    // Load cones from the active project
    const project = projectStore.getById(activeProjectIdRef.current)
    if (project && project.cones.length > 0) {
      handle.canvasAPI.loadCones(project.cones)
    }

    // Auto-save whenever cones change
    handle.canvasAPI.onConesChange(() => scheduleSave())
  }

  // ── Shared save-current-project helper ──────────────────────────────────────
  function saveCurrentProject() {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    const id = activeProjectIdRef.current
    const project = projectStore.getById(id)
    if (!project) return
    const api = handleRef.current?.canvasAPI
    const cones = api ? api.getCones().filter(c => !c.isGhost) : []
    projectStore.save(id, {
      name: project.name,
      cones,
      scale: scaleRef.current,
      siteW: siteWRef.current,
      siteH: siteHRef.current,
      gridSpacing: gridSpacingRef.current,
      showBackground: showBackgroundRef.current,
    }, imageUrlRef.current)
  }

  // ── Project actions ──────────────────────────────────────────────────────────
  function handleLoadProject(id: string) {
    saveCurrentProject()

    const project = projectStore.getById(id)
    if (!project) return

    projectStore.setActiveId(id)
    setActiveProjectId(id)

    const img = projectStore.getImage(id)
    setImageUrl(img)
    setScale(project.scale)
    setSiteW(project.siteW)
    setSiteH(project.siteH)
    setGridSpacing(project.gridSpacing)
    setShowBackground(project.showBackground)

    const api = handleRef.current?.canvasAPI
    if (api) {
      api.clearAllCones()
      api.loadCones(project.cones)
    }
    handleRef.current?.resetCamera()
  }

  function handleNewProject(name: string, keepImage: boolean) {
    saveCurrentProject()

    const newId = projectStore.create({
      name,
      cones: [],
      scale: keepImage ? scaleRef.current : DEFAULT_SCALE,
      siteW: keepImage ? siteWRef.current : DEFAULT_SITE_W,
      siteH: keepImage ? siteHRef.current : DEFAULT_SITE_H,
      gridSpacing: gridSpacingRef.current,
      showBackground: true,
    })

    if (keepImage) {
      // Copy current background image to new project
      projectStore.saveImage(newId, imageUrlRef.current)
    }

    projectStore.setActiveId(newId)
    setActiveProjectId(newId)

    if (!keepImage) {
      setImageUrl(null)
      setScale(DEFAULT_SCALE)
      setSiteW(DEFAULT_SITE_W)
      setSiteH(DEFAULT_SITE_H)
    }
    setShowBackground(true)

    const api = handleRef.current?.canvasAPI
    if (api) api.clearAllCones()
    handleRef.current?.resetCamera()

    setProjectsList([...projectStore.getAll()])
  }

  function handleDeleteProject(id: string) {
    const fallbackId = projectStore.delete(id)
    setProjectsList([...projectStore.getAll()])

    if (id === activeProjectIdRef.current) {
      if (fallbackId) {
        handleLoadProject(fallbackId)
      } else {
        handleNewProject('Default Project', false)
      }
    }
  }

  function handleRenameProject(id: string, name: string) {
    projectStore.rename(id, name)
    setProjectsList([...projectStore.getAll()])
  }

  // Distance badge: shown when exactly 2 cones are selected
  let distanceFt: number | null = null
  if (selectedCones.length === 2) {
    const [a, b] = selectedCones
    const rA = a.rotation, rB = b.rotation
    const cxA = a.x + Math.cos(rA) * a.w / 2 - Math.sin(rA) * a.h / 2
    const cyA = a.y + Math.sin(rA) * a.w / 2 + Math.cos(rA) * a.h / 2
    const cxB = b.x + Math.cos(rB) * b.w / 2 - Math.sin(rB) * b.h / 2
    const cyB = b.y + Math.sin(rB) * b.w / 2 + Math.cos(rB) * b.h / 2
    const distPx = Math.sqrt((cxB - cxA) ** 2 + (cyB - cyA) ** 2)
    distanceFt = distPx * scale / 0.3048
  }

  return (
    <OverlaySettingsContext.Provider value={{
      gridSpacing, imageUrl, siteW, siteH, scale, showBackground, camera,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh' }}>
        <TopBar
          scale={scale}
          setScale={setScale}
          siteW={siteW}
          siteH={siteH}
          setSiteW={setSiteW}
          setSiteH={setSiteH}
          onImageUpload={(url) => { explicitUploadRef.current = true; setImageUrl(url) }}
          getCanvasAPI={() => handleRef.current?.canvasAPI ?? null}
          getStage={() => handleRef.current?.stage ?? null}
          gridSpacing={gridSpacing}
          setGridSpacing={setGridSpacing}
          showBackground={showBackground}
          setShowBackground={setShowBackground}
          onMeasureScale={() => setMeasuring(true)}
          isMeasuring={measuring}
          imageUrl={imageUrl}
          activeProjectId={activeProjectId}
          projects={projectsList}
          onLoadProject={handleLoadProject}
          onNewProject={handleNewProject}
          onDeleteProject={handleDeleteProject}
          onRenameProject={handleRenameProject}
        />
        <div style={{ flex: 1, position: 'relative' }}>
          <KonvaCanvas
            imageUrl={imageUrl}
            showBackground={showBackground}
            canvasW={canvasW}
            canvasH={canvasH}
            onCameraChange={(x, y, z) => setCamera({ x, y, z })}
            onReady={handleCanvasReady}
            onSelectionChange={handleSelectionChange}
          />
          {/* React overlays sit on top of the Konva stage */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <ConeToolbar
            toolManager={canvasHandle?.toolManager ?? null}
            onSizeChange={newSize => handleRef.current?.resizeSelected(newSize)}
            onAlign={() => handleRef.current?.alignSelected()}
          />
            <GridOverlay />
            <HelpOverlay />
            {distanceFt !== null && (
              <div style={{
                position: 'absolute', bottom: 16, right: 52,
                background: 'rgba(15,23,42,0.85)', color: '#f1f5f9',
                borderRadius: 8, padding: '6px 14px',
                fontSize: 13, fontWeight: 600, letterSpacing: '0.02em',
                backdropFilter: 'blur(4px)',
                border: '1px solid rgba(148,163,184,0.2)',
                pointerEvents: 'none',
              }}>
                {distanceFt.toFixed(1)} FT
              </div>
            )}
          </div>
          <MeasureOverlay
            active={measuring}
            getStage={() => handleRef.current?.stage ?? null}
            onScale={handleMeasureScale}
            onClose={() => setMeasuring(false)}
          />
        </div>
      </div>
    </OverlaySettingsContext.Provider>
  )
}
