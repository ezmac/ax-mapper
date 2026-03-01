import { BaseConeStampTool } from './BaseConeStampTool'

// Gate: 2 standing cones, 40 units apart (≈ ~12 ft at default scale)
const GATE_HALF = 20

export class GateTool extends BaseConeStampTool {
  static override id = 'gate'
  protected layout() {
    return [
      { coneType: 'standing' as const, ox: -GATE_HALF, oy: 0 },
      { coneType: 'standing' as const, ox: GATE_HALF, oy: 0 },
    ]
  }
}
