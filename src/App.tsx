import { useRef, useEffect, useState } from 'react'
import { Tldraw, iconTypes, createShapeId } from 'tldraw'
import type { TLComponents, TLUiAssetUrlOverrides, Editor, TLShapeId } from 'tldraw'
import { ConeShapeUtil } from './shapes/ConeShapeUtil'
import { SiteMapShapeUtil } from './shapes/SiteMapShapeUtil'
import { StandingConeTool } from './tools/StandingConeTool'
import { PointerConeTool } from './tools/PointerConeTool'
import { TimingStartTool } from './tools/TimingStartTool'
import { TimingEndTool } from './tools/TimingEndTool'
import { GcpTool } from './tools/GcpTool'
import { GateTool } from './tools/GateTool'
import { SlalomTool } from './tools/SlalomTool'
import { TimingGateTool } from './tools/TimingGateTool'
import { PointerPairTool } from './tools/PointerPairTool'
import { ConeToolbar } from './components/ConeToolbar'
import { TopBar } from './components/TopBar'
import 'tldraw/tldraw.css'

const SHAPE_UTILS = [ConeShapeUtil, SiteMapShapeUtil]

const TOOLS = [
  StandingConeTool,
  PointerConeTool,
  TimingStartTool,
  TimingEndTool,
  GcpTool,
  GateTool,
  SlalomTool,
  TimingGateTool,
  PointerPairTool,
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

const COMPONENTS: TLComponents = {
  Toolbar: null,
  StylePanel: null,
  InFrontOfTheCanvas: ConeToolbar,
}

export default function App() {
  const [scale, setScale] = useState(DEFAULT_SCALE)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [siteW, setSiteW] = useState(DEFAULT_SITE_W)
  const [siteH, setSiteH] = useState(DEFAULT_SITE_H)

  const editorRef = useRef<Editor | null>(null)
  const siteMapIdRef = useRef<TLShapeId | null>(null)

  function handleMount(editor: Editor) {
    editorRef.current = editor

    const id = createShapeId()
    siteMapIdRef.current = id
    editor.createShape({
      id,
      type: 'sitemap' as any,
      x: 0,
      y: 0,
      isLocked: true,
      props: { w: DEFAULT_SITE_W, h: DEFAULT_SITE_H, dataUrl: '' },
    })
    editor.sendToBack([id])
    editor.zoomToFit({ animation: { duration: 0 } })
  }

  // Sync site map shape whenever image URL or dimensions change
  useEffect(() => {
    const editor = editorRef.current
    const id = siteMapIdRef.current
    if (!editor || !id) return

    editor.run(() => {
      editor.updateShape({
        id,
        type: 'sitemap' as any,
        props: { w: siteW, h: siteH, dataUrl: imageUrl ?? '' },
      })
    }, { ignoreShapeLock: true })

    editor.sendToBack([id])
  }, [imageUrl, siteW, siteH])

  return (
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
      />
      <div style={{ flex: 1, position: 'relative' }}>
        <Tldraw
          shapeUtils={SHAPE_UTILS}
          tools={TOOLS}
          components={COMPONENTS}
          assetUrls={LOCAL_ASSET_URLS}
          onMount={handleMount}
        />
      </div>
    </div>
  )
}
