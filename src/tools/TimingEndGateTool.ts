import { BaseConeStampTool } from './BaseConeStampTool'
import type { CanvasAPI } from '../canvas/CanvasAPI'
import { coneSettings } from '../settings'

export class TimingEndGateTool extends BaseConeStampTool {
  readonly id = 'timing-end-gate'
  constructor(api: CanvasAPI) { super(api) }
  protected override widthStep() { return coneSettings.size }
  protected layout() {
    return [
      { coneType: 'timing_end' as const, ox: -this.gateHalf, oy: 0 },
      { coneType: 'timing_end' as const, ox:  this.gateHalf, oy: 0 },
      // pointer in center indicating direction of travel (forward = "up" at default rotation)
      { coneType: 'pointer' as const, ox: 0, oy: 0, rotOffset: -Math.PI / 2 },
    ]
  }
}
