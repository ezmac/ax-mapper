import { BaseConeStampTool } from './BaseConeStampTool'
import type { CanvasAPI } from '../canvas/CanvasAPI'
import { coneSettings } from '../settings'

export const SLALOM_COUNT_DEFAULT = 3

export class SlalomTool extends BaseConeStampTool {
  readonly id = 'slalom'
  static coneCount = SLALOM_COUNT_DEFAULT

  // gateHalf repurposed as cone-to-cone spacing along the slalom axis
  protected override gateHalf = 25

  constructor(api: CanvasAPI) { super(api) }

  protected override widthStep() { return coneSettings.size }

  protected layout() {
    const n = SlalomTool.coneCount
    const spacing = this.gateHalf
    const half = ((n - 1) * spacing) / 2
    return Array.from({ length: n }, (_, i) => ({
      coneType: 'standing' as const,
      ox: 0,
      oy: -half + i * spacing,
    }))
  }
}
