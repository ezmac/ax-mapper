import { BaseConeStampTool } from './BaseConeStampTool'

// Timing gate: green start + red end cones, 40 units apart
const GATE_HALF = 20

export class TimingGateTool extends BaseConeStampTool {
  static override id = 'timing-gate'
  protected layout() {
    return [
      { coneType: 'timing_start' as const, ox: -GATE_HALF, oy: 0 },
      { coneType: 'timing_end' as const, ox: GATE_HALF, oy: 0 },
    ]
  }
}
