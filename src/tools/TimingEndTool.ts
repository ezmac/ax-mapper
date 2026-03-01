import { BaseConeStampTool } from './BaseConeStampTool'

export class TimingEndTool extends BaseConeStampTool {
  static override id = 'timing-end'
  protected layout() {
    return [{ coneType: 'timing_end' as const, ox: 0, oy: 0 }]
  }
}
