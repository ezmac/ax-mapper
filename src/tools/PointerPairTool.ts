import { BaseConeStampTool } from './BaseConeStampTool'
import type { LayoutEntry } from './BaseConeStampTool'
import type { CanvasAPI } from '../canvas/CanvasAPI'
import { coneSettings } from '../settings'

// The pointer is placed to the right of the standing cone.
// rotOffset π flips each pointer so its tip points LEFT — toward the standing cone.
export class PointerPairTool extends BaseConeStampTool {
  readonly id = 'pointer-pair'
  static pointerCount = 1

  constructor(api: CanvasAPI) { super(api) }

  protected layout(): LayoutEntry[] {
    const s = coneSettings.size
    const pw = Math.round(s * 1.6)         // pointer width (1.6× size)
    const firstOffset = Math.round(s / 2 + pw / 2 + s / 4)  // quarter-cone gap from standing edge
    const spacing = pw + Math.round(s / 4)  // center-to-center between consecutive pointers

    const entries: LayoutEntry[] = [
      { coneType: 'standing', ox: 0, oy: 0 },
    ]
    for (let i = 0; i < PointerPairTool.pointerCount; i++) {
      entries.push({
        coneType: 'pointer',
        ox: firstOffset + i * spacing,
        oy: 0,
        rotOffset: Math.PI,
      })
    }
    return entries
  }
}
