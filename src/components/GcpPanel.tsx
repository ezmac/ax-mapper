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

function parseCombined(s: string): { lat: number; lon: number } | null {
  const parts = s.split(',').map(p => p.trim())
  if (parts.length !== 2) return null
  const lat = parseFloat(parts[0])
  const lon = parseFloat(parts[1])
  if (isNaN(lat) || isNaN(lon)) return null
  return { lat, lon }
}

export function GcpPanel({ cone, canvasAPI }: Props) {
  const [lat, setLat] = useState(cone.gcpCoords?.lat?.toString() ?? '')
  const [lon, setLon] = useState(cone.gcpCoords?.lon?.toString() ?? '')
  const [combined, setCombined] = useState(
    cone.gcpCoords ? `${cone.gcpCoords.lat}, ${cone.gcpCoords.lon}` : ''
  )

  useEffect(() => {
    const latStr = cone.gcpCoords?.lat?.toString() ?? ''
    const lonStr = cone.gcpCoords?.lon?.toString() ?? ''
    setLat(latStr)
    setLon(lonStr)
    setCombined(cone.gcpCoords ? `${cone.gcpCoords.lat}, ${cone.gcpCoords.lon}` : '')
  }, [cone.id, cone.gcpCoords?.lat, cone.gcpCoords?.lon])

  function save(latVal: string, lonVal: string) {
    const latN = parseFloat(latVal)
    const lonN = parseFloat(lonVal)
    if (!isNaN(latN) && !isNaN(lonN)) {
      canvasAPI.updateCone(cone.id, { gcpCoords: { lat: latN, lon: lonN } })
    }
  }

  function handleLatChange(v: string) {
    setLat(v)
    const lonN = parseFloat(lon)
    if (!isNaN(parseFloat(v)) && !isNaN(lonN)) setCombined(`${v}, ${lon}`)
  }

  function handleLonChange(v: string) {
    setLon(v)
    const latN = parseFloat(lat)
    if (!isNaN(latN) && !isNaN(parseFloat(v))) setCombined(`${lat}, ${v}`)
  }

  function handleCombinedChange(v: string) {
    setCombined(v)
    const parsed = parseCombined(v)
    if (parsed) {
      setLat(parsed.lat.toString())
      setLon(parsed.lon.toString())
    }
  }

  function handleCombinedBlur() {
    const parsed = parseCombined(combined)
    if (parsed) save(parsed.lat.toString(), parsed.lon.toString())
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
          onChange={e => handleLatChange(e.target.value)}
          onBlur={() => save(lat, lon)}
          style={inputStyle}
          placeholder="43.123456"
        />
      </label>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 24, color: '#94a3b8' }}>Lon</span>
        <input
          type="number" step="0.000001" value={lon}
          onChange={e => handleLonChange(e.target.value)}
          onBlur={() => save(lat, lon)}
          style={inputStyle}
          placeholder="-76.123456"
        />
      </label>

      <div style={{ borderTop: '1px solid #334155', paddingTop: 6 }}>
        <div style={{ color: '#94a3b8', marginBottom: 4 }}>or paste from Maps</div>
        <input
          type="text" value={combined}
          onChange={e => handleCombinedChange(e.target.value)}
          onBlur={handleCombinedBlur}
          style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
          placeholder="42.710842, -76.876917"
        />
      </div>

      <div style={{ fontSize: 11, color: valid ? '#22c55e' : '#64748b' }}>
        {valid ? '✓ Coordinates set' : 'Enter lat/lon from Google Maps'}
      </div>
    </div>
  )
}
