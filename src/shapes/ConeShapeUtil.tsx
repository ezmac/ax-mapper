import { Rectangle2d, SVGContainer, ShapeUtil } from 'tldraw'
import type { TLResizeInfo } from 'tldraw'
import type { ConeShape } from '../types/cone'
import { coneShapeProps } from '../types/cone'

// Colours
const C_ORANGE  = '#FF8C00'
const C_MAGENTA = '#FF00FF'
const C_GREEN   = '#22c55e'
const C_RED     = '#ef4444'
const C_BLUE    = '#3b82f6'

export class ConeShapeUtil extends ShapeUtil<ConeShape> {
  static override type = 'cone' as const
  static override props = coneShapeProps

  override getDefaultProps(): ConeShape['props'] {
    return { coneType: 'standing', isGhost: false, w: 16, h: 16 }
  }

  override getGeometry(shape: ConeShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
  }

  override component(shape: ConeShape) {
    const { coneType, w, h, isGhost } = shape.props
    const opacity = isGhost ? 0.45 : 1

    return (
      <SVGContainer>
        {renderCone(coneType, w, h, opacity)}
      </SVGContainer>
    )
  }

  override indicator(shape: ConeShape) {
    const { coneType, w, h } = shape.props
    if (coneType === 'pointer') {
      return <polygon points={`${w},${h / 2} 0,0 0,${h}`} fill="none" />
    }
    if (coneType === 'gcp') {
      return <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) / 2} fill="none" />
    }
    return <rect x={0} y={0} width={w} height={h} fill="none" />
  }

  override canResize() { return true }

  override onResize(shape: ConeShape, info: TLResizeInfo<ConeShape>) {
    const w = Math.max(3, Math.round(Math.abs(info.scaleX * shape.props.w)))
    const h = Math.max(3, Math.round(Math.abs(info.scaleY * shape.props.h)))
    return { x: info.newPoint.x, y: info.newPoint.y, props: { w, h } }
  }

  override hideRotateHandle(_shape: ConeShape) { return false }
}

/** Render the correct SVG element(s) for a cone type, scaled to w×h. */
export function renderCone(
  coneType: ConeShape['props']['coneType'],
  w: number,
  h: number,
  opacity = 1
) {
  const r = Math.min(w, h) * 0.12  // corner radius for squares

  switch (coneType) {
    case 'standing':
      return <rect x={0} y={0} width={w} height={h} rx={r} fill={C_ORANGE} opacity={opacity} />

    case 'pointer':
      // Triangle pointing right → tip at right-centre, base at left edge
      return (
        <polygon
          points={`${w},${h / 2} 0,0 0,${h}`}
          fill={C_MAGENTA}
          opacity={opacity}
        />
      )

    case 'timing_start':
      return <rect x={0} y={0} width={w} height={h} rx={r} fill={C_GREEN} opacity={opacity} />

    case 'timing_end':
      return <rect x={0} y={0} width={w} height={h} rx={r} fill={C_RED} opacity={opacity} />

    case 'gcp': {
      const cx = w / 2, cy = h / 2, rad = Math.min(w, h) / 2 * 0.92
      return (
        <>
          <circle cx={cx} cy={cy} r={rad} fill={C_BLUE} opacity={opacity} />
          <circle cx={cx} cy={cy} r={rad * 0.3} fill="white" opacity={opacity} />
        </>
      )
    }
  }
}
