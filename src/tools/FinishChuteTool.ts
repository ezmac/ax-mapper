import { BaseConeStampTool } from './BaseConeStampTool'
import type { CanvasAPI } from '../canvas/CanvasAPI'
import { coneSettings } from '../settings'

const N_GATES = 10

export class FinishChuteTool extends BaseConeStampTool {
  readonly id = 'finish-chute'
  protected override gateHalf = 11  // 22 ft wide

  constructor(api: CanvasAPI) { super(api) }

  protected override widthStep() { return coneSettings.size }

  protected layout() {
    const spacing = 37  // 37 ft between gate sets
    const half = ((N_GATES - 1) * spacing) / 2
    const entries = []
    for (let i = 0; i < N_GATES; i++) {
      const oy = -half + i * spacing
      entries.push(
        { coneType: 'standing' as const, ox: -this.gateHalf, oy },
        { coneType: 'standing' as const, ox:  this.gateHalf, oy },
      )
    }
    return entries
  }
}
