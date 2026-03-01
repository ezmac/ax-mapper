import { BaseConeStampTool } from './BaseConeStampTool'

export class GcpTool extends BaseConeStampTool {
  static override id = 'gcp'
  protected layout() {
    return [{ coneType: 'gcp' as const, ox: 0, oy: 0 }]
  }
}
