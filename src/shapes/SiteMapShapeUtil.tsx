import { HTMLContainer, Rectangle2d, SVGContainer, ShapeUtil } from 'tldraw'
import type { SiteMapShape } from '../types/sitemap'
import { siteMapShapeProps } from '../types/sitemap'

export class SiteMapShapeUtil extends ShapeUtil<SiteMapShape> {
  static override type = 'sitemap' as const
  static override props = siteMapShapeProps

  override getDefaultProps(): SiteMapShape['props'] {
    return { w: 600, h: 600, dataUrl: '' }
  }

  override getGeometry(shape: SiteMapShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
  }

  override component(shape: SiteMapShape) {
    const { w, h, dataUrl } = shape.props

    if (dataUrl) {
      // Use HTMLContainer + <img> — more reliable than SVG <image> for data URLs
      return (
        <HTMLContainer>
          <img
            src={dataUrl}
            width={w}
            height={h}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
            draggable={false}
          />
        </HTMLContainer>
      )
    }

    // Default: white 600 ft square with a thick black border
    return (
      <SVGContainer>
        <rect x={0} y={0} width={w} height={h} fill="white" stroke="black" strokeWidth={4} />
      </SVGContainer>
    )
  }

  override indicator(_shape: SiteMapShape) {
    return null
  }

  override canResize() { return false }
  override hideRotateHandle() { return true }
  override canEdit() { return false }
  override canCrop() { return false }
}
