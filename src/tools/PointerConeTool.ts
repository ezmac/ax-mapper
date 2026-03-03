import { BaseConeStampTool } from './BaseConeStampTool'
import type { CanvasAPI } from '../canvas/CanvasAPI'

export class PointerConeTool extends BaseConeStampTool {
  readonly id = 'pointer-cone'
  constructor(api: CanvasAPI) { super(api) }
  protected layout() {
    return [{ coneType: 'pointer' as const, ox: 0, oy: 0 }]
  }
}
