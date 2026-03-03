import { BaseConeStampTool } from './BaseConeStampTool'
import type { CanvasAPI } from '../canvas/CanvasAPI'

export class TimingEndTool extends BaseConeStampTool {
  readonly id = 'timing-end'
  constructor(api: CanvasAPI) { super(api) }
  protected layout() {
    return [{ coneType: 'timing_end' as const, ox: 0, oy: 0 }]
  }
}
