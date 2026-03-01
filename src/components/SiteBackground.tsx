// Renders behind the tldraw canvas content as the Background component slot.
// Shows 600ft square by default, or an uploaded site map image.

export const DEFAULT_SITE_UNITS = 600

interface SiteBackgroundProps {
  imageUrl: string | null
}

export function SiteBackground({ imageUrl }: SiteBackgroundProps) {
  return (
    // tl-background positions this absolutely behind all canvas content
    <div className="tl-background" style={{ background: '#e5e7eb' }}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt="site map"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: DEFAULT_SITE_UNITS,
            height: DEFAULT_SITE_UNITS,
            objectFit: 'contain',
            display: 'block',
          }}
        />
      ) : (
        // Default 600×600 unit white square with black border
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: DEFAULT_SITE_UNITS,
            height: DEFAULT_SITE_UNITS,
            background: 'white',
            border: '4px solid black',
            boxSizing: 'border-box',
          }}
        />
      )}
    </div>
  )
}
