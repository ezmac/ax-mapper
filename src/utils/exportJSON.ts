import type { ConeData, ConeType } from '../canvas/ConeData'

interface ConeEntry {
  bx: number
  by: number
  type: ConeType
  size: number
  facing_deg?: number
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
  n_green: number
  n_red: number
  n_blue: number
  bounds: { xmin: number; xmax: number; ymin: number; ymax: number }
  standing: ConeEntry[]
  pointers: ConeEntry[]
  greens: ConeEntry[]
  reds: ConeEntry[]
  blues: ConeEntry[]
}

export function exportJSON(cones: ConeData[], scaleMetresPerUnit: number): ExportData {
  const placed = cones.filter(c => !c.isGhost)

  const standing: ConeEntry[] = []
  const pointers: ConeEntry[] = []
  const greens: ConeEntry[] = []
  const reds: ConeEntry[] = []
  const blues: ConeEntry[] = []

  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity

  for (const cone of placed) {
    // Page-space centre: rotation is applied around the top-left (x,y) origin.
    //   cx = cos(θ)·w/2 − sin(θ)·h/2 + x
    //   cy = sin(θ)·w/2 + cos(θ)·h/2 + y
    const θ  = cone.rotation
    const w  = cone.w
    const h  = cone.h
    const cx = Math.cos(θ) * w / 2 - Math.sin(θ) * h / 2 + cone.x
    const cy = Math.sin(θ) * w / 2 + Math.cos(θ) * h / 2 + cone.y

    // Blender space: bx = east, by = north (+Y up, so canvas Y is flipped)
    const bx = cx * scaleMetresPerUnit
    const by = -cy * scaleMetresPerUnit

    xmin = Math.min(xmin, bx); xmax = Math.max(xmax, bx)
    ymin = Math.min(ymin, by); ymax = Math.max(ymax, by)

    const entry: ConeEntry = { bx, by, type: cone.coneType, size: h }

    if (cone.coneType === 'pointer') {
      // Canvas rotation: radians CW (Y-down screen space).
      // Blender facing_deg: CCW from +X (east). Flip sign to convert.
      entry.facing_deg = Math.round(((-θ * 180 / Math.PI) + 360) % 360 * 100) / 100
      pointers.push(entry)
    } else if (cone.coneType === 'standing') {
      standing.push(entry)
    } else if (cone.coneType === 'timing_start') {
      greens.push(entry)
    } else if (cone.coneType === 'timing_end') {
      reds.push(entry)
    } else if (cone.coneType === 'gcp') {
      blues.push(entry)
    }
  }

  if (!isFinite(xmin)) {
    xmin = xmax = ymin = ymax = 0
  }

  return {
    transform: { type: 'scale', scale: scaleMetresPerUnit, ox: 0, oy: 0 },
    pointer_source: 'magenta',
    n_standing: standing.length,
    n_pointer: pointers.length,
    n_green: greens.length,
    n_red: reds.length,
    n_blue: blues.length,
    bounds: { xmin, xmax, ymin, ymax },
    standing,
    pointers,
    greens,
    reds,
    blues,
  }
}
