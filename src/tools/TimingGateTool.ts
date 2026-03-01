import { BaseConeStampTool } from './BaseConeStampTool'
import { coneSettings } from '../settings'

export class TimingGateTool extends BaseConeStampTool {
  static override id = 'timing-gate'
  protected override widthStep() { return coneSettings.size }
  protected layout() {
    return [
      { coneType: 'timing_start' as const, ox: -this.gateHalf, oy: 0 },
      { coneType: 'timing_end' as const,   ox:  this.gateHalf, oy: 0 },
    ]
  }
}
