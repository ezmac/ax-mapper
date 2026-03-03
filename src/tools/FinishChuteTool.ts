import { BaseConeStampTool } from './BaseConeStampTool'
import type { CanvasAPI } from '../canvas/CanvasAPI'
import { coneSettings } from '../settings'

const N_GATES = 10

export class FinishChuteTool extends BaseConeStampTool {
  readonly id = 'finish-chute'

  constructor(api: CanvasAPI) { super(api) }

  protected override widthStep() { return coneSettings.size }

  protected layout() {
    const pointerW = Math.round(coneSettings.size * 1.6)
    const spacing = 3 * pointerW
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
