import type { ConeData, ConeType } from '../canvas/ConeData'

interface ConeEntry {
  bx: number
  by: number
  type: ConeType
  size: number
  facing_deg?: number
  lat?: number
  lon?: number
}

interface ExportData {
  transform: {
    type: 'scale'
    scale: number
    ox: number
    oy: number
  }
  pointer_source: 'magenta' | 'orange'
  n_standing: number
  n_pointer: number
  n_timing_start: number
  n_timing_end: number
  n_gcp: number
  bounds: { xmin: number; xmax: number; ymin: number; ymax: number }
  standing: ConeEntry[]
  pointers: ConeEntry[]
  timing_start: ConeEntry[]
  timing_end: ConeEntry[]
  gcp: ConeEntry[]
  stage_cone_pos?: [number, number]
}

export function exportJSON(cones: ConeData[], scaleMetresPerUnit: number): ExportData {
  const placed = cones.filter(c => !c.isGhost && !c.noExport)

  const standing: ConeEntry[] = []
  const pointers: ConeEntry[] = []
  const timing_start: ConeEntry[] = []
  const timing_end: ConeEntry[] = []
  const gcp: ConeEntry[] = []
  let stageConePosExport: [number, number] | undefined

  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity

  for (const cone of placed) {
    // cone.x,y is the centre in canvas space
    // Blender space: bx = east, by = north (+Y up, so canvas Y is flipped)
    const bx = cone.x * scaleMetresPerUnit
    const by = -cone.y * scaleMetresPerUnit
    const θ  = cone.rotation

    xmin = Math.min(xmin, bx); xmax = Math.max(xmax, bx)
    ymin = Math.min(ymin, by); ymax = Math.max(ymax, by)

    if (cone.coneType === 'car_start') {
      stageConePosExport = [bx, by]
    } else {
      const entry: ConeEntry = { bx, by, type: cone.coneType, size: cone.h }

      if (cone.coneType === 'pointer') {
        // Canvas rotation: radians CW (Y-down screen space).
        // Blender facing_deg: CCW from +X (east). Flip sign to convert.
        entry.facing_deg = Math.round(((-θ * 180 / Math.PI) + 360) % 360 * 100) / 100
        pointers.push(entry)
      } else if (cone.coneType === 'standing') {
        standing.push(entry)
      } else if (cone.coneType === 'timing_start') {
        timing_start.push(entry)
      } else if (cone.coneType === 'timing_end') {
        timing_end.push(entry)
      } else if (cone.coneType === 'gcp') {
        if (cone.gcpCoords) {
          entry.lat = cone.gcpCoords.lat
          entry.lon = cone.gcpCoords.lon
        }
        gcp.push(entry)
      }
    }
  }

  if (!isFinite(xmin)) {
    xmin = xmax = ymin = ymax = 0
  }

  const result: ExportData = {
    transform: { type: 'scale', scale: scaleMetresPerUnit, ox: 0, oy: 0 },
    pointer_source: 'magenta',
    n_standing: standing.length,
    n_pointer: pointers.length,
    n_timing_start: timing_start.length,
    n_timing_end: timing_end.length,
    n_gcp: gcp.length,
    bounds: { xmin, xmax, ymin, ymax },
    standing,
    pointers,
    timing_start,
    timing_end,
    gcp,
  }

  if (stageConePosExport) {
    result.stage_cone_pos = stageConePosExport
  }

  return result
}
