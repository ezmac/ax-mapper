import { T } from 'tldraw'
import type { RecordProps, TLShape } from 'tldraw'

export interface SiteMapShapeProps {
  w: number
  h: number
  dataUrl: string  // empty string → render default 600 ft square
}

declare module '@tldraw/tlschema' {
  interface TLGlobalShapePropsMap {
    sitemap: SiteMapShapeProps
  }
}

export type SiteMapShape = TLShape<'sitemap'>

export const siteMapShapeProps: RecordProps<SiteMapShape> = {
  w: T.number,
  h: T.number,
  dataUrl: T.string,
}
