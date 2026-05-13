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
  page_w_pt?: number
  page_h_pt?: number
}

interface ImportData {
  transform: ScaleTransform
  standing?: ConeEntry[]
  pointers?: ConeEntry[]
  timing_start?: ConeEntry[]
  timing_end?: ConeEntry[]
  gcp?: ConeEntry[]
  stage_cone_pos?: [number, number]
  // legacy field names from pre-alignment ax-mapper exports
  greens?: ConeEntry[]
  reds?: ConeEntry[]
  blues?: ConeEntry[]
}

function dims(coneType: ConeType, s: number): { w: number; h: number } {
  return coneType === 'pointer'
    ? { w: Math.round(s * 1.6), h: s }
    : { w: s, h: s }
}

export interface ImportResult {
  pageW?: number  // canvas units wide (= page_w_pt when scale=0.3048)
  pageH?: number
}

export function importJSON(canvasAPI: CanvasAPI, data: ImportData, coneSize: number): ImportResult {
  const t = data.transform
  if (t.type !== 'scale') {
    throw new Error(`Unsupported transform type: ${(t as any).type}`)
  }

  const scale = t.scale
  const ox = t.ox ?? 0
  const oy = t.oy ?? 0

  // page_w_pt/page_h_pt are in PDF points; canvas units = pt * scale / 0.3048
  // (when scale=0.3048 this simplifies to page_w_pt canvas units = page_w_pt PDF points)
  const pageW = t.page_w_pt != null ? t.page_w_pt * scale / 0.3048 : undefined
  const pageH = t.page_h_pt != null ? t.page_h_pt * scale / 0.3048 : undefined

  // Inverse of export:
  //   bx = cx * scale  →  cx = bx / scale  (when ox=oy=0)
  //   by = -cy * scale →  cy = -by / scale
  function toPageCentre(bx: number, by: number): { cx: number; cy: number } {
    return {
      cx: (bx - ox) / scale,
      cy: -(by - oy) / scale,
    }
  }

  const allEntries: Array<{ entry: ConeEntry; coneType: ConeType }> = []
  for (const entry of (data.standing ?? [])) allEntries.push({ entry, coneType: 'standing' })
  for (const entry of (data.pointers ?? [])) allEntries.push({ entry, coneType: 'pointer' })
  for (const entry of (data.timing_start ?? data.greens ?? [])) allEntries.push({ entry, coneType: 'timing_start' })
  for (const entry of (data.timing_end  ?? data.reds   ?? [])) allEntries.push({ entry, coneType: 'timing_end' })
  for (const entry of (data.gcp         ?? data.blues  ?? [])) allEntries.push({ entry, coneType: 'gcp' })

  canvasAPI.run(() => {
    for (const { entry, coneType } of allEntries) {
      const { cx: x, cy: y } = toPageCentre(entry.bx, entry.by)
      const { w, h } = dims(coneType, entry.size ?? coneSize)

      // facing_deg (CCW from +X, Blender) → canvas θ (CW from +X, Y-down)
      const θ = coneType === 'pointer' && entry.facing_deg != null
        ? -(entry.facing_deg * Math.PI / 180)
        : 0

      canvasAPI.createCone({ coneType, x, y, rotation: θ, w, h })
    }

    // Import car start position (stage_cone_pos)
    if (data.stage_cone_pos) {
      const [bx, by] = data.stage_cone_pos
      const { cx: x, cy: y } = toPageCentre(bx, by)
      const { w, h } = dims('car_start', coneSize)
      canvasAPI.createCone({ coneType: 'car_start', x, y, rotation: 0, w, h })
    }
  })

  return { pageW, pageH }
}
