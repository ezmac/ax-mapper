import { createShapeId } from 'tldraw'
import type { Editor } from 'tldraw'

import type { ConeType } from '../types/cone'

interface ConeEntry {
  bx: number
  by: number
  type: ConeType
  size?: number
  facing_deg?: number
}

interface ScaleTransform {
  type: 'scale'
  scale: number
  ox: number
  oy: number
}

interface ImportData {
  transform: ScaleTransform
  standing?: ConeEntry[]
  pointers?: ConeEntry[]
  greens?: ConeEntry[]
  reds?: ConeEntry[]
  blues?: ConeEntry[]
}

/** page-space dims for a cone type, matching BaseConeStampTool.dims() */
function dims(coneType: ConeType, s: number): { w: number; h: number } {
  return coneType === 'pointer'
    ? { w: Math.round(s * 1.6), h: s }
    : { w: s, h: s }
}

/**
 * Import a cone JSON file into the tldraw editor.
 * Inverts the scale transform to recover page-space centre, then
 * back-calculates the shape origin (x, y) from the centre and rotation.
 */
export function importJSON(editor: Editor, data: ImportData, coneSize: number): void {
  const t = data.transform
  // Only scale transforms are supported (that's all we export).
  if (t.type !== 'scale') {
    throw new Error(`Unsupported transform type: ${(t as any).type}`)
  }

  const scale = t.scale
  const ox = t.ox ?? 0
  const oy = t.oy ?? 0

  // Inverse of export:
  //   bx = cx * scale + ox  →  cx = (bx - ox) / scale
  //   by = -cy * scale + oy →  cy = -(by - oy) / scale
  function toPageCentre(bx: number, by: number): { cx: number; cy: number } {
    return {
      cx: (bx - ox) / scale,
      cy: -(by - oy) / scale,
    }
  }

  // Shape origin from page-space centre + rotation:
  //   cx = cos(θ)·w/2 − sin(θ)·h/2 + x  →  x = cx − (cos·w/2 − sin·h/2)
  //   cy = sin(θ)·w/2 + cos(θ)·h/2 + y  →  y = cy − (sin·w/2 + cos·h/2)
  function shapeOrigin(cx: number, cy: number, θ: number, w: number, h: number) {
    const cos = Math.cos(θ)
    const sin = Math.sin(θ)
    return {
      x: cx - (cos * w / 2 - sin * h / 2),
      y: cy - (sin * w / 2 + cos * h / 2),
    }
  }

  const allEntries: Array<{ entry: ConeEntry; coneType: ConeType }> = []
  for (const entry of (data.standing ?? [])) allEntries.push({ entry, coneType: 'standing' })
  for (const entry of (data.pointers ?? [])) allEntries.push({ entry, coneType: 'pointer' })
  for (const entry of (data.greens ?? [])) allEntries.push({ entry, coneType: 'timing_start' })
  for (const entry of (data.reds ?? [])) allEntries.push({ entry, coneType: 'timing_end' })
  for (const entry of (data.blues ?? [])) allEntries.push({ entry, coneType: 'gcp' })

  editor.markHistoryStoppingPoint('import-json')
  editor.run(() => {
    for (const { entry, coneType } of allEntries) {
      const { cx, cy } = toPageCentre(entry.bx, entry.by)
      const { w, h } = dims(coneType, entry.size ?? coneSize)

      // facing_deg (CCW from +X, Blender) → tldraw θ (CW from +X, Y-down)
      // facing_deg = (-θ * 180/π + 360) % 360  →  θ = -facing_deg * π/180
      const θ = coneType === 'pointer' && entry.facing_deg != null
        ? (-(entry.facing_deg * Math.PI) / 180)
        : 0

      const { x, y } = shapeOrigin(cx, cy, θ, w, h)

      editor.createShape({
        id: createShapeId(),
        type: 'cone',
        x,
        y,
        rotation: θ,
        props: { coneType, isGhost: false, w, h },
      } as any)
    }
  })
}
