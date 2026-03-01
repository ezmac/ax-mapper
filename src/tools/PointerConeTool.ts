import { BaseConeStampTool } from './BaseConeStampTool'

export class PointerConeTool extends BaseConeStampTool {
  static override id = 'pointer-cone'
  protected layout() {
    return [{ coneType: 'pointer' as const, ox: 0, oy: 0 }]
  }
}
