import { BaseConeStampTool } from './BaseConeStampTool'
import type { CanvasAPI } from '../canvas/CanvasAPI'
import { coneSettings } from '../settings'

export class TimingGateTool extends BaseConeStampTool {
  readonly id = 'timing-gate'
  constructor(api: CanvasAPI) { super(api) }
  protected override widthStep() { return coneSettings.size }
  protected layout() {
    return [
      { coneType: 'timing_start' as const, ox: -this.gateHalf, oy: 0 },
      { coneType: 'timing_end' as const,   ox:  this.gateHalf, oy: 0 },
    ]
  }
}
