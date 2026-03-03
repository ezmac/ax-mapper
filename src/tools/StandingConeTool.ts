import { BaseConeStampTool } from './BaseConeStampTool'
import type { CanvasAPI } from '../canvas/CanvasAPI'

export class StandingConeTool extends BaseConeStampTool {
  readonly id = 'standing-cone'
  constructor(api: CanvasAPI) { super(api) }
  protected layout() {
    return [{ coneType: 'standing' as const, ox: 0, oy: 0 }]
  }
}
