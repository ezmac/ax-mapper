import { BaseConeStampTool } from './BaseConeStampTool'
import type { CanvasAPI } from '../canvas/CanvasAPI'
import { coneSettings } from '../settings'

export class GateTool extends BaseConeStampTool {
  readonly id = 'gate'
  constructor(api: CanvasAPI) { super(api) }
  protected override widthStep() { return coneSettings.size }
  protected layout() {
    return [
      { coneType: 'standing' as const, ox: -this.gateHalf, oy: 0 },
      { coneType: 'standing' as const, ox:  this.gateHalf, oy: 0 },
    ]
  }
}
