import { useEffect, useRef } from 'react'
import Konva from 'konva'
import { CanvasStore } from './CanvasStore'
import { HistoryStack } from './HistoryStack'
import { ToolManager } from './ToolManager'
import { createCanvasAPI } from './CanvasAPI'
import type { CanvasAPI } from './CanvasAPI'
import { createConeNode } from './createConeNode'
import type { ConeData } from './ConeData'
import { StandingConeTool } from '../tools/StandingConeTool'
import { PointerConeTool } from '../tools/PointerConeTool'
import { TimingStartTool } from '../tools/TimingStartTool'
import { TimingEndTool } from '../tools/TimingEndTool'
import { GcpTool } from '../tools/GcpTool'
import { GateTool } from '../tools/GateTool'
import { SlalomTool } from '../tools/SlalomTool'
import { TimingStartGateTool } from '../tools/TimingStartGateTool'
import { TimingEndGateTool } from '../tools/TimingEndGateTool'
import { PointerPairTool } from '../tools/PointerPairTool'
import { FinishChuteTool } from '../tools/FinishChuteTool'

export interface KonvaCanvasHandle {
  stage: Konva.Stage
  canvasAPI: CanvasAPI
  toolManager: ToolManager
}

interface Props {
  imageUrl: string | null
  showBackground: boolean
  canvasW: number
  canvasH: number
  onCameraChange: (x: number, y: number, z: number) => void
  onReady: (handle: KonvaCanvasHandle) => void
}

export function KonvaCanvas({
  imageUrl,
  showBackground,
  canvasW,
  canvasH,
  onCameraChange,
  onReady,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage | null>(null)
  const bgLayerRef = useRef<Konva.Layer | null>(null)

  // Keep fresh refs for callbacks that must be stable inside the mount effect
  const onCameraChangeRef = useRef(onCameraChange)
  onCameraChangeRef.current = onCameraChange

  const canvasWRef = useRef(canvasW)
  const canvasHRef = useRef(canvasH)
  canvasWRef.current = canvasW
  canvasHRef.current = canvasH

  // ── Mount / unmount: create stage, layers, store, api, tools, events ──────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const w = container.offsetWidth || 800
    const h = container.offsetHeight || 600

    const stage = new Konva.Stage({ container, width: w, height: h })
    stageRef.current = stage

    const bgLayer    = new Konva.Layer()
    const conesLayer = new Konva.Layer()
    const ghostLayer = new Konva.Layer()
    bgLayerRef.current = bgLayer
    stage.add(bgLayer, conesLayer, ghostLayer)

    // ── Data layer ───────────────────────────────────────────────────────────
    const store   = new CanvasStore()
    const history = new HistoryStack()

    // Track Konva nodes for placed cones
    const coneNodes = new Map<string, Konva.Group>()

    store.onChange(() => {
      const cones = store.getAll()
      const ids   = new Set(cones.map(c => c.id))

      // Remove deleted nodes
      for (const [id, node] of coneNodes) {
        if (!ids.has(id)) { node.destroy(); coneNodes.delete(id) }
      }

      // Add or update
      for (const cone of cones) {
        const existing = coneNodes.get(cone.id)
        if (!existing) {
          const node = createConeNode(cone)
          coneNodes.set(cone.id, node)
          conesLayer.add(node)
        } else {
          existing.x(cone.x)
          existing.y(cone.y)
          existing.rotation(cone.rotation * (180 / Math.PI))
          existing.opacity(cone.isGhost ? 0.45 : 1)
        }
      }
      conesLayer.batchDraw()
    })

    // Ghost rendering
    function renderGhosts(ghosts: ConeData[]) {
      ghostLayer.destroyChildren()
      for (const g of ghosts) ghostLayer.add(createConeNode(g))
      ghostLayer.batchDraw()
    }

    const canvasAPI = createCanvasAPI(store, history, () => stageRef.current, renderGhosts)

    // ── Tool manager ─────────────────────────────────────────────────────────
    const toolManager = new ToolManager()

    const toolInstances = [
      new StandingConeTool(canvasAPI),
      new PointerConeTool(canvasAPI),
      new TimingStartTool(canvasAPI),
      new TimingEndTool(canvasAPI),
      new GcpTool(canvasAPI),
      new GateTool(canvasAPI),
      new SlalomTool(canvasAPI),
      new TimingStartGateTool(canvasAPI),
      new TimingEndGateTool(canvasAPI),
      new PointerPairTool(canvasAPI),
      new FinishChuteTool(canvasAPI),
    ]
    for (const t of toolInstances) toolManager.register(t)

    toolManager.onToolChange(id => {
      container.style.cursor = id ? 'crosshair' : 'default'
    })

    // ── Initial zoom-to-fit ──────────────────────────────────────────────────
    function zoomToFit() {
      const cw = canvasWRef.current
      const ch = canvasHRef.current
      const vw = stage.width()
      const vh = stage.height()
      const fitScale = Math.min((vw - 64) / cw, (vh - 64) / ch)
      stage.scale({ x: fitScale, y: fitScale })
      stage.position({
        x: (vw - cw * fitScale) / 2,
        y: (vh - ch * fitScale) / 2,
      })
      onCameraChangeRef.current(stage.x(), stage.y(), fitScale)
    }
    zoomToFit()

    // ── Stage events ─────────────────────────────────────────────────────────
    stage.draggable(true)

    stage.on('wheel', (e) => {
      e.evt.preventDefault()
      const oldScale = stage.scaleX()
      const pointer  = stage.getPointerPosition()!
      const scaleBy  = 1.05
      const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy
      const clamped  = Math.min(8, Math.max(0.05, newScale))

      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      }
      stage.scale({ x: clamped, y: clamped })
      stage.position({
        x: pointer.x - mousePointTo.x * clamped,
        y: pointer.y - mousePointTo.y * clamped,
      })
      onCameraChangeRef.current(stage.x(), stage.y(), stage.scaleX())
    })

    stage.on('mousemove', () => { toolManager.handlePointerMove() })

    stage.on('click', (e) => {
      // Only left-button clicks; ignore right-click context menu etc.
      if (e.evt.button !== 0) return
      toolManager.handlePointerDown()
    })

    stage.on('dragend', () => {
      onCameraChangeRef.current(stage.x(), stage.y(), stage.scaleX())
    })

    // ── Keyboard ─────────────────────────────────────────────────────────────
    function keyHandler(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault()
        history.undo()
        return
      }
      if (
        (e.key === 'y' && (e.ctrlKey || e.metaKey)) ||
        (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)
      ) {
        e.preventDefault()
        history.redo()
        return
      }

      // Ctrl+Shift+H → zoom to fit
      if (e.key === 'H' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault()
        zoomToFit()
        return
      }

      toolManager.handleKeyDown(e)
    }
    window.addEventListener('keydown', keyHandler)

    // ── Resize ───────────────────────────────────────────────────────────────
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) {
        stage.width(width)
        stage.height(height)
      }
    })
    ro.observe(container)

    // ── Expose handle to parent ──────────────────────────────────────────────
    onReady({ stage, canvasAPI, toolManager })

    return () => {
      window.removeEventListener('keydown', keyHandler)
      ro.disconnect()
      stage.destroy()
      stageRef.current = null
    }
  }, []) // intentionally no deps — runs once on mount

  // ── Background image / show-background effect ────────────────────────────
  useEffect(() => {
    const bgLayer = bgLayerRef.current
    if (!bgLayer) return

    bgLayer.destroyChildren()

    if (!showBackground) {
      bgLayer.batchDraw()
      return
    }

    if (imageUrl) {
      const img = new window.Image()
      img.onload = () => {
        if (!bgLayerRef.current) return // unmounted
        bgLayer.destroyChildren()
        bgLayer.add(new Konva.Image({
          x: 0, y: 0,
          width: canvasW,
          height: canvasH,
          image: img,
        }))
        bgLayer.batchDraw()
      }
      img.src = imageUrl
    } else {
      // White rectangle with border representing the site boundary
      bgLayer.add(new Konva.Rect({
        x: 0, y: 0,
        width: canvasW,
        height: canvasH,
        fill: 'white',
        stroke: '#000',
        strokeWidth: 4,
        listening: false,
      }))
      bgLayer.batchDraw()
    }
  }, [imageUrl, showBackground, canvasW, canvasH])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', overflow: 'hidden' }}
    />
  )
}
