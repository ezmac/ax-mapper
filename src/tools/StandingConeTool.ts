import { BaseConeStampTool } from './BaseConeStampTool'

export class StandingConeTool extends BaseConeStampTool {
  static override id = 'standing-cone'
  protected layout() {
    return [{ coneType: 'standing' as const, ox: 0, oy: 0 }]
  }
}
