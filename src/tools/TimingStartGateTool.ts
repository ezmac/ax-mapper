import { BaseConeStampTool } from './BaseConeStampTool'
import type { CanvasAPI } from '../canvas/CanvasAPI'
import { coneSettings } from '../settings'

export class TimingStartGateTool extends BaseConeStampTool {
  readonly id = 'timing-start-gate'
  constructor(api: CanvasAPI) { super(api) }
  protected override widthStep() { return coneSettings.size }
  protected layout() {
    return [
      { coneType: 'timing_start' as const, ox: -this.gateHalf, oy: 0 },
      { coneType: 'timing_start' as const, ox:  this.gateHalf, oy: 0 },
    ]
  }
}
