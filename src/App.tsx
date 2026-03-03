import { useRef, useState } from 'react'
import { Tldraw, iconTypes } from 'tldraw'
import type { TLComponents, TLUiAssetUrlOverrides, Editor } from 'tldraw'
import { ConeShapeUtil } from './shapes/ConeShapeUtil'
import { StandingConeTool } from './tools/StandingConeTool'
import { PointerConeTool } from './tools/PointerConeTool'
import { TimingStartTool } from './tools/TimingStartTool'
import { TimingEndTool } from './tools/TimingEndTool'
import { GcpTool } from './tools/GcpTool'
import { GateTool } from './tools/GateTool'
import { SlalomTool } from './tools/SlalomTool'
import { TimingStartGateTool } from './tools/TimingStartGateTool'
import { TimingEndGateTool } from './tools/TimingEndGateTool'
import { PointerPairTool } from './tools/PointerPairTool'
import { FinishChuteTool } from './tools/FinishChuteTool'
import { ConeToolbar } from './components/ConeToolbar'
import { GridOverlay } from './components/GridOverlay'
import { HelpOverlay } from './components/HelpOverlay'
import { CanvasBackground } from './components/CanvasBackground'
import { TopBar } from './components/TopBar'
import { MeasureOverlay } from './components/MeasureOverlay'
import { OverlaySettingsContext } from './context/overlaySettings'
import 'tldraw/tldraw.css'

const SHAPE_UTILS = [ConeShapeUtil]

const TOOLS = [
  StandingConeTool,
  PointerConeTool,
  TimingStartTool,
  TimingEndTool,
  GcpTool,
  GateTool,
  SlalomTool,
  TimingStartGateTool,
  TimingEndGateTool,
  PointerPairTool,
  FinishChuteTool,
]

const DEFAULT_SCALE = 0.3048
const DEFAULT_SITE_W = 1000
const DEFAULT_SITE_H = 600

const LOCAL_ASSET_URLS: TLUiAssetUrlOverrides = {
  icons: Object.fromEntries(
    iconTypes.map(name => [name, `/icons/0_merged.svg#${name}`])
  ),
  fonts: {
    tldraw_mono: '/fonts/IBMPlexMono-Medium.woff2',
    tldraw_sans: '/fonts/IBMPlexSans-Medium.woff2',
  },
}

function CanvasOverlays() {
  return (
    <>
      <ConeToolbar />
      <GridOverlay />
      <HelpOverlay />
    </>
  )
}

const COMPONENTS: TLComponents = {
  Toolbar: null,
  StylePanel: null,
  Background: CanvasBackground,
  InFrontOfTheCanvas: CanvasOverlays,
}

export default function App() {
  const [scale, setScale] = useState(DEFAULT_SCALE)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [siteW, setSiteW] = useState(DEFAULT_SITE_W)
  const [siteH, setSiteH] = useState(DEFAULT_SITE_H)
  const [showGrid, setShowGrid] = useState(false)
  const [showBackground, setShowBackground] = useState(true)
  const [measuring, setMeasuring] = useState(false)

  const editorRef = useRef<Editor | null>(null)

  function handleMount(editor: Editor) {
    editorRef.current = editor
    editor.zoomToBounds(
      { x: 0, y: 0, w: DEFAULT_SITE_W, h: DEFAULT_SITE_H },
      { animation: { duration: 0 }, inset: 32 },
    )
  }

  function handleMeasureScale(newScale: number) {
    // siteW/siteH are in feet; canvas units = siteW * 0.3048 / scale
    // After remeasure, canvas dims stay the same, so new feet = canvas * newScale / 0.3048
    setSiteW(Math.round(siteW * newScale / scale))
    setSiteH(Math.round(siteH * newScale / scale))
    setScale(newScale)
  }

  return (
    <OverlaySettingsContext.Provider value={{ showGrid, imageUrl, siteW, siteH, scale, showBackground }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh' }}>
        <TopBar
          scale={scale}
          setScale={setScale}
          siteW={siteW}
          siteH={siteH}
          setSiteW={setSiteW}
          setSiteH={setSiteH}
          onImageUpload={setImageUrl}
          getEditor={() => editorRef.current}
          showGrid={showGrid}
          setShowGrid={setShowGrid}
          showBackground={showBackground}
          setShowBackground={setShowBackground}
          onMeasureScale={() => setMeasuring(true)}
          isMeasuring={measuring}
          imageUrl={imageUrl}
        />
        <div style={{ flex: 1, position: 'relative' }}>
          <Tldraw
            shapeUtils={SHAPE_UTILS}
            tools={TOOLS}
            components={COMPONENTS}
            assetUrls={LOCAL_ASSET_URLS}
            onMount={handleMount}
          />
          <MeasureOverlay
            active={measuring}
            getEditor={() => editorRef.current}
            onScale={handleMeasureScale}
            onClose={() => setMeasuring(false)}
          />
        </div>
      </div>
    </OverlaySettingsContext.Provider>
  )
}
