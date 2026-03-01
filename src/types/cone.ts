import { T } from 'tldraw'
import type { RecordProps, TLShape } from 'tldraw'

export type ConeType = 'standing' | 'pointer' | 'timing_start' | 'timing_end' | 'gcp'

export interface ConeShapeProps {
  coneType: ConeType
  isGhost: boolean
  w: number
  h: number
}

// Register the shape type with tldraw's type system
declare module '@tldraw/tlschema' {
  interface TLGlobalShapePropsMap {
    cone: ConeShapeProps
  }
}

export type ConeShape = TLShape<'cone'>

export const coneShapeProps: RecordProps<ConeShape> = {
  coneType: T.literalEnum('standing', 'pointer', 'timing_start', 'timing_end', 'gcp'),
  isGhost: T.boolean,
  w: T.number,
  h: T.number,
}
