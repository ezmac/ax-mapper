import { useRef, useState } from 'react'
import { KonvaCanvas } from './canvas/KonvaCanvas'
import type { KonvaCanvasHandle } from './canvas/KonvaCanvas'
import { ConeToolbar } from './components/ConeToolbar'
import { GridOverlay } from './components/GridOverlay'
import { HelpOverlay } from './components/HelpOverlay'
import { TopBar } from './components/TopBar'
import { MeasureOverlay } from './components/MeasureOverlay'
import { OverlaySettingsContext } from './context/overlaySettings'

const DEFAULT_SCALE = 0.3048
const DEFAULT_SITE_W = 1000
const DEFAULT_SITE_H = 600

export default function App() {
  const [scale, setScale] = useState(DEFAULT_SCALE)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [siteW, setSiteW] = useState(DEFAULT_SITE_W)
  const [siteH, setSiteH] = useState(DEFAULT_SITE_H)
  const [showGrid, setShowGrid] = useState(false)
  const [showBackground, setShowBackground] = useState(true)
  const [measuring, setMeasuring] = useState(false)
  const [camera, setCamera] = useState({ x: 0, y: 0, z: 1 })

  // handle is stored in state so ConeToolbar re-renders after canvas mounts
  const [canvasHandle, setCanvasHandle] = useState<KonvaCanvasHandle | null>(null)
  // also kept in a ref for imperative access (export/import callbacks)
  const handleRef = useRef<KonvaCanvasHandle | null>(null)

  // Canvas dimensions in canvas-space units
  const canvasW = siteW * 0.3048 / scale
  const canvasH = siteH * 0.3048 / scale

  function handleMeasureScale(newScale: number) {
    setSiteW(Math.round(siteW * newScale / scale))
    setSiteH(Math.round(siteH * newScale / scale))
    setScale(newScale)
  }

  function handleCanvasReady(handle: KonvaCanvasHandle) {
    handleRef.current = handle
    setCanvasHandle(handle)
  }

  return (
    <OverlaySettingsContext.Provider value={{
      showGrid, imageUrl, siteW, siteH, scale, showBackground, camera,
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh' }}>
        <TopBar
          scale={scale}
          setScale={setScale}
          siteW={siteW}
          siteH={siteH}
          setSiteW={setSiteW}
          setSiteH={setSiteH}
          onImageUpload={setImageUrl}
          getCanvasAPI={() => handleRef.current?.canvasAPI ?? null}
          getStage={() => handleRef.current?.stage ?? null}
          showGrid={showGrid}
          setShowGrid={setShowGrid}
          showBackground={showBackground}
          setShowBackground={setShowBackground}
          onMeasureScale={() => setMeasuring(true)}
          isMeasuring={measuring}
          imageUrl={imageUrl}
        />
        <div style={{ flex: 1, position: 'relative' }}>
          <KonvaCanvas
            imageUrl={imageUrl}
            showBackground={showBackground}
            canvasW={canvasW}
            canvasH={canvasH}
            onCameraChange={(x, y, z) => setCamera({ x, y, z })}
            onReady={handleCanvasReady}
          />
          {/* React overlays sit on top of the Konva stage */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <ConeToolbar toolManager={canvasHandle?.toolManager ?? null} />
            <GridOverlay />
            <HelpOverlay />
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
