import { BaseConeStampTool } from './BaseConeStampTool'
import { coneSettings } from '../settings'

export class TimingEndGateTool extends BaseConeStampTool {
  static override id = 'timing-end-gate'
  protected override widthStep() { return coneSettings.size }
  protected layout() {
    return [
      { coneType: 'timing_end' as const, ox: -this.gateHalf, oy: 0 },
      { coneType: 'timing_end' as const, ox:  this.gateHalf, oy: 0 },
    ]
  }
}
