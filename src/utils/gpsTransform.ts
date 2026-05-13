export interface GcpPoint {
  cx: number   // canvas x
  cy: number   // canvas y
  lat: number
  lon: number
}

export interface AffineTransform {
  a: number; b: number; tx: number  // lon = a*cx + b*cy + tx
  c: number; d: number; ty: number  // lat = c*cx + d*cy + ty
}

export function computeAffine(gcps: [GcpPoint, GcpPoint, GcpPoint]): AffineTransform {
  const [p0, p1, p2] = gcps

  // Solve M * [coeff0, coeff1, constant] = rhs for both lon and lat
  // M = [[cx0, cy0, 1], [cx1, cy1, 1], [cx2, cy2, 1]]
  const det = p0.cx * (p1.cy - p2.cy) - p0.cy * (p1.cx - p2.cx) + (p1.cx * p2.cy - p2.cx * p1.cy)
  if (Math.abs(det) < 1e-10) throw new Error('GCP points are collinear — cannot compute transform')

  const inv = 1 / det
  const C00 =  (p1.cy - p2.cy)
  const C01 = -(p1.cx - p2.cx)
  const C02 =  (p1.cx * p2.cy - p1.cy * p2.cx)
  const C10 = -(p0.cy - p2.cy)
  const C11 =  (p0.cx - p2.cx)
  const C12 = -(p0.cx * p2.cy - p0.cy * p2.cx)
  const C20 =  (p0.cy - p1.cy)
  const C21 = -(p0.cx - p1.cx)
  const C22 =  (p0.cx * p1.cy - p0.cy * p1.cx)

  function solve(r0: number, r1: number, r2: number): [number, number, number] {
    return [
      inv * (C00 * r0 + C10 * r1 + C20 * r2),
      inv * (C01 * r0 + C11 * r1 + C21 * r2),
      inv * (C02 * r0 + C12 * r1 + C22 * r2),
    ]
  }

  const [a, b, tx] = solve(p0.lon, p1.lon, p2.lon)
  const [c, d, ty] = solve(p0.lat, p1.lat, p2.lat)

  return { a, b, tx, c, d, ty }
}

export function canvasToGps(t: AffineTransform, cx: number, cy: number): { lat: number; lon: number } {
  return {
    lon: t.a * cx + t.b * cy + t.tx,
    lat: t.c * cx + t.d * cy + t.ty,
  }
}

/** Convert a canvas rotation (radians CW from +X, Y-down) to a compass bearing (degrees CW from north). */
export function canvasRotationToHeading(t: AffineTransform, rotation: number): number {
  const vx = Math.cos(rotation)
  const vy = Math.sin(rotation)
  const dlon = t.a * vx + t.b * vy
  const dlat = t.c * vx + t.d * vy
  return ((Math.atan2(dlon, dlat) * (180 / Math.PI)) + 360) % 360
}
