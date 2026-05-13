import { BaseConeStampTool } from './BaseConeStampTool'
import type { CanvasAPI } from '../canvas/CanvasAPI'
import { coneSettings } from '../settings'

export class TimingStartGateTool extends BaseConeStampTool {
  readonly id = 'timing-start-gate'
  constructor(api: CanvasAPI) { super(api) }
  protected override widthStep() { return coneSettings.size }
  protected override coneSize() { return 8 }
  protected layout() {
    return [
      { coneType: 'timing_start' as const, ox: -this.gateHalf, oy: 0 },
      { coneType: 'timing_start' as const, ox:  this.gateHalf, oy: 0 },
      { coneType: 'pointer' as const, ox: 0, oy: 0, rotOffset: -Math.PI / 2, noExport: true },
    ]
  }
}
