import { useEffect, useRef, useState } from 'react'
import { decompressFromBase64url } from '../utils/layoutUrl'
import type { LayoutPayload, LayoutCone } from '../utils/layoutExport'

const PLACEMENT_TOLERANCE_M = 1.5

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const φ1 = lat1 * (Math.PI / 180)
  const φ2 = lat2 * (Math.PI / 180)
  const Δφ = (lat2 - lat1) * (Math.PI / 180)
  const Δλ = (lon2 - lon1) * (Math.PI / 180)
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const φ1 = lat1 * (Math.PI / 180)
  const φ2 = lat2 * (Math.PI / 180)
  const Δλ = (lon2 - lon1) * (Math.PI / 180)
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return ((Math.atan2(y, x) * (180 / Math.PI)) + 360) % 360
}

function cardinal(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  return dirs[Math.round(deg / 45) % 8]
}

function coneLabel(t: LayoutCone['t']): string {
  if (t === 'TS') return 'Timing Start'
  if (t === 'TE') return 'Timing End'
  if (t === 'P') return 'Pointer'
  return 'Standing'
}

interface Props {
  encodedData: string
}

export function LayoutView({ encodedData }: Props) {
  const [payload, setPayload] = useState<LayoutPayload | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [placed, setPlaced] = useState<Set<number>>(new Set())
  const [gpsPos, setGpsPos] = useState<{ lat: number; lon: number; accuracy: number } | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)

  useEffect(() => {
    decompressFromBase64url(encodedData)
      .then(json => setPayload(JSON.parse(json) as LayoutPayload))
      .catch(e => setParseError((e as Error).message))
  }, [encodedData])

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation not available on this device')
      return
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        setGpsPos({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        })
        setGpsError(null)
      },
      err => setGpsError(err.message),
      { enableHighAccuracy: true, maximumAge: 1000 },
    )
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [])

  if (parseError) {
    return (
      <div style={{ padding: 24, color: '#f87171', background: '#0f172a', minHeight: '100vh', fontSize: 14 }}>
        Failed to load layout: {parseError}
      </div>
    )
  }

  if (!payload) {
    return (
      <div style={{ padding: 24, color: '#94a3b8', background: '#0f172a', minHeight: '100vh', fontSize: 14 }}>
        Loading…
      </div>
    )
  }

  const cones = payload.cones
  const allDone = placed.size === cones.length

  const current = cones[currentIdx]
  let distM: number | null = null
  let toBearing: number | null = null
  let withinTolerance = false

  if (gpsPos && current) {
    distM = haversineMeters(gpsPos.lat, gpsPos.lon, current.lat, current.lon)
    toBearing = bearingDeg(gpsPos.lat, gpsPos.lon, current.lat, current.lon)
    withinTolerance = distM <= PLACEMENT_TOLERANCE_M
  }

  function markPlaced() {
    setPlaced(p => new Set([...p, currentIdx]))
    if (currentIdx < cones.length - 1) setCurrentIdx(currentIdx + 1)
  }

  function jumpTo(idx: number) {
    setCurrentIdx(idx)
  }

  const bg = '#0f172a'
  const cardBg = '#1e293b'
  const border = '#334155'

  return (
    <div style={{ background: bg, minHeight: '100vh', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif', maxWidth: 480, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ padding: '14px 16px', background: cardBg, borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{payload.name}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>Section {payload.s} · {cones.length} cones</div>
        </div>
        <div style={{ fontSize: 12, color: '#64748b', textAlign: 'right' }}>
          {placed.size}/{cones.length} placed
        </div>
      </div>

      {/* GPS status */}
      <div style={{ padding: '8px 16px', background: '#0f172a', borderBottom: `1px solid ${border}`, fontSize: 12 }}>
        {gpsError ? (
          <span style={{ color: '#f87171' }}>⚠ GPS: {gpsError}</span>
        ) : gpsPos ? (
          <span style={{ color: '#22c55e' }}>● GPS active · ±{Math.round(gpsPos.accuracy)}m accuracy</span>
        ) : (
          <span style={{ color: '#64748b' }}>Acquiring GPS…</span>
        )}
      </div>

      {allDone ? (
        <div style={{ padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
          <div style={{ fontWeight: 700, fontSize: 18, color: '#22c55e' }}>Section Complete</div>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>All {cones.length} cones placed</div>
        </div>
      ) : (
        <>
          {/* Current cone card */}
          <div style={{ margin: 16, background: cardBg, borderRadius: 12, border: `2px solid ${withinTolerance ? '#22c55e' : border}`, overflow: 'hidden', transition: 'border-color 0.3s' }}>
            <div style={{ padding: '12px 16px', background: withinTolerance ? 'rgba(34,197,94,0.1)' : 'transparent', transition: 'background 0.3s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Cone {currentIdx + 1} of {cones.length}
                  </span>
                  <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{coneLabel(current.t)}</div>
                </div>
                {withinTolerance && (
                  <div style={{ fontSize: 32, color: '#22c55e', lineHeight: 1 }}>✓</div>
                )}
              </div>

              {/* Pointer heading */}
              {current.t === 'P' && current.h !== undefined && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: '#0f172a', borderRadius: 8, fontSize: 14 }}>
                  <span style={{ color: '#94a3b8' }}>Point toward </span>
                  <strong style={{ color: '#f59e0b' }}>{current.h}° ({cardinal(current.h)})</strong>
                </div>
              )}

              {/* Distance / bearing */}
              <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
                {distM !== null ? (
                  <>
                    <div style={{ flex: 1, background: '#0f172a', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: withinTolerance ? '#22c55e' : '#f1f5f9' }}>
                        {distM < 100 ? distM.toFixed(1) : Math.round(distM)}m
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>distance</div>
                    </div>
                    {toBearing !== null && (
                      <div style={{ flex: 1, background: '#0f172a', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                        <div style={{ fontSize: 24, fontWeight: 700 }}>
                          {Math.round(toBearing)}°
                        </div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{cardinal(toBearing)}</div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ color: '#475569', fontSize: 13 }}>Waiting for GPS fix…</div>
                )}
              </div>
            </div>

            {/* Place button */}
            <button
              onClick={markPlaced}
              style={{
                width: '100%', padding: '14px 0',
                background: withinTolerance ? '#16a34a' : '#1e3a5f',
                color: withinTolerance ? 'white' : '#64748b',
                border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                transition: 'background 0.3s',
              }}
            >
              {withinTolerance ? '✓ Mark Placed & Next' : 'Mark Placed & Next'}
            </button>
          </div>

          {/* Upcoming */}
          {currentIdx + 1 < cones.length && (
            <div style={{ padding: '0 16px 8px', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
              UPCOMING
            </div>
          )}
        </>
      )}

      {/* Cone list */}
      <div style={{ padding: '0 16px 24px' }}>
        {cones.map((cone, idx) => {
          const isDone = placed.has(idx)
          const isCurrent = idx === currentIdx && !allDone
          return (
            <div
              key={idx}
              onClick={() => !isDone && jumpTo(idx)}
              style={{
                padding: '10px 14px', marginBottom: 6,
                background: isCurrent ? '#1e3a5f' : isDone ? 'rgba(34,197,94,0.06)' : cardBg,
                borderRadius: 8,
                border: `1px solid ${isCurrent ? '#3b82f6' : isDone ? '#166534' : border}`,
                cursor: isDone ? 'default' : 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                opacity: isDone ? 0.55 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600, minWidth: 24 }}>
                  {idx + 1}
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{coneLabel(cone.t)}</div>
                  {cone.t === 'P' && cone.h !== undefined && (
                    <div style={{ fontSize: 11, color: '#f59e0b' }}>{cone.h}° {cardinal(cone.h)}</div>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 13, color: isDone ? '#22c55e' : '#475569' }}>
                {isDone ? '✓' : isCurrent ? '▶' : '○'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
