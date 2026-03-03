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

// ── Selection visual helpers ─────────────────────────────────────────────────

function addSelectionIndicator(group: Konva.Group, w: number, h: number) {
  removeSelectionIndicator(group)
  group.add(new Konva.Rect({
    name: 'sel-indicator',
    x: -3, y: -3,
    width: w + 6, height: h + 6,
    stroke: '#2563eb',
    strokeWidth: 2,
    dash: [5, 3],
    fill: 'rgba(37,99,235,0.07)',
    listening: false,
  }))
}

function removeSelectionIndicator(group: Konva.Group) {
  group.findOne('.sel-indicator')?.destroy()
}

function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) {
  return !(
    a.x + a.width  < b.x ||
    b.x + b.width  < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  )
}

export function KonvaCanvas({
  imageUrl,
  showBackground,
  canvasW,
  canvasH,
  onCameraChange,
  onReady,
}: Props) {
  const containerRef   = useRef<HTMLDivElement>(null)
  const rubberBandRef  = useRef<HTMLDivElement>(null)
  const stageRef       = useRef<Konva.Stage | null>(null)
  const bgLayerRef     = useRef<Konva.Layer | null>(null)

  const onCameraChangeRef = useRef(onCameraChange)
  onCameraChangeRef.current = onCameraChange
  const canvasWRef = useRef(canvasW)
  const canvasHRef = useRef(canvasH)
  canvasWRef.current = canvasW
  canvasHRef.current = canvasH

  // ── Mount / unmount ──────────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current!
    const rbEl      = rubberBandRef.current!
    if (!container || !rbEl) return

    const w = container.offsetWidth || 800
    const h = container.offsetHeight || 600

    const stage      = new Konva.Stage({ container, width: w, height: h })
    stageRef.current = stage

    const bgLayer    = new Konva.Layer()
    const conesLayer = new Konva.Layer()
    const ghostLayer = new Konva.Layer()
    bgLayerRef.current = bgLayer
    stage.add(bgLayer, conesLayer, ghostLayer)

    // ── Data layer ───────────────────────────────────────────────────────────
    const store   = new CanvasStore()
    const history = new HistoryStack()
    const coneNodes = new Map<string, Konva.Group>()

    // ── Selection state ──────────────────────────────────────────────────────
    const selectedIds        = new Set<string>()
    const dragStartPositions = new Map<string, { x: number; y: number }>()

    function setSelected(id: string, on: boolean) {
      const node = coneNodes.get(id)
      if (!node) return
      if (on) {
        selectedIds.add(id)
        const cone = store.getById(id)
        if (cone) addSelectionIndicator(node, cone.w, cone.h)
      } else {
        selectedIds.delete(id)
        removeSelectionIndicator(node)
      }
    }

    function deselectAll() {
      for (const id of [...selectedIds]) setSelected(id, false)
    }

    // ── Node mode (stamp vs select) ──────────────────────────────────────────
    function applyMode(node: Konva.Group, selectMode: boolean) {
      node.listening(selectMode)
      node.draggable(selectMode)
    }
    function applyModeAll(selectMode: boolean) {
      for (const node of coneNodes.values()) applyMode(node, selectMode)
    }

    // ── Attach interaction handlers to a cone node ────────────────────────
    function attachNodeHandlers(id: string, node: Konva.Group) {
      node.on('click', (e) => {
        if (toolManager.currentToolId !== null) return
        e.cancelBubble = true  // don't trigger stage background-deselect
        if (e.evt.shiftKey) {
          setSelected(id, !selectedIds.has(id))
        } else {
          if (!selectedIds.has(id)) {
            deselectAll()
            setSelected(id, true)
          }
          // keep selection if already selected (allows drag without deselecting)
        }
        conesLayer.batchDraw()
      })

      node.on('dragstart', () => {
        // Snapshot positions of all cones we'll move together
        if (selectedIds.has(id)) {
          for (const selId of selectedIds) {
            const n = coneNodes.get(selId)
            if (n) dragStartPositions.set(selId, { x: n.x(), y: n.y() })
          }
        } else {
          dragStartPositions.set(id, { x: node.x(), y: node.y() })
        }
      })

      node.on('dragmove', () => {
        // Drag all selected cones in sync with the dragged one
        if (!selectedIds.has(id)) return
        const start = dragStartPositions.get(id)
        if (!start) return
        const dx = node.x() - start.x
        const dy = node.y() - start.y
        for (const selId of selectedIds) {
          if (selId === id) continue
          const s = dragStartPositions.get(selId)
          const n = coneNodes.get(selId)
          if (s && n) { n.x(s.x + dx); n.y(s.y + dy) }
        }
      })

      node.on('dragend', () => {
        const movedIds = selectedIds.has(id) ? [...selectedIds] : [id]
        const moves: Array<{ id: string; ox: number; oy: number; nx: number; ny: number }> = []

        // Collect all new positions BEFORE any store.update() calls.
        // Each store.update() fires onChange synchronously, which resets every
        // Konva node's position from the store — so if we interleave reads and
        // writes, later nodes in the loop would see their old (pre-drag) position.
        for (const mid of movedIds) {
          const mNode  = coneNodes.get(mid)
          const mStart = dragStartPositions.get(mid)
          if (!mNode || !mStart) continue
          const nx = mNode.x(), ny = mNode.y()
          if (nx === mStart.x && ny === mStart.y) continue
          moves.push({ id: mid, ox: mStart.x, oy: mStart.y, nx, ny })
        }
        dragStartPositions.clear()

        for (const m of moves) store.update(m.id, { x: m.nx, y: m.ny })

        if (moves.length > 0) {
          history.push({
            undo() { for (const m of moves) store.update(m.id, { x: m.ox, y: m.oy }) },
            redo() { for (const m of moves) store.update(m.id, { x: m.nx, y: m.ny }) },
          })
        }
        conesLayer.batchDraw()
      })
    }

    // ── Store → Konva sync ───────────────────────────────────────────────────
    store.onChange(() => {
      const cones = store.getAll()
      const ids   = new Set(cones.map(c => c.id))
      const inSelectMode = toolManager.currentToolId === null

      for (const [nid, node] of coneNodes) {
        if (!ids.has(nid)) {
          selectedIds.delete(nid)
          node.destroy()
          coneNodes.delete(nid)
        }
      }

      for (const cone of cones) {
        let node = coneNodes.get(cone.id)
        if (!node) {
          node = createConeNode(cone)
          coneNodes.set(cone.id, node)
          conesLayer.add(node)
          attachNodeHandlers(cone.id, node)
          applyMode(node, inSelectMode)
        } else {
          node.x(cone.x)
          node.y(cone.y)
          node.rotation(cone.rotation * (180 / Math.PI))
          node.opacity(1)
        }
      }
      conesLayer.batchDraw()
    })

    // ── Ghost rendering ──────────────────────────────────────────────────────
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

    toolManager.onToolChange(toolId => {
      container.style.cursor = toolId ? 'crosshair' : 'default'
      const inSelectMode = toolId === null
      applyModeAll(inSelectMode)
      if (!inSelectMode) { deselectAll(); conesLayer.batchDraw() }
    })

    // ── Zoom-to-fit ──────────────────────────────────────────────────────────
    function zoomToFit() {
      const cw = canvasWRef.current, ch = canvasHRef.current
      const vw = stage.width(),     vh = stage.height()
      const fitScale = Math.min((vw - 64) / cw, (vh - 64) / ch)
      stage.scale({ x: fitScale, y: fitScale })
      stage.position({ x: (vw - cw * fitScale) / 2, y: (vh - ch * fitScale) / 2 })
      onCameraChangeRef.current(stage.x(), stage.y(), fitScale)
    }
    zoomToFit()

    // ── Middle-mouse pan state ───────────────────────────────────────────────
    let isPanning = false
    let panStart  = { x: 0, y: 0 }
    let panStartPos = { x: 0, y: 0 }

    // ── Rubber-band select state ─────────────────────────────────────────────
    const CLICK_DIST  = 4   // px — max movement to count as a click
    const RB_THRESHOLD = 5  // px — min drag to show rubber band

    let lmbDownPos: { x: number; y: number } | null = null
    let lmbDownOnBackground = false   // was the mousedown on the canvas background?
    let rbStart: { x: number; y: number } | null = null  // container-relative
    let isRubberBanding = false

    // ── Scroll wheel → zoom ──────────────────────────────────────────────────
    stage.on('wheel', (e) => {
      e.evt.preventDefault()
      const oldScale = stage.scaleX()
      const pointer  = stage.getPointerPosition()!
      const scaleBy  = 1.05
      const newScale = Math.min(8, Math.max(0.05, e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy))
      const mpt = { x: (pointer.x - stage.x()) / oldScale, y: (pointer.y - stage.y()) / oldScale }
      stage.scale({ x: newScale, y: newScale })
      stage.position({ x: pointer.x - mpt.x * newScale, y: pointer.y - mpt.y * newScale })
      onCameraChangeRef.current(stage.x(), stage.y(), stage.scaleX())
    })

    // ── Ghost pointer tracking ────────────────────────────────────────────────
    stage.on('mousemove', () => { toolManager.handlePointerMove() })

    // ── Stage mousedown: classify intent ────────────────────────────────────
    stage.on('mousedown', (e) => {
      // Middle mouse → pan
      if (e.evt.button === 1) {
        e.evt.preventDefault()
        isPanning  = true
        panStart   = { x: e.evt.clientX, y: e.evt.clientY }
        panStartPos = { x: stage.x(), y: stage.y() }
        container.style.cursor = 'grabbing'
        return
      }

      if (e.evt.button !== 0) return
      lmbDownPos = { x: e.evt.clientX, y: e.evt.clientY }

      // In select mode, track whether mousedown hit the background (for rubber band)
      // e.target === stage means no Konva shape was hit (bgLayer shapes are listening:false)
      lmbDownOnBackground = (toolManager.currentToolId === null && e.target === stage)
      if (lmbDownOnBackground) {
        const pos = stage.getPointerPosition()!
        rbStart = { x: pos.x, y: pos.y }
        isRubberBanding = false
      }
    })

    // ── Window mousemove: update pan / rubber band ───────────────────────────
    function onWindowMouseMove(e: MouseEvent) {
      if (isPanning) {
        stage.position({
          x: panStartPos.x + (e.clientX - panStart.x),
          y: panStartPos.y + (e.clientY - panStart.y),
        })
        stage.batchDraw()
        onCameraChangeRef.current(stage.x(), stage.y(), stage.scaleX())
        return
      }

      if (rbStart && lmbDownOnBackground) {
        const cr   = container.getBoundingClientRect()
        const curX = e.clientX - cr.left
        const curY = e.clientY - cr.top
        const dx   = curX - rbStart.x
        const dy   = curY - rbStart.y

        if (!isRubberBanding && Math.sqrt(dx * dx + dy * dy) > RB_THRESHOLD) {
          isRubberBanding = true
        }

        if (isRubberBanding) {
          const x = Math.min(curX, rbStart.x)
          const y = Math.min(curY, rbStart.y)
          rbEl.style.left    = `${x}px`
          rbEl.style.top     = `${y}px`
          rbEl.style.width   = `${Math.abs(dx)}px`
          rbEl.style.height  = `${Math.abs(dy)}px`
          rbEl.style.display = 'block'
        }
      }
    }

    // ── Window mouseup: complete pan / rubber band / click ───────────────────
    function onWindowMouseUp(e: MouseEvent) {
      // Middle mouse → stop pan
      if (e.button === 1 && isPanning) {
        isPanning = false
        container.style.cursor = toolManager.currentToolId ? 'crosshair' : 'default'
        return
      }

      if (e.button !== 0 || !lmbDownPos) return

      const dist = Math.hypot(e.clientX - lmbDownPos.x, e.clientY - lmbDownPos.y)
      const wasClick = dist < CLICK_DIST

      if (isRubberBanding) {
        // Finish rubber band → select overlapping cones
        const rbX = parseFloat(rbEl.style.left)
        const rbY = parseFloat(rbEl.style.top)
        const rbW = parseFloat(rbEl.style.width)
        const rbH = parseFloat(rbEl.style.height)

        rbEl.style.display = 'none'
        isRubberBanding = false

        if (!e.shiftKey) deselectAll()
        for (const [cid, node] of coneNodes) {
          if (rectsOverlap({ x: rbX, y: rbY, width: rbW, height: rbH }, node.getClientRect())) {
            setSelected(cid, true)
          }
        }
        conesLayer.batchDraw()

      } else if (wasClick) {
        if (toolManager.currentToolId !== null) {
          // Stamp mode click
          toolManager.handlePointerDown()
        } else if (lmbDownOnBackground) {
          // Select mode: click on background → deselect all
          deselectAll()
          conesLayer.batchDraw()
        }
        // Click on a cone in select mode is handled by Konva's node.on('click')
      }

      // Reset
      lmbDownPos        = null
      lmbDownOnBackground = false
      rbStart           = null
      isRubberBanding   = false
      rbEl.style.display = 'none'
    }

    window.addEventListener('mousemove', onWindowMouseMove)
    window.addEventListener('mouseup',   onWindowMouseUp)

    // Prevent context menu from middle-click (some browsers)
    function onContextMenu(e: MouseEvent) { if (e.button === 1) e.preventDefault() }
    container.addEventListener('contextmenu', onContextMenu)

    // ── Keyboard ─────────────────────────────────────────────────────────────
    function keyHandler(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault(); history.undo(); return
      }
      if (
        (e.key === 'y' && (e.ctrlKey || e.metaKey)) ||
        (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)
      ) {
        e.preventDefault(); history.redo(); return
      }
      if (e.key === 'H' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault(); zoomToFit(); return
      }

      if (toolManager.currentToolId === null) {
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
          const ids       = [...selectedIds]
          const snapshots = ids.map(id => store.getById(id)).filter((c): c is ConeData => !!c)
          deselectAll()
          store.remove(ids)
          history.push({
            undo() { for (const s of snapshots) store.add({ ...s }) },
            redo() { store.remove(ids) },
          })
          return
        }
        if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault()
          deselectAll()
          for (const cone of store.getAll()) setSelected(cone.id, true)
          conesLayer.batchDraw()
          return
        }
      }

      toolManager.handleKeyDown(e)
    }
    window.addEventListener('keydown', keyHandler)

    // ── Resize ───────────────────────────────────────────────────────────────
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) { stage.width(width); stage.height(height) }
    })
    ro.observe(container)

    onReady({ stage, canvasAPI, toolManager })

    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove)
      window.removeEventListener('mouseup',   onWindowMouseUp)
      window.removeEventListener('keydown',   keyHandler)
      container.removeEventListener('contextmenu', onContextMenu)
      ro.disconnect()
      stage.destroy()
      stageRef.current = null
    }
  }, [])

  // ── Background image effect ──────────────────────────────────────────────
  useEffect(() => {
    const bgLayer = bgLayerRef.current
    if (!bgLayer) return
    bgLayer.destroyChildren()
    if (!showBackground) { bgLayer.batchDraw(); return }
    if (imageUrl) {
      const img = new window.Image()
      img.onload = () => {
        if (!bgLayerRef.current) return
        bgLayer.destroyChildren()
        bgLayer.add(new Konva.Image({ x: 0, y: 0, width: canvasW, height: canvasH, image: img }))
        bgLayer.batchDraw()
      }
      img.src = imageUrl
    } else {
      bgLayer.add(new Konva.Rect({
        x: 0, y: 0, width: canvasW, height: canvasH,
        fill: 'white', stroke: '#000', strokeWidth: 4, listening: false,
      }))
      bgLayer.batchDraw()
    }
  }, [imageUrl, showBackground, canvasW, canvasH])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }} />
      {/* Rubber-band selection rectangle — positioned over the stage */}
      <div
        ref={rubberBandRef}
        style={{
          position: 'absolute',
          display: 'none',
          border: '1.5px dashed #2563eb',
          background: 'rgba(37,99,235,0.08)',
          pointerEvents: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}
