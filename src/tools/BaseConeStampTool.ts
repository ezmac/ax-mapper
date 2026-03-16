import type { CanvasAPI } from '../canvas/CanvasAPI'
import type { ConeType } from '../canvas/ConeData'
import type { ConeData } from '../canvas/ConeData'
import { coneSettings } from '../settings'

const STEP_NORMAL = Math.PI / 12   // 15° per arrow press
const STEP_FINE   = Math.PI / 180  // 1° with Shift held

export interface LayoutEntry {
  coneType: ConeType
  ox: number          // offset from stamp origin (canvas units)
  oy: number
  rotOffset?: number  // extra rotation added to ghostRotation for this shape
}

function rotate(x: number, y: number, rad: number): [number, number] {
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return [x * cos - y * sin, x * sin + y * cos]
}

export class BaseConeStampTool {
  readonly id: string = ''

  protected ghostRotation = 0
  protected gateHalf = 20

  private currentGhosts: Omit<ConeData, 'id' | 'isGhost'>[] = []

  protected api: CanvasAPI

  constructor(api: CanvasAPI) {
    this.api = api
  }

  protected layout(): LayoutEntry[] {
    throw new Error('layout() must be implemented by subclass')
  }

  protected widthStep(): number { return 0 }

  private get sz() { return coneSettings.size }

  private dims(coneType: ConeType): { w: number; h: number } {
    const s = this.sz
    return coneType === 'pointer'
      ? { w: Math.round(s * 1.6), h: s }
      : { w: s, h: s }
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

    // Pin the centre of the shape's bounding box to (cursorX + orbX, cursorY + orbY).
    // Shape origin x,y is the top-left corner; rotation is around that origin.
    //   cx_in_local = w/2, cy_in_local = h/2
    //   page centre = (cos·cx - sin·cy + x, sin·cx + cos·cy + y)
    //   → x = cursorX + orbX - (cos·ax - sin·ay)

    const ax = w / 2
    const ay = h / 2
    const [orbX, orbY] = rotate(ox, oy, this.ghostRotation)

    return {
      x: cursorX + orbX - (cos * ax - sin * ay),
      y: cursorY + orbY - (sin * ax + cos * ay),
    }
  }

  private computeGhosts(pageX: number, pageY: number): Omit<ConeData, 'id' | 'isGhost'>[] {
    return this.layout().map(entry => {
      const rotOffset = entry.rotOffset ?? 0
      const pos = this.shapePos(pageX, pageY, entry.ox, entry.oy, entry.coneType, rotOffset)
      const { w, h } = this.dims(entry.coneType)
      return {
        coneType: entry.coneType,
        x: pos.x,
        y: pos.y,
        rotation: this.ghostRotation + rotOffset,
        w,
        h,
      }
    })
  }

  private refresh(pageX: number, pageY: number): void {
    this.currentGhosts = this.computeGhosts(pageX, pageY)
    this.api.setGhosts(this.currentGhosts)
  }

  onEnter(): void {
    this.ghostRotation = 0
    const { x, y } = this.api.getPointerPagePoint()
    this.refresh(x, y)
  }

  onExit(): void {
    this.api.clearGhosts()
    this.currentGhosts = []
  }

  onPointerMove(): void {
    const { x, y } = this.api.getPointerPagePoint()
    this.refresh(x, y)
  }

  onKeyDown(e: KeyboardEvent): void {
    const { x, y } = this.api.getPointerPagePoint()

    if (e.key === ' ') {
      e.preventDefault()
      this.ghostRotation += Math.PI / 2
      this.refresh(x, y)
      return
    }

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const step = e.shiftKey ? STEP_FINE : STEP_NORMAL
      this.ghostRotation += e.key === 'ArrowRight' ? step : -step
      this.refresh(x, y)
      return
    }

    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const ws = this.widthStep()
      if (ws === 0) return
      const step = e.shiftKey ? Math.max(1, Math.round(ws / 4)) : ws
      this.gateHalf += e.key === 'ArrowUp' ? step : -step
      this.gateHalf = Math.max(this.gateHalf, Math.ceil(this.sz / 2))
      this.refresh(x, y)
    }
  }

  onPointerDown(): void {
    const ghosts = this.currentGhosts
    if (ghosts.length === 0) return
    this.api.run(() => {
      for (const ghost of ghosts) {
        this.api.createCone(ghost)
      }
    })
  }
}
