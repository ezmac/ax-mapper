import { BaseConeStampTool } from './BaseConeStampTool'

export class TimingStartTool extends BaseConeStampTool {
  static override id = 'timing-start'
  protected layout() {
    return [{ coneType: 'timing_start' as const, ox: 0, oy: 0 }]
  }
}
