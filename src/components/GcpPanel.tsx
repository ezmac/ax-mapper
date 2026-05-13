import { useState, useEffect } from 'react'
import type { ConeData } from '../canvas/ConeData'
import type { CanvasAPI } from '../canvas/CanvasAPI'

interface Props {
  cone: ConeData
  canvasAPI: CanvasAPI
}

const inputStyle: React.CSSProperties = {
  background: '#334155', color: 'white',
  border: '1px solid #475569', borderRadius: 4,
  padding: '3px 6px', fontSize: 12, width: 150,
}

export function GcpPanel({ cone, canvasAPI }: Props) {
  const [lat, setLat] = useState(cone.gcpCoords?.lat?.toString() ?? '')
  const [lon, setLon] = useState(cone.gcpCoords?.lon?.toString() ?? '')

  useEffect(() => {
    setLat(cone.gcpCoords?.lat?.toString() ?? '')
    setLon(cone.gcpCoords?.lon?.toString() ?? '')
  }, [cone.id, cone.gcpCoords?.lat, cone.gcpCoords?.lon])

  function save() {
    const latN = parseFloat(lat)
    const lonN = parseFloat(lon)
    if (!isNaN(latN) && !isNaN(lonN)) {
      canvasAPI.updateCone(cone.id, { gcpCoords: { lat: latN, lon: lonN } })
    }
  }

  const valid = !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lon))

  return (
    <div style={{
      position: 'absolute', bottom: 52, right: 14,
      background: 'rgba(15,23,42,0.92)', border: '1px solid #3b82f6',
      borderRadius: 8, padding: '10px 14px',
      backdropFilter: 'blur(4px)',
      display: 'flex', flexDirection: 'column', gap: 7,
      color: '#e2e8f0', fontSize: 12, fontWeight: 500,
      pointerEvents: 'all', zIndex: 10,
    }}>
      <div style={{ fontWeight: 700, color: '#3b82f6', fontSize: 13 }}>GCP Coordinates</div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 24, color: '#94a3b8' }}>Lat</span>
        <input
          type="number" step="0.000001" value={lat}
          onChange={e => setLat(e.target.value)}
          onBlur={save}
          style={inputStyle}
          placeholder="43.123456"
        />
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 24, color: '#94a3b8' }}>Lon</span>
        <input
          type="number" step="0.000001" value={lon}
          onChange={e => setLon(e.target.value)}
          onBlur={save}
          style={inputStyle}
          placeholder="-76.123456"
        />
      </label>
      <div style={{ fontSize: 11, color: valid ? '#22c55e' : '#64748b' }}>
        {valid ? '✓ Coordinates set' : 'Enter lat/lon from Google Maps'}
      </div>
    </div>
  )
}
