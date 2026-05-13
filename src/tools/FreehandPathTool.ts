import Konva from 'konva'
import type { Tool } from '../canvas/ToolManager'

export class FreehandPathTool implements Tool {
  readonly id = 'freehand-path'

  private drawing = false
  private points: number[] = []
  private liveLine: Konva.Line | null = null
  private getPointerPagePoint: () => { x: number; y: number }
  private pathLayer: Konva.Layer
  private onComplete: (points: number[]) => void

  constructor(
    getPointerPagePoint: () => { x: number; y: number },
    pathLayer: Konva.Layer,
    onComplete: (points: number[]) => void,
  ) {
    this.getPointerPagePoint = getPointerPagePoint
    this.pathLayer = pathLayer
    this.onComplete = onComplete
  }

  onEnter(): void {}

  onExit(): void {
    this.cancelDrawing()
  }

  onMouseDown(): void {
    const pos = this.getPointerPagePoint()
    this.drawing = true
    this.points = [pos.x, pos.y]

    this.liveLine = new Konva.Line({
      points: this.points,
      stroke: '#ef4444',
      strokeWidth: 2,
      tension: 0.5,
      lineCap: 'round',
      lineJoin: 'round',
      listening: false,
    })
    this.pathLayer.add(this.liveLine)
    this.pathLayer.batchDraw()
  }

  onPointerMove(): void {
    if (!this.drawing || !this.liveLine) return

    const pos = this.getPointerPagePoint()
    const len = this.points.length
    const lastX = this.points[len - 2]
    const lastY = this.points[len - 1]
    const dx = pos.x - lastX
    const dy = pos.y - lastY
    if (Math.sqrt(dx * dx + dy * dy) < 3) return

    this.points.push(pos.x, pos.y)
    this.liveLine.points(this.points)
    this.pathLayer.batchDraw()
  }

  onMouseUp(): void {
    if (!this.drawing) return

    const pts = this.points
    this.drawing = false
    this.points = []

    if (this.liveLine) {
      this.liveLine.destroy()
      this.liveLine = null
      this.pathLayer.batchDraw()
    }

    // Need at least 2 points (4 numbers) to form a path
    if (pts.length >= 4) {
      this.onComplete(pts)
    }
  }

  onPointerDown(): void {}

  onKeyDown(_e: KeyboardEvent): void {}

  private cancelDrawing(): void {
    this.drawing = false
    this.points = []
    if (this.liveLine) {
      this.liveLine.destroy()
      this.liveLine = null
      this.pathLayer.batchDraw()
    }
  }
}
