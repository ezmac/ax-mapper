import { BaseConeStampTool } from './BaseConeStampTool'
import type { CanvasAPI } from '../canvas/CanvasAPI'

export class TimingStartTool extends BaseConeStampTool {
  readonly id = 'timing-start'
  constructor(api: CanvasAPI) { super(api) }
  protected layout() {
    return [{ coneType: 'timing_start' as const, ox: 0, oy: 0 }]
  }
}
