import type { ConeData } from '../canvas/ConeData'
import { computeAffine, canvasToGps, canvasRotationToHeading } from './gpsTransform'
import type { GcpPoint } from './gpsTransform'

export type LayoutConeType = 'S' | 'P' | 'TS' | 'TE'

export interface LayoutCone {
  lat: number
  lon: number
  t: LayoutConeType
  h?: number  // compass heading 0–360, pointer only
}

export interface LayoutPayload {
  v: 1
  name: string
  s: number
  cones: LayoutCone[]
}

function nearestNeighborOrder(cones: LayoutCone[]): LayoutCone[] {
  if (cones.length <= 1) return [...cones]
  const unvisited = [...cones]
  // Start at northernmost cone
  let startIdx = 0
  for (let i = 1; i < unvisited.length; i++) {
    if (unvisited[i].lat > unvisited[startIdx].lat) startIdx = i
  }
  const result: LayoutCone[] = [unvisited.splice(startIdx, 1)[0]]
  while (unvisited.length > 0) {
    const last = result[result.length - 1]
    let nearest = 0
    let nearestDist = Infinity
    for (let i = 0; i < unvisited.length; i++) {
      const dx = unvisited[i].lon - last.lon
      const dy = unvisited[i].lat - last.lat
      const d = dx * dx + dy * dy
      if (d < nearestDist) { nearestDist = d; nearest = i }
    }
    result.push(unvisited.splice(nearest, 1)[0])
  }
  return result
}

export function buildLayoutPayload(
  allCones: ConeData[],
  section: number,
  projectName: string,
): LayoutPayload {
  const placed = allCones.filter(c => !c.isGhost && !c.noExport)

  const gcps = placed.filter(c => c.coneType === 'gcp' && c.gcpCoords)
  if (gcps.length < 3) {
    throw new Error(`Need 3 GCPs with GPS coordinates (have ${gcps.length})`)
  }

  const gcpPoints: [GcpPoint, GcpPoint, GcpPoint] = [
    { cx: gcps[0].x, cy: gcps[0].y, ...gcps[0].gcpCoords! },
    { cx: gcps[1].x, cy: gcps[1].y, ...gcps[1].gcpCoords! },
    { cx: gcps[2].x, cy: gcps[2].y, ...gcps[2].gcpCoords! },
  ]

  const affine = computeAffine(gcpPoints)

  const sectionCones = placed.filter(
    c => c.section === section && c.coneType !== 'gcp' && c.coneType !== 'car_start'
  )

  if (sectionCones.length === 0) {
    throw new Error(`No cones assigned to section ${section}`)
  }

  const layoutCones: LayoutCone[] = sectionCones.map(c => {
    const { lat, lon } = canvasToGps(affine, c.x, c.y)
    const cone: LayoutCone = {
      lat: Math.round(lat * 1e7) / 1e7,
      lon: Math.round(lon * 1e7) / 1e7,
      t: c.coneType === 'pointer' ? 'P'
        : c.coneType === 'timing_start' ? 'TS'
        : c.coneType === 'timing_end' ? 'TE'
        : 'S',
    }
    if (c.coneType === 'pointer') {
      cone.h = Math.round(canvasRotationToHeading(affine, c.rotation))
    }
    return cone
  })

  return { v: 1, name: projectName, s: section, cones: nearestNeighborOrder(layoutCones) }
}
