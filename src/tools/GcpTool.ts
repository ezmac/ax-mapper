import { BaseConeStampTool } from './BaseConeStampTool'
import type { CanvasAPI } from '../canvas/CanvasAPI'

export class GcpTool extends BaseConeStampTool {
  readonly id = 'gcp'
  constructor(api: CanvasAPI) { super(api) }
  protected layout() {
    return [{ coneType: 'gcp' as const, ox: 0, oy: 0 }]
  }
}
