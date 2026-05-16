import { useRef, useState, useEffect, useCallback } from 'react'
import { KonvaCanvas } from './canvas/KonvaCanvas'
import type { KonvaCanvasHandle } from './canvas/KonvaCanvas'
import { ConeToolbar } from './components/ConeToolbar'
import { GridOverlay } from './components/GridOverlay'
import { HelpOverlay } from './components/HelpOverlay'
import { TopBar } from './components/TopBar'
import { MeasureOverlay } from './components/MeasureOverlay'
import { GcpPanel } from './components/GcpPanel'
import { SectionPanel } from './components/SectionPanel'
import { LayoutExportModal } from './components/LayoutExportModal'
import { OverlaySettingsContext } from './context/overlaySettings'
import type { ProjectData } from './services/ProjectStore'
import type { IProjectStore } from './services/IProjectStore'
import type { ConeData } from './canvas/ConeData'

interface AppProps {
  store: IProjectStore
  initial: ProjectData
  initialImage: string | null
  projects: ProjectData[]
}

export default function App({ store, initial, initialImage, projects: initialProjects }: AppProps) {
  const [activeProjectId, setActiveProjectId] = useState(initial.id)
  const [scale, setScale] = useState(initial.scale)
  const [imageUrl, setImageUrl] = useState<string | null>(initialImage)
  const [siteW, setSiteW] = useState(initial.siteW)
  const [siteH, setSiteH] = useState(initial.siteH)
  const [gridSpacing, setGridSpacing] = useState(initial.gridSpacing)
  const [gridOffsetX, setGridOffsetX] = useState(0)
  const [gridOffsetY, setGridOffsetY] = useState(0)
  const [showBackground, setShowBackground] = useState(initial.showBackground)
  const [measuring, setMeasuring] = useState(false)
  const [camera, setCamera] = useState({ x: 0, y: 0, z: 1 })
  const [selectedCones, setSelectedCones] = useState<ConeData[]>([])
  const [projectsList, setProjectsList] = useState<ProjectData[]>(initialProjects)
  const [showLayoutExport, setShowLayoutExport] = useState(false)

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

  // Cones/paths from the initial project, used in handleCanvasReady
  const initialConesRef = useRef(initial.cones)
  const initialPathsRef = useRef(initial.paths ?? [])

  // Set to true only when the user explicitly uploads a new image file.
  const explicitUploadRef = useRef(false)

  // Set to true when a JSON import provides page_w_pt/page_h_pt.
  const pageDimsLockedRef = useRef(false)


  // When a new image is uploaded, snap siteH to match the image's natural aspect ratio.
  const didMountRef = useRef(false)
  useEffect(() => {
    if (!imageUrl || !explicitUploadRef.current) return
    explicitUploadRef.current = false
    if (pageDimsLockedRef.current) return
    const img = new window.Image()
    img.onload = () => {
      setSiteW(img.naturalWidth)
      setSiteH(img.naturalHeight)
    }
    img.src = imageUrl
  }, [imageUrl])

  useEffect(() => { didMountRef.current = true }, [])

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

    // Load cones and paths from the initial project data (passed via props from main.tsx)
    if (initialConesRef.current.length > 0) {
      handle.canvasAPI.loadCones(initialConesRef.current)
    }
    if (initialPathsRef.current.length > 0) {
      handle.loadPaths(initialPathsRef.current)
    }

  }

  // ── Ctrl+S to save ───────────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        saveCurrentProject().catch(console.error)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Shared save-current-project helper ──────────────────────────────────────
  async function saveCurrentProject() {
    const id = activeProjectIdRef.current
    const project = await store.getById(id)
    if (!project) return
    const api = handleRef.current?.canvasAPI
    const cones = api ? api.getCones().filter(c => !c.isGhost) : []
    const paths = handleRef.current?.getPaths() ?? []
    await store.save(id, {
      name: project.name,
      cones,
      paths,
      scale: scaleRef.current,
      siteW: siteWRef.current,
      siteH: siteHRef.current,
      gridSpacing: gridSpacingRef.current,
      showBackground: showBackgroundRef.current,
    }, imageUrlRef.current)
  }

  // ── Project actions ──────────────────────────────────────────────────────────
  async function handleLoadProject(id: string) {

    const project = await store.getById(id)
    if (!project) return

    await store.setActiveId(id)
    setActiveProjectId(id)

    const img = await store.getImage(id)
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
    handleRef.current?.clearAllPaths()
    handleRef.current?.loadPaths(project.paths ?? [])
    handleRef.current?.resetCamera()

    setProjectsList(await store.getAll())
  }

  async function handleNewProject(name: string, keepImage: boolean) {
    await saveCurrentProject()

    const newId = await store.create({
      name,
      cones: [],
      scale: keepImage ? scaleRef.current : 0.3048,
      siteW: keepImage ? siteWRef.current : 1000,
      siteH: keepImage ? siteHRef.current : 600,
      gridSpacing: gridSpacingRef.current,
      showBackground: true,
    })

    if (keepImage) {
      // In localStorage mode, copy the image; in API mode saveImage is a no-op
      await store.saveImage(newId, imageUrlRef.current)
    }

    await store.setActiveId(newId)
    setActiveProjectId(newId)

    if (!keepImage) {
      setImageUrl(null)
      setScale(0.3048)
      setSiteW(1000)
      setSiteH(600)
    }
    setShowBackground(true)

    const api = handleRef.current?.canvasAPI
    if (api) api.clearAllCones()
    handleRef.current?.clearAllPaths()
    handleRef.current?.resetCamera()

    setProjectsList(await store.getAll())
  }

  async function handleDeleteProject(id: string) {
    const fallbackId = await store.delete(id)
    setProjectsList(await store.getAll())

    if (id === activeProjectIdRef.current) {
      if (fallbackId) {
        await handleLoadProject(fallbackId)
      } else {
        await handleNewProject('Default Project', false)
      }
    }
  }

  async function handleRenameProject(id: string, name: string) {
    await store.rename(id, name)
    setProjectsList(await store.getAll())
  }

  async function handleImageFile(file: File) {
    if (store.saveImageFile) {
      await store.saveImageFile(activeProjectIdRef.current, file)
    }
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
      gridSpacing, gridOffsetX, gridOffsetY, imageUrl, siteW, siteH, scale, showBackground, camera,
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
          onImageFile={handleImageFile}
          onPageDimsSet={() => { pageDimsLockedRef.current = true }}
          getCanvasAPI={() => handleRef.current?.canvasAPI ?? null}
          getStage={() => handleRef.current?.stage ?? null}
          gridSpacing={gridSpacing}
          setGridSpacing={setGridSpacing}
          gridOffsetX={gridOffsetX}
          setGridOffsetX={setGridOffsetX}
          gridOffsetY={gridOffsetY}
          setGridOffsetY={setGridOffsetY}
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
          onSave={() => saveCurrentProject().catch(console.error)}
          onLayoutExport={() => setShowLayoutExport(true)}
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
            {/* GCP coordinate editor — shown when exactly one GCP is selected */}
            {selectedCones.length === 1 && selectedCones[0].coneType === 'gcp' && canvasHandle && (
              <GcpPanel cone={selectedCones[0]} canvasAPI={canvasHandle.canvasAPI} />
            )}
            {/* Section assignment — shown when any placeable cones are selected */}
            {selectedCones.some(c => c.coneType !== 'gcp' && c.coneType !== 'car_start') && canvasHandle && (
              <SectionPanel selectedCones={selectedCones} canvasAPI={canvasHandle.canvasAPI} />
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
      {showLayoutExport && canvasHandle && (
        <LayoutExportModal
          cones={canvasHandle.canvasAPI.getCones()}
          projectName={projectsList.find(p => p.id === activeProjectId)?.name ?? 'course'}
          onClose={() => setShowLayoutExport(false)}
        />
      )}
    </OverlaySettingsContext.Provider>
  )
}
