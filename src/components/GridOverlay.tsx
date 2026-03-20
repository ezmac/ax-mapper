import { useOverlaySettings } from '../context/overlaySettings'

export function GridOverlay() {
  const { gridSpacing, scale, camera } = useOverlaySettings()

  if (!gridSpacing) return null

  const { x, y, z } = camera

  // Convert feet → canvas units → screen pixels
  const gridUnits = gridSpacing * 0.3048 / scale
  const gridPx = gridUnits * z

  // Stage transform: screenX = pageX * z + x
  // Phase: (x mod gridPx + gridPx) mod gridPx gives where the page-origin grid line falls
  const ox = ((x % gridPx) + gridPx) % gridPx
  const oy = ((y % gridPx) + gridPx) % gridPx

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage: [
          'linear-gradient(to right, rgba(99,102,241,0.3) 1px, transparent 1px)',
          'linear-gradient(to bottom, rgba(99,102,241,0.3) 1px, transparent 1px)',
        ].join(','),
        backgroundSize: `${gridPx}px ${gridPx}px`,
        backgroundPosition: `${ox}px ${oy}px`,
      }}
    />
  )
}
