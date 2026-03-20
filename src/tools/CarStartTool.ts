import { BaseConeStampTool } from './BaseConeStampTool'
import type { CanvasAPI } from '../canvas/CanvasAPI'

export class CarStartTool extends BaseConeStampTool {
  readonly id = 'car-start'
  constructor(api: CanvasAPI) { super(api) }
  protected layout() {
    return [{ coneType: 'car_start' as const, ox: 0, oy: 0 }]
  }
}
