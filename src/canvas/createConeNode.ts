import Konva from 'konva'
import type { ConeData } from './ConeData'

const C_ORANGE  = '#FF8C00'
const C_MAGENTA = '#FF00FF'
const C_GREEN   = '#22c55e'
const C_RED     = '#ef4444'
const C_BLUE    = '#3b82f6'

/** Build a Konva.Group representing a single cone. */
export function createConeNode(data: ConeData): Konva.Group {
  const { x, y, w, h, rotation, isGhost, coneType } = data
  const opacity = isGhost ? 0.45 : 1

  const group = new Konva.Group({
    id: data.id,
    x,
    y,
    rotation: rotation * (180 / Math.PI), // Konva uses degrees
    opacity,
    listening: false, // cones don't need pointer events
  })

  const r = Math.min(w, h) * 0.12  // corner radius for square cones

  switch (coneType) {
    case 'standing':
      group.add(new Konva.Rect({ x: 0, y: 0, width: w, height: h, cornerRadius: r, fill: C_ORANGE }))
      break

    case 'timing_start':
      group.add(new Konva.Rect({ x: 0, y: 0, width: w, height: h, cornerRadius: r, fill: C_GREEN }))
      break

    case 'timing_end':
      group.add(new Konva.Rect({ x: 0, y: 0, width: w, height: h, cornerRadius: r, fill: C_RED }))
      break

    case 'pointer':
      // Triangle pointing right: tip at (w, h/2), base corners at (0,0) and (0,h)
      group.add(new Konva.Line({
        points: [w, h / 2, 0, 0, 0, h],
        closed: true,
        fill: C_MAGENTA,
        strokeEnabled: false,
      }))
      break

    case 'gcp': {
      const cx = w / 2
      const cy = h / 2
      const rad = Math.min(w, h) / 2 * 0.92
      group.add(new Konva.Circle({ x: cx, y: cy, radius: rad, fill: C_BLUE }))
      group.add(new Konva.Circle({ x: cx, y: cy, radius: rad * 0.3, fill: 'white' }))
      break
    }
  }

  return group
}
