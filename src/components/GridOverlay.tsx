import { useEditor, useValue } from 'tldraw'
import { useOverlaySettings } from '../context/overlaySettings'

// 20 feet at the default scale of 1 ft/unit = 20 canvas units
const GRID_UNITS = 20

export function GridOverlay() {
  const { showGrid } = useOverlaySettings()
  const editor = useEditor()

  // Reactively track camera so the grid updates on pan/zoom
  const camera = useValue('camera', () => editor.getCamera(), [editor])

  if (!showGrid) return null

  const { x, y, z } = camera
  const gridPx = GRID_UNITS * z

  // Page-to-screen: screenX = (pageX + x) * z
  // Phase: (x * z) mod gridPx gives where the page-origin grid line falls on screen
  const ox = ((x * z % gridPx) + gridPx) % gridPx
  const oy = ((y * z % gridPx) + gridPx) % gridPx

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
