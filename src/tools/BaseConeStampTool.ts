import {
  StateNode,
  createShapeId,
} from 'tldraw'
import type {
  TLPointerEventInfo,
  TLKeyboardEventInfo,
  TLShapeId,
} from 'tldraw'
import type { ConeType } from '../types/cone'
import { coneSettings } from '../settings'

const STEP_NORMAL = Math.PI / 12   // 15° per arrow press
const STEP_FINE   = Math.PI / 180  // 1° with Shift held

export interface LayoutEntry {
  coneType: ConeType
  ox: number         // offset from stamp origin (page units)
  oy: number
  rotOffset?: number // extra rotation added to ghostRotation for this shape
}

export interface GhostEntry {
  id: TLShapeId
  rotOffset: number
}

export abstract class BaseConeStampTool extends StateNode {
  static override isLockable = false
  static override useCoalescedEvents = false

  protected ghostIds: GhostEntry[] = []
  protected ghostRotation = 0

  /**
   * Half-width of gate-like tools. Persists between activations so the user's
   * last-set width is remembered. Gate tools reference this in layout().
   */
  protected gateHalf = 20

  protected abstract layout(): LayoutEntry[]

  /**
   * Return a non-zero step to enable ↑/↓ width adjustment for gate-like tools.
   * 0 (default) means ↑/↓ does nothing.
   */
  protected widthStep(): number { return 0 }

  private get sz() { return coneSettings.size }

  /** Width and height for a given cone type. Pointer is wider than tall. */
  private dims(coneType: ConeType): { w: number; h: number } {
    const s = this.sz
    return coneType === 'pointer'
      ? { w: Math.round(s * 1.6), h: s }
      : { w: s, h: s }
  }

  private makeShapePartial(
    id: TLShapeId,
    entry: LayoutEntry,
    x: number,
    y: number,
    isGhost: boolean
  ) {
    const { w, h } = this.dims(entry.coneType)
    const rotation = this.ghostRotation + (entry.rotOffset ?? 0)
    return {
      id,
      type: 'cone',
      x,
      y,
      rotation,
      props: { coneType: entry.coneType, isGhost, w, h },
    } as any
  }

  private shapePos(
    cursorX: number, cursorY: number,
    ox: number, oy: number,
    coneType: ConeType,
    rotOffset = 0,
  ) {
    const { w, h } = this.dims(coneType)
    const totalRot = this.ghostRotation + rotOffset
    const cos = Math.cos(totalRot)
    const sin = Math.sin(totalRot)

    // tldraw applies transform: translate(x,y) then rotate(θ) around that origin.
    // So a local point (ax, ay) lands at page (cos*ax - sin*ay + x, sin*ax + cos*ay + y).
    // To pin the anchor to (cursorX + orbX, cursorY + orbY):
    //   x = cursorX + orbX - (cos*ax - sin*ay)
    //   y = cursorY + orbY - (sin*ax + cos*ay)

    const ax = w / 2
    const ay = h / 2

    // Orbital offset rotated by ghostRotation (not totalRot).
    const [orbX, orbY] = rotate(ox, oy, this.ghostRotation)

    return {
      x: cursorX + orbX - (cos * ax - sin * ay),
      y: cursorY + orbY - (sin * ax + cos * ay),
    }
  }

  private createGhostsAt(pageX: number, pageY: number) {
    this.deleteGhosts()
    for (const entry of this.layout()) {
      const id = createShapeId()
      const rotOffset = entry.rotOffset ?? 0
      const pos = this.shapePos(pageX, pageY, entry.ox, entry.oy, entry.coneType, rotOffset)
      this.editor.createShape(
        this.makeShapePartial(id, entry, pos.x, pos.y, true)
      )
      this.ghostIds.push({ id, rotOffset })
    }
  }

  private createGhosts() {
    const { x, y } = this.editor.inputs.getCurrentPagePoint()
    this.createGhostsAt(x, y)
  }

  // Protected so gate-like subclasses can call it after adjusting gateHalf.
  protected updateGhosts(pageX: number, pageY: number) {
    const layout = this.layout()

    // If the count changed (e.g. pointer-pair count switched while tool was active),
    // recreate all ghosts rather than updating mismatched entries.
    if (layout.length !== this.ghostIds.length) {
      this.createGhostsAt(pageX, pageY)
      return
    }

    for (let i = 0; i < this.ghostIds.length; i++) {
      const ghost = this.ghostIds[i]
      const entry = layout[i]
      // Use entry.ox/oy from the CURRENT layout() so dynamic layouts update correctly.
      const pos = this.shapePos(pageX, pageY, entry.ox, entry.oy, entry.coneType, ghost.rotOffset)
      const { w, h } = this.dims(entry.coneType)
      this.editor.updateShape({
        id: ghost.id,
        type: 'cone' as any,
        x: pos.x,
        y: pos.y,
        rotation: this.ghostRotation + ghost.rotOffset,
        props: { w, h },
      })
    }
  }

  private deleteGhosts() {
    for (const { id } of this.ghostIds) {
      this.editor.deleteShape(id)
    }
    this.ghostIds = []
  }

  override onEnter() {
    this.ghostRotation = 0
    this.editor.setCursor({ type: 'cross', rotation: 0 })
    this.createGhosts()
  }

  override onExit() {
    this.deleteGhosts()
  }

  override onPointerMove(_info: TLPointerEventInfo) {
    const { x, y } = this.editor.inputs.getCurrentPagePoint()
    this.updateGhosts(x, y)
  }

  override onKeyDown(info: TLKeyboardEventInfo) {
    const { x, y } = this.editor.inputs.getCurrentPagePoint()

    if (info.key === 'ArrowLeft' || info.key === 'ArrowRight') {
      const step = info.shiftKey ? STEP_FINE : STEP_NORMAL
      this.ghostRotation += info.key === 'ArrowRight' ? step : -step
      this.updateGhosts(x, y)
      return
    }

    if (info.key === 'ArrowUp' || info.key === 'ArrowDown') {
      const ws = this.widthStep()
      if (ws === 0) return
      const step = info.shiftKey ? Math.max(1, Math.round(ws / 4)) : ws
      this.gateHalf += info.key === 'ArrowUp' ? step : -step
      this.gateHalf = Math.max(this.gateHalf, Math.ceil(this.sz / 2))
      this.updateGhosts(x, y)
    }
  }

  override onPointerDown(info: TLPointerEventInfo) {
    if (info.target !== 'canvas' && info.target !== 'shape') return
    const { x, y } = this.editor.inputs.getCurrentPagePoint()
    const layout = this.layout()
    const rot = this.ghostRotation

    this.editor.markHistoryStoppingPoint('cone-stamp')
    this.editor.run(() => {
      for (const entry of layout) {
        const pos = this.shapePos(x, y, entry.ox, entry.oy, entry.coneType, entry.rotOffset ?? 0)
        const { w, h } = this.dims(entry.coneType)
        const id = createShapeId()
        const rotation = rot + (entry.rotOffset ?? 0)
        this.editor.createShape({
          id,
          type: 'cone',
          x: pos.x,
          y: pos.y,
          rotation,
          props: { coneType: entry.coneType, isGhost: false, w, h },
        } as any)
      }
    })
  }

  override onCancel() {
    this.editor.setCurrentTool('select')
  }
}

function rotate(x: number, y: number, rad: number): [number, number] {
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return [x * cos - y * sin, x * sin + y * cos]
}
