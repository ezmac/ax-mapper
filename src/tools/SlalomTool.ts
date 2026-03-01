import { BaseConeStampTool } from './BaseConeStampTool'

// Slalom: N standing cones in a line, 25 units apart
const SLALOM_SPACING = 25
export const SLALOM_COUNT_DEFAULT = 5

export class SlalomTool extends BaseConeStampTool {
  static override id = 'slalom'

  // Configurable count – set by UI before switching to this tool
  static coneCount = SLALOM_COUNT_DEFAULT

  protected layout() {
    const n = SlalomTool.coneCount
    const half = ((n - 1) * SLALOM_SPACING) / 2
    return Array.from({ length: n }, (_, i) => ({
      coneType: 'standing' as const,
      ox: 0,
      oy: -half + i * SLALOM_SPACING,
    }))
  }
}
