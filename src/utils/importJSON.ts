import type { CanvasAPI } from '../canvas/CanvasAPI'
import type { ConeType } from '../canvas/ConeData'

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

function dims(coneType: ConeType, s: number): { w: number; h: number } {
  return coneType === 'pointer'
    ? { w: Math.round(s * 1.6), h: s }
    : { w: s, h: s }
}

export function importJSON(canvasAPI: CanvasAPI, data: ImportData, coneSize: number): void {
  const t = data.transform
  if (t.type !== 'scale') {
    throw new Error(`Unsupported transform type: ${(t as any).type}`)
  }

  const scale = t.scale
  const ox = t.ox ?? 0
  const oy = t.oy ?? 0

  // Inverse of export:
  //   bx = cx * scale  →  cx = bx / scale  (when ox=oy=0)
  //   by = -cy * scale →  cy = -by / scale
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
  for (const entry of (data.greens ?? []))   allEntries.push({ entry, coneType: 'timing_start' })
  for (const entry of (data.reds ?? []))     allEntries.push({ entry, coneType: 'timing_end' })
  for (const entry of (data.blues ?? []))    allEntries.push({ entry, coneType: 'gcp' })

  canvasAPI.run(() => {
    for (const { entry, coneType } of allEntries) {
      const { cx, cy } = toPageCentre(entry.bx, entry.by)
      const { w, h } = dims(coneType, entry.size ?? coneSize)

      // facing_deg (CCW from +X, Blender) → canvas θ (CW from +X, Y-down)
      const θ = coneType === 'pointer' && entry.facing_deg != null
        ? -(entry.facing_deg * Math.PI / 180)
        : 0

      const { x, y } = shapeOrigin(cx, cy, θ, w, h)

      canvasAPI.createCone({ coneType, x, y, rotation: θ, w, h })
    }
  })
}
