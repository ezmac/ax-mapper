export type ConeType = 'standing' | 'pointer' | 'timing_start' | 'timing_end' | 'gcp' | 'car_start'

export interface ConeData {
  id: string
  coneType: ConeType
  x: number        // canvas-space top-left origin
  y: number
  rotation: number // radians; Konva uses degrees — convert at render boundary
  w: number
  h: number
  isGhost: boolean
}
