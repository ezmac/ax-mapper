import type { Editor } from 'tldraw'
import type { ConeShape, ConeType } from '../types/cone'

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
  pointer_source: 'orange'
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

export function exportJSON(editor: Editor, scaleMetresPerUnit: number): ExportData {
  const shapes = editor.getCurrentPageShapes()

  // tldraw's TLShape union doesn't include custom types by default;
  // we augmented it via TLGlobalShapePropsMap so 'cone' is valid here.
  const cones = shapes
    .filter((s): s is ConeShape => (s as ConeShape).type === 'cone')
    .filter(s => !s.props.isGhost)

  const standing: ConeEntry[] = []
  const pointers: ConeEntry[] = []
  const greens: ConeEntry[] = []
  const reds: ConeEntry[] = []
  const blues: ConeEntry[] = []

  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity

  for (const cone of cones) {
    // Center of shape in page coordinates
    const cx = cone.x + cone.props.w / 2
    const cy = cone.y + cone.props.h / 2

    // Convert to Blender space: bx = east, by = north (+Y up)
    const bx = cx * scaleMetresPerUnit
    const by = -cy * scaleMetresPerUnit

    xmin = Math.min(xmin, bx)
    xmax = Math.max(xmax, bx)
    ymin = Math.min(ymin, by)
    ymax = Math.max(ymax, by)

    const entry: ConeEntry = { bx, by, type: cone.props.coneType, size: 10 }

    if (cone.props.coneType === 'pointer') {
      // tldraw rotation: radians, CW positive (Y down). Convert to CCW degrees from +X (Blender).
      const rotRad = cone.rotation ?? 0
      const facing_deg = ((-rotRad * 180) / Math.PI + 360) % 360
      entry.facing_deg = Math.round(facing_deg * 100) / 100
      pointers.push(entry)
    } else if (cone.props.coneType === 'standing') {
      standing.push(entry)
    } else if (cone.props.coneType === 'timing_start') {
      greens.push(entry)
    } else if (cone.props.coneType === 'timing_end') {
      reds.push(entry)
    } else if (cone.props.coneType === 'gcp') {
      blues.push(entry)
    }
  }

  if (!isFinite(xmin)) {
    xmin = xmax = ymin = ymax = 0
  }

  return {
    transform: { type: 'scale', scale: scaleMetresPerUnit, ox: 0, oy: 0 },
    pointer_source: 'orange',
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
