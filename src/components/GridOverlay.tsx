import { useEditor, useValue } from 'tldraw'
import { useOverlaySettings } from '../context/overlaySettings'

const GRID_FEET = 20

export function GridOverlay() {
  const { showGrid, scale } = useOverlaySettings()
  const editor = useEditor()

  // Reactively track camera so the grid updates on pan/zoom
  const camera = useValue('camera', () => editor.getCamera(), [editor])

  if (!showGrid) return null

  const { x, y, z } = camera
  // Convert 20 feet → canvas units → screen pixels
  const gridUnits = GRID_FEET * 0.3048 / scale
  const gridPx = gridUnits * z

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
