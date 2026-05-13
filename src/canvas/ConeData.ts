export type ConeType = 'standing' | 'pointer' | 'timing_start' | 'timing_end' | 'gcp' | 'car_start'

export interface ConeData {
  id: string
  coneType: ConeType
  x: number        // canvas-space centre
  y: number
  rotation: number // radians; Konva uses degrees — convert at render boundary
  w: number
  h: number
  isGhost: boolean
  noExport?: boolean   // placed on canvas but omitted from JSON export
  gcpCoords?: { lat: number; lon: number }  // GPS anchor for GCP cones
  section?: number     // 1–5, layout export grouping
}
