import { BaseConeStampTool } from './BaseConeStampTool'
import { coneSettings } from '../settings'

export class GateTool extends BaseConeStampTool {
  static override id = 'gate'
  protected override widthStep() { return coneSettings.size }
  protected layout() {
    return [
      { coneType: 'standing' as const, ox: -this.gateHalf, oy: 0 },
      { coneType: 'standing' as const, ox:  this.gateHalf, oy: 0 },
    ]
  }
}
