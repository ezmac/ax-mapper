import { useEditor, useValue } from 'tldraw'
import { useOverlaySettings } from '../context/overlaySettings'

export function CanvasBackground() {
  const editor = useEditor()
  const { imageUrl, siteW, siteH, showBackground } = useOverlaySettings()

  const camera = useValue('camera', () => editor.getCamera(), [editor])

  if (!showBackground) return null

  const { x, y, z } = camera

  // Page-to-screen: screenX = (pageX + x) * z
  // So page origin (0,0) lands at screen (x*z, y*z), scaled by z.
  const transform = `translate(${x * z}px, ${y * z}px) scale(${z})`

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: siteW,
        height: siteH,
        transformOrigin: '0 0',
        transform,
        pointerEvents: 'none',
      }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          width={siteW}
          height={siteH}
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
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'white',
            border: '4px solid black',
            boxSizing: 'border-box',
          }}
        />
      )}
    </div>
  )
}
