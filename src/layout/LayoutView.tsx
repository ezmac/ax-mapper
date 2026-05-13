import { useEffect, useRef, useState } from 'react'
import { decompressFromBase64url } from '../utils/layoutUrl'
import { connectRaceBox } from './raceboxBle'
import type { LayoutPayload, LayoutCone } from '../utils/layoutExport'
import type { RaceBoxClient } from './raceboxBle'

const PLACEMENT_TOLERANCE_M = 1.5
const POINTER_ALIGN_TOLERANCE_DEG = 10

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

// Signed angular difference in [-180, 180]: how far to rotate from `from` to reach `to`
function angleDiff(to: number, from: number): number {
  return ((to - from + 540) % 360) - 180
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

interface GpsPos {
  lat: number
  lon: number
  accuracy: number
  source: 'os' | 'racebox'
  numSV?: number
}

interface Props {
  encodedData: string
}

// SVG arrow pointing up — rotated for direction indication
function DirectionArrow({ rotateDeg, color }: { rotateDeg: number; color: string }) {
  return (
    <svg
      viewBox="0 0 40 48"
      width="40" height="48"
      style={{ display: 'block', transform: `rotate(${rotateDeg}deg)` }}
    >
      <polygon points="20,2 38,46 20,36 2,46" fill={color} />
    </svg>
  )
}

export function LayoutView({ encodedData }: Props) {
  const [payload, setPayload] = useState<LayoutPayload | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [placed, setPlaced] = useState<Set<number>>(new Set())
  const [gpsPos, setGpsPos] = useState<GpsPos | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null)
  const [bleStatus, setBleStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle')
  const [bleError, setBleError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const bleClientRef = useRef<RaceBoxClient | null>(null)
  const bleActiveRef = useRef(false)

  useEffect(() => {
    decompressFromBase64url(encodedData)
      .then(json => setPayload(JSON.parse(json) as LayoutPayload))
      .catch(e => setParseError((e as Error).message))
  }, [encodedData])

  // OS GPS — starts immediately; paused if RaceBox connects
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation not available on this device')
      return
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      pos => {
        if (bleActiveRef.current) return
        setGpsPos({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          source: 'os',
        })
        setGpsError(null)
      },
      err => {
        if (!bleActiveRef.current) setGpsError(err.message)
      },
      { enableHighAccuracy: true, maximumAge: 1000 },
    )
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    }
  }, [])

  // Compass — deviceorientationabsolute gives true-north alpha on Android Chrome
  useEffect(() => {
    function handle(e: DeviceOrientationEvent) {
      if (e.alpha !== null) setDeviceHeading(e.alpha)
    }
    // Prefer absolute (true-north); fall back to relative if not supported
    const name = ('ondeviceorientationabsolute' in window) ? 'deviceorientationabsolute' : 'deviceorientation'
    window.addEventListener(name, handle as EventListener)
    return () => window.removeEventListener(name, handle as EventListener)
  }, [])

  // Cleanup BLE on unmount
  useEffect(() => {
    return () => { bleClientRef.current?.disconnect() }
  }, [])

  async function handleConnectRaceBox() {
    if (!navigator.bluetooth) {
      setBleError('Web Bluetooth not available — use Chrome on Android')
      setBleStatus('error')
      return
    }
    setBleStatus('connecting')
    setBleError(null)
    try {
      const client = await connectRaceBox(fix => {
        bleActiveRef.current = true
        setGpsPos({ lat: fix.lat, lon: fix.lon, accuracy: fix.accuracyM, source: 'racebox', numSV: fix.numSV })
        setGpsError(null)
      })
      bleClientRef.current = client
      setBleStatus('connected')
    } catch (e) {
      setBleStatus('error')
      setBleError((e as Error).message)
      bleActiveRef.current = false
    }
  }

  function handleDisconnectRaceBox() {
    bleClientRef.current?.disconnect()
    bleClientRef.current = null
    bleActiveRef.current = false
    setBleStatus('idle')
    setBleError(null)
    setGpsPos(null)
  }

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

  // Relative bearing: how far right/left of phone-forward the cone is
  const relativeBearing = (toBearing !== null && deviceHeading !== null)
    ? (toBearing - deviceHeading + 360) % 360
    : null

  // Pointer alignment: how many degrees to rotate phone to face cone direction
  const pointerDiff = (withinTolerance && current?.t === 'P' && current.h !== undefined && deviceHeading !== null)
    ? angleDiff(current.h, deviceHeading)
    : null
  const pointerAligned = pointerDiff !== null && Math.abs(pointerDiff) <= POINTER_ALIGN_TOLERANCE_DEG

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
    <div style={{ background: bg, minHeight: '100vh', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif', maxWidth: 480, margin: '0 auto', overflowY: 'auto', height: '100vh' }}>

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

      {/* GPS / BLE status bar */}
      <div style={{ padding: '8px 16px', background: '#0f172a', borderBottom: `1px solid ${border}`, fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div>
          {gpsError && bleStatus !== 'connected' ? (
            <span style={{ color: '#f87171' }}>⚠ GPS: {gpsError}</span>
          ) : gpsPos?.source === 'racebox' ? (
            <span style={{ color: '#22c55e' }}>● RaceBox · ±{gpsPos.accuracy.toFixed(1)}m{gpsPos.numSV !== undefined ? ` · ${gpsPos.numSV} SVs` : ''}{deviceHeading !== null ? ` · ${Math.round(deviceHeading)}°` : ''}</span>
          ) : gpsPos ? (
            <span style={{ color: '#94a3b8' }}>● OS GPS · ±{Math.round(gpsPos.accuracy)}m{deviceHeading !== null ? ` · ${Math.round(deviceHeading)}°` : ''}</span>
          ) : bleStatus === 'connecting' ? (
            <span style={{ color: '#64748b' }}>Connecting to RaceBox…</span>
          ) : (
            <span style={{ color: '#64748b' }}>Acquiring GPS…</span>
          )}
        </div>
        <div>
          {bleStatus === 'connected' ? (
            <button
              onClick={handleDisconnectRaceBox}
              style={{ fontSize: 11, padding: '3px 8px', background: '#1e293b', color: '#94a3b8', border: `1px solid ${border}`, borderRadius: 5, cursor: 'pointer' }}
            >
              Disconnect RaceBox
            </button>
          ) : bleStatus === 'connecting' ? (
            <span style={{ fontSize: 11, color: '#64748b' }}>…</span>
          ) : (
            <button
              onClick={handleConnectRaceBox}
              style={{ fontSize: 11, padding: '3px 8px', background: '#1e3a5f', color: '#93c5fd', border: '1px solid #3b82f6', borderRadius: 5, cursor: 'pointer' }}
            >
              Connect RaceBox
            </button>
          )}
        </div>
      </div>

      {/* BLE error */}
      {bleError && (
        <div style={{ padding: '6px 16px', background: 'rgba(248,113,113,0.1)', borderBottom: `1px solid ${border}`, fontSize: 12, color: '#f87171' }}>
          BLE: {bleError}
        </div>
      )}

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

              {/* Distance + direction */}
              <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
                {distM !== null ? (
                  <>
                    {/* Distance tile */}
                    <div style={{ flex: 1, background: '#0f172a', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: withinTolerance ? '#22c55e' : '#f1f5f9' }}>
                        {distM < 100 ? distM.toFixed(1) : Math.round(distM)}m
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>distance</div>
                    </div>

                    {/* Direction tile: compass arrow when heading available, bearing number otherwise */}
                    {toBearing !== null && (
                      <div style={{ flex: 1, background: '#0f172a', borderRadius: 8, padding: '10px 12px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        {relativeBearing !== null && !withinTolerance ? (
                          <>
                            <DirectionArrow rotateDeg={relativeBearing} color="#f1f5f9" />
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{Math.round(toBearing)}° {cardinal(toBearing)}</div>
                          </>
                        ) : (
                          <>
                            <div style={{ fontSize: 24, fontWeight: 700 }}>{Math.round(toBearing)}°</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>{cardinal(toBearing)}</div>
                          </>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ color: '#475569', fontSize: 13 }}>Waiting for GPS fix…</div>
                )}
              </div>

              {/* Pointer alignment — shown when at position with compass */}
              {withinTolerance && current.t === 'P' && current.h !== undefined && pointerDiff !== null && (
                <div style={{
                  marginTop: 10, padding: '10px 14px', borderRadius: 8,
                  background: pointerAligned ? 'rgba(34,197,94,0.12)' : '#0f172a',
                  border: `1px solid ${pointerAligned ? '#22c55e' : border}`,
                  display: 'flex', alignItems: 'center', gap: 12,
                  transition: 'background 0.3s, border-color 0.3s',
                }}>
                  {/* Mini arrow showing cone target direction relative to phone */}
                  <div style={{ flexShrink: 0 }}>
                    <DirectionArrow
                      rotateDeg={(angleDiff(current.h, deviceHeading!) + 360) % 360}
                      color={pointerAligned ? '#22c55e' : '#f59e0b'}
                    />
                  </div>
                  <div>
                    {pointerAligned ? (
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#22c55e' }}>Cone aligned</div>
                    ) : (
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#f59e0b' }}>
                        Rotate {pointerDiff > 0 ? 'right' : 'left'} {Math.abs(Math.round(pointerDiff))}°
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      Facing {Math.round(deviceHeading!)}° · Cone → {current.h}°
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Map links */}
            <div style={{ padding: '8px 12px', borderTop: `1px solid ${border}`, display: 'flex', gap: 8 }}>
              <a
                href={`https://maps.google.com/?q=${current.lat},${current.lon}&t=k`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  flex: 1, padding: '7px 0', textAlign: 'center', fontSize: 12, fontWeight: 600,
                  background: '#0f172a', color: '#94a3b8', borderRadius: 6,
                  textDecoration: 'none', border: `1px solid ${border}`,
                }}
              >
                📍 This cone
              </a>
              <a
                href={`https://www.google.com/maps/dir/${cones.map(c => `${c.lat},${c.lon}`).join('/')}`}
                target="_blank" rel="noopener noreferrer"
                style={{
                  flex: 1, padding: '7px 0', textAlign: 'center', fontSize: 12, fontWeight: 600,
                  background: '#0f172a', color: '#94a3b8', borderRadius: 6,
                  textDecoration: 'none', border: `1px solid ${border}`,
                }}
              >
                🗺 Full section
              </a>
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
